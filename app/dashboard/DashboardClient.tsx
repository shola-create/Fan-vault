"use client";

import { useState } from "react";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import VerificationPanel from "@/components/VerificationPanel";
import AmbassadorRedeem from "@/components/AmbassadorRedeem";
import PlatformSubscribeButtons from "@/components/PlatformSubscribeButtons";
import CreatorPriceEditor from "@/components/CreatorPriceEditor";
import TipMenuEditor from "@/components/TipMenuEditor";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { useCurrency } from "@/components/CurrencyProvider";

type Creator = {
  username: string;
  avatarUrl: string | null;
  displayName: string;
  onboardingComplete: boolean;
  monthlyPriceCents: number;
  payoutAccountLast4?: string | null;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  isAmbassador: boolean;
  hasCreatorSubscription: boolean;
  canPostOrGoLive: boolean;
  subscriberCount: number;
  posts: {
    id: string;
    caption: string | null;
    mediaUrl: string;
    mediaType: string;
    isPaywalled: boolean;
    createdAt: string;
  }[];
};

export default function DashboardClient({ creator }: { creator: Creator }) {
  const { format } = useCurrency();
  const [posts, setPosts] = useState(creator.posts);
  const [form, setForm] = useState({ caption: "", mediaUrl: "", mediaType: "image", isPaywalled: true });
  const [posting, setPosting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [liveTitle, setLiveTitle] = useState("Live stream");
  const [liveCategory, setLiveCategory] = useState<"NORMAL"|"MATURE"|"DARE">("NORMAL");
  const [startingLive, setStartingLive] = useState(false);

  async function handleConnectPayouts() {
    setConnecting(true);
    try {
      if (!banks.length) {
        const bankRes = await fetch("/api/paystack/banks");
        const bankData = await bankRes.json();
        if (!bankRes.ok) throw new Error(bankData.error || "Could not load banks");
        setBanks(bankData.banks || []);
      }
      if (!bankCode) { alert("Select your bank first."); return; }
      if (!/^\d{10}$/.test(accountNumber)) { alert("Enter your 10-digit account number."); return; }
      const res = await fetch("/api/paystack/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankCode, accountNumber }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not connect Paystack");
      alert("Paystack payout account connected.");
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not connect Paystack");
    } finally { setConnecting(false); }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mediaUrl) return;
    setPosting(true);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setPosting(false);

    if (res.ok) {
      setPosts([data.post, ...posts]);
      setForm({ caption: "", mediaUrl: "", mediaType: "image", isPaywalled: true });
    } else {
      alert(data.error ?? "Couldn't create post");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <nav className="mb-8 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/dashboard" className="font-semibold text-stone-900">
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/live"
            className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 transition hover:bg-red-50"
          >
            🔴 Live
          </Link>
          <Link
            href="/feed"
            className="rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            🎬 Reels
          </Link>
          <Link href="/messages" className="rounded-full border border-stone-300 px-4 py-2 text-sm transition hover:bg-stone-100">💬 Messages</Link><Link href="/network" className="rounded-full border border-stone-300 px-4 py-2 text-sm transition hover:bg-stone-100">👥 Network</Link>
          <Link
            href={`/creator/${creator.username}`}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm transition hover:bg-stone-100"
          >
            View profile
          </Link>
        </div>
      </nav>

      <h1 className="text-2xl font-semibold">Welcome back, {creator.displayName}</h1>
      <p className="text-stone-500">
        {creator.subscriberCount} active subscriber{creator.subscriberCount === 1 ? "" : "s"} ·{" "}
        ₦{(creator.monthlyPriceCents/100).toLocaleString()}/mo
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <ProfilePictureUpload initialUrl={creator.avatarUrl} />
        <CreatorPriceEditor initialCents={creator.monthlyPriceCents} />
        <TipMenuEditor />
        <VerificationPanel initialStatus={creator.verificationStatus} />

        {creator.isAmbassador ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            ✓ Ambassador — the creator subscription is free on this account.
          </div>
        ) : creator.hasCreatorSubscription ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            ✓ Creator subscription active.
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 p-4">
            <h2 className="font-medium">Creator subscription</h2>
            <p className="mt-1 text-sm text-stone-500">Required (alongside verification) before you can post or go live.</p>
            <div className="mt-3">
              <PlatformSubscribeButtons planType="CREATOR" />
            </div>
          </div>
        )}

        <AmbassadorRedeem isAmbassador={creator.isAmbassador} />
      </div>

      <section className="mt-6 rounded-xl border border-red-900/40 bg-[--card] p-4">
        <h2 className="font-medium text-white">Paystack payouts</h2>
        <p className="mt-1 text-sm text-stone-400">Connect the Nigerian bank account where your creator earnings will settle.</p>
        {creator.onboardingComplete ? (
          <p className="mt-3 text-sm text-emerald-300">✓ Paystack connected{creator.payoutAccountLast4 ? ` · account ending ${creator.payoutAccountLast4}` : ""}</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select value={bankCode} onChange={async e => { setBankCode(e.target.value); if (!banks.length) { const r=await fetch('/api/paystack/banks'); const d=await r.json(); setBanks(d.banks||[]); } }} className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white">
              <option value="">Select bank</option>
              {banks.map((b:any)=><option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <input value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="10-digit account number" className="rounded-lg border border-red-900/50 bg-black px-3 py-2 text-white" />
            <button type="button" onClick={handleConnectPayouts} disabled={connecting} className="rounded-full bg-[--accent] px-4 py-2 text-sm text-white disabled:opacity-50">{connecting ? "Connecting…" : "Connect Paystack"}</button>
          </div>
        )}
      </section>

      {!creator.canPostOrGoLive && (
        <div className="mt-6 rounded-xl border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Posting and going live are locked until you're verified and have an active creator subscription (free for ambassadors).
        </div>
      )}

      <section className={`mt-8 rounded-xl border border-red-200 bg-red-50 p-4 ${!creator.canPostOrGoLive ? "opacity-60" : ""}`}>
        <h2 className="font-medium text-red-900">🔴 Start a live stream</h2>
        <p className="mt-1 text-sm text-red-800">Go live with video and receive gifts. The platform keeps 46% of each completed gift and the creator receives 54% before payment-provider fees.</p>
        <div className="mt-3 flex gap-2">
          <input value={liveTitle} onChange={(e)=>setLiveTitle(e.target.value)} maxLength={120} disabled={!creator.canPostOrGoLive} className="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm disabled:opacity-50" placeholder="What are you going live about?" /><select value={liveCategory} onChange={e=>setLiveCategory(e.target.value as any)} disabled={!creator.canPostOrGoLive} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-50"><option value="NORMAL">Normal — no nudity</option><option value="MATURE">18+ Mature</option><option value="DARE">Dare</option></select>
          <button disabled={startingLive || !creator.canPostOrGoLive} onClick={async()=>{setStartingLive(true);const r=await fetch('/api/live/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:liveTitle,category:liveCategory})});const d=await r.json();if(d.room)window.location.href=`/live/${d.room.roomName}`;else{setStartingLive(false);alert(d.error||'Could not start live');}}} className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{startingLive?'Starting…':'Go live'}</button>
        </div>
      </section>

      <form onSubmit={handleCreatePost} className={`mt-8 flex flex-col gap-3 rounded-xl border border-stone-200 p-4 ${!creator.canPostOrGoLive ? "opacity-60" : ""}`}>
        <h2 className="font-medium">New post</h2>
        <fieldset disabled={!creator.canPostOrGoLive} className="flex flex-col gap-3">
        <FileUpload
          onUploaded={({ url, mediaType }) => setForm({ ...form, mediaUrl: url, mediaType })}
        />
        {form.mediaUrl && (
          <p className="text-xs text-stone-500">Ready to post: {form.mediaUrl.split("/").pop()}</p>
        )}
        <textarea
          placeholder="Caption (optional)"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
        />
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPaywalled}
              onChange={(e) => setForm({ ...form, isPaywalled: e.target.checked })}
            />
            Paywalled (subscribers only)
          </label>
        </div>
        <button
          disabled={posting || !form.mediaUrl}
          className="self-start rounded-full bg-[--accent] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {posting ? "Posting…" : "Post"}
        </button>
        </fieldset>
      </form>

      <div className="mt-8 flex flex-col gap-3">
        <h2 className="font-medium">Your posts</h2>
        {posts.length === 0 && <p className="text-sm text-stone-500">No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="rounded-lg border border-stone-200 p-3 text-sm">
            <p className="text-stone-500">
              {p.isPaywalled ? "🔒 Paywalled" : "🌐 Public"} · {new Date(p.createdAt).toLocaleDateString()}
            </p>
            {p.caption && <p className="mt-1">{p.caption}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
