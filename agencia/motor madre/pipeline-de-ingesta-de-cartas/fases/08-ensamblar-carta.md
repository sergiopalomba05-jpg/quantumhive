# FASE 8: Ensamblar Carta Final

**Objetivo:** Tomar todos los datos generados y construir la PWA lista para el restaurante.

---

## Flujo

```
Datos del restaurante (Fase 1)
    +
Platos extraídos (Fase 2)
    +
Fotos de platos (Fase 3)
    +
Identidad visual (Fase 4)
    +
Avatar sin fondo (Fase 5)
    +
Voz clonada (Fase 6)
    +
Videos por plato (Fase 7)
    │
    ▼
Generar archivos de configuración
    │
    ├── menuData.ts (platos, precios, secciones)
    ├── systemPrompt.ts (personalidad del avatar)
    ├── theme.css (colores del restaurante)
    └── chips.json (autoguided flow)
    │
    ▼
Build de la PWA
    │
    ▼
Deploy a Cloud Run
    │
    ▼
URL: quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/{restaurante}
```

---

## Generación de menuData.ts

```typescript
// Auto-generado por el pipeline
export const menuData: RestaurantMenu = {
  restaurant: {
    name: "La Escaloneta",           // Del admin panel
    tagline: "Cocina casera con alma", // Del admin panel
    currency: "ARS",
    currency_symbol: "$",
  },
  assistant: {
    name: "Sol",                      // Del admin panel
    voice_gender: "female",
    language: "espaniol rioplatense",
    personality: "Sos Sol, una mesera amigable...", // Generado
    greeting: "¡Hola! Bienvenido a La Escaloneta...",
  },
  rules: { /* Reglas del restaurante */ },
  sections: [
    {
      id: "entradas",
      name: "Entradas",
      items: [
        {
          id: "empanadas",
          name: "Empanadas de carne",
          description: "Empanadas caseras con carne cortada a cuchillo",
          price: 3500,
          image: "https://supabase.../empanadas.jpg", // De Fase 3
        }
      ]
    }
  ]
};
```

---

## Generación de systemPrompt.ts

```typescript
// Auto-generado por el pipeline
export function buildSystemPrompt(): string {
  return `
Sos ${assistant.name}, una mesera ${assistant.personality} de ${restaurant.name}.
Hablás con ${assistant.trato} y acento ${assistant.accent}.

Tu trabajo es recomendar platos, responder preguntas y tomar pedidos.
Sé amigable, natural y conocé todos los platos de la carta.

RESTAURANTE: ${restaurant.name}
TAGLINE: ${restaurant.tagline}
PLATOS: ${sections.map(s => s.items.map(i => `${i.name} - $${i.price}`).join(', ')).join(' | ')}
  `;
}
```

---

## Generación de Chips (Autoguided Flow)

```python
def generate_chips(sections: list, dishes: list) -> dict:
    """Generar chips del autoguided flow"""
    
    chips = {
        "start": [
            {"text": "Ver la carta", "next": "show_menu"},
            {"text": "¿Qué me recomendás?", "next": "recommendations"},
        ],
        "recommendations": [],
        "show_menu": [],
    }
    
    # Chips por sección
    for section in sections:
        chips["recommendations"].append({
            "text": f"¿Qué hay en {section['name']}?",
            "next": f"section_{section['id']}"
        })
    
    # Chips por plato (los 3 más populares)
    for dish in dishes[:3]:
        chips[f"section_{dish['section']}"].append({
            "text": f"{dish['name']} - ${dish['price']}",
            "action": "add_to_cart",
            "dish_id": dish["id"]
        })
    
    return chips
```

---

## Build y Deploy

```bash
# 1. Generar archivos de configuración
python generate_config.py --restaurant-id {id}

# 2. Build de la PWA
npm run build

# 3. Deploy a Cloud Run
gcloud run deploy carta-{restaurante} \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## URL por Restaurante

**Estructura:** `quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/{restaurante}`

**Opciones de routing:**

### Opción A: Subdominio (recomendada)
```
quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/la-escaloneta
quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/el-gaucho
```

### Opción B: Path con ID
```
quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares?id=la-escaloneta
```

---

## Multi-Tenancy

Cada restaurante tiene su propia instancia de la PWA:

```
restaurants/
├── la-escaloneta/
│   ├── config.json          # Datos del restaurante
│   ├── menu.json            # Carta
│   ├── avatar/              # Avatar sin fondo
│   ├── voices/              # Audios de referencia
│   └── videos/              # Videos por plato
├── el-gaucho/
│   ├── config.json
│   ├── menu.json
│   └── ...
```

---

## Bloqueos Actuales

1. **Generador de config** → Hay que crear el script
2. **Routing multi-tenant** → Hay que configurar
3. **Deploy automático** → Hay que crear el pipeline CI/CD
4. **Costo:** $0 (Cloud Run free tier)
