import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function admin() {
  const s = await getServerSession(authOptions);
  return (s?.user as any)?.role === "ADMIN" ? s : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true, bannedAt: true, banReason: true, banExpiresAt: true, creatorProfile: { select: { username: true, displayName: true, verificationStatus: true } } },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, action, reason, durationDays } = await req.json();
  if (!userId || !["ban", "unban"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (userId === (session.user as any).id) return NextResponse.json({ error: "You cannot ban your own admin account" }, { status: 400 });

  if (action === "unban") {
    const user = await prisma.user.update({ where: { id: userId }, data: { bannedAt: null, banReason: null, banExpiresAt: null } });
    await prisma.moderationAction.create({ data: { adminId: (session.user as any).id, targetUserId: userId, action: "UNBAN", reason: null } });
    return NextResponse.json({ user });
  }
  const days = Number(durationDays);
  const banExpiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000) : null;
  const user = await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date(), banReason: String(reason || "Policy violation").slice(0, 1000), banExpiresAt } });
  await prisma.moderationAction.create({ data: { adminId: (session.user as any).id, targetUserId: userId, action: "BAN", reason: String(reason || "Policy violation").slice(0, 5000), metadata: JSON.stringify({ durationDays: Number.isFinite(days) && days > 0 ? days : null }) } });
  return NextResponse.json({ user });
}
