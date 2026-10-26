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

  function cleanTitle(t) {
    return String(t || "").replace(/\s*\|\s*Shopee.*$/i, "").trim();
  }

  function isProductUrl(url) {
    return /-i\.\d+\.\d+/.test(url) || /\/product\/\d+\/\d+/.test(url);
  }

  g.HunterParse = { num, qty, parseText, cleanTitle, isProductUrl };
})(globalThis);
