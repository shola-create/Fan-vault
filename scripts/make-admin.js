const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run make-admin -- your@email.com");
    process.exitCode = 1;
    return;
  }

  if (!email.includes("@")) {
    console.error("Please provide a valid email address.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!user) {
    console.error(`No account was found for ${email}. Create the account through the site first, then run this command.`);
    process.exitCode = 1;
    return;
  }

  if (user.role === "ADMIN") {
    console.log(`${email} is already an ADMIN account.`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`Success: ${email} is now an ADMIN account.`);
  console.log("Open http://localhost:3000/admin after signing out and back in.");
}

main()
  .catch((error) => {
    console.error("Could not create the admin role:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
