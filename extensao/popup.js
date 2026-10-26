const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(["appUrl", "token"]).then(({ appUrl, token }) => {
  $("url").value = appUrl || "http://localhost:3000";
  $("token").value = token || "";
});

$("save").onclick = async () => {
  const appUrl = $("url").value.trim().replace(/\/$/, "");
  const token = $("token").value.trim();
  const msg = $("msg");
  let origin;
  try {
    origin = new URL(appUrl).origin;
  } catch {
    msg.textContent = "Endereço inválido.";
    return;
  }
  // permissão para acessar o endereço informado (pedido pelo próprio Chrome)
  const granted = await chrome.permissions.request({ origins: [origin + "/*"] }).catch(() => false);
  if (!granted && !origin.startsWith("http://localhost:3000")) {
    msg.textContent = "Permissão negada para " + origin;
    return;
  }
  await chrome.storage.sync.set({ appUrl, token });
  msg.textContent = "Testando…";
  try {
    const r = await fetch(appUrl + "/api/ext/context", { headers: { Authorization: "Bearer " + token } });
    const d = await r.json();
    msg.style.color = r.ok ? "#22c55e" : "#f87171";
    msg.textContent = r.ok ? `Conectado! Plano ${d.plan}, ${d.products.length} produto(s).` : d.error || "Erro " + r.status;
  } catch {
    msg.innerHTML = `<span style="color:#f87171">Não foi possível conectar. O Shoppe Hunter está aberto?</span>`;
  }
};
