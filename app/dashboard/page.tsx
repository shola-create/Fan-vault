import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import AmbassadorRedeem from "@/components/AmbassadorRedeem";
import PlatformSubscribeButtons from "@/components/PlatformSubscribeButtons";
import InterestPreferences from "@/components/InterestPreferences";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAmbassador: true, avatarUrl: true, interestPreferences: { select: { interest: true } } } });
  const isAmbassador = user?.isAmbassador ?? false;

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
    include: {
      posts: { orderBy: { createdAt: "desc" } },
      subscribers: { where: { status: "active" } },
    },
  });

  if (!creator) {
    // Fan accounts: ambassador redemption + the all-access fan pass.
    const fanSub = await prisma.platformSubscription.findFirst({
      where: { userId, planType: "FAN", status: "active", currentPeriodEnd: { gt: new Date() } },
    });

    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <nav className="mb-8 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <span className="font-semibold text-stone-900">Dashboard</span>
          <div className="flex items-center gap-2">
            <Link href="/live" className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">🔴 Live</Link>
            <Link href="/feed" className="rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white hover:opacity-90">🎬 Reels</Link>
          </div>
        </nav>

        <div className="flex flex-col gap-4">
          {isAmbassador || fanSub ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
              {isAmbassador ? "✓ Ambassador — you have unlimited free access." : "✓ FAN pass active — unlimited live access. Reels are free."}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 p-4">
              <h2 className="font-medium">Get unlimited access</h2>
              <p className="mt-1 text-sm text-stone-500">
                Reels are completely free. The FAN pass costs ₦3,700/month and unlocks creator live streams; subscribing to an individual creator also unlocks that creator's live stream.
              </p>
              <div className="mt-3">
                <PlatformSubscribeButtons planType="FAN" />
              </div>
            </div>
          )}
          <AmbassadorRedeem isAmbassador={isAmbassador} />
          <InterestPreferences initial={user?.interestPreferences.map((x) => x.interest) ?? []} />
          <p className="text-center text-sm text-stone-500">Browse the feed or a live stream to get started.</p>
        </div>
      </main>
    );
  }

  const creatorSub = await prisma.platformSubscription.findFirst({
    where: { userId, planType: "CREATOR", status: "active", currentPeriodEnd: { gt: new Date() } },
  });
  const canPostOrGoLive = creator.verificationStatus === "VERIFIED" && (isAmbassador || !!creatorSub);

  return (
    <DashboardClient
      creator={{
        username: creator.username,
        avatarUrl: creator.avatarUrl,
        displayName: creator.displayName,
        onboardingComplete: creator.onboardingComplete,
        monthlyPriceCents: creator.monthlyPriceCents,
        payoutAccountLast4: creator.payoutAccountLast4,
        verificationStatus: creator.verificationStatus,
        isAmbassador,
        hasCreatorSubscription: !!creatorSub,
        canPostOrGoLive,
        posts: creator.posts.map((p) => ({
          id: p.id,
          caption: p.caption,
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType,
          isPaywalled: p.isPaywalled,
          createdAt: p.createdAt.toISOString(),
        })),
        subscriberCount: creator.subscribers.length,
      }}
    />
  );
}
