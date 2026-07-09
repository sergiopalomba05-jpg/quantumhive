# Habilidades Multimedia - Índice

Este directorio contiene todos los skills, pipelines, planes y specs relacionados con multimedia (video, audio, imagen, avatares).

## Estructura

```
habilidades-multimedia/
├── skills/          # Skills de OpenCode reutilizables
├── pipelines/       # Pipelines automatizados (conexión ComfyUI, renderizado, etc.)
├── plans/           # Planes de implementación
├── specs/           # Specs de arquitectura y diseño
└── README.md        # Este archivo
```

## Contenido

### Skills
- `gpu-vm-setup.md` - Setup de VM GPU con ComfyUI + NVIDIA drivers
- `comfyui-rmbg.md` - Background removal con ComfyUI
- `voice-engine.md` - Motor de voz (F5-TTS + XTTS v2) [PRÓXIMO]

### Pipelines
- `comfyui-remote-connection.md` - Conexión remota a ComfyUI desde máquina local
- `avatar-video-processing.md` - Procesamiento de video de avatar (quitar fondo + WebP)
- `voice-cloning-saas.md` - Pipeline de clonación de voz como servicio [PRÓXIMO]

### Plans
- `2026-07-08-motor-avatares.md` - Plan de implementación del motor de avatares
- `2026-07-08-voice-engine.md` - Plan del motor de voz [PRÓXIMO]

### Specs
- `2026-07-08-motor-avatares-design.md` - Arquitectura del sistema de avatares
