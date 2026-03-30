// src/modules/auth/auth.utils.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../generated/prisma/client";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret";

const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

type TokenPayload = {
  id: string;
  email: string;
  role: string;
};

export function signAccessToken(
  user: Pick<User, "id" | "email" | "role">
): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(
  user: Pick<User, "id" | "email" | "role">
): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}