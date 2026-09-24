import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(80),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, underscores"),
  role: z.enum(["FAN", "CREATOR"]).default("FAN"),
  interestedIn: z.array(z.enum(["GIRLS", "GUYS", "TRANS"])).max(3).default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

  const { email, password, name, role, username, interestedIn } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const [usernameTaken, creatorUsernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.creatorProfile.findUnique({ where: { username } }),
  ]);
  if (usernameTaken || creatorUsernameTaken) return NextResponse.json({ error: "That username is already taken" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      username,
      passwordHash,
      role,
      interestPreferences: interestedIn.length
        ? { create: interestedIn.map((interest) => ({ interest })) }
        : undefined,
      ...(role === "CREATOR"
        ? {
            creatorProfile: {
              create: {
                username,
                displayName: name,
                tipMenuItems: {
                  create: [
                    { label: "Kiss", emoji: "💋", amountCents: 500, sortOrder: 0 },
                    { label: "Heart", emoji: "❤️", amountCents: 1000, sortOrder: 1 },
                    { label: "Hot", emoji: "🔥", amountCents: 2500, sortOrder: 2 },
                    { label: "VIP", emoji: "👑", amountCents: 5000, sortOrder: 3 },
                  ],
                },
              },
            },
          }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);

    // Keep the client response JSON even when a database/configuration
    // problem occurs. This prevents a blank/HTML error response from
    // causing "Unexpected end of JSON input" in the signup page.
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "That email or username is already in use." }, { status: 409 });
    }

    if (error?.code === "P1001") {
      return NextResponse.json(
        { error: "The app cannot connect to the database. Check that PostgreSQL is running and DATABASE_URL is correct." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "We could not create the account. Check the server terminal for the exact error." },
      { status: 500 }
    );
  }
}
