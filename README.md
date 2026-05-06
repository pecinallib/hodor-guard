<div align="center">
  <h1>🛡️ HodorGuard</h1>
  <p><strong>Security middleware for Node.js, rate limiting, honeypot, risk scoring and auto blocking.</strong></p>

  <p>
    <img src="https://img.shields.io/npm/v/hodor-guard?color=6c47ff&style=flat-square" alt="npm version" />
    <img src="https://img.shields.io/npm/l/hodor-guard?color=6c47ff&style=flat-square" alt="license" />
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-6c47ff?style=flat-square" alt="node version" />
    <img src="https://img.shields.io/badge/redis-required-6c47ff?style=flat-square" alt="redis" />
  </p>
</div>

---

## What is HodorGuard?

HodorGuard is a plug-and-play security middleware for Express APIs. It silently monitors every incoming request, builds a **risk score per IP**, and automatically blocks suspicious behavior, with zero impact on legitimate users.

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
- **Dual package** — supports both CommonJS and ES Modules consumers

---

## Requirements

- **Node.js** >= 18.0.0
- **Redis** server reachable from your application
- **Express** >= 4.0.0 (Express 5 fully supported)

---

## Tested compatibility

| Setup                              | Status                                            |
| ---------------------------------- | ------------------------------------------------- |
| Express 4 + CommonJS               | ✅ tested                                         |
| Express 5 + ESM (tsx, ts-node ESM) | ✅ tested                                         |
| NestJS                             | ⚠️ not yet tested                                 |
| Fastify                            | ❌ not supported (different middleware system)    |
| Koa                                | ❌ not supported (different middleware signature) |

---

## Installation

```bash
npm install hodor-guard
```

> Redis is required. HodorGuard uses it for all state management, counters, scores, blocks and logs.

---

## Quick start (Express + ESM)

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

// optional mount monitoring endpoints
app.use('/hodor', statsRouter);

app.listen(3000);
```

## Quick start (Express + CommonJS)

```javascript
const express = require('express');
const { hodorGuard } = require('hodor-guard');
const { statsRouter } = require('hodor-guard/router');

const app = express();

app.use(
  hodorGuard({
    rateLimit: true,
    honeypot: true,
    autoBlock: true,
  }),
);

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

## Configuration best practices

### ⚠️ Honeypot routes must not collide with real routes

Honeypot routes are designed to catch attackers, any IP that accesses them gets a heavy penalty. **If you have a real route that matches a default honeypot path, that route will trap your legitimate users.**

Example: if your application has a real `/admin` panel, the default honeypot list will block your administrators after a few legitimate accesses.

**Two safe patterns:**

**1. Use obscure paths for sensitive routes (recommended)**

```javascript
// instead of /admin, use a non-obvious path
app.get('/secret-panel-x9k2', adminHandler);
```

Default honeypots stay enabled, anyone hitting `/admin` is an attacker.

**2. Override the honeypot list to remove conflicting paths**

```javascript
app.use(
  hodorGuard({
    honeypotRoutes: ['/wp-admin', '/.env', '/phpmyadmin', '/shell'],
    // /admin removed your app uses it legitimately
  }),
);
```

### Behind a reverse proxy

If your app runs behind a reverse proxy (Nginx, Caddy, Cloudflare), enable Express trust proxy so HodorGuard can read the real client IP from `x-forwarded-for`:

```javascript
app.set('trust proxy', 1);
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

> ⚠️ The monitoring endpoints have no authentication built in. Mount them behind your own auth middleware in production.

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

- **IP spoofing** — relies on `x-forwarded-for` header. Configure your reverse proxy to overwrite this header to prevent client-side spoofing.
- **Distributed attacks** — botnets using many IPs each making few requests will not be detected on a per-IP basis.
- **Redis dependency** — if Redis is unavailable, HodorGuard fails open (requests pass through). This is intentional to never block legitimate traffic on internal errors, but means your protection is offline if Redis goes down.
- **Shared IPs** — corporate proxies or CDNs may share the same IP across many users. Tune `rateLimitMax` and `riskScoreThreshold` accordingly.
- **No persistence after Redis restart** — without Redis persistence configured, scores and blocks are lost when Redis restarts.

---

## License

MIT © [Matheus Bastos Pecinalli](https://github.com/pecinallib)
