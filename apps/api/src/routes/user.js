import express from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { subscription: true, wallet: true }
  });
  res.json({ id: user.id, email: user.email, referralCode: user.referralCode, subscription: user.subscription?.status, wallet: user.wallet?.balance || 0 });
});

export default router;
