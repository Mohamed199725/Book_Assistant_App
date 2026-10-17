"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import {
  PLAN_LIMITS,
  PLAN_PRIORITY,
  PLANS,
  PlanLimits,
  PlanType,
} from "@/lib/subscription-constants";

export interface UseSubscriptionResult {
  plan: PlanType;
  limits: PlanLimits;
  isFree: boolean;
  isStandard: boolean;
  isPro: boolean;
  hasSessionHistory: boolean;
  // True while Clerk is still resolving the user's session
  isLoading: boolean;
}

// Client-side plan check using Clerk's useAuth().has() method.
// Mirrors the server-side getUserPlan() logic in lib/subscription.server.ts.
export function useSubscription(): UseSubscriptionResult {
  const { has, isLoaded } = useAuth();

  return useMemo(() => {
    let plan: PlanType = PLANS.free;

    for (const candidate of PLAN_PRIORITY) {
      if (has?.({ plan: candidate })) {
        plan = candidate;
        break;
      }
    }

    const limits = PLAN_LIMITS[plan];

    return {
      plan,
      limits,
      isFree: plan === PLANS.free,
      isStandard: plan === PLANS.standard,
      isPro: plan === PLANS.pro,
      hasSessionHistory: limits.hasSessionHistory,
      isLoading: !isLoaded,
    };
  }, [has, isLoaded]);
}

export default useSubscription;
