/**
 * Handles all input events (mouse, keyboard) for the application
 */
class InputHandler {
    // Constants for click detection
    static CLICK_THRESHOLD = 5; // pixels
    static CLICK_MAX_DURATION = 300; // ms
    /** @type {BABYLON.ArcRotateCamera} */
    camera;
    /** @type {BABYLON.Scene} */
    scene;
    /** @type {boolean} */
    isPanning = false;
    /** @type {number} */
    lastX = 0;
    /** @type {number} */
    lastY = 0;
    /** @type {string} */
    originalCursor = 'default';
    /** @type {boolean} */
    cameraControlsEnabled = true;
    /** @type {Function|null} */
    originalWheelHandler = null;
    /** @type {Object|null} */
    storedCameraState = null;
    /**
     * Create a new InputHandler
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {BABYLON.ArcRotateCamera} camera - The camera to control
     * @param {AssetBrowser} assetBrowser - Instance of AssetBrowser for handling object interactions
     */
    constructor(scene, camera, assetBrowser) {
        this.scene = scene;
        this.camera = camera;
        this.assetBrowser = assetBrowser;
        
        // State tracking
        this.isPanning = false;
        this.isRotating = false;
        this.lastX = 0;
        this.lastY = 0;
        this.pointerDownTime = 0;
        this.pointerDownX = 0;
        this.pointerDownY = 0;
        this.originalCursor = 'default';
        this.cameraControlsEnabled = true;
        this.originalWheelHandler = null;
        
        // Bind methods
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        
        // Initial setup
        this.setupEventListeners();
    }
    
    /**
     * Enable camera controls
     */
    /**
     * Enable camera controls
     */
    enableCameraControls() {
        if (!this.camera) {
            console.warn('Cannot enable camera controls: No camera found');
            return;
        }
        
        console.log('Enabling camera controls...');
        
        try {
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (!canvas) {
                console.warn('Cannot enable camera controls: No canvas found');
                return;
            }
            
            // Force detach first to ensure clean state
            try {
                this.camera.detachControl(canvas);
            } catch (e) {
                // Ignore detach errors
            }
            
            // Small delay to ensure detach is complete
            setTimeout(() => {
                try {
                    // Re-attach with default behavior
                    this.camera.attachControl(canvas, true);
                    
                    // Configure camera behavior
                    this.camera.useBouncingBehavior = true;
                    this.camera.upperBetaLimit = Math.PI / 2.2;
                    this.camera.lowerRadiusLimit = 2;
                    this.camera.upperRadiusLimit = 500;
                    this.camera.wheelPrecision = 50;
                    this.camera.panningSensibility = 1000;
                    this.camera.angularSensibilityX = 1500;
                    this.camera.angularSensibilityY = 1500;
                    
                    // Restore wheel handler if it was overridden
                    if (canvas && this.originalWheelHandler) {
                        canvas.onwheel = this.originalWheelHandler;
                        this.originalWheelHandler = null;
                    }
                    
                    this.cameraControlsEnabled = true;
                    console.log('Camera controls enabled');
                    
                    // Force a render to update the camera
                    this.scene.render();
                    
                } catch (error) {
                    console.error('Error re-attaching camera controls:', error);
                }
            }, 0);
            
        } catch (error) {
            console.error('Error in enableCameraControls:', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            console.warn('No canvas found for setting up event listeners');
            return;
        }
        
        // Store the original cursor
        this.originalCursor = canvas.style.cursor || 'default';
        
        // Add event listeners
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        canvas.addEventListener('pointermove', this.handlePointerMove);
        canvas.addEventListener('pointerup', this.handlePointerUp);
        canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        canvas.addEventListener('contextmenu', this.handleContextMenu);
        this.scene.onKeyboardObservable.add(this.handleKeyDown);
        
        // Enable camera controls
        this.enableCameraControls();
    }
    
    /**
     * Clean up event listeners
     */
    dispose() {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
            canvas.removeEventListener('pointerdown', this.handlePointerDown);
            canvas.removeEventListener('pointermove', this.handlePointerMove);
            canvas.removeEventListener('pointerup', this.handlePointerUp);
            canvas.removeEventListener('wheel', this.handleWheel);
            canvas.removeEventListener('contextmenu', this.handleContextMenu);
            this.scene.onKeyboardObservable.removeCallback(this.handleKeyDown);
        }
        
        // Clean up camera controls
        this.disableCameraControls();
    }

    /**
     * Handle context menu to prevent default behavior
     * @param {Event} event - The context menu event
     */
    handleContextMenu(event) {
        event.preventDefault();
    }

    /**
     * Handle pointer down events
     * @param {PointerEvent} event - The pointer event
     */
    handlePointerDown(event) {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        const currentX = event.clientX;
        const currentY = event.clientY;
        
        // Always store the last position for move events
        this.lastX = currentX;
        this.lastY = currentY;
        
        if (event.button === 2) { // Right mouse button
            this.isPanning = true;
            this.originalCursor = canvas?.style.cursor || 'default';
            if (canvas) {
                canvas.style.cursor = 'move';
            }
            event.preventDefault();
        } 
        // Handle left mouse button down
        else if (event.button === 0) {
            this.pointerDownTime = Date.now();
            this.pointerDownX = currentX;
            this.pointerDownY = currentY;
            
            // Handle object selection/placement
            const pickResult = this.scene.pick(currentX, currentY);
            if (pickResult.hit && pickResult.pickedMesh) {
                // If we have a selected file, place the object
                if (this.assetBrowser?.selectedFile) {
                    if (pickResult.pickedPoint) {
                        this.assetBrowser.placeObject(pickResult.pickedPoint, pickResult);
                    }
                } 
                // If clicking on the selected object, start rotation
                else if (this.assetBrowser?.selectedObject === pickResult.pickedMesh) {
                    this.isRotating = true;
                    this.assetBrowser.startRotation({
                        type: BABYLON.PointerEventTypes.POINTERDOWN,
                        event: event,
                        pickInfo: pickResult
                    });
                    event.preventDefault();
                    return false;
                }
                // Otherwise, handle object selection
                else if (this.assetBrowser) {
                    this.assetBrowser.handleObjectSelection({
                        type: BABYLON.PointerEventTypes.POINTERDOWN,
                        event: event,
                        pickInfo: pickResult
                    });
                }
            }
        }
        
        return true;
    }

    /**
     * Handle pointer move events
     * @param {PointerEvent} event - The pointer event
     */
    handlePointerMove(event) {
        const currentX = event.clientX;
        const currentY = event.clientY;
        
        try {
            if (this.isPanning) {
                const deltaX = currentX - this.lastX;
                const deltaY = currentY - this.lastY;
                
                // Pan the camera
                this.camera.inertialPanX -= deltaX / 200;
                this.camera.inertialPanY += deltaY / 200;
                
                event.preventDefault();
            } 
            // Handle object rotation if in rotation mode
            else if (this.isRotating && this.assetBrowser?.selectedObject) {
                const deltaX = currentX - this.lastX;
                if (Math.abs(deltaX) > 0) {
                    this.assetBrowser.handleRotation(deltaX);
                    event.preventDefault();
                }
            }
        } catch (error) {
            console.error('Error in handlePointerMove:', error);
        }
        
        this.lastX = currentX;
        this.lastY = currentY;
        
        return true;
    }

    /**
     * Handle pointer up events
     * @param {PointerEvent} event - The pointer event
     */
    handlePointerUp(event) {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        
        if (event.button === 2) { // Right mouse button
            this.isPanning = false;
            if (canvas) {
                canvas.style.cursor = this.originalCursor || 'default';
            }
            event.preventDefault();
        } 
        // Handle left mouse button up
        else if (event.button === 0) {
            // Clean up rotation
            if (this.isRotating) {
                this.isRotating = false;
                if (this.assetBrowser) {
                    this.assetBrowser.stopRotation();
                }
            } 
            // Handle click for object selection if not in rotation mode
            else if (this.assetBrowser) {
                const pointerUpTime = Date.now();
                const pointerUpX = event.clientX;
                const pointerUpY = event.clientY;
                const distance = Math.sqrt(
                    Math.pow(pointerUpX - this.pointerDownX, 2) + 
                    Math.pow(pointerUpY - this.pointerDownY, 2)
                );
                
                if (pointerUpTime - this.pointerDownTime < InputHandler.CLICK_MAX_DURATION && 
                    distance < InputHandler.CLICK_THRESHOLD) {
                    // This was a click, not a drag
                    const pickResult = this.scene.pick(pointerUpX, pointerUpY);
                    if (pickResult.hit && pickResult.pickedMesh) {
                        this.assetBrowser.handleObjectSelection({
                            type: BABYLON.PointerEventTypes.POINTERUP,
                            event: event,
                            pickInfo: pickResult
                        });
                    }
                }
            }
        }
    }

    /**
     * Handle mouse wheel events for zooming
     * @param {WheelEvent} event - The wheel event
     */
    /**
     * Handle keyboard events
     * @param {BABYLON.KeyboardInfo} kbInfo - The keyboard event info
     */
    handleKeyDown(kbInfo) {
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && 
            kbInfo.event.key.toLowerCase() === 'b' && 
            this.assetBrowser) {
            this.assetBrowser.setVisible(!this.assetBrowser.container.isVisible);
        }
    }
    
    /**
     * Disable camera controls
     */
    disableCameraControls() {
        if (this.camera) {
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                this.camera.detachControl(canvas);
            }
        }
    }
    
    handleWheel(event) {
        const delta = event.deltaY * 0.01;
        this.camera.radius = BABYLON.Scalar.Clamp(
            this.camera.radius * (1 + delta * 0.1),
            this.camera.lowerRadiusLimit || 1,
            this.camera.upperRadiusLimit || 1000
        );
        
        event.preventDefault();
    }

    /**
     * Clean up resources
     */
    dispose() {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
            // Remove all event listeners
            canvas.removeEventListener('pointerdown', this.handlePointerDown);
            canvas.removeEventListener('pointermove', this.handlePointerMove);
            canvas.removeEventListener('pointerup', this.handlePointerUp);
            canvas.removeEventListener('wheel', this.handleWheel);
            canvas.removeEventListener('contextmenu', this.handleContextMenu);
            
            // Restore original cursor
            canvas.style.cursor = this.originalCursor;
            
            // Detach camera controls
            this.camera.detachControl(canvas);
        }
    }

    /**
     * Disable camera controls
     */
    disableCameraControls() {
        if (!this.camera) {
            console.warn('Cannot disable camera controls: No camera found');
            return;
        }
        
        try {
            // Store current camera state if not already stored
            if (!this.storedCameraState) {
                this.storedCameraState = {
                    alpha: this.camera.alpha,
                    beta: this.camera.beta,
                    radius: this.camera.radius,
                    target: this.camera.target ? this.camera.target.clone() : new BABYLON.Vector3(0, 0, 0)
                };
            }
            
            // Disable camera behaviors
            this.camera.useBouncingBehavior = false;
            this.camera.useAutoRotationBehavior = false;
            this.camera.useCtrlForPanning = false;
            
            // Detach controls
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                try {
                    // Only detach if controls are attached
                    if (this.camera.inputs && this.camera.inputs.attached) {
                        this.camera.detachControl(canvas);
                    }
                } catch (e) {
                    console.warn('Error detaching camera controls:', e);
                }
                
                // Store and override wheel handler
                if (!this.originalWheelHandler) {
                    this.originalWheelHandler = canvas.onwheel;
                }
                
                canvas.onwheel = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                };
                
                // Disable context menu and touch actions
                canvas.style.touchAction = 'none';
                canvas.style.webkitUserSelect = 'none';
                canvas.style.userSelect = 'none';
            }
            
            this.cameraControlsEnabled = false;
            console.log('Camera controls disabled');
            
            // Force a render to apply changes
            this.scene.render();
            
        } catch (error) {
            console.error('Error in disableCameraControls:', error);
        }
    }

}

export { InputHandler };
