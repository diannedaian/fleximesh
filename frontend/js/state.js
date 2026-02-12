/**
 * Application state management
 * Centralized state for the FlexiMesh application
 */

class AppState {
    constructor() {
        this.currentStage = 'loading'; // loading, prompt-input, generating, etc.
        this.sceneData = null;
        this.loadedModels = new Map();
        this.apiObjects = new Map();
        this.listeners = new Map();
        this.prompt = null; // Store user prompt
    }

    /**
     * Get the current stage
     * @returns {string} Current stage name
     */
    getCurrentStage() {
        return this.currentStage;
    }

    /**
     * Set the current stage and notify listeners
     * @param {string} stage - Stage name to transition to
     */
    setStage(stage) {
        if (this.currentStage !== stage) {
            const previousStage = this.currentStage;
            this.currentStage = stage;
            this.notifyListeners('stageChange', { previous: previousStage, current: stage });
        }
    }

    /**
     * Get scene data
     * @returns {Object|null} Scene data from API
     */
    getSceneData() {
        return this.sceneData;
    }

    /**
     * Set scene data
     * @param {Object} data - Scene data object
     */
    setSceneData(data) {
        this.sceneData = data;
        this.notifyListeners('sceneDataUpdate', data);
    }

    /**
     * Subscribe to state changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    unsubscribe(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners of an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in listener for ${event}:`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const appState = new AppState();
