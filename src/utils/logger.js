const { isDevelopment, nodeEnv } = require('./config');

const serializeError = (error) => {
  if (!error) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    stack: isDevelopment ? error.stack : undefined,
  };
};

const cleanMeta = (meta = {}) => {
  return Object.entries(meta).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    acc[key] = value instanceof Error ? serializeError(value) : value;
    return acc;
  }, {});
};

const writeLog = (level, message, meta) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    env: nodeEnv,
    message,
    ...cleanMeta(meta),
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

module.exports = {
  info(message, meta) {
    writeLog('info', message, meta);
  },
  warn(message, meta) {
    writeLog('warn', message, meta);
  },
  error(message, meta) {
    writeLog('error', message, meta);
  },
};
