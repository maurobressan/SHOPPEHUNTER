// Leitura do anúncio a partir do TEXTO VISÍVEL da página (sem acessar APIs internas da Shopee).
// A Shopee arredonda números grandes ("1,2mil vendidos"): o valor lido é aproximado.
(function (g) {
  function num(s) {
    if (s == null) return null;
    let t = String(s).trim().replace(/\s/g, "");
    if (!t) return null;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  // "1,2mil" → 1200 ; "10mil+" → 10000 ; "856" → 856
  function qty(s) {
    const m = String(s).match(/([\d.,]+)\s*(mil|k)?/i);
    if (!m) return null;
    const n = num(m[1]);
    if (n === null) return null;
    return Math.round(m[2] ? n * 1000 : n);
  }

  function parseText(text) {
    const out = { price: null, priceMax: null, sold: null, soldApprox: false, ratingStar: null, ratingCount: null };
    const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const m = l.match(/^R\$\s?([\d.,]+)(?:\s*[-–]\s*R\$\s?([\d.,]+))?$/);
      if (m) {
        out.price = num(m[1]);
        out.priceMax = m[2] ? num(m[2]) : null;
        break;
      }
    }
    const sold = String(text).match(/([\d.,]+\s*(?:mil|k)?\+?)\s*vendidos?/i);
    if (sold) {
      out.sold = qty(sold[1]);
      out.soldApprox = /mil|k|\+/i.test(sold[1]);
    }
    const rc = String(text).match(/([\d.,]+\s*(?:mil|k)?)\s*avalia/i);
    if (rc) out.ratingCount = qty(rc[1]);
    for (const l of lines) {
      if (/^[0-5][.,]\d$/.test(l)) {
        out.ratingStar = num(l);
        break;
      }
    }
    return out;
  }

  // Lê um cartão de anúncio de uma lista (busca, categoria, loja) a partir do seu texto visível.
  // Se a Shopee indicar vendas "por mês", o número NÃO é tratado como total acumulado.
  function parseCard(text, href, imgAlt) {
    const t = String(text || "");
    const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const ids = parseIds(href);
    const pm = t.match(/R\$\s*([\d.,]+)/);
    const sm = t.match(/([\d.,]+\s*(?:mil|k)?\+?)\s*vendidos?(\s*(?:\/\s*m[eê]s|por\s+m[eê]s|no\s+m[eê]s))?/i);
    const isTitle = (l) => l.length >= 8 && /[a-zà-ú]{3}/i.test(l) && !/R\$|vendid|^-?\d+%|frete|cupom|^ad$|an[uú]ncio/i.test(l);
    const title = (imgAlt && imgAlt.length >= 8 ? imgAlt : lines.filter(isTitle).sort((a, b) => b.length - a.length)[0]) || "";
    const card = { url: href, shopId: ids && ids.shopId, itemId: ids && ids.itemId, title: title.slice(0, 400), price: pm ? num(pm[1]) : null, sold: null, soldMonthly: null, soldApprox: false };
    if (sm) {
      const n = qty(sm[1]);
      if (sm[2]) card.soldMonthly = n;
      else card.sold = n;
      card.soldApprox = /mil|k|\+/i.test(sm[1]);
    }
    return card;
  }

  function parseIds(url) {
    let m = String(url).match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    m = String(url).match(/\/product\/(\d+)\/(\d+)/);
    return m ? { shopId: m[1], itemId: m[2] } : null;
  }

  function cleanTitle(t) {
    return String(t || "").replace(/\s*\|\s*Shopee.*$/i, "").trim();
  }

  function isProductUrl(url) {
    return /-i\.\d+\.\d+/.test(url) || /\/product\/\d+\/\d+/.test(url);
  }

  g.HunterParse = { num, qty, parseText, parseCard, parseIds, cleanTitle, isProductUrl };
})(globalThis);
