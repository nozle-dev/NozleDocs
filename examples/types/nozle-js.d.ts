declare module '@nozle-js/node' {
  export interface Plan {
    code: string;
    name: string;
    amount_cents: number;
    amount_currency: string;
    interval: string;
  }

  export type CheckoutResult =
    | {
        type: 'stripe';
        url?: string;
        client_secret?: string;
        clientSecret?: string;
        invoice_id?: string;
        amount_cents?: number;
        currency?: string;
      }
    | {
        type: 'completed' | 'scheduled';
        status: string;
        subscription_id?: string;
        plan_code?: string;
      };

  export interface CustomerEntity {
    external_id: string;
    name: string | null;
    status: 'active' | 'suspended' | 'deleted';
    metadata: Record<string, unknown>;
  }

  export interface CreditBalance {
    available: string;
    sources: Array<{ remaining: string; type: string }>;
  }

  export interface EntityCreditBalance extends CreditBalance {
    entity_available: string;
    shared_available: string;
    effective_available: string;
    pool_policy: 'entity_only' | 'entity_then_customer' | 'customer_only' | null;
  }

  export class Nozle {
    constructor(config: {
      apiKey: string;
      baseUrl?: string;
      eventsUrl?: string;
      timeout?: number;
    });

    ping(): Promise<{ ok: boolean; engine: string; version?: string }>;
    plans(): Promise<Plan[]>;
    checkout(
      customerId: string,
      planCode: string,
      returnUrl?: string,
    ): Promise<CheckoutResult>;
    subscribe(customerId: string, planCode: string): Promise<{
      subscription_id: string;
      status: string;
    }>;
    track(
      customerId: string,
      event: string,
      metadata?: Record<string, unknown>,
      options?: {
        subscriptionId?: string;
        transactionId?: string;
        timestamp?: string;
      },
    ): Promise<void>;
    can(
      customerId: string,
      feature: string,
      metadata?: Record<string, string>,
    ): Promise<{
      allowed: boolean;
      reason?: string;
      used: number;
      limit?: number;
      remaining?: number;
      overage?: boolean;
      cost_per_use_cents: number;
      revenue_per_use_cents: number;
      margin_per_use_cents: number;
    }>;
    checkAndDeduct(params: {
      customerId: string;
      feature: string;
      credits: number;
    }): Promise<{ allowed: boolean; remaining: number }>;

    customers: {
      upsert(params: {
        externalId: string;
        name?: string;
        email?: string;
      }): Promise<{ external_id: string; name?: string; email?: string }>;
    };
    creditSystems: {
      list(): Promise<Array<{ code: string; unitName: string; status: string }>>;
    };
    entities: {
      get(customerId: string, entityId: string): Promise<CustomerEntity>;
      list(
        customerId: string,
        query?: {
          status?: 'active' | 'suspended' | 'deleted';
          limit?: number;
          cursor?: string;
        },
      ): Promise<{
        entities: CustomerEntity[];
        next_cursor: string | null;
      }>;
      upsert(
        customerId: string,
        entityId: string,
        data: {
          name?: string | null;
          status: 'active' | 'suspended' | 'deleted';
          metadata?: Record<string, unknown>;
        },
        options: { idempotencyKey: string },
      ): Promise<{ action: string; entity: CustomerEntity; replayed: boolean }>;
      activate(
        customerId: string,
        entityId: string,
        options: { idempotencyKey: string },
      ): Promise<{ action: string; entity: CustomerEntity; replayed: boolean }>;
      suspend(
        customerId: string,
        entityId: string,
        options: { idempotencyKey: string },
      ): Promise<{ action: string; entity: CustomerEntity; replayed: boolean }>;
      bulkUpsert(
        customerId: string,
        entities: Array<{
          externalId: string;
          name?: string | null;
          status: 'active' | 'suspended' | 'deleted';
          metadata?: Record<string, unknown>;
        }>,
        options: { idempotencyKey: string },
      ): Promise<{ counts: Record<string, number>; replayed: boolean }>;
    };
    credits: {
      getBalance(customerId: string, creditSystemCode: string): Promise<CreditBalance>;
      listBalances(customerId: string): Promise<{ balances: CreditBalance[] }>;
      listOperations(
        customerId: string,
        query?: { creditSystemCode?: string; limit?: number; cursor?: string },
      ): Promise<{ operations: unknown[]; next_cursor: string | null }>;
      getEntityBalance(
        customerId: string,
        entityId: string,
        creditSystemCode: string,
      ): Promise<EntityCreditBalance>;
      listEntityBalances(
        customerId: string,
        entityId: string,
      ): Promise<{ balances: EntityCreditBalance[] }>;
      listEntityOperations(
        customerId: string,
        entityId: string,
        query?: { creditSystemCode?: string; limit?: number; cursor?: string },
      ): Promise<{ operations: unknown[]; next_cursor: string | null }>;
      allocate(
        customerId: string,
        entityId: string,
        params: { creditSystemCode: string; amount: string },
        options: { idempotencyKey: string },
      ): Promise<{ transferred: boolean; replayed: boolean }>;
      deallocate(
        customerId: string,
        entityId: string,
        params: { creditSystemCode: string; amount: string },
        options: { idempotencyKey: string },
      ): Promise<{ transferred: boolean; replayed: boolean }>;
    };
    usage: {
      check(params: {
        customerId: string;
        entityId?: string;
        billableMetricCode: string;
        creditSystemCode?: string;
        properties?: Record<string, unknown>;
        occurredAt?: string;
      }): Promise<{
        advisory: true;
        allowed: boolean;
        credits_required: string;
        projected_remaining?: string;
      }>;
      track(
        params: {
          customerId: string;
          entityId?: string;
          billableMetricCode: string;
          creditSystemCode?: string;
          properties?: Record<string, unknown>;
          timestamp?: string;
        },
        options: { idempotencyKey: string },
      ): Promise<{ allowed: boolean; reason?: string; remaining?: string }>;
    };
    margin: {
      summary(params?: Record<string, string | undefined>): Promise<unknown>;
      byCustomer(params?: Record<string, string | undefined>): Promise<unknown>;
      byMetric(params?: Record<string, string | undefined>): Promise<unknown>;
      byPlan(params?: Record<string, string | undefined>): Promise<unknown>;
      byModel(params?: Record<string, string | undefined>): Promise<unknown>;
      trend(params?: Record<string, string | undefined>): Promise<unknown>;
    };
  }
}

declare module '@nozle-js/react' {
  import type { ReactNode } from 'react';

  type CheckoutResult =
    | { type: 'stripe'; url?: string; client_secret?: string; clientSecret?: string }
    | { type: 'completed' | 'scheduled'; status: string };

  export function BillingProvider(props: {
    publishableKey: string;
    createCheckout?: (input: {
      planCode: string;
      returnUrl: string;
    }) => Promise<CheckoutResult>;
    children: ReactNode;
  }): ReactNode;

  export function PricingTable(props: { returnUrl?: string }): ReactNode;
}
