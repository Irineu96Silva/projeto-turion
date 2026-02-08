export const PLANS = ['free', 'starter', 'pro'] as const;
export type Plan = (typeof PLANS)[number];
