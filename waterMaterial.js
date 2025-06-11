/**
 * Creates and configures a water material with wave effects
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @returns {BABYLON.StandardMaterial} The configured water material
 */
function createWaterMaterial(scene) {
    // Create water material with a vibrant light blue color
    const waterMaterial = new BABYLON.StandardMaterial("waterMaterial", scene);
    waterMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.5, 1.0);  // Brighter blue
    waterMaterial.specularColor = new BABYLON.Color3(0.7, 0.8, 1.0);  // Light blue specular
    waterMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.4, 1.0);  // Blue emissive
    waterMaterial.ambientColor = new BABYLON.Color3(0.4, 0.6, 1.0);   // Ambient light blue
    waterMaterial.alpha = 0.9;
    
    // Create a wave effect using a noise texture
    const noiseTexture = new BABYLON.NoiseProceduralTexture("perlin", 1028, scene);
    noiseTexture.animationSpeedFactor = 0.5;
    noiseTexture.persistence = 0.8;
    noiseTexture.brightness = 0.5;
    noiseTexture.octaves = 3;
    
    // Scale down the texture UVs to make the pattern 100x smaller
    noiseTexture.vScale = 1;  // 1/100 of original size
    noiseTexture.uScale = 1;  // 1/100 of original size
    
    // Apply bump texture for wave effect
    waterMaterial.bumpTexture = noiseTexture;
    waterMaterial.bumpTexture.level = 0.3;
    
    // Create reflection using the white texture with a light blue tint
    const reflectionTexture = new BABYLON.Texture("Assets/Textures/100x100White.png", scene);
    reflectionTexture.level = 0.3;
    
    // Configure reflection properties
    waterMaterial.reflectionTexture = reflectionTexture;
    waterMaterial.reflectionTextureColor = new BABYLON.Color3(0.3, 0.5, 1.0);
    waterMaterial.useReflectionOverAlpha = true;
    waterMaterial.useReflectionFresnelFromSpecular = true;
    waterMaterial.specularPower = 128;
    
    return waterMaterial;
}

/**
 * Creates a water plane with the water material
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {Object} options - Configuration options
 * @param {number} [options.size=1] - Size of the water plane
 * @param {number} [options.subdivisions=1] - Number of subdivisions for smoothness
 * @returns {BABYLON.Mesh} The water plane mesh
 */
function createWaterPlane(scene, options = {}) {
    const {
        size = 1,
        subdivisions = 1
    } = options;
    
    const waterMaterial = createWaterMaterial(scene);
    
    // Create water plane
    const water = BABYLON.MeshBuilder.CreateGround("water", {
        width: size,
        height: size,
        subdivisions: subdivisions
    }, scene);
    
    water.material = waterMaterial;
    water.position.y = 0;
    
    return water;
}

// Export the functions
export { createWaterMaterial, createWaterPlane };
