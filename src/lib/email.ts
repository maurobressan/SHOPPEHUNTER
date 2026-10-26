// Envio de e-mail transacional via Resend (gratuito até 3.000/mês). Sem chave configurada,
// o e-mail não é enviado e a função devolve false (o app mostra alternativa ao usuário).
export function emailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.log(`[email não configurado] para ${to}: ${subject}`);
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!r.ok) console.error("Falha ao enviar e-mail", r.status, await r.text());
  return r.ok;
}

// APP_URL tem prioridade; na Vercel, sem domínio próprio, usa o endereço de produção do projeto.
export const appUrl = () =>
  (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
