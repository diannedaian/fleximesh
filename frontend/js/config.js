/**
 * Application configuration
 */
export const config = {
    // API Configuration
    api: {
        baseUrl: '/api',
        timeout: 30000, // 30 seconds
    },

    // Three.js Configuration
    three: {
        backgroundColor: 0x222222,
        camera: {
            fov: 75,
            near: 0.1,
            far: 1000,
            position: { z: 5 },
        },
    },

    // Application Configuration
    app: {
        defaultStage: 'loading',
        debug: true, // Set to true for development, false for production
    },
};
