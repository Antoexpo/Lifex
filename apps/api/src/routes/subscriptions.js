import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { calculateCommissions } from '../services/commission.js';
import { CONFIG } from '../config.js';

const router = express.Router();

router.post('/pay', authMiddleware, async (req, res) => {
  const price = CONFIG.membership.price;
  const now = new Date();
  const expire = new Date(now.getTime() + CONFIG.membership.billing_cycle_days * 86400000);
  await prisma.subscription.upsert({
    where: { userId: req.user.id },
    update: { status: 'ACTIVE', expireAt: expire },
    create: { userId: req.user.id, status: 'ACTIVE', expireAt: expire }
  });
  await calculateCommissions(prisma, req.user.id, price, CONFIG);
  res.json({ ok: true, expireAt: expire });
});

router.get('/status', authMiddleware, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
  res.json(sub);
});

export default router;
