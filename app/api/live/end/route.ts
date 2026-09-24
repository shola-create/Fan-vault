import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { creatorProfile: true } });
  if (!user?.creatorProfile) return NextResponse.json({ error: "Creator account required" }, { status: 403 });
  const room = await prisma.liveRoom.findFirst({ where: { id: roomId, creatorId: user.creatorProfile.id, status: "LIVE" } });
  if (!room) return NextResponse.json({ error: "Live room not found" }, { status: 404 });
  await prisma.liveRoom.update({ where: { id: room.id }, data: { status: "ENDED", endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
