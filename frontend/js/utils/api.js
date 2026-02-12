/**
 * API service layer for centralized API calls and error handling
 */
import { logger } from './logger.js';

const API_BASE_URL = '/api';

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Make an API request with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    try {
        logger.debug(`API Request: ${options.method || 'GET'} ${url}`);

        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorData = null;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: response.statusText };
            }

            throw new APIError(
                errorData.detail || `HTTP error! status: ${response.status}`,
                response.status,
                errorData
            );
        }

        const data = await response.json();
        logger.debug(`API Response: ${url}`, data);
        return data;
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }

        logger.error(`API Request failed: ${url}`, error);
        throw new APIError(
            error.message || 'Network error occurred',
            0,
            { originalError: error }
        );
    }
}

/**
 * API service methods
 */
export const api = {
    /**
     * Get scene data
     * @returns {Promise<Object>} Scene data
     */
    async getSceneData() {
        return apiRequest('/scene-data');
    },

    /**
     * Health check
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        return apiRequest('/health');
    },
};
