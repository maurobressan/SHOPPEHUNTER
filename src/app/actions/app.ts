"use server";
// Ações do aplicativo. TODAS começam com requireCtx() e filtram por ctx.accountId.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCtx, requireManager } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { collectSearch, collectAccount } from "@/lib/collector";
import { seedDemo, clearDemo } from "@/lib/demo";
import { analyzeById } from "@/lib/analysis";
import { generateReport } from "@/lib/ai-report";
import { readSheet } from "@/lib/import/read-file";
import { autoMap, parseOrders, type Mapping } from "@/lib/import/orders";
import { evaluateAlerts } from "@/lib/alerts";
import { limitReached } from "@/lib/usage";
import { s, n, back, ret } from "@/lib/form";

const refresh = () => revalidatePath("/", "layout");

async function ownProduct(accountId: string, id: string) {
  const p = await prisma.product.findFirst({ where: { id, accountId } });
  if (!p) back("/meus-produtos", "erro", "Produto não encontrado nesta conta.");
  return p!;
}

// ---------- Produtos ----------
export async function createProduct(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/meus-produtos");
  const name = s(f, "name");
  if (name.length < 2) back(path, "erro", "Informe o nome do produto.");
  const lim = await limitReached(ctx, "products");
  if (lim) back(path, "erro", lim);
  const p = await prisma.product.create({
    data: { accountId: ctx.accountId, name, keywords: s(f, "keywords"), category: s(f, "category"), notes: s(f, "notes"), targetPrice: n(f, "targetPrice") },
  });
  refresh();
  redirect(`/produtos/${p.id}?ok=${encodeURIComponent("Produto salvo na sua lista.")}`);
}

export async function updateProduct(f: FormData) {
  const ctx = await requireCtx();
  const p = await ownProduct(ctx.accountId, s(f, "id"));
  await prisma.product.update({
    where: { id: p.id },
    data: { name: s(f, "name"), keywords: s(f, "keywords"), category: s(f, "category"), status: s(f, "status") || "monitorando", notes: s(f, "notes"), targetPrice: n(f, "targetPrice") },
  });
  refresh();
  back(`/produtos/${p.id}`, "ok", "Produto atualizado.");
}

export async function deleteProduct(f: FormData) {
  const ctx = await requireCtx();
  const p = await ownProduct(ctx.accountId, s(f, "id"));
  await prisma.product.delete({ where: { id: p.id } });
  refresh();
  back("/meus-produtos", "ok", "Produto excluído.");
}

export async function collectProduct(f: FormData) {
  const ctx = await requireCtx();
  const p = await ownProduct(ctx.accountId, s(f, "id"));
  if (!ctx.limits.autoCollect) back(`/produtos/${p.id}`, "erro", "Coleta pela API está disponível nos planos pagos. Use a extensão ou o registro manual.");
  const kws = p.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  if (!kws.length) back(`/produtos/${p.id}`, "erro", "Cadastre palavras-chave no produto para coletar.");
  const msgs: string[] = [];
  for (const kw of kws) {
    const r = await collectSearch(ctx.accountId, { keyword: kw, sortType: 2, limit: 50 }, p.id);
    msgs.push(`"${kw}": ${r.message}`);
    if (!r.ok) back(`/produtos/${p.id}`, "erro", msgs.join(" | "));
  }
  refresh();
  back(`/produtos/${p.id}`, "ok", msgs.join(" | "));
}

export async function collectAllAction() {
  const ctx = await requireManager();
  if (!ctx.limits.autoCollect) back("/configuracoes", "erro", "Coleta automática disponível nos planos pagos.");
  const rs = await collectAccount(ctx.accountId);
  refresh();
  if (!rs.length) back("/configuracoes", "erro", "Nenhum produto real com palavras-chave para coletar.");
  back("/configuracoes", rs.some((r) => !r.result.ok) ? "erro" : "ok", rs.map((r) => `${r.product}/"${r.keyword}": ${r.result.message}`).join(" | "));
}

// ---------- Anúncios ----------
export async function linkListings(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/explorar");
  const ids = f.getAll("listing").map(String);
  if (!ids.length) back(path, "erro", "Selecione ao menos um anúncio.");
  let productId = s(f, "productId");
  if (productId === "__new") {
    const name = s(f, "newName");
    if (!name) back(path, "erro", "Informe o nome do novo produto.");
    const lim = await limitReached(ctx, "products");
    if (lim) back(path, "erro", lim);
    productId = (await prisma.product.create({ data: { accountId: ctx.accountId, name, keywords: s(f, "q") } })).id;
  } else await ownProduct(ctx.accountId, productId);
  await prisma.listing.updateMany({ where: { id: { in: ids }, accountId: ctx.accountId }, data: { productId } });
  refresh();
  redirect(`/produtos/${productId}?ok=${encodeURIComponent(`${ids.length} anúncio(s) vinculados.`)}`);
}

const manualSchema = z.object({
  productId: z.string().min(1, "Escolha o produto"),
  title: z.string().min(3, "Título muito curto"),
  url: z.string().url("Link inválido").or(z.literal("")),
  shopName: z.string(),
});

async function createManualSnapshot(listingId: string, f: FormData) {
  const ref = s(f, "referenceDate");
  const refDate = ref ? new Date(`${ref}T12:00:00`) : new Date();
  if (isNaN(refDate.getTime()) || refDate.getTime() > Date.now() + 86400000) return "Data de referência inválida.";
  const price = n(f, "price");
  const sales = n(f, "salesCumulative");
  if (price === null && sales === null) return null;
  await prisma.snapshot.create({
    data: {
      listingId,
      source: "manual",
      referenceDate: refDate,
      price,
      salesCumulative: sales === null ? null : Math.round(sales),
      ratingStar: n(f, "ratingStar"),
      ratingCount: n(f, "ratingCount") === null ? null : Math.round(n(f, "ratingCount")!),
      reliability: "media",
    },
  });
  return null;
}

export async function addManualListing(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/explorar");
  const parsed = manualSchema.safeParse({ productId: s(f, "productId"), title: s(f, "title"), url: s(f, "url"), shopName: s(f, "shopName") });
  if (!parsed.success) return back(path, "erro", parsed.error.issues.map((i) => i.message).join("; "));
  await ownProduct(ctx.accountId, parsed.data.productId);
  const listing = await prisma.listing.create({ data: { ...parsed.data, accountId: ctx.accountId } });
  const err = await createManualSnapshot(listing.id, f);
  if (err) back(path, "erro", err);
  await evaluateAlerts(ctx.accountId, parsed.data.productId);
  refresh();
  back(path, "ok", "Anúncio cadastrado com o primeiro snapshot manual.");
}

async function ownListing(accountId: string, id: string, path: string) {
  const l = await prisma.listing.findFirst({ where: { id, accountId } });
  if (!l) back(path, "erro", "Anúncio não encontrado.");
  return l!;
}

export async function addManualSnapshot(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/meus-produtos");
  const l = await ownListing(ctx.accountId, s(f, "listingId"), path);
  if (n(f, "price") === null && n(f, "salesCumulative") === null) back(path, "erro", "Informe preço e/ou vendas acumuladas.");
  const err = await createManualSnapshot(l.id, f);
  if (err) back(path, "erro", err);
  if (l.productId) await evaluateAlerts(ctx.accountId, l.productId);
  refresh();
  back(path, "ok", "Snapshot registrado.");
}

export async function toggleListingFlag(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/concorrencia");
  const l = await ownListing(ctx.accountId, s(f, "id"), path);
  const flag = s(f, "flag");
  if (flag === "weakPhotos" || flag === "weakDescription") await prisma.listing.update({ where: { id: l.id }, data: { [flag]: !l[flag] } });
  refresh();
  redirect(path);
}

export async function unlinkListing(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/concorrencia");
  const l = await ownListing(ctx.accountId, s(f, "id"), path);
  await prisma.listing.update({ where: { id: l.id }, data: { productId: null } });
  refresh();
  redirect(path);
}

// ---------- Fornecedores ----------
const KINDS = ["fabrica", "distribuidora", "atacadista", "importador", "varejo", "internacional"];

export async function createSupplierQuote(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/fornecedores");
  const product = await ownProduct(ctx.accountId, s(f, "productId"));
  let supplierId = s(f, "supplierId");
  if (!supplierId || supplierId === "__new") {
    const name = s(f, "name");
    const kind = s(f, "kind");
    if (!name) back(path, "erro", "Informe o nome do fornecedor.");
    if (!KINDS.includes(kind)) back(path, "erro", "Tipo de fornecedor inválido.");
    const site = s(f, "website");
    if (site && !/^https?:\/\//i.test(site)) back(path, "erro", "Site deve começar com http:// ou https://");
    supplierId = (
      await prisma.supplier.create({ data: { accountId: ctx.accountId, name, kind, country: s(f, "country") || "Brasil", location: s(f, "location"), website: site, contact: s(f, "contact"), notes: s(f, "supplierNotes") } })
    ).id;
  } else if (!(await prisma.supplier.findFirst({ where: { id: supplierId, accountId: ctx.accountId } }))) back(path, "erro", "Fornecedor não encontrado.");
  const unit = n(f, "unitPrice");
  if (unit !== null && unit <= 0) back(path, "erro", 'Preço unitário deve ser positivo (ou deixe em branco para "Sob consulta").');
  const moq = n(f, "moq");
  const qd = s(f, "quoteDate");
  await prisma.supplierQuote.create({
    data: {
      supplierId,
      productId: product.id,
      unitPrice: unit,
      moq: moq === null ? null : Math.round(moq),
      tiers: s(f, "tiers"),
      shippingCost: n(f, "shippingCost"),
      leadTimeDays: n(f, "leadTimeDays") === null ? null : Math.round(n(f, "leadTimeDays")!),
      availability: s(f, "availability"),
      channel: s(f, "channel") || "site",
      productUrl: s(f, "productUrl"),
      notes: s(f, "notes"),
      quoteDate: qd ? new Date(`${qd}T12:00:00`) : new Date(),
    },
  });
  refresh();
  back(path, "ok", "Cotação registrada.");
}

async function ownQuote(accountId: string, id: string, path: string) {
  const q = await prisma.supplierQuote.findFirst({ where: { id, product: { accountId } } });
  if (!q) back(path, "erro", "Cotação não encontrada.");
  return q!;
}

export async function deleteQuote(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/fornecedores");
  const q = await ownQuote(ctx.accountId, s(f, "id"), path);
  await prisma.supplierQuote.delete({ where: { id: q.id } });
  refresh();
  back(path, "ok", "Cotação removida.");
}

export async function chooseQuote(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/fornecedores");
  const q = await ownQuote(ctx.accountId, s(f, "quoteId"), path);
  await prisma.product.update({ where: { id: q.productId }, data: { chosenQuoteId: q.id } });
  refresh();
  back(path, "ok", "Fornecedor escolhido para o cálculo de margem.");
}

// ---------- Configurações da conta ----------
export async function saveSettingsAction(f: FormData) {
  const ctx = await requireManager();
  const num = (k: string, min = 0, max = 1e9) => {
    const v = n(f, k);
    if (v === null || v < min || v > max) back("/configuracoes", "erro", `Valor inválido em "${k}".`);
    return v as number;
  };
  const weights = { demand: num("w_demand", 0, 100), growth: num("w_growth", 0, 100), competition: num("w_competition", 0, 100), margin: num("w_margin", 0, 100), suppliers: num("w_suppliers", 0, 100) };
  if (Object.values(weights).reduce((a, b) => a + b, 0) <= 0) back("/configuracoes", "erro", "A soma dos pesos deve ser maior que zero.");
  await saveSettings(ctx.accountId, {
    sellerType: s(f, "sellerType") === "CPF" ? "CPF" : "CNPJ",
    cpfHighVolume: f.get("cpfHighVolume") === "on",
    taxRegime: (s(f, "taxRegime") || "nao_configurado") as never,
    taxPct: num("taxPct", 0, 100),
    packagingCost: num("packagingCost"),
    shippingCost: num("shippingCost"),
    adsPct: num("adsPct", 0, 100),
    lossPct: num("lossPct", 0, 100),
    otherVariableCost: num("otherVariableCost"),
    fixedMonthly: num("fixedMonthly"),
    testLotUnits: Math.max(1, Math.round(num("testLotUnits", 1))),
    payoutDelayDays: Math.round(num("payoutDelayDays", 0, 120)),
    alertPriceDropPct: num("alertPriceDropPct", 1, 90),
    alertMinMarginPct: num("alertMinMarginPct", -100, 100),
    weights,
  });
  refresh();
  back("/configuracoes", "ok", "Configurações salvas.");
}

export async function setDemo(f: FormData) {
  const ctx = await requireManager();
  const on = s(f, "on") === "1";
  if (on && (await prisma.product.count({ where: { accountId: ctx.accountId, isDemo: true } })) === 0) await seedDemo(prisma, ctx.accountId);
  await saveSettings(ctx.accountId, { demoMode: on });
  refresh();
  back(ret(f, "/configuracoes"), "ok", on ? "Modo DEMO ativado (dados fictícios visíveis)." : "Modo DEMO desativado.");
}

export async function resetDemo(f: FormData) {
  const ctx = await requireManager();
  if (s(f, "mode") === "clear") await clearDemo(prisma, ctx.accountId);
  else await seedDemo(prisma, ctx.accountId);
  refresh();
  back("/configuracoes", "ok", s(f, "mode") === "clear" ? "Dados DEMO removidos." : "Dados DEMO recriados.");
}

export async function dismissOnboarding() {
  const ctx = await requireCtx();
  await saveSettings(ctx.accountId, { onboardingDismissed: true });
  refresh();
  redirect("/painel");
}

// ---------- Alertas ----------
export async function markAlertsRead(f: FormData) {
  const ctx = await requireCtx();
  const id = s(f, "id");
  await prisma.notification.updateMany({ where: { accountId: ctx.accountId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
  refresh();
  redirect(ret(f, "/alertas"));
}

// ---------- Assistente ----------
export async function generateAiReportAction(f: FormData) {
  const ctx = await requireCtx();
  const id = s(f, "productId");
  const lim = await limitReached(ctx, "aiReports");
  if (lim) back("/assistente", "erro", lim);
  const a = await analyzeById(ctx.accountId, id, Number(s(f, "periodo")) || 30);
  if (!a) return back("/assistente", "erro", "Produto não encontrado.");
  const wantsAi = s(f, "useAi") === "1";
  if (wantsAi && !ctx.limits.aiExternal) back("/assistente", "erro", "Análise com IA externa disponível nos planos pagos. O relatório por regras continua disponível.");
  const r = await generateReport(a, wantsAi);
  const rep = await prisma.aiReport.create({ data: { productId: id, engine: r.engine, model: r.model, content: r.content, inputs: JSON.stringify(r.facts) } });
  revalidatePath("/assistente");
  redirect(`/assistente?r=${rep.id}${r.error ? `&erro=${encodeURIComponent("IA indisponível: " + r.error)}` : ""}`);
}

export async function deleteReport(f: FormData) {
  const ctx = await requireCtx();
  await prisma.aiReport.deleteMany({ where: { id: s(f, "id"), product: { accountId: ctx.accountId } } });
  revalidatePath("/assistente");
  redirect("/assistente");
}

// ---------- Importação ----------
export interface PreviewState {
  error?: string;
  headers?: string[];
  mapping?: Mapping;
  sample?: Record<string, unknown>[];
  rowCount?: number;
  filename?: string;
  result?: { accepted: number; duplicates: number; rejected: number; errors: { row: number; message: string }[] };
}

export async function importOrders(_prev: PreviewState, f: FormData): Promise<PreviewState> {
  const ctx = await requireCtx();
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo .xlsx ou .csv." };
  if (file.size > 20 * 1024 * 1024) return { error: "Arquivo maior que 20 MB." };
  let sheet;
  try {
    sheet = await readSheet(file.name, await file.arrayBuffer());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao ler o arquivo." };
  }
  if (!sheet.headers.length || !sheet.rows.length) return { error: "Planilha vazia ou sem cabeçalho na primeira linha." };
  const mapRaw = s(f, "mapping");
  let mapping: Mapping;
  try {
    mapping = mapRaw ? JSON.parse(mapRaw) : autoMap(sheet.headers);
  } catch {
    mapping = autoMap(sheet.headers);
  }
  const base: PreviewState = { headers: sheet.headers, mapping, sample: sheet.rows.slice(0, 5), rowCount: sheet.rows.length, filename: file.name };
  if (s(f, "step") !== "commit") return base;
  const lim = await limitReached(ctx, "imports");
  if (lim) return { ...base, error: lim };

  const parsed = parseOrders(sheet.rows, mapping);
  if (parsed.missingRequired.length) return { ...base, error: `Mapeie as colunas obrigatórias: ${parsed.missingRequired.join(", ")}` };
  const keys = parsed.lines.map((l) => l.dedupeKey);
  const existing = new Set<string>();
  for (let i = 0; i < keys.length; i += 500)
    (await prisma.orderLine.findMany({ where: { accountId: ctx.accountId, dedupeKey: { in: keys.slice(i, i + 500) } }, select: { dedupeKey: true } })).forEach((r) => existing.add(r.dedupeKey));
  const fresh = parsed.lines.filter((l) => !existing.has(l.dedupeKey));
  const duplicates = parsed.duplicatesInFile + (parsed.lines.length - fresh.length);
  const batch = await prisma.importBatch.create({
    data: { accountId: ctx.accountId, filename: file.name, totalRows: sheet.rows.length, accepted: fresh.length, duplicates, rejected: parsed.errors.length, mapping: JSON.stringify(mapping), errors: JSON.stringify(parsed.errors.slice(0, 200)) },
  });
  for (let i = 0; i < fresh.length; i += 500) await prisma.orderLine.createMany({ data: fresh.slice(i, i + 500).map((l) => ({ ...l, batchId: batch.id, accountId: ctx.accountId })) });
  revalidatePath("/vendas");
  return { ...base, result: { accepted: fresh.length, duplicates, rejected: parsed.errors.length, errors: parsed.errors.slice(0, 20) } };
}

export async function deleteBatch(f: FormData) {
  const ctx = await requireCtx();
  await prisma.importBatch.deleteMany({ where: { id: s(f, "id"), accountId: ctx.accountId } });
  revalidatePath("/vendas");
  back("/vendas", "ok", "Importação removida (pedidos excluídos).");
}

export async function saveSkuCost(f: FormData) {
  const ctx = await requireCtx();
  const path = ret(f, "/vendas");
  const sku = s(f, "sku");
  const unitCost = n(f, "unitCost");
  if (!sku || unitCost === null || unitCost < 0) back(path, "erro", "Informe um custo válido.");
  const packagingCost = n(f, "packagingCost") ?? 0;
  await prisma.skuCost.upsert({
    where: { accountId_sku: { accountId: ctx.accountId, sku } },
    create: { accountId: ctx.accountId, sku, unitCost: unitCost!, packagingCost },
    update: { unitCost: unitCost!, packagingCost },
  });
  revalidatePath("/vendas");
  back(path, "ok", `Custo do SKU ${sku} salvo.`);
}
