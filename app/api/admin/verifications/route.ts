import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return null;
  return session;
}

// GET: list every creator with a pending (or, optionally, any) verification
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const creators = await prisma.creatorProfile.findMany({
    where: status === "ALL" ? {} : { verificationStatus: status as any },
    orderBy: { verificationSubmittedAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });

  return NextResponse.json({
    creators: creators.map((c) => ({
      id: c.id,
      username: c.username,
      displayName: c.displayName,
      email: c.user.email,
      verificationStatus: c.verificationStatus,
      verificationDocumentUrl: c.verificationDocumentUrl,
      verificationSubmittedAt: c.verificationSubmittedAt,
    })),
  });
}

// POST { creatorId, action: "approve" | "reject" }
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { creatorId, action } = await req.json().catch(() => ({}));
  if (!creatorId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "creatorId and a valid action are required" }, { status: 400 });
  }

  const updated = await prisma.creatorProfile.update({
    where: { id: creatorId },
    data:
      action === "approve"
        ? { verificationStatus: "VERIFIED", verifiedAt: new Date() }
        : { verificationStatus: "REJECTED" },
  });

  return NextResponse.json({ verificationStatus: updated.verificationStatus });
}
