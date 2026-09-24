"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type CurrencyCode, CURRENCIES, displayPrice } from "@/lib/currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  format: (amount: number, fromCurrency: CurrencyCode) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "preferredCurrency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  // Load the viewer's saved preference on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && saved in CURRENCIES) setCurrencyState(saved);
    } catch {
      // localStorage unavailable — fall back to USD silently
    }
  }, []);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
  }

  function format(amount: number, fromCurrency: CurrencyCode) {
    return displayPrice(amount, fromCurrency, currency);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
