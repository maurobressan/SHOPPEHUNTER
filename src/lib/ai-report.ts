// Assistente de análise. Etapa 1 (sempre, sem custo): relatório determinístico gerado por regras a
// partir dos dados do banco. Etapa 2 (opcional): um modelo de IA reescreve/comenta o relatório,
// proibido de inventar dados — recebe apenas os fatos estruturados.
import Anthropic from "@anthropic-ai/sdk";
import type { ProductAnalysis } from "./analysis";
import { TREND_LABELS } from "./trends";

const brl = (n: number | null | undefined) => (n === null || n === undefined ? "sem dado" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pc = (n: number | null | undefined) => (n === null || n === undefined ? "sem dado" : `${(n * 100).toFixed(1).replace(".", ",")}%`);
const dt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR") : "sem data");

export function buildFacts(a: ProductAnalysis) {
  const p = a.product;
  return {
    produto: { nome: p.name, categoria: p.category, status: p.status, palavrasChave: p.keywords, demo: p.isDemo },
    dataDoRelatorio: new Date().toISOString(),
    fontes: a.sources,
    ultimaColeta: a.lastCollected?.toISOString() ?? null,
    tendencia: {
      periodoDias: a.trend.periodDays,
      classificacao: TREND_LABELS[a.trend.classification],
      criterios: a.trend.reasons,
      vendasPeriodo: a.trend.salesPeriod,
      crescimentoPeriodo: a.trend.growthPeriod,
      crescimento7d: a.trend.growth7,
      crescimento30d: a.trend.growth30,
      aceleracao: a.trend.acceleration,
      variacaoPreco: a.trend.priceChange,
      historicoDias: Math.floor(a.trend.spanDays),
      snapshots: a.trend.snapshotCount,
      possivelPico: a.trend.spike,
      sazonalidade: a.trend.seasonality,
    },
    concorrencia: {
      anunciosObservados: a.competition.observedListings,
      vendedoresObservados: a.competition.observedShops,
      limiteDePaginaAtingido: a.competition.pageLimitReached,
      precos: a.competition.price,
      notaMedia: a.competition.avgRating,
      participacaoTop3: a.competition.top3ShopShare,
      saturacao: a.competition.saturation,
      oportunidades: a.competition.opportunities,
      principais: a.competition.top.slice(0, 5).map((l) => ({ titulo: l.title, loja: l.shopName, preco: l.price, vendasAcumuladas: l.salesCumulative, nota: l.ratingStar, link: l.url })),
    },
    fornecedores: p.quotes.map((q) => ({
      nome: q.supplier.name,
      tipo: q.supplier.kind,
      pais: q.supplier.country,
      site: q.supplier.website,
      precoUnitario: q.unitPrice ?? "Sob consulta",
      compraMinima: q.moq,
      frete: q.shippingCost,
      prazoDias: q.leadTimeDays,
      canal: q.channel,
      dataCotacao: q.quoteDate.toISOString().slice(0, 10),
      link: q.productUrl,
    })),
    precificacao: a.calc
      ? {
          precoVenda: a.salePrice,
          origemPreco: a.salePriceSource,
          custoUnitarioComFrete: a.landedCost,
          tarifasShopee: a.calc.fees.total,
          margemContribuicao: a.calc.contributionMargin,
          margemPercentual: a.calc.contributionPct,
          roi: a.calc.roi,
          avisos: a.calc.warnings,
        }
      : null,
    investimentoInicial: a.investment,
    hunterScore: { score: a.score.score, confianca: a.score.confidence, confirmado: a.score.confirmed, recomendacao: a.score.recommendation, justificativa: a.score.justification, riscos: a.score.risks, vantagens: a.score.advantages },
  };
}

export function rulesReport(a: ProductAnalysis): string {
  const f = buildFacts(a);
  const t = a.trend;
  const c = a.competition;
  const L: string[] = [];
  L.push(`# Análise de oportunidade — ${f.produto.nome}`);
  L.push(`Gerado em ${new Date().toLocaleString("pt-BR")} · motor: regras determinísticas · fontes: ${f.fontes.join(", ") || "nenhuma"} · última coleta: ${dt(a.lastCollected)}`);
  if (f.produto.demo) L.push(`> ⚠️ PRODUTO DE DEMONSTRAÇÃO — todos os números abaixo são fictícios.`);
  L.push(`\n## 1. Resumo do produto\n${f.produto.nome}${f.produto.categoria ? ` (${f.produto.categoria})` : ""}. Hunter Score: **${a.score.score === null ? "não calculável" : a.score.score.toFixed(0)}/100**, confiança ${pc(a.score.confidence)}. Recomendação: **${a.score.recommendation}**${a.score.confirmed ? "" : " (oportunidade NÃO confirmada)"}.`);
  L.push(`\n## 2. Evidências de demanda`);
  if (t.salesPeriod) L.push(`- Vendas nos últimos ${t.periodDays} dias: ${Math.round(t.salesPeriod.value)} ${t.salesPeriod.observed ? "(medido pela diferença de vendas acumuladas entre snapshots)" : `(ESTIMATIVA por extrapolação, cobertura ${pc(t.salesPeriod.confidence)})`}.`);
  else L.push(`- Vendas do período: **sem dados suficientes**. A fonte informa apenas vendas acumuladas; são necessários snapshots cobrindo o período.`);
  c.top.slice(0, 3).forEach((l) => L.push(`- ${l.title} — ${l.shopName}: ${l.salesCumulative ?? "?"} vendas acumuladas (total histórico, não do período) · ${brl(l.price)} · ${l.url || "sem link"}`));
  L.push(`\n## 3. Histórico e tendência\n- Classificação: **${TREND_LABELS[t.classification]}**. ${t.reasons.join(" ")}\n- Crescimento 7d: ${pc(t.growth7)} · 30d: ${pc(t.growth30)} · aceleração: ${pc(t.acceleration)} · variação de preço: ${pc(t.priceChange)}\n- Histórico disponível: ${Math.floor(t.spanDays)} dias, ${t.snapshotCount} snapshots. ${t.seasonality}`);
  L.push(`\n## 4. Concorrência\n- ${c.observedListings} anúncios e ${c.observedShops} vendedores **observados**${c.pageLimitReached ? " (limite da busca atingido: o total real é maior)" : ""}.`);
  if (c.price) L.push(`- Preços: mín. ${brl(c.price.min)} · mediana ${brl(c.price.median)} · máx. ${brl(c.price.max)} (diferença ${pc(c.price.spreadPct)}).`);
  L.push(`- Saturação: ${c.saturation === null ? "não calculável (menos de 3 anúncios)" : `${c.saturation.toFixed(0)}/100`} · Top 3 vendedores: ${pc(c.top3ShopShare)} do acumulado.`);
  L.push(`\n## 5. Fornecedores encontrados`);
  if (!f.fornecedores.length) L.push("- Nenhum fornecedor cadastrado. Use \"Encontrar Fornecedores\" para pesquisar e registrar cotações.");
  f.fornecedores.forEach((q) => L.push(`- ${q.nome} (${q.tipo}, ${q.pais}): ${typeof q.precoUnitario === "number" ? brl(q.precoUnitario) : q.precoUnitario}, mínimo ${q.compraMinima ?? "?"} un., cotação de ${q.dataCotacao} via ${q.canal}${q.site ? ` · ${q.site}` : ""}`));
  L.push(`\n## 6. Custos e precificação`);
  if (a.calc) {
    L.push(`- Preço de venda considerado: ${brl(a.salePrice)} (${a.salePriceSource}).\n- Custo unitário com frete do fornecedor: ${brl(a.landedCost)}.\n- Tarifas Shopee: ${brl(a.calc.fees.total)} (${(a.calc.fees.pct * 100).toFixed(0)}% + ${brl(a.calc.fees.fixed)}${a.calc.fees.cpfSurcharge ? ` + ${brl(a.calc.fees.cpfSurcharge)} CPF` : ""}).`);
    a.calc.warnings.forEach((w) => L.push(`- Aviso: ${w}`));
  } else L.push("- Não calculado: falta preço de fornecedor ou preço de venda de referência.");
  L.push(`\n## 7. Margem estimada\n${a.calc ? `- Margem de contribuição: ${brl(a.calc.contributionMargin)} por venda (${pc(a.calc.contributionPct)}), ROI ${pc(a.calc.roi)}. Estimativa com as premissas de custos das Configurações.` : "- Sem dados para estimar."}\n- Investimento inicial estimado: ${brl(a.investment)}.`);
  L.push(`\n## 8. Possíveis riscos\n${a.score.risks.map((r) => `- ${r}`).join("\n") || "- Nenhum risco identificado pelos indicadores disponíveis."}`);
  L.push(`\n## 9. Diferenciais comerciais\n${[...c.opportunities, ...a.score.advantages].map((r) => `- ${r}`).join("\n") || "- Sem sinais de diferenciação nos dados observados. Avalie manualmente fotos e descrições dos concorrentes."}`);
  const lot = a.chosenQuote?.moq ?? 30;
  L.push(`\n## 10. Plano de teste de mercado\n- Lote de teste: ${lot} unidades${a.investment !== null ? ` (≈ ${brl(a.investment)})` : ""}.\n- Preço de entrada: ${a.calc ? `${brl(a.salePrice)}, sem ir abaixo do ponto de equilíbrio calculado na Calculadora` : "defina na Calculadora após cadastrar a cotação"}.\n- Meta de validação: vender ao menos 50% do lote em 30 dias; acompanhar conversão e avaliações.\n- Continue a coleta diária de snapshots para confirmar a tendência.`);
  L.push(`\n---\n**Premissas:** vendas do período derivadas de snapshots de vendas acumuladas; custos variáveis padrão das Configurações; tarifas da tabela vigente. Este relatório é apoio à decisão, não garantia de vendas.`);
  return L.join("\n");
}

const SYSTEM = `Você é um analista de e-commerce para vendedores da Shopee Brasil. Reescreva o relatório recebido em português do Brasil, de forma clara e objetiva, mantendo as 10 seções.
REGRAS OBRIGATÓRIAS:
- Use SOMENTE os números, links, datas e fatos presentes no JSON e no relatório-base. Nunca invente números, fornecedores, vendas ou preços.
- Quando um dado estiver ausente, diga explicitamente "sem dados" e sugira como obtê-lo.
- Nunca trate vendas acumuladas como vendas do período.
- Mantenha todas as marcações de estimativa e o nível de confiança.
- Você pode acrescentar análise qualitativa (riscos, diferenciação, plano de teste), sempre identificada como opinião.`;

export interface AiResult {
  engine: string;
  model: string;
  content: string;
  error?: string;
}

export function aiConfigured() {
  return !!process.env.AI_PROVIDER?.trim() && (process.env.AI_PROVIDER === "openai" ? !!process.env.AI_BASE_URL?.trim() || !!process.env.AI_API_KEY?.trim() : !!process.env.AI_API_KEY?.trim());
}

export async function generateReport(a: ProductAnalysis, useAi: boolean): Promise<AiResult & { facts: unknown }> {
  const facts = buildFacts(a);
  const base = rulesReport(a);
  if (!useAi || !aiConfigured()) return { engine: "regras", model: "", content: base, facts };
  const provider = process.env.AI_PROVIDER!.trim();
  const user = `DADOS (JSON):\n${JSON.stringify(facts, null, 2)}\n\nRELATÓRIO-BASE:\n${base}`;
  try {
    if (provider === "anthropic") {
      const model = process.env.AI_MODEL?.trim() || "claude-opus-5-5";
      const client = new Anthropic({ apiKey: process.env.AI_API_KEY });
      const res = await client.messages.create({ model, max_tokens: 16000, system: SYSTEM, messages: [{ role: "user", content: user }] });
      if (res.stop_reason === "refusal") throw new Error("O modelo recusou a solicitação.");
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
      return { engine: "anthropic", model, content: text, facts };
    }
    // Qualquer API compatível com /chat/completions (OpenAI, OpenRouter, Ollama local gratuito...)
    const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.AI_MODEL?.trim() || "llama3.1";
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}) },
      body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content;
    if (!text) throw new Error("Resposta vazia da IA.");
    return { engine: "openai", model, content: text, facts };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { engine: "regras", model: "", content: `> Falha na IA (${msg}). Exibindo relatório por regras.\n\n${base}`, facts, error: msg };
  }
}
