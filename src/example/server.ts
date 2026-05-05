import 'dotenv/config';
import express from 'express';
import { hodorGuard } from '../middleware/hodorGuard';
import { statsRouter } from '../router/statsRouter';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// apply hodorGuard middleware globally //
app.use(
  hodorGuard({
    rateLimit: true,
    honeypot: true,
    autoBlock: true,
    rateLimitMax: 10,
    rateLimitWindowMs: 10000,
    riskScoreThreshold: 50,
    blockTtlSeconds: 60,
    logRequests: true,
  }),
);

// mount internal monitoring endpoints //
app.use('/hodor', statsRouter);

// public routes //
app.get('/', (_req, res) => {
  res.json({
    message: 'HodorGuard example server is running',
    endpoints: {
      public: ['GET /', 'GET /api/hello', 'GET /api/data'],
      monitoring: [
        'GET /hodor/stats',
        'GET /hodor/blocked',
        'GET /hodor/top-attackers',
        'GET /hodor/logs/:ip',
        'GET /hodor/ip/:ip',
        'DELETE /hodor/blocked/:ip',
      ],
    },
  });
});

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from a protected route!' });
});

app.get('/api/data', (_req, res) => {
  res.json({
    data: [
      { id: 1, value: 'item-one' },
      { id: 2, value: 'item-two' },
      { id: 3, value: 'item-three' },
    ],
  });
});

app.listen(PORT, () => {
  console.log(
    `[hodor-guard] Example server running on http://localhost:${PORT}`,
  );
  console.log(
    `[hodor-guard] Monitoring dashboard at http://localhost:${PORT}/hodor/stats`,
  );
});
