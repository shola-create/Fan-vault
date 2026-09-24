import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return null;
  return session;
}

function generateCode() {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

// GET: list all ambassador codes and who (if anyone) redeemed each one
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const codes = await prisma.ambassadorCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { redeemedBy: { select: { email: true, name: true } } },
  });

  return NextResponse.json({ codes });
}

// POST { note?: string }: create a new unused code
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { note } = await req.json().catch(() => ({ note: undefined }));

  const code = await prisma.ambassadorCode.create({
    data: { code: generateCode(), note: note || null },
  });

  return NextResponse.json({ code }, { status: 201 });
}
