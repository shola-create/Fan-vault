import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowed = new Set(["GIRLS", "GUYS", "TRANS"]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const interestedIn = Array.isArray(body.interestedIn) ? [...new Set(body.interestedIn)] : [];
  if (interestedIn.length > 3 || interestedIn.some((x) => typeof x !== "string" || !allowed.has(x))) return NextResponse.json({ error: "Choose valid interest options." }, { status: 400 });
  const userId = (session.user as any).id as string;
  await prisma.$transaction([
    prisma.interestPreference.deleteMany({ where: { userId } }),
    ...(interestedIn.length ? [prisma.interestPreference.createMany({ data: interestedIn.map((interest) => ({ userId, interest: interest as any })) })] : []),
  ]);
  return NextResponse.json({ interestedIn });
}
