import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AccessToken } from "livekit-server-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFreeLiveAllowance } from "@/lib/entitlements";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    return NextResponse.json({ error: "Live streaming is not configured. Add the LiveKit environment variables." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const roomName = typeof body.roomName === "string" ? body.roomName : "";
  const room = await prisma.liveRoom.findFirst({ where: { roomName, status: "LIVE" }, include: { creator: true } });
  if (!room) return NextResponse.json({ error: "Live room is not active" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const isCreator = room.creator.userId === user.id;

  if (!isCreator && room.category === "MATURE" && !user.adultConfirmedAt) {
    return NextResponse.json({ error: "This is an 18+ mature live. Confirm that you are 18 or older to continue." }, { status: 451 });
  }

  if (!isCreator) {
    const { allowed } = await checkFreeLiveAllowance(user.id, room.creatorId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Live viewing requires the ₦3,700/month FAN pass or an active subscription to this creator. Subscribe on your dashboard or the creator profile to unlock live viewing." },
        { status: 403 }
      );
    }
  }

  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.name ?? user.email,
    ttl: "2h",
  });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: isCreator, canSubscribe: true });
  return NextResponse.json({ token: await token.toJwt(), url: process.env.NEXT_PUBLIC_LIVEKIT_URL, isCreator, roomId: room.id, title: room.title, category: room.category });
}
