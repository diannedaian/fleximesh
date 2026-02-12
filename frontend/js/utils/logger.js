/**
 * Logger utility for consistent logging across the application
 */
class Logger {
    constructor(prefix = 'App') {
        this.prefix = prefix;
        this.enabled = true; // Can be controlled via config
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
        if (this.enabled && process?.env?.NODE_ENV === 'development') {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }
}

export const logger = new Logger('FlexiMesh');
