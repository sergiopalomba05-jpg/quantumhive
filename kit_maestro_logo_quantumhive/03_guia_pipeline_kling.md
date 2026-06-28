# Guia de pipeline Kling

## Flujo recomendado

1. Revisar assets en `isotipo/`, `keyframes_motion/` y `tipografia_transparente/`.
2. Ejecutar el script en modo dry-run para generar el payload local.
3. Confirmar que el prompt, keyframes y paths sean correctos.
4. Configurar credenciales y endpoints oficiales de Kling por variables de entorno.
5. Ejecutar generacion real solo cuando Sergio confirme.
6. Guardar respuesta JSON en `outputs/kling_generados/`.
7. Descargar MP4 final como `outputs/kling_generados/quantumhive_logo_motion_v01.mp4`.
8. Guardar metadata en `outputs/kling_generados/quantumhive_logo_motion_v01_metadata.json`.
9. Editar versiones finales, si hace falta, en `outputs/finales_editados/`.

## Variables de entorno

```text
KLING_API_KEY
KLING_API_SECRET
KLING_API_BASE_URL
KLING_CREATE_ENDPOINT
KLING_STATUS_ENDPOINT
KLING_MODEL
```

## Estado de endpoint

No se hardcodea endpoint real en el repo.

Antes de ejecutar generacion real hay que confirmar la documentacion oficial vigente de Kling y completar:

```text
KLING_API_BASE_URL
KLING_CREATE_ENDPOINT
KLING_STATUS_ENDPOINT
```

## Modo seguro

El script corre en dry-run por defecto.

Dry-run:

- lee los assets
- lee el prompt
- arma el payload
- guarda JSON de payload
- no llama a Kling
- no consume creditos

Generacion real:

- requiere `--run`
- requiere `KLING_API_KEY`
- requiere `KLING_API_BASE_URL`
- requiere `KLING_CREATE_ENDPOINT`
- falla de forma explicita si falta configuracion

## Regla de seguridad

No subir keys al repo.

No escribir tokens en archivos.

No commitear respuestas con credenciales.

