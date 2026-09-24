import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!creator) return NextResponse.json({ error: "Only creators have an inbox" }, { status: 403 });

  const messages = await prisma.directMessage.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    take: 500,
  });

  const seen = new Set<string>();
  const conversations = [];
  for (const m of messages) {
    const fanId = m.senderId === userId ? m.recipientId : m.senderId;
    if (seen.has(fanId)) continue;
    seen.add(fanId);
    const fan = m.senderId === fanId ? m.sender : m.recipient;
    conversations.push({
      fanId,
      fanName: fan.name || fan.email,
      lastMessage: m.body,
      createdAt: m.createdAt,
    });
  }
  return NextResponse.json({ conversations });
}
