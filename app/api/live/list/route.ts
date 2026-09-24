import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public discovery endpoint: anyone can see every creator who is live.
export async function GET() {
  const rooms = await prisma.liveRoom.findMany({
    where: { status: "LIVE" },
    include: { creator: true },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      roomName: room.roomName,
      title: room.title,
      category: room.category,
      startedAt: room.startedAt,
      creator: {
        username: room.creator.username,
        displayName: room.creator.displayName,
        avatarUrl: room.creator.avatarUrl,
      },
    })),
  });
}
