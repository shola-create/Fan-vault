import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let packs = await prisma.tokenPack.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { tokens: "asc" }] });
  if (packs.length === 0) {
    const defaults = [
      ["100 FV Tokens", 100, 700], ["250 FV Tokens", 250, 1500], ["500 FV Tokens", 500, 2850],
      ["1,000 FV Tokens", 1000, 7000], ["2,500 FV Tokens", 2500, 11000], ["10,000 FV Tokens", 10000, 64000], ["35,000 FV Tokens", 35000, 265000]
    ];
    await prisma.tokenPack.createMany({ data: defaults.map(([name,tokens,priceCents],i)=>({name:String(name),tokens:Number(tokens),priceCents:Number(priceCents),sortOrder:i,currency:"ngn"})) });
    packs = await prisma.tokenPack.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { tokens: "asc" }] });
  }
  return NextResponse.json({ packs });
}
