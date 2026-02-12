/**
 * Logger utility for consistent logging across the application
 */
class Logger {
    constructor(prefix = 'App') {
        this.prefix = prefix;
        this.enabled = true;
        // Debug logging can be enabled/disabled
        // In browser environment, we check for a global flag or use a default
        this.debugEnabled = typeof window !== 'undefined' &&
            (window.DEBUG_MODE === true || window.location.hostname === 'localhost');
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${this.prefix}] [${level}] ${message}`;
    }

    info(message, ...args) {
        if (this.enabled) {
            console.log(this.formatMessage('INFO', message), ...args);
        }
    }

    warn(message, ...args) {
        if (this.enabled) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }

    error(message, ...args) {
        if (this.enabled) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }

    debug(message, ...args) {
        // Browser-safe debug logging (no Node.js process.env)
        if (this.enabled && this.debugEnabled) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }
}

export const logger = new Logger('FlexiMesh');
