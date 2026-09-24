"use client";

import { useEffect, useState } from "react";
type Item = { id: string; label: string; emoji: string; category: "HOT" | "WISH" | "LUXURY"; tokenAmount: number; sortOrder: number; isActive: boolean };

export default function TipMenuEditor() {
  const [items, setItems] = useState<Item[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [stickerId, setStickerId] = useState("");
  const [amount, setAmount] = useState("100");
  const [category, setCategory] = useState<"HOT" | "WISH" | "LUXURY">("HOT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/creator/tip-menu");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    setLoading(false);
  }
  useEffect(() => { load(); fetch("/api/creator/gift-stickers").then(r=>r.json()).then(d=>setStickers(d.stickers||[])); }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/creator/tip-menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, emoji, stickerId: stickerId || undefined, category, tokenAmount: Math.round(Number(amount)), sortOrder: items.length }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return alert(data.error || "Couldn't add tip");
    setItems([...items, data.item]); setLabel(""); setEmoji("🎁"); setStickerId(""); setAmount("100"); setCategory("HOT");
  }

  async function updateItem(item: Item, patch: Partial<Item>) {
    const next = { ...item, ...patch };
    const res = await fetch("/api/creator/tip-menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, ...patch }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Couldn't update tip");
    setItems(items.map((x) => x.id === item.id ? data.item : x));
  }

  async function remove(id: string) {
    if (!confirm("Remove this tip option?")) return;
    const res = await fetch("/api/creator/tip-menu", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setItems(items.filter((x) => x.id !== id));
  }

  return (
    <section className="rounded-xl border border-red-900/40 bg-[--card] p-4">
      <h2 className="font-medium text-white">Tip menu</h2>
      <p className="mt-1 text-sm text-stone-400">Create sticker-style gifts viewers will see when you are live. Prices are set in FV Tokens. Viewers buy FV Tokens separately with Paystack.</p>
      <form onSubmit={addItem} className="mt-4 grid gap-2 sm:grid-cols-[60px_1fr_140px_100px_auto]">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-center text-white" aria-label="Emoji" />
        <select value={stickerId} onChange={(e) => { setStickerId(e.target.value); const s=stickers.find((x:any)=>x.id===e.target.value); if(s) { setEmoji(s.emoji); setCategory(s.category); } }} className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white"><option value="">Choose sticker</option>{stickers.filter((s:any)=>s.isActive).map((s:any)=><option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}</select>
        <input required value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Tip name" className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white" />
        <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white"><option value="HOT">🔥 Hot Picks</option><option value="WISH">✨ Make a Wish</option><option value="LUXURY">💎 Luxury</option></select>
        <input required type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="FV Tokens" className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white" />
        <button disabled={saving} className="rounded-full bg-[--accent] px-4 py-2 text-sm text-white disabled:opacity-50">Add</button>
      </form>
      <div className="mt-4 flex flex-col gap-2">
        {loading ? <p className="text-sm text-stone-500">Loading…</p> : items.length === 0 ? <p className="text-sm text-stone-500">No tip options yet.</p> : items.map((item) => (
          <div key={item.id} className="grid grid-cols-[40px_1fr_110px_100px_auto_auto] items-center gap-2 rounded-lg border border-red-900/30 bg-black/40 p-2">
            <span className="text-center text-xl">{item.emoji}</span>
            <input value={item.label} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, label: e.target.value } : x))} onBlur={(e) => updateItem(item, { label: e.target.value })} className="rounded border border-transparent bg-transparent px-2 py-1 text-white focus:border-red-900/50" />
            <select value={item.category} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, category: e.target.value as any } : x))} onBlur={(e) => updateItem(item, { category: e.target.value as any })} className="rounded border border-transparent bg-transparent px-2 py-1 text-xs text-white"><option value="HOT">🔥 Hot</option><option value="WISH">✨ Wish</option><option value="LUXURY">💎 Luxury</option></select>
            <input type="number" min="1" step="0.01" value={item.tokenAmount} onChange={(e) => setItems(items.map((x) => x.id === item.id ? { ...x, tokenAmount: Math.round(Number(e.target.value)) } : x))} onBlur={(e) => updateItem(item, { tokenAmount: Math.round(Number(e.target.value)) })} className="rounded border border-transparent bg-transparent px-2 py-1 text-right text-white focus:border-red-900/50" />
            <button onClick={() => updateItem(item, { isActive: !item.isActive })} className={`rounded-full px-3 py-1 text-xs ${item.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-stone-700 text-stone-400"}`}>{item.isActive ? "On" : "Off"}</button>
            <button onClick={() => remove(item.id)} className="px-2 py-1 text-xs text-red-300">Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}
