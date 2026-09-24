"use client";

import { CURRENCY_LIST, CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export default function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      aria-label="Display currency"
      className={
        compact
          ? "rounded-full border border-red-900/60 bg-black px-2 py-1 text-xs text-white"
          : "rounded-full border border-red-900/60 bg-black px-3 py-2 text-sm text-white"
      }
    >
      {CURRENCY_LIST.map((code) => (
        <option key={code} value={code} className="bg-black text-white">
          {code} — {CURRENCIES[code as CurrencyCode].name}
        </option>
      ))}
    </select>
  );
}
