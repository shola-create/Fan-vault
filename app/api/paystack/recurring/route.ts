import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargePaystackAuthorization } from "@/lib/paystack";
export const runtime="nodejs";
export async function POST(req:Request){
 const auth=req.headers.get("authorization"); if(process.env.CRON_SECRET&&auth!==`Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
 const now=new Date(); let creatorRenewals=0;
 const creators=await prisma.subscription.findMany({where:{status:"active",nextChargeAt:{lte:now},paystackAuthorizationCode:{not:null}},include:{fan:true,creator:true},take:100});
 for(const sub of creators){
   try{ const ref=`renew_${sub.id}_${Date.now()}`; await chargePaystackAuthorization({authorizationCode:sub.paystackAuthorizationCode!,email:sub.fan.email,amount:sub.amountKobo||sub.creator.monthlyPriceCents,splitCode:sub.creator.paystackSplitCode||undefined,reference:ref,metadata:{type:"CREATOR_SUBSCRIPTION_RENEWAL",subscriptionId:sub.id}}); const end=new Date(now.getTime()+30*86400000); await prisma.subscription.update({where:{id:sub.id},data:{nextChargeAt:end,currentPeriodEnd:end,lastPaymentReference:ref,status:"active"}}); creatorRenewals++; }
   catch(e){ console.error("creator renewal failed",sub.id,e); await prisma.subscription.update({where:{id:sub.id},data:{status:"past_due"}}); }
 }
 return NextResponse.json({ok:true,creatorRenewals});
}
