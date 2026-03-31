import bcrypt from "bcrypt";
import { prisma } from "../src/database/db";

async function main() {
  const hashedPassword = await bcrypt.hash("12345678", 10);

  await prisma.user.upsert({
    where: { email: "admin@arrozzulia.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@arrozzulia.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Seed ejecutado correctamente");
}

main()
  .catch((e) => {
    console.error("Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });