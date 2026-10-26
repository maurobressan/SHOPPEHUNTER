// Cobrança recorrente via Stripe (cartão; boleto/Pix conforme ativação na sua conta Stripe).
// Sem STRIPE_SECRET_KEY o app funciona normalmente e o administrador altera planos manualmente.
import Stripe from "stripe";
import { prisma } from "./db";
import { appUrl } from "./email";

export const billingConfigured = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;
function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Pagamentos não configurados (STRIPE_SECRET_KEY).");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function createCheckout(accountId: string, planId: string, email: string): Promise<string> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active || !plan.stripePriceId) throw new Error("Plano sem preço configurado no Stripe (Admin → Planos).");
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  let customer = sub?.providerCustomerId ?? undefined;
  if (!customer) {
    customer = (await stripe().customers.create({ email, metadata: { accountId } })).id;
    await prisma.subscription.update({ where: { accountId }, data: { providerCustomerId: customer } });
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    client_reference_id: accountId,
    subscription_data: { metadata: { accountId, planId } },
    success_url: `${appUrl()}/assinatura?ok=${encodeURIComponent("Pagamento recebido! Seu plano será atualizado em instantes.")}`,
    cancel_url: `${appUrl()}/assinatura`,
    allow_promotion_codes: true,
    locale: "pt-BR",
  });
  if (!session.url) throw new Error("Stripe não retornou a URL de pagamento.");
  return session.url;
}

export async function createPortal(accountId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  if (!sub?.providerCustomerId) throw new Error("Esta conta ainda não tem cadastro de pagamento.");
  const s = await stripe().billingPortal.sessions.create({ customer: sub.providerCustomerId, return_url: `${appUrl()}/assinatura` });
  return s.url;
}

const STATUS: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  canceled: "canceled",
  incomplete_expired: "canceled",
  paused: "canceled",
};

async function syncSubscription(s: Stripe.Subscription) {
  const accountId = s.metadata?.accountId;
  if (!accountId) return;
  const priceId = s.items.data[0]?.price.id;
  const plan = priceId ? await prisma.plan.findFirst({ where: { stripePriceId: priceId } }) : null;
  const periodEnd = s.items.data[0]?.current_period_end;
  await prisma.subscription.update({
    where: { accountId },
    data: {
      provider: "stripe",
      providerSubscriptionId: s.id,
      providerCustomerId: typeof s.customer === "string" ? s.customer : s.customer.id,
      status: STATUS[s.status] ?? "past_due",
      ...(plan ? { planId: plan.id } : {}),
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      trialEndsAt: null,
    },
  });
}

export async function handleWebhook(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurado.");
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object;
      if (cs.subscription) await syncSubscription(await stripe().subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
  }
  return event.type;
}
