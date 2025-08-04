class ExtensionPopup {
    constructor() {
        this.statusDiv = document.getElementById('status');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.testButton = document.getElementById('testButton');
        
        this.init();
    }

    async init() {
        // Cargar configuración guardada
        await this.loadSettings();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar estado actual
        await this.checkStatus();
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get(['enabled', 'serverUrl']);
        this.serverUrlInput.value = result.serverUrl || 'http://localhost:5000';  // Puerto actualizado
    }

    setupEventListeners() {
        this.testButton.addEventListener('click', () => this.testConnection());
        this.serverUrlInput.addEventListener('change', () => this.saveServerUrl());
    }

    async checkStatus() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!tab || !tab.url) {
                this.updateStatus(false, false);
                return;
            }

            // Verificar si es una URL válida para content scripts
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('moz-extension://') || tab.url.startsWith('about:')) {
                this.updateStatus(false, false);
                return;
            }

            try {
                const response = await chrome.tabs.sendMessage(tab.id, {action: 'getStatus'});
                
                if (response) {
                    this.updateStatus(response.enabled, response.detected);
                } else {
                    this.updateStatus(false, false);
                }
            } catch (messageError) {
                // Content script no disponible - intentar inyectarlo
                console.log('Content script no disponible, intentando inyectar...');
                await this.injectContentScript(tab.id);
            }
        } catch (error) {
            console.error('Error verificando estado:', error);
            this.updateStatus(false, false);
        }
    }

    async injectContentScript(tabId) {
        try {
            // Inyectar el content script manualmente
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            // Esperar un poco y reintentar
            setTimeout(() => this.checkStatus(), 1000);
        } catch (injectionError) {
            console.error('Error inyectando content script:', injectionError);
            this.updateStatus(false, false);
        }
    }

    updateStatus(enabled, chatDetected) {
        if (!chatDetected) {
            this.statusDiv.textContent = 'Chat de XLink Kai no detectado';
            this.statusDiv.className = 'status no-chat';
        } else {
            this.statusDiv.textContent = 'Captura automática activa';
            this.statusDiv.className = 'status active';
        }
    }

    async testConnection() {
        const url = this.serverUrlInput.value;
        this.testButton.disabled = true;
        this.testButton.textContent = 'Probando...';
        
        try {
            const response = await fetch(`${url}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                alert('✅ Conexión exitosa con el servidor OBS');
            } else {
                alert(`❌ Servidor responde pero con error: ${response.status}`);
            }
        } catch (error) {
            alert('❌ No se puede conectar al servidor. Verifica que el plugin de OBS esté ejecutándose.');
        } finally {
            this.testButton.disabled = false;
            this.testButton.textContent = 'Probar conexión';
        }
    }

    async saveServerUrl() {
        const url = this.serverUrlInput.value;
        await chrome.storage.sync.set({serverUrl: url});
        
        // Notificar al content script
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            await chrome.tabs.sendMessage(tab.id, {
                action: 'updateServer',
                url: url
            });
        } catch (error) {
            // Ignorar si no hay content script activo
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ExtensionPopup();
});
