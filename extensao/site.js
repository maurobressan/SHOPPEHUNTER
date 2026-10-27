// Roda só nas páginas do próprio Shoppe Hunter. Avisa o site que a extensão está instalada
// e recebe o token quando o usuário clica em "Conectar extensão" (sem copiar e colar).
(function () {
  const version = chrome.runtime.getManifest().version;
  const announce = (connected) => window.postMessage({ source: "shoppe-hunter-ext", type: "status", version, connected }, location.origin);

  chrome.storage.sync.get(["token", "appUrl"]).then(({ token, appUrl }) => announce(!!token && appUrl === location.origin));

  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data || {};
    if (d.source !== "shoppe-hunter-site") return;
    if (d.type === "ping") {
      const { token, appUrl } = await chrome.storage.sync.get(["token", "appUrl"]);
      announce(!!token && appUrl === location.origin);
    } else if (d.type === "connect" && typeof d.token === "string" && /^shp_[\w-]+$/.test(d.token)) {
      await chrome.storage.sync.set({ token: d.token, appUrl: location.origin });
      window.postMessage({ source: "shoppe-hunter-ext", type: "connected", version }, location.origin);
    }
  });
})();
