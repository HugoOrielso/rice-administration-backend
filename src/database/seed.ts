// src/database/seed.ts

import bcrypt from "bcrypt";
import { prisma } from "./db";

export async function runSeed() {
  const users = [
    {
      name: "Administrador",
      email: "admin@arrozzulia.com",
      password: "&4kBa$gMyPSFVbCJf3yP!H",
      role: "ADMIN",
    },
    {
      name: "Auxiliar",
      email: "auxiliar@arrozzulia.com",
      password: "f#FLKGtEe2595ZDi6D6RM%",
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