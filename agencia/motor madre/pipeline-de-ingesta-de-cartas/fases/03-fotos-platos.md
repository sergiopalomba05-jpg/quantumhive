# FASE 3: Fotos de Platos

**Objetivo:** Asignar una foto a cada plato de la carta.

---

## Flujo

```
Lista de platos (JSON de Fase 2)
    │
    ├── ¿El cliente subió foto? ──SÍ──> Usar foto del cliente
    │
    └── NO
        │
        ▼
    Buscar en Unsplash API por nombre del plato
        │
        ├── Encontró? ──SÍ──> Usar foto de Unsplash
        │
        └── NO
            │
            ▼
        Usar foto genérica de la sección
        (ej: "plato-carnes.webp", "plato-pastas.webp")
```

---

## Opciones de Fotos

### Opción A: Foto del cliente (prioridad)
- El cliente sube una foto por plato en el admin panel
- Se guarda en Supabase Storage `dishes/{restaurant_id}/{item_id}.jpg`
- **Calidad:** La mejor opción, es la foto real del plato

### Opción B: Búsqueda en Unsplash
- API gratuita (50 requests/hora)
- Búsqueda por nombre del plato: "empanadas argentinas", "milanesa napolitana"
- Se guarda la URL de Unsplash
- **Calidad:** Buena, pero no es el plato real del restaurante

### Opción C: Foto genérica por sección
- Fallback si no hay foto ni en Unsplash
- Fotos genéricas pre-cargadas:
  - `entradas.webp` - Foto genérica de entradas
  - `carnes.webp` - Foto genérica de carnes
  - `pastas.webp` - Foto genérica de pastas
  - `pescados.webp` - Foto genérica de pescados
  - `postres.webp` - Foto genérica de postres
  - `bebidas.webp` - Foto genérica de bebidas
  - etc.

### Opción D: Generación IA (futuro)
- ComfyUI + Flux/SDXL en VM GPU
- Prompt: "Plato de empanadas argentinas, foto profesional, iluminación de estudio"
- **Costo:** $0 (GPU propia)
- **Calidad:** Variable, buen fallback

---

## API Unsplash

```python
import requests

def search_unsplash(query: str) -> str:
    """Buscar imagen en Unsplash por query"""
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": 1,
        "client_id": UNSPLASH_ACCESS_KEY
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    if data["results"]:
        return data["results"][0]["urls"]["regular"]
    
    return None
```

---

## Prompt de Búsqueda Unsplash

Para cada plato, generar un query optimizado:

```python
def build_search_query(item_name: str, section: str) -> str:
    """Construir query de búsqueda para Unsplash"""
    # Ejemplo: "empanadas de carne argentinas food photography"
    query = f"{item_name} argentina food photography"
    
    # Agregar contexto de sección
    if section == "bebidas":
        query = f"{item_name} bebida photo"
    elif section == "postres":
        query = f"{item_name} postre foto"
    
    return query
```

---

## Cache de Fotos

Las fotos se cachean para no repetir búsquedas:

```sql
CREATE TABLE dish_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT,           -- Nombre del plato
  source TEXT,              -- 'client', 'unsplash', 'generic', 'ai'
  image_url TEXT,           -- URL de la imagen
  unsplash_id TEXT,         -- ID de Unsplash (para no repetir)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Fallback Inteligente

Si un plato no tiene foto:
1. Intentar Unsplash con nombre exacto
2. Intentar Unsplash con nombre genérico de sección
3. Usar foto genérica de la sección
4. Marcar como "foto_pendiente" para que el cliente la suba después

---

## Bloqueos Actuales

1. **Unsplash API Key** → Hay que registrarse (gratis)
2. **Fotos genéricas** → Hay que crearlas o descargarlas
3. **Endpoint** → Hay que crear `/api/dish-images`
4. **Costo:** $0 (Unsplash gratis, 50 req/hora es suficiente)
