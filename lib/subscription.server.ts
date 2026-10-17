"use server";

import { auth } from "@clerk/nextjs/server";
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  PLAN_PRIORITY,
  PLANS,
  PlanLimits,
  PlanType,
} from "@/lib/subscription-constants";

// Resolve the current user's plan using Clerk's has({ plan }) method.
// Users without an active subscription fall back to the free tier.
export const getUserPlan = async (): Promise<PlanType> => {
  const { has } = await auth();

  for (const plan of PLAN_PRIORITY) {
    if (has({ plan })) return plan;
  }

  return PLANS.free;
};

// Get the limits for the current user's plan.
export const getUserLimits = async (): Promise<PlanLimits> => {
  const plan = await getUserPlan();
  return PLAN_LIMITS[plan];
};

// Feature-flag helper backed by Clerk's has({ feature }) method.
export const userHasFeature = async (feature: string): Promise<boolean> => {
  const { has } = await auth();
  return has({ feature });
};

// Convenience helper for error copy that names the user's current plan.
export const getPlanLabel = async (): Promise<string> => {
  const plan = await getUserPlan();
  return PLAN_LABELS[plan];
};
