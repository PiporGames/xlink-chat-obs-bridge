// Content script para detectar y capturar mensajes del chat de XLink Kai
class XLinkKaiChatMonitor {
    constructor() {
        this.lastMessageIndex = 0;
        this.serverUrl = 'http://localhost:5000';
        this.isEnabled = false;
        this.observer = null;
        this.lastKnownUser = ''; // Mantener el último usuario conocido persistentemente
        
        this.init();
    }

    async init() {
        console.log('Inicializando XLink Chat OBS Bridge...');
        
        // Obtener configuración desde storage primero
        try {
            const result = await chrome.storage.sync.get(['enabled', 'serverUrl']);
            this.isEnabled = result.enabled !== false; // Por defecto habilitado
            this.serverUrl = result.serverUrl || 'http://localhost:5000';
            
            console.log(`Configuración cargada: enabled=${this.isEnabled}, serverUrl=${this.serverUrl}`);
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
        
        // Buscar el elemento chat
        this.waitForChatElement();
    }

    waitForChatElement() {
        const chatElement = document.getElementById('chat');
        
        if (chatElement) {
            console.log('Elemento #chat encontrado');
            this.waitForMessages(chatElement);
        } else {
            console.log('Esperando elemento #chat...');
            // Observer para detectar cuando se cree el elemento #chat
            const bodyObserver = new MutationObserver((mutations) => {
                const chatElement = document.getElementById('chat');
                if (chatElement) {
                    console.log('Elemento #chat detectado');
                    bodyObserver.disconnect();
                    this.waitForMessages(chatElement);
                }
            });
            
            bodyObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    waitForMessages(chatElement) {
        console.log('Esperando mensajes en el chat...');
        
        // Verificar si ya hay mensajes
        if (this.hasMessages(chatElement)) {
            console.log('Mensajes encontrados, iniciando captura');
            this.startMonitoring();
            return;
        }
        
        // Observer para detectar cuando aparezcan mensajes
        const chatObserver = new MutationObserver((mutations) => {
            if (this.hasMessages(chatElement)) {
                console.log('Mensajes detectados, iniciando captura');
                chatObserver.disconnect();
                this.startMonitoring();
            }
        });
        
        chatObserver.observe(chatElement, {
            childList: true,
            subtree: true
        });
    }

    hasMessages(chatElement) {
        const messageRows = chatElement.querySelectorAll('div > table > tbody > tr');
        const hasContent = messageRows.length > 0;
        
        return hasContent;
    }

    startMonitoring() {
        console.log('Iniciando captura de mensajes');
        
        // Enviar mensajes existentes
        this.sendExistingMessages();
        
        // Configurar observer para nuevos mensajes
        this.setupMutationObserver();
        
        console.log('XLink Chat OBS Bridge activo');
    }

    sendExistingMessages() {
        const chatElement = document.getElementById('chat');
        if (!chatElement) {
            console.log('No se encontró el elemento chat');
            return;
        }

        // Resetear el estado del último usuario conocido
        this.lastKnownUser = '';
        
        const messages = this.extractMessages(chatElement);
        console.log(`Enviando ${messages.length} mensajes existentes`);
        
        if (messages.length === 0) {
            this.lastMessageIndex = 0;
            return;
        }
        
        // Enviar mensajes solo si no se han enviado antes
        if (this.lastMessageIndex === 0) {
            messages.forEach((message) => {
                this.sendMessage(message);
            });
            
            this.lastMessageIndex = messages.length;
        }
    }

    extractMessages(chatElement) {
        const messages = [];
        const messageRows = chatElement.querySelectorAll('div > table > tbody > tr');
        
        messageRows.forEach((row, index) => {
            const usernameCell = row.querySelector('td.chatUsername');
            const textCell = row.querySelector('td.chatText');
            
            if (usernameCell && textCell) {
                const username = usernameCell.textContent;
                const text = textCell.textContent;
                
                if (text && text.trim().length > 0) {
                    // Procesar el username con backtracking
                    let processedUsername = '';
                    
                    // Si hay usuario válido, actualizar lastKnownUser
                    if (username && username !== '&nbsp;' && username.trim && username.trim().length > 0) {
                        processedUsername = username.trim();
                        this.lastKnownUser = processedUsername;
                    } else {
                        // Usar el último usuario conocido (backtrack)
                        processedUsername = this.lastKnownUser;
                    }
                    
                    const messageObj = {
                        username: processedUsername,
                        text: text.trim(),
                        index: index
                    };
                    
                    messages.push(messageObj);
                }
            }
        });
        
        return messages;
    }

    setupMutationObserver() {
        const chatElement = document.getElementById('chat');
        if (!chatElement) return;

        // Configurar observer para detectar cambios en el chat
        this.observer = new MutationObserver((mutations) => {
            let hasNewMessages = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    hasNewMessages = true;
                }
            });
            
            if (hasNewMessages) {
                // Debounce para evitar múltiples procesamientos
                setTimeout(() => this.processNewMessages(), 100);
            }
        });

        // Observar cambios en el contenedor del chat
        this.observer.observe(chatElement, {
            childList: true,
            subtree: true
        });
    }

    processNewMessages() {
        const chatElement = document.getElementById('chat');
        if (!chatElement) return;

        const allMessages = this.extractMessages(chatElement);
        
        // Solo procesar mensajes nuevos
        if (allMessages.length > this.lastMessageIndex) {
            const newMessages = allMessages.slice(this.lastMessageIndex);
            console.log(`Procesando ${newMessages.length} mensajes nuevos`);
            
            newMessages.forEach(message => this.sendMessage(message));
            this.lastMessageIndex = allMessages.length;
        }
    }

    async sendMessage(message) {
        if (!this.isEnabled) {
            return;
        }
        
        try {
            const payload = {
                username: message.username || '',
                text: message.text,
                timestamp: new Date().toISOString()
            };
            
            console.log('Enviando mensaje:', payload);
            
            const response = await fetch(`${this.serverUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                console.error(`Error del servidor: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error);
        }
    }

    // Métodos para comunicación con popup y background script
    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getStatus':
                const chatElement = document.getElementById('chat');
                sendResponse({
                    enabled: this.isEnabled,
                    detected: chatElement && this.hasMessages(chatElement)
                });
                break;
                
            case 'toggle':
                this.isEnabled = request.enabled;
                const chatEl = document.getElementById('chat');
                if (this.isEnabled && chatEl && this.hasMessages(chatEl)) {
                    this.startMonitoring();
                } else if (!this.isEnabled && this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }
                sendResponse({success: true});
                break;
                
            case 'updateServer':
                this.serverUrl = request.url;
                sendResponse({success: true});
                break;
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Variable global para el monitor
let chatMonitor = null;

// Función para inicializar el monitor
function initializeMonitor() {
    console.log('Iniciando XLink Chat OBS Bridge...');
    
    if (!chatMonitor) {
        chatMonitor = new XLinkKaiChatMonitor();
        console.log('XLink Chat OBS Bridge inicializado');
    }
}

// Configurar listener para mensajes del popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (chatMonitor) {
        chatMonitor.handleMessage(request, sender, sendResponse);
    } else {
        sendResponse({ error: 'Monitor no disponible' });
    }
    return true; // Mantener canal abierto para respuesta asíncrona
});

// Inicializar cuando el DOM esté listo
console.log('Content script cargado');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM cargado, inicializando...');
        initializeMonitor();
    });
} else {
    initializeMonitor();
}

// Cleanup al descargar la página
window.addEventListener('beforeunload', () => {
    if (chatMonitor) {
        chatMonitor.destroy();
    }
});
