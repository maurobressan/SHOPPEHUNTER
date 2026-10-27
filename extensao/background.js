// Faz as chamadas ao Shoppe Hunter (o content script não chama o servidor diretamente).
const DEFAULT_URL = "https://shoppehunter.vercel.app";

async function cfg() {
  const { appUrl, token } = await chrome.storage.sync.get(["appUrl", "token"]);
  return { appUrl: (appUrl || DEFAULT_URL).replace(/\/$/, ""), token: token || "" };
}

async function call(path, init = {}) {
  const { appUrl, token } = await cfg();
  if (!token) return { error: "Configure o token clicando no ícone da extensão (Minha conta → Extensão no Shoppe Hunter)." };
  try {
    const r = await fetch(appUrl + path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { error: data.error || "Erro " + r.status };
    return data;
  } catch (e) {
    return { error: "Não foi possível conectar ao Shoppe Hunter em " + appUrl + "." };
  }
}

// Logo após instalar, abre a página do site que conecta a extensão à conta.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.tabs.create({ url: DEFAULT_URL + "/extensao" });
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "context") call("/api/ext/context?url=" + encodeURIComponent(msg.url)).then(reply);
  else if (msg.type === "capture") call("/api/ext/capture", { method: "POST", body: JSON.stringify(msg.payload) }).then(reply);
  else if (msg.type === "lookup") call("/api/ext/lookup", { method: "POST", body: JSON.stringify({ items: msg.items }) }).then(reply);
  else if (msg.type === "openApp") cfg().then(({ appUrl }) => chrome.tabs.create({ url: appUrl + (msg.path || "/painel") }));
  return true; // resposta assíncrona
});
