// Faz as chamadas ao Shopee Hunter Pro (o content script não chama o servidor diretamente).
async function cfg() {
  const { appUrl, token } = await chrome.storage.sync.get(["appUrl", "token"]);
  return { appUrl: (appUrl || "http://localhost:3000").replace(/\/$/, ""), token: token || "" };
}

async function call(path, init = {}) {
  const { appUrl, token } = await cfg();
  if (!token) return { error: "Configure o endereço e o token clicando no ícone da extensão." };
  try {
    const r = await fetch(appUrl + path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { error: data.error || "Erro " + r.status };
    return data;
  } catch (e) {
    return { error: "Não foi possível conectar ao Shopee Hunter Pro em " + appUrl + ". Ele está aberto?" };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "context") call("/api/ext/context?url=" + encodeURIComponent(msg.url)).then(reply);
  else if (msg.type === "capture") call("/api/ext/capture", { method: "POST", body: JSON.stringify(msg.payload) }).then(reply);
  else if (msg.type === "openApp") cfg().then(({ appUrl }) => chrome.tabs.create({ url: appUrl + (msg.path || "/painel") }));
  return true; // resposta assíncrona
});
