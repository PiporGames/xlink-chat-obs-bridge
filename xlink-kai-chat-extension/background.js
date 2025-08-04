chrome.runtime.onInstalled.addListener(() => {
    console.log('XLink Chat OBS Bridge instalada - captura automática habilitada');
    
    // Configuración por defecto
    chrome.storage.sync.set({
        enabled: true,
        serverUrl: 'http://localhost:5000'
    });
});
