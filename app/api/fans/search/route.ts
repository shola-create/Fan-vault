import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(req:Request){const session=await getServerSession(authOptions);if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const q=(new URL(req.url).searchParams.get('q')||'').trim();if(q.length<2)return NextResponse.json({users:[]});const users=await prisma.user.findMany({where:{OR:[{username:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}}],bannedAt:null},select:{id:true,username:true,name:true,avatarUrl:true,role:true},take:20,orderBy:{createdAt:'desc'}});return NextResponse.json({users});}
