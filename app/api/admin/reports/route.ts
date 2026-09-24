import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") ?? "OPEN";
  const reports = await prisma.contentReport.findMany({
    where: status === "ALL" ? {} : { status: status as any },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, email: true, name: true } },
      targetUser: { select: { id: true, email: true, name: true, bannedAt: true, creatorProfile: { select: { username: true, displayName: true } } } },
      post: { select: { id: true, caption: true, mediaUrl: true, mediaType: true, createdAt: true, creator: { select: { userId: true, username: true, displayName: true } } } },
      message: { select: { id: true, body: true, createdAt: true, sender: { select: { email: true, name: true } }, recipient: { select: { email: true, name: true } } } },
      liveRoom: { select: { id: true, roomName: true, title: true, status: true, startedAt: true, creator: { select: { username: true, displayName: true } } } },
    },
  });
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId, status, adminNote } = await req.json();
  if (!reportId || !["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status)) {
    return NextResponse.json({ error: "Invalid report update" }, { status: 400 });
  }
  const report = await prisma.contentReport.update({
    where: { id: reportId },
    data: { status, adminNote: adminNote ? String(adminNote).slice(0, 5000) : undefined, reviewedAt: ["RESOLVED", "DISMISSED"].includes(status) ? new Date() : null, reviewedById: (session.user as any).id },
  });
  await prisma.moderationAction.create({ data: { adminId: (session.user as any).id, targetUserId: report.targetUserId, action: `REPORT_${status}`, reason: adminNote ? String(adminNote).slice(0, 5000) : null, metadata: JSON.stringify({ reportId }) } });
  return NextResponse.json({ report });
}
