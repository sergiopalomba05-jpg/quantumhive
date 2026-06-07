---
name: frontend-design
description: Aplica el design system de QuantumHive/Directimport. Usar cuando se diseña UI, componentes, layouts, animaciones o cualquier elemento visual de la app o el panel admin.
---

# Frontend Design — QuantumHive / Directimport

## Paleta de colores
- **Fondo principal:** negro (#0a0a0a)
- **Fondo secundario / tarjetas:** azul muy oscuro casi gris (#1a1d23)
- **Acento principal:** dorado metálico (#d4a843)
- **Acento secundario:** dorado claro (#f0d080)
- **Texto principal:** blanco (#ffffff)
- **Texto secundario:** gris claro (#a0a0a8)
- **Bordes / separadores:** gris oscuro (#2a2d33)

## Identidad visual
- **Patrón de panales (hexágonos):** presente en fondos, tarjetas y elementos decorativos. Identidad de QuantumHive.
- **Profundidad:** sombras sutiles, tarjetas con elevación, overlays con blur.
- **Tipografía:** sans-serif moderna, pesos regular (400) para cuerpo, semibold (600) para títulos, bold (700) para displays.

## Componentes clave
- **Tarjetas de producto:** fondo #1a1d23, borde #2a2d33, hover con glow dorado sutil, imagen con border-radius 8px.
- **Botones primarios:** fondo dorado (#d4a843), texto negro, hover con brillo.
- **Botones secundarios:** outline dorado, fondo transparente.
- **Inputs:** fondo #1a1d23, borde #2a2d33, focus con borde dorado.
- **Navegación inferior:** iconos + texto, activo en dorado.
- **Barras de métrica:** animadas, color dorado con gradiente.

## 3D (React Three Fiber + Drei)
- Solo en elemento hero y lazy-load.
- Geometría flotante (icosaedro/torus con wireframe o shader).
- NO modelar productos en 3D (costo de asset alto).
- Orbe tipo Jarvis late mientras Timón "habla" o se graba audio.

## Fotos de catálogo
- Pipeline Photoroom: fondo de estudio blanco, sombra, nitidez.
- 1000 imágenes gratis en sandbox para arrancar.

## Tono visual
- Premium, profesional, tecnología de último nivel.
- Insinuación de Boca (negro + azul + dorado) sin ser Boca.
- No amarillo, no azul fuerte.
