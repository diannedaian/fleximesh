import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/**
 * DefineRotationStage - Rotate joints using a rotation-only gumball.
 */
export class DefineRotationStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.boneHandles = [];
        this.handleGroup = new THREE.Group();
        this.handleGroup.name = 'DefineRotationHandleGroup';
        this.connectionGroup = new THREE.Group();
        this.connectionGroup.name = 'DefineRotationConnectionGroup';
        this.boneConnections = [];
        this.selectedHandle = null;
        this.transformControls = null;
        this.handleSyncAnimationId = null;
        this._tempWorldPos = new THREE.Vector3();
        this._tempParentPos = new THREE.Vector3();
        this._tempChildPos = new THREE.Vector3();
        this.defaultHandleColor = 0xffa500;
        this.selectedHandleColor = 0x00ff88;

        this.initRotationTools();
        this.startHandleSyncLoop();
    }

    /**
     * Initialize transform controls in rotation mode.
     */
    initRotationTools() {
        if (!this.threeScene?.scene || !this.threeScene?.camera || !this.threeScene?.renderer) {
            return;
        }

        this.threeScene.scene.add(this.handleGroup);
        this.threeScene.scene.add(this.connectionGroup);

        this.transformControls = new TransformControls(
            this.threeScene.camera,
            this.threeScene.renderer.domElement
        );
        this.transformControls.setMode('rotate');
        this.transformControls.setSpace('local');
        this.threeScene.scene.add(this.transformControls);

        this.transformControls.addEventListener('dragging-changed', (event) => {
            if (this.threeScene.controls) {
                this.threeScene.controls.enabled = !event.value;
            }
        });
    }

    /**
     * Build handle spheres and parent-child connectors for model bones.
     */
    initializeBoneToolsFromModel() {
        const modelRoot = this.threeScene?.currentModel;
        if (!this.threeScene?.scene || !modelRoot) {
            return;
        }

        this.clearHandles();
        this.clearConnections();

        const sphereGeometry = new THREE.SphereGeometry(0.035, 12, 12);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: this.defaultHandleColor,
            depthTest: true
        });

        modelRoot.traverse((childBone) => {
            if (!(childBone instanceof THREE.Bone)) {
                return;
            }

            const handle = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
            handle.userData.isHandle = true;
            handle.userData.bone = childBone;
            childBone.getWorldPosition(this._tempWorldPos);
            handle.position.copy(this._tempWorldPos);
            this.boneHandles.push(handle);
            this.handleGroup.add(handle);

            const parentBone = childBone.parent;
            if (parentBone instanceof THREE.Bone) {
                this.createConnection(parentBone, childBone);
            }
        });
    }

    /**
     * Create a visible line between parent and child bone.
     * @param {THREE.Bone} parentBone - Parent bone
     * @param {THREE.Bone} childBone - Child bone
     */
    createConnection(parentBone, childBone) {
        const exists = this.boneConnections.some(
            (connection) => connection.parentBone === parentBone && connection.childBone === childBone
        );
        if (exists) {
            return;
        }

        const geometry = new LineGeometry();
        geometry.setPositions([0, 0, 0, 0, 0, 0]);
        const rendererEl = this.threeScene?.renderer?.domElement;
        const material = new LineMaterial({
            color: 0x66ffcc,
            linewidth: 6,
            transparent: true,
            opacity: 0.9
        });
        material.resolution.set(
            rendererEl?.clientWidth || window.innerWidth,
            rendererEl?.clientHeight || window.innerHeight
        );

        const line = new Line2(geometry, material);
        this.connectionGroup.add(line);
        this.boneConnections.push({ parentBone, childBone, line });
        this.updateSingleConnection(parentBone, childBone, line);
    }

    /**
     * Update one connection line from current world bone positions.
     * @param {THREE.Bone} parentBone - Parent bone
     * @param {THREE.Bone} childBone - Child bone
     * @param {Line2} line - Wide line
     */
    updateSingleConnection(parentBone, childBone, line) {
        parentBone.getWorldPosition(this._tempParentPos);
        childBone.getWorldPosition(this._tempChildPos);
        line.geometry.setPositions([
            this._tempParentPos.x, this._tempParentPos.y, this._tempParentPos.z,
            this._tempChildPos.x, this._tempChildPos.y, this._tempChildPos.z
        ]);
    }

    /**
     * Render define rotation stage.
     * @returns {HTMLElement}
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Define Rotation</h1>
            <p class="subtitle">Select a joint and rotate it with the rotation gumball.</p>
        `;
        this.element.appendChild(header);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'prompt-container';
        contentContainer.innerHTML = `
            <div class="instruction-content">
                <p class="hint" style="margin-top: 1rem;">
                    Rotation only: hierarchy and mesh update as you rotate each selected joint.
                </p>
            </div>
        `;
        this.element.appendChild(contentContainer);

        const footer = document.createElement('footer');
        footer.className = 'prompt-footer';
        const continueButton = document.createElement('button');
        continueButton.className = 'btn-primary';
        continueButton.textContent = 'Confirm and Continue';
        footer.appendChild(continueButton);
        this.element.appendChild(footer);

        super.bindEvents();
        this.bindMouseEvents();
        this.registerEventHandler(continueButton, 'click', () => this.handleContinue());
        if (this.threeScene?.setSkeletonMode) {
            this.threeScene.setSkeletonMode();
        }
        this.initializeBoneToolsFromModel();
        return this.element;
    }

    /**
     * Select handle and attach rotation control to underlying bone.
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        if (!this.threeScene?.camera || !this.threeScene?.renderer) {
            return;
        }

        const rect = this.threeScene.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.threeScene.camera);
        const intersects = this.raycaster.intersectObjects(this.handleGroup.children, true);
        const clickedHandle = intersects.find((hit) => hit.object?.userData?.isHandle)?.object || null;
        if (!clickedHandle) {
            return;
        }

        this.setSelectedHandle(clickedHandle);
        const selectedBone = clickedHandle.userData?.bone;
        if (selectedBone && this.transformControls) {
            // Attach to the actual bone so rotation propagates to children and skinned mesh.
            this.transformControls.attach(selectedBone);
        }
    }

    /**
     * Bind mouse events for selecting handles.
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
     * Set selected visual handle.
     * @param {THREE.Mesh|null} handle - Handle to select
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
     * Keep handles and connectors synced to bone world positions.
     */
    updateHandlesAndConnections() {
        this.boneHandles.forEach((handle) => {
            const bone = handle.userData?.bone;
            if (!bone) return;
            bone.getWorldPosition(this._tempWorldPos);
            handle.position.copy(this._tempWorldPos);
        });

        const rendererEl = this.threeScene?.renderer?.domElement;
        const width = rendererEl?.clientWidth || window.innerWidth;
        const height = rendererEl?.clientHeight || window.innerHeight;
        this.boneConnections.forEach(({ parentBone, childBone, line }) => {
            if (line.material?.resolution) {
                line.material.resolution.set(width, height);
            }
            this.updateSingleConnection(parentBone, childBone, line);
        });
    }

    /**
     * Start per-frame syncing.
     */
    startHandleSyncLoop() {
        const tick = () => {
            this.updateHandlesAndConnections();
            this.handleSyncAnimationId = requestAnimationFrame(tick);
        };
        this.handleSyncAnimationId = requestAnimationFrame(tick);
    }

    /**
     * Continue to regenerate-model stage.
     */
    handleContinue() {
        appState.setStage('regenerate-model');
    }

    /**
     * Remove and dispose all handles.
     */
    clearHandles() {
        this.boneHandles.forEach((handle) => {
            this.handleGroup.remove(handle);
            if (handle.geometry) handle.geometry.dispose();
            if (handle.material) handle.material.dispose();
        });
        this.boneHandles = [];
    }

    /**
     * Remove and dispose all connector lines.
     */
    clearConnections() {
        this.boneConnections.forEach(({ line }) => {
            this.connectionGroup.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        this.boneConnections = [];
    }

    /**
     * Cleanup.
     */
    destroy() {
        if (this.handleSyncAnimationId) {
            cancelAnimationFrame(this.handleSyncAnimationId);
            this.handleSyncAnimationId = null;
        }
        this.setSelectedHandle(null);
        this.clearHandles();
        this.clearConnections();
        if (this.transformControls) {
            this.transformControls.detach();
            this.threeScene?.scene?.remove(this.transformControls);
            this.transformControls.dispose();
            this.transformControls = null;
        }
        this.threeScene?.scene?.remove(this.handleGroup);
        this.threeScene?.scene?.remove(this.connectionGroup);
        super.destroy();
    }
}
