# Quantum Runner - Guía de Uso

El Quantum Runner es el "brazo local" de QuantumCore. Es un pequeño script que corre en tu computadora y se conecta a la nube para recibir comandos de los agentes de IA (como Dominus). Esto les permite ejecutar `git commit`, `npm run build` o modificar archivos directamente en tu disco duro.

## Requisitos
- Node.js versión 18 o superior.
- Conexión a Internet.

## ¿Cómo iniciar el Runner?

1. Abrí una terminal (PowerShell o CMD) en esta carpeta:
   `C:\Users\sergio\Desktop\boveda obsidian\ORQUESTADOR QUANTUM\QUANTUMCORE`

2. Ejecutá el siguiente comando:
   ```bash
   npm run runner
   ```

El Runner comenzará a ejecutarse y se conectará automáticamente a la instancia de producción en Cloud Run (`https://quantumcore-854335368640.us-central1.run.app`).

Verás este mensaje en la consola:
```
🚀 Iniciando Quantum Runner Local...
🔗 Conectando a QuantumCore en: https://quantumcore-854335368640.us-central1.run.app
```

A partir de este momento, cualquier agente dentro de QuantumCore que decida usar la herramienta `execute_local_command` enviará la orden a la nube, y tu Runner la descargará y ejecutará en tu PC, enviando la salida (logs) de vuelta al chat.

## ¿Cómo probarlo?
En el chat web de QuantumCore, decile a Dominus:
> "Dominus, ejecutá el comando `git status` en la terminal local usando el Quantum Runner."

## Funcionamiento Técnico
- **Polling:** El runner hace una petición a la nube cada 3 segundos buscando tareas pendientes.
- **Seguridad:** Los comandos se ejecutan con los permisos de tu usuario local de Windows.
- **Desconexión:** Si cerrás la terminal, el runner se apaga y Dominus perderá la capacidad de ejecutar comandos locales hasta que lo vuelvas a encender.
