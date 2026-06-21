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
