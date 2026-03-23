/**
 * AES-256-GCM 파일 기반 Fallback — keytar 사용 불가 시 영속 저장소
 *
 * 구조: [IV 12바이트] [Auth Tag 16바이트] [암호문]
 * 키: machine-id 기반 PBKDF2 유도 (SHA-512, 100_000 반복)
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";
import { app } from "electron";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const STORE_FILENAME = "secure-store.enc";

let derivedKey: Buffer | null = null;

function getMachineId(): string {
  try {
    return hostname() + "-" + process.pid.toString();
  } catch {
    return "sap-knowledge-hub-fallback-salt";
  }
}

function getDerivedKey(): Buffer {
  if (derivedKey) return derivedKey;

  // app.getPath("userData")를 솔트의 일부로 사용 — 경로가 머신/사용자 고유
  const salt = Buffer.from(app.getPath("userData") + getMachineId(), "utf-8");
  // 마스터 비밀: userData 경로 + 앱 이름 조합 (keytar 대비 보안 수준은 낮지만 메모리 fallback보다 우수)
  const secret = Buffer.from("sap-knowledge-hub:" + app.getName(), "utf-8");

  derivedKey = pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
  return derivedKey;
}

function getStorePath(): string {
  return join(app.getPath("userData"), STORE_FILENAME);
}

function encrypt(plaintext: string): Buffer {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // [IV][Tag][Ciphertext]
  return Buffer.concat([iv, tag, encrypted]);
}

function decrypt(data: Buffer): string {
  const key = getDerivedKey();
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
}

/** 전체 저장소를 JSON 객체로 읽기 */
function readStore(): Record<string, string> {
  const storePath = getStorePath();
  if (!existsSync(storePath)) return {};

  try {
    const raw = readFileSync(storePath);
    const json = decrypt(raw);
    return JSON.parse(json) as Record<string, string>;
  } catch {
    // 복호화 실패 (키 변경 등) → 빈 저장소 반환
    return {};
  }
}

/** 전체 저장소를 암호화하여 파일에 쓰기 */
function writeStore(store: Record<string, string>): void {
  const storePath = getStorePath();
  const dir = dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const json = JSON.stringify(store);
  const encrypted = encrypt(json);
  writeFileSync(storePath, encrypted);
}

/** 파일 Fallback — SecureStore와 동일한 인터페이스 */
export const fileFallback = {
  get(account: string): string | null {
    const store = readStore();
    return store[account] ?? null;
  },

  set(account: string, value: string): void {
    const store = readStore();
    store[account] = value;
    writeStore(store);
  },

  delete(account: string): void {
    const store = readStore();
    delete store[account];
    writeStore(store);
  },
};
