import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: req.user.id },
    include: { transactions: true }
  });
  res.json(wallet);
});

export default router;
