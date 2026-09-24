"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

export default function InboxClient({username}:{username:string}) {
 const [items,setItems]=useState<any[]>([]);
 useEffect(()=>{fetch("/api/messages/inbox").then(r=>r.json()).then(d=>setItems(d.conversations||[]))},[]);
 return <main className="mx-auto max-w-2xl px-6 py-10">
  <Link href="/dashboard" className="text-sm text-stone-500">← Dashboard</Link>
  <h1 className="mt-4 text-2xl font-semibold">Messages</h1>
  <p className="mt-1 text-sm text-stone-500">Conversations with your subscribers.</p>
  <div className="mt-6 space-y-2">
   {items.length===0?<p className="text-sm text-stone-500">No subscriber messages yet.</p>:items.map(i=>
    <Link key={i.fanId} href={`/messages/${username}?fan=${encodeURIComponent(i.fanId)}`} className="block rounded-xl border border-stone-200 p-4 hover:bg-stone-50">
      <div className="flex justify-between"><span className="font-medium">{i.fanName}</span><span className="text-xs text-stone-400">{new Date(i.createdAt).toLocaleString()}</span></div>
      <p className="mt-1 truncate text-sm text-stone-500">{i.lastMessage}</p>
    </Link>)}
  </div>
 </main>
}
