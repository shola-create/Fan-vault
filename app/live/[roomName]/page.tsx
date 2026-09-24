import { notFound } from "next/navigation";
import LiveRoom from "@/components/LiveRoom";
import { prisma } from "@/lib/prisma";

export default async function LiveRoomPage({ params }: { params: { roomName: string } }) {
  const room = await prisma.liveRoom.findUnique({ where: { roomName: params.roomName }, include: { creator: true } });
  if (!room || room.status !== "LIVE") notFound();
  return <LiveRoom roomName={room.roomName} roomId={room.id} title={room.title} creatorName={room.creator.displayName} category={room.category as any} />;
}
