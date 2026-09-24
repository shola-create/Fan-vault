import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = (session.user as any).id as string;
  const otherId = new URL(req.url).searchParams.get("userId");
  if (!otherId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const messages = await prisma.fanMessage.findMany({ where: { OR: [{ senderId: viewerId, recipientId: otherId }, { senderId: otherId, recipientId: viewerId }] }, orderBy: { createdAt: "asc" } });
  await prisma.fanMessage.updateMany({ where: { senderId: otherId, recipientId: viewerId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const senderId = (session.user as any).id as string;
  const { recipientId, body } = await req.json().catch(() => ({}));
  if (!recipientId || typeof body !== "string" || !body.trim()) return NextResponse.json({ error: "recipientId and message are required" }, { status: 400 });
  if (recipientId === senderId) return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, bannedAt: true, banExpiresAt: true } });
  if (!recipient) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (recipient.bannedAt && (!recipient.banExpiresAt || recipient.banExpiresAt > new Date())) return NextResponse.json({ error: "This account cannot receive messages" }, { status: 403 });
  const message = await prisma.fanMessage.create({ data: { senderId, recipientId, body: body.trim().slice(0, 2000) } });
  return NextResponse.json({ message });
}
