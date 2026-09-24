import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    // No query yet — surface a handful of creators to browse.
    const creators = await prisma.creatorProfile.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { username: true, displayName: true, avatarUrl: true, bio: true, monthlyPriceCents: true },
    });
    return NextResponse.json({ creators });
  }

  const creators = await prisma.creatorProfile.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    select: { username: true, displayName: true, avatarUrl: true, bio: true, monthlyPriceCents: true },
  });

  return NextResponse.json({ creators });
}
