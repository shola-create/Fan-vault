import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const tiers = new Set(["SIMPLE", "BASIC", "EXTREME"]);

export async function GET(req: Request) {
  const roomName = new URL(req.url).searchParams.get("roomName");
  if (!roomName) return NextResponse.json({ error: "roomName is required" }, { status: 400 });
  const room = await prisma.liveRoom.findUnique({ where: { roomName }, include: { creator: true } });
  if (!room) return NextResponse.json({ error: "Live room not found" }, { status: 404 });
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;
  const isCreator = viewerId === room.creator.userId;
  const dares = await prisma.dareChallenge.findMany({ where: { liveRoomId: room.id, isActive: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    dares: isCreator ? dares : dares.map(d => ({ id: d.id, tier: d.tier, tokenAmount: d.tokenAmount })),
    isCreator,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json().catch(() => ({}));
  const roomName = typeof body.roomName === "string" ? body.roomName : "";
  const tier = typeof body.tier === "string" ? body.tier : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const tokenAmount = Number(body.tokenAmount);
  if (!roomName || !tiers.has(tier) || !prompt || !Number.isInteger(tokenAmount) || tokenAmount < 1 || tokenAmount > 1000000) {
    return NextResponse.json({ error: "Valid room, tier, dare text and token amount are required" }, { status: 400 });
  }
  const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
  const room = await prisma.liveRoom.findUnique({ where: { roomName } });
  if (!creator || !room || room.creatorId !== creator.id || room.status !== "LIVE" || room.category !== "DARE") {
    return NextResponse.json({ error: "Only the creator of a live Dare room can add dares" }, { status: 403 });
  }
  const dare = await prisma.dareChallenge.create({ data: { liveRoomId: room.id, creatorId: creator.id, tier: tier as any, prompt: prompt.slice(0, 500), tokenAmount } });
  return NextResponse.json({ dare });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json().catch(() => ({}));
  const dare = await prisma.dareChallenge.findUnique({ where: { id: body.id }, include: { creator: true } });
  if (!dare || dare.creator.userId !== userId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const updated = await prisma.dareChallenge.update({ where: { id: dare.id }, data: { isActive: Boolean(body.isActive) } });
  return NextResponse.json({ dare: updated });
}
