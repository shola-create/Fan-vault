"use client";
import { useState } from "react";
export default function FollowButton({ userId, initialFollowing=false }: { userId:string; initialFollowing?:boolean }) {
 const [following,setFollowing]=useState(initialFollowing); const [busy,setBusy]=useState(false);
 async function toggle(){setBusy(true); const r=following?await fetch(`/api/follow?userId=${encodeURIComponent(userId)}`,{method:"DELETE"}):await fetch("/api/follow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})}); setBusy(false); if(r.ok)setFollowing(!following);}
 return <button disabled={busy} onClick={toggle} className="rounded-full bg-[--accent] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy?"…":following?"Following":"Follow"}</button>
}
