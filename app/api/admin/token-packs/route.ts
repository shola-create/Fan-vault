import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin() { const s = await getServerSession(authOptions); return (s?.user as any)?.role === "ADMIN"; }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const packs = await prisma.tokenPack.findMany({ orderBy: [{ sortOrder: "asc" }, { tokens: "asc" }] });
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim().slice(0,80) : "";
  const tokens = Number(b.tokens), priceCents = Number(b.priceCents), sortOrder = Number(b.sortOrder ?? 0);
  if (!name || !Number.isInteger(tokens) || tokens < 1 || !Number.isInteger(priceCents) || priceCents < 50) return NextResponse.json({ error: "Enter a valid name, token amount and price." }, { status: 400 });
  const pack = await prisma.tokenPack.create({ data: { name, tokens, priceCents, currency: "ngn", sortOrder } });
  return NextResponse.json({ pack }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== "string") return NextResponse.json({ error: "Missing pack id" }, { status: 400 });
  const data:any = {};
  if (typeof b.name === "string") data.name = b.name.trim().slice(0,80);
  if (b.tokens !== undefined) { const n=Number(b.tokens); if(!Number.isInteger(n)||n<1) return NextResponse.json({error:"Invalid token amount"},{status:400}); data.tokens=n; }
  if (b.priceCents !== undefined) { const n=Number(b.priceCents); if(!Number.isInteger(n)||n<50) return NextResponse.json({error:"Invalid price"},{status:400}); data.priceCents=n; }
  if (typeof b.isActive === "boolean") data.isActive=b.isActive;
  if (Number.isInteger(b.sortOrder)) data.sortOrder=b.sortOrder;
  const pack = await prisma.tokenPack.update({ where: { id: b.id }, data });
  return NextResponse.json({ pack });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "Missing pack id" }, { status: 400 });
  await prisma.tokenPack.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
