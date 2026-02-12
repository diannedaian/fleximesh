import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';
import { logger } from '../utils/logger.js';

/**
 * GeneratingStage - Stage shown while generating the 3D model
 * Displays loading spinner, progress bar, and cancel option
 */
export class GeneratingStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
    }

    /**
     * Render the generating stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        // Create stage-view wrapper (matches demo structure)
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        // Header Section (consistent with PromptInputStage)
        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Generating Model</h1>
            <p class="subtitle">Processing: "${appState.prompt || 'your prompt'}"</p>
        `;
        this.element.appendChild(header);

        // Content Area
        const contentContainer = document.createElement('div');
        contentContainer.className = 'generating-view';

        // Loader spinner
        const loader = document.createElement('span');
        loader.className = 'loader';
        contentContainer.appendChild(loader);

        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'generating-progress-container';
        progressContainer.style.cssText = 'width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden; margin-top: 2rem';

        const progressBar = document.createElement('div');
        progressBar.className = 'generating-progress-bar';
        progressBar.style.cssText = 'height: 100%; width: 40%; background: var(--accent-color); animation: slide 2s infinite ease-in-out';
        progressContainer.appendChild(progressBar);
        contentContainer.appendChild(progressContainer);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'prompt-actions';
        actions.style.marginTop = '3rem';

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.id = 'back-btn';
        cancelButton.className = 'btn-primary';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = 'background: transparent; border: 1px solid var(--border-color)';
        cancelButton.addEventListener('click', () => this.handleCancel());
        actions.appendChild(cancelButton);

        contentContainer.appendChild(actions);
        this.element.appendChild(contentContainer);

        // Add slide animation style
        this.addSlideAnimation();

        // Bind events
        super.bindEvents();

        // Start the generation process: load model after 5 seconds
        this.startGeneration();

        return this.element;
    }

    /**
     * Start the generation process
     *
     * NOTE: This is currently a DUMMY/PLACEHOLDER implementation for testing.
     *
     * Current behavior:
     * - Waits 5 seconds (simulating generation time)
     * - Loads a dummy model from /assets/demoforfaraz.glb
     * - Transitions to define-bone-joints stage
     *
     * TODO: Replace with actual implementation:
     * - Call backend API to generate model from prompt
     * - Poll/wait for generation to complete
     * - Receive generated model URL/path from API
     * - Load the actual generated model (not dummy)
     * - Handle generation errors/timeouts properly
     * - Show real progress updates from backend
     */
    async startGeneration() {
        try {
            // TODO: Replace this with actual API call to generate model
            // Example: const response = await api.generateModel(appState.prompt);
            // Then poll for status: await api.checkGenerationStatus(response.jobId);

            // DUMMY: Wait 5 seconds (simulating generation time)
            // In production, this will wait for actual model generation from backend
            await new Promise(resolve => setTimeout(resolve, 5000));

            // DUMMY: Load a placeholder model for testing
            // In production, this will load the model returned from the generation API
            if (this.threeScene) {
                try {
                    // TODO: Replace with actual generated model path from API
                    // const modelPath = generationResponse.modelUrl;
                    await this.threeScene.loadModel('/assets/demoforfaraz.glb');
                    logger.info('Dummy model loaded (placeholder - will be replaced with generated model)');

                    // Transition to define bone joints stage
                    appState.setStage('define-bone-joints');
                } catch (error) {
                    logger.error('Error loading model:', error);
                    // Still transition even if model fails to load
                    appState.setStage('define-bone-joints');
                }
            } else {
                // If threeScene not available, just transition
                appState.setStage('define-bone-joints');
            }
        } catch (error) {
            logger.error('Error in generation process:', error);
        }
    }

    /**
     * Add slide animation for progress bar
     */
    addSlideAnimation() {
        // Check if animation already exists
        if (document.getElementById('slide-animation-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'slide-animation-style';
        style.textContent = `
            @keyframes slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(250%); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle Cancel button click
     */
    handleCancel() {
        // Transition back to prompt input stage
        appState.setStage('prompt-input');
    }

    /**
     * Override destroy to clean up
     */
    destroy() {
        super.destroy();
    }
}
