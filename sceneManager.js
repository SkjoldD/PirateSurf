/**
 * Handles saving and loading scene states
 */
class SceneManager {
    /**
     * Create a new SceneManager
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     */
    constructor(scene) {
        this.scene = scene;
        this.placedModels = [];
    }

    /**
     * Save the current scene state to a JSON file
     */
    saveScene() {
        const sceneData = {
            models: this.placedModels.map(model => ({
                path: model.path,
                position: model.mesh.position.asArray(),
                rotation: model.mesh.rotation.asArray(),
                scaling: model.mesh.scaling.asArray()
            })),
            metadata: {
                savedAt: new Date().toISOString(),
                modelCount: this.placedModels.length,
                format: '1.0'
            }
        };
        
        // Create a download link
        const dataStr = "data:text/json;charset=utf-8," + 
                      encodeURIComponent(JSON.stringify(sceneData, null, 2));
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
     * @param {Function} placeModelCallback - Callback to handle model placement
     * @returns {Promise<void>}
     */
    async loadScene(placeModelCallback) {
        return new Promise((resolve) => {
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
                            await placeModelCallback(modelData);
                        } catch (modelError) {
                            console.error('Error loading model:', modelError);
                        }
                    }
                    
                    console.log(`Loaded scene with ${sceneData.models.length} models`);
                    resolve();
                } catch (error) {
                    console.error('Error loading scene:', error);
                    alert('Failed to load scene. Please check the console for details.');
                    resolve();
                }
            };
            
            input.click();
        });
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
     * @param {Object} model - The model to track with properties {mesh: BABYLON.Mesh, path: string}
     */
    trackModel(model) {
        if (!model || !model.mesh || !model.path) {
            console.error('Invalid model data provided to trackModel:', model);
            return;
        }
        
        if (!Array.isArray(this.placedModels)) {
            console.warn('placedModels was not an array, initializing');
            this.placedModels = [];
        }
        
        this.placedModels.push({
            mesh: model.mesh,
            path: model.path,
            timestamp: new Date()
        });
        
        console.log(`Tracked new model: ${model.path}, total models: ${this.placedModels.length}`);
    }
}

export { SceneManager };
