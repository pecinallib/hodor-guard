import { Request, Response, NextFunction, RequestHandler } from 'express';
import { runDetection } from '../engine/detectionEngine.js';
import { appendLog } from '../redis/redisService';
import { buildBlockedResponse } from '../modules/autoBlock';
import { buildHoneypotResponse, checkHoneypot } from '../modules/honeypot';
import { DEFAULT_CONFIG } from '../config/defaults';
import { HodorConfig } from '../types';

// merge user config with default values //
function resolveConfig(userConfig: HodorConfig): Required<HodorConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    honeypotRoutes: userConfig.honeypotRoutes ?? DEFAULT_CONFIG.honeypotRoutes,
  };
}

// main hodorGuard middleware factory //
export function hodorGuard(userConfig: HodorConfig = {}): RequestHandler {
  const config = resolveConfig(userConfig);

  return function (req: Request, res: Response, next: NextFunction): void {
    Promise.resolve()
      .then(async () => {
        // run full detection pipeline //
        const result = await runDetection(req, config);

        // log request if enabled //
        if (config.logRequests) {
          await appendLog(result.logEntry);
        }

        // block request if ip is flagged //
        if (result.blocked) {
          res
            .status(403)
            .json(
              buildBlockedResponse(
                result.ip,
                result.riskData,
                config.blockTtlSeconds,
              ),
            );
          return;
        }

        // respond with fake data if honeypot route is accessed //
        if (config.honeypot) {
          const honeypotResult = checkHoneypot(req, config.honeypotRoutes);
          if (honeypotResult.triggered) {
            res.status(200).json(buildHoneypotResponse());
            return;
          }
        }

        next();
      })
      .catch((err) => {
        // never block legitimate traffic due to internal errors //
        console.error('[hodor-guard] Middleware error:', err);
        next();
      });
  };
}
