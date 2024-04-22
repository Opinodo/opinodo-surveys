// next-logger.config.js
const pino = require("pino");

const custom_levels = {
  debug: 100,
  info: 200,
  warn: 300,
  error: 400,
  fatal: 500,
};
const logger = (defaultConfig) =>
  pino({
    ...defaultConfig,
    messageKey: "message",
    formatters: {
      level: (label) => {
        return { level_name: label.toUpperCase(), level: custom_levels[label] };
      },
      bindings: (bindings) => {
        return {
          level: bindings.level,
        };
      },
    },
    customLevels: custom_levels,
    timestamp: () => `,"datetime":"${new Date(Date.now()).toISOString()}"`,
  });

module.exports = {
  logger,
};
