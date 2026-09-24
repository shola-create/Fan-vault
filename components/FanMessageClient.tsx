"use client";
import { useEffect, useState } from "react";
export default function FanMessageClient({ userId, name }: { userId:string; name:string }) {
 const [messages,setMessages]=useState<any[]>([]); const [body,setBody]=useState(""); const [sending,setSending]=useState(false);
 async function load(){const r=await fetch(`/api/fans/messages?userId=${encodeURIComponent(userId)}`);const d=await r.json();if(r.ok)setMessages(d.messages||[])}
 useEffect(()=>{load()},[userId]);
 async function send(e:React.FormEvent){e.preventDefault();if(!body.trim())return;setSending(true);const r=await fetch('/api/fans/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recipientId:userId,body})});const d=await r.json();setSending(false);if(r.ok){setMessages(x=>[...x,d.message]);setBody('')}else alert(d.error||'Could not send')}
 return <main className="mx-auto max-w-2xl px-6 py-10"><h1 className="text-2xl font-semibold">Message {name}</h1><div className="mt-6 max-h-[520px] space-y-2 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4">{messages.map(m=><div key={m.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.senderId===userId?'bg-stone-100':'ml-auto bg-[--accent] text-white'}`}>{m.body}</div>)}</div><form onSubmit={send} className="mt-4 flex gap-2"><input value={body} onChange={e=>setBody(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2" placeholder="Write a message…"/><button disabled={sending||!body.trim()} className="rounded-full bg-[--accent] px-4 py-2 text-white disabled:opacity-50">Send</button></form></main>
}
