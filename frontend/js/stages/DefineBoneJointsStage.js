import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';

/**
 * DefineBoneJointsStage - Stage for defining bone joints on the 3D model
 * User can click E to add connecting bones by selecting ball joints
 */
export class DefineBoneJointsStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
    }

    /**
     * Render the define bone joints stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        // Create stage-view wrapper (matches demo structure)
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        // Header Section (consistent with other stages)
        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Define Bone Joints</h1>
            <p class="subtitle">Instructions: Click E to add a connecting bone by selecting the ball joint.</p>
        `;
        this.element.appendChild(header);

        // Content Area
        const contentContainer = document.createElement('div');
        contentContainer.className = 'prompt-container';

        // Additional instructions or content can go here
        const instructionContent = document.createElement('div');
        instructionContent.className = 'instruction-content';
        instructionContent.innerHTML = `
            <p class="hint" style="margin-top: 1rem;">
                Use the <kbd>E</kbd> key to add bone connections. Select ball joints on the 3D model to create the skeleton structure.
            </p>
        `;
        contentContainer.appendChild(instructionContent);

        this.element.appendChild(contentContainer);

        // Footer (consistent with PromptInputStage)
        const footer = document.createElement('footer');
        footer.className = 'prompt-footer';
        footer.innerHTML = `
            <div class="shortcut-hint">
                Press <kbd>E</kbd> to add a bone joint
            </div>
        `;
        this.element.appendChild(footer);

        // Bind events
        super.bindEvents();
        this.bindKeyboardEvents();

        return this.element;
    }

    /**
     * Bind keyboard events for bone joint interaction
     */
    bindKeyboardEvents() {
        // Listen for E key press
        this.registerEventHandler(document, 'keydown', (e) => {
            if (e.key === 'e' || e.key === 'E') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this.handleAddBone();
                }
            }
        });
    }

    /**
     * Handle adding a bone joint
     */
    handleAddBone() {
        console.log('E key pressed - Add bone joint functionality');
        // TODO: Implement bone joint selection and connection logic
        // This will interact with the Three.js scene to select ball joints
    }

    /**
     * Override destroy to clean up
     */
    destroy() {
        super.destroy();
    }
}
