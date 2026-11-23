export type PlanId = 'FREE' | 'STARTER_10' | 'PREMIUM_50';
export type Entitlement = 'PUBLIC_INTELLIGENCE' | 'FULL_REPORT' | 'DEEP_ANALYSIS' | 'HISTORICAL_ACCESS' | 'ADVANCED_SEARCH' | 'ALERTS' | 'EXPORT' | 'API_ACCESS' | 'BULK_ACCESS' | 'PRIORITY_INTELLIGENCE';
export interface Plan { planId: PlanId; displayName: string; price: number; billingPeriod: 'month'; entitlements: Entitlement[]; limits: Record<string, number>; active: boolean; }
export const PLANS: readonly Plan[] = [
  { planId: 'FREE', displayName: 'Free', price: 0, billingPeriod: 'month', entitlements: ['PUBLIC_INTELLIGENCE'], limits: { reports: 10, exports: 0 }, active: true },
  { planId: 'STARTER_10', displayName: 'Starter', price: 10, billingPeriod: 'month', entitlements: ['PUBLIC_INTELLIGENCE', 'FULL_REPORT', 'DEEP_ANALYSIS', 'HISTORICAL_ACCESS'], limits: { reports: 100, exports: 10 }, active: true },
  { planId: 'PREMIUM_50', displayName: 'Premium', price: 50, billingPeriod: 'month', entitlements: ['PUBLIC_INTELLIGENCE', 'FULL_REPORT', 'DEEP_ANALYSIS', 'HISTORICAL_ACCESS', 'ADVANCED_SEARCH', 'ALERTS', 'EXPORT', 'API_ACCESS', 'BULK_ACCESS', 'PRIORITY_INTELLIGENCE'], limits: { reports: 1000, exports: 100 }, active: true },
];
export interface EntitlementContext { accountId: string; planId: PlanId; status: 'ACTIVE' | 'INACTIVE'; }
export function authorize(context: EntitlementContext, entitlement: Entitlement): boolean { const plan = PLANS.find((p) => p.planId === context.planId); return context.status === 'ACTIVE' && !!plan?.active && !!plan.entitlements.includes(entitlement); }
export interface PaymentProvider { createCheckout(input: unknown): Promise<{ checkoutId: string }>; processWebhook(input: unknown): Promise<void>; resolveSubscription(accountId: string): Promise<EntitlementContext | null>; cancelSubscription(accountId: string): Promise<void>; syncEntitlements(accountId: string): Promise<void>; }
