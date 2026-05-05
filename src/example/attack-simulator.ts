import 'dotenv/config';

// base url of the example server //
const BASE_URL = process.env.SIMULATOR_TARGET || 'http://localhost:3000';

// delay helper //
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// colored console output helpers //
const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  danger: (msg: string) => console.log(`\x1b[31m[BLOCKED]\x1b[0m ${msg}`),
  title: (msg: string) =>
    console.log(
      `\n\x1b[35m${'='.repeat(50)}\x1b[0m\n\x1b[35m ${msg}\x1b[0m\n\x1b[35m${'='.repeat(50)}\x1b[0m\n`,
    ),
};

// send a single request and log the result //
async function sendRequest(
  path: string,
  method: string = 'GET',
): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method });
    const status = res.status;

    if (status === 403) {
      log.danger(`${method} ${path} → ${status} BLOCKED`);
    } else if (status === 200) {
      log.success(`${method} ${path} → ${status} OK`);
    } else {
      log.warn(`${method} ${path} → ${status}`);
    }

    return status;
  } catch {
    log.warn(`${method} ${path} → connection refused`);
    return 0;
  }
}

// simulate brute force — many rapid requests to the same route //
async function simulateBruteForce() {
  log.title('ATTACK 1 — Brute Force');
  log.info('Sending 20 rapid requests to /api/hello...');

  for (let i = 1; i <= 20; i++) {
    await sendRequest('/api/hello');
    await delay(100);
  }
}

// simulate route scanning — accessing many different paths //
async function simulateScanner() {
  log.title('ATTACK 2 — Route Scanner');

  const routes = [
    '/api/users',
    '/api/admin',
    '/api/config',
    '/api/secret',
    '/api/tokens',
    '/api/keys',
    '/api/internal',
    '/api/system',
    '/api/debug',
    '/api/env',
    '/api/backup',
    '/api/logs',
  ];

  log.info(`Scanning ${routes.length} different routes...`);

  for (const route of routes) {
    await sendRequest(route);
    await delay(200);
  }
}

// simulate honeypot access — hitting known trap routes //
async function simulateHoneypot() {
  log.title('ATTACK 3 — Honeypot Access');

  const honeypotRoutes = [
    '/admin',
    '/wp-admin',
    '/.env',
    '/phpmyadmin',
    '/config',
    '/shell',
  ];

  log.info(`Accessing ${honeypotRoutes.length} honeypot routes...`);

  for (const route of honeypotRoutes) {
    await sendRequest(route);
    await delay(300);
  }
}

// simulate request flood — sustained high volume //
async function simulateFlood() {
  log.title('ATTACK 4 — Request Flood');
  log.info('Flooding /api/data with 30 requests...');

  const requests = Array.from({ length: 30 }, (_, i) =>
    sendRequest('/api/data').then((status) => ({ i: i + 1, status })),
  );

  await Promise.all(requests);
}

// fetch and display current hodorguard stats //
async function showStats() {
  log.title('HODORGUARD STATS');

  try {
    const res = await fetch(`${BASE_URL}/hodor/stats`);
    const stats = await res.json();
    console.log(JSON.stringify(stats, null, 2));
  } catch {
    log.warn('Could not fetch stats — is the server running?');
  }
}

// fetch and display blocked ips //
async function showBlocked() {
  log.title('BLOCKED IPs');

  try {
    const res = await fetch(`${BASE_URL}/hodor/blocked`);
    const blocked = await res.json();
    console.log(JSON.stringify(blocked, null, 2));
  } catch {
    log.warn('Could not fetch blocked IPs');
  }
}

// run all attack simulations in sequence //
async function runSimulator() {
  log.title('HODORGUARD ATTACK SIMULATOR');
  log.info(`Target: ${BASE_URL}`);
  log.info('Starting attack simulations...\n');

  await simulateBruteForce();
  await delay(1000);

  await simulateScanner();
  await delay(1000);

  await simulateHoneypot();
  await delay(1000);

  await simulateFlood();
  await delay(1000);

  await showStats();
  await showBlocked();

  log.title('SIMULATION COMPLETE');
}

runSimulator().catch(console.error);
