import obspython as obs
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from datetime import datetime
import queue
import time

# Variables globales del plugin
chat_messages = []
max_messages = 10
server_port = 5000
text_source_name = "XLink Kai Chat"
message_queue = queue.Queue()
http_server = None
server_thread = None

class ChatHTTPHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/chat':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                message_data = json.loads(post_data.decode('utf-8'))
                      
                # Añadir mensaje a la cola para procesamiento en el hilo principal
                message_queue.put(message_data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode())
                
            except Exception as e:
                print(f"Error procesando mensaje HTTP: {e}")
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
    
    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            status = {
                "status": "running",
                "messages_count": len(chat_messages),
                "text_source": text_source_name
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Silenciar logs del servidor HTTP
        pass

def start_http_server():
    global http_server, server_thread
    try:
        # Detener servidor existente si existe
        if http_server is not None:
            print("Deteniendo servidor HTTP existente...")
            stop_http_server()
            time.sleep(0.2)  # Dar tiempo para que se libere el puerto
            
        http_server = HTTPServer(('localhost', server_port), ChatHTTPHandler)
        server_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
        server_thread.start()
        print(f"Servidor HTTP iniciado en puerto {server_port}")
    except Exception as e:
        print(f"Error iniciando servidor HTTP en puerto {server_port}: {e}")
        # Limpiar referencias si falló
        http_server = None
        server_thread = None

def stop_http_server():
    global http_server, server_thread
    if http_server:
        try:
            # Usar timeout para evitar bloqueos
            http_server.shutdown()
            http_server.server_close()
            print("Servidor HTTP detenido correctamente")
        except Exception as e:
            print(f"Error deteniendo servidor HTTP: {e}")
        http_server = None
    
    if server_thread and server_thread.is_alive():
        try:
            # Dar tiempo al hilo para terminar
            server_thread.join(timeout=2.0)
            if server_thread.is_alive():
                print("Advertencia: El hilo del servidor no se detuvo completamente")
        except Exception as e:
            print(f"Error esperando hilo del servidor: {e}")
        server_thread = None
    print("Servidor HTTP detenido")

def add_chat_message(message_data):
    global chat_messages, max_messages
    
    # Crear mensaje formateado
    username = message_data.get('username', '').strip()
    text = message_data.get('text', '').strip()
    
    print(f"Mensaje recibido: Usuario='{username}', Texto='{text}'")  # Debug
    
    if username and len(username) > 0:
        formatted_message = f"{username}: {text}"
    else:
        formatted_message = text
    
    # Añadir mensaje al historial
    chat_messages.append(formatted_message)
    
    # Mantener solo los últimos N mensajes
    if len(chat_messages) > max_messages:
        chat_messages = chat_messages[-max_messages:]
    
    # Actualizar fuente de texto en OBS
    update_text_source()

def update_text_source():
    global chat_messages, text_source_name
    
    # Buscar la fuente de texto
    source = obs.obs_get_source_by_name(text_source_name)
    if source is None:
        print(f"Fuente de texto '{text_source_name}' no encontrada")
        return
    
    # Crear el texto completo
    full_text = '\n'.join(chat_messages)
    
    # Configurar SOLO el texto, sin tocar el estilo
    settings = obs.obs_data_create()
    obs.obs_data_set_string(settings, "text", full_text)
    
    # Actualizar la fuente (solo el texto)
    obs.obs_source_update(source, settings)
    
    # Limpiar
    obs.obs_data_release(settings)
    obs.obs_source_release(source)

def process_message_queue():
    try:
        while not message_queue.empty():
            message_data = message_queue.get_nowait()
            add_chat_message(message_data)
    except queue.Empty:
        pass

# Propiedades del script (configuración en OBS)
def script_properties():
    props = obs.obs_properties_create()
    
    # Callback para reiniciar servidor cuando cambie el puerto
    port_prop = obs.obs_properties_add_int_slider(props, "port", "Puerto del servidor", 3000, 9999, 1)
    obs.obs_property_set_modified_callback(port_prop, on_port_changed)
    
    # Callback para actualizar fuente cuando cambie el nombre
    source_prop = obs.obs_properties_add_text(props, "source_name", "Nombre de la fuente de texto", obs.OBS_TEXT_DEFAULT)
    obs.obs_property_set_modified_callback(source_prop, on_source_name_changed)
    
    # Callback para ajustar mensajes
    messages_prop = obs.obs_properties_add_int_slider(props, "max_messages", "Máximo de mensajes", 5, 50, 1)
    obs.obs_property_set_modified_callback(messages_prop, on_max_messages_changed)
    
    return props

# Callbacks para actualización en tiempo real
def on_port_changed(props, prop, settings):
    global server_port
    new_port = obs.obs_data_get_int(settings, "port")
    if new_port != server_port:
        old_port = server_port
        server_port = new_port
        print(f"Cambiando puerto de {old_port} a {server_port}")
        stop_http_server()
        time.sleep(0.5)  # Esperar un poco antes de reiniciar
        start_http_server()
    return True

def on_source_name_changed(props, prop, settings):
    global text_source_name
    text_source_name = obs.obs_data_get_string(settings, "source_name")
    update_text_source()
    print(f"Fuente cambiada a '{text_source_name}'")
    return True

def on_max_messages_changed(props, prop, settings):
    global max_messages, chat_messages
    max_messages = obs.obs_data_get_int(settings, "max_messages")
    # Ajustar mensajes existentes al nuevo límite
    if len(chat_messages) > max_messages:
        chat_messages = chat_messages[-max_messages:]
        update_text_source()
    print(f"Máximo de mensajes cambiado a {max_messages}")
    return True

def script_defaults(settings):
    obs.obs_data_set_default_int(settings, "port", 5000)
    obs.obs_data_set_default_string(settings, "source_name", "XLink Kai Chat")
    obs.obs_data_set_default_int(settings, "max_messages", 10)

def script_update(settings):
    global server_port, text_source_name, max_messages
    
    # Obtener nuevos valores (esto ahora se maneja principalmente por los callbacks)
    server_port = obs.obs_data_get_int(settings, "port")
    text_source_name = obs.obs_data_get_string(settings, "source_name")
    max_messages = obs.obs_data_get_int(settings, "max_messages")
    
    # Actualizar texto existente
    update_text_source()

def script_description():
    return """<h2>XLink Chat OBS Bridge</h2>
    <p>Plugin que recibe mensajes del chat de XLink Kai desde una extensión de Chrome de XLCOB y los muestra en OBS.</p>
    <p><b>Configuración:</b></p>
    <ul>
        <li>Crea una fuente de "Texto (GDI+)" en tu escena</li>
        <li>Configura el nombre de la fuente en este plugin</li>
        <li>Personaliza el estilo visual directamente en las propiedades de la fuente</li>
        <li>Instala la extensión de Chrome correspondiente</li>
        <li>La extensión enviará mensajes automáticamente a http://localhost:[puerto]</li>
    </ul>
    <p><b>Nota:</b> Este plugin solo actualiza el texto. Configura colores, fuente, tamaño, etc. directamente en las propiedades de tu fuente de texto en OBS.</p>
    """

def script_load(settings):
    print("Cargando XLink Chat OBS Bridge...")
    
    # Detener cualquier instancia previa
    script_unload()
    
    # Aplicar configuración inicial
    script_update(settings)
    
    # Iniciar servidor HTTP
    start_http_server()
    
    # Registrar timer para procesar mensajes
    obs.timer_add(process_message_queue, 100)  # Cada 100ms
    
    print("XLink Chat OBS Bridge listo")

def script_unload():
    print("Descargando XLink Chat OBS Bridge...")
    
    # Detener timer primero
    try:
        obs.timer_remove(process_message_queue)
    except:
        pass  # El timer puede no existir
    
    # Detener servidor HTTP de forma segura
    try:
        stop_http_server()
    except Exception as e:
        print(f"Error deteniendo servidor: {e}")
    
    # Dar tiempo para que todo se cierre correctamente
    try:
        time.sleep(0.1)  # Reducir tiempo de espera
    except:
        pass
    
    print("XLink Chat OBS Bridge descargado")



# Sin uso
def script_tick(seconds):
    pass
