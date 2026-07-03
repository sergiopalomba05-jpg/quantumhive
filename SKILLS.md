# Skills Disponibles En Este Entorno

Este archivo es un recordatorio rapido de las skills que OpenCode puede usar en este repo y en este usuario.

## Donde se cargan

- Skills del proyecto: `.opencode/skills/`
- Skills globales de OpenCode: `C:\Users\sergio\.opencode\skills\`
- Skills externas detectadas: `C:\Users\sergio\.claude\skills\`

OpenCode tambien esta configurado para escanear `~/.opencode/skills` desde `C:\Users\sergio\.config\opencode\opencode.jsonc`.

## Skills del proyecto

### `frontend-design`
- Ruta: `.opencode/skills/frontend-design/SKILL.md`
- Uso: aplicar el design system de QuantumHive/Directimport cuando se disena UI, componentes, layouts, animaciones o cualquier elemento visual de la app o del panel admin.

## Skills globales de OpenCode

### `ui-ux-pro-max`
- Ruta: `C:\Users\sergio\.opencode\skills\ui-ux-pro-max\SKILL.md`
- Uso: inteligencia de UI/UX con base de datos searchable. Sirve para elegir estilos, colores, tipografias, patrones y generar sistemas de diseno.

### `ui-styling`
- Ruta: `C:\Users\sergio\.opencode\skills\ui-styling\SKILL.md`
- Uso: construir interfaces accesibles y prolijas con shadcn/ui, Radix UI y Tailwind.

### `design`
- Ruta: `C:\Users\sergio\.opencode\skills\design\SKILL.md`
- Uso: skill amplia de diseno para identidad visual, logos, mockups, banners, iconos, slides y piezas visuales.

### `design-system`
- Ruta: `C:\Users\sergio\.opencode\skills\design-system\SKILL.md`
- Uso: arquitectura de tokens, especificaciones de componentes y sistemas de diseno consistentes.

### `banner-design`
- Ruta: `C:\Users\sergio\.opencode\skills\banner-design\SKILL.md`
- Uso: crear banners para redes, ads, website heroes, assets creativos y print.

### `brand`
- Ruta: `C:\Users\sergio\.opencode\skills\brand\SKILL.md`
- Uso: voz de marca, identidad visual, mensajes, consistencia y style guides.

### `slides`
- Ruta: `C:\Users\sergio\.opencode\skills\slides\SKILL.md`
- Uso: crear presentaciones HTML con estrategia, layouts responsivos y Chart.js.

## Skills externas detectadas

### `graphify`
- Ruta: `C:\Users\sergio\.claude\skills\graphify\SKILL.md`
- Uso: consultas sobre codebase, arquitectura, relaciones entre archivos y contenido de proyectos, especialmente cuando existe `graphify-out/`.

### `abogado-del-diablo`
- Ruta: `C:\Users\sergio\.claude\skills\abogado-del-diablo\SKILL.md`
- Uso: criticar sin filtros una idea, pitch, plan o proyecto completo y devolver un veredicto duro con prioridades.

## Resumen rapido de skills de diseno

Si querias acordarte de la otra skill de diseno que tenias ademas de `ui-ux-pro-max`, en este entorno hay varias:

- `frontend-design`: design system especifico de QuantumHive/Directimport para este repo.
- `ui-ux-pro-max`: recomendacion amplia de estilos, paletas, tipografias y sistemas de diseno.
- `ui-styling`: implementacion visual accesible con shadcn/ui y Tailwind.
- `design`: piezas visuales e identidad de marca mas amplias.
- `design-system`: tokens y especificaciones sistematicas.
- `banner-design`: banners y creatives.
- `brand`: tono y consistencia de marca.
- `slides`: presentaciones.

## Regla mental simple

- Si es algo visual de este producto: `frontend-design`
- Si necesitas direccion creativa o sistema visual amplio: `ui-ux-pro-max`
- Si estas implementando componentes y estilos: `ui-styling`
- Si es branding, banners o slides: `brand`, `banner-design`, `slides`

## Que se sincroniza con Git y que no

### Si viaja con el repo
- `SKILLS.md`
- `.opencode/skills/frontend-design/`
- `graphify-out/` solo si esos archivos se commitean y se pushean
- cualquier otro archivo de configuracion que viva adentro del repo

### No viaja automaticamente con Git
- `C:\Users\sergio\.opencode\skills\` porque es global de este usuario y de esta maquina
- `C:\Users\sergio\.config\opencode\opencode.jsonc` porque tambien es global de este usuario
- tokens, API keys y variables de entorno locales
- herramientas MCP que dependan de configuracion local o credenciales

## Graphify y otras maquinas

- `graphify-out/` no se actualiza solo por hacer `git pull`.
- otra VM o PC va a ver el ultimo estado commiteado de `graphify-out/`, no un grafo vivo.
- para regenerarlo o actualizarlo hay que correr Graphify de nuevo, por ejemplo con `/graphify` o `/graphify --update`.
- si queres actualizacion automatica, hay que configurar un flujo aparte como `--watch` o un hook de post-commit.

## Otra VM o PC con el mismo repo

Si clonas solo este repo en otra maquina:

- si, va a tener la skill local `frontend-design`
- si, va a tener este `SKILLS.md`
- si, va a tener `graphify-out/` solamente si esta versionado y pusheado
- no, no va a tener automaticamente las skills globales como `ui-ux-pro-max`
- no, no va a tener automaticamente tus MCP globales ni tus credenciales

Para replicar este entorno completo en otra maquina hace falta, ademas del repo:

- reinstalar las skills globales
- copiar o recrear `~/.config/opencode/opencode.jsonc`
- volver a definir las variables de entorno y credenciales necesarias
