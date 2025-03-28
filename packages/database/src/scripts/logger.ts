// Custom minimal logger implementation for migrations
export const logger = {
  fatal: (error: unknown, message: string) => {
    console.error(message, error);
  },
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};
