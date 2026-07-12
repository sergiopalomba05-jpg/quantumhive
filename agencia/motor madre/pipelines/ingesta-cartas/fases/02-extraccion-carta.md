# FASE 2: Extracción de Carta (OCR + Visión)

**Objetivo:** Tomar la foto de la carta y extraer platos, precios y secciones en un JSON estructurado.

---

## Flujo

```
Foto de la carta (upload del cliente)
    │
    ▼
Gemini 2.5 Flash Vision (Vertex AI)
    │
    ▼
Prompt estructurado → Extraer platos
    │
    ▼
JSON estructurado:
{
  "restaurant_name": "La Escaloneta",
  "sections": [
    {
      "name": "Entradas",
      "items": [
        {
          "name": "Empanadas de carne",
          "description": "Empanadas caseras con carne cortada a cuchillo",
          "price": 3500,
          "options": [
            { "name": "Carne", "price_modifier": 0 },
            { "name": "Pollo", "price_modifier": 200 }
          ]
        }
      ]
    }
  ]
}
```

---

## Tecnología

| Componente | Detalle |
|------------|---------|
| Modelo | Gemini 2.5 Flash |
| API | Vertex AI (ya configurado en server.ts) |
| Input | Imagen (JPG/PNG) |
| Output | JSON estructurado |
| Costo | $0 (Vertex AI free tier) |

---

## Prompt para Gemini Vision

```
Sos un experto en análisis de cartas de restaurantes. Analizá esta imagen 
de una carta y extraé TODA la información en formato JSON.

Reglas:
1. Extraé TODOS los platos visibles, incluso si el precio no es claro
2. Si un precio no se lee, poné null
3. Organizá por secciones (Entradas, Principales, Postres, Bebidas, etc.)
4. Si hay opciones (ej: "carne o pollo"), incluirlas en "options"
5. Si hay extras (ej: "con papas fritas +$500"), incluirlas en "extras"
6. Descripción: si no hay descripción visible, dejá string vacío ""
7. El idioma del JSON debe ser el mismo de la carta

Formato de salida:
{
  "sections": [
    {
      "name": "Nombre de la sección",
      "items": [
        {
          "name": "Nombre del plato",
          "description": "Descripción si existe",
          "price": 3500,
          "options": [],
          "extras": []
        }
      ]
    }
  ]
}
```

---

## Validaciones Post-OCR

Después de recibir el JSON de Gemini, validar:

1. **Mínimo 1 sección** con al menos 1 item
2. **Cada item tiene nombre** (string no vacío)
3. **Cada item tiene precio** (number > 0, o null si no se leyó)
4. **Secciones conocidas** → mapear variaciones:
   - "Entradas" / "Aperitivos" / "Para compartir" → sección "entradas"
   - "Bebidas" / "Birras" / "Tragos" → sección "bebidas"
   - etc.

---

## Edición Manual (en Admin Panel)

Después del OCR, el cliente puede:
- Corregir nombres de platos
- Corregir precios
- Agregar platos que no se leyeron
- Eliminar platos incorrectos
- Reordenar secciones
- Agregar descripciones

---

## API Endpoint

```python
# POST /api/extract-menu
# Input: imagen de la carta (base64 o URL de Supabase Storage)
# Output: JSON estructurado con platos

@app.post("/api/extract-menu")
async def extract_menu(image_url: str):
    # 1. Descargar imagen
    # 2. Enviar a Gemini Vision con prompt
    # 3. Parsear respuesta JSON
    # 4. Validar estructura
    # 5. Devolver JSON limpio
```

---

## Bloqueos Actuales

1. **Gemini Vision funciona** → Ya probado en server.ts
2. **Falta el endpoint** → Hay que crear el endpoint `/api/extract-menu`
3. **Falta el form de upload** → Está en Fase 1 (Admin Panel)
4. **Costo:** $0 (Vertex AI free tier cubre esto)
