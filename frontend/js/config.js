/**
 * Central configuration for ContractCheck frontend
 */
const CC_CONFIG = {
    // Determine API URL based on current hostname
    API_URL: window.location.hostname.includes('contractcheck.ru')
        ? 'https://contractcheck.ru/api'
        : (window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
            ? 'http://127.0.0.1:8000/api'
            : `http://${window.location.hostname}:8000/api`,

    SELECTORS: {
        // Shared selectors if needed
    }
};

// Log configuration in development
if (!window.location.hostname.includes('contractcheck.ru')) {
    console.log('ContractCheck Config Loaded:', CC_CONFIG);
}
