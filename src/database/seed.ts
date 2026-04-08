// src/database/seed.ts

import bcrypt from "bcrypt";
import { prisma } from "./db";

export async function runSeed() {
  const users = [
    {
      name: "Administrador",
      email: "admin@arrozzulia.com",
      password: "Andina2026@.",
      role: "ADMIN",
    },
    {
      name: "Auxiliar",
      email: "auxiliar@arrozzulia.com",
      password: "@Capitalsas2026.",
      role: "OPERATOR",
    },
  ];

  for (const user of users) {
    const exists = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (exists) continue;

    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role as "ADMIN" | "OPERATOR",
        isActive: true,
      },
    });
  }

  console.log("Seed ejecutado correctamente 🚀");
}