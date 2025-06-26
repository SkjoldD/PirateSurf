// Main application
class AssetLevelEditor {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        // Track if mouse is over UI
        this.isOverUI = false;
        
        // Initialize properties UI references
        this.propertiesPanel = null; // Reference to the properties panel element
        this.propertiesList = null; // Reference to the properties list element
        this.addPropertyBtn = null; // Reference to the add property button
        
        // Set up properties panel event listeners when DOM is ready
        this.initializePropertiesPanel();
        
        // Store properties for each object
        this.objectProperties = new Map();
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Orbit controls for camera
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Transform controls for objects
        this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode('translate'); // Default to move mode
        this.transformControls.setSpace('world');
        this.transformControls.showZ = true; // Show Z-axis for full 3D movement
        
        // Add transform controls to a separate scene to prevent matrix update issues
        this.transformControls.enabled = false; // Start disabled
        
        // Listen for transform control changes
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            
            // Snap to grid when dragging ends
            if (!event.value && this.selectedObject) {
                const snappedPosition = this.snapToGrid(this.selectedObject.position);
                this.selectedObject.position.copy(snappedPosition);
            }
        });
        
        // Add to scene but keep disabled initially
        this.scene.add(this.transformControls);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.selectedFile = null;
        this.isRotating = false;
        
        this.setupLights();
        this.setupTransformUI();
        this.setupEventListeners();
        this.loadAssetBrowser();
        
        // Add axis helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        this.animate();
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    
    /**
     * Snaps a position to the nearest integer coordinates
     * @param {THREE.Vector3} position - The position to snap
     * @returns {THREE.Vector3} The snapped position
     */
    snapToGrid(position) {
        return new THREE.Vector3(
            Math.round(position.x),
            Math.round(position.y),
            Math.round(position.z)
        );
    }
    
    // Grid has been removed as per user request
    
    setupEventListeners() {
        // Prevent default context menu on the whole window
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Use mousedown instead of click for better control
        document.addEventListener('mousedown', (e) => this.onMouseClick(e));
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // UI hover detection
        const uiElement = document.getElementById('ui');
        uiElement.addEventListener('mouseenter', () => this.isOverUI = true);
        uiElement.addEventListener('mouseleave', () => this.isOverUI = false);
        
        // UI event listeners
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveScene());
        document.getElementById('load-btn')?.addEventListener('click', () => document.getElementById('load-file')?.click());
        document.getElementById('load-file')?.addEventListener('change', (e) => this.loadScene(e));
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onMouseClick(event) {
        event.preventDefault();
        
        // Check if the click was inside the properties panel
        const propertiesPanel = document.getElementById('properties-panel');
        const isClickInPropertiesPanel = propertiesPanel && 
            (event.target === propertiesPanel || propertiesPanel.contains(event.target));
        
        // Skip if mouse is over UI or properties panel
        if (this.isOverUI || isClickInPropertiesPanel) {
            return;
        }
        
        // Skip mouse events if we're currently transforming
        if (this.transformControls?.dragging) {
            return;
        }
        
        // Skip if transform controls are not properly initialized
        if (!this.transformControls) {
            return;
        }
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Don't select the transform controls or their helpers
        const objects = this.scene.children.filter(child => 
            child !== this.transformControls && 
            !child.name.includes('TransformControls')
        );
        
        const intersects = this.raycaster.intersectObjects(objects, true);
        
        if (event.button === 0) { // Left click
            // Skip if we're currently transforming
            if (this.transformControls?.dragging) {
                return;
            }
            
            if (this.selectedFile) {
                // If we have a file selected, place it at the intersection point
                if (intersects.length > 0) {
                    const snappedPosition = this.snapToGrid(intersects[0].point);
                    this.placeModel(snappedPosition);
                } else {
                    // If we didn't hit anything, place it on the ground plane
                    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                    const target = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(plane, target);
                    const snappedPosition = this.snapToGrid(target);
                    this.placeModel(snappedPosition);
                }
                // Don't select the newly placed object
                this.deselectObject();
            } else if (intersects.length > 0) {
                // If we clicked on an object, select it
                this.selectObject(intersects[0].object);
            } else {
                // If we clicked on nothing, deselect
                this.deselectObject();
            }
        } else if (event.button === 2) { // Right click
            event.preventDefault();
            event.stopPropagation();
            
            // Skip if we're currently transforming
            if (this.transformControls?.dragging) {
                return false;
            }
            
            // Store if we had a selection before processing the click
            const hadSelection = this.selectedObject || this.selectedFile;
            
            // Deselect file first if one is selected
            if (this.selectedFile) {
                this.deselectFile();
            }
            
            // Then deselect object if one is selected
            if (this.selectedObject) {
                this.deselectObject();
            }
            
            // If we had a selection before and clicked on an object, select it
            if (hadSelection && intersects.length > 0) {
                this.selectObject(intersects[0].object);
            }
            
            return false; // Prevent context menu
        }
    }
    
    onKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // Only process if not in a text input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(key) {
            case 'r':
                this.isRotating = true;
                if (this.transformControls) {
                    this.transformControls.setMode('rotate');
                    this.updateTransformUI('rotate');
                }
                break;
            case 'g':
                if (this.transformControls) {
                    this.transformControls.setMode('translate');
                    this.updateTransformUI('translate');
                }
                break;
            case 's':
                if (this.transformControls) {
                    this.transformControls.setMode('scale');
                    this.updateTransformUI('scale');
                }
                break;
            case 'delete':
            case 'backspace':
                if (this.selectedObject) {
                    this.deleteSelectedObject();
                    event.preventDefault(); // Prevent browser back navigation
                }
                break;
            case 'escape':
                this.deselectObject();
                break;
        }
    }
    
    onKeyUp(event) {
        const key = event.key.toLowerCase();
        
        if (key === 'r') {
            this.isRotating = false;
        }
    }
    
    deleteSelectedObject() {
        if (this.selectedObject) {
            try {
                // First clean up the selected object
                const objectToRemove = this.selectedObject;
                this.selectedObject = null;
                
                // Then detach and disable transform controls
                if (this.transformControls) {
                    this.transformControls.detach();
                    this.transformControls.enabled = false;
                }
                
                // Then remove the object from the scene
                if (objectToRemove.parent) {
                    objectToRemove.parent.remove(objectToRemove);
                } else {
                    this.scene.remove(objectToRemove);
                }
                
                // Clean up any resources
                objectToRemove.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                
                this.updateHUD();
            } catch (error) {
                console.error('Error deleting object:', error);
            }
        }
    }
    
    setupTransformUI() {
        // Create transform controls UI
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'transform-controls';
        controlsDiv.style.display = 'none';
        
        const moveBtn = document.createElement('button');
        moveBtn.textContent = 'Move';
        moveBtn.className = 'active';
        moveBtn.onclick = () => {
            this.transformControls.setMode('translate');
            Array.from(controlsDiv.children).forEach(btn => btn.classList.remove('active'));
            moveBtn.classList.add('active');
        };
        
        const rotateBtn = document.createElement('button');
        rotateBtn.textContent = 'Rotate';
        rotateBtn.onclick = () => {
            this.transformControls.setMode('rotate');
            Array.from(controlsDiv.children).forEach(btn => btn.classList.remove('active'));
            rotateBtn.classList.add('active');
        };
        
        const scaleBtn = document.createElement('button');
        scaleBtn.textContent = 'Scale';
        scaleBtn.onclick = () => {
            this.transformControls.setMode('scale');
            Array.from(controlsDiv.children).forEach(btn => btn.classList.remove('active'));
            scaleBtn.classList.add('active');
        };
        
        controlsDiv.appendChild(moveBtn);
        controlsDiv.appendChild(rotateBtn);
        controlsDiv.appendChild(scaleBtn);
        document.body.appendChild(controlsDiv);
        
        this.transformControlsUI = controlsDiv;
    }
    
    selectObject(object) {
        if (!object) {
            console.warn('Cannot select: No object provided');
            return;
        }
        
        // Don't select the ground plane or other helper objects
        if (object.name === 'ground' || object.name === 'grid' || object.name === 'axes') {
            this.deselectObject();
            return;
        }
        
        try {
            // Find the top-most parent that's a mesh or group
            while (object.parent && object.parent.type !== 'Scene') {
                object = object.parent;
            }
            
            // Don't do anything if we're selecting the same object
            if (this.selectedObject === object) {
                console.log('Object already selected:', object);
                return;
            }
            
            console.log('Selecting object:', object);
            
            // Deselect the current object first
            this.deselectObject();
            
            // Store the new selection
            this.selectedObject = object;
            
            // Ensure the object has a UUID
            if (!object.uuid) {
                console.warn('Selected object has no UUID, generating one');
                object.uuid = THREE.MathUtils.generateUUID();
            }
            
            // Ensure the object has userData
            object.userData = object.userData || {};
            
            // Attach transform controls to the selected object
            if (this.transformControls) {
                this.transformControls.attach(object);
                this.transformControls.enabled = true;
                if (this.transformControlsUI) {
                    this.transformControlsUI.style.display = 'block';
                }
            }
            
            // Highlight the selected object
            object.traverse(child => {
                if (child.isMesh) {
                    // Skip if already processed
                    if (child.userData.isHighlighted) return;
                    
                    // Store original emissive color if not already stored
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive ? 
                            child.material.emissive.clone() : new THREE.Color(0x000000);
                    }
                    
                    // Apply highlight
                    if (child.material.emissive) {
                        child.material.emissive.set(0x444444);
                    }
                    
                    // Store original material if not already stored
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material;
                    }
                    
                    // Mark as highlighted
                    child.userData.isHighlighted = true;
                }
            });
            
            // Ensure properties panel is initialized
            if (!this.propertiesPanel) {
                this.propertiesPanel = document.getElementById('properties-panel');
                this.propertiesList = document.getElementById('properties-list');
                this.addPropertyBtn = document.getElementById('add-property-btn');
                
                if (this.addPropertyBtn) {
                    const self = this;
                    this.addPropertyBtn.onclick = function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        self.addProperty();
                    };
                }
            }
            
            // Show the properties panel
            if (this.propertiesPanel) {
                console.log('Showing properties panel');
                this.propertiesPanel.style.display = 'block';
                this.propertiesPanel.style.visibility = 'visible';
                
                // Load properties for the selected object
                this.loadObjectProperties();
            } else {
                console.error('Properties panel element not found!');
            }
            
            // Update HUD with selected object info
            this.updateHUD();
            
            console.log('Successfully selected object:', object);
            
        } catch (error) {
            console.error('Error selecting object:', error);
        }
    }
    
    deselectObject() {
        if (this.selectedObject) {
            try {
                console.log('Deselecting object:', this.selectedObject);
                
                // Remove highlight from the previously selected object
                this.selectedObject.traverse(child => {
                    if (child.isMesh) {
                        // Restore original emissive color if it was changed
                        if (child.userData.originalEmissive && child.material.emissive) {
                            child.material.emissive.copy(child.userData.originalEmissive);
                        }
                        
                        // Clear the highlighted flag
                        delete child.userData.isHighlighted;
                    }
                });
                
                // Save any pending property changes before deselecting
                try {
                    this.updateProperty();
                } catch (propError) {
                    console.warn('Error saving properties before deselect:', propError);
                }
                
                // Clear the selection
                const deselectedObject = this.selectedObject;
                this.selectedObject = null;
                
                // Remove transform controls
                if (this.transformControls) {
                    this.transformControls.detach();
                    this.transformControls.enabled = false;
                    if (this.transformControlsUI) {
                        this.transformControlsUI.style.display = 'none';
                    }
                }
                
                console.log('Successfully deselected object:', deselectedObject);
                
            } catch (error) {
                console.error('Error deselecting object:', error);
            } finally {
                // Always update HUD and clean up UI
                this.updateHUD();
                
                // Hide the properties panel but don't destroy its contents
                if (this.propertiesPanel) {
                    this.propertiesPanel.style.display = 'none';
                    this.propertiesPanel.style.visibility = 'hidden';
                }
                
                // Clear the properties list but keep the reference to the element
                if (this.propertiesList) {
                    this.propertiesList.innerHTML = '';
                }
            }
        } else if (this.transformControls) {
            // If no object is selected but controls exist, make sure they're disabled
            try {
                this.transformControls.detach();
                this.transformControls.enabled = false;
                if (this.transformControlsUI) {
                    this.transformControlsUI.style.display = 'none';
                }
            } catch (error) {
                console.error('Error cleaning up transform controls:', error);
            }
        }
    }
    
    updateTransformUI(mode) {
        if (!this.transformControlsUI) return;
        
        const buttons = this.transformControlsUI.getElementsByTagName('button');
        Array.from(buttons).forEach(btn => {
            const action = btn.textContent.toLowerCase();
            btn.classList.toggle('active', action === mode);
        });
    }
    
    updateHUD() {
        const hud = document.getElementById('selected-object-info');
        if (!hud) return;
        
        if (this.selectedObject) {
            const pos = this.selectedObject.position;
            hud.innerHTML = `
                <strong>Selected Object:</strong><br>
                Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>
                <small>G: Move | R: Rotate | S: Scale | DEL: Delete | ESC: Deselect</small>
            `;
        } else {
            hud.innerHTML = '<em>No object selected</em>';
        }
    }
    
    selectFile(filePath, element) {
        try {
            // Remove selection from other files
            document.querySelectorAll('.file').forEach(el => el.classList.remove('selected'));
            
            if (this.selectedFile === filePath) {
                this.deselectFile();
                return;
            }
            
            console.log('Selected file:', filePath);
            this.selectedFile = filePath;
            
            if (element) {
                element.classList.add('selected');
                // Add context menu prevention
                element.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.deselectFile();
                    return false;
                };
            }
            
            // Show feedback to the user
            const feedback = document.getElementById('selection-feedback');
            if (feedback) {
                const fileName = filePath.split('/').pop();
                feedback.textContent = `Selected: ${fileName} (Right-click to deselect)`;
                feedback.style.display = 'block';
                
                // Hide the feedback after 3 seconds
                setTimeout(() => {
                    feedback.style.opacity = '0';
                    setTimeout(() => {
                        feedback.style.display = 'none';
                        feedback.style.opacity = '1';
                    }, 500);
                }, 3000);
            }
            
            // Prevent default context menu on document when a file is selected
            document.addEventListener('contextmenu', this.preventContextMenu);
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    }
    
    deselectFile() {
        this.selectedFile = null;
        document.querySelectorAll('.file').forEach(el => {
            el.classList.remove('selected');
            el.oncontextmenu = null; // Remove context menu handler
        });
        
        // Remove the context menu prevention
        document.removeEventListener('contextmenu', this.preventContextMenu);
        
        // Update feedback if it exists
        const feedback = document.getElementById('selection-feedback');
        if (feedback) {
            feedback.style.display = 'none';
        }
    }
    
    // Helper to prevent context menu
    preventContextMenu(e) {
        e.preventDefault();
        return false;
    }
    
    snapToGrid(position) {
        return new THREE.Vector3(
            Math.round(position.x),
            Math.round(position.y),
            Math.round(position.z)
        );
    }
    
    createDemoCubeAt(position, selectAfterCreate = true) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            metalness: 0.1,
            roughness: 0.7
        });
        
        const cube = new THREE.Mesh(geometry, material);
        cube.position.copy(position);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData.isPlacedObject = true;
        cube.userData.isDemoCube = true;
        
        this.scene.add(cube);
        
        // Optionally select the demo cube
        if (selectAfterCreate) {
            this.selectObject(cube);
        }
        
        return cube;
    }
    
    async placeModel(position) {
        if (!this.selectedFile) return null;
        
        try {
            const loader = new THREE.GLTFLoader();
            
            // Create a promise-based wrapper for loading
            const loadModel = (path) => new Promise((resolve, reject) => {
                loader.load(path, resolve, undefined, reject);
            });
            
            let gltf;
            try {
                gltf = await loadModel(this.selectedFile);
            } catch (error) {
                console.error('Error loading model:', error);
                // If loading fails, create a demo cube instead
                return this.createDemoCubeAt(position, false);
            }
            
            const model = gltf.scene;
            model.position.copy(position);
            model.userData.isPlacedObject = true;
            model.userData.originalFile = this.selectedFile;
            
            // Set up shadows for all meshes in the model
            model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(model);
            return model;
            
        } catch (error) {
            console.error('Error in placeModel:', error);
            // If anything else fails, create a demo cube
            return this.createDemoCubeAt(position, false);
        }
    }
    
    loadAssetBrowser() {
        // Define the asset structure based on the actual folders in Assets/3D
        const assetStructure = {
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
                "tower-square-top-color.glb",
                "tower-square-top-roof-high-windows.glb",
                "tower-square-top-roof-high.glb",
                "tower-square-top-roof-rounded.glb",
                "tower-square-top-roof.glb",
                "tower-square-top.glb",
                "tower-square.glb",
                "tower-top.glb",
                "tree-large.glb",
                "tree-log.glb",
                "tree-small.glb",
                "tree-trunk.glb",
                "wall-corner-half-tower.glb",
                "wall-corner-half.glb",
                "wall-corner-slant.glb",
                "wall-corner.glb",
                "wall-doorway.glb",
                "wall-half-modular.glb",
                "wall-half.glb",
                "wall-narrow-corner.glb",
                "wall-narrow-gate.glb",
                "wall-narrow-stairs-rail.glb",
                "wall-narrow-stairs.glb",
                "wall-narrow-wood-fence.glb",
                "wall-narrow-wood.glb",
                "wall-narrow.glb",
                "wall-pillar.glb",
                "wall-stud.glb",
                "wall-to-narrow.glb",
                "wall.glb"
            ],
            // Special folder with subfolders
            "Special": {
                "Special-Castle": [
                    "special-siege-ballista.glb",
                    "special-siege-catapult.glb",
                    "special-siege-trebuchet.glb"
                ],
                "Special-Survival": [
                    "special-fish.glb",
                    "special-fish-large.glb",
                ],
                "Special-Platformer": [
                    "special-coin-bronze.glb",
                    "special-coin-gold.glb",
                    "special-coin-silver.glb"
                ]
            },
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
                "structure-fence.glb",
                "structure-platform-dock-small.glb",
                "structure-platform-dock.glb",
                "structure-platform-small.glb",
                "structure-platform.glb",
                "structure-roof.glb",
                "structure.glb",
                "tool-paddle.glb",
                "tool-shovel.glb",
                "tower-base-door.glb",
                "tower-base.glb",
                "tower-complete-large.glb",
                "tower-complete-small.glb",
                "tower-middle-windows.glb",
                "tower-middle.glb",
                "tower-roof.glb",
                "tower-top.glb",
                "tower-watch.glb"
            ],
            "Platformer": [
                "arrow.glb",
                "arrows.glb",
                "barrel.glb",
                "block-grass-corner-low.glb",
                "block-grass-corner-overhang-low.glb",
                "block-grass-corner-overhang.glb",
                "block-grass-corner.glb",
                "block-grass-curve-half.glb",
                "block-grass-curve-low.glb",
                "block-grass-curve.glb",
                "block-grass-edge.glb",
                "block-grass-hexagon.glb",
                "block-grass-large-slope-narrow.glb",
                "block-grass-large-slope-steep-narrow.glb",
                "block-grass-large-slope-steep.glb",
                "block-grass-large-slope.glb",
                "block-grass-large-tall.glb",
                "block-grass-large.glb",
                "block-grass-long.glb",
                "block-grass-low-hexagon.glb",
                "block-grass-low-large.glb",
                "block-grass-low-long.glb",
                "block-grass-low-narrow.glb",
                "block-grass-low.glb",
                "block-grass-narrow.glb",
                "block-grass-overhang-corner.glb",
                "block-grass-overhang-edge.glb",
                "block-grass-overhang-hexagon.glb",
                "block-grass-overhang-large-slope-narrow.glb",
                "block-grass-overhang-large-slope-steep-narrow.glb",
                "block-grass-overhang-large-slope-steep.glb",
                "block-grass-overhang-large-slope.glb",
                "block-grass-overhang-large-tall.glb",
                "block-grass-overhang-large.glb",
                "block-grass-overhang-long.glb",
                "block-grass-overhang-low-hexagon.glb",
                "block-grass-overhang-low-large.glb",
                "block-grass-overhang-low-long.glb",
                "block-grass-overhang-low-narrow.glb",
                "block-grass-overhang-low.glb",
                "block-grass-overhang-narrow.glb",
                "block-grass.glb",
                "block-moving-blue.glb",
                "block-moving-large.glb",
                "block-moving.glb",
                "block-snow-corner-low.glb",
                "block-snow-corner-overhang-low.glb",
                "block-snow-corner-overhang.glb",
                "block-snow-corner.glb",
                "block-snow-curve-half.glb",
                "block-snow-curve-low.glb",
                "block-snow-curve.glb",
                "block-snow-edge.glb",
                "block-snow-hexagon.glb",
                "block-snow-large-slope-narrow.glb",
                "block-snow-large-slope-steep-narrow.glb",
                "block-snow-large-slope-steep.glb",
                "block-snow-large-slope.glb",
                "block-snow-large-tall.glb",
                "block-snow-large.glb",
                "block-snow-long.glb",
                "block-snow-low-hexagon.glb",
                "block-snow-low-large.glb",
                "block-snow-low-long.glb",
                "block-snow-low-narrow.glb",
                "block-snow-low.glb",
                "block-snow-narrow.glb",
                "block-snow-overhang-corner.glb",
                "block-snow-overhang-edge.glb",
                "block-snow-overhang-hexagon.glb",
                "block-snow-overhang-large-slope-narrow.glb",
                "block-snow-overhang-large-slope-steep-narrow.glb",
                "block-snow-overhang-large-slope-steep.glb",
                "block-snow-overhang-large-slope.glb",
                "block-snow-overhang-large-tall.glb",
                "block-snow-overhang-large.glb",
                "block-snow-overhang-long.glb",
                "block-snow-overhang-low-hexagon.glb",
                "block-snow-overhang-low-large.glb",
                "block-snow-overhang-low-long.glb",
                "block-snow-overhang-low-narrow.glb",
                "block-snow-overhang-low.glb",
                "block-snow-overhang-narrow.glb",
                "block-snow.glb",
                "bomb.glb",
                "button-round.glb",
                "button-square.glb",
                "chest.glb",
                "coin-bronze.glb",
                "coin-gold.glb",
                "coin-silver.glb",
                "crate-item-strong.glb",
                "crate-item.glb",
                "crate-strong.glb",
                "crate.glb",
                "door-large-open.glb",
                "door-open.glb",
                "door-rotate-large.glb",
                "door-rotate.glb",
                "fence-broken.glb",
                "fence-corner-curved.glb",
                "fence-corner.glb",
                "fence-low-broken.glb",
                "fence-low-corner-curved.glb",
                "fence-low-corner.glb",
                "fence-low-straight.glb",
                "fence-straight.glb",
                "flag.glb",
                "flowers-tall.glb",
                "flowers.glb",
                "grass.glb",
                "heart.glb",
                "hedge-corner.glb",
                "hedge.glb",
                "jewel.glb",
                "key.glb",
                "ladder-broken.glb",
                "ladder-long.glb",
                "ladder.glb",
                "lever.glb",
                "lock.glb",
                "mushrooms.glb",
                "plant.glb",
                "platform-fortified.glb",
                "platform-overhang.glb",
                "platform-ramp.glb",
                "platform.glb",
                "poles.glb",
                "rocks.glb",
                "saw.glb",
                "sign.glb",
                "spike-block-wide.glb",
                "spike-block.glb",
                "stones.glb",
                "trap-spikes-large.glb",
                "trap-spikes.glb",
                "tree-pine-small.glb",
                "tree-pine-snow-small.glb",
                "tree-pine-snow.glb",
                "tree-pine.glb",
                "tree-snow.glb",
                "tree.glb"
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
                "structure-floor.glb",
                "structure-metal-doorway.glb",
                "structure-metal-floor.glb",
                "structure-metal-roof.glb",
                "structure-metal-wall.glb",
                "structure-metal.glb",
                "structure-roof.glb",
                "structure.glb",
                "tent-canvas-half.glb",
                "tent-canvas.glb",
                "tent.glb",
                "tool-axe-upgraded.glb",
                "tool-axe.glb",
                "tool-hammer-upgraded.glb",
                "tool-hammer.glb",
                "tool-hoe-upgraded.glb",
                "tool-hoe.glb",
                "tool-pickaxe-upgraded.glb",
                "tool-pickaxe.glb",
                "tool-shovel-upgraded.glb",
                "tool-shovel.glb",
                "tree-autumn-tall.glb",
                "tree-autumn-trunk.glb",
                "tree-autumn.glb",
                "tree-log-small.glb",
                "tree-log.glb",
                "tree-tall.glb",
                "tree-trunk.glb",
                "tree.glb",
                "workbench-anvil.glb",
                "workbench-grind.glb",
                "workbench.glb"
            ]
        };
        
        const assetBrowser = document.getElementById('asset-browser');
        this.createFolderStructure(assetStructure, assetBrowser);
    }
    
    createFolderStructure(structure, parentElement, currentPath = '') {
        for (const [key, value] of Object.entries(structure)) {
            if (Array.isArray(value)) {
                // It's a file list
                const folder = document.createElement('div');
                folder.className = 'folder';
                
                const folderName = document.createElement('div');
                folderName.className = 'folder-name';
                folderName.textContent = key;
                folderName.onclick = (e) => {
                    e.stopPropagation();
                    folder.classList.toggle('expanded');
                };
                
                const folderContents = document.createElement('div');
                folderContents.className = 'folder-contents';
                
                folder.appendChild(folderName);
                folder.appendChild(folderContents);
                parentElement.appendChild(folder);
                
                // Add files to the folder
                value.forEach(file => {
                    const fileElement = document.createElement('div');
                    fileElement.className = 'file';
                    fileElement.textContent = file;
                    
                    // Construct the full path to the model
                    const folderPath = currentPath ? `${currentPath}/${key}` : key;
                    const filePath = `Assets/3D/${folderPath}/${file}`;
                    
                    fileElement.onclick = (e) => {
                        e.stopPropagation();
                        this.selectFile(filePath, fileElement);
                    };
                    
                    folderContents.appendChild(fileElement);
                });
                
            } else if (typeof value === 'object' && value !== null) {
                // It's a subfolder
                const folder = document.createElement('div');
                folder.className = 'folder';
                
                const folderName = document.createElement('div');
                folderName.className = 'folder-name';
                folderName.textContent = key;
                folderName.onclick = (e) => {
                    e.stopPropagation();
                    folder.classList.toggle('expanded');
                };
                
                const folderContents = document.createElement('div');
                folderContents.className = 'folder-contents';
                
                folder.appendChild(folderName);
                folder.appendChild(folderContents);
                parentElement.appendChild(folder);
                
                // Recursively create subfolders with updated path
                const newPath = currentPath ? `${currentPath}/${key}` : key;
                this.createFolderStructure(value, folderContents, newPath);
            }
        }
    }
    
    loadObjectProperties() {
        try {
            console.log('Loading object properties...');
            
            // Ensure we have a selected object
            if (!this.selectedObject) {
                console.warn('Cannot load properties: No object selected');
                return;
            }
            
            // Re-acquire properties list reference if needed
            if (!this.propertiesList) {
                this.propertiesList = document.getElementById('properties-list');
                if (!this.propertiesList) {
                    console.error('Properties list element not found!');
                    return;
                }
            }
            
            // Clear existing properties but keep the "Add Property" button visible
            while (this.propertiesList.firstChild) {
                this.propertiesList.removeChild(this.propertiesList.firstChild);
            }
            
            // Ensure the object has userData
            this.selectedObject.userData = this.selectedObject.userData || {};
            
            // Get properties from the object's userData
            const properties = this.selectedObject.userData.properties || {};
            
            console.log('Loaded properties for object', this.selectedObject.uuid, properties);
            
            // Add properties to the list
            Object.entries(properties).forEach(([key, value]) => {
                if (key && key.trim() !== '' && value !== undefined) {
                    try {
                        this.addProperty(key, String(value), false);
                    } catch (error) {
                        console.error(`Error adding property ${key}:`, error);
                    }
                }
            });
            
            // Ensure the properties panel is visible
            if (this.propertiesPanel) {
                this.propertiesPanel.style.display = 'block';
                this.propertiesPanel.style.visibility = 'visible';
            }
            
        } catch (error) {
            console.error('Error in loadObjectProperties:', error);
        }
    }
    
    addProperty(key = '', value = '', isNew = true) {
        console.log('Adding property:', { key, value, isNew });
        
        // Store the currently selected object to ensure we don't lose it
        const currentSelected = this.selectedObject;
        
        if (!currentSelected) {
            console.warn('Cannot add property: No object selected');
            return;
        }
        
        // Make sure propertiesList exists
        if (!this.propertiesList) {
            console.error('Properties list element not found!');
            return;
        }
        
        try {
            // Create the property item container
            const propertyItem = document.createElement('div');
            propertyItem.className = 'property-item';
            
            // Store reference to this for use in event listeners
            const self = this;
            
            // Create key input
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.placeholder = 'Key';
            keyInput.value = key;
            keyInput.addEventListener('mousedown', (e) => e.stopPropagation());
            keyInput.addEventListener('click', (e) => e.stopPropagation());
            keyInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    valueInput.focus();
                }
            });
            keyInput.addEventListener('change', () => self.updateProperty());
            
            // Create value input
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.placeholder = 'Value';
            valueInput.value = value;
            valueInput.addEventListener('mousedown', (e) => e.stopPropagation());
            valueInput.addEventListener('click', (e) => e.stopPropagation());
            valueInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && keyInput.value.trim() !== '') {
                    // Add a new property when Enter is pressed
                    setTimeout(() => self.addProperty(), 0);
                }
            });
            valueInput.addEventListener('change', () => self.updateProperty());
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Remove property';
            deleteBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Use setTimeout to ensure this runs after any other click handlers
                setTimeout(() => {
                    if (self.propertiesList && propertyItem.parentNode === self.propertiesList) {
                        self.propertiesList.removeChild(propertyItem);
                        self.updateProperty();
                    }
                }, 0);
            });
            
            // Also prevent click events on the delete button
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            // Assemble the property item
            propertyItem.appendChild(keyInput);
            propertyItem.appendChild(valueInput);
            propertyItem.appendChild(deleteBtn);
            
            // Add to the properties list
            if (this.propertiesList) {
                this.propertiesList.appendChild(propertyItem);
                
                // Ensure the panel is visible
                if (this.propertiesPanel) {
                    this.propertiesPanel.style.display = 'block';
                    this.propertiesPanel.style.visibility = 'visible';
                }
                
                // Focus the key input if it's a new property
                if (isNew) {
                    // Use setTimeout to ensure the element is in the DOM before focusing
                    setTimeout(() => {
                        keyInput.focus();
                    }, 0);
                }
                
                // Update properties
                this.updateProperty();
            }
            
            // Restore the selected object in case it was lost
            if (!this.selectedObject && currentSelected) {
                this.selectedObject = currentSelected;
            }
            
        } catch (error) {
            console.error('Error adding property:', error);
            
            // Restore the selected object in case of error
            if (!this.selectedObject && currentSelected) {
                this.selectedObject = currentSelected;
            }
        }
    }
    
    updateProperty() {
        try {
            // Ensure we have a valid selection and properties list
            if (!this.selectedObject) {
                console.warn('Cannot update properties: No object selected');
                return;
            }
            
            // Re-acquire properties list reference if needed
            if (!this.propertiesList) {
                this.propertiesList = document.getElementById('properties-list');
                if (!this.propertiesList) {
                    console.error('Properties list element not found!');
                    return;
                }
            }
            
            // Ensure the object has userData
            this.selectedObject.userData = this.selectedObject.userData || {};
            
            // Collect all properties from the UI
            const properties = {};
            let hasValidProperties = false;
            
            const propertyItems = this.propertiesList.querySelectorAll('.property-item');
            propertyItems.forEach((item) => {
                const keyInput = item.querySelector('input[type="text"]:first-child');
                const valueInput = item.querySelector('input[type="text"]:nth-child(2)');
                
                if (keyInput && valueInput) {
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    // Only add non-empty keys
                    if (key !== '') {
                        properties[key] = value;
                        hasValidProperties = true;
                    }
                }
            });
            
            // Update or remove the properties for this object
            if (hasValidProperties) {
                // Store properties directly on the object's userData
                this.selectedObject.userData.properties = { ...properties };
                console.log('Updated properties for object', this.selectedObject.uuid, properties);
            } else {
                // Remove properties if none are valid
                delete this.selectedObject.userData.properties;
                console.log('Removed properties for object', this.selectedObject.uuid);
            }
            
        } catch (error) {
            console.error('Error updating properties:', error);
        }
    }
    
    saveScene() {
        try {
            const sceneData = {
                version: '2.2',
                metadata: {
                    format: 'AssetEditorScene',
                    generatedBy: 'AssetLevelEditor',
                    date: new Date().toISOString(),
                    objectCount: 0, // Will be updated after counting
                    engine: "Three.js",
                    editor: "AssetLevelEditor"
                },
                objects: []
            };
            
            // Find all placed objects in the scene
            this.scene.traverse(object => {
                if (object.userData.isPlacedObject) {
                    const filename = object.userData.originalFile?.split('/').pop() || 'unknown';
                    const objectData = {
                        name: filename,
                        position: {
                            x: object.position.x,
                            y: object.position.y,
                            z: object.position.z
                        },
                        rotation: {
                            x: object.rotation.x,
                            y: object.rotation.y,
                            z: object.rotation.z
                        },
                        scale: {
                            x: object.scale.x,
                            y: object.scale.y,
                            z: object.scale.z
                        },
                        path: object.userData.originalFile || '',
                        filename: filename,
                        uuid: object.uuid,
                        originalUuid: object.userData.originalUuid || object.uuid,
                        // Store properties directly in the object data
                        properties: object.userData.properties ? { ...object.userData.properties } : {}
                    };
                    
                    sceneData.objects.push(objectData);
                }
            });
            
            // Update the object count
            sceneData.metadata.objectCount = sceneData.objects.length;
            
            // Create a download link
            const dataStr = JSON.stringify(sceneData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportName = `scene_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportName);
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            
            console.log(`Scene saved with ${sceneData.objects.length} objects`);
            
        } catch (error) {
            console.error('Error saving scene:', error);
            alert('Error saving scene. See console for details.');
        }
    }
    
    async loadScene(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show loading message
        const hud = document.getElementById('hud');
        const originalHUD = hud ? hud.innerHTML : '';
        
        try {
            const fileContent = await file.text();
            const sceneData = JSON.parse(fileContent);
            
            // Check the scene format version
            const isNewFormat = sceneData.version && sceneData.version.startsWith('2.');
            
            // Clear existing objects (except lights, grid, etc.)
            const objectsToRemove = [];
            this.scene.traverse(object => {
                if (object.userData.isPlacedObject) {
                    objectsToRemove.push(object);
                }
            });
            
            objectsToRemove.forEach(obj => this.scene.remove(obj));
            
            // Show loading message
            if (hud) {
                hud.innerHTML = `<div>Loading scene: ${file.name} (${isNewFormat ? sceneData.metadata?.objectCount || 0 : 'legacy'} objects)</div>`;
            }
            
            // Load all objects from the scene data in parallel
            const objects = isNewFormat ? sceneData.objects : (sceneData.objects || []);
            const loader = new THREE.GLTFLoader();
            
            // Configure the loader to handle KHR_texture_transform extension
            loader.register(parser => ({
                name: 'KHR_texture_transform',
                async loadTexture(texIndex) {
                    const json = parser.json;
                    const textureDef = json.textures[texIndex];
                    const texture = await parser.loadTexture(textureDef.source);
                    
                    // Get the texture transform extension
                    const transform = textureDef.extensions && textureDef.extensions.KHR_texture_transform;
                    if (transform) {
                        // Apply basic transform properties if they exist
                        if (transform.offset !== undefined) {
                            texture.offset.fromArray(transform.offset);
                        }
                        if (transform.rotation !== undefined) {
                            texture.rotation = transform.rotation;
                        }
                        if (transform.scale !== undefined) {
                            texture.repeat.fromArray(transform.scale);
                        }
                        if (transform.texCoord !== undefined) {
                            // Note: Custom UV sets are not supported, but we can at least handle the basic case
                            texture.channel = transform.texCoord;
                        }
                    }
                    return texture;
                }
            }));
            
            // Suppress the specific warning
            const originalWarn = console.warn;
            console.warn = function(...args) {
                if (args[0] && typeof args[0] === 'string' && 
                    args[0].includes('KHR_texture_transform')) {
                    // Suppress this specific warning
                    return;
                }
                originalWarn.apply(console, args);
            };
            
            // Create an array of promises for loading models
            const loadPromises = objects.map(objData => {
                return new Promise(async (resolve) => {
                    try {
                        // Handle both new and old format
                        const modelPath = isNewFormat ? objData.path : objData.file;
                        if (!modelPath) {
                            resolve(null);
                            return;
                        }
                        
                        // Load the model
                        const gltf = await loader.loadAsync(modelPath);
                        const model = gltf.scene;
                        
                        // Set position
                        if (isNewFormat && objData.position) {
                            model.position.set(
                                objData.position.x || 0,
                                objData.position.y || 0,
                                objData.position.z || 0
                            );
                        } else if (Array.isArray(objData.position)) {
                            model.position.fromArray(objData.position);
                        }
                        
                        // Set rotation
                        if (isNewFormat && objData.rotation) {
                            model.rotation.set(
                                objData.rotation.x || 0,
                                objData.rotation.y || 0,
                                objData.rotation.z || 0
                            );
                        } else if (Array.isArray(objData.rotation)) {
                            model.rotation.fromArray(objData.rotation);
                        }
                        
                        // Set scale
                        if (objData.scale) {
                            if (Array.isArray(objData.scale)) {
                                model.scale.fromArray(objData.scale);
                            } else if (typeof objData.scale === 'object') {
                                model.scale.set(
                                    objData.scale.x || 1,
                                    objData.scale.y || 1,
                                    objData.scale.z || 1
                                );
                            }
                        } else {
                            model.scale.set(1, 1, 1);
                        }
                        
                        // Initialize userData
                        model.userData = model.userData || {};
                        model.userData.isPlacedObject = true;
                        model.userData.originalFile = modelPath;
                        
                        // Store the original ID and UUID if they exist
                        if (isNewFormat) {
                            if (objData.id) model.userData.originalId = objData.id;
                            if (objData.uuid) model.userData.originalUuid = objData.uuid;
                            if (objData.originalUuid) model.userData.originalUuid = objData.originalUuid;
                            
                            // Load properties if they exist in the object data
                            if (objData.properties) {
                                model.userData.properties = { ...objData.properties };
                            }
                        }
                        
                        // Set up shadows
                        model.traverse(child => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        
                        resolve(model);
                    } catch (error) {
                        console.error(`Error loading model ${objData.path || objData.file}:`, error);
                        
                        // Create a placeholder cube if model fails to load
                        const position = isNewFormat && objData.position ? 
                            new THREE.Vector3(
                                objData.position.x || 0,
                                objData.position.y || 0,
                                objData.position.z || 0
                            ) : 
                            (objData.position && Array.isArray(objData.position) ? 
                                new THREE.Vector3().fromArray(objData.position) : 
                                new THREE.Vector3());
                        
                        const cube = this.createDemoCubeAt(position, false);
                        resolve(cube);
                    }
                });
            });
            
            // Wait for all models to load and add them to the scene
            const loadedModels = await Promise.all(loadPromises);
            loadedModels.forEach(model => {
                if (model) {
                    this.scene.add(model);
                }
            });
            
            console.log(`Loaded ${loadedModels.filter(m => m !== null).length} objects in parallel`);
            
            // Reset file input
            event.target.value = '';
            
            // Restore HUD
            if (hud) {
                setTimeout(() => {
                    hud.innerHTML = originalHUD;
                }, 2000);
            }
            console.log(`Scene loaded: ${objects.length} objects`);
            
        } catch (error) {
            console.error('Error loading scene:', error);
            alert('Error loading scene. See console for details.');
        } finally {
            // Restore HUD
            if (hud) {
                hud.innerHTML = originalHUD;
            }
        }
    }
    
    update() {
        // Update rotation if an object is selected and rotation is active
        if (this.selectedObject && this.isRotating) {
            this.selectedObject.rotation.y += 0.02;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
    }
    
    // Method to initialize the properties panel and its event listeners
    initializePropertiesPanel() {
        // Get references to the properties panel elements
        this.propertiesPanel = document.getElementById('properties-panel');
        this.propertiesList = document.getElementById('properties-list');
        this.addPropertyBtn = document.getElementById('add-property-btn');
        
        console.log('Properties panel elements:', {
            panel: this.propertiesPanel,
            list: this.propertiesList,
            button: this.addPropertyBtn
        });
        
        // Set up properties panel event listeners
        if (this.addPropertyBtn) {
            // Store reference to this for use in the event listener
            const self = this;
            
            // Use mousedown instead of click to prevent blur events from deselecting
            this.addPropertyBtn.addEventListener('mousedown', function(event) {
                // Prevent default to avoid any potential form submission
                event.preventDefault();
                
                // Don't stop propagation here as we want the panel to stay focused
                
                // Only add property if we have a selected object
                if (self.selectedObject) {
                    // Use setTimeout to ensure this runs after any other click handlers
                    setTimeout(() => {
                        self.addProperty();
                    }, 0);
                }
            });
            
            // Also prevent click events from propagating
            this.addPropertyBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                event.preventDefault();
            });
            
            // Prevent focus from being removed from the panel
            this.addPropertyBtn.addEventListener('focus', function(event) {
                event.stopPropagation();
            });
            
            console.log('Added event listeners to add property button');
        } else {
            console.warn('Add property button not found. The properties panel may not function correctly.');
        }
    }
}

// Initialize the application when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const app = new AssetLevelEditor();
    
    // Make app globally available for debugging
    window.app = app;
    
    // Start the animation loop
    function animate() {
        requestAnimationFrame(animate);
        app.renderer.render(app.scene, app.camera);
        app.controls.update();
        app.update();
    }
    animate();
});
