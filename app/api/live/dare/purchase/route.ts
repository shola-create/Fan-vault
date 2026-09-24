import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLATFORM_PERCENT = 46;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fanId = (session.user as any).id as string;
  const body = await req.json().catch(() => ({}));
  const roomName = typeof body.roomName === "string" ? body.roomName : "";
  const tier = typeof body.tier === "string" ? body.tier : "";
  if (!roomName || !["SIMPLE", "BASIC", "EXTREME"].includes(tier)) return NextResponse.json({ error: "Invalid dare request" }, { status: 400 });

  const room = await prisma.liveRoom.findUnique({ where: { roomName }, include: { creator: true } });
  if (!room || room.status !== "LIVE" || room.category !== "DARE") return NextResponse.json({ error: "Dare live is not active" }, { status: 400 });
  if (room.creator.userId === fanId) return NextResponse.json({ error: "Creators cannot buy their own dares" }, { status: 400 });

  const candidates = await prisma.dareChallenge.findMany({ where: { liveRoomId: room.id, tier: tier as any, isActive: true } });
  if (!candidates.length) return NextResponse.json({ error: "There are no active dares in this section yet" }, { status: 404 });
  const dare = candidates[Math.floor(Math.random() * candidates.length)];

  try {
    const reveal = await prisma.$transaction(async tx => {
      const wallet = await tx.tokenWallet.findUnique({ where: { userId: fanId } });
      const fan = await tx.user.findUnique({ where: { id: fanId }, select: { role: true } });
      const balance = fan?.role === "ADMIN" ? Number.MAX_SAFE_INTEGER : (wallet?.balance ?? 0);
      if (balance < dare.tokenAmount) throw new Error("INSUFFICIENT_TOKENS");
      if (fan?.role !== "ADMIN") {
        const next = balance - dare.tokenAmount;
        await tx.tokenWallet.update({ where: { userId: fanId }, data: { balance: next } });
        await tx.tokenTransaction.create({ data: { userId: fanId, type: "DARE_SPEND", amount: -dare.tokenAmount, balanceAfter: next, referenceType: "DARE_REVEAL", referenceId: dare.id, note: `FV Tokens for ${dare.tier.toLowerCase()} dare` } });
      }
      const platformFeeTokens = Math.floor(dare.tokenAmount * PLATFORM_PERCENT / 100);
      const creatorTokenAmount = dare.tokenAmount - platformFeeTokens;
      return tx.dareReveal.create({ data: { dareId: dare.id, liveRoomId: room.id, fanId, tokenAmount: dare.tokenAmount, platformFeeTokens, creatorTokenAmount }, include: { dare: true } });
    });
    return NextResponse.json({ reveal: { id: reveal.id, tier: reveal.dare.tier, prompt: reveal.dare.prompt, tokenAmount: reveal.tokenAmount, creatorTokenAmount: reveal.creatorTokenAmount } });
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_TOKENS") return NextResponse.json({ error: "Not enough FV Tokens. Buy more tokens first." }, { status: 402 });
    console.error(err);
    return NextResponse.json({ error: "Could not purchase dare" }, { status: 500 });
  }
}
