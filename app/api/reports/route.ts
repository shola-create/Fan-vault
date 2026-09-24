import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedTypes = new Set(["USER", "POST", "MESSAGE", "LIVE_ROOM"]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const reporterId = (session?.user as any)?.id as string | undefined;
  if (!reporterId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { targetType, targetId, reason, details } = await req.json();
  if (!allowedTypes.has(targetType) || !targetId || !reason?.trim()) {
    return NextResponse.json({ error: "A valid target, reason and report details are required" }, { status: 400 });
  }
  if (String(details ?? "").length > 5000) {
    return NextResponse.json({ error: "Report details are too long" }, { status: 400 });
  }

  let targetUserId: string | null = null;
  if (targetType === "USER") {
    const user = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    targetUserId = user.id;
  } else if (targetType === "POST") {
    const post = await prisma.post.findUnique({ where: { id: targetId }, select: { id: true, creator: { select: { userId: true } } } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    targetUserId = post.creator.userId;
  } else if (targetType === "MESSAGE") {
    const message = await prisma.directMessage.findUnique({ where: { id: targetId }, select: { id: true, senderId: true, recipientId: true } });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    targetUserId = message.senderId === reporterId ? message.recipientId : message.senderId;
  } else {
    const room = await prisma.liveRoom.findUnique({ where: { id: targetId }, select: { id: true, creator: { select: { userId: true } } } });
    if (!room) return NextResponse.json({ error: "Live room not found" }, { status: 404 });
    targetUserId = room.creator.userId;
  }

  const report = await prisma.contentReport.create({
    data: {
      reporterId,
      targetType,
      targetId,
      targetUserId,
      reason: String(reason).trim().slice(0, 200),
      details: details ? String(details).trim() : null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
