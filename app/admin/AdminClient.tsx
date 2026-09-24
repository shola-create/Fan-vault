"use client";

import { useEffect, useState } from "react";

type Report = any;
type User = any;
type Content = any;

export default function AdminClient() {
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [content, setContent] = useState<Content>({ posts: [], messages: [], liveRooms: [] });
  const [codes, setCodes] = useState<any[]>([]);
  const [tokenPacks, setTokenPacks] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  async function load() {
    setLoading(true);
    const [r, u, c, codesRes, tokenRes] = await Promise.all([
      fetch("/api/admin/reports?status=ALL"),
      fetch("/api/admin/users"),
      fetch("/api/admin/content"),
      fetch("/api/admin/ambassador-codes"),
      fetch("/api/admin/token-packs")
    ]);
    const [rd, ud, cd, cod, tokenData] = await Promise.all([r.json(), u.json(), c.json(), codesRes.json(), tokenRes.json()]);
    setReports(rd.reports ?? []);
    setUsers(ud.users ?? []);
    setContent(cd ?? { posts: [], messages: [], liveRooms: [] });
    setCodes(cod.codes ?? []);
    setTokenPacks(tokenData.packs ?? []);
    const stickerRes = await fetch("/api/admin/gift-stickers");
    const stickerData = await stickerRes.json();
    setStickers(stickerData.stickers ?? []);
    setLoading(false);
    if (selectedUserId) await openUser(selectedUserId, false);
  }

  useEffect(() => { load(); }, []);

  async function openUser(userId: string, show = true) {
    if (show) setSelectedUserId(userId);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`);
    const data = await res.json();
    setSelectedUser(data.user ?? null);
    setDetailLoading(false);
  }

  async function detailAction(userId: string, action: string, extra: any = {}) {
    let reason = extra.reason;
    if (["ban", "end_live", "remove_post", "remove_message"].includes(action) && reason === undefined) {
      reason = prompt(action === "ban" ? "Ban reason:" : "Moderation reason:", "Policy violation");
      if (reason === null) return;
    }
    let durationDays = extra.durationDays;
    if (action === "ban") {
      const raw = prompt("Temporary ban duration in days (leave blank for permanent):");
      if (raw === null) return;
      durationDays = raw.trim() ? Number(raw) : undefined;
    }
    if (["remove_post", "remove_message", "end_live"].includes(action) && !confirm("Apply this moderation action?")) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason, durationDays, contentId: extra.contentId }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Action failed");
      return;
    }
    await openUser(userId, false);
    await load();
  }

  async function reportUpdate(reportId: string, status: string) {
    await fetch("/api/admin/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId, status }) });
    load();
  }

  async function userAction(userId: string, action: "ban" | "unban") {
    if (action === "ban") {
      await detailAction(userId, "ban");
    } else {
      await detailAction(userId, "unban");
    }
  }

  async function removeContent(type: "POST" | "MESSAGE", id: string) {
    if (!confirm("Remove this content? This cannot be undone.")) return;
    await fetch("/api/admin/content", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id }) });
    load();
  }

  async function createCode() {
    await fetch("/api/admin/ambassador-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: note || undefined }) });
    setNote("");
    load();
  }

  if (loading) return <main className="mx-auto max-w-7xl px-6 py-10">Loading moderation console…</main>;
  const openReports = reports.filter(r => r.status === "OPEN" || r.status === "REVIEWING").length;
  const filteredUsers = users.filter(u => `${u.name || ""} ${u.email} ${u.creatorProfile?.username || ""}`.toLowerCase().includes(userSearch.toLowerCase()));

  return <>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Admin & moderation</h1><p className="mt-1 text-sm text-stone-500">Review reports, inspect platform activity, investigate accounts, and enforce restrictions.</p></div><button onClick={load} className="rounded-full border px-4 py-2 text-sm">Refresh</button></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Open reports" value={openReports}/><Stat label="Users" value={users.length}/><Stat label="Posts" value={content.posts.length}/><Stat label="Live rooms" value={content.liveRooms.length}/></div>
      <nav className="mt-7 flex flex-wrap gap-2">{[["reports",`Reports (${openReports})`],["users","Users"],["posts","Posts"],["messages","Messages"],["live","Live rooms"],["tokens","FV Tokens"],["stickers","Gift stickers"],["codes","Ambassador codes"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded-full px-4 py-2 text-sm ${tab===id?"bg-stone-900 text-white":"border bg-white"}`}>{label}</button>)}</nav>

      {tab === "reports" && <section className="mt-6 space-y-4">{reports.length===0?<Empty text="No reports yet."/>:reports.map(r=><div key={r.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-red-600">{r.targetType} · {r.status}</p><h2 className="mt-1 font-semibold">{r.reason}</h2><p className="text-sm text-stone-500">Reported {new Date(r.createdAt).toLocaleString()} by {r.reporter?.email}</p></div><div className="flex gap-2"><button onClick={()=>reportUpdate(r.id,"REVIEWING")} className="rounded-full border px-3 py-1.5 text-xs">Reviewing</button><button onClick={()=>reportUpdate(r.id,"DISMISSED")} className="rounded-full border px-3 py-1.5 text-xs">Dismiss</button><button onClick={()=>reportUpdate(r.id,"RESOLVED")} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs text-white">Resolve</button></div></div><p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{r.details || "No additional details."}</p><div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">{r.targetType === "POST" && <><button onClick={()=>r.post?.creator?.userId&&openUser(r.post.creator.userId)} className="font-semibold underline">@{r.post?.creator?.username}</button><p>{r.post?.caption || "No caption"}</p>{r.post?.mediaUrl && <a className="text-blue-600 underline" href={r.post.mediaUrl} target="_blank">Open media</a>}</>}{r.targetType === "MESSAGE" && <><b>Message</b><p className="mt-1 whitespace-pre-wrap">{r.message?.body}</p></>}{r.targetType === "LIVE_ROOM" && <><b>Live room:</b> {r.liveRoom?.title} — @{r.liveRoom?.creator?.username}</>}{r.targetType === "USER" && <>{r.targetUser && <button onClick={()=>openUser(r.targetUser.id)} className="font-semibold underline">{r.targetUser?.name || r.targetUser?.email}</button>}{r.targetUser?.creatorProfile?.username && <p>@{r.targetUser.creatorProfile.username}</p>}</>}</div>{r.targetUser && <div className="mt-3 flex items-center justify-between"><span className="text-xs text-stone-500">Account action</span>{r.targetUser.bannedAt?<button onClick={()=>userAction(r.targetUser.id,"unban")} className="rounded-full border px-3 py-1.5 text-xs">Unban</button>:<button onClick={()=>userAction(r.targetUser.id,"ban")} className="rounded-full bg-red-600 px-3 py-1.5 text-xs text-white">Ban account</button>}</div>}</div>)}</section>}

      {tab === "users" && <section className="mt-6"><div className="mb-3 flex gap-2"><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search name, email or username…" className="w-full rounded-xl border bg-white px-4 py-2 text-sm"/></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-stone-50"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Joined</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{filteredUsers.map(u=><tr key={u.id} className="border-b last:border-0"><td className="p-3"><button onClick={()=>openUser(u.id)} className="text-left"><b className="hover:underline">{u.name || "Unnamed"}</b><div className="text-xs text-stone-500">{u.email}{u.creatorProfile?.username && ` · @${u.creatorProfile.username}`}</div></button></td><td className="p-3">{u.role}</td><td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td><td className="p-3">{u.bannedAt?<span className="text-red-600">Banned{u.banExpiresAt?` until ${new Date(u.banExpiresAt).toLocaleDateString()}`:""}</span>:"Active"}</td><td className="p-3"><button onClick={()=>openUser(u.id)} className="rounded-full border px-3 py-1">View profile</button></td></tr>)}</tbody></table></div></section>}

      {tab === "posts" && <ContentList items={content.posts} type="POST" getTitle={p=>`@${p.creator.username} — ${p.caption || "Untitled post"}`} getMeta={p=>new Date(p.createdAt).toLocaleString()} onDelete={removeContent}/>} 
      {tab === "messages" && <ContentList items={content.messages} type="MESSAGE" getTitle={m=>`${m.sender.name || m.sender.email} → ${m.recipient.name || m.recipient.email}`} getMeta={m=>m.body} onDelete={removeContent}/>} 
      {tab === "live" && <section className="mt-6 space-y-3">{content.liveRooms.map((r:any)=><div key={r.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between gap-4"><div><button onClick={()=>openUser(r.creator.userId)} className="font-semibold hover:underline">{r.title}</button><p className="text-sm text-stone-500">@{r.creator.username} · started {new Date(r.startedAt).toLocaleString()}</p></div><span className={r.status==="LIVE"?"text-red-600":"text-stone-500"}>{r.status}</span></div></div>)}</section>}
      {tab === "tokens" && <TokenPackAdmin packs={tokenPacks} onChange={async()=>{const r=await fetch("/api/admin/token-packs");const d=await r.json();setTokenPacks(d.packs||[]);}}/>}
      {tab === "stickers" && <StickerAdmin stickers={stickers} setStickers={setStickers} onChange={async()=>{const r=await fetch("/api/admin/gift-stickers");const d=await r.json();setStickers(d.stickers||[]);}}/>}

      {tab === "codes" && <section className="mt-6"><div className="flex gap-2"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 rounded-lg border px-3 py-2 text-sm"/><button onClick={createCode} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Generate code</button></div><div className="mt-4 space-y-2">{codes.map(c=><div key={c.id} className="flex justify-between rounded-xl border bg-white p-3 text-sm"><span><b className="font-mono">{c.code}</b>{c.note&&<span className="ml-2 text-stone-500">{c.note}</span>}</span><span className={c.redeemedBy?"text-stone-500":"text-emerald-600"}>{c.redeemedBy?`Used by ${c.redeemedBy.email}`:"Unused"}</span></div>)}</div></section>}
    </main>

    {selectedUserId && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={e=>{if(e.target===e.currentTarget){setSelectedUserId(null);setSelectedUser(null)}}}>
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-stone-50 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-stone-500">Account investigation</p><h2 className="text-2xl font-semibold">{selectedUser?.name || selectedUser?.email || "User"}</h2></div><button onClick={()=>{setSelectedUserId(null);setSelectedUser(null)}} className="rounded-full border bg-white px-3 py-1.5 text-sm">Close</button></div>
        {detailLoading || !selectedUser ? <div className="py-12 text-center text-sm text-stone-500">Loading account history…</div> : <UserInvestigation user={selectedUser} onAction={detailAction}/>} 
      </aside>
    </div>}
  </>;
}

function UserInvestigation({user,onAction}:{user:any,onAction:(id:string,action:string,extra?:any)=>void}){
  const cp=user.creatorProfile;
  const allMessages=[...(user.sentDirectMessages||[]).map((m:any)=>({...m,direction:"Sent",other:m.recipient})),...(user.receivedDirectMessages||[]).map((m:any)=>({...m,direction:"Received",other:m.sender}))].sort((a:any,b:any)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  const paidSent=(user.giftsSent||[]).filter((g:any)=>g.status==="PAID").reduce((n:number,g:any)=>n+g.amountCents,0);
  const paidReceived=(user.giftsReceived||[]).filter((g:any)=>g.status==="PAID").reduce((n:number,g:any)=>n+g.creatorAmountCents,0);
  return <div className="mt-5 space-y-4">
    <section className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3">{user.avatarUrl&&<img src={user.avatarUrl} className="h-12 w-12 rounded-full object-cover"/>}<div><b>{user.name||"Unnamed"}</b><p className="text-sm text-stone-500">{user.email} · {user.role}</p>{cp&&<p className="text-sm text-stone-500">@{cp.username}</p>}</div></div><p className="mt-3 text-xs text-stone-500">Joined {new Date(user.createdAt).toLocaleString()}</p></div><div className="flex gap-2">{user.bannedAt?<button onClick={()=>onAction(user.id,"unban")} className="rounded-full border px-3 py-1.5 text-sm">Unban</button>:<button onClick={()=>onAction(user.id,"ban")} className="rounded-full bg-red-600 px-3 py-1.5 text-sm text-white">Ban account</button>}</div></div>{user.bannedAt&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><b>Banned</b> {user.banExpiresAt?`until ${new Date(user.banExpiresAt).toLocaleString()}`:"permanently"}. {user.banReason||"No reason recorded."}</div>}</section>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Reports against" value={user.reportsAgainst?.length||0}/><Mini label="Reports filed" value={user.reportsFiled?.length||0}/><Mini label="Messages" value={allMessages.length}/><Mini label="Posts" value={cp?.posts?.length||0}/><Mini label="Paid gifts sent" value={money(paidSent)}/><Mini label="Creator gifts received" value={money(paidReceived)}/><Mini label="Subscriptions" value={(user.subscriptions?.length||0)+(user.platformSubscriptions?.length||0)}/><Mini label="Live rooms" value={cp?.liveRooms?.length||0}/></div>

    {cp&&<><section className="rounded-2xl border bg-white p-4"><SectionTitle title="Creator profile"/><p className="text-sm text-stone-700">{cp.bio||"No bio"}</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><Data label="Verification" value={cp.verificationStatus}/><Data label="Monthly price" value={`₦${(cp.monthlyPriceCents/100).toLocaleString()}`}/><Data label="Paystack payouts" value={cp.paystackSubaccountCode?"Connected":"Not connected"}/><Data label="Onboarding" value={cp.onboardingComplete?"Complete":"Incomplete"}/></div></section>
    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Posts" count={cp.posts.length}/>{cp.posts.length===0?<Empty text="No posts."/>:<div className="space-y-2">{cp.posts.map((p:any)=><div key={p.id} className="rounded-xl bg-stone-50 p-3"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-medium">{p.caption||"Untitled post"}</p><p className="text-xs text-stone-500">{p.mediaType} · {new Date(p.createdAt).toLocaleString()} · {p.isPaywalled?"Paywalled":"Public"}</p>{p.mediaUrl&&<a href={p.mediaUrl} target="_blank" className="text-xs text-blue-600 underline">Open media</a>}</div><button onClick={()=>onAction(user.id,"remove_post",{contentId:p.id})} className="h-fit rounded-full bg-red-600 px-3 py-1 text-xs text-white">Remove</button></div></div>)}</div>}</section>
    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Live history" count={cp.liveRooms.length}/>{cp.liveRooms.length===0?<Empty text="No live rooms."/>:<div className="space-y-2">{cp.liveRooms.map((r:any)=><div key={r.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><div><b>{r.title}</b><p className="text-xs text-stone-500">{r.status} · {new Date(r.startedAt).toLocaleString()}</p></div>{r.status==="LIVE"&&<button onClick={()=>onAction(user.id,"end_live",{contentId:r.id})} className="rounded-full bg-red-600 px-3 py-1 text-xs text-white">End live</button>}</div>)}</div>}</section></>}

    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Reports against this account" count={user.reportsAgainst.length}/>{user.reportsAgainst.length===0?<Empty text="No reports against this account."/>:<div className="space-y-2">{user.reportsAgainst.map((r:any)=><div key={r.id} className="rounded-xl bg-stone-50 p-3"><div className="flex justify-between gap-3"><div><b>{r.reason}</b><p className="text-xs text-stone-500">{r.targetType} · {r.status} · {new Date(r.createdAt).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap text-sm">{r.details||"No details"}</p></div><span className="text-xs text-stone-500">{r.reporter?.email}</span></div></div>)}</div>}</section>

    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Direct messages" count={allMessages.length}/>{allMessages.length===0?<Empty text="No messages."/>:<div className="max-h-96 space-y-2 overflow-y-auto">{allMessages.map((m:any)=><div key={m.id} className="rounded-xl bg-stone-50 p-3"><div className="flex justify-between gap-3"><div><span className="text-xs font-semibold uppercase text-stone-500">{m.direction}</span> · <span className="text-xs text-stone-500">{m.other?.email||m.other?.name}</span><p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p><p className="text-xs text-stone-400">{new Date(m.createdAt).toLocaleString()}</p></div><button onClick={()=>onAction(user.id,"remove_message",{contentId:m.id})} className="h-fit rounded-full bg-red-600 px-3 py-1 text-xs text-white">Remove</button></div></div>)}</div>}</section>

    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Payment & platform activity"/><div className="space-y-2 text-sm"><p><b>Platform subscriptions:</b> {user.platformSubscriptions.map((s:any)=>`${s.planType} ${s.status} (${s.billingInterval})`).join(" · ")||"None"}</p><p><b>Creator subscriptions:</b> {user.subscriptions.map((s:any)=>`@${s.creator.username} ${s.status}`).join(" · ")||"None"}</p><p><b>Purchases:</b> {user.purchases.length} post purchase(s), {money(user.purchases.reduce((n:number,p:any)=>n+p.amountCents,0))} total</p><p><b>Gifts sent:</b> {user.giftsSent.length} · <b>Gifts received:</b> {user.giftsReceived.length}</p><p><b>FV Token balance:</b> {user.role === "ADMIN" ? "∞ (admin)" : (user.tokenWallet?.balance ?? 0).toLocaleString()}</p><p><b>FV Token purchases:</b> {user.tokenPurchases?.length || 0}</p></div></section>

    <section className="rounded-2xl border bg-white p-4"><SectionTitle title="Moderation history" count={user.moderationActions.length}/>{user.moderationActions.length===0?<Empty text="No moderation actions recorded."/>:<div className="space-y-2">{user.moderationActions.map((a:any)=><div key={a.id} className="rounded-xl bg-stone-50 p-3"><div className="flex justify-between gap-3"><div><b>{a.action}</b><p className="text-sm">{a.reason||"No reason recorded."}</p></div><span className="text-xs text-stone-500">{new Date(a.createdAt).toLocaleString()} · {a.admin?.email}</span></div></div>)}</div>}</section>
  </div>;
}

function StickerAdmin({stickers,onChange,setStickers}:{stickers:any[],onChange:()=>void,setStickers:(stickers:any[])=>void}){const[name,setName]=useState("");const[emoji,setEmoji]=useState("🐄");const[category,setCategory]=useState("HOT");async function add(){const r=await fetch('/api/admin/gift-stickers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,emoji,category,sortOrder:stickers.length})});const d=await r.json();if(!r.ok)return alert(d.error||'Could not add sticker');setName('');onChange()}async function patch(id:string,body:any){const r=await fetch('/api/admin/gift-stickers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...body})});if(!r.ok){const d=await r.json();alert(d.error||'Could not update sticker');return}onChange()}async function remove(id:string){if(!confirm('Remove this sticker?'))return;await fetch('/api/admin/gift-stickers',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});onChange()}return <section className="mt-6 space-y-4"><div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Gift stickers</h2><p className="mt-1 text-sm text-stone-500">These are the stickers creators can put in their live gift menus. Fans spend FV Tokens to send them.</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[80px_1fr_160px_auto]"><input value={emoji} onChange={e=>setEmoji(e.target.value)} className="rounded-xl border px-3 py-2 text-center text-2xl"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Sticker name (Cow, Shark, Cat…)" className="rounded-xl border px-3 py-2 text-sm"/><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="HOT">🔥 Hot Picks</option><option value="WISH">✨ Make a Wish</option><option value="LUXURY">💎 Luxury</option></select><button onClick={add} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Add sticker</button></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{stickers.map(s=><div key={s.id} className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-3"><div className="text-4xl">{s.emoji}</div><div className="min-w-0 flex-1"><input value={s.name} onChange={e=>{const v=e.target.value;setStickers(stickers.map(x=>x.id===s.id?{...x,name:v}:x))}} onBlur={e=>patch(s.id,{name:e.target.value})} className="w-full rounded border px-2 py-1 font-medium"/><select value={s.category} onChange={e=>patch(s.id,{category:e.target.value})} className="mt-2 rounded border px-2 py-1 text-xs"><option value="HOT">🔥 Hot</option><option value="WISH">✨ Wish</option><option value="LUXURY">💎 Luxury</option></select></div></div><div className="mt-3 flex justify-between text-xs"><button onClick={()=>patch(s.id,{isActive:!s.isActive})} className="rounded-full border px-3 py-1">{s.isActive?'Active':'Hidden'}</button><button onClick={()=>remove(s.id)} className="text-red-600">Delete</button></div></div>)}</div></section>}

function TokenPackAdmin({packs,onChange}:{packs:any[],onChange:()=>void}){
  const [name,setName]=useState(""); const [tokens,setTokens]=useState("100"); const [price,setPrice]=useState("3.50"); const [saving,setSaving]=useState(false);
  async function add(){setSaving(true);const r=await fetch("/api/admin/token-packs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,tokens:Number(tokens),priceCents:Math.round(Number(price)*100),sortOrder:packs.length})});const d=await r.json();setSaving(false);if(!r.ok)return alert(d.error||"Could not add pack");setName("");setTokens("100");setPrice("3.50");onChange();}
  async function patch(id:string,body:any){const r=await fetch("/api/admin/token-packs",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...body})});if(!r.ok){const d=await r.json();alert(d.error||"Could not update pack");return}onChange();}
  async function remove(id:string){if(!confirm("Hide this token pack from buyers?"))return;await fetch("/api/admin/token-packs",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});onChange();}
  return <section className="mt-6 space-y-4"><div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">FV Token packs</h2><p className="mt-1 text-sm text-stone-500">Set the FV Token bundles and their prices. Payments are processed by Paystack. FV Tokens remain the wallet currency; stickers are the gifts fans spend them on.</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_140px_auto]"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Pack name" className="rounded-xl border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><input value={tokens} onChange={e=>setTokens(e.target.value)} type="number" min="1" placeholder="Tokens" className="rounded-xl border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="1" step="1" placeholder="NGN price" className="rounded-xl border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><button disabled={saving} onClick={add} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Add</button></div></div><div className="space-y-2">{packs.map(p=><div key={p.id} className="grid grid-cols-1 gap-2 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_130px_130px_auto_auto] sm:items-center"><input defaultValue={p.name} onBlur={e=>patch(p.id,{name:e.target.value})} className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><input defaultValue={p.tokens} type="number" min="1" onBlur={e=>patch(p.id,{tokens:Number(e.target.value)})} className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><input defaultValue={(p.priceCents/100).toFixed(2)} type="number" min="1" step="1" onBlur={e=>patch(p.id,{priceCents:Math.round(Number(e.target.value))})} className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"/><button onClick={()=>patch(p.id,{isActive:!p.isActive})} className={`rounded-full px-3 py-2 text-xs ${p.isActive?"bg-emerald-100 text-emerald-700":"bg-stone-100 text-stone-500"}`}>{p.isActive?"Active":"Hidden"}</button><button onClick={()=>remove(p.id)} className="rounded-full px-3 py-2 text-xs text-red-600">Hide</button></div>)}</div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Admin tokens:</b> Admin accounts have unlimited FV Tokens and can send any gift amount without a wallet balance. This is not a purchasable balance and is not counted as customer token revenue.</div></section>
}

function money(cents:number){return `$${(cents/100).toFixed(2)}`}
function SectionTitle({title,count}:{title:string,count?:number}){return <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{title}</h3>{count!==undefined&&<span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{count}</span>}</div>}
function Mini({label,value}:{label:string,value:any}){return <div className="rounded-xl border bg-white p-3"><p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>}
function Data({label,value}:{label:string,value:any}){return <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-medium">{value}</p></div>}
function Stat({label,value}:{label:string,value:number}){return <div className="rounded-2xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-stone-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border bg-white p-8 text-center text-sm text-stone-500">{text}</div>}
function ContentList({items,type,getTitle,getMeta,onDelete}:{items:any[],type:"POST"|"MESSAGE",getTitle:(x:any)=>string,getMeta:(x:any)=>string,onDelete:(t:"POST"|"MESSAGE",id:string)=>void}){return <section className="mt-6 space-y-3">{items.length===0?<Empty text="No content found."/>:items.map(x=><div key={x.id} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><b>{getTitle(x)}</b><p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600">{getMeta(x)}</p>{type==="POST"&&x.mediaUrl&&<a href={x.mediaUrl} target="_blank" className="text-sm text-blue-600 underline">Open media</a>}</div><button onClick={()=>onDelete(type,x.id)} className="shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs text-white">Remove</button></div></div>)}</section>}
