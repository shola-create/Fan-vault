import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaystackSubaccount, createPaystackSplit } from "@/lib/paystack";
export const runtime = "nodejs";
const PLATFORM_FEE_PERCENT = Number(process.env.SUBSCRIPTION_PLATFORM_FEE_PERCENT ?? "20");
export async function POST(req:Request){
 const session=await getServerSession(authOptions); if(!session?.user) return NextResponse.json({error:"Not authenticated"},{status:401});
 const userId=(session.user as any).id as string; const creator=await prisma.creatorProfile.findUnique({where:{userId}}); if(!creator) return NextResponse.json({error:"Only creators can connect payouts"},{status:403});
 const body=await req.json().catch(()=>({})); const bankCode=String(body.bankCode||"").trim(); const accountNumber=String(body.accountNumber||"").replace(/\D/g,"");
 if(!bankCode || !/^\d{10}$/.test(accountNumber)) return NextResponse.json({error:"Select your bank and enter a valid 10-digit account number."},{status:400});
 try{ const sub=await createPaystackSubaccount({business_name:creator.displayName||creator.username,bank_code:bankCode,account_number:accountNumber,percentage_charge:PLATFORM_FEE_PERCENT,email:session.user.email||undefined,name:creator.displayName||creator.username}); const split=await createPaystackSplit({name:`${creator.username} 80/20`,subaccount:sub.subaccount_code,creatorShare:100-PLATFORM_FEE_PERCENT}); await prisma.creatorProfile.update({where:{id:creator.id},data:{paystackSubaccountCode:sub.subaccount_code,paystackSplitCode:split.split_code,payoutBankCode:bankCode,payoutAccountLast4:accountNumber.slice(-4),onboardingComplete:true}}); return NextResponse.json({ok:true,subaccountCode:sub.subaccount_code,splitCode:split.split_code,last4:accountNumber.slice(-4)}); } catch(e){ console.error("Paystack onboarding error",e); return NextResponse.json({error:e instanceof Error?e.message:"Could not connect Paystack payout account"},{status:502}); }
}
