// Painel do Shoppe Hunter dentro da Shopee.
// - Página de anúncio: tarifas, margem, histórico de vendas medido e botão de salvar.
// - Listas (busca, categoria, loja): selo com "vendidos" em cada anúncio, resumo da página
//   e botão para salvar todos como concorrentes.
// Lê somente o texto visível da página que o próprio usuário está vendo.
(function () {
  const P = globalThis.HunterParse;
  const F = globalThis.HunterFees;
  let host = null;
  let lastUrl = "";
  let mode = null; // "produto" | "lista"
  let ctx = null;
  let cards = new Map();
  let known = new Map();
  let lookedUp = new Set();
  let saving = false;

  const brl = (n) => (n == null || !isFinite(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const pct = (n) => (n == null || !isFinite(n) ? "—" : (n * 100).toFixed(1).replace(".", ",") + "%");
  const int = (n) => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ICON = chrome.runtime.getURL("icons/icon48.png");

  const CSS = `
    :host { all: initial; }
    .box { position: fixed; right: 16px; bottom: 16px; width: 340px; z-index: 2147483647; font: 13px/1.45 system-ui, Segoe UI, sans-serif;
      background: #fff; color: #0f1b3d; border: 1px solid #d8e1f0; border-radius: 16px; box-shadow: 0 20px 50px -12px rgba(11,30,79,.45); overflow: hidden; }
    .hd { display:flex; align-items:center; gap:8px; padding:10px 12px; background:#0b1e4f; color:#fff; cursor:pointer; }
    .hd img { width:24px; height:24px; }
    .hd b { flex:1; font-weight:800; } .hd b i { font-style:normal; color:#5fe0f5; }
    .bd { padding:12px; max-height: 70vh; overflow:auto; }
    .min .bd { display:none; }
    label { display:block; font-size:11px; font-weight:600; color:#5c6a8a; margin:8px 0 3px; }
    input, select { width:100%; box-sizing:border-box; background:#fff; color:#0f1b3d; border:1px solid #d8e1f0; border-radius:9px; padding:6px 8px; font:inherit; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .k { display:flex; justify-content:space-between; gap:8px; padding:3px 0; }
    .k span:first-child { color:#5c6a8a; }
    .big { font-size:18px; font-weight:800; }
    .ok { color:#128a4c; } .bad { color:#d62828; } .warn { color:#b45309; font-size:11px; }
    .card { background:#eef3fb; border-radius:12px; padding:10px; margin-top:10px; }
    .hl { background:linear-gradient(90deg,#12894c,#22c55e); color:#fff; border-radius:12px; padding:10px; margin-top:10px; }
    .hl small { display:block; opacity:.85; font-size:11px; }
    .hl b { font-size:20px; font-weight:800; }
    .note { font-size:11px; color:#5c6a8a; margin-top:6px; }
    .top { display:flex; gap:6px; align-items:center; padding:4px 0; border-bottom:1px solid #e6ecf6; font-size:12px; }
    .top:last-child { border-bottom:0; }
    .top span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .top b { color:#1565ff; }
    button { width:100%; margin-top:10px; padding:9px; border:0; border-radius:10px; font:700 13px system-ui; cursor:pointer;
      background:linear-gradient(90deg,#1565ff,#18c8e8); color:#fff; }
    button:disabled { opacity:.6; cursor:default; }
    button.ghost { background:#fff; color:#0f1b3d; border:1px solid #d8e1f0; }
    .msg { margin-top:8px; font-size:12px; }
  `;

  function shell(title) {
    if (!host) {
      host = document.createElement("div");
      host.attachShadow({ mode: "open" });
      document.documentElement.appendChild(host);
    }
    const root = host.shadowRoot;
    const wasMin = root.querySelector(".box.min");
    root.innerHTML = `<style>${CSS}</style>
      <div class="box${wasMin ? " min" : ""}">
        <div class="hd"><img src="${ICON}" alt=""><b>Shoppe<i>Hunter</i> · ${esc(title)}</b><span id="tg">${wasMin ? "+" : "–"}</span></div>
        <div class="bd" id="bd"></div>
      </div>`;
    const box = root.querySelector(".box");
    root.querySelector(".hd").onclick = () => {
      box.classList.toggle("min");
      root.getElementById("tg").textContent = box.classList.contains("min") ? "+" : "–";
    };
    return root;
  }

  // ---------- página de anúncio ----------

  function readPage() {
    const og = document.querySelector('meta[property="og:title"]');
    const img = document.querySelector('meta[property="og:image"]');
    const main = document.querySelector("main") || document.body;
    const parsed = P.parseText(main.innerText || "");
    return { url: location.href, title: P.cleanTitle((og && og.content) || document.title), imageUrl: (img && img.content) || "", ...parsed };
  }

  // Vendas medidas entre o registro mais antigo (até 30 dias) e o "vendidos" de agora.
  function measured(sold, snaps) {
    if (sold == null || !snaps || !snaps.length) return null;
    const limit = Date.now() - 30 * 86400000;
    const old = snaps.filter((s) => s.salesCumulative != null && new Date(s.referenceDate).getTime() >= limit).pop();
    if (!old) return null;
    const days = (Date.now() - new Date(old.referenceDate).getTime()) / 86400000;
    if (days < 1) return null;
    return { sold: Math.max(0, sold - old.salesCumulative), days: Math.round(days), from: new Date(old.referenceDate) };
  }

  function renderProduct(data) {
    const root = shell("anúncio");
    const products = (ctx && ctx.products) || [];
    const linked = ctx && ctx.listing && ctx.listing.product;
    const m = measured(data.sold, ctx && ctx.listing && ctx.listing.snapshots);
    root.getElementById("bd").innerHTML = `
      ${ctx && ctx.error ? `<div class="msg bad">${esc(ctx.error)}</div>` : ""}
      ${
        m
          ? `<div class="hl"><small>Vendas medidas desde ${m.from.toLocaleDateString("pt-BR")} (${m.days} dias)</small><b>${int(m.sold)} vendas</b> <small>≈ ${int(m.sold / m.days)} por dia${data.soldApprox ? " · aproximado (a Shopee arredonda)" : ""}</small></div>`
          : `<div class="card"><b>${data.sold == null ? "—" : int(data.sold)} vendidos no total</b><div class="note">Esse número é o total desde que o anúncio foi criado. Salve hoje e volte em outros dias: o Hunter calcula quanto vendeu no período pela diferença.</div></div>`
      }
      <label>Título</label><input id="title" value="${esc(data.title)}">
      <div class="row">
        <div><label>Preço (R$)</label><input id="price" value="${esc(data.price)}"></div>
        <div><label>Vendidos (total)</label><input id="sold" value="${esc(data.sold)}"></div>
      </div>
      <div class="row">
        <div><label>Nota</label><input id="star" value="${esc(data.ratingStar)}"></div>
        <div><label>Avaliações</label><input id="rc" value="${esc(data.ratingCount)}"></div>
      </div>
      <label>Loja</label><input id="shop" placeholder="nome da loja (opcional)">
      ${data.soldApprox ? `<div class="warn">A Shopee mostra “vendidos” arredondado: o valor é aproximado.</div>` : ""}
      <div id="calc" class="card"></div>
      <label>Seu custo por unidade (R$) — opcional</label><input id="cost" placeholder="ex.: 12,00">
      <label>Salvar em</label>
      <select id="prod">
        ${linked ? `<option value="${esc(linked.id)}">${esc(linked.name)} (já vinculado)</option>` : ""}
        <option value="__new">+ Novo produto…</option>
        ${products.filter((p) => !linked || p.id !== linked.id).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
      </select>
      <input id="newName" placeholder="nome do novo produto" style="margin-top:6px" value="${esc((data.title || "").slice(0, 60))}">
      <button id="save">Salvar no Hunter</button>
      <button id="open" class="ghost">Abrir Shoppe Hunter</button>
      <div id="msg" class="msg"></div>`;
    const $ = (id) => root.getElementById(id);
    const sel = $("prod");
    const syncNew = () => ($("newName").style.display = sel.value === "__new" ? "block" : "none");
    sel.onchange = syncNew;
    syncNew();

    function recalc() {
      const price = P.num($("price").value);
      const el = $("calc");
      if (!ctx || ctx.error || !ctx.rules || !price) { el.style.display = "none"; return; }
      el.style.display = "block";
      const cost = P.num($("cost").value);
      const f = F.computeFees(price, ctx.rules, ctx.defaults.sellerType === "CPF" && ctx.defaults.cpfHighVolume);
      let html = `<div class="k"><span>Tarifas Shopee (${(f.pct * 100).toFixed(0)}% + ${brl(f.fixed)}${f.cpfSurcharge ? " + CPF" : ""})</span><b>${brl(f.total)}</b></div>
        <div class="k"><span>Você recebe (antes dos custos)</span><b>${brl(price - f.total)}</b></div>`;
      if (cost != null) {
        const mg = F.margin(price, cost, ctx.defaults, ctx.rules);
        html += `<div class="k"><span>Margem estimada</span><span class="big ${mg.value >= 0 ? "ok" : "bad"}">${brl(mg.value)} · ${pct(mg.pct)}</span></div>
          <div class="note">Com embalagem, impostos e demais custos padrão da sua conta.</div>`;
      }
      el.innerHTML = html;
    }
    ["price", "cost"].forEach((id) => $(id).addEventListener("input", recalc));
    recalc();

    $("open").onclick = () => send({ type: "openApp", path: linked ? "/produtos/" + linked.id : "/painel" });
    $("save").onclick = async () => {
      const payload = {
        url: location.href,
        title: $("title").value.trim(),
        shopName: $("shop").value.trim(),
        imageUrl: data.imageUrl || "",
        price: P.num($("price").value),
        priceMax: data.priceMax ?? null,
        sold: $("sold").value ? Math.round(P.num($("sold").value)) : null,
        soldApprox: !!data.soldApprox,
        ratingStar: P.num($("star").value),
        ratingCount: $("rc").value ? Math.round(P.num($("rc").value)) : null,
      };
      if (sel.value === "__new") payload.newProductName = $("newName").value.trim() || payload.title.slice(0, 60);
      else payload.productId = sel.value;
      $("msg").textContent = "Salvando…";
      const r = await send({ type: "capture", payload });
      $("msg").innerHTML = r && r.ok ? `<span class="ok">Salvo! ${r.updatedToday ? "Registro de hoje atualizado." : "Novo registro criado."} (${r.snapshots} no histórico)</span>` : `<span class="bad">${esc((r && r.error) || "Erro ao salvar.")}</span>`;
    };
  }

  // ---------- listas: busca, categoria, loja ----------

  function cardElement(a) {
    let el = a;
    for (let i = 0; i < 5 && el && !/R\$/.test(el.innerText || ""); i++) el = el.parentElement;
    return el && /R\$/.test(el.innerText || "") ? el : null;
  }

  function scanCards() {
    const found = new Map();
    for (const a of document.querySelectorAll("a[href]")) {
      if (host && host.contains(a)) continue;
      const ids = P.parseIds(a.href);
      if (!ids) continue;
      const key = ids.shopId + "." + ids.itemId;
      if (found.has(key)) continue;
      const el = cardElement(a);
      if (!el) continue;
      const img = el.querySelector("img[alt]");
      const c = P.parseCard(el.innerText, a.href.split("?")[0], img && img.alt);
      if (!c.title || c.price == null) continue;
      found.set(key, { ...c, key, anchor: a });
    }
    return found;
  }

  function badge(c) {
    let b = c.anchor.querySelector(":scope > .hunter-badge");
    if (!b) {
      b = document.createElement("div");
      b.className = "hunter-badge";
      b.style.cssText = "position:absolute;left:6px;top:6px;z-index:5;padding:3px 7px;border-radius:8px;font:700 11px/1.3 system-ui,sans-serif;color:#fff;background:rgba(11,30,79,.92);box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none;max-width:90%";
      if (getComputedStyle(c.anchor).position === "static") c.anchor.style.position = "relative";
      c.anchor.appendChild(b);
    }
    const k = known.get(c.key);
    const sold = c.sold != null ? `${int(c.sold)}${c.soldApprox ? "+" : ""} vendidos` : c.soldMonthly != null ? `${int(c.soldMonthly)} vendidos/mês` : "sem vendas visíveis";
    const extra = k && k.measured ? `<br><span style="color:#7bf0ad">+${int(k.measured.sold)} em ${k.measured.days}d (medido)</span>` : k ? `<br><span style="color:#5fe0f5">acompanhado</span>` : "";
    b.innerHTML = `🔎 ${esc(sold)}${extra}`;
  }

  function median(xs) {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
  }

  function renderList() {
    const root = shell("esta página");
    const list = [...cards.values()];
    const withSold = list.filter((c) => c.sold != null);
    const prices = list.map((c) => c.price).filter((p) => p != null);
    const top = [...withSold].sort((a, b) => b.sold - a.sold).slice(0, 5);
    const products = (ctx && ctx.products) || [];
    const kw = new URLSearchParams(location.search).get("keyword") || "";
    const f = ctx && ctx.rules && median(prices) ? F.computeFees(median(prices), ctx.rules, ctx.defaults.sellerType === "CPF" && ctx.defaults.cpfHighVolume) : null;
    const monthly = list.some((c) => c.soldMonthly != null);
    root.getElementById("bd").innerHTML = `
      ${ctx && ctx.error ? `<div class="msg bad">${esc(ctx.error)}</div>` : ""}
      <div class="card">
        <div class="k"><span>Anúncios lidos</span><b>${list.length}</b></div>
        <div class="k"><span>Soma de vendidos (total visível)</span><b>${int(withSold.reduce((s, c) => s + c.sold, 0))}</b></div>
        <div class="k"><span>Preço mediano</span><b>${brl(median(prices))}</b></div>
        <div class="k"><span>Faixa de preço</span><b>${brl(Math.min(...prices))} – ${brl(Math.max(...prices))}</b></div>
        ${f ? `<div class="k"><span>Tarifa Shopee no preço mediano</span><b>${brl(f.total)}</b></div>` : ""}
      </div>
      ${top.length ? `<label>Mais vendidos nesta página</label>${top.map((c) => `<div class="top"><span title="${esc(c.title)}">${esc(c.title)}</span><b>${int(c.sold)}${c.soldApprox ? "+" : ""}</b></div>`).join("")}` : ""}
      <div class="note">“Vendidos” é o total desde a criação de cada anúncio, como a Shopee mostra${monthly ? " (onde aparece “/mês”, é o número do mês)" : ""}. Para saber quanto vendem por semana ou mês, salve e volte a esta busca em outros dias: o selo de cada anúncio passa a mostrar as vendas medidas.</div>
      <label>Salvar como concorrentes de</label>
      <select id="prod">
        <option value="__new">+ Novo produto…</option>
        ${products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
      </select>
      <input id="newName" placeholder="nome do produto" style="margin-top:6px" value="${esc(kw)}">
      <button id="saveAll" ${saving ? "disabled" : ""}>Salvar os ${list.length} anúncios no Hunter</button>
      <div id="msg" class="msg"></div>`;
    const $ = (id) => root.getElementById(id);
    const sel = $("prod");
    const syncNew = () => ($("newName").style.display = sel.value === "__new" ? "block" : "none");
    sel.onchange = syncNew;
    syncNew();
    $("saveAll").onclick = () => saveAll(sel.value, $("newName").value.trim(), $("saveAll"), $("msg"));
  }

  async function saveAll(target, newName, btn, msg) {
    if (target === "__new" && !newName) { msg.innerHTML = `<span class="bad">Dê um nome ao produto.</span>`; return; }
    saving = true;
    btn.disabled = true;
    let productId = target === "__new" ? null : target;
    let ok = 0, fail = 0, lastErr = "";
    const list = [...cards.values()];
    for (const c of list) {
      msg.textContent = `Salvando ${ok + fail + 1} de ${list.length}…`;
      const payload = { url: c.url, title: c.title, shopName: "", imageUrl: "", price: c.price, priceMax: null, sold: c.sold, soldApprox: c.soldApprox, ratingStar: null, ratingCount: null };
      if (productId) payload.productId = productId;
      else payload.newProductName = newName;
      const r = await send({ type: "capture", payload });
      if (r && r.ok) { ok++; productId = productId || r.productId; }
      else { fail++; lastErr = (r && r.error) || "erro"; if (/plano|Token|Configure/i.test(lastErr)) break; }
    }
    saving = false;
    btn.disabled = false;
    msg.innerHTML = `<span class="${fail ? "warn" : "ok"}">${ok} anúncio(s) salvos${fail ? ` · ${fail} com erro (${esc(lastErr)})` : ""}.</span>`;
    lookedUp = new Set();
    await lookup();
  }

  async function lookup() {
    const keys = [...cards.keys()].filter((k) => !lookedUp.has(k));
    if (!keys.length || !ctx || ctx.error) return;
    keys.forEach((k) => lookedUp.add(k));
    const r = await send({ type: "lookup", items: keys.slice(0, 120).map((k) => ({ shopId: k.split(".")[0], itemId: k.split(".")[1] })) });
    if (r && r.items) for (const it of r.items) known.set(it.key, it);
    cards.forEach(badge);
  }

  async function refreshList(force) {
    const found = scanCards();
    if (found.size < 3) return false;
    const changed = force || found.size !== cards.size || [...found.keys()].some((k) => !cards.has(k));
    cards = found;
    cards.forEach(badge);
    if (changed && !saving) {
      renderList();
      lookup();
    }
    return true;
  }

  // ---------- ciclo ----------

  async function check() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cards = new Map();
      lookedUp = new Set();
      if (P.isProductUrl(location.href)) {
        mode = "produto";
        let data = readPage();
        for (let i = 0; i < 12 && data.price == null; i++) {
          await new Promise((r) => setTimeout(r, 700)); // a Shopee carrega o preço depois
          data = readPage();
        }
        ctx = await send({ type: "context", url: location.href });
        renderProduct(data);
        return;
      }
      mode = "lista";
      if (host) host.remove(), (host = null);
      ctx = await send({ type: "context", url: location.href });
      await refreshList(true);
      return;
    }
    if (mode === "lista") refreshList(false); // rolagem carrega mais anúncios
  }

  check();
  setInterval(check, 1500); // a Shopee troca de página sem recarregar
})();
