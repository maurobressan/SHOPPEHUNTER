import { getCtx } from "@/lib/auth";
import { salesReport } from "@/lib/sales";
import { reportToCsv } from "@/lib/import/report";

export async function GET(req: Request) {
  const ctx = await getCtx();
  if (!ctx) return new Response("Não autenticado.", { status: 401 });
  const days = Number(new URL(req.url).searchParams.get("dias")) || 30;
  const rep = await salesReport(ctx.accountId, days);
  if (!rep) return new Response("Nenhum pedido importado.", { status: 404 });
  return new Response(reportToCsv(rep), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-vendas-${days}d.csv"` },
  });
}
