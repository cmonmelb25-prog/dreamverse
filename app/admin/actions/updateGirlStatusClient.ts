"use client";

import { updateGirlStatus } from "@/server/actions/ai";

export async function updateGirlStatusClient(
  girlId: string,
  status: "online" | "offline"
) {
  return await updateGirlStatus(girlId, status);
}
