import express from 'express';
import { prisma } from '../prisma.js';
import { CONFIG } from '../config.js';
import argon2 from 'argon2';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const router = express.Router();

function generateReferral() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post('/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    referralCode: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, referralCode } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  let sponsorId = null;
  let path = '/';
  if (referralCode) {
    const sponsor = await prisma.user.findUnique({ where: { referralCode } });
    if (!sponsor) return res.status(400).json({ error: 'Invalid referral code' });
    sponsorId = sponsor.id;
    path = sponsor.path + sponsor.id + '/';
  }
  const hashed = await argon2.hash(password);
  const referral = generateReferral();
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      referralCode: referral,
      sponsorId,
      path,
      subscription: { create: { status: 'PENDING' } },
      wallet: { create: {} }
    }
  });
  res.json({ id: user.id, referralCode: user.referralCode });
});

router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, include: { subscription: true } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const valid = await argon2.verify(user.password, password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  const access = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '15m' });
  const refresh = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET || 'refreshsecret', { expiresIn: '7d' });
  res.json({ access, refresh, user: { id: user.id, email: user.email, subscription: user.subscription?.status } });
});

router.post('/refresh', async (req, res) => {
  const schema = z.object({ token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payload = jwt.verify(parsed.data.token, process.env.REFRESH_SECRET || 'refreshsecret');
    const access = jwt.sign({ id: payload.id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '15m' });
    res.json({ access });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
