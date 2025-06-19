// Import modules
import { createWaterPlane } from './waterMaterial.js';
import { AssetBrowser } from './assetBrowser.js';
import { InputHandler } from './inputHandler.js';

// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Initialize the Babylon.js engine
const engine = new BABYLON.Engine(canvas, true);

// Create the scene
const createScene = function() {
    // Create a basic Scene object
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.2, 1); // Dark blue background
    
    // Create a camera with default position and target
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);
    
    // Store the camera in the window for debugging
    window.camera = camera;
    
    // Add lighting
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    const sunLight = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -2, -1), scene);
    sunLight.intensity = 0.8;
    sunLight.position = new BABYLON.Vector3(10, 20, 10);
    
    // Create water plane using the water module
    const water = createWaterPlane(scene, {
        size: 1000,
        subdivisions: 200
    });
    
    // Animation for waves
    let time = 0;
    scene.registerBeforeRender(function() {
        time += 0.005;
        const waveIntensity = 0.1;
        const waveSpeed = 0.5;
        water.rotation.z = Math.sin(time * waveSpeed) * waveIntensity * 0.1;
        water.rotation.x = Math.cos(time * waveSpeed * 0.7) * waveIntensity * 0.1;
        
        // Animate the noise texture
        if (water.material.bumpTexture) {
            water.material.bumpTexture.time += 0.001;
        }
    });
    
    // Create asset browser
    const assetBrowser = new AssetBrowser(scene);
    
    // Initialize input handler for all input controls
    const inputHandler = new InputHandler(scene, camera, assetBrowser);
    window.inputHandler = inputHandler; // For debugging
    
    // Handle window resize
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    // Clean up on scene dispose
    scene.onDisposeObservable.add(() => {
        inputHandler.dispose();
        assetBrowser.dispose();
    });
    
    return scene;
};

// Call the createScene function
const scene = createScene();

// Run the render loop
engine.runRenderLoop(() => {
    scene.render();
});

// Handle browser/canvas resize events
window.addEventListener('resize', () => {
    engine.resize();
});
