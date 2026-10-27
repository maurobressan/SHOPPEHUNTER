// Simula a API do Chrome para gerar as imagens da loja com a extensão de verdade (dados de exemplo).
const RULES = { bands: [{ min: 0, pct: 0.2, fixed: 4.5 }, { min: 80, pct: 0.14, fixed: 16 }, { min: 100, pct: 0.14, fixed: 20 }, { min: 200, pct: 0.14, fixed: 26 }], lowPrice: { below: 9, fixedFractionOfPrice: 0.5 } };
const DAY = 86400000;
window.chrome = {
  runtime: {
    getURL: (p) => "../../extensao/" + p,
    sendMessage: (m, cb) =>
      setTimeout(() => {
        if (m.type === "context")
          cb({
            plan: "pro",
            products: [{ id: "p1", name: "Garrafa térmica" }],
            defaults: { sellerType: "CNPJ", cpfHighVolume: false, packagingCost: 1.2, shippingCost: 0, taxPct: 6, adsPct: 0, lossPct: 2, otherVariableCost: 0 },
            rules: RULES,
            listing: window.__listing || null,
          });
        else if (m.type === "lookup") cb({ items: [{ key: "11.101", records: 4, measured: { sold: 140, days: 7 } }, { key: "13.103", records: 4, measured: { sold: 312, days: 7 } }] });
        else cb({ ok: true });
      }, 30),
  },
};
