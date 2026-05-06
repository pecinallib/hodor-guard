import { Router, Request, Response } from 'express';
import {
  getStats,
  getBlockedIps,
  getIpData,
  getIpLogs,
  unblockIp,
} from '../redis/redisService';
import { HodorStats } from '../types';

const router = Router();

// get global hodorguard stats //
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const raw = await getStats();

    const stats: HodorStats = {
      totalRequests: Number(raw.totalRequests ?? 0),
      blockedRequests: Number(raw.blockedRequests ?? 0),
      activeBlocks: 0,
      topAttackers: [],
      uptime: process.uptime(),
    };

    const blockedIps = await getBlockedIps();
    stats.activeBlocks = blockedIps.length;

    // fetch risk data for all blocked ips //
    const topAttackers = await Promise.all(
      blockedIps.slice(0, 10).map((ip) => getIpData(ip)),
    );

    stats.topAttackers = topAttackers.filter(
      (data) => data !== null,
    ) as NonNullable<(typeof topAttackers)[number]>[];

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// get all currently blocked ips //
router.get('/blocked', async (_req: Request, res: Response): Promise<void> => {
  try {
    const blockedIps = await getBlockedIps();

    const details = await Promise.all(
      blockedIps.map(async (ip) => {
        const data = await getIpData(ip);
        return data ?? { ip, riskScore: 0, flags: [], blocked: true };
      }),
    );

    res.status(200).json({ count: details.length, ips: details });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve blocked IPs' });
  }
});

// get top attackers sorted by risk score //
router.get(
  '/top-attackers',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const blockedIps = await getBlockedIps();

      const attackers = await Promise.all(
        blockedIps.map((ip) => getIpData(ip)),
      );

      const sorted = attackers
        .filter((data) => data !== null)
        .sort((a, b) => (b?.riskScore ?? 0) - (a?.riskScore ?? 0))
        .slice(0, 20);

      res.status(200).json({ count: sorted.length, attackers: sorted });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve top attackers' });
    }
  },
);

// get logs for a specific ip //
router.get('/logs/:ip', async (req: Request, res: Response): Promise<void> => {
  try {
    const ip = String(req.params.ip);
    const limit = Number(req.query.limit) || 20;
    const logs = await getIpLogs(ip, limit);

    res.status(200).json({ ip, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// get risk data for a specific ip //
router.get('/ip/:ip', async (req: Request, res: Response): Promise<void> => {
  try {
    const ip = String(req.params.ip);
    const data = await getIpData(ip);

    if (!data) {
      res.status(404).json({ error: 'IP not found' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve IP data' });
  }
});

// manually unblock a specific ip //
router.delete(
  '/blocked/:ip',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = String(req.params.ip);
      await unblockIp(ip);

      res.status(200).json({ message: `IP ${ip} has been unblocked` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to unblock IP' });
    }
  },
);

export { router as statsRouter };
