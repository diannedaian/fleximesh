import { BaseStage } from './BaseStage.js';
import { appState } from '../state.js';
import * as THREE from 'three';

/**
 * RegenerateModelStage - Assign mechanical behavior to selected joints.
 */
export class RegenerateModelStage extends BaseStage {
    constructor(container, threeScene, manager) {
        super(container, threeScene, manager);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.handleGroup = new THREE.Group();
        this.handleGroup.name = 'RegenerateJointHandleGroup';
        this.boneHandles = [];
        this.selectedHandle = null;
        this.handleSyncAnimationId = null;
        this._tempWorldPos = new THREE.Vector3();
        this.defaultHandleColor = 0xffa500;
        this.selectedHandleColor = 0x29b6f6;
        this.assignedHandleColor = 0x00c853;
        this.assignmentButtons = new Map();
        this.selectionText = null;
        this.statusText = null;

        if (!appState.jointAssignments) {
            appState.jointAssignments = new Map();
        }
    }

    /**
     * Render the regenerate model stage
     * @returns {HTMLElement} The rendered stage element
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'stage-view animate-fade-in';

        const header = document.createElement('header');
        header.className = 'prompt-header';
        header.innerHTML = `
            <h1 class="text-gradient">Regenerate Model</h1>
            <p class="subtitle">Select a joint and assign a behavior.</p>
        `;
        this.element.appendChild(header);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'prompt-container';

        const panel = document.createElement('div');
        panel.className = 'instruction-content';

        this.selectionText = document.createElement('p');
        this.selectionText.className = 'hint';
        this.selectionText.style.marginTop = '1rem';
        panel.appendChild(this.selectionText);

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '0.6rem';
        buttonRow.style.marginTop = '1rem';

        ['compliant', 'hinge', 'multimaterial'].forEach((assignmentType) => {
            const button = document.createElement('button');
            button.className = 'btn-primary';
            button.textContent = assignmentType[0].toUpperCase() + assignmentType.slice(1);
            button.style.transition = 'transform 120ms ease, box-shadow 120ms ease, outline-color 120ms ease';
            this.assignmentButtons.set(assignmentType, button);
            buttonRow.appendChild(button);
        });

        panel.appendChild(buttonRow);

        this.statusText = document.createElement('p');
        this.statusText.className = 'hint';
        this.statusText.style.marginTop = '0.8rem';
        this.statusText.textContent = 'Assigned joints turn green.';
        panel.appendChild(this.statusText);

        contentContainer.appendChild(panel);
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
        this.bindAssignmentButtons();
        this.registerEventHandler(continueButton, 'click', () => this.handleContinue());
        this.initializeJointHandlesFromModel();
        this.updateSelectionUi();
        this.startHandleSyncLoop();

        return this.element;
    }

    /**
     * Build selectable handle spheres for all bones in the loaded model.
     */
    initializeJointHandlesFromModel() {
        const modelRoot = this.threeScene?.currentModel;
        if (!this.threeScene?.scene || !modelRoot) {
            return;
        }

        this.clearJointHandles();

        modelRoot.traverse((child) => {
            if (!(child instanceof THREE.Bone)) {
                return;
            }

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 12, 12),
                new THREE.MeshBasicMaterial({ color: this.defaultHandleColor, depthTest: true })
            );
            mesh.userData.isHandle = true;
            mesh.userData.bone = child;
            child.getWorldPosition(this._tempWorldPos);
            mesh.position.copy(this._tempWorldPos);
            this.boneHandles.push(mesh);
            this.handleGroup.add(mesh);
            this.applyHandleColor(mesh);
        });

        this.threeScene.scene.add(this.handleGroup);
    }

    /**
     * Update per-handle color based on selected/assigned states.
     * @param {THREE.Mesh} handle - Handle to recolor
     */
    applyHandleColor(handle) {
        if (!handle?.material?.color) {
            return;
        }

        const bone = handle.userData?.bone;
        const isAssigned = !!this.getAssignmentForBone(bone);
        if (isAssigned) {
            handle.material.color.setHex(this.assignedHandleColor);
            return;
        }

        if (handle === this.selectedHandle) {
            handle.material.color.setHex(this.selectedHandleColor);
            return;
        }

        handle.material.color.setHex(this.defaultHandleColor);
    }

    /**
     * Handle canvas click to select a joint handle.
     * @param {MouseEvent} event - Mouse click event
     */
    handleMouseClick(event) {
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

        event.preventDefault();
        event.stopPropagation();
        this.setSelectedHandle(clickedHandle);
    }

    /**
     * Track selected joint handle and refresh visuals/UI.
     * @param {THREE.Mesh|null} handle - Selected handle
     */
    setSelectedHandle(handle) {
        const previousHandle = this.selectedHandle;
        this.selectedHandle = handle;
        if (previousHandle) this.applyHandleColor(previousHandle);
        if (this.selectedHandle) this.applyHandleColor(this.selectedHandle);
        this.updateSelectionUi();
    }

    /**
     * Bind canvas click for handle picking.
     */
    bindMouseEvents() {
        if (!this.threeScene?.renderer?.domElement) {
            return;
        }

        this.registerEventHandler(
            this.threeScene.renderer.domElement,
            'click',
            (event) => this.handleMouseClick(event)
        );
    }

    /**
     * Bind left-panel assignment buttons.
     */
    bindAssignmentButtons() {
        this.assignmentButtons.forEach((button, assignmentType) => {
            this.registerEventHandler(button, 'click', () => this.assignSelectedJoint(assignmentType));
        });
    }

    /**
     * Update visual "pressed" state of assignment buttons.
     * The assigned type for the currently selected joint stays highlighted.
     */
    updateAssignmentButtonStates() {
        const selectedBone = this.selectedHandle?.userData?.bone || null;
        const assignedType = selectedBone ? this.getAssignmentForBone(selectedBone)?.type : null;

        this.assignmentButtons.forEach((button, buttonType) => {
            const isActive = assignedType === buttonType;
            button.style.outline = isActive ? '2px solid var(--accent-color)' : '2px solid transparent';
            button.style.outlineOffset = '2px';
            button.style.boxShadow = isActive ? 'inset 0 0 0 9999px rgba(0, 0, 0, 0.16)' : '';
            button.style.transform = isActive ? 'translateY(1px)' : '';
        });
    }

    /**
     * Save assignment for currently selected joint and mark handle green.
     * @param {string} assignmentType - compliant | hinge | multimaterial
     */
    assignSelectedJoint(assignmentType) {
        if (!this.selectedHandle?.userData?.bone) {
            this.statusText.textContent = 'Select a joint first.';
            return;
        }

        const bone = this.selectedHandle.userData.bone;
        appState.jointAssignments.set(bone.uuid, {
            type: assignmentType,
            boneName: bone.name || 'Unnamed Bone'
        });

        this.applyHandleColor(this.selectedHandle);
        this.updateSelectionUi();
        this.updateAssignmentButtonStates();
        this.statusText.textContent = `Assigned "${bone.name || 'Unnamed Bone'}" as ${assignmentType}.`;
    }

    /**
     * Move to the regeneration loading stage.
     */
    handleContinue() {
        appState.setStage('regenerating-model');
    }

    /**
     * Update joint handles to follow associated bones.
     */
    updateJointHandles() {
        this.boneHandles.forEach((handle) => {
            const bone = handle.userData?.bone;
            if (!bone) return;
            bone.getWorldPosition(this._tempWorldPos);
            handle.position.copy(this._tempWorldPos);
        });
    }

    /**
     * Start render-loop update for handle syncing.
     */
    startHandleSyncLoop() {
        const tick = () => {
            this.updateJointHandles();
            this.handleSyncAnimationId = requestAnimationFrame(tick);
        };
        this.handleSyncAnimationId = requestAnimationFrame(tick);
    }

    /**
     * Get existing assignment record for a bone.
     * @param {THREE.Bone} bone - Bone instance
     * @returns {{type: string, boneName: string}|null}
     */
    getAssignmentForBone(bone) {
        if (!bone || !appState.jointAssignments) {
            return null;
        }
        return appState.jointAssignments.get(bone.uuid) || null;
    }

    /**
     * Refresh selected-joint description in the side panel.
     */
    updateSelectionUi() {
        if (!this.selectionText) {
            return;
        }

        if (!this.selectedHandle?.userData?.bone) {
            this.selectionText.textContent = 'Selected joint: none';
            this.updateAssignmentButtonStates();
            return;
        }

        const bone = this.selectedHandle.userData.bone;
        const assigned = this.getAssignmentForBone(bone);
        const suffix = assigned ? ` (assigned: ${assigned.type})` : ' (unassigned)';
        this.selectionText.textContent = `Selected joint: ${bone.name || 'Unnamed Bone'}${suffix}`;
        this.updateAssignmentButtonStates();
    }

    /**
     * Dispose and remove all joint handle meshes from scene.
     */
    clearJointHandles() {
        this.boneHandles.forEach((handle) => {
            this.handleGroup.remove(handle);
            if (handle.geometry) handle.geometry.dispose();
            if (handle.material) handle.material.dispose();
        });
        this.boneHandles = [];
    }

    /**
     * Cleanup stage resources.
     */
    destroy() {
        if (this.handleSyncAnimationId) {
            cancelAnimationFrame(this.handleSyncAnimationId);
            this.handleSyncAnimationId = null;
        }
        this.setSelectedHandle(null);
        this.clearJointHandles();
        if (this.handleGroup) {
            this.threeScene?.scene?.remove(this.handleGroup);
        }
        super.destroy();
    }
}
