import Redis from 'ioredis';
import { IpRiskData, HodorLogEntry } from '../types';
import { REDIS_KEYS, LOG_TTL_SECONDS } from '../config/defaults';

// redis client singleton //
let redisClient: Redis | null = null;

// initialize and return the redis client //
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redisClient.on('error', (err) => {
      console.error('[hodor-guard] Redis connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[hodor-guard] Redis connected successfully');
    });
  }

  return redisClient;
}

// retrieve ip risk data from redis //
export async function getIpData(ip: string): Promise<IpRiskData | null> {
  const client = getRedisClient();
  const raw = await client.get(`${REDIS_KEYS.ipData}${ip}`);
  if (!raw) return null;
  return JSON.parse(raw) as IpRiskData;
}

// save or update ip risk data in redis //
export async function setIpData(
  ip: string,
  data: IpRiskData,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  await client.setex(
    `${REDIS_KEYS.ipData}${ip}`,
    ttlSeconds,
    JSON.stringify(data),
  );
}

// mark an ip as blocked with a ttl //
export async function blockIp(ip: string, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  await client.setex(`${REDIS_KEYS.blocked}${ip}`, ttlSeconds, '1');
}

// check if an ip is currently blocked //
export async function isIpBlocked(ip: string): Promise<boolean> {
  const client = getRedisClient();
  const result = await client.exists(`${REDIS_KEYS.blocked}${ip}`);
  return result === 1;
}

// unblock an ip manually //
export async function unblockIp(ip: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`${REDIS_KEYS.blocked}${ip}`);
}

// increment request counter for an ip within a time window //
export async function incrementRequestCounter(
  ip: string,
  windowMs: number,
): Promise<number> {
  const client = getRedisClient();
  const key = `${REDIS_KEYS.counter}${ip}`;
  const count = await client.incr(key);
  if (count === 1) {
    await client.pexpire(key, windowMs);
  }
  return count;
}

// append a log entry for a request — expires after 24h //
export async function appendLog(entry: HodorLogEntry): Promise<void> {
  const client = getRedisClient();
  const key = `${REDIS_KEYS.log}${entry.ip}`;
  await client.lpush(key, JSON.stringify(entry));
  await client.expire(key, LOG_TTL_SECONDS);
  await client.ltrim(key, 0, 99);
}

// retrieve the last n log entries for an ip //
export async function getIpLogs(
  ip: string,
  limit: number = 20,
): Promise<HodorLogEntry[]> {
  const client = getRedisClient();
  const raw = await client.lrange(`${REDIS_KEYS.log}${ip}`, 0, limit - 1);
  return raw.map((entry) => JSON.parse(entry) as HodorLogEntry);
}

// increment global stats counters //
export async function incrementStats(
  field: 'totalRequests' | 'blockedRequests',
): Promise<void> {
  const client = getRedisClient();
  await client.hincrby(REDIS_KEYS.stats, field, 1);
}

// retrieve global stats //
export async function getStats(): Promise<Record<string, string>> {
  const client = getRedisClient();
  return client.hgetall(REDIS_KEYS.stats);
}

// retrieve all currently blocked ips //
export async function getBlockedIps(): Promise<string[]> {
  const client = getRedisClient();
  const keys = await client.keys(`${REDIS_KEYS.blocked}*`);
  return keys.map((key) => key.replace(REDIS_KEYS.blocked, ''));
}
