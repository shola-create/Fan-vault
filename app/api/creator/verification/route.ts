import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: creator submits (or resubmits, after a rejection) their ID document
// for review. mediaUrl is assumed already uploaded to Cloudinary via the
// existing FileUpload component.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const creator = await prisma.creatorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!creator) return NextResponse.json({ error: "Creator account required" }, { status: 403 });

  if (creator.verificationStatus === "PENDING" || creator.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Verification is already submitted or approved" }, { status: 400 });
  }

  const { documentUrl } = await req.json().catch(() => ({}));
  if (!documentUrl) return NextResponse.json({ error: "documentUrl is required" }, { status: 400 });

  const updated = await prisma.creatorProfile.update({
    where: { id: creator.id },
    data: {
      verificationDocumentUrl: documentUrl,
      verificationStatus: "PENDING",
      verificationSubmittedAt: new Date(),
    },
  });

  return NextResponse.json({ verificationStatus: updated.verificationStatus });
}
