# Kit Maestro Logo Motion QuantumHive v01

Este kit organiza los assets oficiales para preparar la animacion del logo de QuantumHive con un pipeline externo de Kling API.

## Objetivo

- Mantener el isotipo aprobado sin modificar.
- Ordenar keyframes 9:16 para logo motion.
- Separar tipografia transparente, referencias, outputs y scripts.
- Preparar un flujo en modo dry-run antes de consumir creditos.
- Evitar keys o credenciales dentro del repo.

## Contenido principal

- `isotipo/`: isotipo aprobado con canal alfa real y previews de verificacion.
- `keyframes_motion/`: keyframes verticales 9:16 para guiar la animacion.
- `tipografia_transparente/`: textos transparentes del lockup de marca.
- `referencias/`: fondos y documentos originales del paquete.
- `outputs/`: salidas generadas por Kling o editadas manualmente.
- `scripts/`: pipeline dry-run para preparar payloads.

## Regla principal

No modificar los assets originales.

Si se necesita una version editada, guardarla como salida nueva en `outputs/finales_editados/` o `outputs/kling_generados/`, nunca encima del asset base.

## Estado del pipeline

El script queda en modo dry-run por defecto.

No ejecuta Kling si no se pasan credenciales y endpoints oficiales mediante variables de entorno.

