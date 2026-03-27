export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, data?: any): void {
    console.log(`[${this.formatTimestamp()}] [INFO] ${message}`, data || '');
  }

  static error(message: string, error?: any): void {
    console.error(`[${this.formatTimestamp()}] [ERROR] ${message}`, error || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`[${this.formatTimestamp()}] [WARN] ${message}`, data || '');
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.formatTimestamp()}] [DEBUG] ${message}`, data || '');
    }
  }

  static pipelineStep(step: string, data?: any): void {
    this.info(`[PIPELINE] ${step}`, data);
  }
}


