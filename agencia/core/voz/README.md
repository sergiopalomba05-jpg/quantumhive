# Motor de Voz — QuantumHive

TTS propio **multi-voz** (clonación) en **GPU serverless**. Una sola GPU aloja **todas** las voces
de todas las cartas/bots (demos, clientes, rubros). Sumar una voz = registrar su audio de referencia,
no otra GPU.

- **Modelo:** Chatterbox Multilingual (Resemble AI) — **licencia MIT** (uso comercial permitido).
- **Plataforma:** Modal — **scale-to-zero** (solo paga cuando genera audio; idle = $0).
- **Acento argentino:** sale del **audio de referencia** de cada voz (clonación zero-shot).

## Deploy (una sola vez)

1. Crear cuenta en <https://modal.com/signup> con GitHub (**sin tarjeta**, $30/mes gratis).
2. En tu compu (con internet):
   ```bash
   pip install modal
   modal setup                     # abre el navegador y vincula tu cuenta
   ```
3. Crear el token del motor (inventá uno largo, no lo compartas):
   ```bash
   modal secret create qh-motor-voz-token MOTOR_VOZ_TOKEN=pegá-acá-un-token-largo-tuyo
   ```
4. Deployar:
   ```bash
   modal deploy agencia/core/voz/motor_voz.py
   ```
   Modal imprime las **URLs públicas** de `/clone`, `/tts` y `/health`. Guardalas.

## Registrar una voz (clonar)

`POST` a la URL de **/clone**:
```json
{ "token": "tu-token", "voice_id": "mesera-arg", "audio_b64": "<wav o mp3 en base64>" }
```
Audio de referencia ideal: **15-30 seg, limpio, sin ruido** (NO WhatsApp — comprime y baja la calidad).

## Generar voz

`POST` a **/tts**:
```json
{ "token": "tu-token", "texto": "Hola, ¿qué vas a pedir?", "voice_id": "mesera-arg", "idioma": "es" }
```
Devuelve un **MP3**.

## Conectar una carta/bot

Cada carta lleva en sus env vars: `VOZTTS_URL` (la url de /tts), `VOZTTS_TOKEN` (tu token) y
`VOICE_ID` (el id de su voz). El carril `_voztts_synth` en `app.py` llama a este motor como un
proveedor de voz más. **(Lo agrego cuando el motor esté arriba y con tu voz registrada.)**

## Costo

GPU **T4 con scale-to-zero**: ~**$0.20 por hora de audio generado**; idle = $0. Tus **$30/mes**
de Modal alcanzan para muchísimo. Varias cartas comparten la misma GPU → el costo se reparte.

## Notas

- El **primer** cold start es lento (descarga el modelo al volumen `qh-hf-cache`); después, rápido.
- Si Chatterbox va lento, en `motor_voz.py` cambiá `gpu="T4"` por `"L4"` o `"A10G"`.
- **Multi-voz:** cada cliente/rubro = un `voice_id` distinto. La misma GPU los sirve a todos.
- Es una **v1**: en el primer `modal deploy` puede que haya que ajustar 1-2 detalles de versión
  (normal con modelos ML). Lo afinamos con los logs del deploy.
