import pino from "pino";

const levels = {
  fatal: 500,
  error: 400,
  warning: 300,
  info: 200,
  debug: 100,
};

const pinoConfig = {
  // level: process.env.LOG_LEVEL || 'info',
  level: "info",
  customLevels: levels,
  messageKey: "message",
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return {
        level_name: label.toUpperCase(),
        level: levels[label],
      };
    },
    bindings: () => {
      return {};
    },
    log: (obj) => {
      return {
        context: { ...obj },
        message: obj.msg,
        level: obj.level,
        time: obj.time,
      };
    },
  },
  hooks: {
    logMethod(inputArgs, method) {
      if (inputArgs.length >= 2) {
        const arg1 = inputArgs.shift();
        const arg2 = inputArgs.shift();
        return method.apply(this, [arg2, arg1, ...inputArgs]);
      }
      return method.apply(this, inputArgs);
    },
  },
};
const logger = pino(pinoConfig);
export const log = (msg) => logger.info(msg);
export default logger;
