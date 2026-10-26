import { handleWebhook } from "@/lib/billing";

// Configure no Stripe: Desenvolvedores → Webhooks → {APP_URL}/api/billing/webhook
// Eventos: checkout.session.completed, customer.subscription.created/updated/deleted
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("assinatura ausente", { status: 400 });
  try {
    const type = await handleWebhook(await req.text(), sig);
    return Response.json({ received: true, type });
  } catch (e) {
    console.error("Webhook Stripe:", e);
    return new Response(`Webhook inválido: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }
}
