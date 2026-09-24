"use client";

import { useMemo, useState } from "react";

type Gift = {
  id: string;
  label: string;
  emoji: string;
  category: "HOT" | "WISH" | "LUXURY";
  tokenAmount: number;
};

export default function GiftStickerPicker({ gifts, disabled, onSend }: { gifts: Gift[]; disabled?: boolean; onSend: (tokenAmount: number) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Gift["category"]>("HOT");
  const visible = useMemo(() => gifts.filter((gift) => gift.category === category), [gifts, category]);

  return (
    <>
      <button
        disabled={disabled || gifts.length === 0}
        onClick={() => setOpen(true)}
        className="rounded-full bg-[--accent] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        🎁 Gifts
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-fuchsia-900/50 bg-[#171717] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-fuchsia-600 px-4 py-3 text-white">
              <h3 className="font-semibold">Available Gifts</h3>
              <button onClick={() => setOpen(false)} className="text-xl leading-none">×</button>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-stone-700 p-3">
              {([['HOT', '🔥 Hot Picks'], ['WISH', '✨ Make a Wish'], ['LUXURY', '💎 Luxury']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${category === value ? "border-fuchsia-400 bg-fuchsia-500 text-white" : "border-fuchsia-800/70 text-stone-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-[220px] p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-stone-500">
                {category === "HOT" ? "Hot Picks" : category === "WISH" ? "Make a Wish" : "Luxury"}
              </p>
              {visible.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-stone-500">No gifts in this section yet.</div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {visible.map((gift) => (
                    <button
                      key={gift.id}
                      disabled={disabled}
                      onClick={() => { onSend(gift.tokenAmount); setOpen(false); }}
                      className="group rounded-xl border border-stone-700 bg-stone-900/70 p-2 text-center transition hover:border-fuchsia-500 hover:bg-stone-800 disabled:opacity-50"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-amber-400/20 text-4xl drop-shadow-lg transition group-hover:scale-110">
                        {gift.emoji}
                      </div>
                      <div className="mt-2 truncate text-xs font-medium text-white">{gift.label}</div>
                      <div className="mt-1 text-[10px] text-amber-300">⭐ {gift.tokenAmount.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-stone-700 px-4 py-3 text-center text-[11px] text-stone-500">Tap a sticker to send it · FV Tokens</div>
          </div>
        </div>
      )}
    </>
  );
}
