import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/feed?cursor=<postId>&limit=10
// Returns a page of posts across ALL creators, newest first, for the
// vertical scrolling feed. Each post is gated the same way as a single
// creator's page: mediaUrl is withheld unless the viewer is entitled to it.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 20);

  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;

  const posts = await prisma.post.findMany({
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      creator: true,
      likes: viewerId ? { where: { userId: viewerId } } : false,
      _count: { select: { likes: true } },
    },
  });

  // Batch-fetch this viewer's active subscriptions once, rather than a
  // query per post.
  let activeCreatorIds = new Set<string>();
  if (viewerId) {
    const subs = await prisma.subscription.findMany({
      where: { fanId: viewerId, status: "active" },
      select: { creatorId: true },
    });
    activeCreatorIds = new Set(subs.map((s) => s.creatorId));
  }

  // First pass: apply the existing per-creator paywall logic, same as before.
  const withPaywallGate = posts.map((post) => {
    const isOwner = viewerId === post.creator.userId;
    const hasActiveSub = activeCreatorIds.has(post.creatorId);
    const unlocked = !post.isPaywalled || hasActiveSub || isOwner;
    return { post, isOwner, unlocked };
  });

  // Reels (non-paywalled posts) are completely free. Exclusive posts remain
  // locked unless the viewer subscribes to that creator or owns the post.
  const items = withPaywallGate.map(({ post, isOwner, unlocked }) => {
    const locked = !unlocked;
    const lockReason: "paywall" | null = locked ? "paywall" : null;

    return {
      id: post.id,
      caption: post.caption,
      mediaType: post.mediaType,
      isPaywalled: post.isPaywalled,
      createdAt: post.createdAt,
      mediaUrl: locked ? null : post.mediaUrl,
      locked,
      lockReason,
      likeCount: post._count.likes,
      likedByViewer: viewerId ? post.likes.length > 0 : false,
      creator: {
        username: post.creator.username,
        displayName: post.creator.displayName,
        avatarUrl: post.creator.avatarUrl,
        monthlyPriceCents: post.creator.monthlyPriceCents,
      },
    };
  });

  const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
