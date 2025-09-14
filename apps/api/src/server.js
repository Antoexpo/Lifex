import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import subRouter from './routes/subscriptions.js';
import walletRouter from './routes/wallet.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.use('/auth', authRouter);
app.use('/', userRouter);
app.use('/subscriptions', subRouter);
app.use('/wallet', walletRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on ${port}`));
