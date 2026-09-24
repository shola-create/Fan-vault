"use client";

import ReportButton from "./ReportButton";

import { useEffect, useState } from "react";

type Msg = { id:string; senderId:string; recipientId:string; body:string; createdAt:string };

export default function MessagesClient({ username, viewerId, fanId, creatorName, canMessage }: {
  username:string; viewerId:string; fanId?:string; creatorName:string; canMessage:boolean;
}) {
  const [messages,setMessages]=useState<Msg[]>([]);
  const [body,setBody]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({username});
    if (fanId) qs.set("fanId",fanId);
    const r=await fetch(`/api/messages?${qs}`);
    const d=await r.json();
    if(r.ok) setMessages(d.messages||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[username,fanId]);

  async function send(e:React.FormEvent) {
    e.preventDefault();
    if(!body.trim()) return;
    setSending(true);
    const headers:Record<string,string>={"Content-Type":"application/json"};
    if(fanId) headers["x-message-fan-id"]=fanId;
    const r=await fetch("/api/messages",{method:"POST",headers,body:JSON.stringify({username,body})});
    const d=await r.json();
    setSending(false);
    if(r.ok){setMessages(m=>[...m,d.message]);setBody("");}
    else alert(d.error||"Couldn't send message");
  }

  return <section className="rounded-xl border border-stone-200 bg-white p-4">
    <h2 className="font-medium">Messages with {creatorName}</h2>
    {!canMessage ? <p className="mt-3 text-sm text-stone-500">You need an active subscription to message this creator.</p> :
      <>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
          {loading ? <p className="text-sm text-stone-500">Loading…</p> :
            messages.length===0 ? <p className="text-sm text-stone-500">No messages yet. Start the conversation.</p> :
            messages.map(m=><div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.senderId===viewerId?"ml-auto bg-[--accent] text-white":"bg-stone-100 text-stone-900"}`}>
              <p>{m.body}</p><p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString()} · <ReportButton targetType="MESSAGE" targetId={m.id} /></p>
            </div>)}
        </div>
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="Write a message…" />
          <button disabled={sending||!body.trim()} className="rounded-full bg-[--accent] px-4 py-2 text-sm text-white disabled:opacity-50">{sending?"Sending…":"Send"}</button>
        </form>
      </>}
  </section>
}
