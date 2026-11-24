export const CLOSE = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL: 4400,
  AUTH: 4401,
  ORIGIN: 4403,
  AUTH_TIMEOUT: 4408,
} as const;

const textEncoder = new TextEncoder();

export interface HelloFrame {
  type: "hello";
  proto: number;
  app: string;
  appVersion: string;
  nonce: string;
  caps: string[];
}

export interface ReadyFrame {
  type: "ready";
  session: string;
  serverProof: string;
  heartbeatMs: number;
  source: SourceBody;
  button: { button: "primary"; down: boolean; seq: number; t: number };
}

export interface ButtonFrame {
  type: "button";
  button: "primary";
  down: boolean;
  seq: number;
  t: number;
  sent: number;
}

export interface PingFrame {
  type: "ping";
  seq: number;
  down: boolean;
  sent: number;
}

export interface SourceFrame {
  type: "source";
  state: "ok" | "unavailable";
  reason?: string;
  node?: string;
  name?: string;
}

export interface CommandFrame {
  type: "command";
  action: "open-menu";
  seq: number;
  sent: number;
}

export interface UnknownFrame {
  type: "unknown";
  rawType: string;
}

export type ServerFrame =
  HelloFrame | ReadyFrame | ButtonFrame | PingFrame | SourceFrame | CommandFrame | UnknownFrame;

interface SourceBody {
  state: "ok" | "unavailable";
  reason?: string;
  node?: string;
  name?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function booleanField(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integerField(record: Record<string, unknown>, key: string): number | null {
  const value = numberField(record, key);
  return value !== null && Number.isInteger(value) ? value : null;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  if (!(key in record) || record[key] === undefined) return undefined;
  const value = stringField(record, key);
  return value === null ? undefined : value;
}

function sourceBody(value: unknown): SourceBody | null {
  if (!isRecord(value)) return null;
  const state = stringField(value, "state");
  if (state !== "ok" && state !== "unavailable") return null;
  const reason = optionalString(value, "reason");
  const node = optionalString(value, "node");
  const name = optionalString(value, "name");
  if (
    ("reason" in value && value.reason !== undefined && reason === undefined) ||
    ("node" in value && value.node !== undefined && node === undefined) ||
    ("name" in value && value.name !== undefined && name === undefined)
  ) {
    return null;
  }
  return { state, reason, node, name };
}

function parseHello(record: Record<string, unknown>): HelloFrame | null {
  const proto = integerField(record, "proto");
  const app = stringField(record, "app");
  const appVersion = stringField(record, "appVersion");
  const nonce = stringField(record, "nonce");
  const caps = record.caps;
  if (proto === null || app === null || appVersion === null || nonce === null) return null;
  if (!Array.isArray(caps) || caps.some((item) => typeof item !== "string")) return null;
  return { type: "hello", proto, app, appVersion, nonce, caps };
}

function parseReady(record: Record<string, unknown>): ReadyFrame | null {
  const session = stringField(record, "session");
  const serverProof = stringField(record, "serverProof");
  const heartbeatMs = integerField(record, "heartbeatMs");
  const source = sourceBody(record.source);
  if (session === null || serverProof === null || heartbeatMs === null || !source) return null;
  if (!isRecord(record.button)) return null;
  const button = stringField(record.button, "button");
  const down = booleanField(record.button, "down");
  const seq = integerField(record.button, "seq");
  const t = numberField(record.button, "t");
  if (button !== "primary" || down === null || seq === null || t === null) return null;
  return {
    type: "ready",
    session,
    serverProof,
    heartbeatMs,
    source,
    button: { button, down, seq, t },
  };
}

function parseButton(record: Record<string, unknown>): ButtonFrame | null {
  const button = stringField(record, "button");
  const down = booleanField(record, "down");
  const seq = integerField(record, "seq");
  const t = numberField(record, "t");
  const sent = numberField(record, "sent");
  if (button !== "primary" || down === null || seq === null || t === null || sent === null)
    return null;
  return { type: "button", button, down, seq, t, sent };
}

function parsePing(record: Record<string, unknown>): PingFrame | null {
  const seq = integerField(record, "seq");
  const down = booleanField(record, "down");
  const sent = numberField(record, "sent");
  if (seq === null || down === null || sent === null) return null;
  return { type: "ping", seq, down, sent };
}

function parseSource(record: Record<string, unknown>): SourceFrame | null {
  const source = sourceBody(record);
  if (!source) return null;
  return { type: "source", ...source };
}

function parseCommand(record: Record<string, unknown>): CommandFrame | null {
  const action = stringField(record, "action");
  const seq = integerField(record, "seq");
  const sent = numberField(record, "sent");
  if (action !== "open-menu" || seq === null || sent === null) return null;
  return { type: "command", action, seq, sent };
}

/** Strict frame parser. Unknown types are ignored by callers. Malformed JSON returns null. */
export function parseServerFrame(text: string): ServerFrame | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "hello":
      return parseHello(value);
    case "ready":
      return parseReady(value);
    case "button":
      return parseButton(value);
    case "ping":
      return parsePing(value);
    case "source":
      return parseSource(value);
    case "command":
      return parseCommand(value);
    default:
      return { type: "unknown", rawType: value.type };
  }
}

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodePairingCode(code: string): Uint8Array | null {
  const trimmed = code.trim();
  if (!/^[A-Za-z0-9_-]+$/u.test(trimmed)) return null;
  const padded = trimmed + "=".repeat((4 - (trimmed.length % 4)) % 4);
  const encoded = padded.replaceAll("-", "+").replaceAll("_", "/");
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.length === 32 ? bytes : null;
}

export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function hmac(secret: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    copyBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return new Uint8Array(signature);
}

function copyBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export async function proof(
  secret: Uint8Array,
  nonce: string,
  clientNonce: string,
  role: "client" | "server"
): Promise<string> {
  const digest = await hmac(secret, `spen-bridge/1|${role}|${nonce}|${clientNonce}`);
  return base64url(digest);
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(bytes: Uint8Array): string {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32[(buffer << (5 - bits)) & 31];
  return output;
}

export async function fingerprint(secret: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copyBytes(secret)));
  const encoded = base32(digest);
  return `${encoded.slice(0, 4)}-${encoded.slice(4, 8)}`;
}

export function safeEqual(left: string, right: string): boolean {
  const a = textEncoder.encode(left);
  const b = textEncoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}
