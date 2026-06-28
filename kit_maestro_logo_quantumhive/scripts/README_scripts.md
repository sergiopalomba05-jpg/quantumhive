# Scripts del Logo Motion Kit

## kling_logo_motion.py

Prepara el payload para generar la animacion del logo de QuantumHive con Kling.

Por seguridad corre en dry-run por defecto:

```powershell
python kit_maestro_logo_quantumhive/scripts/kling_logo_motion.py
```

Esto genera:

```text
outputs/kling_generados/quantumhive_logo_motion_v01_payload_dry_run.json
outputs/kling_generados/quantumhive_logo_motion_v01_metadata.json
```

## Ejecucion real

No ejecutar hasta confirmar la documentacion oficial vigente de Kling.

Variables necesarias:

```text
KLING_API_KEY
KLING_API_BASE_URL
KLING_CREATE_ENDPOINT
```

Variables opcionales:

```text
KLING_API_SECRET
KLING_STATUS_ENDPOINT
KLING_MODEL
KLING_AUTH_HEADER_NAME
```

Ejemplo solo cuando Sergio confirme:

```powershell
$env:KLING_API_KEY='...'
$env:KLING_API_BASE_URL='https://endpoint-oficial-confirmado'
$env:KLING_CREATE_ENDPOINT='/ruta/oficial/confirmada'
python kit_maestro_logo_quantumhive/scripts/kling_logo_motion.py --run
```

El script no guarda credenciales en disco.

