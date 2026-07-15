# FASE 4: Identidad Visual

**Objetivo:** Extraer colores del logo y generar el tema visual de la PWA automáticamente.

---

## Flujo

```
Logo del restaurante (upload)
    │
    ▼
Extracción de colores dominantes (Python: colorthief)
    │
    ▼
3-5 colores principales
    │
    ▼
Generación de CSS variables
    │
    ▼
Tema visual de la PWA
```

---

## Extracción de Colores

```python
from colorthief import ColorThief
from PIL import Image
import io

def extract_colors(logo_bytes: bytes) -> dict:
    """Extraer colores dominantes del logo"""
    ct = ColorThief(io.BytesIO(logo_bytes))
    
    # Color dominante
    dominant = ct.get_color(quality=1)
    
    # Paleta de 5 colores
    palette = ct.get_palette(color_count=6, quality=1)
    
    return {
        "dominant": rgb_to_hex(dominant),
        "palette": [rgb_to_hex(c) for c in palette[:5]]
    }

def rgb_to_hex(rgb: tuple) -> str:
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
```

---

## Generación de CSS Variables

```python
def generate_css(colors: dict, restaurant_name: str) -> str:
    """Generar CSS variables para la PWA"""
    
    dominant = colors["dominant"]
    palette = colors["palette"]
    
    # Calcular versiones claras y oscuras
    light_bg = lighten(dominant, 0.95)  # Fondo claro
    dark_bg = darken(dominant, 0.15)    # Fondo oscuro
    
    css = f"""
:root {{
  /* Colores del restaurante: {restaurant_name} */
  --color-primary: {dominant};
  --color-secondary: {palette[1]};
  --color-accent: {palette[2]};
  --color-bg: {light_bg};
  --color-text: {dark_bg};
  --color-border: {palette[3]};
  
  /* Tipografía */
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
}}
"""
    return css
```

---

## Mapeo de Estilos por Sección

Cada sección de la carta tiene un estilo visual:

```python
SECTION_STYLES = {
    "entradas": {"icon": "🥗", "color": "var(--color-accent)"},
    "carnes": {"icon": "🥩", "color": "var(--color-primary)"},
    "pastas": {"icon": "🍝", "color": "var(--color-secondary)"},
    "pescados": {"icon": "🐟", "color": "#4A90D9"},
    "postres": {"icon": "🍰", "color": "#E91E63"},
    "bebidas": {"icon": "🍷", "color": "#9C27B0"},
}
```

---

## Template de PWA

La PWA se genera a partir de un template base que se customiza:

```typescript
// Template base que se modifica con los colores del restaurante
const theme = {
  primary: extractedColors.dominant,
  secondary: extractedColors.palette[1],
  accent: extractedColors.palette[2],
  background: lighten(extractedColors.dominant, 0.95),
  text: darken(extractedColors.dominant, 0.15),
};

// Se inyecta en el CSS de la PWA
document.documentElement.style.setProperty('--color-primary', theme.primary);
// ... etc
```

---

## Logo del Restaurante

El logo se usa en:
1. **Splash screen** → Logo centrado arriba del avatar
2. **Header de la carta** → Logo + nombre
3. **Favicon** → Logo reducido
4. **WhatsApp** → Para compartir pedido

---

## Bloqueos Actuales

1. **colorthief** → Hay que instalar (`pip install colorthief`)
2. **Template PWA** → Hay que crear el template base
3. **Generación CSS** → Hay que implementar
4. **Costo:** $0
