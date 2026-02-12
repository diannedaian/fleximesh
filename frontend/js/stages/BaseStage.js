/**
 * BaseStage - Base class for all UI stages
 * Provides common functionality for stage management
 */
export class BaseStage {
    /**
     * Constructor
     * @param {HTMLElement} container - Container element for the stage
     * @param {ThreeScene} threeScene - ThreeScene instance
     * @param {StageManager} manager - StageManager instance
     */
    constructor(container, threeScene, manager) {
        this.container = container;
        this.threeScene = threeScene;
        this.manager = manager;
        this.element = null;
        this.eventHandlers = new Map();
    }

    /**
     * Render the stage content
     * Must be implemented by subclasses
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        throw new Error('render() method must be implemented by subclass');
    }

    /**
     * Render navigation UI
     * @param {Object} options - Navigation options
     * @param {string} options.prevLabel - Label for previous button
     * @param {string} options.nextLabel - Label for next button
     * @param {Function} options.onPrev - Callback for previous button
     * @param {Function} options.onNext - Callback for next button
     * @returns {HTMLElement} Navigation element
     */
    renderNavigation(options = {}) {
        const {
            prevLabel = 'Previous',
            nextLabel = 'Next',
            onPrev = null,
            onNext = null,
            showPrev = true,
            showNext = true
        } = options;

        const nav = document.createElement('div');
        nav.className = 'stage-navigation';

        if (showPrev && onPrev) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'nav-button nav-button-prev';
            prevBtn.textContent = prevLabel;
            prevBtn.addEventListener('click', onPrev);
            nav.appendChild(prevBtn);
        }

        if (showNext && onNext) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-button nav-button-next';
            nextBtn.textContent = nextLabel;
            nextBtn.addEventListener('click', onNext);
            nav.appendChild(nextBtn);
        }

        return nav;
    }

    /**
     * Bind event handlers
     * Can be overridden by subclasses to add custom event handling
     */
    bindEvents() {
        // Base implementation - can be extended by subclasses
        // Remove any existing event handlers
        this.unbindEvents();
    }

    /**
     * Unbind event handlers
     * Cleans up all registered event handlers
     */
    unbindEvents() {
        this.eventHandlers.forEach((handler, element) => {
            const [event, callback] = handler;
            element.removeEventListener(event, callback);
        });
        this.eventHandlers.clear();
    }

    /**
     * Register an event handler
     * @param {HTMLElement} element - Element to attach event to
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    registerEventHandler(element, event, callback) {
        element.addEventListener(event, callback);
        this.eventHandlers.set(element, [event, callback]);
    }

    /**
     * Destroy the stage and clean up resources
     */
    destroy() {
        // Unbind all event handlers
        this.unbindEvents();

        // Remove element from DOM if it exists
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // Clear references
        this.element = null;
        this.container = null;
        this.threeScene = null;
        this.manager = null;
    }
}
