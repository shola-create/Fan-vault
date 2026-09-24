import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "ADMIN") return NextResponse.json({ unlimited: true, balance: null });
  const wallet = await prisma.tokenWallet.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ unlimited: false, balance: wallet?.balance ?? 0 });
}
