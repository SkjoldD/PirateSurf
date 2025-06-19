import { InputHandler } from './inputHandler.js';
import { SceneManager } from './sceneManager.js';

/**
 * Asset Browser GUI Component
 * Displays a list of folders in Assets/3D and their contents when clicked
 */
class AssetBrowser {
    /**
     * Create a new AssetBrowser
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {string} [basePath='Assets/3D'] - Base path for assets
     */
    constructor(scene, basePath = 'Assets/3D') {
        this.scene = scene;
        this.basePath = basePath;
        this.advancedTexture = null;
        this.folderContainer = null;
        this.fileContainer = null;
        this.folderStack = [];
        this.selectedFile = null;
        this.sceneClickObserver = null;
        this.selectedObject = null;
        this.originalMaterials = new Map();
        this.isRotating = false;
        this.lastPointerX = 0;
        this.rotationSpeed = 0.01;
        this.camera = scene.activeCamera;
        this.originalCursor = 'default';

        // Initialize scene manager
        this.sceneManager = new SceneManager(scene);

        // Create GUI
        this.createGUI();

        // Load initial folder list
        this.loadFolders();
    }

    /**
     * Create the GUI elements
     */
    createGUI() {
        // Create fullscreen GUI
        this.guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("assetBrowserUI");
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("assetBrowserUI");

        // Create main container
        this.container = new BABYLON.GUI.StackPanel();
        this.container.width = "300px";
        this.container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.paddingTop = "20px";
        this.container.paddingLeft = "20px";
        this.advancedTexture.addControl(this.container);

        // Add title
        const title = new BABYLON.GUI.TextBlock();
        title.text = "Asset Browser";
        title.color = "white";
        title.height = "30px";
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.container.addControl(title);

        // Create scroll viewer for folders
        this.scrollViewer = new BABYLON.GUI.ScrollViewer();
        this.scrollViewer.width = "280px";
        this.scrollViewer.height = "400px";
        this.scrollViewer.background = "rgba(0, 0, 0, 0.5)";
        this.container.addControl(this.scrollViewer);

        // Create container for folder list
        this.folderContainer = new BABYLON.GUI.StackPanel();
        this.folderContainer.isVertical = true;
        this.scrollViewer.addControl(this.folderContainer);

        // Create container for file list (initially hidden)
        this.fileContainer = new BABYLON.GUI.StackPanel();
        this.fileContainer.isVertical = true;
        this.fileContainer.isVisible = false;
        this.scrollViewer.addControl(this.fileContainer);

        // Add Save/Load buttons
        this.addSaveLoadButtons();
    }

    /**
     * Add Save and Load buttons to the UI
     */
    addSaveLoadButtons() {
        // Create button container
        const buttonContainer = new BABYLON.GUI.StackPanel();
        buttonContainer.isVertical = false;
        buttonContainer.height = "40px";
        buttonContainer.width = "280px";
        buttonContainer.paddingTop = "10px";
        this.container.addControl(buttonContainer);

        // Add Save button
        const saveButton = BABYLON.GUI.Button.CreateSimpleButton("saveButton", "Save Scene");
        saveButton.width = "135px";
        saveButton.height = "30px";
        saveButton.color = "white";
        saveButton.background = "rgba(0, 150, 0, 0.7)";
        saveButton.onPointerClickObservable.add(() => this.sceneManager.saveScene());
        buttonContainer.addControl(saveButton);

        // Add space between buttons
        const spacer = new BABYLON.GUI.Rectangle();
        spacer.width = "10px";
        spacer.height = "1px";
        buttonContainer.addControl(spacer);

        // Add Load button
        const loadButton = BABYLON.GUI.Button.CreateSimpleButton("loadButton", "Load Scene");
        loadButton.width = "135px";
        loadButton.height = "30px";
        loadButton.color = "white";
        loadButton.background = "rgba(0, 100, 200, 0.7)";
        loadButton.onPointerClickObservable.add(() => {
            this.sceneManager.loadScene(async (modelData) => {
                try {
                    const folderName = modelData.path.split('/')[0];
                    const fileName = modelData.path.split('/')[1];
                    const filePath = `${this.basePath}/${modelData.path}`;
                    
                    // Load the model
                    const result = await BABYLON.SceneLoader.ImportMeshAsync(
                        null, 
                        '', 
                        filePath, 
                        this.scene
                    );

                    if (result.meshes && result.meshes.length > 0) {
                        const rootMesh = result.meshes[0];
                        rootMesh.position = BABYLON.Vector3.FromArray(modelData.position);
                        rootMesh.rotation = BABYLON.Vector3.FromArray(modelData.rotation);
                        rootMesh.scaling = BABYLON.Vector3.FromArray(modelData.scaling);
                        
                        // Track the loaded model
                        this.sceneManager.trackModel({
                            mesh: rootMesh,
                            path: modelData.path
                        });
                        
                        // Set a name for the mesh for easier debugging
                        rootMesh.name = `model_${modelData.path.replace(/[\/\\]/g, '_')}`;
                    }
                } catch (error) {
                    console.error('Error loading model from scene:', error);
                }
            });
        });
        buttonContainer.addControl(loadButton);
    }

    /**
     * Load folders from the base path
     */
    async loadFolders() {
        try {
            // In a real implementation, you would fetch this from your server
            const folders = ["Castle", "Pirate", "Survival"];

            // Clear existing folders
            this.folderContainer.clearControls();

            // Add each folder as a button
            folders.forEach(folder => {
                const button = BABYLON.GUI.Button.CreateSimpleButton(`folder_${folder}`, folder);
                button.width = "250px";
                button.height = "40px";
                button.color = "white";
                button.background = "rgba(0, 100, 200, 0.5)";
                button.paddingTop = "10px";
                button.paddingLeft = "10px";
                button.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                button.onPointerClickObservable.add(() => this.loadFiles(folder));
                this.folderContainer.addControl(button);
            });
        } catch (error) {
            console.error("Error loading folders:", error);
        }
    }

    /**
     * Load files from a specific folder
     * @param {string} folderName - Name of the folder to load files from
     */
    async loadFiles(folderName) {
        try {
            // List of available models in each folder
            const folderContents = this.getFolderContents();
            const files = folderContents[folderName] || [];

            // Hide folder container and show file container
            this.folderContainer.isVisible = false;

            // Update folder stack for navigation
            this.folderStack.push(folderName);

            // Clear existing files
            this.fileContainer.clearControls();
            this.fileContainer.isVisible = true;

            // Add back button
            const backButton = BABYLON.GUI.Button.CreateSimpleButton("back", "← Back to Folders");
            backButton.width = "250px";
            backButton.height = "30px";
            backButton.color = "white";
            backButton.background = "rgba(100, 100, 100, 0.5)";
            backButton.onPointerClickObservable.add(() => this.showFolderView());
            this.fileContainer.addControl(backButton);

            // Add files as buttons
            files.forEach(file => {
                const button = BABYLON.GUI.Button.CreateSimpleButton(`file_${file}`, file);
                button.width = "250px";
                button.height = "30px";
                button.color = "white";
                button.background = "rgba(0, 150, 0, 0.5)";
                button.paddingTop = "5px";
                button.paddingLeft = "10px";
                button.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                button.onPointerClickObservable.add(() => this.selectFile(file));
                this.fileContainer.addControl(button);
            });
        } catch (error) {
            console.error("Error loading files:", error);
        }
    }

    /**
     * Get the contents of all folders
     * @returns {Object} Object mapping folder names to their contents
     */
    getFolderContents() {
        return {
            "Castle": [
                "bridge-draw.glb", "bridge-straight-pillar.glb", "bridge-straight.glb",
                "door.glb", "flag-banner-long.glb", "flag-banner-short.glb"
                // ... other castle files
            ],
            "Pirate": [
                "barrel.glb", "boat-row-large.glb", "boat-row-small.glb",
                "bottle-large.glb", "bottle.glb", "cannon-ball.glb"
                // ... other pirate files
            ],
            "Survival": [
                "barrel-open.glb", "barrel.glb", "bedroll-frame.glb",
                "bedroll-packed.glb", "bedroll.glb", "bottle-large.glb"
                // ... other survival files
            ]
        };
    }

    /**
     * Show the folder view and hide the file view
     */
    showFolderView() {
        this.folderContainer.isVisible = true;
        this.fileContainer.isVisible = false;
        this.folderStack = [];
    }

    /**
     * Select a file for placement
     * @param {string} fileName - Name of the file to select
     */
    selectFile(fileName) {
        this.selectedFile = fileName;
        document.body.style.cursor = 'crosshair';
        
        // Set up click handling for placing the object
        this.setupSceneClickHandling();
    }

    /**
     * Set up scene click handling for object placement and selection
     */
    setupSceneClickHandling() {
        // Remove existing observer if any
        if (this.sceneClickObserver) {
            this.scene.onPointerObservable.remove(this.sceneClickObserver);
        }

        // Create new observer for file placement and object interaction
        this.sceneClickObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            // Handle right click to clear selection
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && 
                pointerInfo.event.button === 2) {
                
                console.log('Right click detected - clearing selection');
                
                // Clear any existing selection
                if (this.selectedObject) {
                    this.clearObjectSelection();
                } 
                
                // Clear file selection if any
                if (this.selectedFile) {
                    this.selectedFile = null;
                    document.body.style.cursor = this.originalCursor;
                }
                
                // Prevent context menu
                pointerInfo.event.preventDefault();
                return false;
            }
            
            // Handle left click for object selection/placement
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
                if (this.selectedFile) {
                    // If we have a file selected, place a new object
                    const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                    if (pickResult.hit && pickResult.pickedPoint) {
                        this.placeObject(pickResult.pickedPoint, pickResult);
                    }
                } else {
                    // If no file selected, try to select an object
                    this.handleObjectSelection(pointerInfo);
                }
            }
        });
    }

    /**
     * Handle object selection
     * @param {Object} eventData - The event data containing pointer info
     */
    handleObjectSelection(eventData) {
        const pickResult = eventData.pickInfo || this.scene.pick(
            eventData.event.clientX, 
            eventData.event.clientY
        );

        // If click didn't hit anything or hit ground/water, deselect current object if any
        if (!pickResult.hit || !pickResult.pickedMesh || 
            pickResult.pickedMesh.name.toLowerCase().includes('ground') || 
            pickResult.pickedMesh.name.toLowerCase().includes('water') || 
            pickResult.pickedMesh.name.toLowerCase().includes('terrain')) {
            
            // Clear selection if we have a selected object
            if (this.selectedObject) {
                this.clearObjectSelection();
            }
            return;
        }
        
        // If we already have a selected object, clear its selection first
        if (this.selectedObject) {
            // If clicking the same object, deselect it
            if (this.selectedObject === pickResult.pickedMesh) {
                this.clearObjectSelection();
                return;
            }
            this.clearObjectSelection();
        }
        
        // Store the selected object
        this.selectedObject = pickResult.pickedMesh;
        
        // Store original materials for restoration
        if (!this.originalMaterials.has(this.selectedObject)) {
            this.originalMaterials.set(this.selectedObject, this.selectedObject.material);
        }
        
        // Highlight the selected object
        this.highlightSelectedObject();
        
        // Change cursor to indicate selection
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
            this.originalCursor = canvas.style.cursor;
            canvas.style.cursor = 'grab';
        }
    }

    /**
     * Start rotating the selected object
     * @param {Object} eventData - The event data containing pointer info
     */
    startRotation(eventData) {
        if (!this.selectedObject) {
            console.log('No object selected for rotation');
            return;
        }
        
        console.log('=== STARTING ROTATION ===');
        console.log('Selected object:', this.selectedObject.name || 'unnamed object');
        console.log('Current position:', this.selectedObject.position);
        console.log('Initial rotation (Euler):', this.selectedObject.rotation);
        console.log('Initial rotationQuaternion:', this.selectedObject.rotationQuaternion);
        
        this.isRotating = true;
        
        try {
            // Initialize rotation quaternion if it doesn't exist
            if (!this.selectedObject.rotationQuaternion) {
                // If we have euler rotation, convert it to quaternion
                if (this.selectedObject.rotation) {
                    this.selectedObject.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
                        this.selectedObject.rotation.y || 0,
                        this.selectedObject.rotation.x || 0,
                        this.selectedObject.rotation.z || 0
                    );
                } else {
                    // Start with identity quaternion
                    this.selectedObject.rotationQuaternion = new BABYLON.Quaternion();
                    this.selectedObject.rotation = new BABYLON.Vector3(0, 0, 0);
                }
            }
            
            console.log('Starting rotation with quaternion:', {
                x: this.selectedObject.rotationQuaternion.x.toFixed(4),
                y: this.selectedObject.rotationQuaternion.y.toFixed(4),
                z: this.selectedObject.rotationQuaternion.z.toFixed(4),
                w: this.selectedObject.rotationQuaternion.w.toFixed(4)
            });
            
            // Disable camera controls while rotating
            if (window.inputHandler) {
                window.inputHandler.disableCameraControls();
            }
            
            // Change cursor to indicate rotation mode
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                this.originalCursor = canvas.style.cursor || 'default';
                canvas.style.cursor = 'grabbing';
            }
            
            // Store the last pointer position
            if (eventData.event) {
                this.lastPointerX = eventData.event.clientX;
                this.lastPointerY = eventData.event.clientY;
                eventData.event.preventDefault();
                eventData.event.stopPropagation();
            }
            
        } catch (error) {
            console.error('Error in startRotation:', error);
            this.isRotating = false;
        }
    }

    /**
     * Clear the current object selection
     */
    clearObjectSelection() {
        try {
            if (this.selectedObject) {
                // Restore original material if available
                if (this.originalMaterials.has(this.selectedObject)) {
                    this.selectedObject.material = this.originalMaterials.get(this.selectedObject);
                    this.originalMaterials.delete(this.selectedObject);
                }
                
                // Clear the selection
                this.selectedObject = null;
            }
            
            // Always ensure rotation is stopped
            this.stopRotation();
            
            // Restore cursor
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas && this.originalCursor !== null) {
                canvas.style.cursor = this.originalCursor;
                this.originalCursor = null;
            }
            
        } catch (error) {
            console.error('Error clearing object selection:', error);
        }
    }

    /**
     * Highlight the currently selected object
     */
    highlightSelectedObject() {
        if (!this.selectedObject) return;
        
        // Create highlight material if it doesn't exist
        if (!this.highlightMaterial) {
            this.highlightMaterial = new BABYLON.StandardMaterial("highlight", this.scene);
            this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1.0);
            this.highlightMaterial.wireframe = true;
            this.highlightMaterial.backFaceCulling = false;
        }
        
        // Apply highlight material
        this.selectedObject.material = this.highlightMaterial;
    }

    /**
     * Handle object rotation
     * @param {number} deltaX - The horizontal movement since last frame
     */
    handleRotation(deltaX) {
        if (!this.isRotating || !this.selectedObject) {
            console.log('Not rotating - isRotating:', this.isRotating, 'selectedObject:', this.selectedObject);
            return;
        }
        
        console.log('--- ROTATION FRAME ---');
        console.log('DeltaX:', deltaX);
        
        try {
            // Initialize rotation quaternion if it doesn't exist
            if (!this.selectedObject.rotationQuaternion) {
                this.selectedObject.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
                    this.selectedObject.rotation?.y || 0,
                    this.selectedObject.rotation?.x || 0,
                    this.selectedObject.rotation?.z || 0
                );
            }
            
            // Calculate rotation amounts based on mouse movement
            const yaw = deltaX * 0.01;   // Left/right movement rotates around Y axis
            const pitch = 0;              // We can add vertical rotation later if needed
            
            console.log('Rotation deltas - Yaw:', yaw.toFixed(4), 'Pitch:', pitch.toFixed(4));
            
            // Create rotation quaternions
            const yawQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, yaw);
            const pitchQuat = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, pitch);
            
            console.log('Yaw quaternion:', {
                x: yawQuat.x.toFixed(4),
                y: yawQuat.y.toFixed(4),
                z: yawQuat.z.toFixed(4),
                w: yawQuat.w.toFixed(4)
            });
            
            // Store previous rotation for debugging
            const prevQuat = this.selectedObject.rotationQuaternion.clone();
            
            // Combine rotations (yaw first, then pitch)
            const combinedRotation = yawQuat.multiply(pitchQuat);
            
            // Apply rotation to the object
            this.selectedObject.rotationQuaternion = this.selectedObject.rotationQuaternion.multiply(combinedRotation);
            
            // Get the new rotation in Euler angles for display
            const euler = this.selectedObject.rotationQuaternion.toEulerAngles();
            
            // Update the rotation vector for display/logging
            this.selectedObject.rotation.set(euler.x, euler.y, euler.z);
            
            // Log detailed rotation information
            console.log('Previous rotation (quat):', {
                x: prevQuat.x.toFixed(4),
                y: prevQuat.y.toFixed(4),
                z: prevQuat.z.toFixed(4),
                w: prevQuat.w.toFixed(4)
            });
            
            console.log('New rotation (quat):', {
                x: this.selectedObject.rotationQuaternion.x.toFixed(4),
                y: this.selectedObject.rotationQuaternion.y.toFixed(4),
                z: this.selectedObject.rotationQuaternion.z.toFixed(4),
                w: this.selectedObject.rotationQuaternion.w.toFixed(4)
            });
            
            console.log('Euler angles (radians):', {
                x: euler.x.toFixed(4),
                y: euler.y.toFixed(4),
                z: euler.z.toFixed(4)
            });
            
            console.log('Euler angles (degrees):', {
                x: BABYLON.Tools.ToDegrees(euler.x).toFixed(1) + '°',
                y: BABYLON.Tools.ToDegrees(euler.y).toFixed(1) + '°',
                z: BABYLON.Tools.ToDegrees(euler.z).toFixed(1) + '°'
            });
            
        } catch (error) {
            console.error('Error in handleRotation:', error);
        }
    }

    /**
     * Stop rotating the selected object
     */
    stopRotation() {
        if (!this.isRotating) return;
        
        console.log('=== STOPPING ROTATION ===');
        if (this.selectedObject) {
            const euler = this.selectedObject.rotationQuaternion ? 
                this.selectedObject.rotationQuaternion.toEulerAngles() : 
                this.selectedObject.rotation;
                
            console.log('Final rotation (degrees):', {
                x: BABYLON.Tools.ToDegrees(euler.x).toFixed(1) + '°',
                y: BABYLON.Tools.ToDegrees(euler.y).toFixed(1) + '°',
                z: BABYLON.Tools.ToDegrees(euler.z).toFixed(1) + '°'
            });
        }
        
        this.isRotating = false;
        
        // Restore cursor style
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas && this.originalCursor !== null) {
            canvas.style.cursor = this.originalCursor || 'default';
            this.originalCursor = null;
        }
        
        try {
            // Restore cursor if we're not in a selection state
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas && this.originalCursor !== null) {
                canvas.style.cursor = this.originalCursor;
                this.originalCursor = null;
            }
            
            // Always try to re-enable camera controls
            if (window.inputHandler) {
                window.inputHandler.enableCameraControls();
            }
            
        } catch (error) {
            console.error('Error stopping rotation:', error);
        } finally {
            // Clear rotation state but keep the current rotation
            this.originalRotation = null;
        }
        
        console.log('Rotation stopped');
    }
    
    /**
     * Place an object at the specified position
     * @param {BABYLON.Vector3} position - The position to place the object at
     * @param {BABYLON.PickingInfo} pickInfo - The picking info from the scene
     */
    placeObject(position, pickInfo) {
        if (!this.selectedFile) return;
        
        try {
            // Create a simple box as a placeholder for the selected file
            const box = BABYLON.MeshBuilder.CreateBox(this.selectedFile, {
                width: 2,
                height: 2,
                depth: 2
            }, this.scene);
            
            // Position the box at the clicked point
            box.position = position.clone();
            
            // Add some physics to make it interactable
            box.physicsImpostor = new BABYLON.PhysicsImpostor(
                box, 
                BABYLON.PhysicsImpostor.BoxImpostor, 
                { mass: 1, restitution: 0.7 }, 
                this.scene
            );
            
            // Make the box pickable
            box.isPickable = true;
            
            // Store the box as the selected object
            this.selectedObject = box;
            
            // Store original material for highlighting
            this.originalMaterials.set(box, box.material);
            
            // Highlight the new object
            this.highlightSelectedObject();
            
            // Change cursor to indicate selection
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                this.originalCursor = canvas.style.cursor || 'default';
                canvas.style.cursor = 'grab';
            }
            
            // Clear the file selection
            this.selectedFile = null;
            document.body.style.cursor = this.originalCursor;
            
        } catch (error) {
            console.error('Error placing object:', error);
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Remove event observers
        if (this.sceneClickObserver) {
            this.scene.onPointerObservable.remove(this.sceneClickObserver);
        }
        
        // Clean up GUI
        if (this.advancedTexture) {
            this.advancedTexture.dispose();
        }
        
        // Clear references
        this.selectedObject = null;
        this.originalMaterials.clear();
    }
}

export { AssetBrowser };
