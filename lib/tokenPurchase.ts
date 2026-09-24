import { prisma } from "@/lib/prisma";

export async function creditTokenPurchase(reference: string, status: string, paidAmount?: number, paidCurrency?: string) {
  if (status !== "success") return { ok: false, reason: "not-successful" as const };

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.tokenPurchase.findUnique({
      where: { paystackReference: reference },
      include: { user: { select: { role: true } } },
    });
    if (!purchase) return { ok: false, reason: "purchase-not-found" as const };
    if (purchase.status === "PAID") return { ok: true, alreadyPaid: true, tokens: purchase.tokens };
    if (purchase.status !== "PENDING") return { ok: false, reason: "purchase-not-pending" as const };

    const expectedCurrency = purchase.currency.toUpperCase();
    if (paidCurrency && paidCurrency.toUpperCase() !== expectedCurrency) {
      await tx.tokenPurchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      return { ok: false, reason: "currency-mismatch" as const };
    }
    if (typeof paidAmount === "number" && paidAmount !== purchase.amountCents) {
      await tx.tokenPurchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      return { ok: false, reason: "amount-mismatch" as const };
    }

    const updated = await tx.tokenPurchase.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updated.count !== 1) return { ok: true, alreadyPaid: true, tokens: purchase.tokens };

    if (purchase.user.role === "ADMIN") {
      await tx.tokenPurchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      return { ok: false, reason: "admin-purchase" as const };
    }

    const wallet = await tx.tokenWallet.upsert({
      where: { userId: purchase.userId },
      create: { userId: purchase.userId, balance: purchase.tokens },
      update: { balance: { increment: purchase.tokens } },
    });
    await tx.tokenTransaction.create({
      data: {
        userId: purchase.userId,
        type: "PURCHASE",
        amount: purchase.tokens,
        balanceAfter: wallet.balance,
        referenceType: "TOKEN_PURCHASE",
        referenceId: purchase.id,
        note: "FV Token purchase via Paystack",
      },
    });

    return { ok: true, alreadyPaid: false, tokens: purchase.tokens };
  });
}
