import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorGateStatus } from "@/lib/entitlements";

const GATE_MESSAGES: Record<string, string> = {
  not_verified: "Your creator account must be verified before you can go live. Submit verification from your dashboard.",
  no_creator_subscription: "An active creator subscription is required to go live. Subscribe from your dashboard.",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { creatorProfile: true } });
  if (!user?.creatorProfile) return NextResponse.json({ error: "Creator account required" }, { status: 403 });

  const gate = await getCreatorGateStatus(user.id, user.creatorProfile);
  if (!gate.allowed) {
    return NextResponse.json({ error: GATE_MESSAGES[gate.reason!] }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : "Live stream";
  const category = ["NORMAL", "MATURE", "DARE"].includes(body.category) ? body.category : "NORMAL";
  await prisma.liveRoom.updateMany({ where: { creatorId: user.creatorProfile.id, status: "LIVE" }, data: { status: "ENDED", endedAt: new Date() } });
  const roomName = `creator-${user.creatorProfile.id}-${Date.now()}`;
  const room = await prisma.liveRoom.create({ data: { creatorId: user.creatorProfile.id, roomName, title, category } });
  return NextResponse.json({ room: { id: room.id, roomName: room.roomName, title: room.title, category: room.category } });
}
