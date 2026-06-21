---
title: Qrcarta
emoji: 👁
colorFrom: red
colorTo: indigo
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

---

## Cómo replicar una carta nueva (5 pasos)

El motor es **un solo archivo** (`app.py`: frontend + backend). Para una carta nueva NO se toca la
lógica: se edita un bloque y se setean variables.

1. **Copiá esta carpeta** a una nueva (o nuevo Space) — `agencia/clientes/<cliente>/`.
2. **Editá `CARTA_CONFIG`** en `app.py` (nombre, colores `--accent`, chips, links de reseñas) y el
   **menú** (`EMBEDDED_MENU_JSON`: platos, precios, saludo). Es el único lugar a tocar.
3. **Seteá las variables** (ver `.env.ejemplo`): `RESTAURANT_ID` único, `GEMINI_API_KEY`,
   `MINIMAX_API_KEY` (la `sk-cp` del plan de créditos), `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
4. **Caché de voz (Supabase Storage):** creá un bucket **`tts-cache`** (privado) en el proyecto
   Supabase. La carta guarda ahí cada frase ya hablada y la reusa ($0 e instantáneo la 2ª vez). El
   caché se aísla por `RESTAURANT_ID`, así varias cartas comparten el mismo proyecto sin pisarse. Si
   no configurás Supabase, la voz funciona igual (sin caché).
5. **Deploy** al Space (Docker). Listo.

> **Voz:** MiniMax T2A v2 (`speech-02-turbo`), velocidad `MINIMAX_SPEED` (default 1.2; subila a
> 1.25/1.3 si la querés más rápida). Sin créditos en MiniMax, la voz no suena: cargá el plan de
> tokens/créditos y usá la key `sk-cp-…`.

---

## Mesa automática por QR (un QR por mesa)

La carta toma el número de mesa de la URL: `https://TU-SPACE.hf.space/?mesa=7`.
Si el QR trae `?mesa=N`, la mesa queda **fija y no editable** (el comensal no la escribe). Si se entra
sin parámetro (link pelado), cae al modo manual (le pregunta la mesa). Acepta `?mesa=`, `?m=` o `?table=`.

**Generar los 30 QR (una sola vez).** Cada mesa lleva su propia URL con su número. No es trabajo de
código: es generar 30 imágenes. Ejemplo con Python (`pip install qrcode[pil]`):

```python
import qrcode
BASE = "https://TU-SPACE.hf.space/"   # ← poné la URL real del Space
for n in range(1, 31):                 # mesas 1..30
    qrcode.make(f"{BASE}?mesa={n}").save(f"mesa-{n:02d}.png")
```

Imprimís cada `mesa-NN.png` y lo pegás en su mesa. (También sirve cualquier generador masivo de QR
online cargando las 30 URLs.)
