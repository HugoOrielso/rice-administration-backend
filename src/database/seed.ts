// src/database/seed.ts

import bcrypt from "bcrypt";
import { prisma } from "./db";

export async function runSeed() {
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@arrozzulia.com" },
  });

  if (adminExists) {
    console.log("Seed ya ejecutado, admin existe");
    return;
  }

  const hashedPassword = await bcrypt.hash("12345678", 10);

  await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@arrozzulia.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Seed ejecutado correctamente 🚀");
}