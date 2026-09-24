import { NextResponse } from "next/server";
import { listPaystackBanks } from "@/lib/paystack";
export const runtime = "nodejs";
export async function GET(){ try { return NextResponse.json({banks: await listPaystackBanks()}); } catch(e){ console.error(e); return NextResponse.json({error:"Could not load banks"},{status:500}); } }
