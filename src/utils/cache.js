const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('connect', () => {
  console.log('🟢 Redis connected');
});

redis.on('error', (err) => {
  console.error('🔴 Redis error:', err);
});

const DEFAULT_TTL = 600; // 10 minutes

module.exports = {
  async get(key) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key, value, ttl = DEFAULT_TTL) {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  },

  async del(key) {
    await redis.del(key);
  },

  async keys(pattern = '*') {
    return redis.keys(pattern);
  },
};
