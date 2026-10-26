# XLink Chat OBS Bridge

> [!TIP]
> English README: [README_en.md](README_en.md)

Este proyecto permite capturar mensajes del chat de XLink Kai desde el navegador y mostrarlos en OBS Studio como texto superpuesto con captura automática.  

## Funcionamiento

### 1. Extensión de Chrome (`xlink-kai-chat-extension/`)
- Detecta automáticamente chats de XLink Kai en páginas web
- Captura mensajes nuevos en tiempo real
- Envía mensajes al plugin de OBS via HTTP

### 2. Plugin de OBS (`obs-python-plugin/`)
- Script Python que se ejecuta dentro de OBS
- Servidor HTTP integrado para recibir mensajes
- Actualiza fuentes de texto en tiempo real

## Instalación

### Paso 1: Instalar extensión de navegador

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el "Modo de desarrollador" (Developer mode) ubicado (normalmente) en la esquina superior derecha de la pantalla
3. Haz clic en "Cargar extensión sin empaquetar" (Load unpacked)
4. Selecciona la carpeta `xlink-kai-chat-extension`

Nota: Este paso puede ser diferente dependiendo de tu navegador.

### Paso 2: Instalar plugin de OBS

1. En OBS Studio:
   - Ve a `Herramientas` → `Scripts`
   - Haz clic en el botón `+` y selecciona `xlink_kai_chat_plugin.py` ubicado dentro de la carpeta `obs-python-plugin`

2. Selecciona un interprete de Python de tu sistema:
   - Ve a `Herramientas` → `Scripts` → `Configuración de Python`
   - Selecciona la ruta donde tengas instalado Python.
      - *Por ejemplo: `.../AppData/Local/Programs/Python/Python310`* 

### Paso 3: Configurar OBS

1. **Crear fuente de texto:**
   - En tu escena, añade una fuente → `Texto (GDI+)`
   - Nómbrala `XLink Kai Chat` (o como prefieras)

2. **Configurar el plugin:**
   - En la ventana de Scripts, selecciona el plugin
   - Configura:
     - **Puerto del servidor:** 5000 (por defecto)
     - **Nombre de la fuente de texto:** El nombre que pusiste a tu fuente
     - **Máximo de mensajes:** Cuántos mensajes mostrar (por defecto 10)

3. **Personalizar el estilo:**
   - Haz clic derecho en tu fuente de texto → `Propiedades`
   - Configura fuente, tamaño, color, fondo, sombras, etc.
   - El plugin solo actualiza el texto, tú controlas completamente el estilo

## Uso

1. **Abre XLink Kai en tu navegador**
2. **Ve a una sala con chat activo**
3. **La captura se inicia automáticamente** - ¡Los mensajes aparecen en OBS!

No necesitas hacer clic en nada, la extensión detecta el chat y comienza a capturar automáticamente.

## Otra información

- Accede al estado y estadísticas del plugin visitando `http://localhost:5000/status`


## Solución de problemas

### Me aparece "Chat de XLink Kai no detectado"...
- El chat de XLink Kai está vacío al principio de cargar la página.
- La captura de mensajes comenzará automaticamente en el momento en el que esté presente, al menos, un mensaje en el chat.

### Me aparece "Error de conexión" al probar la conexión...
- Verifica que OBS esté ejecutándose
- Verifica que el plugin esté cargado en OBS
- Verifica que has seleccionado un interprete de Python en los ajustes de OBS
- Comprueba que el puerto sea el correcto (5000 por defecto)

### La conexión es correcta, pero no aparecen mensajes en OBS...
- Verifica que el nombre de la fuente sea el mismo que en el de los ajustes del plugin
- Asegúrate de que la fuente sea de tipo "Texto (GDI+)"

### Los mensajes se han quedado escritos en OBS luego de salir de la aplicación...
- Los mensajes se almacenan solo en memoria (se pierden al cerrar OBS)
- Se limpian automaticamente al reiniciar OBS y conectarlo con la extensión del navegador

#### Uso responsable de la IA

> Este proyecto ha sido construido en su totalidad utilizando inteligencia artificial, siendo supervisado y controlado por humanos de verdad.