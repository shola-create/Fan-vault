import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST toggles a like: creates it if missing, removes it if present.
// Liking a locked (paywalled, not-subscribed) post is blocked — you
// shouldn't be able to signal-boost content you can't actually see.
export async function POST(req: Request, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    include: { creator: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.isPaywalled) {
    const isOwner = post.creator.userId === userId;
    const sub = await prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId: userId, creatorId: post.creatorId } },
    });
    const unlocked = isOwner || sub?.status === "active";
    if (!unlocked) {
      return NextResponse.json({ error: "Subscribe to like this post" }, { status: 403 });
    }
  }

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId, postId: post.id } });
  }

  const likeCount = await prisma.like.count({ where: { postId: post.id } });

  return NextResponse.json({ liked: !existing, likeCount });
}
