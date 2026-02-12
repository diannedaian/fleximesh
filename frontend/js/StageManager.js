import { appState } from './state.js';
import { logger } from './utils/logger.js';

/**
 * StageManager class to handle UI transitions
 */
export class StageManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.currentStageElement = null;
        this.currentStageInstance = null;
        this.stages = new Map(); // Map of stage names to BaseStage classes or content

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the stage manager
     */
    init() {
        // Subscribe to stage changes
        appState.subscribe('stageChange', (data) => {
            this.transitionToStage(data.current, data.previous);
        });

        // Set initial stage
        this.transitionToStage(appState.getCurrentStage());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add any global event listeners here if needed
    }

    /**
     * Register a stage with its content or BaseStage class
     * @param {string} stageName - Name of the stage
     * @param {HTMLElement|string|Function} content - HTML element, HTML string, or BaseStage class
     */
    registerStage(stageName, content) {
        this.stages.set(stageName, content);
    }

    /**
     * Transition to a specific stage
     * @param {string} stageName - Name of the stage to transition to
     * @param {string} previousStage - Previous stage name (optional)
     */
    transitionToStage(stageName, previousStage = null) {
        // Clean up previous stage instance if it exists
        if (this.currentStageInstance && typeof this.currentStageInstance.destroy === 'function') {
            this.currentStageInstance.destroy();
            this.currentStageInstance = null;
        }

        // Remove current stage element
        if (this.currentStageElement) {
            this.currentStageElement.remove();
            this.currentStageElement = null;
        }

        // Get stage content/class
        let stageContent = this.stages.get(stageName);

        // If no registered content, create default
        if (!stageContent) {
            stageContent = this.createDefaultStage(stageName);
        }

        // Handle BaseStage class instances
        if (typeof stageContent === 'function' && stageContent.prototype && stageContent.prototype.render) {
            // It's a BaseStage class
            try {
                // Get threeScene from main app (would need to be passed or accessed)
                const threeScene = this.threeScene || null;
                this.currentStageInstance = new stageContent(this.container, threeScene, this);
                this.currentStageElement = this.currentStageInstance.render();
            } catch (error) {
                logger.error(`Error instantiating stage ${stageName}:`, error);
                stageContent = this.createDefaultStage(stageName);
            }
        }

        // Create stage element if not already created by BaseStage
        if (!this.currentStageElement) {
            if (typeof stageContent === 'string') {
                this.currentStageElement = document.createElement('div');
                this.currentStageElement.className = `stage stage-${stageName}`;
                this.currentStageElement.innerHTML = stageContent;
            } else if (stageContent instanceof HTMLElement) {
                this.currentStageElement = stageContent;
                this.currentStageElement.className = `stage stage-${stageName}`;
            } else {
                this.currentStageElement = document.createElement('div');
                this.currentStageElement.className = `stage stage-${stageName}`;
            }
        }

        // Add to container
        this.container.appendChild(this.currentStageElement);

        // Trigger stage-specific initialization
        this.onStageEnter(stageName, previousStage);
    }

    /**
     * Set ThreeScene reference for BaseStage instances
     * @param {ThreeScene} threeScene - ThreeScene instance
     */
    setThreeScene(threeScene) {
        this.threeScene = threeScene;
    }

    /**
     * Create default stage content
     * @param {string} stageName - Name of the stage
     * @returns {HTMLElement} Default stage element
     */
    createDefaultStage(stageName) {
        const element = document.createElement('div');
        element.className = `stage-content stage-${stageName}`;

        switch (stageName) {
            case 'loading':
                element.innerHTML = '<div class="loading-message">Loading...</div>';
                break;
            case 'generating':
                element.innerHTML = '<div class="stage-content">Generating model...</div>';
                break;
            default:
                element.innerHTML = `<div class="stage-content">Stage: ${stageName}</div>`;
        }

        return element;
    }

    /**
     * Called when entering a stage
     * @param {string} stageName - Current stage name
     * @param {string} previousStage - Previous stage name
     */
    onStageEnter(stageName, previousStage) {
        logger.info(`Entering stage: ${stageName}${previousStage ? ` (from ${previousStage})` : ''}`);

        // Add stage-specific logic here
        switch (stageName) {
            case 'loading':
                // Loading stage logic
                break;
            case 'main':
                // Main stage logic
                break;
        }
    }

    /**
     * Get current stage element
     * @returns {HTMLElement|null} Current stage element
     */
    getCurrentStageElement() {
        return this.currentStageElement;
    }
}
