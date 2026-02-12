import { BaseStage } from './BaseStage.js';

/**
 * PromptStage - Stage for user input/prompts
 * Extends BaseStage to provide prompt functionality
 */
export class PromptStage extends BaseStage {
    /**
     * Constructor
     * @param {HTMLElement} container - Container element for the stage
     * @param {ThreeScene} threeScene - ThreeScene instance
     * @param {StageManager} manager - StageManager instance
     */
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.textarea = null;
        this.promptValue = '';
    }

    /**
     * Render the prompt stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        // Create main stage element
        this.element = document.createElement('div');
        this.element.className = 'stage-prompt';

        // Create prompt container
        const promptContainer = document.createElement('div');
        promptContainer.className = 'prompt-container';

        // Create label
        const label = document.createElement('label');
        label.className = 'prompt-label';
        label.textContent = 'Enter your prompt:';
        label.setAttribute('for', 'prompt-textarea');
        promptContainer.appendChild(label);

        // Create textarea
        this.textarea = document.createElement('textarea');
        this.textarea.id = 'prompt-textarea';
        this.textarea.className = 'prompt-textarea';
        this.textarea.placeholder = 'Type your prompt here...';
        this.textarea.rows = 6;
        this.textarea.value = this.promptValue;
        promptContainer.appendChild(this.textarea);

        // Create navigation
        const navigation = this.renderNavigation({
            prevLabel: 'Back',
            nextLabel: 'Continue',
            onPrev: () => this.handlePrevious(),
            onNext: () => this.handleNext(),
            showPrev: true,
            showNext: true
        });

        // Assemble stage
        this.element.appendChild(promptContainer);
        this.element.appendChild(navigation);

        // Bind events using parent class method
        super.bindEvents();

        // Add custom event bindings
        this.bindPromptEvents();

        return this.element;
    }

    /**
     * Bind prompt-specific events
     */
    bindPromptEvents() {
        if (this.textarea) {
            // Update prompt value on input
            this.registerEventHandler(this.textarea, 'input', (e) => {
                this.promptValue = e.target.value;
            });

            // Handle Enter key (Ctrl/Cmd + Enter to submit)
            this.registerEventHandler(this.textarea, 'keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.handleNext();
                }
            });
        }
    }

    /**
     * Handle previous button click
     */
    handlePrevious() {
        console.log('Previous button clicked');
        // Override in subclass or handle via manager
        if (this.manager) {
            // Example: go back to previous stage
            // this.manager.transitionToStage('previous-stage');
        }
    }

    /**
     * Handle next button click
     */
    handleNext() {
        const prompt = this.getPrompt();
        console.log('Next button clicked with prompt:', prompt);

        if (!prompt || prompt.trim() === '') {
            alert('Please enter a prompt before continuing.');
            return;
        }

        // Override in subclass or handle via manager
        // Example: proceed to next stage with prompt data
        // this.manager.transitionToStage('next-stage', { prompt });
    }

    /**
     * Get the current prompt value
     * @returns {string} The prompt text
     */
    getPrompt() {
        return this.textarea ? this.textarea.value : this.promptValue;
    }

    /**
     * Set the prompt value
     * @param {string} value - The prompt text to set
     */
    setPrompt(value) {
        this.promptValue = value;
        if (this.textarea) {
            this.textarea.value = value;
        }
    }

    /**
     * Override destroy to clean up prompt-specific resources
     */
    destroy() {
        this.textarea = null;
        this.promptValue = '';
        super.destroy();
    }
}
