import { Nozle } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

// Gate a request on the customer's plan. customerId comes from your session, never from the browser.
export async function handleAnalyticsRequest(customerId: string): Promise<Response> {
  const check = await nozle.can(customerId, 'analytics');

  if (!check.allowed) {
    return Response.json(
      {
        error: check.reason ?? 'upgrade_required',
        used: check.used,
        limit: check.limit,
        remaining: check.remaining,
      },
      { status: 403 },
    );
  }

  // overage never denies by itself: a soft limit is reached and the usage is billed as overage.
  if (check.overage) console.warn(`${customerId} is past the analytics limit and billed as overage`);

  return Response.json(await runAnalyticsQuery(customerId));
}

// A customer with several subscriptions names the one to check.
export async function canUseSeat(customerId: string, subscriptionId: string) {
  const check = await nozle.can(customerId, 'seats', {}, { subscriptionId });
  return check.allowed;
}

async function runAnalyticsQuery(customerId: string) {
  return { customerId, rows: [] };
}
