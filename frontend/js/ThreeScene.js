import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

        // GLTFLoader
        this.loader = new GLTFLoader();

        // Grid Helper - Configured for dark Blender-style appearance
        const gridSize = 40;
        const divisions = 40;
        const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x4d4d4d, 0x4d4d4d);
        this.scene.add(gridHelper);

        // Custom Axis Lines (Infinite style like Blender)
        // X-Axis (Red)
        const xPoints = [
            new THREE.Vector3(-gridSize/2, 0.001, 0),
            new THREE.Vector3(gridSize/2, 0.001, 0)
        ];
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff3b3b, linewidth: 2 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        this.scene.add(xAxis);

        // Z-Axis (Green) - In Three.js GridHelper context (XZ plane), the green line is the Z axis
        const zPoints = [
            new THREE.Vector3(0, 0.001, -gridSize/2),
            new THREE.Vector3(0, 0.001, gridSize/2)
        ];
        const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x3bff3b, linewidth: 2 });
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

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Load a GLTF/GLB model and add it to the scene
     * @param {string} path - Path to the model file
     * @returns {Promise<THREE.Group>} - The loaded model group
     */
    async loadModel(path) {
        try {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    path,
                    (gltf) => {
                        // Model loaded successfully
                        const model = gltf.scene;
                        this.scene.add(model);
                        appState.loadedModels.set(path, model);
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
            console.error(`Error in loadModel for ${path}:`, error);
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
