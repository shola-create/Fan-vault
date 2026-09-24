import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packId } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "ADMIN") return NextResponse.json({ error: "Admin accounts have unlimited FV Tokens and do not purchase token packs." }, { status: 403 });

  const pack = typeof packId === "string"
    ? await prisma.tokenPack.findFirst({ where: { id: packId, isActive: true } })
    : null;
  if (!pack) return NextResponse.json({ error: "Token pack not found" }, { status: 404 });

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Paystack is not configured on the server." }, { status: 503 });
  }

  const purchase = await prisma.tokenPurchase.create({
    data: {
      userId: user.id,
      packId: pack.id,
      tokens: pack.tokens,
      amountCents: pack.priceCents,
      currency: pack.currency.toLowerCase(),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const reference = `fv_${purchase.id}_${Date.now()}`;
  const currency = pack.currency.toUpperCase();

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: String(pack.priceCents),
        currency,
        reference,
        callback_url: `${baseUrl}/api/paystack/callback`,
        metadata: {
          tokenPurchaseId: purchase.id,
          userId: user.id,
          packId: pack.id,
          tokens: pack.tokens,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error("Paystack initialization failed", data);
      await prisma.tokenPurchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: data.message || "Unable to start Paystack payment." }, { status: 502 });
    }

    await prisma.tokenPurchase.update({
      where: { id: purchase.id },
      data: { paystackReference: reference },
    });

    return NextResponse.json({ url: data.data.authorization_url });
  } catch (error) {
    console.error("Paystack initialization error", error);
    await prisma.tokenPurchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Unable to start Paystack payment." }, { status: 500 });
  }
}
