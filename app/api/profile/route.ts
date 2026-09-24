import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProfileSchema = z.object({ avatarUrl: z.string().url().max(2000).nullable() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const parsed = ProfileSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile picture URL" }, { status: 400 });

  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl: parsed.data.avatarUrl }, select: { avatarUrl: true } });

  // Keep creator profiles in sync because creator pages and live discovery use CreatorProfile.avatarUrl.
  await prisma.creatorProfile.updateMany({ where: { userId }, data: { avatarUrl: parsed.data.avatarUrl } });

  return NextResponse.json({ avatarUrl: user.avatarUrl });
}
