// Painel flutuante nas páginas de anúncio da Shopee.
(function () {
  const P = globalThis.HunterParse;
  const F = globalThis.HunterFees;
  let host = null;
  let lastUrl = "";

  const brl = (n) => (n == null || !isFinite(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  const pct = (n) => (n == null || !isFinite(n) ? "—" : (n * 100).toFixed(1).replace(".", ",") + "%");
  const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function readPage() {
    const og = document.querySelector('meta[property="og:title"]');
    const img = document.querySelector('meta[property="og:image"]');
    const main = document.querySelector("main") || document.body;
    const parsed = P.parseText(main.innerText || "");
    return { url: location.href, title: P.cleanTitle((og && og.content) || document.title), imageUrl: (img && img.content) || "", ...parsed };
  }

  const CSS = `
    :host { all: initial; }
    .box { position: fixed; right: 16px; bottom: 16px; width: 320px; z-index: 2147483647; font: 13px/1.4 system-ui, Segoe UI, sans-serif;
      background: #111830; color: #e6ebf5; border: 1px solid #24304f; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
    .hd { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #24304f; cursor:pointer; }
    .logo { width:22px; height:22px; border-radius:6px; background:linear-gradient(135deg,#22c55e,#3b82f6); color:#0b1020; font-weight:900; display:grid; place-items:center; }
    .bd { padding:10px 12px; max-height: 70vh; overflow:auto; }
    .min .bd { display:none; }
    label { display:block; font-size:11px; color:#8b97b3; margin:6px 0 2px; }
    input, select { width:100%; box-sizing:border-box; background:#0b1020; color:#e6ebf5; border:1px solid #24304f; border-radius:8px; padding:6px 8px; font:inherit; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .k { display:flex; justify-content:space-between; padding:3px 0; }
    .k span:first-child { color:#8b97b3; }
    .big { font-size:18px; font-weight:700; }
    .ok { color:#22c55e; } .bad { color:#f87171; } .warn { color:#fbbf24; font-size:11px; }
    button { width:100%; margin-top:10px; padding:9px; border:0; border-radius:9px; font:600 13px system-ui; cursor:pointer;
      background:linear-gradient(90deg,#22c55e,#06b6d4); color:#0b1020; }
    button.ghost { background:#16203d; color:#e6ebf5; border:1px solid #24304f; }
    .msg { margin-top:8px; font-size:12px; }
    .hist { font-size:11px; color:#8b97b3; margin-top:6px; }
  `;

  function render(data, ctx) {
    if (!host) {
      host = document.createElement("div");
      host.attachShadow({ mode: "open" });
      document.documentElement.appendChild(host);
    }
    const root = host.shadowRoot;
    const products = (ctx && ctx.products) || [];
    const linked = ctx && ctx.listing && ctx.listing.product;
    root.innerHTML = `<style>${CSS}</style>
      <div class="box">
        <div class="hd"><div class="logo">H</div><b style="flex:1">Shopee Hunter</b><span id="tg" style="color:#8b97b3">–</span></div>
        <div class="bd">
          ${ctx && ctx.error ? `<div class="msg bad">${esc(ctx.error)}</div>` : ""}
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
          <div id="calc" style="margin-top:10px"></div>
          <label>Seu custo por unidade (R$) — opcional</label><input id="cost" placeholder="ex.: 12,00">
          <label>Salvar em</label>
          <select id="prod">
            ${linked ? `<option value="${esc(linked.id)}">${esc(linked.name)} (já vinculado)</option>` : ""}
            <option value="__new">+ Novo produto…</option>
            ${products.filter((p) => !linked || p.id !== linked.id).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
          </select>
          <input id="newName" placeholder="nome do novo produto" style="margin-top:6px" value="${esc((data.title || "").slice(0, 60))}">
          <button id="save">Salvar no Hunter</button>
          <button id="open" class="ghost">Abrir Shopee Hunter Pro</button>
          <div id="msg" class="msg"></div>
          ${ctx && ctx.listing && ctx.listing.snapshots.length ? `<div class="hist">Já acompanhado: ${ctx.listing.snapshots.length} registro(s). Último: ${new Date(ctx.listing.snapshots[0].referenceDate).toLocaleDateString("pt-BR")} — ${brl(ctx.listing.snapshots[0].price)}, ${ctx.listing.snapshots[0].salesCumulative ?? "?"} vendidos.</div>` : ""}
        </div>
      </div>`;
    const $ = (id) => root.getElementById(id);
    const box = root.querySelector(".box");
    root.querySelector(".hd").onclick = () => { box.classList.toggle("min"); $("tg").textContent = box.classList.contains("min") ? "+" : "–"; };
    const sel = $("prod");
    const syncNew = () => ($("newName").style.display = sel.value === "__new" ? "block" : "none");
    sel.onchange = syncNew;
    syncNew();

    function recalc() {
      const price = P.num($("price").value);
      const el = $("calc");
      if (!ctx || ctx.error || !ctx.rules || !price) { el.innerHTML = ""; return; }
      const cost = P.num($("cost").value);
      const f = F.computeFees(price, ctx.rules, ctx.defaults.sellerType === "CPF" && ctx.defaults.cpfHighVolume);
      let html = `<div class="k"><span>Tarifas Shopee (${(f.pct * 100).toFixed(0)}% + ${brl(f.fixed)}${f.cpfSurcharge ? " + CPF" : ""})</span><b>${brl(f.total)}</b></div>
        <div class="k"><span>Você recebe (antes dos custos)</span><b>${brl(price - f.total)}</b></div>`;
      if (cost != null) {
        const m = F.margin(price, cost, ctx.defaults, ctx.rules);
        html += `<div class="k"><span>Margem estimada</span><span class="big ${m.value >= 0 ? "ok" : "bad"}">${brl(m.value)} · ${pct(m.pct)}</span></div>
          <div class="warn" style="color:#8b97b3">Com embalagem, impostos e demais custos padrão da sua conta.</div>`;
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

  async function check() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (!P.isProductUrl(location.href)) {
      if (host) host.remove(), (host = null);
      return;
    }
    // espera a página (SPA) carregar preço
    let data = readPage();
    for (let i = 0; i < 12 && data.price == null; i++) {
      await new Promise((r) => setTimeout(r, 700));
      data = readPage();
    }
    const ctx = await send({ type: "context", url: location.href });
    render(data, ctx);
  }

  check();
  setInterval(check, 1500); // a Shopee troca de página sem recarregar
})();
