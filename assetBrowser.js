/**
 * Asset Browser GUI Component
 * Displays a list of folders in Assets/3D and their contents when clicked
 */

class AssetBrowser {
    /**
     * Create a new AssetBrowser
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {string} basePath - Base path for assets (default: 'Assets/3D')
     */
    constructor(scene, basePath = 'Assets/3D') {
        this.scene = scene;
        this.basePath = basePath;
        this.guiTexture = null;
        this.advancedTexture = null;
        this.folderContainer = null;
        this.fileContainer = null;
        this.folderStack = [];
        this.selectedFile = null;
        this.originalCursor = 'default';
        this.sceneClickObserver = null;
        this.placedModels = []; // Track placed models for saving/loading
        this.selectedObject = null; // Currently selected object
        this.highlightMaterial = null; // Material for highlighting selected objects
        this.originalMaterials = new Map(); // Store original materials of selected objects
        this.isRotating = false; // Track if we're currently rotating an object
        this.lastPointerX = 0; // For tracking mouse movement
        this.rotationSpeed = 0.01; // Speed of rotation
        this.camera = scene.activeCamera; // Store reference to the camera
        this.cameraControlsEnabled = true; // Track if camera controls are enabled
        
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
     * Load folders from the base path
     */
    async loadFolders() {
        try {
            // In a real implementation, you would fetch this from your server
            // For now, we'll use the folders we found earlier
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
            const folderContents = {
                "Castle": [
                    "bridge-draw.glb",
                    "bridge-straight-pillar.glb",
                    "bridge-straight.glb",
                    "door.glb",
                    "flag-banner-long.glb",
                    "flag-banner-short.glb",
                    "flag-pennant.glb",
                    "flag-wide.glb",
                    "flag.glb",
                    "gate.glb",
                    "ground-hills.glb",
                    "ground.glb",
                    "metal-gate.glb",
                    "rocks-large.glb",
                    "rocks-small.glb",
                    "siege-ballista-demolished.glb",
                    "siege-ballista.glb",
                    "siege-catapult-demolished.glb",
                    "siege-catapult.glb",
                    "siege-ram-demolished.glb",
                    "siege-ram.glb",
                    "siege-tower-demolished.glb",
                    "siege-tower.glb",
                    "siege-trebuchet-demolished.glb",
                    "siege-trebuchet.glb",
                    "stairs-stone-square.glb",
                    "stairs-stone.glb",
                    "tower-base.glb",
                    "tower-hexagon-base.glb",
                    "tower-hexagon-mid.glb",
                    "tower-hexagon-roof-secondary.glb",
                    "tower-hexagon-roof.glb",
                    "tower-hexagon-top-wood.glb",
                    "tower-hexagon-top.glb",
                    "tower-slant-roof.glb",
                    "tower-square-arch.glb",
                    "tower-square-base-border.glb",
                    "tower-square-base-color.glb",
                    "tower-square-base.glb",
                    "tower-square-mid-color.glb",
                    "tower-square-mid-door.glb",
                    "tower-square-mid-open-simple.glb",
                    "tower-square-mid-open.glb",
                    "tower-square-mid-windows.glb",
                    "tower-square-mid.glb",
                    "tower-square-roof.glb",
                    "tower-square-top-color.glb"
                ],
                "Pirate": [
                    "barrel.glb",
                    "boat-row-large.glb",
                    "boat-row-small.glb",
                    "bottle-large.glb",
                    "bottle.glb",
                    "cannon-ball.glb",
                    "cannon-mobile.glb",
                    "cannon.glb",
                    "chest.glb",
                    "crate-bottles.glb",
                    "crate.glb",
                    "flag-high-pennant.glb",
                    "flag-high.glb",
                    "flag-pennant.glb",
                    "flag-pirate-high-pennant.glb",
                    "flag-pirate-high.glb",
                    "flag-pirate-pennant.glb",
                    "flag-pirate.glb",
                    "flag.glb",
                    "grass-patch.glb",
                    "grass-plant.glb",
                    "grass.glb",
                    "hole.glb",
                    "palm-bend.glb",
                    "palm-detailed-bend.glb",
                    "palm-detailed-straight.glb",
                    "palm-straight.glb",
                    "patch-grass-foliage.glb",
                    "patch-grass.glb",
                    "patch-sand-foliage.glb",
                    "patch-sand.glb",
                    "platform-planks.glb",
                    "platform.glb",
                    "rocks-a.glb",
                    "rocks-b.glb",
                    "rocks-c.glb",
                    "rocks-sand-a.glb",
                    "rocks-sand-b.glb",
                    "rocks-sand-c.glb",
                    "ship-ghost.glb",
                    "ship-large.glb",
                    "ship-medium.glb",
                    "ship-pirate-large.glb",
                    "ship-pirate-medium.glb",
                    "ship-pirate-small.glb",
                    "ship-small.glb",
                    "ship-wreck.glb",
                    "structure-fence-sides.glb",
                    "structure-fence.glb"
                ],
                "Survival": [
                    "barrel-open.glb",
                    "barrel.glb",
                    "bedroll-frame.glb",
                    "bedroll-packed.glb",
                    "bedroll.glb",
                    "bottle-large.glb",
                    "bottle.glb",
                    "box-large-open.glb",
                    "box-large.glb",
                    "box-open.glb",
                    "box.glb",
                    "bucket.glb",
                    "campfire-fishing-stand.glb",
                    "campfire-pit.glb",
                    "campfire-stand.glb",
                    "chest.glb",
                    "fence-doorway.glb",
                    "fence-fortified.glb",
                    "fence.glb",
                    "fish-large.glb",
                    "fish.glb",
                    "floor-hole.glb",
                    "floor-old.glb",
                    "floor.glb",
                    "grass-large.glb",
                    "grass.glb",
                    "metal-panel-narrow.glb",
                    "metal-panel-screws-half.glb",
                    "metal-panel-screws-narrow.glb",
                    "metal-panel-screws.glb",
                    "metal-panel.glb",
                    "patch-grass-large.glb",
                    "patch-grass.glb",
                    "resource-planks.glb",
                    "resource-stone-large.glb",
                    "resource-stone.glb",
                    "resource-wood.glb",
                    "rock-a.glb",
                    "rock-b.glb",
                    "rock-c.glb",
                    "rock-flat-grass.glb",
                    "rock-flat.glb",
                    "rock-sand-a.glb",
                    "rock-sand-b.glb",
                    "rock-sand-c.glb",
                    "signpost-single.glb",
                    "signpost.glb",
                    "structure-canvas.glb",
                    "structure-floor.glb"
                ]
            };
            
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
            backButton.marginBottom = "10px";
            backButton.onPointerClickObservable.add(() => {
                this.folderStack.pop();
                // Show folders and hide files when going back
                this.folderContainer.isVisible = true;
                this.fileContainer.isVisible = false;
            });
            this.fileContainer.addControl(backButton);
            
            // Add folder name as header
            const folderHeader = new BABYLON.GUI.TextBlock();
            folderHeader.text = folderName;
            folderHeader.color = "white";
            folderHeader.height = "30px";
            folderHeader.fontSize = "18px";
            folderHeader.paddingBottom = "10px";
            this.fileContainer.addControl(folderHeader);
            
            // Add files
            const files = folderContents[folderName] || [];
            files.forEach(file => {
                const fileButton = BABYLON.GUI.Button.CreateSimpleButton(`file_${file}`, file);
                fileButton.width = "250px";
                fileButton.height = "30px";
                fileButton.color = "lightgray";
                fileButton.background = "rgba(50, 50, 50, 0.5)";
                fileButton.paddingLeft = "20px";
                fileButton.marginBottom = "5px";
                fileButton.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                fileButton.onPointerClickObservable.add(() => this.selectFile(file));
                
                this.fileContainer.addControl(fileButton);
            });
            
        } catch (error) {
            console.error(`Error loading files from ${folderName}:`, error);
        }
    }
    
    /**
     * Select a file for placement
     * @param {string} filePath - Path to the selected file
     */
    selectFile(filePath) {
        this.selectedFile = filePath;
        this.originalCursor = document.body.style.cursor || 'default';
        document.body.style.cursor = "crosshair";
        
        // Clear any existing selection
        this.clearObjectSelection();
        
        // Remove existing observer if any
        if (this.sceneClickObserver) {
            this.scene.onPointerObservable.remove(this.sceneClickObserver);
        }
        
        // Create new observer for file placement
        this.sceneClickObserver = this.scene.onPointerObservable.add((pointerInfo) => {
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
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 2) { // Right click
                    this.clearSelection();
                } else if (pointerInfo.event.button === 0) { // Left click
                    // Start rotation on left click and drag
                    this.startRotation(pointerInfo);
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                // Handle rotation
                this.handleRotation(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                // Stop rotation
                this.stopRotation();
            }
        });
    }
    
    /**
     * Clear the current file selection
     */
    clearSelection() {
        this.selectedFile = null;
        document.body.style.cursor = this.originalCursor;
        this.clearObjectSelection();

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
backButton.marginBottom = "10px";
backButton.onPointerClickObservable.add(() => {
this.folderStack.pop();
// Show folders and hide files when going back
this.folderContainer.isVisible = true;
this.fileContainer.isVisible = false;
});
this.fileContainer.addControl(backButton);

// Add folder name as header
const folderHeader = new BABYLON.GUI.TextBlock();
folderHeader.text = folderName;
folderHeader.color = "white";
folderHeader.height = "30px";
folderHeader.fontSize = "18px";
folderHeader.paddingBottom = "10px";
this.fileContainer.addControl(folderHeader);

// Add files
const files = folderContents[folderName] || [];
files.forEach(file => {
const fileButton = BABYLON.GUI.Button.CreateSimpleButton(`file_${file}`, file);
fileButton.width = "250px";
fileButton.height = "30px";
fileButton.color = "lightgray";
fileButton.background = "rgba(50, 50, 50, 0.5)";
fileButton.paddingLeft = "20px";
fileButton.marginBottom = "5px";
fileButton.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
fileButton.onPointerClickObservable.add(() => this.selectFile(file));

this.fileContainer.addControl(fileButton);
});

} catch (error) {
console.error(`Error loading files from ${folderName}:`, error);
}

/**
* Select a file for placement
* @param {string} filePath - Path to the selected file
*/
selectFile(filePath) {
this.selectedFile = filePath;
this.originalCursor = document.body.style.cursor || 'default';
document.body.style.cursor = "crosshair";

// Clear any existing selection
this.clearObjectSelection();

// Remove existing observer if any
if (this.sceneClickObserver) {
this.scene.onPointerObservable.remove(this.sceneClickObserver);
}

// Create new observer for file placement
this.sceneClickObserver = this.scene.onPointerObservable.add((pointerInfo) => {
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
} else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
if (pointerInfo.event.button === 2) { // Right click
this.clearSelection();
} else if (pointerInfo.event.button === 0) { // Left click
// Start rotation on left click and drag
this.startRotation(pointerInfo);
}
} else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
// Handle rotation
this.handleRotation(pointerInfo);
} else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
// Stop rotation
this.stopRotation();
}
});
}

/**
* Clear the current file selection
*/
clearSelection() {
this.selectedFile = null;
document.body.style.cursor = this.originalCursor;
this.clearObjectSelection();
}

/**
* Clear the currently selected object
*/
    /**
     * Clear the currently selected object
     */
    clearObjectSelection() {
        if (this.selectedObject) {
            // Restore original materials
            const originalMaterials = this.originalMaterials.get(this.selectedObject);
            if (originalMaterials) {
                const meshes = this.selectedObject.getChildMeshes();
                meshes.forEach(mesh => {
                    if (mesh.material && originalMaterials.has(mesh.uniqueId)) {
                        mesh.material.dispose(); // Dispose the highlight material
                        mesh.material = originalMaterials.get(mesh.uniqueId);
                    }
                });
                this.originalMaterials.delete(this.selectedObject);
            }
            this.selectedObject = null;

            // Re-enable camera controls when no object is selected
            this.enableCameraControls();
        }
        document.body.style.cursor = this.originalCursor;
    }

/**
* Enable camera controls
*/
    /**
     * Enable camera controls
     */
    enableCameraControls() {
        if (this.camera && !this.cameraControlsEnabled) {
            try {
                this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
                this.camera.inputs.attached.keyboard.attachControl();
                this.camera.inputs.attached.pointers.attachControl(this.scene.getEngine().getRenderingCanvas());
                this.cameraControlsEnabled = true;
                console.log("Camera controls enabled");
            } catch (error) {
                console.error("Error enabling camera controls:", error);
            }
        }
    }

/**
* Disable camera controls
*/
    /**
     * Disable camera controls
     */
    disableCameraControls() {
        if (this.camera && this.cameraControlsEnabled) {
            try {
                this.camera.detachControl(this.scene.getEngine().getRenderingCanvas());
                this.camera.inputs.attached.keyboard.detachControl();
                this.camera.inputs.attached.pointers.detachControl();
                this.cameraControlsEnabled = false;
                console.log("Camera controls disabled");
            } catch (error) {
                console.error("Error disabling camera controls:", error);
            }
        }
    }

/**
* Handle object selection
* @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
*/
    /**
     * Handle object selection
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    handleObjectSelection(pointerInfo) {
        // Only handle object selection when no file is selected
        if (this.selectedFile) return;

        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

        if (pickResult.hit && pickResult.pickedMesh) {
            // Find the root node of the clicked mesh
            let rootNode = pickResult.pickedMesh;
            while (rootNode.parent && rootNode.parent !== this.scene) {
                rootNode = rootNode.parent;
            }
            
            // Skip if we picked a GUI element or other non-mesh objects
            if (!(rootNode instanceof BABYLON.Mesh || rootNode instanceof BABYLON.TransformNode)) {
                return;
            }
            
            // If we already have this object selected, deselect it
            if (this.selectedObject === rootNode) {
                this.clearObjectSelection();
                return;
            }
            
            // Clear previous selection and select the new object
            this.clearObjectSelection();
            this.selectedObject = rootNode;
            
            // Disable camera controls when an object is selected
            this.disableCameraControls();
            
            // Apply highlight material
            if (!this.highlightMaterial) {
                this.highlightMaterial = new BABYLON.StandardMaterial("highlight", this.scene);
                this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1.0);
                this.highlightMaterial.wireframe = true;
                this.highlightMaterial.backFaceCulling = false;
            }
            
            // Store original materials and apply highlight
            const originalMaterials = new Map();
            const meshes = this.selectedObject.getChildMeshes();
            meshes.forEach(mesh => {
                if (mesh.material) {
                    originalMaterials.set(mesh.uniqueId, mesh.material);
                    const highlightClone = this.highlightMaterial.clone(`highlight_${mesh.uniqueId}`);
                    mesh.material = highlightClone;
                }
            });
            
            if (originalMaterials.size > 0) {
                this.originalMaterials.set(this.selectedObject, originalMaterials);
            } else {
                this.selectedObject = null;
            }
        } else {
            this.clearObjectSelection();
        }
    }

    /**
* Start rotating the selected object
* @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
*/
startRotation(pointerInfo) {
if (this.selectedObject) {
this.isRotating = true;
this.lastPointerX = pointerInfo.event.clientX;
document.body.style.cursor = 'grabbing';
}
}

/**
* Handle object rotation
* @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
*/
handleRotation(pointerInfo) {
if (this.isRotating && this.selectedObject) {
const deltaX = pointerInfo.event.clientX - this.lastPointerX;
this.selectedObject.rotation.y += deltaX * this.rotationSpeed;
this.lastPointerX = pointerInfo.event.clientX;
}
}

/**
* Stop rotating the object
*/
stopRotation() {
this.isRotating = false;
document.body.style.cursor = this.originalCursor;
}

/**
* Place the selected object at the specified position
* @param {BABYLON.Vector3} position - Position to place the object
*/
async placeObject(position, pickInfo = null) {
if (!this.selectedFile) return;

// Default to centering if no pick info is provided
const useSidePlacement = true;
let sideOffset = new BABYLON.Vector3(0, 0, 0);
let normal = new BABYLON.Vector3(0, 1, 0); // Default to up vector
let debugSphere = null; // Will hold reference to the debug sphere if created
let calculateSideOffset = false; // Flag to calculate side offset after model load

if (useSidePlacement) {
// Get the normal of the clicked face
normal = pickInfo.getNormal();

// Find which axis is most aligned with the normal (dominant face)

const absNormal = new BABYLON.Vector3(
Math.abs(normal.x),
Math.abs(normal.y),
Math.abs(normal.z)
);

// Get the dominant axis (0=x, 1=y, 2=z)

let dominantAxis = 0;
if (absNormal.y > absNormal.x && absNormal.y > absNormal.z) dominantAxis = 1;
else if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) dominantAxis = 2;

// We'll calculate the exact offset after loading the model
// For now, just use a small offset to indicate side placement
sideOffset = normal.scale(0.1); // Small initial offset, will be updated later
calculateSideOffset = true; // Flag to calculate proper offset after model load

console.log('=== Side Placement Debug ===');
console.log('Normal:', normal.toString());
console.log('Normal (abs):', absNormal.toString());
console.log('Dominant axis:', ['X', 'Y', 'Z'][dominantAxis]);
console.log('Picked point:', pickInfo.pickedPoint.toString());
console.log('Side offset:', sideOffset.toString());
console.log('============================');
}

        try {
            // The selected file is just the filename, and folder is in folderStack
            const fileName = this.selectedFile;
            const folderName = this.folderStack[this.folderStack.length - 1];
            const modelName = fileName.split('.')[0];

            // Construct the correct path - relative to the web root
            const filePath = `Assets/3D/${folderName}/${fileName}`;

            console.log(`Loading model from: ${filePath}`);
            console.log(`Full path: ${window.location.origin}/${filePath}`);

            // Create a debug sphere at the click position
            const debugSphere = BABYLON.MeshBuilder.CreateSphere('debugSphere', {diameter: 0.5}, this.scene);
            if (debugSphere) {
                debugSphere.position = position.clone();
                debugSphere.material = new BABYLON.StandardMaterial('debugMat', this.scene);
                debugSphere.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
                debugSphere.material.alpha = 0.5;
            }


            // Load the model
            console.log('Starting model load...');

            // First, import the meshes without adding them to the scene
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                null, 
                '', 
                filePath, 
                this.scene,
                (progress) => {
                    console.log(`Loading progress: ${progress.loaded}/${progress.total} (${progress.lengthComputable ? progress.loaded / progress.total * 100 : '?'}%)`);
                },
                ".glb"
            );

            console.log('Model load complete', result);

            if (!result || !result.meshes || result.meshes.length === 0) {
                throw new Error("No meshes were loaded");
            }

            // Create a root transform node to hold all meshes
            const rootNode = new BABYLON.TransformNode(`model_${Date.now()}`, this.scene);
            rootNode.position = position.clone();

            // Parent all meshes to the root node
            result.meshes.forEach(mesh => {
                if (!mesh.parent) {
                    mesh.parent = rootNode;
                }
            });

            // Get all meshes that don't have children (leaf nodes)
            const leafMeshes = result.meshes.filter(mesh => mesh.getChildMeshes().length === 0);

            if (leafMeshes.length === 0) {
                throw new Error("No valid meshes found in the model");
            }

            // Create a bounding box that encompasses all meshes
            const boundingInfo = leafMeshes[0].getBoundingInfo();
            const min = boundingInfo.minimum.clone();
            const max = boundingInfo.maximum.clone();

            // Clear previous selection
            this.clearObjectSelection();

            // Select the new object
            this.selectedObject = rootNode;

            // Create highlight material if it doesn't exist
            if (!this.highlightMaterial) {
                this.highlightMaterial = new BABYLON.StandardMaterial("highlight", this.scene);
                this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1.0);
                this.highlightMaterial.specularPower = 10;
                this.highlightMaterial.alpha = 1.0; // Fully opaque
                this.highlightMaterial.wireframe = true; // Use wireframe for better visibility
                this.highlightMaterial.backFaceCulling = false;
                // Add a slight glow effect
                this.highlightMaterial.emissiveIntensity = 0.8;
                this.highlightMaterial.useEmissiveAsIllumination = true;
            }

            // Store original materials and apply highlight
            const meshes = this.selectedObject.getChildMeshes();
            const originalMaterials = new Map();

            meshes.forEach((mesh) => {
                if (mesh.material) {
                    // Store a reference to the original material
                    originalMaterials.set(mesh.uniqueId, mesh.material);
                    
                    // Create a clone of the highlight material for this mesh
                    const highlightClone = this.highlightMaterial.clone(`highlight_${mesh.uniqueId}`);
                    
                    // Apply the highlight material
                    mesh.material = highlightClone;
                }
            });

            // Store the mapping of mesh IDs to original materials
            if (originalMaterials.size > 0) {
                this.originalMaterials.set(this.selectedObject, originalMaterials);
            } else {
                // If no materials were replaced, clear the selection
                this.selectedObject = null;
            }

            // Track the newly placed model
            this.trackModel(rootNode);

            // Clean up debug sphere if it exists
            if (debugSphere) {
                debugSphere.dispose();
            }
        } catch (error) {
            console.error('Error placing object:', error);
            // Re-enable camera controls if there was an error
            this.enableCameraControls();
        }
        } else {
            // Clicked on empty space, clear selection
            this.clearObjectSelection();
        }
    }
    
    /**
     * Start rotating the selected object
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    startRotation(pointerInfo) {
        if (this.selectedObject) {
            this.isRotating = true;
            this.lastPointerX = pointerInfo.event.clientX;
            document.body.style.cursor = 'grabbing';
        }
    }
    
    /**
     * Handle object rotation
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    handleRotation(pointerInfo) {
        if (this.isRotating && this.selectedObject) {
            const deltaX = pointerInfo.event.clientX - this.lastPointerX;
            this.selectedObject.rotation.y += deltaX * this.rotationSpeed;
            this.lastPointerX = pointerInfo.event.clientX;
        }
    }
    
    /**
     * Stop rotating the object
     */
    stopRotation() {
        this.isRotating = false;
        document.body.style.cursor = this.originalCursor;
    }
    
    /**
     * Place the selected object at the specified position
     * @param {BABYLON.Vector3} position - Position to place the object
     */
    /**
     * Place the selected object at the specified position
     * @param {BABYLON.Vector3} position - Position to place the object
     * @param {BABYLON.PickingInfo} pickInfo - Information about the picked point
     */
    async placeObject(position, pickInfo = null) {
        if (!this.selectedFile) return;
        
        // Default to centering if no pick info is provided
        const useSidePlacement = true;
        let sideOffset = new BABYLON.Vector3(0, 0, 0);
        let normal = new BABYLON.Vector3(0, 1, 0); // Default to up vector
        let debugSphere = null; // Will hold reference to the debug sphere if created
        let calculateSideOffset = false; // Flag to calculate side offset after model load
        
        if (useSidePlacement && pickInfo) {
            try {
                // Get the normal of the clicked face
                normal = pickInfo.getNormal(true);
                
                // Find which axis is most aligned with the normal (dominant face)
                const absNormal = new BABYLON.Vector3(
                    Math.abs(normal.x),
                    Math.abs(normal.y),
                    Math.abs(normal.z)
                );
                
                // Get the dominant axis (0=x, 1=y, 2=z)
                let dominantAxis = 0;
                if (absNormal.y > absNormal.x && absNormal.y > absNormal.z) dominantAxis = 1;
                else if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) dominantAxis = 2;
                
                // We'll calculate the exact offset after loading the model
                // For now, just use a small offset to indicate side placement
                sideOffset = normal.scale(0.1); // Small initial offset, will be updated later
                calculateSideOffset = true; // Flag to calculate proper offset after model load
                
                if (console && console.log) {
                    console.log('=== Side Placement Debug ===');
                    console.log('Normal:', normal.toString());
                    console.log('Normal (abs):', absNormal.toString());
                    console.log('Dominant axis:', ['X', 'Y', 'Z'][dominantAxis]);
                    if (pickInfo.pickedPoint) {
                        console.log('Picked point:', pickInfo.pickedPoint.toString());
                    }
                    console.log('Side offset:', sideOffset.toString());
                    console.log('============================');
                }
            } catch (error) {
                console.warn('Error calculating side placement:', error);
                // Continue with default placement if there's an error
                useSidePlacement = false;
            }
        }
        
        try {
            // The selected file is just the filename, and folder is in folderStack
            const fileName = this.selectedFile;
            const folderName = this.folderStack[this.folderStack.length - 1];
            const modelName = fileName.split('.')[0];
            
  
            
            // Construct the correct path - relative to the web root
            const filePath = `Assets/3D/${folderName}/${fileName}`;
            
            console.log(`Loading model from: ${filePath}`);
            console.log(`Full path: ${window.location.origin}/${filePath}`);
            
            // Create a debug sphere at the click position
            debugSphere = BABYLON.MeshBuilder.CreateSphere('debugSphere', {diameter: 0.5}, this.scene);
            if (debugSphere) {
                debugSphere.position = position.clone();
                debugSphere.material = new BABYLON.StandardMaterial('debugMat', this.scene);
                debugSphere.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
                debugSphere.material.alpha = 0.5;
            }
            
            // Create a container for the model
            const container = new BABYLON.TransformNode(`model_${Date.now()}`, this.scene);
            container.position = position.clone();
            
            // Load the model
            console.log('Starting model load...');
            
            // First, import the meshes without adding them to the scene
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                null, 
                '', 
                filePath, 
                this.scene,
                (progress) => {
                    console.log(`Loading progress: ${progress.loaded}/${progress.total} (${progress.lengthComputable ? progress.loaded / progress.total * 100 : '?'}%)`);
                },
                ".glb"
            );
            
            console.log('Model load complete', result);
            
            if (!result || !result.meshes || result.meshes.length === 0) {
                throw new Error("No meshes were loaded");
            }
            
            // Create a root transform node to hold all meshes
            const rootNode = new BABYLON.TransformNode(`model_${Date.now()}`, this.scene);
            rootNode.position = position.clone();
            
            // Parent all meshes to the root node
            result.meshes.forEach(mesh => {
                if (!mesh.parent) {
                    mesh.parent = rootNode;
                }
            });
            
            // Get all meshes that don't have children (leaf nodes)
            const leafMeshes = result.meshes.filter(mesh => mesh.getChildMeshes().length === 0);
            
            if (leafMeshes.length === 0) {
                throw new Error("No valid meshes found in the model");
            }
            
            // Create a bounding box that encompasses all meshes
            const boundingInfo = leafMeshes[0].getBoundingInfo();
            let min = boundingInfo.minimum.clone();
            let max = boundingInfo.maximum.clone();
            
            for (let i = 1; i < leafMeshes.length; i++) {
                const meshInfo = leafMeshes[i].getBoundingInfo();
                min = BABYLON.Vector3.Minimize(min, meshInfo.minimum);
                max = BABYLON.Vector3.Maximize(max, meshInfo.maximum);
                
                
            }
            
            const size = new BABYLON.Vector3(
                max.x - min.x,
                max.y - min.y,
                max.z - min.z
            );
            
            console.log('Model dimensions:', size.toString());
            
            
            // Calculate the model's pivot point based on the side being placed on
            let pivotPoint = new BABYLON.Vector3(0, 0, 0);
            
            if (useSidePlacement) {
                // For side placement, calculate pivot based on normal direction
                const pivotX = normal.x > 0 ? min.x : (normal.x < 0 ? max.x : (min.x + max.x) / 2);
                const pivotY = normal.y > 0 ? min.y : (normal.y < 0 ? max.y : (min.y + max.y) / 2);
                const pivotZ = normal.z > 0 ? min.z : (normal.z < 0 ? max.z : (min.z + max.z) / 2);
                
                pivotPoint = new BABYLON.Vector3(-pivotX, pivotY, pivotZ);

            } 
            
            // Keep original scale (1:1)
            rootNode.scaling = new BABYLON.Vector3(1, 1, 1);
            
            // Calculate the offset needed to position the pivot point at the clicked position
            const offset = pivotPoint.negate();
            
            // Calculate the final position with offset (no scale applied to offset)
            let finalPosition = position.add(offset).add(sideOffset);
            
            // Snap to nearest integer on all axes
            finalPosition = new BABYLON.Vector3(
                Math.round(finalPosition.x),
                Math.round(finalPosition.y),
                Math.round(finalPosition.z)
            );
            
            // Apply the final position
            rootNode.position = finalPosition;
            
            // Track the placed model
            this.trackModel({
                mesh: rootNode,
                path: filePath
            });
            
            console.log(`Successfully loaded model: ${fileName} at`, rootNode.position.toString());
            
            // Create pop-in animation
            const popInAnimation = new BABYLON.Animation(
                'popInAnimation',
                'scaling',
                30, // frame rate
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // Animation keyframes
            const keyFrames = [];
            keyFrames.push({
                frame: 0,
                value: new BABYLON.Vector3(0.1, 0.1, 0.1) // Start small
            });
            keyFrames.push({
                frame: 5,
                value: new BABYLON.Vector3(1.2, 1.2, 1.2) // Slightly overshoot
            });
            keyFrames.push({
                frame: 10,
                value: new BABYLON.Vector3(1, 1, 1) // Settle to normal size
            });
            
            // Add keyframes to animation
            popInAnimation.setKeys(keyFrames);
            
            // Create an easing function for bouncy effect
            const easingFunction = new BABYLON.BackEase();
            easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
            popInAnimation.setEasingFunction(easingFunction);
            
            // Run the animation
            rootNode.animations = [popInAnimation];
            this.scene.beginAnimation(rootNode, 0, 10, false, 0.5);
            
            // Make sure all meshes are visible
            result.meshes.forEach(mesh => {
                mesh.isVisible = true;
                mesh.isPickable = true;
            });
            
            // Add a small highlight effect to the root node
            const originalScale = rootNode.scaling.clone();
            const highlightScale = new BABYLON.Vector3(
                originalScale.x * 1.2,
                originalScale.y * 1.2,
                originalScale.z * 1.2
            );
            rootNode.scaling = highlightScale;
            
            // Remove debug sphere and reset scale after delay
            setTimeout(() => {
                rootNode.scaling = originalScale;
                if (debugSphere && !debugSphere.isDisposed()) {
                    debugSphere.dispose();
                }
            }, 500);
        } catch (error) {
            console.error("Error loading model:", error);
            
            // Fallback to a simple shape if model loading fails
            const fallbackMesh = BABYLON.MeshBuilder.CreateBox("fallback", { size: 2 }, this.scene);
            fallbackMesh.position = position;
            fallbackMesh.checkCollisions = true;
            
            const mat = new BABYLON.StandardMaterial("fallbackMat", this.scene);
            mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            fallbackMesh.material = mat;
        }
    }
    
    dispose() {
        if (this.sceneClickObserver) {
            this.scene.onPointerObservable.remove(this.sceneClickObserver);
        }
        this.clearSelection();
        
        // Clean up highlight material
        if (this.highlightMaterial) {
            this.highlightMaterial.dispose();
            this.highlightMaterial = null;
        }
        
        // Clear original materials map
        this.originalMaterials.clear();
    }
    
    /**
     * Add Save and Load buttons to the UI
     */
    addSaveLoadButtons() {
        // Create button container
        const buttonContainer = new BABYLON.GUI.StackPanel();
        buttonContainer.isVertical = false;
        buttonContainer.width = "280px";
        buttonContainer.height = "40px";
        buttonContainer.paddingTop = "10px";
        
        // Save button
        const saveButton = BABYLON.GUI.Button.CreateSimpleButton("saveButton", "Save Scene");
        saveButton.width = "120px";
        saveButton.height = "30px";
        saveButton.background = "green";
        saveButton.color = "white";
        saveButton.onPointerClickObservable.add(() => this.saveScene());
        
        // Load button
        const loadButton = BABYLON.GUI.Button.CreateSimpleButton("loadButton", "Load Scene");
        loadButton.width = "120px";
        loadButton.height = "30px";
        loadButton.background = "blue";
        loadButton.color = "white";
        loadButton.paddingLeft = "10px";
        loadButton.onPointerClickObservable.add(() => this.loadScene());
        
        // Add buttons to container
        buttonContainer.addControl(saveButton);
        buttonContainer.addControl(loadButton);
        this.container.addControl(buttonContainer);
    }
    
    /**
     * Save the current scene state to a JSON file
     */
    saveScene() {
        const sceneData = {
            models: this.placedModels.map(model => {
                // Extract folder and filename from the path
                const pathParts = model.path.split('/');
                const fileName = pathParts.pop();
                const folderName = pathParts.pop() || 'default';
                
                return {
                    path: `${folderName}/${fileName}`, // Store as 'folder/filename.glb'
                    position: model.mesh.position.asArray(),
                    rotation: model.mesh.rotation.asArray(),
                    scaling: model.mesh.scaling.asArray()
                };
            }),
            metadata: {
                savedAt: new Date().toISOString(),
                modelCount: this.placedModels.length,
                format: '1.0'
            }
        };
        
        // Create a download link
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sceneData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `scene_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        console.log('Scene saved successfully');
    }
    
    /**
     * Load a scene from a JSON file
     */
    loadScene() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const content = await file.text();
                const sceneData = JSON.parse(content);
                
                // Clear existing models
                this.clearScene();
                
                // Load each model from the scene data
                for (const modelData of sceneData.models) {
                    try {
                        // Extract folder and filename from the saved path
                        const pathParts = modelData.path.split('/');
                        const fileName = pathParts.pop();
                        const folderName = pathParts.pop();
                        
                        if (!fileName || !folderName) {
                            console.warn('Invalid model path:', modelData.path);
                            continue;
                        }
                        
                        // Store the folder and file for placement
                        this.folderStack = [folderName];
                        this.selectedFile = fileName;
                        
                        console.log(`Loading model: ${folderName}/${fileName}`);
                        
                        // Create a mock pick info with the saved position
                        const pickInfo = {
                            pickedPoint: BABYLON.Vector3.FromArray(modelData.position),
                            getNormal: () => new BABYLON.Vector3(0, 1, 0) // Default up normal
                        };
                        
                        // Place the model
                        await this.placeObject(pickInfo.pickedPoint, pickInfo);
                        
                        // Apply saved transformations to the last placed model
                        if (this.placedModels.length > 0) {
                            const placedModel = this.placedModels[this.placedModels.length - 1];
                            if (placedModel && placedModel.mesh) {
                                placedModel.mesh.position = BABYLON.Vector3.FromArray(modelData.position);
                                placedModel.mesh.rotation = BABYLON.Vector3.FromArray(modelData.rotation);
                                placedModel.mesh.scaling = BABYLON.Vector3.FromArray(modelData.scaling);
                            }
                        }
                    } catch (modelError) {
                        console.error('Error loading model:', modelError);
                        // Continue with next model even if one fails
                    }
                }
                
                console.log(`Loaded scene with ${sceneData.models.length} models`);
                this.clearSelection(); // Clear any file selection after loading
            } catch (error) {
                console.error('Error loading scene:', error);
                alert('Failed to load scene. Please check the console for details.');
            }
        };
        
        input.click();
    }
    
    /**
     * Clear all placed models from the scene
     */
    clearScene() {
        // Remove all meshes from the scene
        for (const model of this.placedModels) {
            if (model.mesh && !model.mesh.isDisposed()) {
                model.mesh.dispose();
            }
        }
        this.placedModels = [];
    }
    
    /**
     * Track a newly placed model
     * @param {Object} model - The model to track
     */
    trackModel(model) {
        this.placedModels.push({
            mesh: model.mesh,
            path: model.path,
            timestamp: new Date()
        });
    }

    /**
     * Track a newly placed model
     * @param {Object} model - The model to track
     */
    trackModel(model) {
        this.placedModels.push({
            mesh: model.mesh,
            path: model.path,
            timestamp: new Date()
        });
    }
}

export { AssetBrowser };
