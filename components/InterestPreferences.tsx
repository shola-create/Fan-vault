"use client";

import { useState } from "react";

const options = [
  { value: "GIRLS", label: "Girls", emoji: "♀" },
  { value: "GUYS", label: "Guys", emoji: "♂" },
  { value: "TRANS", label: "Trans", emoji: "⚧" },
] as const;

export default function InterestPreferences({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  async function toggle(value: string) {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    setSelected(next); setSaving(true);
    const res = await fetch("/api/profile/interests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interestedIn: next }) });
    setSaving(false);
    if (!res.ok) { setSelected(selected); const data = await res.json(); alert(data.error || "Couldn't save preferences"); }
  }
  return (
    <section className="rounded-xl border border-stone-200 p-4">
      <h2 className="font-medium">Discovery preferences</h2>
      <p className="mt-1 text-sm text-stone-500">Choose all genders you’re interested in. You can select more than one.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => { const active = selected.includes(option.value); return <button key={option.value} type="button" onClick={() => toggle(option.value)} className={`rounded-xl border px-3 py-3 text-sm ${active ? "border-[--accent] bg-[--accent]/10 text-[--accent]" : "border-stone-200 text-stone-600"}`}><span className="block text-xl">{option.emoji}</span>{option.label}</button>; })}
      </div>
      {saving && <p className="mt-2 text-xs text-stone-500">Saving…</p>}
    </section>
  );
}
