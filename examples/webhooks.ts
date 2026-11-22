import { Nozle, WebhookVerificationError, createWebhookHandler, type NozleWebhookEvent } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

// The endpoint's whsec_ secret. Pass [newSecret, oldSecret] while you rotate it.
const webhookSecret = process.env.NOZLE_WEBHOOK_SECRET;

const handled = new Set<string>(); // Use your database: Nozle retries a delivery until it gets a 2xx.

async function onEvent(event: NozleWebhookEvent): Promise<void> {
  if (handled.has(event.id)) return;
  switch (event.type) {
    case 'subscription.started':
      await grantAccess(event.object);
      break;
    case 'subscription.terminated':
      await revokeAccess(event.object);
      break;
    case 'invoice.payment_status_updated':
      await recordPayment(event.object);
      break;
    default:
      break; // Unsubscribed or new event types: acknowledge and ignore.
  }
  handled.add(event.id);
}

// Fetch-style frameworks (Next.js route handlers, Remix, Hono, Bun, Deno).
// Answers 200, 400 for a forged or stale request, 405 for other methods, 500 when onEvent throws.
export const POST = createWebhookHandler(nozle, { secret: webhookSecret, onEvent });

// Any other framework: verify the raw body before parsing it.
export async function handleRawWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
  try {
    const event = await nozle.webhooks.verify({ body: rawBody, headers, secret: webhookSecret });
    await onEvent(event);
    return { status: 200 };
  } catch (error) {
    if (error instanceof WebhookVerificationError) return { status: 400, code: error.code };
    throw error; // Answer 500 so Nozle delivers it again.
  }
}

async function grantAccess(subscription: Record<string, unknown>) {
  console.log('grant', subscription.external_id);
}
async function revokeAccess(subscription: Record<string, unknown>) {
  console.log('revoke', subscription.external_id);
}
async function recordPayment(invoice: Record<string, unknown>) {
  console.log('invoice', invoice.nozle_id, invoice.payment_status);
}
