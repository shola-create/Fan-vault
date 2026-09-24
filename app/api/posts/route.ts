import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorGateStatus, hasUnlimitedAccess } from "@/lib/entitlements";

const GATE_MESSAGES: Record<string, string> = {
  not_verified: "Your creator account must be verified before you can post. Submit verification from your dashboard.",
  no_creator_subscription: "An active creator subscription is required to post. Subscribe from your dashboard.",
};

// POST: creator publishes a new post (mediaUrl assumed already uploaded to storage)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
  });
  if (!creator) {
    return NextResponse.json({ error: "Only creators can post" }, { status: 403 });
  }

  const gate = await getCreatorGateStatus(userId, creator);
  if (!gate.allowed) {
    return NextResponse.json({ error: GATE_MESSAGES[gate.reason!] }, { status: 403 });
  }

  const { caption, mediaUrl, mediaType, isPaywalled } = await req.json();
  if (!mediaUrl || !mediaType) {
    return NextResponse.json({ error: "mediaUrl and mediaType are required" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      creatorId: creator.id,
      caption,
      mediaUrl,
      mediaType,
      isPaywalled: isPaywalled ?? true,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}

// GET: fetch a creator's posts, gating mediaUrl behind an active subscription
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username query param is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    include: {
      posts: { orderBy: { createdAt: "desc" } },
      _count: { select: { subscribers: { where: { status: "active" } } } },
    },
  });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  let hasActiveSub = false;
  const viewerId = (session?.user as any)?.id;
  if (viewerId) {
    const sub = await prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId: viewerId, creatorId: creator.id } },
    });
    hasActiveSub = sub?.status === "active";
  }
  const isOwner = viewerId === creator.userId;

  // A creator's page splits their posts into two tabs:
  //  - "Reels": everything NOT marked paywalled — completely free.
  //  - "Content": posts marked paywalled — full exclusive content, gated
  //    by an active subscription to this specific creator. Media is
  //    withheld entirely (never sent) when locked.
  const viewerHasFanAccess = isOwner || (viewerId ? await hasUnlimitedAccess(viewerId, "FAN") : false);

  const reels = creator.posts
    .filter((post) => !post.isPaywalled)
    .map((post) => ({
      id: post.id,
      caption: post.caption,
      mediaType: post.mediaType,
      createdAt: post.createdAt,
      mediaUrl: post.mediaUrl,
      blurred: false,
    }));

  const content = creator.posts
    .filter((post) => post.isPaywalled)
    .map((post) => {
      const unlocked = hasActiveSub || isOwner;
      return {
        id: post.id,
        caption: post.caption,
        mediaType: post.mediaType,
        createdAt: post.createdAt,
        // The actual media URL is withheld entirely for locked posts —
        // never send a gated asset URL to the client and hide it with CSS.
        mediaUrl: unlocked ? post.mediaUrl : null,
        locked: !unlocked,
      };
    });

  return NextResponse.json({
    creator: {
      username: creator.username,
      userId: creator.userId,
      displayName: creator.displayName,
      bio: creator.bio,
      avatarUrl: creator.avatarUrl,
      coverUrl: creator.coverUrl,
      monthlyPriceCents: creator.monthlyPriceCents,
      subscriberCount: creator._count.subscribers,
    },
    reels,
    content,
    viewerHasActiveSub: hasActiveSub,
    viewerHasFanAccess,
  });
}
