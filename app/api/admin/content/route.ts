import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [posts, messages, liveRooms] = await Promise.all([
    prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { creator: { select: { username: true, displayName: true, userId: true } } } }),
    prisma.directMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { sender: { select: { id: true, email: true, name: true } }, recipient: { select: { id: true, email: true, name: true } } } }),
    prisma.liveRoom.findMany({ orderBy: { startedAt: "desc" }, take: 100, include: { creator: { select: { username: true, displayName: true, userId: true } } } }),
  ]);
  return NextResponse.json({ posts, messages, liveRooms });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { type, id } = await req.json();
  if (type === "POST") await prisma.post.delete({ where: { id } });
  else if (type === "MESSAGE") await prisma.directMessage.delete({ where: { id } });
  else return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
