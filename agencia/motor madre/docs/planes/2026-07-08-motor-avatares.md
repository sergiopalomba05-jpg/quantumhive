# Motor de Avatares — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un avatar conversacional para restaurantes que responda en tiempo real mientras el comensal espera su pedido.

**Arquitectura:** FastAPI + WebSocket en VM GPU (L4) + Gemini Live API para cerebro/voz + LivePortrait para lip-sync + PWA React existente extendida con vista de avatar.

**Tech Stack:** Python 3.12, FastAPI, WebSockets, google-genai SDK, LivePortrait, React 19, Vite 8, Supabase

## Global Constraints

- GPU: NVIDIA L4 (24GB VRAM) en VM GCP Windows
- Resolución avatar: 480x854 vertical, 24fps
- Audio: PCM 16kHz (Gemini output)
- Latencia objetivo: <2 segundos de respuesta completa
- Idioma: español (configurable por restaurante)
- La PWA actual NO se rompe — solo se agrega una nueva vista

---

## Fase 0: Validación (1-2 semanas)

### Task 0.1: Configurar entorno de desarrollo en la VM

**Files:**
- Create: `motor-avatares/.gitignore`
- Create: `motor-avatares/README.md`

**Steps:**

- [ ] **Step 1: Conectar a la VM por RDP**

Abrir RDP con `34.73.247.22`, usuario `sergio`.

- [ ] **Step 2: Abrir PowerShell como administrador y clonar el repo**

```powershell
cd C:\
git clone https://github.com/USUARIO/boveda-obsidian.git
cd boveda-obsidian
```

- [ ] **Step 3: Crear estructura del motor de avatares**

```powershell
mkdir motor-avatares\backend
mkdir motor-avatares\frontend
mkdir motor-avatares\config
```

- [ ] **Step 4: Crear .gitignore**

Crear `motor-avatares/.gitignore` con:
```
__pycache__/
*.pyc
.env
.venv/
*.egg-info/
dist/
build/
node_modules/
.DS_Store
```

- [ ] **Step 5: Commit**

```powershell
git add motor-avatares/
git commit -m "feat: init motor-avatares structure"
```

---

### Task 0.2: Validar que Gemini Live API funciona

**Files:**
- Create: `motor-avatares/backend/test_gemini.py`
- Create: `motor-avatares/requirements.txt`

**Interfaces:**
- Produces: Conexión verificada con Gemini Live API

**Steps:**

- [ ] **Step 1: Crear requirements.txt**

Crear `motor-avatares/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
websockets==12.0
google-genai==1.0.0
python-dotenv==1.0.0
pydantic==2.9.0
```

- [ ] **Step 2: Crear entorno virtual e instalar dependencias**

```powershell
cd C:\boveda-obsidian\motor-avatares
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 3: Crear test_gemini.py**

Crear `motor-avatares/backend/test_gemini.py`:
```python
import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def test_live():
    """Test básico de Gemini Live API."""
    with client.live.connect(
        model="gemini-2.5-flash-native-audio",
        config=types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            )
        ),
    ) as session:
        print("Conectado a Gemini Live API")
        print("Enviando mensaje de prueba...")
        
        session.send_client_content(
            turns=types.Content(
                role="user",
                parts=[types.Part(text="Hola, soy un avatar de restaurante. ¿Puedes saludarme en español?")]
            ),
            turn_complete=True
        )
        
        for chunk in session.receive():
            if chunk.server_content:
                if chunk.server_content.model_turn:
                    for part in chunk.server_content.model_turn.parts:
                        if part.inline_data:
                            print(f"Audio recibido: {len(part.inline_data.data)} bytes")
                if chunk.server_content.turn_complete:
                    print("Respuesta completada")
                    break

if __name__ == "__main__":
    test_live()
```

- [ ] **Step 4: Crear archivo .env con la API key**

```powershell
echo GEMINI_API_KEY=tu_api_key_aqui > motor-avatares\.env
```

**IMPORTANTE:** Nunca commitear el archivo `.env`.

- [ ] **Step 5: Ejecutar test**

```powershell
cd C:\boveda-obsidian\motor-avatares
.\.venv\Scripts\activate
python backend/test_gemini.py
```

Esperado: "Audio recibido: X bytes" y "Respuesta completada".

- [ ] **Step 6: Commit (sin .env)**

```powershell
git add motor-avatares/requirements.txt motor-avatares/backend/test_gemini.py motor-avatares/.gitignore
git commit -m "feat: add gemini live api test"
```

---

### Task 0.3: Validar que LivePortrait funciona en la L4

**Files:**
- Create: `motor-avatares/backend/test_liveportrait.py`

**Steps:**

- [ ] **Step 1: Clonar LivePortrait en la VM**

```powershell
cd C:\
git clone https://github.com/KwaiVGI/LivePortrait.git
cd LivePortrait
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 2: Descargar modelos**

Seguir instrucciones de LivePortrait para descargar los modelos pre-entrenados.

- [ ] **Step 3: Crear test_liveportrait.py**

Crear `motor-avatares/backend/test_liveportrait.py`:
```python
import time
from pathlib import Path

def test_inference():
    """Test de inferencia de LivePortrait en GPU."""
    try:
        import torch
        print(f"CUDA disponible: {torch.cuda.is_available()}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        
        # Cargar modelo (esto varía según la versión de LivePortrait)
        # from live_portrait.pipeline import LivePortraitPipeline
        # pipeline = LivePortraitPipeline(...)
        
        print("LivePortrait cargado correctamente")
        print("Nota: Implementar inferencia real con audio de prueba")
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_inference()
```

- [ ] **Step 4: Ejecutar test**

```powershell
cd C:\boveda-obsidian\motor-avatares
.\.venv\Scripts\activate
python backend/test_liveportrait.py
```

- [ ] **Step 5: Commit**

```powershell
git add motor-avatares/backend/test_liveportrait.py
git commit -m "feat: add liveportrait test"
```

---

## Fase 1: Prototipo Funcional (2-4 semanas)

### Task 1.1: Backend FastAPI con WebSocket

**Files:**
- Create: `motor-avatares/backend/main.py`
- Create: `motor-avatares/backend/config.py`
- Create: `motor-avatares/backend/models.py`
- Create: `motor-avatares/backend/ws_manager.py`

**Interfaces:**
- Consumes: Gemini Live API, LivePortrait
- Produces: WebSocket server en puerto 8000

**Steps:**

- [ ] **Step 1: Crear config.py**

Crear `motor-avatares/backend/config.py`:
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    gemini_api_key: str
    gpu_device: str = "cuda:0"
    avatar_image_path: str = "config/avatar_default.png"
    audio_sample_rate: int = 16000
    video_fps: int = 24
    video_resolution: tuple = (480, 854)
    max_session_duration: int = 900  # 15 minutos
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

- [ ] **Step 2: Crear models.py**

Crear `motor-avatares/backend/models.py`:
```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SessionStart(BaseModel):
    avatar_id: str
    restaurante_id: str
    mesa_numero: Optional[int] = None

class AudioChunk(BaseModel):
    data: bytes
    timestamp: float

class AvatarFrame(BaseModel):
    image_data: bytes
    timestamp: float
    audio_chunk_id: str

class SessionEnd(BaseModel):
    session_id: str
    duracion_segundos: int
    resumen: Optional[str] = None
```

- [ ] **Step 3: Crear ws_manager.py**

Crear `motor-avatares/backend/ws_manager.py`:
```python
import asyncio
from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_locks: Dict[str, asyncio.Lock] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_locks[session_id] = asyncio.Lock()

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_locks:
            del self.session_locks[session_id]

    async def send_audio(self, session_id: str, audio_data: bytes):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_bytes(audio_data)

    async def send_video_frame(self, session_id: str, frame_data: bytes):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_bytes(frame_data)

manager = ConnectionManager()
```

- [ ] **Step 4: Crear main.py**

Crear `motor-avatares/backend/main.py`:
```python
import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from ws_manager import manager

app = FastAPI(title="Motor de Avatares API")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://directimport-app.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/avatar/{avatar_id}")
async def avatar_websocket(websocket: WebSocket, avatar_id: str):
    session_id = str(uuid.uuid4())
    
    try:
        await manager.connect(websocket, session_id)
        print(f"Conexión establecida: {session_id}")
        
        # TODO: Iniciar sesión con Gemini Live API
        # TODO: Cargar configuración del avatar desde Supabase
        # TODO: Iniciar pipeline de LivePortrait
        
        while True:
            # Recibir audio del cliente
            audio_data = await websocket.receive_bytes()
            
            # TODO: Enviar audio a Gemini Live API
            # TODO: Recibir respuesta de audio
            # TODO: Pasar audio a LivePortrait
            # TODO: Enviar frames de video de vuelta
            
            # Por ahora, eco de prueba
            await manager.send_audio(session_id, audio_data)
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        print(f"Desconexión: {session_id}")

@app.get("/health")
async def health():
    return {"status": "ok", "gpu": settings.gpu_device}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 5: Ejecutar y probar**

```powershell
cd C:\boveda-obsidian\motor-avatares
.\.venv\Scripts\activate
python backend/main.py
```

Abrir navegador en `http://localhost:8000/health` — debe mostrar `{"status":"ok"}`.

- [ ] **Step 6: Commit**

```powershell
git add motor-avatares/backend/
git commit -m "feat: add FastAPI backend with WebSocket server"
```

---

### Task 1.2: Integrar Gemini Live API en el WebSocket

**Files:**
- Modify: `motor-avatares/backend/main.py`
- Create: `motor-avatares/backend/gemini_handler.py`

**Interfaces:**
- Consumes: Config, WebSocket audio input
- Produces: Audio stream de Gemini

**Steps:**

- [ ] **Step 1: Crear gemini_handler.py**

Crear `motor-avatares/backend/gemini_handler.py`:
```python
import asyncio
from google import genai
from google.genai import types
from config import get_settings

settings = get_settings()

class GeminiLiveHandler:
    def __init__(self, api_key: str, system_prompt: str = ""):
        self.client = genai.Client(api_key=api_key)
        self.system_prompt = system_prompt or (
            "Eres un avatar amigable de un restaurante. "
            "El cliente está esperando su pedido. "
            "Conversa en español de forma cálida y profesional. "
            "Puedes recomendar platos, contar la historia del restaurante, "
            "o simplemente entretener al cliente. "
            "Sé breve y natural."
        )
        self.session = None
        self.audio_queue = asyncio.Queue()
    
    async def connect(self):
        """Establecer conexión con Gemini Live API."""
        self.session = await self.client.aio.live.connect(
            model="gemini-2.5-flash-native-audio",
            config=types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Aoede"
                        )
                    )
                ),
                system_instruction=types.Content(
                    role="system",
                    parts=[types.Part(text=self.system_prompt)]
                )
            )
        )
    
    async def send_audio(self, audio_data: bytes):
        """Enviar audio del usuario a Gemini."""
        if self.session:
            await self.session.send_realtime_input(
                audio=types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_data
                )
            )
    
    async def receive_audio(self):
        """Recibir audio de Gemini como stream."""
        if not self.session:
            return
        
        async for chunk in self.session.receive():
            if chunk.server_content:
                if chunk.server_content.model_turn:
                    for part in chunk.server_content.model_turn.parts:
                        if part.inline_data:
                            yield part.inline_data.data
                if chunk.server_content.turn_complete:
                    break
    
    async def close(self):
        """Cerrar conexión."""
        if self.session:
            await self.session.close()
```

- [ ] **Step 2: Modificar main.py para usar Gemini**

Actualizar `motor-avatares/backend/main.py`:
```python
import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from ws_manager import manager
from gemini_handler import GeminiLiveHandler

app = FastAPI(title="Motor de Avatares API")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://directimport-app.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/avatar/{avatar_id}")
async def avatar_websocket(websocket: WebSocket, avatar_id: str):
    session_id = str(uuid.uuid4())
    gemini = GeminiLiveHandler(api_key=settings.gemini_api_key)
    
    try:
        await manager.connect(websocket, session_id)
        await gemini.connect()
        print(f"Sesión iniciada: {session_id}")
        
        # Crear tarea para recibir respuestas de Gemini
        async def gemini_to_client():
            async for audio_chunk in gemini.receive_audio():
                await manager.send_audio(session_id, audio_chunk)
        
        gemini_task = asyncio.create_task(gemini_to_client())
        
        # Recibir audio del cliente y enviarlo a Gemini
        while True:
            audio_data = await websocket.receive_bytes()
            await gemini.send_audio(audio_data)
            
    except WebSocketDisconnect:
        gemini_task.cancel()
        await gemini.close()
        manager.disconnect(session_id)
        print(f"Sesión terminada: {session_id}")

@app.get("/health")
async def health():
    return {"status": "ok", "gpu": settings.gpu_device}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 3: Probar con un cliente WebSocket**

Instalar wscat para probar:
```powershell
npm install -g wscat
wscat -c ws://localhost:8000/ws/avatar/test-avatar
```

Hablar al micrófono (si el cliente lo soporta) o enviar datos de audio.

- [ ] **Step 4: Commit**

```powershell
git add motor-avatares/backend/gemini_handler.py motor-avatares/backend/main.py
git commit -m "feat: integrate Gemini Live API with WebSocket"
```

---

### Task 1.3: Integrar LivePortrait para lip-sync

**Files:**
- Create: `motor-avatares/backend/avatar_renderer.py`
- Modify: `motor-avatares/backend/main.py`

**Interfaces:**
- Consumes: Audio chunks de Gemini
- Produces: Video frames del avatar

**Steps:**

- [ ] **Step 1: Crear avatar_renderer.py**

Crear `motor-avatares/backend/avatar_renderer.py`:
```python
import asyncio
import numpy as np
from pathlib import Path
from config import get_settings

settings = get_settings()

class AvatarRenderer:
    def __init__(self, avatar_image_path: str):
        self.avatar_image_path = avatar_image_path
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Cargar modelo de LivePortrait."""
        try:
            # Placeholder: implementar con LivePortrait real
            # from live_portrait.pipeline import LivePortraitPipeline
            # self.model = LivePortraitPipeline(...)
            print(f"Modelo cargado desde: {self.avatar_image_path}")
        except Exception as e:
            print(f"Error cargando modelo: {e}")
            raise
    
    async def render_frame(self, audio_chunk: bytes) -> bytes:
        """
        Generar frame del avatar basado en audio.
        
        Args:
            audio_chunk: Fragmento de audio PCM
            
        Returns:
            JPEG bytes del frame renderizado
        """
        # Placeholder: implementar con LivePortrait real
        # 1. Convertir audio a features
        # 2. Generar landmarks faciales
        # 3. Deformar imagen del avatar
        # 4. Codificar a JPEG
        
        # Por ahora, retornar imagen placeholder
        return b"placeholder_frame"
    
    async def render_stream(self, audio_stream):
        """
        Generar stream de frames a partir de stream de audio.
        
        Args:
            audio_stream: AsyncGenerator de chunks de audio
            
        Yields:
            JPEG bytes de cada frame
        """
        async for audio_chunk in audio_stream:
            frame = await self.render_frame(audio_chunk)
            yield frame
```

- [ ] **Step 2: Integrar en main.py**

Actualizar la sección de procesamiento en `main.py`:
```python
from avatar_renderer import AvatarRenderer

# En avatar_websocket():
avatar_renderer = AvatarRenderer(settings.avatar_image_path)

# En el loop de procesamiento:
# Recibir audio de Gemini → renderizar frame → enviar a cliente
async def process_audio_to_video(audio_stream):
    async for frame in avatar_renderer.render_stream(audio_stream):
        await manager.send_video_frame(session_id, frame)
```

- [ ] **Step 3: Probar con audio de prueba**

Crear un script que envíe un archivo de audio y reciba frames:
```powershell
python backend/test_render.py
```

- [ ] **Step 4: Commit**

```powershell
git add motor-avatares/backend/avatar_renderer.py motor-avatares/backend/main.py
git commit -m "feat: integrate LivePortrait for lip-sync rendering"
```

---

### Task 1.4: Extender la PWA con vista de avatar

**Files:**
- Create: `directimport/app/src/AvatarView.tsx`
- Modify: `directimport/app/src/App.tsx` (agregar ruta)

**Interfaces:**
- Consumes: WebSocket server en VM GPU
- Produces: Interfaz de usuario para el avatar

**Steps:**

- [ ] **Step 1: Crear AvatarView.tsx**

Crear `directimport/app/src/AvatarView.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';

interface AvatarViewProps {
  avatarId: string;
  restauranteId: string;
  mesaNumero?: number;
  gpuServerUrl: string;
}

export default function AvatarView({ 
  avatarId, 
  restauranteId, 
  mesaNumero,
  gpuServerUrl 
}: AvatarViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Conectar WebSocket al servidor GPU
    const ws = new WebSocket(
      `wss://${gpuServerUrl}/ws/avatar/${avatarId}`
    );
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Conectado al servidor de avatares');
    };
    
    ws.onmessage = (event) => {
      // Recibir frames de video del avatar
      if (event.data instanceof Blob) {
        // Decodificar y mostrar frame
        const url = URL.createObjectURL(event.data);
        // Paint to canvas...
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('Desconectado del servidor');
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [avatarId, gpuServerUrl]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const audioData = event.inputBuffer.getChannelData(0);
          const buffer = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            buffer[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
          }
          wsRef.current.send(buffer.buffer);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      setIsListening(true);
    } catch (error) {
      console.error('Error accediendo al micrófono:', error);
    }
  };

  const stopListening = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div className="avatar-view">
      <div className="avatar-container">
        <canvas 
          ref={videoRef} 
          width={480} 
          height={854}
          className="avatar-canvas"
        />
      </div>
      
      <div className="controls">
        <button 
          onClick={isListening ? stopListening : startListening}
          className={`mic-button ${isListening ? 'active' : ''}`}
          disabled={!isConnected}
        >
          {isListening ? '🔇 Silenciar' : '🎤 Hablar'}
        </button>
        
        <div className="status">
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
      </div>
      
      <style>{`
        .avatar-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #000;
          color: #fff;
        }
        .avatar-container {
          max-width: 480px;
          margin: 0 auto;
        }
        .avatar-canvas {
          width: 100%;
          border-radius: 16px;
        }
        .controls {
          margin-top: 20px;
          text-align: center;
        }
        .mic-button {
          padding: 16px 32px;
          font-size: 18px;
          border-radius: 50px;
          border: none;
          background: #22c55e;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mic-button.active {
          background: #ef4444;
          animation: pulse 1s infinite;
        }
        .mic-button:disabled {
          background: #666;
          cursor: not-allowed;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .status {
          margin-top: 10px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Agregar ruta en App.tsx**

En `directimport/app/src/App.tsx`, agregar:
```tsx
import AvatarView from './AvatarView';

// En el router, agregar:
case 'avatar':
  return (
    <AvatarView
      avatarId={params.avatarId}
      restauranteId={params.restauranteId}
      mesaNumero={params.mesaNumero}
      gpuServerUrl="TU_VM_IP:8000"
    />
  );
```

- [ ] **Step 3: Crear página de prueba**

Crear un link de prueba: `https://directimport-app.onrender.com/?view=avatar&avatarId=test&restauranteId=test`

- [ ] **Step 4: Commit**

```powershell
git add directimport/app/src/AvatarView.tsx directimport/app/src/App.tsx
git commit -m "feat: add avatar view to PWA"
```

---

### Task 1.5: Deploy y prueba end-to-end

**Files:**
- Modify: `motor-avatares/backend/main.py` (cors, host)

**Steps:**

- [ ] **Step 1: Configurar CORS en FastAPI**

En `main.py`, actualizar origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://directimport-app.onrender.com",
        "http://localhost:5173",  # Para desarrollo local
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 2: Abrir puerto 8000 en la VM**

En Google Cloud Console → Firewall Rules → Crear regla:
- Nombre: `allow-avatar-ws`
- Puertos: `8000`
- Protocolo: `TCP`
- Rango de IPs: `0.0.0.0/0`

- [ ] **Step 3: Ejecutar el servidor en la VM**

```powershell
cd C:\boveda-obsidian\motor-avatares
.\.venv\Scripts\activate
python backend/main.py
```

- [ ] **Step 4: Probar desde la PWA**

Abrir la PWA en el celular → navegar a la vista de avatar → verificar que conecta al WebSocket.

- [ ] **Step 5: Commit final de Fase 1**

```powershell
git add -A
git commit -m "feat: phase 1 complete - avatar MVP functional"
```

---

## Fase 2: Multi-usuario (4-8 semanas)

> **Nota:** Esta fase se detallará cuando la Fase 1 esté completa y validada con usuarios reales.

### Tasks pendientes:
- Migrar de WebSocket a WebRTC
- Implementar WebRTC SFU (LiveKit)
- Agregar segundo servidor GPU
- Dockerizar el backend
- Autoscaling básico
- Métricas y monitoreo

---

## Fase 3: Escala (8-16 semanas)

> **Nota:** Esta fase se detallará cuando la Fase 2 esté funcionando con 10+ restaurantes.

### Tasks pendientes:
- GKE con autoscaling de nodos GPU
- TensorRT para optimizar LivePortrait
- CDN para assets
- Billing por uso
- Dashboard de analytics
- Multi-idioma
