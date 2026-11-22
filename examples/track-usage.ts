import { Nozle } from '@nozle-js/node';

const nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });

interface Generation {
  id: string;
  customerId: string;
  inputTokens: number;
  outputTokens: number;
  completedAt: Date;
}

// Bill a feature metered from events. Call it after the work succeeded.
export async function trackGeneration(generation: Generation): Promise<string> {
  // The same transactionId and timestamp on a retry record the event once.
  return nozle.track(
    generation.customerId,
    'text_generation',
    {
      input_tokens: generation.inputTokens,
      output_tokens: generation.outputTokens,
    },
    {
      transactionId: `generation:${generation.id}:completed`,
      timestamp: generation.completedAt.toISOString(),
    },
  );
}

// Spend credits for one unit of work: checked and deducted in one call.
export async function chargeAgentStep(customerId: string, stepId: string, startedAt: Date) {
  const result = await nozle.usage.track(
    {
      customerId,
      featureCode: 'agent_execution',
      creditSystemCode: 'ai_credits',
      properties: { model: 'example-model' },
      timestamp: startedAt.toISOString(),
    },
    { idempotencyKey: `agent-step:${stepId}` },
  );
  if (!result.allowed) {
    return { charged: false as const, reason: result.reason, available: result.available };
  }
  return { charged: true as const, consumed: result.credits_consumed, remaining: result.remaining };
}
