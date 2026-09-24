import { prisma } from "@/lib/prisma";

export const FREE_FEED_VIDEOS_PER_DAY = Number.POSITIVE_INFINITY;

// Naira amounts, stored in kobo (1 naira = 100 kobo) for Paystack's
// smallest-unit convention — same pattern the app already uses for cents.
export const PLATFORM_PRICES = {
  FAN: { MONTHLY: 370000, YEARLY: 2000000 }, // ₦3,700/mo live access · ₦20,000/yr
  CREATOR: { MONTHLY: 200000, YEARLY: 1800000 }, // ₦2,000/mo · ₦18,000/yr
} as const;

export type PlanType = keyof typeof PLATFORM_PRICES;
export type BillingInterval = keyof (typeof PLATFORM_PRICES)["FAN"];

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getOrCreateDailyUsage(userId: string) {
  const date = todayUTC();
  return prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {},
  });
}

// Does this user have unlimited (paid or ambassador) access under the given
// platform plan type? Used to skip both the feed quota and the live quota.
export async function hasUnlimitedAccess(userId: string, planType: PlanType): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAmbassador: true } });
  if (user?.isAmbassador) return true;

  const sub = await prisma.platformSubscription.findFirst({
    where: { userId, planType, status: "active", currentPeriodEnd: { gt: new Date() } },
  });
  return !!sub;
}

// Call once per feed request with the number of video items about to be
// unlocked in this response. Returns how many of those the viewer is
// actually allowed today (the rest should be re-locked with reason
// "daily_limit"), and persists the updated count.
export async function consumeFeedVideoAllowance(userId: string, requestedCount: number): Promise<number> {
  if (requestedCount <= 0) return 0;
  if (await hasUnlimitedAccess(userId, "FAN")) return requestedCount;

  const usage = await getOrCreateDailyUsage(userId);
  const remaining = Math.max(0, FREE_FEED_VIDEOS_PER_DAY - usage.feedViewCount);
  const allowed = Math.min(remaining, requestedCount);

  if (allowed > 0) {
    await prisma.dailyUsage.update({
      where: { id: usage.id },
      data: { feedViewCount: { increment: allowed } },
    });
  }
  return allowed;
}

// Reels are completely free. Joining a creator's live requires the
// viewer to have the platform FAN pass (₦3,700/month) or be subscribed to
// that creator (or be an ambassador). This is enforced
// server-side before a LiveKit room token is issued.
export async function checkFreeLiveAllowance(
  userId: string,
  creatorId: string
): Promise<{ allowed: boolean; reason?: "fan_pass_required" }> {
  if (await hasUnlimitedAccess(userId, "FAN")) return { allowed: true };

  const creatorSub = await prisma.subscription.findUnique({
    where: { fanId_creatorId: { fanId: userId, creatorId } },
    select: { status: true },
  });
  if (creatorSub?.status === "active") return { allowed: true };

  return { allowed: false, reason: "fan_pass_required" };
}

// Can this creator post / go live right now?
export async function getCreatorGateStatus(
  userId: string,
  creator: { verificationStatus: string }
): Promise<{ allowed: boolean; reason?: "not_verified" | "no_creator_subscription" }> {
  if (creator.verificationStatus !== "VERIFIED") {
    return { allowed: false, reason: "not_verified" };
  }
  if (await hasUnlimitedAccess(userId, "CREATOR")) {
    return { allowed: true };
  }
  return { allowed: false, reason: "no_creator_subscription" };
}
