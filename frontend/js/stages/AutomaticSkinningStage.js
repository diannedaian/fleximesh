import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';

/**
 * AutomaticSkinningStage - Loading stage between joint definition and regenerate model.
 */
export class AutomaticSkinningStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.transitionTimeout = null;
    }

    /**
     * Render automatic skinning loading stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Automatic Skinning</h1>
            <p class="subtitle">Binding the mesh to your defined joints...</p>
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
        this.startAutomaticSkinning();

        return this.element;
    }

    /**
     * Simulate automatic skinning and continue to regenerate-model stage.
     */
    startAutomaticSkinning() {
        this.transitionTimeout = setTimeout(() => {
            appState.setStage('define-rotation');
        }, 1800);
    }

    /**
     * Add slide animation for progress bar.
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

    /**
     * Cleanup timer on stage exit.
     */
    destroy() {
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        super.destroy();
    }
}
