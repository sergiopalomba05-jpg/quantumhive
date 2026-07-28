# Roadmap Infraestructura - QuantumHive Stack

> Última actualización: 2026-07-12
> Estado: VM `comfyui-l4` APAGADA (costo $0)

---

## 1. Infraestructura Actual

### 1.1 VM GPU - `comfyui-l4`

| Campo | Valor |
|-------|-------|
| Zona | `us-east1-d` |
| Máquina | `g2-standard-16` (16 vCPU / 64 GB RAM) |
| GPU | NVIDIA L4 (24 GB VRAM) |
| Boot disk | 100 GB SSD (`pd-ssd`) |
| Data disk | 500 GB HDD (`pd-standard`) — montado en `D:\` |
| OS | Windows Server 2022 Datacenter |
| Estado | **TERMINATED** (apagada) |
| Costo/hora | ~$1.68 (GPU L4 ~$0.70 + máquina ~$0.98) |
| Snapshot boot | `comfyui-boot-snapshot` (100 GB) |
| Snapshot data | `comfyui-data-snapshot` (500 GB) |

**Contenido en la VM (confirmado por usuario):**
- NVIDIA drivers instalados
- ComfyUI instalado y funcionando
- Modelos descargados (Wan 2.1, etc.)
- Chrome, OpenCode, etc.

### 1.2 Cloud Run (3 servicios)

| Servicio | URL | Estado |
|----------|-----|--------|
| `motor-avatares` | `https://motor-avatares-4c7yyvt6cq-uc.a.run.app` | ✅ Ready |
| `quantumhive-catalogo` | `https://quantumhive-catalogo-4c7yyvt6cq-uc.a.run.app` | ✅ Ready |
| `yas-papeo-telegram-bot` | `https://yas-papeo-telegram-bot-4c7yyvt6cq-uc.a.run.app` | ✅ Ready |

### 1.3 Supabase (quantumhive-hermes)

| Componente | Detalle |
|------------|---------|
| Proyecto | `gbngjsulhqcwgkqoxozy` |
| URL | `https://gbngjsulhqcwgkqoxozy.supabase.co` |
| Edge Functions | `asistente` (v5), `crear-contenido` (v4) |
| Backend | Vertex AI REST API con service account |

### 1.4 Service Accounts

| Email | Uso |
|-------|-----|
| `vertex-ai-sa@...iam.gserviceaccount.com` | Vertex AI (Supabase functions) |
| `humania-deployer@...iam.gserviceaccount.com` | Deploy |
| `la-escaloneta-bot@...iam.gserviceaccount.com` | Bot Telegram |

### 1.5 Firewall Rules

| Regla | Puerto | Origen |
|-------|--------|--------|
| `allow-rdp-l4` | TCP 3389 | 0.0.0.0/0 |
| `allow-ssh` | TCP 22 | 0.0.0.0/0 |
| `allow-comfyui` | TCP 8188 | 0.0.0.0/0 |

---

## 2. Problemas a Resolver

### 2.1 RDP Cambia IP al Encender/Apagar
- Cada vez que se apaga y enciende la VM, puede asignarse una IP nueva
- **Solución:** Usar DNS estático o reservar IP interna

### 2.2 No hay API de ComfyUI para Agentes
- ComfyUI solo tiene Web UI (puerto 8188)
- Los agentes no pueden llamarla directamente
- **Solución:** API wrapper que exponga endpoints REST

### 2.3 No hay Orquestación Automática
- Hay que encender/apagar manualmente
- No hay monitoreo de costos en tiempo real
- **Solución:** Script de encendido/apagado + alertas de billing

### 2.4 Modelos Grandes, RAM Limitada
- Wan 2.1: ~10 GB (GGUF Q4)
- T5 encoder: ~11 GB (fp16)
- CLIP: ~2.4 GB
- Total carga: ~24-30 GB
- RAM disponible: 64 GB — **suficiente**
- VRAM disponible: 24 GB — **justo, puede necesitar offloading**

---

## 3. Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────┐
│                  PC LOCAL (Control)                  │
│                                                     │
│  OpenCode ──── Claude Desktop ──── Codex Desktop    │
│       │              │                │             │
│       └──────────────┼────────────────┘             │
│                      │ HTTP API                     │
└──────────────────────┼──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              VM GCP - comfyui-l4                    │
│         (encendida solo cuando hay trabajo)         │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   ComfyUI   │  │  API Server  │  │  Chrome   │  │
│  │  (puerto    │  │  (puerto     │  │  (RDP)    │  │
│  │   8188)     │  │   5000)      │  │           │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│                                                     │
│  D:\models\    D:\workflows\    D:\output\          │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   Cloud Run / Supabase              │
│                                                     │
│  motor-avatares │ catalogo │ telegram-bot           │
│  asistente (Edge Fn) │ crear-contenido (Edge Fn)   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Fases de Implementación

### Fase 1: Estabilizar VM (INMEDIATO)
- [ ] Encender VM y verificar que ComfyUI funciona
- [ ] Verificar modelos cargados (Wan 2.1, T5, CLIP)
- [ ] Generar una imagen de prueba desde la Web UI
- [ ] Generar un video corto de prueba (5 seg)
- [ ] Confirmar que no hay errores de memoria

### Fase 2: API de ComfyUI (1-2 días)
- [ ] Crear script Python `api_server.py` en la VM:
  - `POST /generate` → recibe workflow JSON + parámetros
  - `GET /status/{job_id}` → estado del job
  - `GET /result/{job_id}` → resultado (imagen/video)
  - `GET /queue` → cola de trabajos
- [ ] Exponer puerto 5000 (agregar firewall rule)
- [ ] Probar desde PC local con curl

### Fase 3: Conexión OpenCode → VM (1 día)
- [ ] En PC local, configurar OpenCode para llamar a la API
- [ ] Crear skill/tool `comfyui-generate` que:
  - Recibe prompt del usuario
  - Convierte a workflow JSON
  - Envía a la API de la VM
  - Espera resultado
  - Devuelve URL de la imagen/video

### Fase 4: Gestión de Costos (1 día)
- [ ] Script `start-vm.bat` → enciende VM + resetea contraseña RDP
- [ ] Script `stop-vm.bat` → apaga VM
- [ ] Configurar alerta de billing en GCP:
  - Alerta a $50/mes
  - Alerta a $100/mes
- [ ] Documentar procedure: "cuando necesito generar algo, hago X"

### Fase 5: Automatización Avanzada (futuro)
- [ ] Encendido programado (ej: de 10 a 22 hs)
- [ ] Auto-apagado si no hay requests por 30 min
- [ ] Backup automático de outputs a Cloud Storage
- [ ] Integración con Telegram: "generame un video" → envía a VM → devuelve video

---

## 5. Comandos de Referencia

### Encender VM
```powershell
C:\Users\sergio\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd compute instances start comfyui-l4 --zone=us-east1-d --project=project-aa5fb956-b08a-4e13-869
```

### Apagar VM
```powershell
C:\Users\sergio\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd compute instances stop comfyui-l4 --zone=us-east1-d --project=project-aa5fb956-b08a-4e13-869
```

### Resetear contraseña RDP
```powershell
C:\Users\sergio\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd compute reset-windows-password comfyui-l4 --zone=us-east1-d --project=project-aa5fb956-b08a-4e13-869 --user=sergio
```

### Conectar por RDP
```powershell
mstsc /v:IP_ACTUAL_DE_LA_VM
```

### Clonar VM desde snapshot
```powershell
gcloud compute disks create comfyui-clone --source-snapshot=comfyui-boot-snapshot --zone=us-east1-d
gcloud compute instances create comfyui-clone --zone=us-east1-d --machine-type=g2-standard-16 --accelerator=type=nvidia-l4,count=1 --disk=name=comfyui-clone,boot=yes
```

---

## 6. Presupuesto Mensual

| Escenario | Horas/día | Costo VM/mes | Discos | Total |
|-----------|-----------|--------------|--------|-------|
| **Mínimo** (1h/día) | 1 | $50 | $10 | **$60** |
| **Moderado** (4h/día) | 4 | $201 | $10 | **$211** |
| **Intensivo** (8h/día) | 8 | $403 | $10 | **$413** |
| **Sin usar** (0h) | 0 | $0 | $10 | **$10** |

> **REGLA: Si no estás generando nada, la VM debe estar APAGADA.**
> El costo de disco es ~$10/mes (100GB SSD + 500GB HDD), eso no se puede evitar.

---

## 7. Checklist Pre-Encendido

Antes de encender la VM para trabajar:

- [ ] ¿Qué voy a generar? (imagen, video, cuántos segundos)
- [ ] ¿Cuánto tiempo voy a tardar? (estimar horas)
- [ ] ¿Tengo el workflow listo en la VM?
- [ ] ¿El costo estimado es aceptable?
- [ ] ¿Voy a apagar cuando termine?

**Tiempo estimado de generación (Wan 2.1, L4 24GB VRAM):**
- Imagen 1024×1024: ~30 segundos
- Video 5 segundos (480p): ~2-5 minutos
- Video 10 segundos (480p): ~5-10 minutos
- Video 5 segundos (720p): ~10-20 minutos
