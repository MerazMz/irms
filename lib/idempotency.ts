import { redis } from "./redis";

export interface IdempotencyResponse {
  status: number;
  body: any;
  state: "PROCESSING" | "COMPLETED";
}

/**
 * Checks if an idempotency key exists and returns the cached response or a lock.
 * Returns:
 * - IdempotencyResponse if COMPLETED or PROCESSING
 * - null if the key is new and a lock was successfully acquired
 */
export async function getOrLockIdempotency(
  namespace: string,
  key: string
): Promise<IdempotencyResponse | null> {
  const fullKey = `idemp:${namespace}:${key}`;

  // Try to acquire a lock for "PROCESSING" state
  // NX: Only set if it doesn't exist
  // EX: 30 second timeout for the lock (if the server crashes while processing)
  const locked = await redis.set(
    fullKey,
    JSON.stringify({ state: "PROCESSING", status: 202, body: null }),
    { nx: true, ex: 30 }
  );

  if (locked === "OK") {
    return null; // Success, we have the lock
  }

  // If not locked, it might already be COMPLETED or still PROCESSING
  const cached = await redis.get<string>(fullKey);
  if (!cached) return null;

  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

/**
 * Saves the final response to Redis and marks it as COMPLETED.
 */
export async function saveIdempotency(
  namespace: string,
  key: string,
  status: number,
  body: any
) {
  const fullKey = `idemp:${namespace}:${key}`;
  const response: IdempotencyResponse = {
    state: "COMPLETED",
    status,
    body,
  };

  // Set with 24 hour expiry
  await redis.set(fullKey, JSON.stringify(response), { ex: 60 * 60 * 24 });
}

/**
 * Deletes a lock if an error occurred during processing.
 */
export async function deleteIdempotency(namespace: string, key: string) {
  const fullKey = `idemp:${namespace}:${key}`;
  await redis.del(fullKey);
}