import { ThreeScene } from './ThreeScene.js';
import { StageManager } from './StageManager.js';
import { appState } from './state.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { PromptInputStage } from './stages/PromptInputStage.js';
import { GeneratingStage } from './stages/GeneratingStage.js';
import { DefineBoneJointsStage } from './stages/DefineBoneJointsStage.js';
import { AutomaticSkinningStage } from './stages/AutomaticSkinningStage.js';
import { DefineRotationStage } from './stages/DefineRotation.js';
import { RegenerateModelStage } from './stages/RegenerateModel.js';
import { RegeneratingModelStage } from './stages/RegeneratingModelStage.js';

/**
 * Main application entry point
 */
class App {
    constructor() {
        this.threeScene = null;
        this.stageManager = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            logger.info('Initializing application...');

            // Initialize StageManager (using stage-container like demo)
            this.stageManager = new StageManager('stage-container');
            logger.info('StageManager initialized');

            // Initialize ThreeScene
            this.threeScene = new ThreeScene('three-container');
            logger.info('ThreeScene initialized');

            // Connect ThreeScene to StageManager for BaseStage instances
            this.stageManager.setThreeScene(this.threeScene);

            // Register stages
            this.stageManager.registerStage('prompt-input', PromptInputStage);
            this.stageManager.registerStage('generating', GeneratingStage);
            this.stageManager.registerStage('define-bone-joints', DefineBoneJointsStage);
            this.stageManager.registerStage('automatic-skinning', AutomaticSkinningStage);
            this.stageManager.registerStage('define-rotation', DefineRotationStage);
            this.stageManager.registerStage('regenerate-model', RegenerateModelStage);
            this.stageManager.registerStage('regenerating-model', RegeneratingModelStage);

            // Don't fetch scene data initially - start with empty scene
            // await this.threeScene.fetchSceneData();

            // Small delay to ensure Three.js container is properly sized before rendering
            await new Promise(resolve => setTimeout(resolve, 50));

            // Force resize to ensure proper dimensions
            if (this.threeScene.handleResize) {
                this.threeScene.handleResize();
            }

            // Transition to prompt input stage after initialization
            appState.setStage('prompt-input');

            logger.info('Application initialized successfully');
        } catch (error) {
            logger.error('Error initializing application:', error);
            appState.setStage('error');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}
