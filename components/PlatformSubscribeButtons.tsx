"use client";

import { useState } from "react";
import { useCurrency } from "./CurrencyProvider";
import { PLATFORM_PRICES } from "@/lib/entitlements";

export default function PlatformSubscribeButtons({ planType }: { planType: "FAN" | "CREATOR" }) {
  const [loading, setLoading] = useState<"MONTHLY" | "YEARLY" | null>(null);
  const { currency, format } = useCurrency();

  async function subscribe(billingInterval: "MONTHLY" | "YEARLY") {
    setLoading(billingInterval);
    const res = await fetch("/api/subscribe/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType, billingInterval, currency }),
    });
    const data = await res.json();

    if (data.free) {
      window.location.reload(); // ambassador — subscription was granted instantly
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(null);
      alert(data.error ?? "Couldn't start checkout");
    }
  }

  const prices = PLATFORM_PRICES[planType];
  const monthlyLabel = format(prices.MONTHLY, "NGN");
  const yearlyLabel = format(prices.YEARLY, "NGN");

  return (
    <div className="flex gap-2">
      <button
        onClick={() => subscribe("MONTHLY")}
        disabled={loading !== null}
        className="rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading === "MONTHLY" ? "Redirecting…" : `Monthly · ${monthlyLabel}`}
      </button>
      <button
        onClick={() => subscribe("YEARLY")}
        disabled={loading !== null}
        className="rounded-full border border-red-900/60 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading === "YEARLY" ? "Redirecting…" : `Yearly · ${yearlyLabel}`}
      </button>
    </div>
  );
}
