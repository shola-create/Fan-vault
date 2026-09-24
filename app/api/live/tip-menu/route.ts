import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomName = searchParams.get("roomName") || "";
  if (!roomName) return NextResponse.json({ error: "Missing room name" }, { status: 400 });
  const room = await prisma.liveRoom.findFirst({ where: { roomName, status: "LIVE" } });
  if (!room) return NextResponse.json({ error: "Live room not found" }, { status: 404 });
  const items = await prisma.tipMenuItem.findMany({ where: { creatorId: room.creatorId, isActive: true }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ items });
}
