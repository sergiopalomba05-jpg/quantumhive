# Procesos Aprendidos

Documentación de procesos, pipelines y skills que aprendimos y resolvimos durante el desarrollo.

## Estructura

```
procesos-aprendidos/
├── pipelines/       # Pipelines automatizados (conexión ComfyUI, renderizado, etc.)
├── skills/          # Skills de OpenCode reutilizables
└── README.md        # Este archivo
```

## Pipelines

- `comfyui-remote-connection.md` - Conexión remota a ComfyUI desde máquina local
- `avatar-video-processing.md` - Procesamiento de video de avatar (quitar fondo + WebP)
- `remove_bg_local.py` - Script Python para quitar fondo con rembg
- `create_webp.py` - Script Python para crear WebP con alpha desde frames
- `process-avatar-video.ps1` - Script PowerShell de procesamiento de video
- `setup-comfyui-remote.ps1` - Script PowerShell para iniciar ComfyUI con --listen

## Deploy

- `deploy-cloud-run-vertex-ai.md` - Deploy de motor de avatares en Cloud Run con Vertex AI (Gemini 2.5 Flash + Live API)
- `live-api-avatar.md` - Avatar de voz con Gemini Live API (native audio) en PWA + Cloud Run: armado paso a paso + bugs conocidos (responseModalities TEXT+AUDIO, WebViews duras Xiaomi/Huawei, PERMISSION_DENIED en actAs de Cloud Run)

## Skills

- `gpu-vm-setup.md` - Setup de VM GPU en GCP con ComfyUI + NVIDIA drivers
- `comfyui-reference-repos.md` - Repos de referencia Cubiq + Comfy-Org para workflows
