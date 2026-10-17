// ============================================
// SUBSCRIPTION PLANS & LIMITS
// ============================================
// Plan slugs must match the Plans configured in the Clerk Dashboard.
// Users without an active subscription are treated as "free".

export const PLANS = {
  free: "free",
  standard: "standard",
  pro: "pro",
} as const;

export type PlanType = (typeof PLANS)[keyof typeof PLANS];

// Plan slugs in priority order (highest first). Used to resolve a user's plan
// by checking Clerk's has({ plan }) from most to least privileged.
export const PLAN_PRIORITY: PlanType[] = [PLANS.pro, PLANS.standard];

export interface PlanLimits {
  // Maximum number of books a user may own on this plan
  maxBooks: number;
  // Maximum voice sessions allowed per calendar month (Infinity = unlimited)
  maxSessionsPerMonth: number;
  // Maximum duration of a single voice session, in minutes
  maxDurationPerSession: number;
  // Whether the user can view their past session history
  hasSessionHistory: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PLANS.free]: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxDurationPerSession: 5,
    hasSessionHistory: false,
  },
  [PLANS.standard]: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxDurationPerSession: 15,
    hasSessionHistory: true,
  },
  [PLANS.pro]: {
    maxBooks: 100,
    maxSessionsPerMonth: Infinity,
    maxDurationPerSession: 60,
    hasSessionHistory: true,
  },
};

// Human-friendly plan names for UI copy / error messages
export const PLAN_LABELS: Record<PlanType, string> = {
  [PLANS.free]: "Free",
  [PLANS.standard]: "Standard",
  [PLANS.pro]: "Pro",
};

// ============================================
// BILLING PERIOD HELPERS
// ============================================

// Billing periods are tracked by calendar month. Returns the UTC timestamp for
// the first instant of the month containing `date` (defaults to now).
export const getCurrentBillingPeriodStart = (date: Date = new Date()): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
};
