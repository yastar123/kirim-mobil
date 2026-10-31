import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Request, RequestHandler, Response } from "express";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

export type StaffRole = "owner" | "admin_content" | "admin_operations";
export type StaffRecord = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  createdAt: Date;
};

const SESSION_COOKIE = "kirimmobil_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const passwordSalt = randomBytes(16);

function normalizedAdminEmail(): string {
  return (process.env.KIRIMMOBIL_ADMIN_EMAIL || "").trim().toLowerCase();
}

const configuredPassword = process.env.KIRIMMOBIL_ADMIN_PASSWORD || "";
const configuredPasswordHash = configuredPassword
  ? scryptSync(configuredPassword, passwordSalt, 64)
  : undefined;
const sessionSecret = process.env.SESSION_SECRET || "";
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

type SessionClaims = {
  email: string;
  issuedAt: number;
  expiresAt: number;
  credentialFingerprint: string;
};

export function adminCredentialsConfigured(): boolean {
  return (
    normalizedAdminEmail().includes("@") &&
    configuredPassword.length >= 12 &&
    sessionSecret.length >= 32 &&
    Boolean(configuredPasswordHash)
  );
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeStringEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function credentialFingerprint(secret: string): string {
  return sign(configuredPassword ?? "", secret);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = normalizedAdminEmail();
  if (
    !adminCredentialsConfigured() ||
    !configuredPassword ||
    !configuredPasswordHash ||
    !sessionSecret
  ) {
    return false;
  }

  const candidateHash = scryptSync(password, passwordSalt, 64);
  const passwordMatches = timingSafeEqual(
    configuredPasswordHash,
    candidateHash,
  );
  return safeStringEqual(email.trim().toLowerCase(), expectedEmail) && passwordMatches;
}

export function createAdminSessionCookie(res: Response): void {
  const email = normalizedAdminEmail();
  const secret = sessionSecret;
  if (!adminCredentialsConfigured() || !email || !secret || !configuredPassword) {
    throw new Error("Admin authentication is not configured.");
  }

  const issuedAt = Date.now();
  const claims: SessionClaims = {
    email,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS * 1000,
    credentialFingerprint: credentialFingerprint(secret),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

function loginKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export const limitAdminLoginAttempts: RequestHandler = (req, res, next) => {
  const key = loginKey(req);
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.resetAt <= Date.now()) loginAttempts.delete(key);
  const current = loginAttempts.get(key);
  if (current && current.count >= MAX_LOGIN_ATTEMPTS) {
    res.status(429).json({ error: "Terlalu banyak percobaan masuk. Coba lagi nanti." });
    return;
  }
  next();
};

export function recordFailedAdminLogin(req: Request): void {
  const key = loginKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    current.count += 1;
  }
  if (loginAttempts.size > 5000) {
    for (const [ip, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(ip);
    }
  }
}

export function clearFailedAdminLogins(req: Request): void {
  loginAttempts.delete(loginKey(req));
}

export async function resolveStaffMember(
  req: Request,
): Promise<StaffRecord | undefined> {
  const token = req.cookies?.[SESSION_COOKIE];
  const secret = sessionSecret;
  const email = normalizedAdminEmail();
  const password = configuredPassword;
  if (
    typeof token !== "string" ||
    !adminCredentialsConfigured() ||
    !secret ||
    !email ||
    !password ||
    !configuredPasswordHash
  ) {
    return undefined;
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return undefined;
  if (!safeStringEqual(signature, sign(payload, secret))) return undefined;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionClaims;
    if (
      claims.email !== email ||
      !Number.isFinite(claims.expiresAt) ||
      claims.expiresAt <= Date.now() ||
      !safeStringEqual(
        claims.credentialFingerprint,
        credentialFingerprint(secret),
      )
    ) {
      return undefined;
    }
    return {
      id: "configured-admin",
      email,
      displayName: email,
      role: "owner",
      createdAt: new Date(claims.issuedAt),
    };
  } catch {
    return undefined;
  }
}

export function requireStaff(...allowedRoles: StaffRole[]): RequestHandler {
  return async (req, res, next): Promise<void> => {
    const member = await resolveStaffMember(req);
    if (!member) {
      res.status(401).json({ error: "Silakan masuk ke area admin." });
      return;
    }

    if (
      allowedRoles.length > 0 &&
      member.role !== "owner" &&
      !allowedRoles.includes(member.role)
    ) {
      res.status(403).json({ error: "Your role does not allow this action." });
      return;
    }

    res.locals.staffMember = member;
    next();
  };
}

export function getStaffFromResponse(res: Response): StaffRecord {
  return res.locals.staffMember as StaffRecord;
}
