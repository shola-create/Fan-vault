"use client";
import { useEffect, useState } from "react";
import { CurrencyCode, displayPrice } from "@/lib/currency";

const LOCALE_CURRENCY: Record<string, CurrencyCode> = {
  NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", GB: "GBP", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  IE: "EUR", PT: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR", US: "USD", CA: "CAD", AU: "AUD", IN: "INR",
  AE: "AED", CN: "CNY", JP: "JPY", BR: "BRL", MX: "MXN"
};

function detectCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "USD";
  const locale = navigator.language || "en-US";
  const match = locale.match(/[-_]([A-Z]{2})$/i);
  const country = match?.[1]?.toUpperCase();
  if (country && LOCALE_CURRENCY[country]) return LOCALE_CURRENCY[country];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz === "Africa/Lagos") return "NGN";
  if (tz === "Africa/Accra") return "GHS";
  if (tz === "Africa/Nairobi") return "KES";
  if (tz === "Africa/Johannesburg") return "ZAR";
  if (tz === "Europe/London") return "GBP";
  if (tz.startsWith("Europe/")) return "EUR";
  if (tz === "Asia/Kolkata") return "INR";
  if (tz === "Asia/Dubai") return "AED";
  if (tz === "Asia/Tokyo") return "JPY";
  return "USD";
}

export default function TokensPage(){
  const [packs,setPacks]=useState<any[]>([]); const [balance,setBalance]=useState<number|null>(0); const [unlimited,setUnlimited]=useState(false); const [loading,setLoading]=useState<string|null>(null); const [currency,setCurrency]=useState<CurrencyCode>("USD");
  useEffect(()=>{setCurrency(detectCurrency());Promise.all([fetch('/api/tokens/packs').then(r=>r.json()),fetch('/api/tokens/balance').then(r=>r.json())]).then(([p,b])=>{setPacks(p.packs||[]);setBalance(b.balance);setUnlimited(!!b.unlimited)})},[]);
  async function buy(id:string){setLoading(id);const r=await fetch('/api/tokens/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({packId:id})});const d=await r.json();setLoading(null);if(d.url)location.href=d.url;else alert(d.error||'Unable to start purchase');}
  return <main className="min-h-screen bg-stone-950 px-4 py-8 text-white"><div className="mx-auto max-w-2xl"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-400">FV Tokens</p><h1 className="text-3xl font-semibold">Buy tokens</h1><p className="mt-1 text-sm text-stone-400">Use FV Tokens to send live gifts to creators.</p><p className="mt-1 text-xs text-stone-500">Payments are securely processed by Paystack. The pack price is charged in the pack's configured currency.</p></div><div className="rounded-full bg-stone-900 px-4 py-2 text-sm">Balance: <b>{unlimited?'∞':(balance??0).toLocaleString()}</b></div></div><div className="space-y-3">{packs.map(p=><button key={p.id} onClick={()=>buy(p.id)} disabled={!!loading} className="flex w-full items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-left hover:bg-stone-800 disabled:opacity-50"><span><b>⭐ {p.tokens.toLocaleString()} FV Tokens</b><span className="ml-2 text-sm text-stone-400">{p.name}</span></span><span className="font-medium">{displayPrice(p.priceCents, (p.currency||"usd").toUpperCase() as CurrencyCode, currency)}</span></button>)}</div></div></main>
}
