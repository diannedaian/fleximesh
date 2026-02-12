import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { appState } from './state.js';
import { api } from './utils/api.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

/**
 * ThreeScene class to manage the 3D canvas and scene
 */
export class ThreeScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.loader = null;
        this.animationId = null;
        this.cube = null;
        this.controls = null;
        this.currentModel = null;
        this.transformControls = null;
        this.selectedObject = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        this.exporter = null;
        this.downloadButton = null;
        this.skeletonHelpers = [];
        this.boneVisualizations = []; // Store custom bone visualizations
        this.renderMode = 'normal'; // 'normal' or 'skeleton'
        this.boneVisualizationType = 'octahedral'; // 'lines', 'octahedral', 'spheres'
        this.originalMaterials = new Map(); // Store original materials for restoration
        this.normalModeButton = null;
        this.riggingModeButton = null;

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the Three.js scene
     */
    init() {
        // Scene setup - darker background like Blender
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x3d3d3d); // Darker charcoal background

        // Get container dimensions - ensure we wait for container to be properly sized
        // The three-container is positioned fixed on the right, taking 60% width
        let width = this.container.clientWidth;
        let height = this.container.clientHeight;

        // If container not ready yet, use calculated dimensions
        if (width === 0 || height === 0) {
            width = Math.floor(window.innerWidth * 0.6); // 60% for three-container
            height = window.innerHeight;
        }

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(10, 8, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls for modeling app behavior
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;

        // TransformControls (gumball) for model manipulation
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSize(0.8);
        // Set axis colors: Red (X), Green (Y), Blue (Z)
        this.transformControls.setSpace('local');
        this.scene.add(this.transformControls);

        // Setup TransformControls event listeners
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // Disable OrbitControls when dragging transform controls
            this.controls.enabled = !event.value;
        });

        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();

        // GLTFLoader
        this.loader = new GLTFLoader();

        // GLTFExporter for downloading models
        this.exporter = new GLTFExporter();

        // Create download button
        this.createDownloadButton();

        // Create render mode buttons (normal and rigging)
        this.createRenderModeButtons();

        // Grid Helper - Configured for dark Blender-style appearance
        const gridSize = 40;
        const divisions = 40;
        const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x4d4d4d, 0x4d4d4d);
        this.scene.add(gridHelper);

        // Custom Axis Lines (Infinite style like Blender)
        // Standard Three.js convention: X=Red, Y=Green (up/down), Z=Blue
        // X-Axis (Red) - Horizontal, left/right
        const xPoints = [
            new THREE.Vector3(-gridSize/2, 0.001, 0),
            new THREE.Vector3(gridSize/2, 0.001, 0)
        ];
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }); // Red
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        this.scene.add(xAxis);

        // Y-Axis (Green) - Vertical, up/down
        const yPoints = [
            new THREE.Vector3(0, -gridSize/2, 0),
            new THREE.Vector3(0, gridSize/2, 0)
        ];
        const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }); // Green
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        this.scene.add(yAxis);

        // Z-Axis (Blue) - Horizontal, forward/back
        const zPoints = [
            new THREE.Vector3(0, 0.001, -gridSize/2),
            new THREE.Vector3(0, 0.001, gridSize/2)
        ];
        const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 }); // Blue
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        this.scene.add(zAxis);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Start animation loop
        this.animate();

        // Subscribe to scene data updates
        appState.subscribe('sceneDataUpdate', (data) => {
            this.updateSceneFromData(data);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Mouse click for object selection
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });

        // Keyboard shortcuts for transform mode switching
        window.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
    }

    /**
     * Handle mouse click for object selection
     * @param {MouseEvent} event - Mouse click event
     */
    handleClick(event) {
        if (!this.renderer || !this.camera || !this.scene) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update raycaster with camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Find intersected objects (only check the current model if it exists)
        const objectsToCheck = [];
        if (this.currentModel) {
            // If it's a model group, check all meshes within it
            if (this.currentModel.userData.isModelGroup) {
                this.currentModel.traverse((child) => {
                    if (child.isMesh) {
                        objectsToCheck.push(child);
                    }
                });
            } else {
                // Legacy support for non-grouped models
                if (this.currentModel.isMesh) {
                    objectsToCheck.push(this.currentModel);
                }
            }
        }

        const intersects = this.raycaster.intersectObjects(objectsToCheck, true);

        if (intersects.length > 0) {
            // Select the clicked object (use the model group if clicking on a child)
            const selectedMesh = intersects[0].object;
            let objectToSelect = this.currentModel;

            // If clicking on a child mesh within a model group, select the group
            if (this.currentModel && this.currentModel.userData.isModelGroup) {
                // Find if the selected mesh is within the model group
                let parent = selectedMesh.parent;
                while (parent && parent !== this.currentModel && parent !== this.scene) {
                    parent = parent.parent;
                }
                if (parent === this.currentModel) {
                    objectToSelect = this.currentModel; // Select the group
                }
            }

            this.selectObject(objectToSelect);
        } else {
            // Clicked on empty space, deselect
            this.deselectObject();
        }
    }

    /**
     * Select an object and attach transform controls
     * @param {THREE.Object3D} object - Object to select
     */
    selectObject(object) {
        if (!object || !this.transformControls) return;

        this.selectedObject = object;
        this.transformControls.attach(object);
        logger.info('Object selected');
    }

    /**
     * Deselect the current object
     */
    deselectObject() {
        if (this.transformControls) {
            this.transformControls.detach();
        }
        this.selectedObject = null;
        logger.info('Object deselected');
    }

    /**
     * Handle keyboard shortcuts for transform controls
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!this.transformControls || !this.selectedObject) return;

        // Only handle if not typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key.toLowerCase()) {
            case 'g':
                // Translate mode
                this.transformControls.setMode('translate');
                logger.debug('Transform mode: Translate');
                break;
            case 'r':
                // Rotate mode
                this.transformControls.setMode('rotate');
                logger.debug('Transform mode: Rotate');
                break;
            case 's':
                // Scale mode
                this.transformControls.setMode('scale');
                logger.debug('Transform mode: Scale');
                break;
            case 'x':
                // Constrain to X axis
                if (this.transformControls.showX) {
                    this.transformControls.showX = false;
                } else {
                    this.transformControls.showX = true;
                    this.transformControls.showY = false;
                    this.transformControls.showZ = false;
                }
                break;
            case 'y':
                // Constrain to Y axis
                if (this.transformControls.showY) {
                    this.transformControls.showY = false;
                } else {
                    this.transformControls.showX = false;
                    this.transformControls.showY = true;
                    this.transformControls.showZ = false;
                }
                break;
            case 'z':
                // Constrain to Z axis
                if (this.transformControls.showZ) {
                    this.transformControls.showZ = false;
                } else {
                    this.transformControls.showX = false;
                    this.transformControls.showY = false;
                    this.transformControls.showZ = true;
                }
                break;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.container && this.camera && this.renderer) {
            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Update controls (for damping)
        if (this.controls) {
            this.controls.update();
        }

        // Update skeleton helpers (they need to update their bone positions each frame)
        this.skeletonHelpers.forEach(helper => {
            if (helper.visible && helper.update) {
                helper.update();
            }
        });

        // Update custom bone visualizations
        if (this.renderMode === 'skeleton') {
            this.updateBoneVisualizations();
        }

        // TransformControls update automatically during render, no manual update needed

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Load a GLTF/GLB model and add it to the scene
     * Removes any existing model before loading the new one
     * @param {string} path - Path to the model file
     * @returns {Promise<THREE.Group>} - The loaded model group
     */
    async loadModel(path) {
        try {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    path,
                    (gltf) => {
                        // Remove existing model if any
                        if (this.currentModel) {
                            // Deselect before removing
                            this.deselectObject();
                            // Hide download button when model is removed
                            if (this.downloadButton) {
                                this.downloadButton.style.display = 'none';
                            }

                            // Hide render mode buttons when model is removed
                            if (this.renderModeButtonContainer) {
                                this.renderModeButtonContainer.style.display = 'none';
                            }

                            // Clean up skeleton helpers
                            this.skeletonHelpers.forEach(helper => {
                                this.scene.remove(helper);
                            });
                            this.skeletonHelpers = [];

                            // Clean up bone visualizations
                            this.boneVisualizations.forEach(viz => {
                                this.scene.remove(viz);
                            });
                            this.boneVisualizations = [];

                            this.originalMaterials.clear();
                            this.scene.remove(this.currentModel);
                            // Dispose of the old model's resources
                            this.currentModel.traverse((object) => {
                                if (object.geometry) object.geometry.dispose();
                                if (object.material) {
                                    if (Array.isArray(object.material)) {
                                        object.material.forEach(material => material.dispose());
                                    } else {
                                        object.material.dispose();
                                    }
                                }
                            });
                        }

                        // Model loaded successfully
                        const model = gltf.scene;

                        // Store original materials for skeleton mode
                        this.storeOriginalMaterials(model);

                        // Extract and store skeleton information
                        // Do this after model is added to group but before adding to scene
                        // This ensures skeleton helpers are created with correct parent context

                        // Make model selectable
                        model.userData.selectable = true;

                        // Wrap model in a group to keep transform controls at visual center
                        const modelGroup = new THREE.Group();
                        modelGroup.name = 'ModelGroup';
                        modelGroup.userData.selectable = true;
                        modelGroup.userData.isModelGroup = true;

                        // Calculate bounding box to center the model within the group
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());

                        // Move model so its center is at origin relative to the group
                        model.position.x = -center.x;
                        model.position.y = -center.y;
                        model.position.z = -center.z;

                        // Add model to group (group is at origin, model is centered within it)
                        modelGroup.add(model);

                        // Extract and store skeleton information AFTER model is in group
                        // This ensures skeleton helpers reference the correct mesh
                        this.extractSkeletons(model);

                        // Center and fit the model in the view (this adjusts camera, not model position)
                        this.centerModel(modelGroup);

                        this.scene.add(modelGroup);
                        this.currentModel = modelGroup;
                        appState.loadedModels.set(path, modelGroup);

                        // Show download button when model is loaded
                        if (this.downloadButton) {
                            this.downloadButton.style.display = 'flex';
                        }

                        // Show render mode buttons when model is loaded
                        if (this.renderModeButtonContainer) {
                            this.renderModeButtonContainer.style.display = 'flex';
                        }

                        // Auto-select the model group when loaded
                        this.selectObject(modelGroup);

                        logger.info(`Model loaded successfully: ${path}`);
                        resolve(model);
                    },
                    (progress) => {
                        // Loading progress
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        logger.debug(`Loading ${path}: ${percentComplete.toFixed(2)}%`);
                    },
                    (error) => {
                        // Error handling
                        logger.error(`Error loading model ${path}:`, error);
                        reject(error);
                    }
                );
            });
        } catch (error) {
            logger.error(`Error in loadModel for ${path}:`, error);
            throw error;
        }
    }

    /**
     * Update scene from API data
     * @param {Object} data - Scene data from API
     */
    updateSceneFromData(data) {
        if (!data || !data.objects || !Array.isArray(data.objects)) {
            return;
        }

        data.objects.forEach((obj) => {
            // Remove existing sphere if it exists
            if (appState.apiObjects.has(obj.id)) {
                this.scene.remove(appState.apiObjects.get(obj.id));
            }

            // Create a new sphere
            const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x0088ff,
                wireframe: false
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

            // Set position from API data
            sphere.position.set(obj.x, obj.y, obj.z);
            sphere.userData.id = obj.id;

            // Add to scene and store reference
            this.scene.add(sphere);
            appState.apiObjects.set(obj.id, sphere);

            logger.debug(`Rendered sphere for object ${obj.id} at (${obj.x}, ${obj.y}, ${obj.z})`);
        });
    }

    /**
     * Center and fit a model in the view
     * Note: Model should already be centered within its group (position at origin)
     * This function only adjusts the camera to fit the model
     * @param {THREE.Group} model - The model group (should be at origin)
     */
    centerModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        // Calculate the max dimension for fitting
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        // Add some padding (1.5x)
        cameraZ *= 1.5;

        // Adjust camera to fit model (keep similar angle to initial position)
        this.camera.position.set(cameraZ * 0.7, cameraZ * 0.7, cameraZ * 0.7);
        this.camera.lookAt(0, 0, 0);

        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }

        logger.debug(`Model centered. Size: ${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}`);
    }

    /**
     * Fetch scene data from API
     */
    async fetchSceneData() {
        try {
            const data = await api.getSceneData();
            logger.info('Scene data loaded successfully');
            appState.setSceneData(data);
        } catch (error) {
            logger.error('Error fetching scene data:', error);
            // Optionally notify state for error handling
            appState.notifyListeners('sceneDataError', error);
        }
    }

    /**
     * Create download button in the top right of the Three.js container
     */
    createDownloadButton() {
        this.downloadButton = document.createElement('button');
        this.downloadButton.id = 'download-model-btn';
        this.downloadButton.className = 'download-model-btn';
        this.downloadButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        `;
        this.downloadButton.title = 'Download model as GLB';
        this.downloadButton.addEventListener('click', () => this.downloadModel());

        // Initially hide the button (show when model is loaded)
        this.downloadButton.style.display = 'none';

        this.container.appendChild(this.downloadButton);
    }

    /**
     * Create render mode buttons (normal and rigging view)
     */
    createRenderModeButtons() {
        // Normal mode button (circle icon)
        this.normalModeButton = document.createElement('button');
        this.normalModeButton.id = 'normal-mode-btn';
        this.normalModeButton.className = 'render-mode-btn';
        this.normalModeButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
        `;
        this.normalModeButton.title = 'Normal display mode';
        this.normalModeButton.addEventListener('click', () => this.setNormalMode());
        this.normalModeButton.classList.add('active'); // Start with normal mode active

        // Rigging mode button (bone icon)
        this.riggingModeButton = document.createElement('button');
        this.riggingModeButton.id = 'rigging-mode-btn';
        this.riggingModeButton.className = 'render-mode-btn';
        this.riggingModeButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6z"></path>
                <path d="M6 8h12M6 16h12"></path>
            </svg>
        `;
        this.riggingModeButton.title = 'Rigging mode';
        this.riggingModeButton.addEventListener('click', () => this.setSkeletonMode());

        // Create container for both buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'render-mode-buttons';
        buttonContainer.style.display = 'none'; // Initially hidden
        buttonContainer.appendChild(this.normalModeButton);
        buttonContainer.appendChild(this.riggingModeButton);

        this.container.appendChild(buttonContainer);
        this.renderModeButtonContainer = buttonContainer;
    }

    /**
     * Store original materials from the model for restoration
     * @param {THREE.Object3D} model - The model to store materials from
     */
    storeOriginalMaterials(model) {
        this.originalMaterials.clear();
        model.traverse((object) => {
            if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                this.originalMaterials.set(object, materials.map(mat => mat.clone()));
            }
        });
    }

    /**
     * Extract skeleton information from the model
     * @param {THREE.Object3D} model - The model to extract skeletons from
     */
    extractSkeletons(model) {
        // Clear existing skeleton helpers and visualizations
        this.skeletonHelpers.forEach(helper => {
            this.scene.remove(helper);
        });
        this.skeletonHelpers = [];

        this.boneVisualizations.forEach(viz => {
            this.scene.remove(viz);
        });
        this.boneVisualizations = [];

        // Traverse the model to find skeletons
        model.traverse((object) => {
            if (object.isSkinnedMesh && object.skeleton) {
                try {
                    const skeleton = object.skeleton;
                    logger.info(`Found skeleton with ${skeleton.bones.length} bones`);

                    // Create custom bone visualization based on type
                    this.createBoneVisualization(skeleton.bones, object);

                    // Also create SkeletonHelper as fallback
                    const skeletonHelper = new THREE.SkeletonHelper(object);
                    skeletonHelper.material = new THREE.LineBasicMaterial({
                        color: 0x00ff00,
                        linewidth: 2,
                        depthTest: true,
                        depthWrite: false
                    });
                    skeletonHelper.visible = false;
                    this.skeletonHelpers.push(skeletonHelper);
                    this.scene.add(skeletonHelper);
                } catch (error) {
                    logger.error('Error creating skeleton visualization:', error);
                }
            }
        });

        // Also check for bones in the model group (some models have bones as separate objects)
        if (this.boneVisualizations.length === 0) {
            logger.debug('No SkinnedMesh found, checking for bone objects...');
            const bones = [];
            model.traverse((object) => {
                if (object.type === 'Bone' || object.isBone) {
                    bones.push(object);
                }
            });
            if (bones.length > 0) {
                logger.info(`Found ${bones.length} bone objects, creating visualization`);
                this.createBoneVisualization(bones, model);
            }
        }

        if (this.boneVisualizations.length === 0 && this.skeletonHelpers.length === 0) {
            logger.warn('No skeletons found in the model');
        }
    }

    /**
     * Create bone visualization based on the selected type
     * @param {Array} bones - Array of bone objects
     * @param {THREE.Object3D} parent - Parent object to get world transforms
     */
    createBoneVisualization(bones, parent) {
        const boneGroup = new THREE.Group();
        boneGroup.name = 'BoneVisualization';
        boneGroup.visible = false; // Hidden by default

        bones.forEach((bone) => {
            if (!bone.parent || !(bone.parent.type === 'Bone' || bone.parent.isBone)) {
                return; // Skip root bone or bones without bone parent
            }

            const parentBone = bone.parent;

            // Get bone positions in world space
            const boneWorldPos = new THREE.Vector3();
            const parentWorldPos = new THREE.Vector3();

            // Update bone matrices first
            bone.updateMatrixWorld(true);
            parentBone.updateMatrixWorld(true);

            bone.getWorldPosition(boneWorldPos);
            parentBone.getWorldPosition(parentWorldPos);

            // Calculate bone direction and length
            const direction = new THREE.Vector3().subVectors(boneWorldPos, parentWorldPos);
            const length = direction.length();

            if (length < 0.001) return; // Skip very short bones

            direction.normalize();

            if (this.boneVisualizationType === 'octahedral') {
                // Create octahedral bone visualization at joint
                const octahedronSize = Math.max(length * 0.15, 0.05); // At least 0.05 units
                const octahedron = new THREE.OctahedronGeometry(octahedronSize, 0);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false
                });
                const mesh = new THREE.Mesh(octahedron, material);

                // Position at bone joint (midpoint between parent and child)
                const midpoint = new THREE.Vector3().addVectors(parentWorldPos, boneWorldPos).multiplyScalar(0.5);
                mesh.position.copy(midpoint);

                // Orient octahedron along bone direction
                if (direction.y !== 1 && direction.y !== -1) {
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        direction
                    );
                    mesh.quaternion.copy(quaternion);
                }

                boneGroup.add(mesh);

                // Add a line connecting parent to child
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    parentWorldPos,
                    boneWorldPos
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ff00,
                    linewidth: 2,
                    depthWrite: false
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                boneGroup.add(line);

            } else if (this.boneVisualizationType === 'spheres') {
                // Create sphere at bone joint
                const sphereSize = Math.max(length * 0.2, 0.05);
                const sphere = new THREE.SphereGeometry(sphereSize, 8, 8);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false
                });
                const mesh = new THREE.Mesh(sphere, material);
                const midpoint = new THREE.Vector3().addVectors(parentWorldPos, boneWorldPos).multiplyScalar(0.5);
                mesh.position.copy(midpoint);
                boneGroup.add(mesh);

                // Add connecting line
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    parentWorldPos,
                    boneWorldPos
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ff00,
                    linewidth: 2,
                    depthWrite: false
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                boneGroup.add(line);

            } else {
                // Default: lines only (thicker for visibility)
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    parentWorldPos,
                    boneWorldPos
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ff00,
                    linewidth: 4,
                    depthWrite: false
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                boneGroup.add(line);
            }
        });

        if (boneGroup.children.length > 0) {
            this.boneVisualizations.push(boneGroup);
            this.scene.add(boneGroup);
            logger.info(`Created ${boneGroup.children.length} bone visualization elements`);
        }
    }


    /**
     * Set skeleton render mode: grey model with visible bones
     */
    setSkeletonMode() {
        if (!this.currentModel || this.renderMode === 'skeleton') return;

        this.renderMode = 'skeleton';

        // Make model grey
        this.currentModel.traverse((object) => {
            if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((material) => {
                    // Create grey material
                    material.color.setHex(0xcccccc); // Light grey
                    material.emissive.setHex(0x000000);
                    material.opacity = 0.9;
                    material.transparent = true;
                });
            }
        });

        // Show skeleton helpers
        this.skeletonHelpers.forEach(helper => {
            helper.visible = true;
        });

        // Show custom bone visualizations
        this.boneVisualizations.forEach(viz => {
            viz.visible = true;
        });

        // Update button states
        if (this.normalModeButton) {
            this.normalModeButton.classList.remove('active');
        }
        if (this.riggingModeButton) {
            this.riggingModeButton.classList.add('active');
        }

        logger.info('Switched to skeleton mode');
    }

    /**
     * Set normal render mode: colored model with hidden bones
     */
    setNormalMode() {
        if (!this.currentModel || this.renderMode === 'normal') return;

        this.renderMode = 'normal';

        // Restore original materials
        this.currentModel.traverse((object) => {
            if (object.isMesh && this.originalMaterials.has(object)) {
                const originalMats = this.originalMaterials.get(object);
                if (Array.isArray(object.material)) {
                    object.material = originalMats.map(mat => mat.clone());
                } else {
                    object.material = originalMats[0].clone();
                }
            }
        });

        // Hide skeleton helpers
        this.skeletonHelpers.forEach(helper => {
            helper.visible = false;
        });

        // Hide custom bone visualizations
        this.boneVisualizations.forEach(viz => {
            viz.visible = false;
        });

        // Update button states
        if (this.normalModeButton) {
            this.normalModeButton.classList.add('active');
        }
        if (this.riggingModeButton) {
            this.riggingModeButton.classList.remove('active');
        }

        logger.info('Switched to normal mode');
    }

    /**
     * Update bone visualizations to track bone positions
     */
    updateBoneVisualizations() {
        // Bone visualizations are static geometry created in world space
        // They should stay aligned with bones. If bones are animated,
        // we'd need to recreate them each frame or use a different approach
        // For static models, this is sufficient
    }

    /**
     * Download the current model as GLB file
     */
    async downloadModel() {
        if (!this.currentModel) {
            logger.warn('No model to download');
            return;
        }

        try {
            // Show loading state
            this.downloadButton.disabled = true;
            this.downloadButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            `;

            // Export the model group (includes all transformations)
            const gltf = await new Promise((resolve, reject) => {
                this.exporter.parse(
                    this.currentModel,
                    (result) => resolve(result),
                    (error) => reject(error),
                    {
                        binary: true, // Export as GLB (binary format)
                        includeCustomExtensions: false
                    }
                );
            });

            // Create blob and download
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `model_${new Date().getTime()}.glb`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            logger.info('Model downloaded successfully');
        } catch (error) {
            logger.error('Error downloading model:', error);
            alert('Failed to export model. Please try again.');
        } finally {
            // Restore button state
            this.downloadButton.disabled = false;
            this.downloadButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            `;
        }
    }

    /**
     * Cleanup and dispose resources
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Dispose of Three.js resources
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
    }
}
