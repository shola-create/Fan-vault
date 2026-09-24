import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { isAmbassador: true } });
  if (existingUser?.isAmbassador) {
    return NextResponse.json({ error: "This account is already an ambassador" }, { status: 400 });
  }

  const ambassadorCode = await prisma.ambassadorCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!ambassadorCode) {
    return NextResponse.json({ error: "That code isn't valid" }, { status: 404 });
  }
  if (ambassadorCode.redeemedByUserId) {
    return NextResponse.json({ error: "That code has already been used" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.ambassadorCode.update({
      where: { id: ambassadorCode.id },
      data: { redeemedByUserId: userId, redeemedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isAmbassador: true, ambassadorRedeemedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ isAmbassador: true });
}
