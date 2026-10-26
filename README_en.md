# XLink Chat OBS Bridge

> [!TIP]
> Spanish README: [README.md](README.md)

This project allows you to capture XLink Kai chat messages from the browser and display them in OBS Studio as text overlay with automatic capture.

## How it Works

### 1. Chrome Extension (`xlink-kai-chat-extension/`)
- Automatically detects XLink Kai chats on web pages
- Captures new messages in real time
- Sends messages to OBS plugin via HTTP

### 2. OBS Plugin (`obs-python-plugin/`)
- Python script that runs inside OBS
- Built-in HTTP server to receive messages
- Updates text sources in real time

## Installation

### Step 1: Install browser extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (usually located in the top right corner of the screen)
3. Click "Load unpacked"
4. Select the `xlink-kai-chat-extension` folder

Note: This step may be different depending on your browser.

### Step 2: Install OBS plugin

1. In OBS Studio:
   - Go to `Tools` → `Scripts`
   - Click the `+` button and select `xlink_kai_chat_plugin.py` located inside the `obs-python-plugin` folder

2. Select a Python interpreter from your system:
   - Go to `Tools` → `Scripts` → `Python Settings`
   - Select the path where you have Python installed.
      - *For example: `.../AppData/Local/Programs/Python/Python310`* 

### Step 3: Configure OBS

1. **Create text source:**
   - In your scene, add a source → `Text (GDI+)`
   - Name it `XLink Kai Chat` (or whatever you prefer)

2. **Configure the plugin:**
   - In the Scripts window, select the plugin
   - Configure:
     - **Server port:** 5000 (default)
     - **Text source name:** The name you gave to your source
     - **Maximum messages:** How many messages to show (default 10)

3. **Customize the style:**
   - Right-click on your text source → `Properties`
   - Configure font, size, color, background, shadows, etc.
   - The plugin only updates the text, you have complete control over the styling

## Usage

1. **Open XLink Kai in your browser**
2. **Go to a room with active chat**
3. **Capture starts automatically** - Messages appear in OBS!

You don't need to click anything, the extension detects the chat and starts capturing automatically.

## Additional Information

- Access plugin status and statistics by visiting `http://localhost:5000/status`


## Troubleshooting

### I see "XLink Kai chat not detected"...
- The XLink Kai chat is empty when the page first loads.
- Message capture will start automatically as soon as there is at least one message in the chat.

### I see "Connection error" when testing the connection...
- Verify that OBS is running
- Verify that the plugin is loaded in OBS
- Verify that you have selected a Python interpreter in OBS settings
- Check that the port is correct (5000 by default)

### Connection is correct, but no messages appear in OBS...
- Verify that the source name matches the one in the plugin settings
- Make sure the source is of type "Text (GDI+)"

### Messages remain written in OBS after exiting the application...
- Messages are stored only in memory (lost when closing OBS)
- They are automatically cleared when restarting OBS and connecting it with the browser extension

#### Responsible Use of AI

> This project has been built entirely using artificial intelligence, being supervised and controlled by real humans.