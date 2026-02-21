import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

/**
 * DefineBoneJointsStage - Stage for defining bone joints on the 3D model
 * User can click E to add connecting bones by selecting ball joints
 */
export class DefineBoneJointsStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.boneHandles = [];
        this.handleGroup = new THREE.Group();
        this.handleGroup.name = 'BoneHandleGroup';
        this.connectionGroup = new THREE.Group();
        this.connectionGroup.name = 'BoneConnectionGroup';
        this.boneConnections = [];
        this.transformControls = null;
        this.isDraggingHandle = false;
        this.handleSyncAnimationId = null;
        this.selectedHandle = null;
        this.defaultHandleColor = 0xffa500;
        this.selectedHandleColor = 0x00ff88;
        this._tempWorldPos = new THREE.Vector3();
        this._tempLocalPos = new THREE.Vector3();
        this.initSkeletonTools();
        this.startHandleSyncLoop();
    }

    /**
     * Initialize stage-specific skeleton editing tools.
     * Sets up TransformControls for dragging bone handle meshes.
     */
    initSkeletonTools() {
        if (!this.threeScene?.scene || !this.threeScene?.camera || !this.threeScene?.renderer) {
            return;
        }

        this.threeScene.scene.add(this.handleGroup);
        this.threeScene.scene.add(this.connectionGroup);

        this.transformControls = new TransformControls(
            this.threeScene.camera,
            this.threeScene.renderer.domElement
        );
        this.transformControls.setMode('translate');
        this.transformControls.setSpace('local');
        this.threeScene.scene.add(this.transformControls);

        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.isDraggingHandle = event.value;
            if (this.threeScene.controls) {
                this.threeScene.controls.enabled = !event.value;
            }
        });

        this.transformControls.addEventListener('objectChange', () => {
            if (!this.isRiggingModeActive()) {
                return;
            }

            const activeHandle = this.transformControls.object;
            const linkedBone = activeHandle?.userData?.bone;

            if (!activeHandle || !linkedBone) {
                return;
            }

            // Convert world handle position to the bone parent local space.
            activeHandle.getWorldPosition(this._tempWorldPos);
            if (linkedBone.parent) {
                this._tempLocalPos.copy(this._tempWorldPos);
                linkedBone.parent.worldToLocal(this._tempLocalPos);
                linkedBone.position.copy(this._tempLocalPos);
            } else {
                linkedBone.position.copy(this._tempWorldPos);
            }
            linkedBone.updateMatrixWorld(true);
        });
    }

    /**
     * Rigging interactions are only active in skeleton render mode.
     * @returns {boolean}
     */
    isRiggingModeActive() {
        return this.threeScene?.renderMode === 'skeleton';
    }

    /**
     * Build interactive sphere handles for each bone in a loaded model.
     * @param {THREE.Object3D} object - Loaded model root (e.g., FBX scene root)
     */
    createBoneHandles(object) {
        if (!object || !this.threeScene?.scene) {
            return;
        }

        const isSingleBoneAdd = object instanceof THREE.Bone;
        if (!isSingleBoneAdd) {
            this.boneHandles.forEach((handle) => {
                if (handle.geometry) handle.geometry.dispose();
                if (handle.material) handle.material.dispose();
            });
            this.boneHandles = [];
            this.handleGroup.clear();
            this.clearBoneConnections();
        }

        const sphereGeometry = new THREE.SphereGeometry(0.06, 12, 12);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: this.defaultHandleColor,
            depthTest: true
        });

        const createdHandles = [];
        object.traverse((childBone) => {
            if (!(childBone instanceof THREE.Bone)) {
                return;
            }

            const handleAlreadyExists = this.boneHandles.some(
                (existingHandle) => existingHandle.userData?.bone === childBone
            );
            if (handleAlreadyExists) {
                return;
            }

            const handleMesh = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
            handleMesh.userData.isHandle = true;
            handleMesh.userData.bone = childBone;
            childBone.getWorldPosition(this._tempWorldPos);
            handleMesh.position.copy(this._tempWorldPos);

            this.boneHandles.push(handleMesh);
            createdHandles.push(handleMesh);
            this.handleGroup.add(handleMesh);

            const parentBone = childBone.parent;
            if (parentBone instanceof THREE.Bone) {
                this.createBoneConnection(parentBone, childBone);
            }
        });

        return createdHandles;
    }

    /**
     * Create a line connection between parent and child bones.
     * @param {THREE.Bone} parentBone - Parent bone
     * @param {THREE.Bone} childBone - Child bone
     */
    createBoneConnection(parentBone, childBone) {
        const exists = this.boneConnections.some(
            (connection) => connection.parentBone === parentBone && connection.childBone === childBone
        );
        if (exists) {
            return;
        }

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3()
        ]);
        const material = new THREE.LineBasicMaterial({
            color: 0x66ffcc,
            transparent: true,
            opacity: 0.9
        });
        const line = new THREE.Line(geometry, material);
        this.connectionGroup.add(line);
        this.boneConnections.push({ parentBone, childBone, line });
        this.updateSingleConnection(parentBone, childBone, line);
    }

    /**
     * Clear all bone hierarchy connection visuals.
     */
    clearBoneConnections() {
        this.boneConnections.forEach(({ line }) => {
            this.connectionGroup.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        this.boneConnections = [];
    }

    /**
     * Update one parent-child connection line to current world positions.
     * @param {THREE.Bone} parentBone - Parent bone
     * @param {THREE.Bone} childBone - Child bone
     * @param {THREE.Line} line - Three.js line object
     */
    updateSingleConnection(parentBone, childBone, line) {
        const parentPos = new THREE.Vector3();
        const childPos = new THREE.Vector3();
        parentBone.getWorldPosition(parentPos);
        childBone.getWorldPosition(childPos);
        line.geometry.setFromPoints([parentPos, childPos]);
    }

    /**
     * Handle mouse down for selecting bone handles.
     * @param {MouseEvent} event - Mouse event from renderer canvas
     */
    handleMouseDown(event) {
        if (!this.isRiggingModeActive()) {
            return;
        }

        if (!this.threeScene?.camera || !this.threeScene?.renderer || !this.handleGroup) {
            return;
        }

        const rect = this.threeScene.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.threeScene.camera);
        const intersections = this.raycaster.intersectObjects(this.handleGroup.children, true);
        const clickedHandle = intersections.find((hit) => hit.object?.userData?.isHandle)?.object || null;

        if (!clickedHandle) {
            return;
        }

        this.setSelectedHandle(clickedHandle);

        if (this.transformControls) {
            this.transformControls.attach(clickedHandle);
        }
    }

    /**
     * Update selected handle and visual highlight state.
     * @param {THREE.Mesh | null} handle - Handle to select
     */
    setSelectedHandle(handle) {
        if (this.selectedHandle?.material?.color) {
            this.selectedHandle.material.color.setHex(this.defaultHandleColor);
        }

        this.selectedHandle = handle;

        if (this.selectedHandle?.material?.color) {
            this.selectedHandle.material.color.setHex(this.selectedHandleColor);
        }
    }

    /**
     * Keep all bone handles aligned to their associated bones.
     */
    updateBoneHandles() {
        const showRiggingHandles = this.isRiggingModeActive();
        this.handleGroup.visible = showRiggingHandles;
        this.connectionGroup.visible = showRiggingHandles;

        if (!showRiggingHandles) {
            if (this.transformControls?.object) {
                this.transformControls.detach();
            }
            this.setSelectedHandle(null);
            return;
        }

        this.boneHandles.forEach((handle) => {
            const bone = handle.userData?.bone;
            if (!bone) return;

            // Avoid tug-of-war while actively dragging this handle.
            if (this.isDraggingHandle && this.transformControls?.object === handle) {
                return;
            }

            bone.getWorldPosition(this._tempWorldPos);
            handle.position.copy(this._tempWorldPos);
        });

        this.boneConnections.forEach(({ parentBone, childBone, line }) => {
            this.updateSingleConnection(parentBone, childBone, line);
        });
    }

    /**
     * Start a stage-level update loop for handle synchronization.
     */
    startHandleSyncLoop() {
        const tick = () => {
            this.updateBoneHandles();
            this.handleSyncAnimationId = requestAnimationFrame(tick);
        };
        this.handleSyncAnimationId = requestAnimationFrame(tick);
    }

    /**
     * Build handles from currently loaded model if present.
     */
    initializeBoneToolsFromModel() {
        const modelRoot = this.threeScene?.currentModel;
        if (!modelRoot) {
            return;
        }

        this.createBoneHandles(modelRoot);
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
        const continueButton = document.createElement('button');
        continueButton.className = 'btn-primary';
        continueButton.textContent = 'Confirm and Continue';
        footer.appendChild(continueButton);
        this.element.appendChild(footer);

        // Bind events
        super.bindEvents();
        this.registerEventHandler(continueButton, 'click', () => this.handleContinue());
        this.bindKeyboardEvents();
        this.bindMouseEvents();
        if (this.threeScene?.setSkeletonMode) {
            this.threeScene.setSkeletonMode();
        }
        this.initializeBoneToolsFromModel();

        return this.element;
    }

    /**
     * Bind keyboard events for bone joint interaction
     */
    bindKeyboardEvents() {
        this.registerEventHandler(document, 'keydown', (e) => {
            if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'e' || e.key === 'E') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this.handleAddBone();
                }
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.handleDeleteBone();
            }
        });
    }

    /**
     * Bind mouse events for handle picking and transform attachment.
     */
    bindMouseEvents() {
        if (!this.threeScene?.renderer?.domElement) {
            return;
        }

        this.registerEventHandler(
            this.threeScene.renderer.domElement,
            'mousedown',
            (event) => this.handleMouseDown(event)
        );
    }

    /**
     * Continue to the model regeneration stage.
     */
    handleContinue() {
        appState.setStage('regenerate-model');
    }

    /**
     * Handle adding a bone joint
     */
    handleAddBone() {
        if (!this.selectedHandle?.userData?.bone) {
            return;
        }

        const parentBone = this.selectedHandle.userData.bone;
        const newBone = new THREE.Bone();

        // Local offset from parent so repeated extrusions form a chain.
        newBone.position.set(0, 1, 0);
        parentBone.add(newBone);
        newBone.updateMatrixWorld(true);

        const createdHandles = this.createBoneHandles(newBone);
        const newHandle = createdHandles?.[0] || null;

        // Keep any existing skeleton helpers in sync after topology changes.
        if (Array.isArray(this.threeScene?.skeletonHelpers) && this.threeScene.skeletonHelpers.length > 0) {
            this.threeScene.skeletonHelpers.forEach((helper) => {
                if (helper?.update) {
                    helper.update();
                }
            });
        }

        if (newHandle) {
            this.setSelectedHandle(newHandle);
            if (this.transformControls) {
                this.transformControls.attach(newHandle);
            }
        }
    }

    /**
     * Delete currently selected bone handle and its full child chain.
     */
    handleDeleteBone() {
        if (!this.selectedHandle?.userData?.bone) {
            return;
        }

        const selectedBone = this.selectedHandle.userData.bone;
        if (!selectedBone.parent) {
            return;
        }

        const bonesToDelete = [];
        this.collectBoneHierarchy(selectedBone, bonesToDelete);

        const handlesToDelete = this.boneHandles.filter((handle) =>
            bonesToDelete.includes(handle.userData?.bone)
        );

        if (this.transformControls?.object && handlesToDelete.includes(this.transformControls.object)) {
            this.transformControls.detach();
        }

        handlesToDelete.forEach((handle) => {
            this.handleGroup.remove(handle);
            if (handle.geometry) handle.geometry.dispose();
            if (handle.material) handle.material.dispose();
        });
        this.boneHandles = this.boneHandles.filter((handle) => !handlesToDelete.includes(handle));
        this.boneConnections = this.boneConnections.filter((connection) => {
            const shouldDelete =
                bonesToDelete.includes(connection.parentBone) || bonesToDelete.includes(connection.childBone);
            if (shouldDelete) {
                this.connectionGroup.remove(connection.line);
                if (connection.line.geometry) connection.line.geometry.dispose();
                if (connection.line.material) connection.line.material.dispose();
                return false;
            }
            return true;
        });

        selectedBone.parent.remove(selectedBone);
        this.setSelectedHandle(null);

        if (Array.isArray(this.threeScene?.skeletonHelpers) && this.threeScene.skeletonHelpers.length > 0) {
            this.threeScene.skeletonHelpers.forEach((helper) => {
                if (helper?.update) {
                    helper.update();
                }
            });
        }
    }

    /**
     * Collect a bone and all descendant bones recursively.
     * @param {THREE.Bone} bone - Root bone to collect from
     * @param {THREE.Bone[]} collection - Output array of bones
     */
    collectBoneHierarchy(bone, collection) {
        if (!(bone instanceof THREE.Bone)) {
            return;
        }

        collection.push(bone);
        bone.children.forEach((child) => {
            if (child instanceof THREE.Bone) {
                this.collectBoneHierarchy(child, collection);
            }
        });
    }

    /**
     * Override destroy to clean up
     */
    destroy() {
        if (this.handleSyncAnimationId) {
            cancelAnimationFrame(this.handleSyncAnimationId);
            this.handleSyncAnimationId = null;
        }

        this.boneHandles.forEach((handle) => {
            if (handle.geometry) handle.geometry.dispose();
            if (handle.material) handle.material.dispose();
        });
        this.boneHandles = [];
        this.selectedHandle = null;
        this.clearBoneConnections();

        if (this.handleGroup) {
            this.threeScene?.scene?.remove(this.handleGroup);
            this.handleGroup.clear();
        }
        if (this.connectionGroup) {
            this.threeScene?.scene?.remove(this.connectionGroup);
            this.connectionGroup.clear();
        }

        if (this.transformControls) {
            this.transformControls.detach();
            this.threeScene?.scene?.remove(this.transformControls);
            this.transformControls.dispose();
            this.transformControls = null;
        }
        super.destroy();
    }
}
