import { Nozle } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

// Amounts are exact decimal strings. Keep them as strings, or use a decimal library, never floats.
export async function showCredits(customerId: string) {
  const balance = await nozle.credits.getBalance(customerId, 'ai_credits');
  return {
    unit: balance.unit_name,
    available: balance.available, // already excludes credits reserved by open holds
    held: balance.held ?? '0',
    asOf: balance.as_of,
    expiring: balance.sources
      .filter((source) => source.expires_at !== null)
      .map((source) => ({ type: source.type, remaining: source.remaining, expiresAt: source.expires_at })),
  };
}

export async function listAllCredits(customerId: string) {
  const { balances } = await nozle.credits.listBalances(customerId);
  return balances.map((balance) => ({ creditSystem: balance.credit_system, available: balance.available }));
}

export async function recentCreditOperations(customerId: string) {
  const page = await nozle.credits.listOperations(customerId, { creditSystemCode: 'ai_credits', limit: 25 });
  return page.operations;
}
