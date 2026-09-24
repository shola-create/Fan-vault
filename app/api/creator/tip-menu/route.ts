import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getCreator() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as any).id as string;
  return prisma.creatorProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Only creators can manage a tip menu" }, { status: 403 });
  const items = await prisma.tipMenuItem.findMany({ where: { creatorId: creator.id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Only creators can manage a tip menu" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 40) : "";
  const emoji = typeof body.emoji === "string" && body.emoji.trim() ? body.emoji.trim().slice(0, 8) : "🎁";
  const category = ["HOT", "WISH", "LUXURY"].includes(body.category) ? body.category : "HOT";
  const tokenAmount = Number(body.tokenAmount ?? body.amountCents);
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;
  if (!label || !Number.isInteger(tokenAmount) || tokenAmount < 1 || tokenAmount > 10000000) {
    return NextResponse.json({ error: "Enter a name and a token amount between 1 and 10,000,000." }, { status: 400 });
  }
  const item = await prisma.tipMenuItem.create({ data: { creatorId: creator.id, label, emoji, category, tokenAmount, amountCents: 0, sortOrder } });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: Request) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Only creators can manage a tip menu" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing menu item id" }, { status: 400 });
  const existing = await prisma.tipMenuItem.findFirst({ where: { id, creatorId: creator.id } });
  if (!existing) return NextResponse.json({ error: "Tip menu item not found" }, { status: 404 });
  const data: any = {};
  if (typeof body.label === "string") data.label = body.label.trim().slice(0, 40);
  if (typeof body.emoji === "string") data.emoji = body.emoji.trim().slice(0, 8) || "🎁";
  if (["HOT", "WISH", "LUXURY"].includes(body.category)) data.category = body.category;
  if (body.tokenAmount !== undefined) {
    const tokenAmount = Number(body.tokenAmount);
    if (!Number.isInteger(tokenAmount) || tokenAmount < 1 || tokenAmount > 10000000) return NextResponse.json({ error: "Token amount must be between 1 and 10,000,000." }, { status: 400 });
    data.tokenAmount = tokenAmount;
  }
  if (Number.isInteger(body.sortOrder)) data.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (data.label === "") return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  const item = await prisma.tipMenuItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Only creators can manage a tip menu" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const existing = await prisma.tipMenuItem.findFirst({ where: { id, creatorId: creator.id } });
  if (!existing) return NextResponse.json({ error: "Tip menu item not found" }, { status: 404 });
  await prisma.tipMenuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
