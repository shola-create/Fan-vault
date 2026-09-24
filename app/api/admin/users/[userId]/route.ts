import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === "ADMIN" ? session : null;
}

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true,
      bannedAt: true, banReason: true, banExpiresAt: true, isAmbassador: true, ambassadorRedeemedAt: true,
      creatorProfile: {
        select: {
          id: true, username: true, displayName: true, bio: true, avatarUrl: true, coverUrl: true,
          monthlyPriceCents: true, paystackSubaccountCode: true, onboardingComplete: true, payoutAccountLast4: true,
          verificationStatus: true, verificationSubmittedAt: true, verifiedAt: true, createdAt: true,
          posts: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, caption: true, mediaUrl: true, mediaType: true, isPaywalled: true, createdAt: true } },
          liveRooms: { orderBy: { startedAt: "desc" }, take: 50, select: { id: true, roomName: true, title: true, status: true, startedAt: true, endedAt: true } },
          subscribers: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, currentPeriodEnd: true, createdAt: true, fan: { select: { id: true, email: true, name: true } } } },
          tipMenuItems: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, emoji: true, amountCents: true, isActive: true, sortOrder: true } },
        }
      },
      interestPreferences: { select: { interest: true, createdAt: true } },
      reportsFiled: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, targetType: true, targetId: true, reason: true, details: true, status: true, createdAt: true, reviewedAt: true } },
      reportsAgainst: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, targetType: true, targetId: true, reason: true, details: true, status: true, createdAt: true, reviewedAt: true, reporter: { select: { id: true, email: true, name: true } } } },
      sentDirectMessages: { orderBy: { createdAt: "desc" }, take: 200, select: { id: true, body: true, createdAt: true, recipient: { select: { id: true, email: true, name: true } } } },
      receivedDirectMessages: { orderBy: { createdAt: "desc" }, take: 200, select: { id: true, body: true, createdAt: true, sender: { select: { id: true, email: true, name: true } } } },
      purchases: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, amountCents: true, createdAt: true, post: { select: { id: true, caption: true, creator: { select: { username: true } } } } } },
      giftsSent: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, amountCents: true, platformFeeCents: true, creatorAmountCents: true, tokenAmount: true, platformFeeTokens: true, creatorTokenAmount: true, isAdminGift: true, currency: true, status: true, createdAt: true, paidAt: true, recipient: { select: { id: true, name: true, email: true, creatorProfile: { select: { username: true } } } }, liveRoom: { select: { id: true, title: true } } } },
      giftsReceived: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, amountCents: true, platformFeeCents: true, creatorAmountCents: true, tokenAmount: true, platformFeeTokens: true, creatorTokenAmount: true, isAdminGift: true, currency: true, status: true, createdAt: true, paidAt: true, sender: { select: { id: true, name: true, email: true } }, liveRoom: { select: { id: true, title: true } } } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, currentPeriodEnd: true, createdAt: true, creator: { select: { username: true, displayName: true } } } },
      platformSubscriptions: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, planType: true, billingInterval: true, status: true, currentPeriodEnd: true, createdAt: true } },
      tokenWallet: { select: { balance: true, updatedAt: true } },
      tokenPurchases: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, tokens: true, amountCents: true, currency: true, status: true, createdAt: true, paidAt: true, pack: { select: { name: true } } } },
      tokenTransactions: { orderBy: { createdAt: "desc" }, take: 200, select: { id: true, type: true, amount: true, balanceAfter: true, referenceType: true, referenceId: true, note: true, createdAt: true } },
      moderationActions: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, reason: true, metadata: true, createdAt: true, admin: { select: { id: true, email: true, name: true } } } },
    }
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = (session.user as any).id;
  const { action, reason, durationDays, contentId } = await req.json();
  if (params.userId === adminId && ["ban", "unban"].includes(action)) return NextResponse.json({ error: "You cannot change the ban status of your own admin account" }, { status: 400 });

  if (action === "ban" || action === "unban") {
    const days = Number(durationDays);
    const banExpiresAt = action === "ban" && Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000) : null;
    const user = await prisma.user.update({ where: { id: params.userId }, data: action === "ban" ? { bannedAt: new Date(), banReason: String(reason || "Policy violation").slice(0, 1000), banExpiresAt } : { bannedAt: null, banReason: null, banExpiresAt: null } });
    await prisma.moderationAction.create({ data: { adminId, targetUserId: params.userId, action: action === "ban" ? "BAN" : "UNBAN", reason: reason ? String(reason).slice(0, 5000) : null, metadata: JSON.stringify({ durationDays: action === "ban" ? (Number.isFinite(days) && days > 0 ? days : null) : null }) } });
    return NextResponse.json({ user });
  }

  if (["remove_post", "remove_message"].includes(action)) {
    if (!contentId) return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    if (action === "remove_post") {
      const post = await prisma.post.findUnique({ where: { id: contentId }, select: { creator: { select: { userId: true } } } });
      if (!post || post.creator.userId !== params.userId) return NextResponse.json({ error: "Post not found for this user" }, { status: 404 });
      await prisma.post.delete({ where: { id: contentId } });
    } else {
      const msg = await prisma.directMessage.findUnique({ where: { id: contentId }, select: { senderId: true, recipientId: true } });
      if (!msg || (msg.senderId !== params.userId && msg.recipientId !== params.userId)) return NextResponse.json({ error: "Message not found for this user" }, { status: 404 });
      await prisma.directMessage.delete({ where: { id: contentId } });
    }
    await prisma.moderationAction.create({ data: { adminId, targetUserId: params.userId, action: action === "remove_post" ? "REMOVE_POST" : "REMOVE_MESSAGE", reason: reason ? String(reason).slice(0, 5000) : null, metadata: JSON.stringify({ contentId }) } });
    return NextResponse.json({ ok: true });
  }

  if (action === "end_live") {
    if (!contentId) return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    const room = await prisma.liveRoom.findFirst({ where: { id: contentId, creator: { userId: params.userId } } });
    if (!room) return NextResponse.json({ error: "Live room not found for this user" }, { status: 404 });
    await prisma.liveRoom.update({ where: { id: contentId }, data: { status: "ENDED", endedAt: new Date() } });
    await prisma.moderationAction.create({ data: { adminId, targetUserId: params.userId, action: "END_LIVE", reason: reason ? String(reason).slice(0, 5000) : null, metadata: JSON.stringify({ contentId }) } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
