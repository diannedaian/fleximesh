import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';

/**
 * PromptInputStage - Redesigned first stage for entering 3D model prompt.
 * Features a clean, modern UI with improved accessibility and feedback.
 */
export class PromptInputStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.textarea = null;
        this.promptValue = appState.prompt || '';
    }

    /**
     * Render the prompt input stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        // Create stage-view wrapper (matches demo structure)
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        // Header Section
        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Generate 3D Model</h1>
            <p class="subtitle">Enter text prompt that describes the 3D model you want</p>
        `;
        this.element.appendChild(header);

        // Content Area
        const contentContainer = document.createElement('div');
        contentContainer.className = 'prompt-container';

        // Input Wrapper for styling focus states
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'textarea-wrapper';
        inputWrapper.id = 'input-wrapper';

        // Textarea
        this.textarea = document.createElement('textarea');
        this.textarea.id = 'prompt-input-textarea';
        this.textarea.className = 'prompt-input-textarea';
        this.textarea.placeholder = 'e.g., "A bending straw..."';
        this.textarea.value = this.promptValue;
        this.textarea.spellcheck = false;

        inputWrapper.appendChild(this.textarea);
        contentContainer.appendChild(inputWrapper);

        // Character Count / Status
        const statusRow = document.createElement('div');
        statusRow.className = 'input-status-row';
        statusRow.innerHTML = `<span class="hint">Tip: Use descriptive adjectives for better results.</span>`;
        contentContainer.appendChild(statusRow);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'prompt-actions';

        const generateButton = document.createElement('button');
        generateButton.id = 'generate-btn';
        generateButton.className = 'btn-primary';
        generateButton.innerHTML = `
            <span>Confirm and Generate</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
        generateButton.addEventListener('click', () => this.handleGenerate());

        actions.appendChild(generateButton);
        contentContainer.appendChild(actions);

        this.element.appendChild(contentContainer);

        // Footer / Help
        const footer = document.createElement('footer');
        footer.className = 'prompt-footer';
        footer.innerHTML = `
            <div class="shortcut-hint">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
            </div>
        `;
        this.element.appendChild(footer);

        this.bindPromptEvents();

        // Auto-focus the textarea
        setTimeout(() => this.textarea.focus(), 100);

        return this.element;
    }

    /**
     * Bind prompt-specific events
     */
    bindPromptEvents() {
        if (this.textarea) {
            this.registerEventHandler(this.textarea, 'input', (e) => {
                this.promptValue = e.target.value;
                // Optional: Dynamic resizing or character counting
            });

            this.registerEventHandler(this.textarea, 'keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.handleGenerate();
                }
            });
        }
    }

    /**
     * Handle Generate button click
     */
    handleGenerate() {
        const prompt = this.getPrompt().trim();

        if (!prompt) {
            this.showError('Please describe the model you want to create.');
            return;
        }

        // Store prompt in global state
        appState.prompt = prompt;

        // Transition to next phase
        appState.setStage('generating');

        console.log('Prompt confirmed:', prompt);
    }

    /**
     * Custom error feedback instead of basic alert
     */
    showError(message) {
        const wrapper = this.element.querySelector('#input-wrapper');
        if (wrapper) {
            wrapper.classList.add('shake-error');
            this.textarea.placeholder = message || "Please describe something first!";

            setTimeout(() => {
                wrapper.classList.remove('shake-error');
            }, 500);
        }
    }

    getPrompt() {
        return this.textarea ? this.textarea.value : this.promptValue;
    }

    destroy() {
        this.textarea = null;
        super.destroy();
    }
}
