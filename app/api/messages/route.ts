import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getContext(username: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const viewerId = (session.user as any).id as string;
  const creator = await prisma.creatorProfile.findUnique({ where: { username } });
  if (!creator) return { error: NextResponse.json({ error: "Creator not found" }, { status: 404 }) };
  return { viewerId, creator };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const fanId = searchParams.get("fanId");
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const ctx = await getContext(username);
  if ("error" in ctx) return ctx.error;
  const { viewerId, creator } = ctx;

  const partnerId = creator.userId === viewerId ? fanId : viewerId;
  if (!partnerId) return NextResponse.json({ messages: [] });

  if (creator.userId !== viewerId) {
    const sub = await prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId: viewerId, creatorId: creator.id } },
    });
    if (sub?.status !== "active") {
      return NextResponse.json({ error: "You must be subscribed to message this creator" }, { status: 403 });
    }
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      creatorId: creator.id,
      OR: [
        { senderId: viewerId, recipientId: partnerId },
        { senderId: partnerId, recipientId: viewerId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const { username, body } = await req.json();
  if (!username || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "username and message are required" }, { status: 400 });
  }
  if (body.trim().length > 2000) return NextResponse.json({ error: "Message is too long" }, { status: 400 });

  const ctx = await getContext(username);
  if ("error" in ctx) return ctx.error;
  const { viewerId, creator } = ctx;

  let recipientId: string;
  if (creator.userId === viewerId) {
    const fanId = req.headers.get("x-message-fan-id");
    if (!fanId) return NextResponse.json({ error: "Select a conversation first" }, { status: 400 });
    const existing = await prisma.directMessage.findFirst({
      where: { creatorId: creator.id, OR: [{ senderId: fanId, recipientId: viewerId }, { senderId: viewerId, recipientId: fanId }] },
    });
    if (!existing) return NextResponse.json({ error: "You can only reply to an existing conversation" }, { status: 403 });
    recipientId = fanId;
  } else {
    const sub = await prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId: viewerId, creatorId: creator.id } },
    });
    if (sub?.status !== "active") {
      return NextResponse.json({ error: "You must be subscribed to message this creator" }, { status: 403 });
    }
    recipientId = creator.userId;
  }

  const message = await prisma.directMessage.create({
    data: { creatorId: creator.id, senderId: viewerId, recipientId, body: body.trim() },
  });
  return NextResponse.json({ message }, { status: 201 });
}
