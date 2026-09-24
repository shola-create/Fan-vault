import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const followerId = (session.user as any).id as string;
  const { userId } = await req.json().catch(() => ({}));
  if (!userId || userId === followerId) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await prisma.follow.upsert({ where: { followerId_followingId: { followerId, followingId: userId } }, create: { followerId, followingId: userId }, update: {} });
  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const followerId = (session.user as any).id as string;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  await prisma.follow.deleteMany({ where: { followerId, followingId: userId } });
  return NextResponse.json({ following: false });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const [followers, following, relation] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    viewerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } }) : null,
  ]);
  return NextResponse.json({ followers, following, isFollowing: Boolean(relation) });
}
