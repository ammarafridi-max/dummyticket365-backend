const IORedis = require('ioredis');

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

module.exports = redis;
