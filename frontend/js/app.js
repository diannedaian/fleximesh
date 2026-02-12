import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75, // field of view
    window.innerWidth / window.innerHeight, // aspect ratio
    0.1, // near plane
    1000 // far plane
);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('container').appendChild(renderer.domElement);

// Create a rotating cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Store loaded models and API objects
const loadedModels = new Map();
const apiObjects = new Map();

// GLTFLoader utility
const loader = new GLTFLoader();

/**
 * Load a GLTF/GLB model and add it to the scene
 * @param {string} path - Path to the model file
 * @returns {Promise<THREE.Group>} - The loaded model group
 */
async function loadModel(path) {
    try {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    // Model loaded successfully
                    const model = gltf.scene;
                    scene.add(model);
                    console.log(`Model loaded successfully: ${path}`);
                    resolve(model);
                },
                (progress) => {
                    // Loading progress
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log(`Loading ${path}: ${percentComplete.toFixed(2)}%`);
                },
                (error) => {
                    // Error handling
                    console.error(`Error loading model ${path}:`, error);
                    reject(error);
                }
            );
        });
    } catch (error) {
        console.error(`Error in loadModel for ${path}:`, error);
        throw error;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Rotate the cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Fetch scene data on load and render spheres
async function fetchSceneData() {
    try {
        const response = await fetch('/api/scene-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Scene data loaded:', data);

        // Render a sphere for each object returned by the API
        if (data.objects && Array.isArray(data.objects)) {
            data.objects.forEach((obj) => {
                // Remove existing sphere if it exists
                if (apiObjects.has(obj.id)) {
                    scene.remove(apiObjects.get(obj.id));
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
                scene.add(sphere);
                apiObjects.set(obj.id, sphere);

                console.log(`Rendered sphere for object ${obj.id} at (${obj.x}, ${obj.y}, ${obj.z})`);
            });
        }
    } catch (error) {
        console.error('Error fetching scene data:', error);
    }
}

// Initialize
fetchSceneData();
animate();
