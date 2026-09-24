// Multi-currency support for display and checkout.
//
// Every price in the database is stored in ONE base currency (see
// BASE_CURRENCY below) as an integer minor-unit amount (cents/kobo/etc).
// This file converts that base amount into whichever currency the viewer
// has chosen, for both on-screen display and for building a Paystack
// Checkout line item at charge time.
//
// IMPORTANT — before relying on this in production:
// 1. The rates below are a fixed snapshot, NOT live rates. Swap
//    `RATES_TO_USD` for a call to a live FX API (e.g. exchangerate.host,
//    or your bank's feed) refreshed on a schedule, and cache the result.
// 2. Actually *charging* a card in a currency your Paystack Connect payout
//    account/country doesn't support can fail at checkout. Test each
//    currency you enable against your connected creators' countries, or
//    consider Paystack's built-in "Paystack currency configuration" instead of this
//    approach if you want Paystack to handle the conversion for you.

export const BASE_CURRENCY = "USD";

export type CurrencyCode = keyof typeof CURRENCIES;

// A curated list of common currencies. Add more as needed — just make
// sure `zeroDecimal` is set correctly (Paystack expects zero-decimal
// currencies like JPY passed as a whole number, not multiplied by 100).
export const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar", zeroDecimal: false },
  NGN: { symbol: "₦", name: "Nigerian Naira", zeroDecimal: false },
  EUR: { symbol: "€", name: "Euro", zeroDecimal: false },
  GBP: { symbol: "£", name: "British Pound", zeroDecimal: false },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi", zeroDecimal: false },
  KES: { symbol: "KSh", name: "Kenyan Shilling", zeroDecimal: false },
  ZAR: { symbol: "R", name: "South African Rand", zeroDecimal: false },
  CAD: { symbol: "CA$", name: "Canadian Dollar", zeroDecimal: false },
  AUD: { symbol: "A$", name: "Australian Dollar", zeroDecimal: false },
  INR: { symbol: "₹", name: "Indian Rupee", zeroDecimal: false },
  AED: { symbol: "AED", name: "UAE Dirham", zeroDecimal: false },
  CNY: { symbol: "¥", name: "Chinese Yuan", zeroDecimal: false },
  JPY: { symbol: "¥", name: "Japanese Yen", zeroDecimal: true },
  BRL: { symbol: "R$", name: "Brazilian Real", zeroDecimal: false },
  MXN: { symbol: "MX$", name: "Mexican Peso", zeroDecimal: false },
} as const;

// Snapshot exchange rates: how many units of each currency per 1 USD.
// Update this periodically or replace with a live-rate lookup.
const RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  NGN: 1550,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 15.3,
  KES: 129,
  ZAR: 18.1,
  CAD: 1.37,
  AUD: 1.51,
  INR: 83.5,
  AED: 3.67,
  CNY: 7.24,
  JPY: 149,
  BRL: 5.4,
  MXN: 17.1,
};

export const CURRENCY_LIST = Object.keys(CURRENCIES) as CurrencyCode[];

/**
 * Convert a minor-unit amount (e.g. cents) in `fromCurrency` into the
 * equivalent minor-unit amount in `toCurrency`.
 */
export function convertMinorUnits(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromInfo = CURRENCIES[fromCurrency];
  const toInfo = CURRENCIES[toCurrency];

  const fromMajor = amount / (fromInfo.zeroDecimal ? 1 : 100);
  const usdMajor = fromMajor / RATES_TO_USD[fromCurrency];
  const toMajor = usdMajor * RATES_TO_USD[toCurrency];

  const toMinor = toMajor * (toInfo.zeroDecimal ? 1 : 100);
  return Math.round(toMinor);
}

/**
 * Format a minor-unit amount in the given currency for display, e.g.
 * formatMinorUnits(220000, "NGN") -> "₦2,200.00"
 */
export function formatMinorUnits(amount: number, currency: CurrencyCode): string {
  const info = CURRENCIES[currency];
  const major = amount / (info.zeroDecimal ? 1 : 100);
  const formatted = major.toLocaleString(undefined, {
    minimumFractionDigits: info.zeroDecimal ? 0 : 2,
    maximumFractionDigits: info.zeroDecimal ? 0 : 2,
  });
  return `${info.symbol}${formatted}`;
}

/**
 * Convenience: convert + format in one call.
 */
export function displayPrice(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): string {
  return formatMinorUnits(convertMinorUnits(amount, fromCurrency, toCurrency), toCurrency);
}
