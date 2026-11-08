import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const provider = "password";
const ownerEmail = (process.env.APP_OWNER_EMAIL || "").trim().toLowerCase();
const ownerSetupCode = process.env.APP_OWNER_SETUP_CODE || "";
const passwordIterations = 600_000;
const encoder = new TextEncoder();

function toHex(value: Uint8Array) {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const passwordBytes = encoder.encode(password);
  const key = await crypto.subtle.importKey("raw", passwordBytes.buffer as ArrayBuffer, "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" }, key, 256));
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, passwordIterations);
  return `pbkdf2-sha256$${passwordIterations}$${toHex(salt)}$${toHex(hash)}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, rawIterations, rawSalt, rawHash] = stored.split("$");
  const iterations = Number(rawIterations);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !rawSalt || !rawHash) return false;
  const salt = new Uint8Array(rawSalt.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const expected = new Uint8Array(rawHash.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  if (!salt.length || !expected.length) return false;
  const actual = await derivePasswordHash(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index++) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

export function InvitedPassword() {
  return ConvexCredentials({
    id: provider,
    authorize: async (credentials, ctx) => {
      const email = String(credentials.email || "").trim().toLowerCase();
      const password = String(credentials.password || "");
      const flow = String(credentials.flow || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (!password || password.length < 8) throw new Error("Passwords must contain at least eight characters.");

      if (flow === "signUp") {
        const inviteCode = String(credentials.inviteCode || "").trim();
        if (ownerEmail && email === ownerEmail) {
          if (!ownerSetupCode || !constantTimeEqual(inviteCode, ownerSetupCode)) throw new Error("Enter the owner setup code configured for this deployment.");
        } else {
          const invited = inviteCode && await ctx.runQuery(internal.invitations.checkCode, { email, inviteCode });
          if (!invited) throw new Error("This workspace is invitation-only. Use the email and code you received.");
        }
        const created = await createAccount(ctx, {
          provider,
          account: { id: email, secret: password },
          profile: { email, name: String(credentials.name || email.split("@")[0]).slice(0, 100) },
          shouldLinkViaEmail: false,
          shouldLinkViaPhone: false,
        });
        return { userId: created.user._id };
      }

      if (flow === "signIn") {
        const retrieved = await retrieveAccount(ctx, { provider, account: { id: email, secret: password } });
        if (!retrieved) throw new Error("Invalid email or password.");
        return { userId: retrieved.user._id };
      }

      throw new Error("Unsupported authentication flow.");
    },
    crypto: {
      hashSecret: hashPassword,
      verifySecret: verifyPassword,
    },
  });
}
