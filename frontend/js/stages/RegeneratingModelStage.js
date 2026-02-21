import { BaseStage } from './BaseStage.js';

/**
 * RegeneratingModelStage - Loading view after regenerate confirmation.
 */
export class RegeneratingModelStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
    }

    /**
     * Render the regenerating model loading stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Regenerating model...</h1>
            <p class="subtitle">Applying joint assignments and preparing your updated model.</p>
        `;
        this.element.appendChild(header);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'generating-view';

        const loader = document.createElement('span');
        loader.className = 'loader';
        contentContainer.appendChild(loader);

        const progressContainer = document.createElement('div');
        progressContainer.className = 'generating-progress-container';
        progressContainer.style.cssText = 'width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden; margin-top: 2rem';

        const progressBar = document.createElement('div');
        progressBar.className = 'generating-progress-bar';
        progressBar.style.cssText = 'height: 100%; width: 40%; background: var(--accent-color); animation: slide 2s infinite ease-in-out';
        progressContainer.appendChild(progressBar);
        contentContainer.appendChild(progressContainer);

        this.element.appendChild(contentContainer);
        this.addSlideAnimation();
        return this.element;
    }

    /**
     * Add slide animation for progress bar
     */
    addSlideAnimation() {
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
}
