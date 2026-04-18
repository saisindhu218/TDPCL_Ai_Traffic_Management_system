const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const minimumLevel = levels[configuredLevel] || levels.info;

function shouldLog(level) {
  return levels[level] >= minimumLevel;
}

function write(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    service: 'smart-traffic-backend',
    ...meta,
  };

  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
