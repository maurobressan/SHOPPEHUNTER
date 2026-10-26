import { collectAllAccounts } from "@/lib/collector";

// Chamado 1x por dia pelo agendador do servidor (Vercel Cron às 06:00 de Brasília, ver vercel.json)
// com o cabeçalho  Authorization: Bearer <CRON_SECRET>  (a Vercel envia automaticamente).
// 60 s cabe no plano mais básico; com muitas contas, aumente no plano Pro da Vercel.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("não autorizado", { status: 401 });
  const summary = await collectAllAccounts();
  return Response.json({ ok: true, accounts: summary.length, summary });
}
