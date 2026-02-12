import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';

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

        // Create generating view container
        const generatingView = document.createElement('div');
        generatingView.className = 'generating-view';

        // Loader spinner
        const loader = document.createElement('span');
        loader.className = 'loader';
        generatingView.appendChild(loader);

        // Heading
        const heading = document.createElement('h2');
        heading.textContent = 'Generating Model';
        heading.style.marginBottom = '0.5rem';
        generatingView.appendChild(heading);

        // Subtitle with prompt
        const subtitle = document.createElement('p');
        subtitle.className = 'subtitle';
        subtitle.textContent = `Processing: "${appState.prompt || 'your prompt'}"`;
        subtitle.style.marginBottom = '2rem';
        generatingView.appendChild(subtitle);

        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden';

        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'height: 100%; width: 40%; background: var(--accent-color); animation: slide 2s infinite ease-in-out';
        progressContainer.appendChild(progressBar);
        generatingView.appendChild(progressContainer);

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.id = 'back-btn';
        cancelButton.className = 'btn-primary';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = 'margin-top: 3rem; background: transparent; border: 1px solid var(--border-color)';
        cancelButton.addEventListener('click', () => this.handleCancel());
        generatingView.appendChild(cancelButton);

        this.element.appendChild(generatingView);

        // Add slide animation style
        this.addSlideAnimation();

        // Bind events
        super.bindEvents();

        return this.element;
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
