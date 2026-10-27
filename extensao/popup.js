const $ = (id) => document.getElementById(id);
const DEFAULT_URL = "https://shoppehunter.vercel.app";

async function test() {
  const { appUrl, token } = await chrome.storage.sync.get(["appUrl", "token"]);
  const base = (appUrl || DEFAULT_URL).replace(/\/$/, "");
  const st = $("status");
  if (!token) {
    st.className = "st off";
    st.textContent = "Ainda não conectada à sua conta.";
    return;
  }
  try {
    const r = await fetch(base + "/api/ext/context", { headers: { Authorization: "Bearer " + token } });
    const d = await r.json();
    st.className = r.ok ? "st on" : "st off";
    st.textContent = r.ok ? `Conectada ✓ · plano ${d.plan} · ${d.products.length} produto(s)` : d.error || "Erro " + r.status;
  } catch {
    st.className = "st off";
    st.textContent = "Sem conexão com o Shoppe Hunter. Confira a internet.";
  }
}

$("connect").onclick = async () => {
  const { appUrl } = await chrome.storage.sync.get(["appUrl"]);
  chrome.tabs.create({ url: (appUrl || DEFAULT_URL).replace(/\/$/, "") + "/extensao" });
};
$("shopee").onclick = () => chrome.tabs.create({ url: "https://shopee.com.br" });
$("save").onclick = async () => {
  const token = $("token").value.trim();
  if (!/^shp_[\w-]+$/.test(token)) {
    $("msg").textContent = "Token inválido.";
    return;
  }
  const { appUrl } = await chrome.storage.sync.get(["appUrl"]);
  await chrome.storage.sync.set({ token, appUrl: appUrl || DEFAULT_URL });
  $("msg").textContent = "";
  test();
};

test();
