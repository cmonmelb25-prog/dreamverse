'use server';

import { Engagement } from "@/lib/types";
import { logEngagement } from "@/server/actions/engagement-actions";

export async function logEngagementAction(data: Omit<Engagement, "id" | "timestamp">) {
  return await logEngagement(data);
}
