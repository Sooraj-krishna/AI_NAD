"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static formatTimestamp() {
        return new Date().toISOString();
    }
    static info(message, data) {
        console.log(`[${this.formatTimestamp()}] [INFO] ${message}`, data || '');
    }
    static error(message, error) {
        console.error(`[${this.formatTimestamp()}] [ERROR] ${message}`, error || '');
    }
    static warn(message, data) {
        console.warn(`[${this.formatTimestamp()}] [WARN] ${message}`, data || '');
    }
    static debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${this.formatTimestamp()}] [DEBUG] ${message}`, data || '');
        }
    }
    static pipelineStep(step, data) {
        this.info(`[PIPELINE] ${step}`, data);
    }
}
exports.Logger = Logger;
