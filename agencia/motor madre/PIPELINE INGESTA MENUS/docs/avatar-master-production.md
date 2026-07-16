# Produccion Del Master Sol V2

## Decision

Usar un unico master visual para Sol V2.

```txt
assets/avatar/sol/v2/masters/sol_v2_master_base.mkv
```

Uso:

```txt
idle     -> reproducir el master base directamente, sin MuseTalk y sin audio
speaking -> ajustar duracion del master base al WAV por loop/recorte, luego ejecutar MuseTalk 1.5
```

No fabricar dos videos generativos independientes para idle y speaking.

## Motivo

Un unico master base garantiza que idle y speaking compartan:

- misma identidad
- mismo tamaño
- mismo encuadre
- mismos hombros
- mismo blazer
- mismo broche
- mismo texto QuantumHive
- mismo fondo
- mismo movimiento corporal

Dos animaciones distintas pueden introducir diferencias pequeñas aunque ambas parezcan correctas.

## Fuente

Guardar la imagen neutral original en:

```txt
assets/avatar/sol/v2/sol_v2_master_neutral_source.png
```

Generar la imagen normalizada determinista en:

```txt
assets/avatar/sol/v2/sol_v2_master_neutral.png
```

Requisitos:

- 720 x 1280
- fondo exacto RGB(0,255,0)
- busto corto
- boca cerrada y relajada
- ojos abiertos
- mirada directa a camara
- cabeza recta
- hombros simetricos
- camisa cerrada
- blazer negro
- broche QuantumHive estable
- texto QuantumHive visible
- sin manos
- sin sombras, textura, gradientes ni halo en el verde
- sin recortar el mono

## Bloqueo De Regiones

La creacion del master debe animar solo:

- rostro
- ojos
- labios en posicion neutral
- region minima del cuello si es estrictamente necesario

Estas regiones deben quedar congeladas y recomponerse desde la imagen fuente:

- fondo
- blazer
- camisa
- hombros
- broche
- logo
- texto QuantumHive

Usar mascara facial con feather suave para insertar la region animada sobre la imagen original.

No permitir que el modelo regenere el cuerpo completo.

## Fondo Determinista

No confiar en el verde producido por un modelo generativo.

Flujo obligatorio:

```txt
animacion facial
-> segmentacion/mask estable de Sol
-> recomposicion frame a frame sobre RGB(0,255,0)
-> validacion matematica del fondo
```

El fondo fuera de la mascara debe tener desviacion de color practicamente nula.

Rechazar frames con:

- sombras
- gradientes
- ruido
- halo
- verdes no uniformes

## Formato Master

No usar H.264 yuv420p comprimido como fuente definitiva para chromakey.

Preferido:

```txt
1. Secuencia PNG lossless
2. FFV1 lossless en MKV
3. Fallback: H.264 CRF 0 con pix_fmt yuv444p
```

La version MP4 H.264 normal puede existir solo como preview.

## Master Candidato Actual

Artefactos generados:

```txt
assets/avatar/sol/v2/masters/sol_v2_master_base.mkv
assets/avatar/sol/v2/masters/sol_v2_master_idle.mp4
assets/avatar/sol/v2/masters/sol_v2_master_build_report.json
output/liveportrait_sol_v2/sol_v2_master_contact.jpg
```

Propiedades verificadas:

```txt
codec: FFV1
pix_fmt: bgr0
resolucion: 720x1280
fps: 25
duracion: 6.16s
frames: 154
fondo fuera de mascara: RGB(0,255,0) exacto, 100%, delta 0
```

Origen:

```txt
LivePortrait source: assets/avatar/sol/v2/sol_v2_master_neutral.png
LivePortrait driving: D:\LivePortrait\assets\examples\driving\d0.mp4
Postproceso: src/build_sol_v2_master_from_liveportrait.py
```

Estado: candidato tecnico validado, pendiente de aprobacion visual humana. Como se genero un loop ping-pong desde un driving de 3.12s, revisar especialmente que no haya parpadeo invertido ni sonrisa rara al volver.

## Movimiento Del Master

Duracion:

```txt
6 a 8 segundos
25 FPS
```

Debe contener:

- boca cerrada neutral
- uno o dos parpadeos naturales
- mirada directa
- respiracion practicamente imperceptible
- cabeza casi completamente fija
- hombros inmoviles
- camara bloqueada
- sin zoom
- sin cambio de escala

No debe contener:

- labios hablando
- sonrisa cambiante
- movimiento amplio de cuello
- movimiento visible de hombros
- inclinacion de cabeza
- cambios de iluminacion
- movimiento de camara
- deformacion de logo, texto o broche

## Loop

El primer y ultimo frame deben ser compatibles.

No usar ping-pong si contiene un parpadeo, porque produciria un parpadeo invertido.

Crear un ciclo naturalmente cerrado o aplicar una transicion corta solo si no produce doble imagen facial.

## QC Adicional Del Master

Medir:

- diferencia visual en region del blazer
- diferencia visual en region del broche
- diferencia visual en region del texto QuantumHive
- variacion del color de fondo
- variacion de escala facial
- desplazamiento del centro facial

Regla:

```txt
Las regiones congeladas deben tener diferencia practicamente cero entre frames, salvo ruido minimo de codificacion.
```

No aprobar el master si cambian:

- broche
- texto
- ropa
- fondo
- escala
- encuadre

## Pipeline Correcto MVP

```txt
imagen neutral aprobada
-> unico master base extremadamente estable
-> idle directo
-> speaking con mismo master + WAV + MuseTalk
-> alpha
-> QC
-> cache
```

La prioridad es estabilidad. Es mejor una Sol casi quieta y consistente que una Sol expresiva con artefactos.
