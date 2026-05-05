<div align="center">
  <h1>🛡️ HodorGuard</h1>
  <p><strong>Security middleware for Node.js — rate limiting, honeypot, risk scoring and auto blocking.</strong></p>

  <p>
    <img src="https://img.shields.io/npm/v/hodor-guard?color=6c47ff&style=flat-square" alt="npm version" />
    <img src="https://img.shields.io/npm/l/hodor-guard?color=6c47ff&style=flat-square" alt="license" />
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-6c47ff?style=flat-square" alt="node version" />
    <img src="https://img.shields.io/badge/redis-required-6c47ff?style=flat-square" alt="redis" />
  </p>
</div>

---

## What is HodorGuard?

HodorGuard is a plug-and-play security middleware for Express APIs. It silently monitors every incoming request, builds a **risk score per IP**, and automatically blocks suspicious behavior — with zero impact on legitimate users.

It is designed to run on limited VPS environments with low memory and CPU usage, using Redis as its only dependency.

---

## Features

- **Rate limiting** — configurable request limit per IP within a time window
- **Honeypot routes** — fake endpoints that penalize any IP that accesses them
- **Risk scoring** — every IP gets a dynamic score based on behavior
- **Auto blocking** — IPs that exceed the risk threshold are blocked via Redis TTL
- **Scanner detection** — detects IPs accessing too many different routes
- **Brute force detection** — detects high-volume burst patterns
- **Flood detection** — detects sustained high request rates
- **Request logging** — lightweight 24h logs stored in Redis
- **Monitoring endpoints** — built-in HTTP endpoints to inspect runtime data

---

## Installation

```bash
npm install hodor-guard
```

> Redis is required. HodorGuard uses it for all state management — counters, scores, blocks and logs.

---

## Quick start

```typescript
import express from 'express';
import { hodorGuard } from 'hodor-guard';
import { statsRouter } from 'hodor-guard/router';

const app = express();

app.use(
  hodorGuard({
    rateLimit: true,
    honeypot: true,
    autoBlock: true,
  }),
);

// optional — mount monitoring endpoints
app.use('/hodor', statsRouter);

app.listen(3000);
```

---

## Configuration

All options are optional. HodorGuard uses sensible defaults out of the box.

| Option               | Type       | Default   | Description                               |
| -------------------- | ---------- | --------- | ----------------------------------------- |
| `rateLimit`          | `boolean`  | `true`    | Enable rate limiting                      |
| `honeypot`           | `boolean`  | `true`    | Enable honeypot routes                    |
| `autoBlock`          | `boolean`  | `true`    | Enable automatic IP blocking              |
| `rateLimitMax`       | `number`   | `100`     | Max requests per window per IP            |
| `rateLimitWindowMs`  | `number`   | `60000`   | Time window in milliseconds               |
| `riskScoreThreshold` | `number`   | `70`      | Score at which an IP gets blocked (0–100) |
| `blockTtlSeconds`    | `number`   | `900`     | How long a blocked IP stays blocked       |
| `scannerThreshold`   | `number`   | `10`      | Unique routes before flagging as scanner  |
| `honeypotRoutes`     | `string[]` | see below | Routes that trigger honeypot penalty      |
| `logRequests`        | `boolean`  | `true`    | Store request logs in Redis               |

### Default honeypot routes

```
/admin  /admin/login  /wp-admin  /wp-login.php
/phpmyadmin  /config  /.env  /backup  /shell  /console
```

---

## Risk scoring

Each suspicious behavior adds points to the IP's risk score. When the score reaches the threshold, the IP is blocked.

| Behavior                | Penalty |
| ----------------------- | ------- |
| Honeypot route accessed | +40     |
| Brute force detected    | +25     |
| Rate limit exceeded     | +20     |
| Scanner detected        | +15     |
| Flood detected          | +10     |

---

## Monitoring endpoints

Mount `statsRouter` to expose runtime data:

```typescript
app.use('/hodor', statsRouter);
```

| Endpoint                    | Description                       |
| --------------------------- | --------------------------------- |
| `GET /hodor/stats`          | Global request and block counters |
| `GET /hodor/blocked`        | All currently blocked IPs         |
| `GET /hodor/top-attackers`  | Blocked IPs sorted by risk score  |
| `GET /hodor/logs/:ip`       | Request logs for a specific IP    |
| `GET /hodor/ip/:ip`         | Full risk data for a specific IP  |
| `DELETE /hodor/blocked/:ip` | Manually unblock an IP            |

---

## Environment variables

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Running the example

Clone the repo and start the demo server:

```bash
git clone https://github.com/pecinallib/hodor-guard.git
cd hodor-guard
npm install
cp .env.example .env
npm run example
```

In a second terminal, run the attack simulator:

```bash
npm run simulator
```

Watch HodorGuard detect and block brute force, scanner, honeypot and flood attacks in real time.

---

## Running tests

```bash
npm test
npm run test:coverage
```

---

## IP risk data structure

```json
{
  "ip": "192.168.0.1",
  "riskScore": 87,
  "flags": ["honeypot_access", "brute_force"],
  "blocked": true,
  "firstSeen": 1713000000000,
  "lastSeen": 1713000120000,
  "requestCount": 342
}
```

---

## Limitations

- **IP spoofing** — relies on `x-forwarded-for` header; ensure your proxy overwrites it
- **Distributed attacks** — botnets using many IPs will not be detected per-IP
- **Redis dependency** — if Redis is unavailable, HodorGuard fails open (requests pass through)
- **Shared IPs** — corporate proxies or CDNs may share IPs across many users

---

## License

MIT © [Matheus Bastos Pecinalli](https://github.com/pecinallib)
