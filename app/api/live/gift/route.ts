import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const roomName = typeof body.roomName === "string" ? body.roomName : "";
  const tokenAmount = Number(body.tokenAmount);
  if (!roomName || !Number.isInteger(tokenAmount) || tokenAmount < 1 || tokenAmount > 10000000) {
    return NextResponse.json({ error: "Invalid FV Token amount." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
  const room = await prisma.liveRoom.findFirst({ where: { roomName, status: "LIVE" }, include: { creator: true } });
  if (!user || !room) return NextResponse.json({ error: "Live room not found" }, { status: 404 });
  if (room.creator.userId === user.id) return NextResponse.json({ error: "You cannot gift yourself." }, { status: 400 });
  const feePercent = 46;
  // Live gifts are split 46% to the platform and 54% to the creator.
  // This is calculated server-side so the client cannot change the split.
  const platformFeeTokens = Math.round(tokenAmount * feePercent / 100);
  const creatorTokenAmount = tokenAmount - platformFeeTokens;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (user.role !== "ADMIN") {
        const wallet = await tx.tokenWallet.findUnique({ where: { userId: user.id } });
        if (!wallet || wallet.balance < tokenAmount) throw new Error("INSUFFICIENT_TOKENS");
        const senderAfter = wallet.balance - tokenAmount;
        await tx.tokenWallet.update({ where: { userId: user.id }, data: { balance: senderAfter } });
        await tx.tokenTransaction.create({ data: { userId: user.id, type: "GIFT_SENT", amount: -tokenAmount, balanceAfter: senderAfter, referenceType: "GIFT", note: `Gift to ${room.creator.username}` } });
      }
      // Admin accounts have an unlimited, non-customer token balance. Admin gifts are
      // recorded for moderation/audit purposes, but they must never inflate a creator's
      // real FV Token wallet or creator earnings balance. The server determines this
      // from the authenticated user's role; it is never accepted from the client.
      const isAdminGift = user.role === "ADMIN";
      if (!isAdminGift) {
        const recipientWallet = await tx.tokenWallet.upsert({ where: { userId: room.creator.userId }, create: { userId: room.creator.userId, balance: creatorTokenAmount }, update: { balance: { increment: creatorTokenAmount } } });
        await tx.tokenTransaction.create({ data: { userId: room.creator.userId, type: "GIFT_RECEIVED", amount: creatorTokenAmount, balanceAfter: recipientWallet.balance, referenceType: "LIVE_GIFT", note: `Gift from ${user.id}` } });
      }
      const gift = await tx.gift.create({ data: { liveRoomId: room.id, senderId: user.id, recipientId: room.creator.userId, amountCents: 0, platformFeeCents: 0, creatorAmountCents: 0, tokenAmount, platformFeeTokens, creatorTokenAmount: isAdminGift ? 0 : creatorTokenAmount, isAdminGift, status: "PAID", paidAt: new Date() } });
      return gift;
    });
    return NextResponse.json({ ok: true, giftId: result.id, tokenAmount });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_TOKENS") return NextResponse.json({ error: "You don't have enough FV Tokens. Buy more tokens to send this gift." }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Could not send gift." }, { status: 500 });
  }
}
