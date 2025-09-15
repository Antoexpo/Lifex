// Global configuration for LLX Points mock logic
export const LLX = {
  SYMBOL: 'LLX',
  EUR_RATE: 1, // 1 LLX = 1 €
  ACTIVITY_TIERS: {
    BASE:   { name: 'Base',   minBalance:   0, maxBalance: 499 },
    ACCESS: { name: 'Access', minBalance: 500, maxBalance: 999 },
    ROYAL:  { name: 'Royal',  minBalance: 1000, maxBalance: Infinity }
  },
  FEES: {
    DEPOSIT_PCT:  { BASE: 0.10, ACCESS: 0.08, ROYAL: 0.01 },
    TRANSFER_PCT: { BASE: 0.02, ACCESS: 0.01, ROYAL: 0.00 },
    CASHOUT_PCT: [
      { max: 499, pct: 0.05 },
      { min: 500, max: 999, pct: 0.02 },
      { min: 1000, pct: 0.00 }
    ],
    POSITIVE_BALANCE_REWARD: {
      enabled: true,
      streakDays: 30
    }
  }
};
