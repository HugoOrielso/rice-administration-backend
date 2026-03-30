// prisma/seed.ts
import bcrypt from "bcrypt";
import { prisma } from "../src/database/db";


async function main() {
  const email = "admin@arrozzulia.com";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("El admin ya existe");
    return;
  }

  const password = await bcrypt.hash("12345678", 10);

  await prisma.user.create({
    data: {
      name: "Admin Principal",
      email,
      password,
      role: "ADMIN",
    },
  });

  console.log("Admin creado correctamente");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });