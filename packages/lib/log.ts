type LogLevel = "error" | "warning" | "info";

export class Log {
  private static logger(message: string, context: object, level: LogLevel): void {
    const logMessage = `${message} ${JSON.stringify(context)}`;
    if (level === "error") {
      console.error(logMessage);
    } else if (level === "warning") {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  static error(message: string, context: object = {}): void {
    this.logger(message, context, "error");
  }

  static warning(message: string, context: object = {}): void {
    this.logger(message, context, "warning");
  }

  static info(message: string, context: object = {}): void {
    this.logger(message, context, "info");
  }
}
