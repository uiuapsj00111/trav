"use client";

// ============================================================
// Provably Fair System for trav.bet
// Uses HMAC-SHA256 to generate verifiable random outcomes.
//
// Flow:
//   1. Server seed is generated and its SHA-256 hash is shown
//      BEFORE the bet (so the user knows it can't change).
//   2. Client seed is set by the user (or randomly generated).
//   3. On each bet a nonce is incremented.
//   4. HMAC-SHA256(serverSeed, clientSeed + ":" + nonce) produces
//      a hex string from which game outcomes are derived.
//   5. After the user wants to verify they can reveal the server
//      seed and independently compute the hash + outcomes.
// ============================================================

// ---------- crypto helpers (browser) ----------

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- seed helpers ----------

function generateSeed(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- outcome derivation ----------

/** Convert a hex hash to a float 0–1 using the first 8 hex chars (32 bits). */
function hashToFloat(hex: string): number {
  const int = parseInt(hex.slice(0, 8), 16);
  return int / 0xffffffff;
}

/** Convert a hex hash to N floats (each using 8 hex chars). */
function hashToFloats(hex: string, count: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    const slice = hex.slice(i * 8, i * 8 + 8);
    if (slice.length < 8) break;
    results.push(parseInt(slice, 16) / 0xffffffff);
  }
  return results;
}

// ---------- game-specific outcome generators ----------

export interface ProvablyFairState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

/** Create initial state with fresh seeds. */
export async function createFairState(
  clientSeed?: string,
): Promise<ProvablyFairState> {
  const serverSeed = generateSeed();
  const serverSeedHash = await sha256(serverSeed);
  return {
    serverSeed,
    serverSeedHash,
    clientSeed: clientSeed || generateSeed().slice(0, 16),
    nonce: 0,
  };
}

/** Rotate the server seed (reveal old one, create new). */
export async function rotateSeed(state: ProvablyFairState): Promise<{
  oldServerSeed: string;
  newState: ProvablyFairState;
}> {
  const oldServerSeed = state.serverSeed;
  const newServerSeed = generateSeed();
  const newHash = await sha256(newServerSeed);
  return {
    oldServerSeed,
    newState: {
      serverSeed: newServerSeed,
      serverSeedHash: newHash,
      clientSeed: state.clientSeed,
      nonce: 0,
    },
  };
}

/** Core: get the HMAC hex for a given state + nonce. */
async function getGameHash(
  state: ProvablyFairState,
  nonce?: number,
): Promise<string> {
  const n = nonce !== undefined ? nonce : state.nonce;
  return hmacSha256(state.serverSeed, `${state.clientSeed}:${n}`);
}

// ----- Coinflip -----
export async function coinflipOutcome(state: ProvablyFairState): Promise<{
  side: "orange" | "blue";
  hash: string;
  nonce: number;
}> {
  const hash = await getGameHash(state);
  const float = hashToFloat(hash);
  return {
    side: float < 0.5 ? "orange" : "blue",
    hash,
    nonce: state.nonce,
  };
}

// ----- Mines -----
export async function minesOutcome(
  state: ProvablyFairState,
  mineCount: number,
  gridSize: number = 25,
): Promise<{
  minePositions: Set<number>;
  hash: string;
  nonce: number;
}> {
  const hash = await getGameHash(state);
  // Use Fisher-Yates shuffle seeded by segments of the hash
  // Since we need more than 8 floats for a 25-tile grid, we'll use a simple deterministic LCG or just more hash segments
  // A better way: HMAC-SHA256(serverSeed, clientSeed:nonce:round) for each segment

  const indices = Array.from({ length: gridSize }, (_, i) => i);
  let currentHash = hash;
  let hashPos = 0;

  for (let i = gridSize - 1; i > 0; i--) {
    // If we run out of hash, generate a new one by hashing the previous one
    if (hashPos + 8 > currentHash.length) {
      currentHash = await sha256(currentHash);
      hashPos = 0;
    }

    const slice = currentHash.slice(hashPos, hashPos + 8);
    const float = parseInt(slice, 16) / 0xffffffff;
    hashPos += 8;

    const j = Math.floor(float * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    minePositions: new Set(indices.slice(0, mineCount)),
    hash,
    nonce: state.nonce,
  };
}

// ----- Limbo -----
export async function limboOutcome(state: ProvablyFairState): Promise<{
  crashPoint: number;
  hash: string;
  nonce: number;
}> {
  const hash = await getGameHash(state);
  const float = hashToFloat(hash);
  // Standard crash/limbo formula: (1 - edge) / (1 - float)
  // Standardize to 8% house edge: 0.92 / (1 - float)
  // Ensure we don't divide by zero if float is 1.0 (though extremely rare)
  const denom = Math.max(0.000001, 1 - float);
  const crashPoint = Math.min(
    1000000,
    Math.max(1.0, Math.round((0.92 / denom) * 100) / 100),
  );
  return {
    crashPoint,
    hash,
    nonce: state.nonce,
  };
}

// ----- Cases -----
export async function casesOutcome(
  state: ProvablyFairState,
  itemCount: number,
): Promise<{
  itemIndex: number;
  float: number;
  hash: string;
  nonce: number;
}> {
  const hash = await getGameHash(state);
  const float = hashToFloat(hash);
  // itemIndex is resolved by the caller using actual item chances;
  // we return the raw float so the caller can do weighted selection.
  const itemIndex = Math.min(
    itemCount - 1,
    Math.max(0, Math.floor(float * itemCount)),
  );
  return { itemIndex, float, hash, nonce: state.nonce };
}

// Battles feature removed

// ---------- Verification ----------

export async function verifyOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<{ hash: string; float: number; serverSeedHash: string }> {
  const serverSeedHash = await sha256(serverSeed);
  const hash = await hmacSha256(serverSeed, `${clientSeed}:${nonce}`);
  const float = hashToFloat(hash);
  return { hash, float, serverSeedHash };
}

export { generateSeed, hashToFloat, hmacSha256, sha256 };
