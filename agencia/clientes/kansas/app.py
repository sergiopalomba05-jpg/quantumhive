"""
Carta Viva — Proxy backend
Endpoints:
  GET  /              → sirve index.html (frontend)
  GET  /menu.json     → menu del restaurante
  GET  /health        → verifica que las keys estén configuradas
  POST /chat          → Gemini chat (no streaming, devuelve respuesta completa)
  POST /chat/stream   → Gemini chat con streaming SSE (texto a medida que se genera)
  POST /tts           → MiniMax TTS, devuelve audio MP3
  POST /stt           → Gemini transcribe audio del cliente
"""
import os
import re
import json
import base64
import asyncio
import hashlib
from pathlib import Path
from typing import Optional, List, Dict, Any
from html import escape as _esc

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse, JSONResponse, HTMLResponse
from pydantic import BaseModel

# ============================================================================
# Configuración — todo desde env vars (las setea el Space)
# ============================================================================
GEMINI_API_KEY     = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL        = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
# Resiliencia del cerebro: ante 429 (cupo/ráfaga llena) o 503 (Gemini caído un toque)
# reintenta con backoff; si igual no llega, la mesera contesta con gracia y NO rompe.
GEMINI_MAX_RETRIES  = int(os.environ.get("GEMINI_MAX_RETRIES", "2"))
MESERA_BUSY_MSG     = os.environ.get("MESERA_BUSY_MSG",
    "Perdoná, estoy con muchísima gente en este momento y no llego a atenderte bien. "
    "Dame unos segundos y volvé a escribirme, ¿dale?")

# CEREBRO PLUGGABLE — cadena de proveedores/modelos "provider:model, ..." en orden de
# prioridad. Se prueba el primero; ante 429/503/error rota al siguiente (fallback). Vacío
# = "gemini:{GEMINI_MODEL}" (compat). Cada clon define su cadena por env, p.ej.:
#   chico/barato → "gemini:gemini-2.5-flash-lite"
#   grande/uso   → "gemini:gemini-2.5-flash, openrouter:openai/gpt-4o-mini"
#   demo gratis  → "gemini:gemini-2.5-flash, openrouter:deepseek/deepseek-chat-v3:free"
BRAIN_CHAIN        = os.environ.get("BRAIN_CHAIN", "").strip()
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
MAX_HISTORY_TURNS  = int(os.environ.get("MAX_HISTORY_TURNS", "8"))  # 8 ≈ 4 intercambios (anti bola de nieve de tokens)

# MiniMax T2A v2 — MINIMAX_API_KEY va SOLO en env vars del Space, nunca al repo.
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "").strip()
MINIMAX_VOICE   = os.environ.get("MINIMAX_VOICE", "Spanish_UpsetGirl").strip()
MINIMAX_MODEL   = os.environ.get("MINIMAX_MODEL", "speech-02-turbo").strip()  # turbo = menor latencia
MINIMAX_API_BASE = os.environ.get("MINIMAX_API_BASE", "https://api.minimax.io").strip().rstrip("/")
try:
    MINIMAX_SPEED = float(os.environ.get("MINIMAX_SPEED", "1.2"))   # 1.2 = ágil sin atropellarse
except ValueError:
    MINIMAX_SPEED = 1.2
try:
    MINIMAX_VOL = float(os.environ.get("MINIMAX_VOL", "5"))         # 1.0 normal · sube el volumen (hasta 10)
except ValueError:
    MINIMAX_VOL = 5.0
DEMO_MODE = os.environ.get("DEMO_MODE", "").strip().lower() in ("1", "true", "yes", "si", "sí")

# Supabase — opcional. Si no están seteadas, /feedback no persiste pero NO rompe.
# (Se cargan como env vars del Space; nunca al repo público.)
SUPABASE_URL            = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY            = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
SUPABASE_FEEDBACK_TABLE = os.environ.get("SUPABASE_FEEDBACK_TABLE", "feedback").strip()
RESTAURANT_ID           = os.environ.get("RESTAURANT_ID", "la-escaloneta").strip()
# Caché de voz: guarda cada MP3 por hash de frase en Supabase Storage. Frases repetidas → $0 e
# instantáneo. Tolerante: si Storage falla o no está configurado, se genera con MiniMax igual.
TTS_CACHE        = os.environ.get("TTS_CACHE", "1").strip().lower() in ("1", "true", "yes", "si", "sí")
TTS_CACHE_BUCKET = os.environ.get("TTS_CACHE_BUCKET", "tts-cache").strip()

# Canal INTERNO del pedido al mozo (opcional). Si está configurado, /order
# manda el pedido por Telegram sin que el comensal salga de la app.
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "").strip()
ORDER_CHAT_ID  = os.environ.get("ORDER_CHAT_ID", "").strip()

GEMINI_GENERATE = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"  # solo /stt

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"  # legacy, no usado en versión mono

# ============================================================================
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CARTA_CONFIG — ✏️  EDITAR ESTO POR CARTA                                  ║
# ║                                                                            ║
# ║  Para clonar una carta nueva: copiá esta carpeta y editá SOLO este bloque  ║
# ║  + EMBEDDED_MENU_JSON (justo abajo). Nada más se toca en las 5.000 líneas. ║
# ║  (En la fase DB, este bloque pasa a ser una fila de la tabla `restaurants`.)║
# ╚══════════════════════════════════════════════════════════════════════════╝
# ============================================================================
CARTA_CONFIG = {
    # Nombre visible del local: pestaña del navegador, splash y topbar.
    # OJO: el nombre que usa la IA en el prompt y el saludo sale del MENÚ
    # (EMBEDDED_MENU_JSON → restaurant.name / assistant.greeting). Mantené ambos iguales.
    "nombre": "La Escaloneta",

    # Tema de color. Cambiás el acento y el resto del CSS se adapta solo.
    "tema": {
        "accent":    "#8B1C2B",   # color principal de la marca (botones, títulos)
        "accent_dk": "#6E1422",   # variante oscura (degradés, hover)
    },

    # Atajos rápidos del chat, cuando la mesera no propone sugerencias propias.
    "chips": [
        {"icon": "🔥", "text": "¿Cuál es la especialidad de la casa?", "label": "Especialidad de la casa"},
        {"icon": "🍢", "text": "¿Qué tenés para picar?",               "label": "¿Qué hay para picar?"},
        {"icon": "🍷", "text": "Recomendame un vino",                  "label": "Recomendame un vino"},
        {"icon": "🍰", "text": "¿Qué postre me recomendás?",           "label": "¿Qué postre va bien?"},
    ],

    # Links de los CTA de reseña. Vacío = el botón no aparece.
    "links": {
        "googleReviewUrl": "",   # reseña de Google del local
        "quantumhiveUrl":  "",   # link de QuantumHive (la agencia)
    },
}

# ============================================================================
# Contenido embebido — HTML del frontend y menu.json del restaurante
# (Se mantienen en el archivo para tener un solo file de deploy)
# ============================================================================
EMBEDDED_MENU_JSON = r"""{
  "_meta": {
    "version": "1.1.0",
    "product": "Carta Viva",
    "restaurant_id": "la-escaloneta",
    "instance": "demo",
    "created": "2026-06-10",
    "description": "Carta Kansas — versión podada para demo Carta Viva v1. Sin happy hour (riesgo de doble precio), sin marcas registradas (mejora TTS), greeting neutro."
  },
  "restaurant": {
    "name": "La Escaloneta",
    "tagline": "Cocina casera con alma",
    "currency": "ARS",
    "currency_symbol": "$"
  },
  "assistant": {
    "name": "",
    "voice_gender": "female",
    "language": "español rioplatense",
    "personality": "Sos la mesera virtual de La Escaloneta. No tenés nombre — simplemente sos 'tu mesera virtual'.\nNUNCA digas que sos una IA, un bot, o que no sos real. Sos la mesera del lugar, punto.\nTu personalidad: cálida, cercana y canchera. Como la moza de confianza que ya te conoce.\nUsás voseo rioplatense natural: vos, tenés, querés, podés, te cuento.\nHablás con entusiasmo genuino de la comida. Describís con apetito, no con lista de ingredientes.\nCuando te preguntan por un plato, lo vendés: contás qué lo hace especial, qué lo acompaña, por qué vale la pena.\nSi alguien duda entre opciones, ayudás a decidir (¿tenés hambre de algo liviano o algo contundente?).\nSugerís maridajes de vino o bebidas cuando corresponde, con naturalidad.\nRespondés con calidez y extensión adecuada: no sos telegráfica pero tampoco interminable.\nNUNCA inventás precios. Si no está cargado, decís 'ese te lo confirma el mozo con la carta en mano'.\nNunca usás emojis.",
    "greeting": "¡Hola! Soy tu mesera virtual. Estoy acá para ayudarte con la carta, sugerirte algo rico o resolver cualquier duda. ¿Por dónde empezamos?"
  },
  "rules": {
    "sharing_surcharge": {
      "amount": 11500,
      "note": "Los platos que se compartan tienen un adicional de $11.500",
      "applies_to": [
        "ensaladas",
        "pastas",
        "carnes_y_cerdos",
        "pescados",
        "aves"
      ],
      "bar_exception": "En la barra NO se cobra adicional por plato compartido"
    },
    "bread": "El pan no viene automáticamente — debe solicitarse al mozo",
    "side_salad_addon": {
      "price": 11500,
      "options": [
        "Traditional",
        "Mixed",
        "Caesar"
      ],
      "note": "Se puede sumar una ensalada a los platos principales por $11.500"
    },
    "single_dish_surcharge": {
      "amount": 11500,
      "note": "Si se pide un plato para consumo individual (no compartido) en una mesa de más personas, hay un adicional de $11.500"
    },
    "extras": {
      "panceta_cheeseburger": {
        "amount": 2500,
        "note": "Adicional para agregar panceta a la Hamburguesa con Queso"
      },
      "salsa_extra_hot_fudge": {
        "amount": 2500,
        "note": "Adicional por salsa de chocolate o dulce de leche en Sundae de Chocolate Caliente"
      }
    },
    "kids_menu": {
      "age_limit": 10,
      "note": "Menú Kids exclusivamente para menores de 10 años"
    },
    "wine_copa_volume": {
      "vinos": "250 cm3",
      "champagne_y_espumantes": "150 cm3"
    },
    "food_safety_note": "Consumir carne, mariscos o huevos crudos puede aumentar el riesgo de enfermedades alimenticias. Nuestras hamburguesas son caseras y se preparan diariamente.",
    "happy_hour": {
      "note": "Hay happy hour con precios especiales en la barra. Si te preguntan por horario o precios de happy hour, derivá al mozo con gracia: el horario no está cargado."
    }
  },
  "menu": [
    {
      "id": "entradas",
      "name": "Entradas",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "spinach_dip",
          "name": "Dip de Espinaca y Queso",
          "description": "Dip de espinaca con salsa blanca y queso, acompañado con tortilla chips, salsa picante y queso crema",
          "price": 27300
        },
        {
          "id": "chicken_tenders_entrada",
          "name": "Tiras de Pollo Crocante",
          "description": "Lonchas de pollo aderezadas, acompañadas con salsa Honey Mustard",
          "price": 29000
        },
        {
          "id": "kansas_rolls",
          "name": "Arrolladitos de Pollo y Verduras",
          "description": "Arrolladitos crocantes de pollo y verduras, condimentados con especias de la casa, servidos con salsa picante y queso",
          "price": 27800
        },
        {
          "id": "mini_nachos",
          "name": "Mini Nachos",
          "description": "Nachos cubiertos con chilli casero, queso gratinado, tomates picados y cebolla de verdeo",
          "price": 27000
        },
        {
          "id": "smoked_salmon_entrada",
          "name": "Salmón Ahumado con Aderezo de la Casa",
          "description": "Salmón ahumado, acompañado con tostaditas y aderezo del chef",
          "price": 29000
        }
      ]
    },
    {
      "id": "flatbreads",
      "name": "Pizzetas",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "bbq_chicken_flatbread",
          "name": "Pizzeta de Pollo BBQ",
          "description": "Pan plano con pollo, quesos mixtos, queso de cabra, cebollas y cilantro, aderezado con barbacoa",
          "price": 32000
        },
        {
          "id": "steak_mushroom_flatbread",
          "name": "Pizzeta de Bife y Hongos",
          "description": "Pan plano con lomo, queso azul, champignones y espinacas",
          "price": 31300
        },
        {
          "id": "shrimp_flatbread",
          "name": "Pizzeta de Camarón, Queso de Cabra y Dátiles",
          "description": "Pan plano con langostinos asados, dátiles, morrones y queso de cabra",
          "price": null,
          "_verify": true,
          "_note": "VERIFICAR PRECIO — no extraíble del PDF con certeza"
        }
      ]
    },
    {
      "id": "ensaladas",
      "name": "Ensaladas",
      "sharing_surcharge": true,
      "items": [
        {
          "id": "grilled_chicken_salad",
          "name": "Ensalada de Pollo Grillado",
          "description": "Lechugas frescas de estación, repollo, fetas de pollo grilladas y tiritas de tortilla, con Honey Lime Vinaigrette y Peanut Sauce",
          "price": 18000,
          "options": [
            "Con langostinos a la leña — consultar precio al mozo"
          ]
        },
        {
          "id": "mediterranean_salad",
          "name": "Ensalada Mediterránea",
          "description": "Lechugas frescas, queso feta, aceitunas negras, pollo grillado y tiritas de tortilla, con Classic Vinaigrette",
          "price": 18000
        },
        {
          "id": "caesar_salad",
          "name": "Ensalada César con Pollo",
          "description": "Lechuga fresca, croutones, pollo rebozado o grillado y queso reggianito con aderezo Caesar",
          "price": 18900,
          "options": [
            "Con langostinos a la leña — consultar precio al mozo",
            "Con smoked salmon — consultar precio al mozo"
          ]
        },
        {
          "id": "bistro_salad",
          "name": "Ensalada Bistró",
          "description": "Mix de lechugas frescas con pollo, queso de cabra, dátiles, palta, almendras tostadas, tomates cherry, croutons de maíz y aderezo cítrico",
          "price": 19300
        }
      ]
    },
    {
      "id": "hamburguesas",
      "name": "Hamburguesas y Sandwiches",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "cheeseburger",
          "name": "Hamburguesa con Queso",
          "description": "Hamburguesa casera con queso cheddar, lechuga, tomate, pepino y cebolla, acompañada con papas fritas",
          "price": 26800,
          "extras": [
            {
              "name": "Panceta",
              "price": 2500
            }
          ]
        },
        {
          "id": "club_sandwich",
          "name": "Club Sándwich",
          "description": "Sandwich frío de jamón, queso y pollo fileteado con panceta, tomate y lechuga, en pan de trigo con papas fritas",
          "price": 28500
        }
      ]
    },
    {
      "id": "acompanamentos",
      "name": "Acompañamientos",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "white_rice",
          "name": "Arroz Blanco",
          "description": "Arroz blanco",
          "price": 11500
        },
        {
          "id": "french_fries",
          "name": "Papas Fritas",
          "description": "Papas fritas",
          "price": 11500
        },
        {
          "id": "fresh_vegetables",
          "name": "Verduras Salteadas",
          "description": "Vegetales rostizados, brócolis o zucchinis asados a la leña",
          "price": 11500
        },
        {
          "id": "cole_slaw",
          "name": "Ensalada de Repollo",
          "description": "Ensalada de repollo blanco y colorado con aderezo cole slaw",
          "price": 11500
        },
        {
          "id": "mashed_potato",
          "name": "Puré de Papa",
          "description": "Puré de papas",
          "price": 12500
        },
        {
          "id": "quinoa_medley",
          "name": "Quinoa Salteada",
          "description": "Quinoa tricolor con almendras, granos de maíz y pasas de uva, aderezo de yogur",
          "price": 12500
        },
        {
          "id": "cream_spinach",
          "name": "Espinaca a la Crema",
          "description": "Espinacas a la crema",
          "price": 12500
        },
        {
          "id": "loaded_baked_potato",
          "name": "Papa Rellena",
          "description": "Papa rellena con manteca, queso crema, queso cheddar, panceta y cebollines",
          "price": 12500
        }
      ]
    },
    {
      "id": "carnes",
      "name": "Carnes y Cerdos",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "bbq_ribs",
          "name": "Costillas BBQ 500gr",
          "description": "Costillar de cerdo asado a fuego lento con salsa barbacoa, acompañado con papas fritas y Ensalada de Repollo",
          "price": 42000
        },
        {
          "id": "ny_strip",
          "name": "Bife de Chorizo 400gr",
          "description": "Bife de chorizo grillado a la leña, acompañado con papa rellena",
          "price": 53500
        },
        {
          "id": "rib_eye",
          "name": "Ojo de Bife 400gr",
          "description": "Ojo de bife grillado a la leña, acompañado con papas fritas",
          "price": 56700
        },
        {
          "id": "montreal_steak",
          "name": "Bife a las Especias 400gr",
          "description": "Bife de chorizo grillado a la leña con pimientas variadas, acompañado con papas fritas",
          "price": 56700
        },
        {
          "id": "filet_mignon",
          "name": "Filet Mignon",
          "description": "Bife de lomo grillado a la leña, acompañado con papa rellena",
          "price": 58900
        },
        {
          "id": "hawaiian_steak",
          "name": "Bife a la Hawaiana 400gr",
          "description": "Ojo de bife marinado en salsa de soja, ananá y jengibre, grillado a la leña, acompañado con puré de papas",
          "price": 58900
        }
      ]
    },
    {
      "id": "pescados",
      "name": "Pescados",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "cilantro_shrimp",
          "name": "Camarones al Cilantro",
          "description": "Brochette de langostinos grillados a la leña sobre arroz con aceite de cilantro, morrones y cebollines, acompañado con espinaca a la crema",
          "price": 36500
        },
        {
          "id": "grilled_salmon",
          "name": "Salmón Grillado 300gr",
          "description": "Filet de salmón grillado a la leña, acompañado con papas fritas",
          "price": 42000
        },
        {
          "id": "cedar_salmon",
          "name": "Salmón a la Plancha de Cedro 300gr",
          "description": "Salmón cocido en horno de barro sobre tabla de cedro, pintado con glacé de mostaza, acompañado con papa rellena",
          "price": 44000
        }
      ]
    },
    {
      "id": "aves",
      "name": "Aves",
      "sharing_surcharge": true,
      "side_salad_available": true,
      "items": [
        {
          "id": "grilled_chicken_breast",
          "name": "Pechuga de Pollo Grillada",
          "description": "Pechuga de pollo deshuesada grillada a la leña con brócoli al vapor",
          "price": 25800
        },
        {
          "id": "bbq_chicken_main",
          "name": "Pollo BBQ",
          "description": "Pechuga de pollo grillada a la leña con salsa barbacoa, acompañada con papas fritas",
          "price": 26000
        },
        {
          "id": "kansas_chicken_main",
          "name": "Pollo de la Casa",
          "description": "Pechuga de pollo grillada a la leña con queso mixto, tomate picado y cebolla de verdeo, acompañada con papas fritas",
          "price": 30000
        },
        {
          "id": "tennessee_chicken",
          "name": "Pollo Crocante con Guarniciones",
          "description": "Pechuga de pollo grillada a la leña con salsa barbacoa, jamón ahumado y queso, acompañada con papas fritas",
          "price": 31000,
          "_verify": true,
          "_note": "VERIFICAR PRECIO — estimado desde valor sin-IVA del PDF"
        }
      ]
    },
    {
      "id": "pastas",
      "name": "Pastas",
      "sharing_surcharge": true,
      "items": [
        {
          "id": "vegetarian_platter",
          "name": "Plato Vegetariano",
          "description": "Zucchinis asados a la leña, quinoa medley, arroz y brócoli",
          "price": 25800
        },
        {
          "id": "thai_pasta",
          "name": "Pasta Thai con Pollo",
          "description": "Pasta penne salteada con vegetales, pollo y castañas de cajú en salsa Thai con soja y jengibre",
          "price": 25800,
          "options": [
            "Con lomo — consultar precio al mozo",
            "Con langostinos a la leña — consultar precio al mozo"
          ]
        },
        {
          "id": "arizona_pasta",
          "name": "Pasta de la Casa",
          "description": "Pasta Penne al dente con salsa Alfredo, pollo, morrones y especias de Arizona",
          "price": 28500
        },
        {
          "id": "smoked_salmon_pasta",
          "name": "Pasta con Salmón Ahumado",
          "description": "Pasta Linguini al dente con salsa de crema, salmón ahumado, vino blanco, morrones y eneldo fresco",
          "price": 28500
        }
      ]
    },
    {
      "id": "kids",
      "name": "Menú Niños",
      "note": "Menú exclusivo para menores de 10 años",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "kid_pasta",
          "name": "Pasta para Niños",
          "description": "Pasta Fusilli con salsa crema, marinara o rosada",
          "price": 15000
        },
        {
          "id": "kid_cheeseburger",
          "name": "Hamburguesa para Niños",
          "description": "Hamburguesa casera con queso, servida con papas fritas",
          "price": 17000
        },
        {
          "id": "kid_chicken",
          "name": "Tiras de Pollo para Niños",
          "description": "Trozos de pollo rebozado, servido con papas fritas",
          "price": 17000
        },
        {
          "id": "kid_ribs",
          "name": "Costillitas BBQ para Niños",
          "description": "Costilla de cerdo estilo Kansas, servida con papas fritas",
          "price": 18000
        }
      ]
    },
    {
      "id": "postres",
      "name": "Postres",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "carrot_cake",
          "name": "Torta de Zanahoria",
          "description": "Torta de coco, nueces y canela con cobertura de crema",
          "price": 12400
        },
        {
          "id": "key_lime_pie",
          "name": "Tarta de Lima",
          "description": "Deliciosa tarta de lima servida con crema batida",
          "price": 12400
        },
        {
          "id": "going_bananas",
          "name": "Banana Split",
          "description": "Torta tibia de bananas con cobertura de crema de avellanas, salsa de dulce de leche y helado de vainilla",
          "price": 14900
        },
        {
          "id": "kansas_cheesecake",
          "name": "Cheesecake de la Casa",
          "description": "Cheesecake clásico estilo New York con crema, escamas de chocolate blanco y salsa de frambuesa",
          "price": 17000
        },
        {
          "id": "argentinean_cheesecake",
          "name": "Cheesecake Argentino",
          "description": "Cheesecake de dulce de leche con crema y salsa de dulce de leche",
          "price": 17000
        },
        {
          "id": "hot_fudge_sundae",
          "name": "Sundae de Chocolate Caliente",
          "description": "Helado de vainilla bañado con salsa de chocolate, crema y pecans acarameladas",
          "price": 17500,
          "extras": [
            {
              "name": "Salsa extra (chocolate o dulce de leche)",
              "price": 2500
            }
          ]
        }
      ]
    },
    {
      "id": "tes",
      "name": "Tés e Infusiones",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "kansas_blend",
          "name": "Blend de la Casa",
          "description": "Manzanas asadas, canela, nueces, miel, limón y jengibre",
          "price": 5500
        },
        {
          "id": "kansas_calm",
          "name": "Calma de la Casa",
          "description": "Cedrón, clementina, manzanas y rosa mosqueta",
          "price": 5500
        },
        {
          "id": "very_berries",
          "name": "Frutos Rojos",
          "description": "Moras, arándanos, grosellas y frambuesas",
          "price": 5500
        },
        {
          "id": "thai_wind",
          "name": "Brisa Thai",
          "description": "Té verde con ananá, maracuyá y coco",
          "price": 5500
        },
        {
          "id": "english_breakfast",
          "name": "English Breakfast",
          "description": "Hebras de Sri Lanka, India y China",
          "price": 5500
        }
      ]
    }
  ],
  "drinks": [
    {
      "id": "bebidas",
      "name": "Bebidas",
      "items": [
        {
          "id": "coca_cola",
          "name": "Gaseosa Línea Coca Cola",
          "price": 5000
        },
        {
          "id": "villa_sin",
          "name": "Villavicencio Sin Gas",
          "price": 4500
        },
        {
          "id": "villa_con",
          "name": "Villavicencio Con Gas",
          "price": 4500
        },
        {
          "id": "agua_saborizada",
          "name": "Aguas Saborizadas",
          "price": 4500
        },
        {
          "id": "sanpellegrino",
          "name": "Agua Sanpellegrino (con gas)",
          "price": 13700
        },
        {
          "id": "acqua_panna",
          "name": "Acqua Panna (sin gas)",
          "price": 13700
        },
        {
          "id": "iced_tea",
          "name": "Té Helado",
          "price": 5000
        },
        {
          "id": "arnold_palmer",
          "name": "Arnold Palmer",
          "price": 5600
        },
        {
          "id": "jugos",
          "name": "Jugos (Naranja o Pomelo)",
          "price": 6900
        },
        {
          "id": "limonada",
          "name": "Limonada",
          "price": 7500
        },
        {
          "id": "limonada_menta",
          "name": "Limonada con Menta y Jengibre",
          "price": 8000
        },
        {
          "id": "cafe",
          "name": "Café",
          "price": 6300
        },
        {
          "id": "cappuccino",
          "name": "Cappuccino",
          "price": 6800
        }
      ]
    },
    {
      "id": "cervezas",
      "name": "Cervezas",
      "items": [
        {
          "id": "imperial_chopp",
          "name": "Imperial",
          "format": "chopp",
          "price": 7700,
          "happy_hour_price": 4600
        },
        {
          "id": "miller",
          "name": "Miller",
          "format": "lata 473cc",
          "price": 7700,
          "happy_hour_price": 4600
        },
        {
          "id": "imperial_ipa",
          "name": "Imperial IPA",
          "format": "lata 473cc",
          "price": 7700,
          "happy_hour_price": 4600
        },
        {
          "id": "imperial_apa",
          "name": "Imperial APA",
          "format": "lata 473cc",
          "price": 7700,
          "happy_hour_price": 4600
        },
        {
          "id": "warsteiner",
          "name": "Warsteiner",
          "format": "chopp",
          "price": 8300,
          "happy_hour_price": 5000
        },
        {
          "id": "heineken",
          "name": "Heineken",
          "format": "chopp / lata",
          "price": 8300,
          "happy_hour_price": 5000
        },
        {
          "id": "heineken_na",
          "name": "Heineken Sin Alcohol",
          "format": "lata 355cc",
          "price": 8300
        },
        {
          "id": "blue_moon",
          "name": "Blue Moon",
          "format": "porrón 355cc",
          "price": 11000,
          "happy_hour_price": 6600
        }
      ]
    },
    {
      "id": "cocktails",
      "name": "Tragos",
      "note": "Selección curada para demo. La carta completa tiene más opciones.",
      "items": [
        {
          "id": "gin_tonic",
          "name": "Gin Tonic",
          "price": 10000,
          "happy_hour_price": 6000
        },
        {
          "id": "mojito",
          "name": "Mojito",
          "price": 10000
        },
        {
          "id": "fernet_cola",
          "name": "Fernet Branca Cola",
          "price": 10000
        },
        {
          "id": "aperol_spritz",
          "name": "Aperol Spritz",
          "price": 11500
        },
        {
          "id": "pisco_sour",
          "name": "Pisco Sour",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "caipirinha",
          "name": "Caipirinha",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "daiquiri",
          "name": "Daiquiri",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "pina_colada",
          "name": "Piña Colada",
          "price": 11500,
          "happy_hour_price": 6900
        },
        {
          "id": "negroni",
          "name": "Negroni",
          "price": 13000
        },
        {
          "id": "old_fashioned",
          "name": "Old Fashioned",
          "price": 13000
        },
        {
          "id": "manhattan",
          "name": "Manhattan",
          "price": 13000
        },
        {
          "id": "long_island",
          "name": "Long Island Ice Tea",
          "price": 13000
        }
      ]
    },
    {
      "id": "mocktails",
      "name": "Tragos sin Alcohol",
      "note": "Sin alcohol",
      "items": [
        {
          "id": "spring_dream_na",
          "name": "Spring Dream",
          "price": 9500
        },
        {
          "id": "rubi_red",
          "name": "Rubi Red",
          "price": 9500
        },
        {
          "id": "pisco_sour_na",
          "name": "Pisco Sour",
          "price": 9500
        },
        {
          "id": "maracurovska_na",
          "name": "Maracurovska",
          "price": 9500
        }
      ]
    },
    {
      "id": "champagne",
      "name": "Champagne & Espumantes",
      "note": "Copa = 150 cm3",
      "items": [
        {
          "id": "zaffiro",
          "name": "Zaffiro Extra Brut",
          "bodega": "Bodega Zaffiro",
          "price_copa": 6000,
          "price_botella": 24200
        },
        {
          "id": "salentein_brut",
          "name": "Salentein Brut Nature",
          "bodega": "Bodega Salentein",
          "price_copa": 7000,
          "price_botella": 24800
        },
        {
          "id": "chandon_aperitif",
          "name": "Chandon Apéritif",
          "bodega": "Bodega Chandon",
          "price_copa": 9500,
          "price_botella": 27100
        },
        {
          "id": "chandon_brut",
          "name": "Chandon Extra Brut",
          "bodega": "Bodega Chandon",
          "price_copa": 8000,
          "price_botella": 31200
        },
        {
          "id": "baron_b",
          "name": "Baron B Cuvée Spéciale",
          "bodega": "Bodega Baron B",
          "price_copa": 8200,
          "price_botella": 58800
        }
      ]
    },
    {
      "id": "vinos_tintos",
      "name": "Vinos Tintos",
      "note": "Copa = 250 cm3",
      "subcategories": [
        {
          "id": "malbec",
          "name": "Malbec",
          "items": [
            {
              "id": "alaris",
              "name": "Alaris",
              "bodega": "Bodega Salentein",
              "price_copa": 8000,
              "price_botella": 23100
            },
            {
              "id": "nieto_malbec",
              "name": "Nieto Senetiner",
              "bodega": "Bodega Nieto Senetiner",
              "price_copa": 8200,
              "price_botella": 23600
            },
            {
              "id": "saint_felicien",
              "name": "Saint Felicien",
              "bodega": "Bodega Trapiche",
              "price_copa": 8200,
              "price_botella": 28000
            },
            {
              "id": "terrazas_reserva",
              "name": "Terrazas de los Andes Res.",
              "bodega": "Bodega Terrazas de los Andes",
              "price_copa": 9500,
              "price_botella": 26300
            }
          ]
        },
        {
          "id": "cabernet",
          "name": "Cabernet Sauvignon",
          "items": [
            {
              "id": "santa_julia_cab",
              "name": "Santa Julia",
              "bodega": "Bodega Santa Julia",
              "price_copa": 8000,
              "price_botella": 22100
            },
            {
              "id": "trumpeter_res",
              "name": "Trumpeter Res.",
              "bodega": "Bodega Trapiche",
              "price_copa": 8200,
              "price_botella": 24700
            }
          ]
        }
      ]
    },
    {
      "id": "vinos_blancos",
      "name": "Vinos Blancos",
      "note": "Copa = 250 cm3",
      "items": [
        {
          "id": "santa_julia_sauv",
          "name": "Santa Julia Sauvignon Blanc",
          "bodega": "Bodega Santa Julia",
          "price_copa": 8000,
          "price_botella": 23100
        },
        {
          "id": "nieto_chardonnay",
          "name": "Nieto Senetiner Chardonnay",
          "bodega": "Bodega Nieto Senetiner",
          "price_copa": 8000,
          "price_botella": 23100
        },
        {
          "id": "pioneer_blanc",
          "name": "Pioneer",
          "bodega": "Bodega La Celia",
          "price_copa": 8200,
          "price_botella": 24700
        }
      ]
    }
  ]
}"""

EMBEDDED_INDEX_HTML = r"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" content="#0E0A07">
<title>__CV_NOMBRE__ — Carta viva</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,200..900,0..100,0..1&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ============================================================
   Carta Viva — Kansas
   La CARTA es protagonista. Sol asiste desde el chip arriba.
   ============================================================ */
:root {
  --ink:        #0E0A07;
  --ink-card:   #181210;
  --paper:      #F4ECD8;
  --paper-warm: #EAE0C7;
  --paper-edge: #DFD2B6;
  --accent:     #8B1C2B;
  --accent-dk:  #6E1422;
  --gold:       #C9A86A;
  --gold-dk:    #A88A4E;
  --cocoa:      #5C4639;
  --cocoa-soft: #8B7461;
  --bone:       #D9CDB4;
  --bone-soft:  #9A8E78;
  --ember-core: #FF8C3F;
  --ember-mid:  #D9421A;
  --ember-out:  #5A1010;
  --shadow:     0 30px 80px -30px rgba(0,0,0,0.6);
  --paper-grain: radial-gradient(circle at 30% 20%, rgba(139,28,43,0.03), transparent 50%),
                 radial-gradient(circle at 70% 80%, rgba(201,168,106,0.05), transparent 50%);
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; height: 100dvh; overflow: hidden; }
body {
  background: #0E0A07;  /* NEGRO — si ves esto el archivo es el nuevo */
  color: #F4ECD8;
  font-family: 'Manrope', system-ui, sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "tnum" 1;
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
input, textarea { font: inherit; color: inherit; background: none; border: 0; outline: 0; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

/* ============================================================
   SPLASH — sigue siendo épica
   ============================================================ */
#splash {
  position: fixed; inset: 0; z-index: 90;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  text-align: center; padding: 34px 22px 20px;
  background: var(--ink);
  overflow-y: auto;   /* si la pantalla es muy baja, scrollea en vez de superponerse */
  transition: opacity 700ms ease, transform 700ms ease;
}
/* bloque principal: toma el alto disponible y se centra (se achica solo) */
.splash-main {
  flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
#splash::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,140,63,0.06), transparent 60%),
    radial-gradient(ellipse 60% 50% at 50% 90%, rgba(139,28,43,0.10), transparent 60%);
  pointer-events: none;
}
#splash.gone { opacity: 0; transform: scale(1.03); pointer-events: none; }
.splash-mark {
  position: relative; z-index: 2;
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-variation-settings: "opsz" 144, "SOFT" 30, "WONK" 1;
  font-size: min(clamp(60px, 17vw, 140px), 17vh);   /* también limitado por el ALTO */
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--paper);
  text-shadow: 0 0 50px rgba(201,168,106,0.15);
  margin: 0;
}
.splash-rules {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 14px;
  margin: 16px 0 6px;
}
.splash-rules .line { width: 32px; height: 1px; background: var(--gold); opacity: 0.5; }
.splash-eyebrow {
  font-family: 'Manrope', sans-serif;
  font-weight: 500; font-size: 11px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0 0 clamp(22px, 6vh, 56px);
}
.splash-orb { width: clamp(64px, 12vh, 88px); height: clamp(64px, 12vh, 88px); margin-bottom: clamp(18px, 4vh, 36px); position: relative; z-index: 2; }
.splash-cta {
  position: relative; z-index: 2;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px;
  border: 1px solid rgba(201,168,106,0.45);
  border-radius: 999px;
  color: var(--paper);
  font-size: 13px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 500;
  background: rgba(20,15,12,0.5);
  backdrop-filter: blur(8px);
  transition: all 250ms ease;
}
.splash-cta:hover { border-color: var(--gold); background: rgba(40,28,22,0.6); }
.splash-demos { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.splash-demos[hidden] { display: none; }   /* respetar el atributo hidden (si no, el flex lo mostraba siempre) */
.splash-demos .splash-cta { min-width: 230px; justify-content: center; }
.splash-cta.demo.premium { border-color: var(--gold); color: var(--gold); font-weight: 700; }
.splash-cta::after {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--ember-core);
  box-shadow: 0 0 12px var(--ember-core);
  animation: emberPulse 2.4s ease-in-out infinite;
}
@keyframes emberPulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.2); }
}
.splash-sub {
  position: relative; z-index: 2;
  margin: 22px 0 0;
  font-family: 'Manrope', sans-serif;
  font-size: 15px; font-weight: 500; letter-spacing: 0.01em;
  color: var(--bone);
}
.splash-sub b { color: var(--gold); font-weight: 700; }
.splash-legal {
  position: relative; z-index: 2;
  flex: 0 0 auto;                 /* pie en flujo: nunca se superpone con el contenido */
  width: min(94%, 460px); margin: 16px auto 0;
  display: flex; gap: 10px; align-items: flex-start; text-align: left;
  padding: 11px 13px; border-radius: 13px;
  border: 1px solid rgba(201,168,106,0.22);
  background: rgba(20,15,12,0.55); backdrop-filter: blur(6px);
  font-size: 11.5px; line-height: 1.5; color: var(--bone-soft);
}
.splash-legal b { color: var(--bone); font-weight: 700; }
.splash-legal-ic {
  flex: 0 0 auto; width: 19px; height: 19px; margin-top: 1px;
  border-radius: 50%; background: var(--accent); color: var(--paper);
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 12px; font-family: 'Manrope', sans-serif;
}
/* Pantallas bajas: achicar todo para que entre sin tapar nada */
@media (max-height: 640px) {
  .splash-mark { font-size: min(clamp(44px, 13vw, 80px), 16vh); }
  .splash-eyebrow { margin-bottom: 14px; }
  .splash-orb { width: 58px; height: 58px; margin-bottom: 12px; }
  .splash-sub { margin-top: 12px; font-size: 13px; }
  .splash-legal { font-size: 10.3px; padding: 9px 11px; margin-top: 12px; }
}

/* ============================================================
   APP — la carta es el rey
   ============================================================ */
#app {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 100dvh;   /* dynamic viewport height: se ajusta cuando aparece el teclado */
  z-index: 10;
  display: grid;
  grid-template-rows: auto auto 1fr;
  background: #0E0A07;
  overflow: hidden;
  opacity: 0;
  transition: opacity 700ms ease 200ms;
}
#app.ready { opacity: 1; }

/* Topbar — marca + Sol chip */
.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;  /* menú | marca centrada | acciones */
  align-items: center;
  gap: 10px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid rgba(139,28,43,0.10);
  background: linear-gradient(180deg, #181210, #0E0A07);
  position: relative; z-index: 3;
}
.brand {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-variation-settings: "opsz" 48, "SOFT" 30;
  font-size: clamp(17px, 5vw, 26px);  /* escala con el ancho: ~18px @360, 26px en grande */
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--paper);
  text-align: center;       /* centrada en la columna del medio */
  white-space: nowrap;      /* "La Escaloneta" nunca parte en dos */
  min-width: 0;
}
.brand small {
  display: block;
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  margin-top: 4px;
  font-weight: 500;
  opacity: 0.85;
}

/* Sol chip — orbe mini + texto, clickeable, indica estado */
.sol-chip {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 7px 14px 7px 7px;
  border: 1px solid rgba(139,28,43,0.18);
  border-radius: 999px;
  background: rgba(24,18,16,0.85);
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  transition: all 220ms ease;
  cursor: pointer;
}
.sol-chip:hover {
  background: rgba(36,26,22,0.95);
  border-color: rgba(201,168,106,0.45);
  transform: translateY(-1px);
}
.sol-chip .mini-orb-wrap {
  position: relative;
  width: 26px; height: 26px;
  flex-shrink: 0;
}
.sol-chip .mini-orb {
  position: absolute; inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 45%, var(--ember-core) 0%, var(--ember-mid) 30%, var(--ember-out) 65%, transparent 82%);
  animation: breatheSmall 4.6s ease-in-out infinite;
}
.sol-chip .mini-orb::before {
  content: '';
  position: absolute; inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, #FFE3BE 0%, #FFB36B 25%, #FF7028 60%, transparent 82%);
  mix-blend-mode: screen;
}
.sol-chip .mini-ring {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  pointer-events: none;
}
.sol-chip[data-state="listening"] .mini-ring {
  border-color: var(--gold);
  animation: ringPulse 1.2s ease-out infinite;
}
.sol-chip[data-state="thinking"] .mini-ring {
  border-color: var(--accent);
  border-style: dashed;
  animation: ringSpin 2s linear infinite;
}
.sol-chip[data-state="speaking"] .mini-ring {
  border-color: var(--ember-core);
  animation: ringPulse 0.9s ease-out infinite;
}
@keyframes breatheSmall {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.07); }
}
@keyframes ringPulse {
  0%   { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(1.35); opacity: 0; }
}
@keyframes ringSpin { to { transform: rotate(360deg); } }

.sol-chip .state-label {
  font-size: 9px;
  letter-spacing: 0.3em;
  display: block;
  color: var(--cocoa);
  margin-top: 1px;
  opacity: 0.7;
  font-weight: 500;
  min-height: 10px;
}


/* TICKER superior: la respuesta de la mesera en vivo. Tap = historial completo */
.top-ticker {
  flex: 1;
  min-width: 0;
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
  cursor: pointer;
  padding: 4px 0;
}
.ticker-text {
  max-width: 100%;
  font-size: 13px;
  line-height: 1.35;
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
  font-family: 'Fraunces', serif;
}
.ticker-text:empty::before {
  content: 'Tu mesera virtual';
  opacity: 0.45;
}
.ticker-state {
  font-size: 9px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--bone-soft);
  font-weight: 600;
  min-height: 11px;
}


/* Botón "Escribile a tu mesera" — abre la ventana de chat */
.chat-trigger {
  flex: 1;
  min-width: 0;
  margin-left: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  padding: 10px 16px;
  background: rgba(24,18,16,0.85);
  border: 1px solid rgba(201,168,106,0.30);
  border-radius: 999px;
  color: var(--bone-soft);
  font-size: 13.5px;
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
  overflow: hidden;
}
.chat-trigger:hover { border-color: var(--gold); color: var(--bone); }
.chat-trigger svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--gold); }
.chat-trigger span { overflow: hidden; text-overflow: ellipsis; }
.chat-trigger .ct-short { display: none; }   /* en desktop se ve el texto largo */

/* Tabs — secciones de la carta */
.carta-tabs {
  display: flex; gap: 4px;
  padding: 8px 16px 10px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(201,168,106,0.15);
  background: #0E0A07;
  position: relative; z-index: 2;
  scrollbar-width: none;
}
.carta-tabs::-webkit-scrollbar { height: 0; display: none; }
.tab {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 7px 13px;
  border-radius: 999px;
  color: var(--bone-soft);
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 600;
  transition: all 180ms ease;
}
.tab.active {
  background: var(--accent);
  color: var(--paper);
  box-shadow: 0 4px 10px -3px rgba(139,28,43,0.4);
}
.tab:hover:not(.active) {
  background: rgba(139,28,43,0.25);
  color: var(--paper);
}
/* Botón "☰ Menú" fijo a la izquierda de los tabs */
/* Botón "☰ Menú" en el header (a la izquierda) */
.menu-btn {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800;
  padding: 8px 14px; border-radius: 999px;
  color: var(--paper); cursor: pointer; white-space: nowrap;
  background: linear-gradient(180deg, var(--accent), var(--accent-dk));
  box-shadow: 0 4px 12px -3px rgba(139,28,43,0.55);
  transition: all 180ms ease;
}
.menu-btn .mt-ic { font-size: 13px; line-height: 1; }
.menu-btn.open { background: linear-gradient(180deg, var(--gold-dk), #8a6e3e); }

/* Menú desplegable — índice de secciones */
.menu-overlay {
  position: fixed; inset: 0; z-index: 59;
  background: rgba(8,5,4,0.45); backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none; transition: opacity 220ms ease;
}
.menu-overlay.open { opacity: 1; pointer-events: auto; }
.menu-drop {
  position: fixed; left: 10px; right: 10px; top: 120px; z-index: 60;
  max-height: 64vh; overflow-y: auto;
  background: linear-gradient(180deg, rgba(30,22,18,0.98), rgba(20,15,12,0.98));
  border: 1px solid rgba(201,168,106,0.25); border-radius: 16px;
  box-shadow: 0 26px 60px -18px rgba(0,0,0,0.78);
  padding: 8px 8px 12px;
  opacity: 0; transform: translateY(-10px); pointer-events: none;
  transition: opacity 220ms ease, transform 220ms ease;
}
.menu-drop.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
.menu-drop-group {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--gold); font-weight: 700; padding: 12px 12px 6px;
}
.menu-drop-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; text-align: left;
  padding: 12px 14px; border-radius: 10px;
  font-family: 'Fraunces', serif; font-size: 16px; color: var(--paper);
  transition: background 140ms ease;
}
.menu-drop-item:hover { background: rgba(201,168,106,0.10); }
.menu-drop-item.active { background: var(--accent); color: var(--paper); }
.menu-drop-item.active::after { content: '✓'; color: var(--gold); font-size: 13px; }

/* CARTA — el contenido principal */
.carta-body {
  background: #0E0A07;
  overflow-y: auto;
  padding: 18px 22px 24px;
  -webkit-overflow-scrolling: touch;
  scroll-padding-top: 8px;
}
.carta-body::-webkit-scrollbar { width: 6px; }
.carta-body::-webkit-scrollbar-track { background: transparent; }
.carta-body::-webkit-scrollbar-thumb { background: rgba(139,28,43,0.25); border-radius: 6px; }

.carta-section { margin-bottom: 44px; }
.carta-section:last-child { margin-bottom: 150px; }
.carta-section h2 {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-variation-settings: "opsz" 44;
  font-size: 34px;
  letter-spacing: -0.015em;
  color: var(--gold);
  margin: 0 0 6px;
}
.carta-section .sep {
  height: 2px;
  background: linear-gradient(90deg, var(--gold) 0%, var(--accent) 35%, transparent 82%);
  margin: 8px 0 20px;
  opacity: 0.9;
  border-radius: 2px;
}
/* Reveal del encabezado: se redispara al pasar a una sección nueva (scroll-spy) */
@keyframes sectionReveal {
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
.carta-section.reveal > h2  { animation: sectionReveal 520ms cubic-bezier(.2,.7,.2,1) both; }
.carta-section.reveal > .sep { animation: sectionReveal 520ms cubic-bezier(.2,.7,.2,1) both; animation-delay: 90ms; }
.carta-section .note {
  font-size: 11.5px;
  font-style: italic;
  color: var(--bone-soft);
  border-left: 2px solid var(--gold);
  padding: 4px 0 4px 12px;
  margin: 0 0 16px;
  line-height: 1.5;
}

.dish {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(111,90,75,0.20);
}
.dish:last-child { border-bottom: 0; }
.dish .name {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-variation-settings: "opsz" 18;
  font-size: 17px;
  color: var(--paper);
  line-height: 1.25;
  letter-spacing: -0.005em;
}
.dish .desc {
  font-size: 12.5px;
  color: var(--bone-soft);
  margin-top: 4px;
  line-height: 1.5;
}
.dish .meta {
  font-size: 11px;
  color: var(--bone-soft);
  margin-top: 4px;
  font-style: italic;
}
.dish .price {
  font-family: 'Manrope', sans-serif;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--accent);
  white-space: nowrap;
  font-feature-settings: "tnum" 1;
  text-align: right;
  align-self: start;
  padding-top: 2px;
  line-height: 1.3;
}
.dish .price small {
  display: block;
  font-size: 8.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cocoa-soft);
  font-weight: 500;
  margin-top: 1px;
}
.dish .price-tba {
  font-style: italic;
  font-size: 11px;
  font-weight: 400;
  color: var(--cocoa); opacity: 0.7;
}

/* Reglas de la casa al final */
.house-rules {
  margin-top: 16px;
  padding: 16px 18px;
  background: rgba(139,28,43,0.15);
  border-radius: 12px;
  border: 1px solid rgba(139,28,43,0.35);
}
.house-rules h3 {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0 0 10px;
}
.house-rules ul { list-style: none; padding: 0; margin: 0; }
.house-rules li {
  font-size: 11.5px;
  color: var(--bone);
  padding: 4px 0;
  line-height: 1.5;
}
.house-rules li::before { content: '· '; color: var(--gold); font-weight: bold; }

/* ============================================================
   DOCK — input siempre visible abajo
   ============================================================ */
.dock {
  transition: transform 200ms ease;
  padding: 10px 14px max(14px, env(safe-area-inset-bottom)) 14px;
  background: linear-gradient(180deg, transparent, #0E0A07 35%);
  position: relative; z-index: 4;
}
.dock-row {
  display: flex; align-items: center; gap: 8px;
  background: #181210;
  border: 1px solid rgba(201,168,106,0.25);
  border-radius: 999px;
  padding: 5px 5px 5px 18px;
  box-shadow: 0 12px 36px -16px rgba(139,28,43,0.25);
}
.dock-row:focus-within {
  border-color: var(--accent);
  box-shadow: 0 12px 36px -14px rgba(139,28,43,0.4);
}
.dock-row textarea {
  flex: 1;
  resize: none;
  height: 22px; max-height: 80px;
  font-size: 15px;
  font-family: inherit;
  color: var(--paper);
  line-height: 22px;
  padding: 7px 0;
}
.dock-row textarea::placeholder { color: var(--cocoa-soft); opacity: 0.8; }

.icon-btn {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 220ms ease;
}
.icon-btn svg { width: 18px; height: 18px; }

.mic-btn {
  background: linear-gradient(180deg, var(--accent), var(--accent-dk));
  color: var(--paper);
  box-shadow: 0 6px 16px -6px rgba(139,28,43,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
}
.mic-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 20px -6px rgba(139,28,43,0.55);
}
.mic-btn.recording {
  background: linear-gradient(180deg, #BB2334, var(--accent));
  animation: micRecord 1.4s ease-out infinite;
}
@keyframes micRecord {
  0%   { box-shadow: 0 0 0 0 rgba(139,28,43,0.65), 0 6px 16px -6px rgba(139,28,43,0.45); }
  100% { box-shadow: 0 0 0 16px rgba(139,28,43,0), 0 6px 16px -6px rgba(139,28,43,0.45); }
}

.send-btn {
  background: var(--gold);
  color: var(--ink);
}
.send-btn:hover { background: #D8B879; }
.send-btn:disabled { background: rgba(201,168,106,0.30); color: var(--cocoa-soft); }

/* ============================================================
   HISTORIAL OVERLAY (se abre desde el chip Sol)
   ============================================================ */
.history-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(20,15,12,0.7);
  backdrop-filter: blur(4px);
  opacity: 0; pointer-events: none;
  transition: opacity 300ms ease;
}
.history-overlay.open { opacity: 1; pointer-events: auto; }

.history-panel {
  position: fixed; top: 0; left: 0; right: 0;
  height: 55dvh;          /* alto fijo y chico: así el teclado no lo tapa al escribir */
  max-height: 55dvh;
  z-index: 70;
  background: var(--paper);
  border-bottom-left-radius: 22px;
  border-bottom-right-radius: 22px;
  transform: translateY(-100%);
  transition: transform 380ms cubic-bezier(.2,.7,.2,1);
  display: flex; flex-direction: column;
  box-shadow: 0 30px 60px rgba(0,0,0,0.4);
}
.history-panel.open { transform: translateY(0); }
.history-handle {
  order: 99;              /* el handle va abajo del panel ahora */
  width: 40px; height: 4px;
  background: rgba(139,28,43,0.25);
  border-radius: 2px;
  margin: 8px auto 10px;
  flex-shrink: 0;
}
.history-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: max(12px, env(safe-area-inset-top)) 20px 6px;
  flex-shrink: 0;
}
.history-head h3 {
  font-family: 'Fraunces', serif;
  font-weight: 400;
  font-size: 20px;
  letter-spacing: -0.01em;
  color: var(--accent);
  margin: 0;
}
.history-close {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--accent);
  border: 1px solid rgba(139,28,43,0.2);
}
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 18px 10px;
  display: flex; flex-direction: column; gap: 10px;
}
.msg {
  max-width: 88%;
  padding: 9px 14px 10px;
  border-radius: 16px;
  font-size: 13.5px;     /* un toque más chica → entra más texto, pero legible para grandes */
  line-height: 1.4;
}
.msg.user {
  align-self: flex-end;
  background: linear-gradient(180deg, var(--accent), var(--accent-dk));
  color: var(--paper);
  border-bottom-right-radius: 5px;
}
.msg.bot {
  align-self: flex-start;
  background: #FFFCF5;
  color: #2A1F18;
  border: 1px solid rgba(139,28,43,0.15);
  border-bottom-left-radius: 5px;
}
.msg.bot .who {
  display: block;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--accent);
  margin-bottom: 2px;
  text-transform: uppercase;
}
.history-empty {
  text-align: center;
  color: var(--cocoa-soft);
  font-style: italic;
  font-size: 13px;
  padding: 40px 20px;
}


.panel-dock {
  flex-shrink: 0;
  padding: 6px 14px 8px 14px;
  background: var(--paper);
  border-top: 1px solid rgba(139,28,43,0.12);
}
.panel-dock .dock-row {
  background: #FFFCF5;
  border: 1px solid rgba(139,28,43,0.20);
}
.panel-dock textarea { color: #2A1F18; }
.panel-dock textarea::placeholder { color: var(--cocoa-soft); }

/* Toast (errores) */
/* ============================================================
   ORBE FLOTANTE — micrófono central sobre la carta
   ============================================================ */
.orb-float {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  width: 96px; height: 96px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 220ms cubic-bezier(.2,.7,.2,1);
}
.orb-float:hover { transform: translateX(-50%) scale(1.06); }
.orb-float:active { transform: translateX(-50%) scale(0.95); }

.orb-float-inner {
  position: absolute; inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 45%, var(--ember-core) 0%, var(--ember-mid) 30%, var(--ember-out) 65%, transparent 82%);
  animation: floatBreathe 4.8s ease-in-out infinite;
  box-shadow:
    0 0 0 1px rgba(201,168,106,0.25),
    0 8px 24px -8px rgba(139,28,43,0.6),
    0 0 40px -16px rgba(255,140,63,0.4);
}
.orb-float-inner::before {
  content: '';
  position: absolute; inset: 18%;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, #FFE3BE 0%, #FFB36B 22%, #FF7028 58%, transparent 82%);
  mix-blend-mode: screen;
  animation: coreFlickerF 2.8s ease-in-out infinite;
}
.orb-float-inner::after {
  /* ícono mic centrado */
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,240,220,0.9)' stroke-width='1.6' stroke-linecap='round'%3E%3Crect x='9' y='3' width='6' height='11' rx='3'/%3E%3Cpath d='M5 11a7 7 0 0014 0M12 18v3'/%3E%3C/svg%3E") center/36% no-repeat;
}
/* Al hablar, el ícono del orbe pasa de micrófono a un cuadrado de "detener" */
.orb-float[data-state="speaking"] .orb-float-inner::after {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='rgba(255,240,220,0.95)'%3E%3Crect x='6.5' y='6.5' width='11' height='11' rx='2.5'/%3E%3C/svg%3E") center/30% no-repeat;
}
.orb-float-halo {
  position: absolute; inset: -20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,124,40,0.18), rgba(139,28,43,0.10) 40%, transparent 65%);
  filter: blur(10px);
  pointer-events: none;
  animation: haloF 7s ease-in-out infinite;
}
.orb-float-ring {
  position: absolute; inset: -6px;
  border-radius: 50%;
  border: 1.5px solid rgba(201,168,106,0.30);
  pointer-events: none;
  opacity: 0;
  transition: opacity 300ms ease, border-color 300ms ease;
}

/* Cartel arriba del orbe — visible, invita a hablar */
.orb-float-label {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%; transform: translateX(-50%);
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--paper);
  white-space: nowrap;
  pointer-events: none;
  font-weight: 600;
  padding: 7px 14px; border-radius: 999px;
  border: 1px solid rgba(201,168,106,0.40);
  background: rgba(24,18,16,0.92); backdrop-filter: blur(6px);
  box-shadow: 0 8px 22px -12px rgba(0,0,0,0.7);
  opacity: 0;   /* oculto por defecto: no es invasivo */
  transition: opacity 400ms ease;
}
/* el cartel se muestra en estados activos, o como recordatorio tras inactividad */
.orb-float[data-state="listening"] .orb-float-label,
.orb-float[data-state="thinking"]  .orb-float-label,
.orb-float[data-state="speaking"]  .orb-float-label,
.orb-float.idle-hint .orb-float-label { opacity: 1; }

/* Estados */
.orb-float[data-state="idle"] .orb-float-ring { opacity: 0.45; }
.orb-float[data-state="listening"] .orb-float-inner {
  animation: floatBreathe 2.2s ease-in-out infinite;
  box-shadow:
    0 0 0 2px rgba(201,168,106,0.5),
    0 8px 28px -8px rgba(139,28,43,0.7),
    0 0 50px -10px rgba(255,140,63,0.6);
}
.orb-float[data-state="listening"] .orb-float-ring {
  opacity: 1;
  border-color: var(--gold);
  animation: ringPulseF 1.1s ease-out infinite;
}
.orb-float[data-state="thinking"] .orb-float-inner {
  animation: floatBreathe 1.3s ease-in-out infinite;
  filter: brightness(0.88);
}
.orb-float[data-state="thinking"] .orb-float-ring {
  opacity: 0.8;
  border-style: dashed;
  border-color: var(--gold);
  animation: ringSpin 2.2s linear infinite;
}
.orb-float[data-state="speaking"] .orb-float-inner {
  animation: floatBreathe 0.9s ease-in-out infinite;
  filter: brightness(1.12);
  box-shadow:
    0 0 0 2px rgba(255,140,63,0.5),
    0 8px 28px -8px rgba(139,28,43,0.7),
    0 0 55px -8px rgba(255,140,63,0.7);
}
.orb-float[data-state="speaking"] .orb-float-ring {
  opacity: 1;
  border-color: var(--ember-core);
  animation: ringPulseF 0.85s ease-out infinite;
}

@keyframes floatBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes coreFlickerF {
  0%,100% { opacity: 0.85; transform: scale(1); }
  40%     { opacity: 1;    transform: scale(1.05); }
  70%     { opacity: 0.75; transform: scale(0.97); }
}
@keyframes haloF { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1) translate(-1%,2%); } }
@keyframes ringPulseF { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }

/* Ajuste dock: hacer sitio para el orbe flotante */
.dock { padding-top: 2px; }
.dock-row textarea::placeholder { color: var(--bone-soft); opacity: 0.55; }

/* el mic btn del dock lo ocultamos — ahora está el orbe */
.mic-btn { display: none !important; }

/* ============================================================
   CHAT VISIBLE — burbujas sobre la carta
   ============================================================ */
.chat-feed {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  max-height: 65%;
  z-index: 6;
  padding: 12px 108px 14px 14px;
  display: flex; flex-direction: column; gap: 9px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, transparent 0, #000 28px);
}
.chat-feed.has-msgs { pointer-events: auto; }
.chat-feed::-webkit-scrollbar { width: 0; }

.bubble {
  max-width: 84%;
  padding: 10px 14px 11px;
  border-radius: 16px;
  font-size: 14.5px;
  line-height: 1.45;
  box-shadow: 0 8px 24px -10px rgba(0,0,0,0.5);
  animation: bubbleIn 320ms cubic-bezier(.2,.7,.2,1);
  word-wrap: break-word;
}
@keyframes bubbleIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.bubble.user {
  align-self: flex-end;
  background: linear-gradient(180deg, var(--accent), var(--accent-dk));
  color: var(--paper);
  border-bottom-right-radius: 5px;
}
.bubble.bot {
  align-self: flex-start;
  background: linear-gradient(180deg, #20171280, #181210E6);
  backdrop-filter: blur(12px);
  color: var(--paper);
  border: 1px solid rgba(201,168,106,0.25);
  border-bottom-left-radius: 5px;
}
.bubble.bot .who {
  display: block;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--gold);
  margin-bottom: 3px;
  text-transform: uppercase;
}
.bubble.typing { color: var(--bone-soft); font-style: italic; }

/* Cartel ESCUCHANDO grande cuando se mantiene apretado el orbe */
.listening-overlay {
  position: fixed;
  bottom: 150px;
  left: 50%; transform: translateX(-50%);
  z-index: 55;
  padding: 10px 22px;
  background: rgba(139,28,43,0.95);
  border: 1px solid var(--gold);
  border-radius: 999px;
  color: var(--paper);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
  box-shadow: 0 8px 30px -8px rgba(139,28,43,0.7);
}
.listening-overlay.show { opacity: 1; }

/* Cuando el orbe está apretado: titila FUERTE */
.orb-float.holding .orb-float-inner {
  animation: orbHoldPulse 0.6s ease-in-out infinite !important;
  filter: brightness(1.3) saturate(1.2) !important;
  box-shadow:
    0 0 0 3px var(--gold),
    0 0 60px -4px rgba(255,140,63,0.9) !important;
}
.orb-float.holding .orb-float-ring {
  opacity: 1 !important;
  border-color: var(--gold) !important;
  border-width: 2px !important;
  animation: orbHoldRing 0.6s ease-out infinite !important;
}
@keyframes orbHoldPulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.15); }
}
@keyframes orbHoldRing {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

.toast {
  position: fixed; bottom: 96px; left: 50%; transform: translateX(-50%);
  background: rgba(139,28,43,0.96); color: var(--paper);
  padding: 10px 18px; border-radius: 999px;
  font-size: 13px; z-index: 100;
  box-shadow: 0 12px 28px rgba(0,0,0,0.3);
  opacity: 0; pointer-events: none;
  transition: opacity 300ms ease;
}
.toast.show { opacity: 1; }

/* Responsive */
@media (max-width: 480px) {
  .topbar { gap: 7px; padding: 12px 10px 8px; }
  .menu-btn { font-size: 9.5px; padding: 7px 11px; letter-spacing: 0.10em; }
  .sol-chip { padding: 6px 12px 6px 6px; font-size: 11px; }
  .chat-trigger { flex: 0 0 auto; padding: 9px 11px; }
  .chat-trigger .ct-full { display: none; }     /* en celu: el texto largo no entra */
  .chat-trigger .ct-short { display: inline; }  /* ...se muestra "Chat" */
  .table-chip { padding: 3px 9px; }
  .table-chip b { font-size: 14px; }
  .quick-chip { font-size: 10.5px; padding: 8px 10px; }
  .carta-section h2 { font-size: 27px; }
  .dish .name { font-size: 16px; }
}
/* Red de seguridad: nada se desborda horizontalmente */
html, body, #app { max-width: 100vw; overflow-x: hidden; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 100ms !important; }
}

/* SPLASH ORB (reused from earlier) */
.orb-wrap {
  position: relative; width: 100%; height: 100%;
}
.orb {
  position: absolute; inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 45%, var(--ember-core) 0%, var(--ember-mid) 28%, var(--ember-out) 60%, transparent 78%);
  animation: breatheBig 5.2s ease-in-out infinite;
}
.orb::before {
  content: ''; position: absolute; inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, #FFE3BE 0%, #FFB36B 20%, #FF7028 55%, transparent 80%);
  mix-blend-mode: screen;
  animation: coreFlicker 2.8s ease-in-out infinite;
}
.orb-halo {
  position: absolute; inset: -18%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,124,40,0.20), rgba(139,28,43,0.10) 35%, transparent 60%);
  filter: blur(16px);
  animation: haloDrift 8s ease-in-out infinite;
}
@keyframes breatheBig { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes coreFlicker {
  0%,100% { opacity: 0.85; transform: scale(1); }
  40%     { opacity: 1;    transform: scale(1.04); }
  70%     { opacity: 0.78; transform: scale(0.97); }
}
@keyframes haloDrift {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(-2%, 3%) scale(1.06); }
}

/* ============================================================
   Cuando el teclado está abierto: ajustar layout
   ============================================================ */
body.keyboard-open .orb-float { opacity: 0; pointer-events: none; }
body.keyboard-open .topbar { padding: 8px 14px; }
body.keyboard-open .carta-tabs { padding: 4px 16px 6px; }
body.keyboard-open .carta-section:last-child { margin-bottom: 20px; }

/* ============================================================
   NUEVO — mesa, acciones rápidas, pedido, mozo, valoración, modales
   ============================================================ */

/* Chip de mesa en la topbar */
.topbar-actions { display: flex; align-items: center; gap: 8px; min-width: 0; justify-content: flex-end; }
.topbar .brand { min-width: 0; }
.topbar-actions .table-chip { flex-shrink: 0; }
.topbar-actions .chat-trigger { min-width: 0; }
/* Chip de mesa apilado: "MESA" chico arriba + número grande abajo (ocupa poco ancho) */
.table-chip {
  display: inline-flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 4px 11px; border-radius: 13px;
  border: 1px solid rgba(201,168,106,0.30);
  background: rgba(24,18,16,0.85);
  color: var(--gold); cursor: pointer; white-space: nowrap; line-height: 1;
  transition: all 200ms ease;
}
.table-chip .tc-label { font-size: 7.5px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; opacity: 0.85; }
.table-chip:hover { border-color: var(--gold); background: rgba(36,26,22,0.95); }
.table-chip b { color: var(--paper); font-weight: 800; font-size: 15px; }

/* Botón "+" en cada plato */
.dish-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
/* Vinos/espumantes: fila por variante (copa / botella) con su propio "+" */
.wine-row { display: flex; align-items: center; justify-content: flex-end; gap: 9px; }
.wine-row .price { padding-top: 0; }
.dish-add {
  padding: 7px 14px; border-radius: 999px;
  border: 1px solid rgba(201,168,106,0.45);
  background: rgba(139,28,43,0.18); color: var(--gold);
  font-family: 'Manrope', sans-serif;
  font-size: 11.5px; line-height: 1; font-weight: 700;
  letter-spacing: 0.02em; white-space: nowrap;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 160ms ease; flex-shrink: 0;
}
.dish-add:hover { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.dish-add:active { transform: scale(0.94); }
.dish-add.in-cart { background: var(--accent); color: var(--paper); border-color: var(--accent); }
/* Control con stepper: "Agregar" cuando no está, "− N +" cuando ya está en el pedido */
.dish-add-ctl { display: inline-flex; align-items: center; flex-shrink: 0; }
.dish-add-ctl[data-in="1"] .dish-add { display: none; }
.dish-add-ctl[data-in="0"] .qty-ctl { display: none; }
.qty-ctl {
  display: inline-flex; align-items: center;
  border: 1px solid var(--accent); border-radius: 999px;
  background: rgba(139,28,43,0.16); overflow: hidden;
}
.qty-ctl button {
  width: 32px; height: 30px; color: var(--gold);
  font-size: 18px; font-weight: 700; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
}
.qty-ctl button:active { background: var(--accent); color: var(--paper); }
.qty-ctl .qn {
  min-width: 24px; text-align: center; color: var(--paper);
  font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 13.5px;
}

/* Autoguiado: la mesera resalta y te lleva a lo que va nombrando */
.dish.guided {
  background: rgba(201,168,106,0.09);
  border-radius: 12px;
  padding: 12px;
  margin: 0 -12px;
  box-shadow: inset 3px 0 0 0 var(--gold);
  animation: guideGlow 1.5s ease-out 2;
}
@keyframes guideGlow {
  0%   { box-shadow: inset 3px 0 0 0 var(--gold), 0 0 0 0 rgba(201,168,106,0.55); }
  100% { box-shadow: inset 3px 0 0 0 var(--gold), 0 0 0 14px rgba(201,168,106,0); }
}
.dish.guided .name { color: var(--gold); }
.dish.spotlight-current .dish-add {
  background: var(--accent); color: var(--paper); border-color: var(--accent);
  animation: guideAddPulse 1.1s ease-in-out infinite;
}
@keyframes guideAddPulse {
  0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(201,168,106,0.65); }
  50%      { transform: scale(1.12); box-shadow: 0 0 0 7px rgba(201,168,106,0); }
}
/* Botón flotante "Agregar al pedido" — sigue al spotlight mientras la mesera habla */
.add-float {
  position: fixed; left: 50%; bottom: 198px; z-index: 50;
  transform: translateX(-50%) translateY(10px);
  display: none; align-items: center; gap: 8px;
  max-width: 88vw; padding: 12px 22px; border-radius: 999px; border: none;
  background: linear-gradient(180deg, var(--gold), var(--gold-dk));
  color: #2A1B0E; font-family: 'Manrope', sans-serif;
  font-size: 13px; font-weight: 800; letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  box-shadow: 0 16px 36px -12px rgba(201,168,106,0.75);
  opacity: 0; transition: opacity 220ms ease, transform 220ms ease;
}
.add-float::before { content: '＋'; font-size: 15px; font-weight: 700; }
.add-float.show { display: inline-flex; opacity: 1; transform: translateX(-50%) translateY(0); animation: addFloatIn 360ms cubic-bezier(.34,1.56,.64,1); }
.add-float:active { transform: translateX(-50%) scale(0.96); }
@keyframes addFloatIn {
  0%   { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.96); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
body.keyboard-open .add-float { display: none; }

/* Chips de acción rápida flanqueando el orbe */
.quick-actions {
  position: fixed; bottom: 36px; left: 0; right: 0; z-index: 48;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 12px; pointer-events: none;
}
.quick-col { display: flex; flex-direction: column; gap: 9px; width: 38%; max-width: 168px; pointer-events: auto; }
.quick-col.right { align-items: flex-end; }
.quick-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 12px; border-radius: 15px;
  border: 1px solid rgba(201,168,106,0.28);
  background: rgba(24,18,16,0.92); backdrop-filter: blur(6px);
  color: var(--paper); font-size: 11px; line-height: 1.15; font-weight: 600;
  text-align: left; box-shadow: 0 8px 22px -12px rgba(0,0,0,0.7);
  transition: all 180ms ease;
}
.quick-chip:hover { border-color: var(--gold); transform: translateY(-2px); }
.quick-chip:active { transform: scale(0.96); }
.quick-chip .qi { font-size: 15px; flex-shrink: 0; }
.quick-actions.hidden { opacity: 0; pointer-events: none; transform: translateY(8px); transition: opacity 240ms ease, transform 240ms ease; }
body.keyboard-open .quick-actions { display: none; }   /* en el chat, los 4 por defecto se ocultan */
/* ...pero los chips de CONTEXTO (acción/elección) quedan visibles, subidos arriba del teclado,
   para poder seguir el hilo de la conversación sin que el teclado los tape (--kb lo setea el JS). */
body.keyboard-open.has-ctx-chips .quick-actions { display: flex; bottom: calc(var(--kb, 0px) + 12px); }

/* Barra "Ver mi pedido" */
.cart-bar {
  position: fixed; left: 50%; bottom: 142px; z-index: 49;
  transform: translateX(-50%) translateY(20px);
  display: none; align-items: center; gap: 11px;
  padding: 11px 18px; border-radius: 999px;
  background: linear-gradient(180deg, var(--accent), var(--accent-dk));
  color: var(--paper); font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
  box-shadow: 0 14px 34px -12px rgba(139,28,43,0.8); cursor: pointer;
  opacity: 0; transition: opacity 260ms ease, transform 260ms ease;
}
.cart-bar.show { display: flex; opacity: 1; transform: translateX(-50%) translateY(0); }
.cart-bar .cart-count {
  background: var(--paper); color: var(--accent);
  border-radius: 999px; min-width: 22px; height: 22px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;
}
body.keyboard-open .cart-bar { display: none; }

/* Sheets (pedido / valoración) */
.sheet-overlay {
  position: fixed; inset: 0; z-index: 80; background: rgba(8,5,4,0.62);
  backdrop-filter: blur(3px); opacity: 0; pointer-events: none; transition: opacity 280ms ease;
}
.sheet-overlay.open { opacity: 1; pointer-events: auto; }
.sheet {
  position: fixed; left: 0; right: 0; bottom: var(--kb, 0px); z-index: 81;
  max-height: 88dvh; display: flex; flex-direction: column;
  background: linear-gradient(180deg, #1B1411, #0E0A07);
  border-top-left-radius: 22px; border-top-right-radius: 22px;
  border-top: 1px solid rgba(201,168,106,0.22);
  box-shadow: 0 -20px 60px -20px rgba(0,0,0,0.8);
  transform: translateY(102%); transition: transform 320ms cubic-bezier(.2,.7,.2,1);
}
.sheet.open { transform: translateY(0); }
.sheet-handle { width: 42px; height: 4px; border-radius: 999px; background: rgba(201,168,106,0.35); margin: 10px auto 4px; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 20px 12px; }
.sheet-head h3 { font-family: 'Fraunces', serif; font-weight: 400; font-size: 22px; color: var(--gold); margin: 0; }
.sheet-close { width: 30px; height: 30px; border-radius: 50%; background: rgba(201,168,106,0.12); color: var(--bone); font-size: 15px; display: flex; align-items: center; justify-content: center; }
.sheet-body { overflow-y: auto; padding: 0 20px 16px; }
.sheet-foot { padding: 14px 20px calc(18px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(201,168,106,0.12); }

/* Ítems del pedido */
.order-empty { color: var(--bone-soft); text-align: center; padding: 30px 10px; font-size: 13.5px; line-height: 1.6; }
.order-item { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px dashed rgba(111,90,75,0.22); }
.order-item .oi-name { font-family: 'Fraunces', serif; font-size: 16px; color: var(--paper); line-height: 1.2; }
.order-item .oi-price { font-size: 12px; color: var(--bone-soft); margin-top: 3px; }
.qty-stepper { display: inline-flex; align-items: center; gap: 10px; }
.qty-stepper button { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(201,168,106,0.35); color: var(--gold); font-size: 16px; display: flex; align-items: center; justify-content: center; }
.qty-stepper b { min-width: 18px; text-align: center; color: var(--paper); font-size: 14px; }
.oi-line { color: var(--gold); font-weight: 700; font-size: 13.5px; min-width: 62px; text-align: right; }
.order-total { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 0 2px; font-size: 14px; color: var(--bone); }
.order-total b { font-family: 'Fraunces', serif; font-size: 24px; color: var(--gold); }
.order-tba { font-size: 11.5px; color: var(--bone-soft); font-style: italic; margin-top: 4px; }
.order-note { font-size: 12px; color: var(--bone-soft); line-height: 1.5; margin-top: 14px; padding: 11px 13px; border: 1px dashed rgba(201,168,106,0.28); border-radius: 10px; }
.order-note b { color: var(--gold); font-weight: 600; }

/* Campos de formulario */
.field { margin: 14px 0 0; }
.field label { display: block; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; font-weight: 700; }
.field input {
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(201,168,106,0.25); background: rgba(0,0,0,0.25);
  color: var(--paper); font-size: 15px;
}
.field input:focus { border-color: var(--gold); }
/* Mesa que viene del QR: se muestra como dato fijo, no como campo editable */
.field input.locked { border-color: transparent; background: transparent; padding-left: 0; font-weight: 700; font-size: 17px; pointer-events: none; -webkit-text-fill-color: var(--paper); }
.field .hint { font-size: 10.5px; color: var(--bone-soft); margin-top: 5px; line-height: 1.4; }

/* Botones grandes */
.btn-primary, .btn-ghost {
  width: 100%; padding: 15px; border-radius: 14px; font-size: 14.5px; font-weight: 700;
  letter-spacing: 0.02em; display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: all 180ms ease;
}
.btn-primary { background: linear-gradient(180deg, var(--accent), var(--accent-dk)); color: var(--paper); box-shadow: 0 12px 30px -12px rgba(139,28,43,0.8); }
.btn-primary:hover { filter: brightness(1.08); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { filter: grayscale(0.4) brightness(0.7); }
.btn-ghost { background: transparent; border: 1px solid rgba(201,168,106,0.35); color: var(--gold); margin-top: 10px; }
.btn-ghost:hover { background: rgba(201,168,106,0.10); }

/* Cartel para el mozo (pantalla completa) */
.mozo-card {
  position: fixed; inset: 0; z-index: 95; background: var(--paper);
  color: #231a14; display: none; flex-direction: column;
  padding: 28px 24px calc(24px + env(safe-area-inset-bottom));
}
.mozo-card.open { display: flex; }
.mozo-card .mc-table { font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: #8B1C2B; font-weight: 800; margin-bottom: 4px; }
.mozo-card h2 { font-family: 'Fraunces', serif; font-size: 30px; margin: 0 0 14px; color: #5A1010; }
.mozo-card .mc-list { flex: 1; overflow-y: auto; }
.mozo-card .mc-item { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid rgba(90,16,16,0.15); font-size: 18px; }
.mozo-card .mc-item .q { color: #8B1C2B; font-weight: 800; }
.mozo-card .mc-total { display: flex; justify-content: space-between; font-size: 20px; font-weight: 800; padding-top: 14px; color: #5A1010; }
.mozo-card .mc-foot { margin-top: 18px; }
.mozo-card .mc-foot .btn-primary { background: linear-gradient(180deg, #8B1C2B, #6E1422); }

/* Valoración con estrellas */
.rating-intro { text-align: center; color: var(--bone); font-size: 14px; margin: 4px 0 16px; line-height: 1.5; }
.stars { display: flex; justify-content: center; gap: 8px; margin: 6px 0 4px; }
.star { font-size: 34px; line-height: 1; color: rgba(201,168,106,0.28); transition: transform 120ms ease, color 120ms ease; cursor: pointer; }
.star.on { color: var(--gold); }
.star:active { transform: scale(1.2); }
.rate-block { margin: 12px 0 6px; padding-bottom: 12px; border-bottom: 1px solid rgba(201,168,106,0.10); }
.rate-block:last-of-type { border-bottom: 0; }
.rate-label { text-align: center; color: var(--bone); font-size: 13.5px; margin-bottom: 8px; line-height: 1.4; }
.rate-cta { margin-top: 10px; display: flex; justify-content: center; }
.rate-cta[hidden] { display: none; }
.rate-cta .btn-ghost { width: auto; padding: 11px 18px; margin-top: 0; }

/* Modales centrados (mesa / salida) */
.modal-overlay {
  position: fixed; inset: 0; z-index: 100; background: rgba(8,5,4,0.7);
  display: none; align-items: center; justify-content: center; padding: 26px;
}
.modal-overlay.open { display: flex; }
/* Teclado abierto: subir el modal y achicar el sheet para que el campo se vea */
body.keyboard-open .modal-overlay { align-items: flex-start; padding-top: 16px; }
body.keyboard-open .sheet { max-height: calc(100dvh - var(--kb, 0px) - 14px); }
.modal-card {
  width: 100%; max-width: 340px; background: linear-gradient(180deg, #201712, #14100D);
  border: 1px solid rgba(201,168,106,0.25); border-radius: 20px; padding: 26px 22px;
  text-align: center; box-shadow: var(--shadow);
}
.modal-card h3 { font-family: 'Fraunces', serif; font-size: 21px; color: var(--paper); margin: 0 0 8px; }
.modal-card p { color: var(--bone-soft); font-size: 13.5px; margin: 0 0 18px; line-height: 1.5; }
.modal-actions { display: flex; gap: 10px; }
.modal-actions button { flex: 1; padding: 13px; border-radius: 12px; font-weight: 700; font-size: 13.5px; }
.modal-actions .stay { background: linear-gradient(180deg, var(--accent), var(--accent-dk)); color: var(--paper); }
.modal-actions .leave { background: transparent; border: 1px solid rgba(201,168,106,0.35); color: var(--bone); }


/* ===== Broche de oro: detalles de animación ===== */
/* Burbujas del chat entran suave */
.msg { animation: msgIn 280ms cubic-bezier(.2,.7,.2,1) both; }
@keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* La barra del pedido aparece con rebote */
.cart-bar.show { animation: cartPop 440ms cubic-bezier(.34,1.56,.64,1); }
@keyframes cartPop {
  0%   { opacity: 0; transform: translateX(-50%) translateY(20px) scale(.96); }
  60%  { transform: translateX(-50%) translateY(-5px) scale(1.02); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* Estrellas de valoración: pop al elegir */
.star.on { animation: starPop 360ms cubic-bezier(.34,1.56,.64,1); }
@keyframes starPop {
  0%   { transform: scale(.6) rotate(-12deg); }
  60%  { transform: scale(1.25) rotate(6deg); }
  100% { transform: scale(1) rotate(0); }
}
</style>
__CV_THEME_STYLE__
</head>
<body>
<script>window.CV_DEMO_MODE = __CV_DEMO_MODE__;</script>
__CV_CONFIG_SCRIPT__

<!-- ==================== SPLASH ==================== -->
<div id="splash">
  <div class="splash-main">
    <h1 class="splash-mark">__CV_NOMBRE__</h1>
    <div class="splash-rules">
      <span class="line"></span>
      <p class="splash-eyebrow">Carta viva</p>
      <span class="line"></span>
    </div>
    <div class="splash-orb">
      <div class="orb-wrap">
        <div class="orb-halo"></div>
        <div class="orb"></div>
      </div>
    </div>
    <button class="splash-cta" id="splashCta">Tocá para empezar</button>
    <div class="splash-demos" id="splashDemos" hidden>
      <button class="splash-cta demo" id="demoBasic">Demo Plan Básico</button>
      <button class="splash-cta demo premium" id="demoPremium">★ Demo Plan Premium</button>
    </div>
    <p class="splash-sub">Te atiende un <b>mozo virtual</b></p>
  </div>
  <div class="splash-legal">
    <span class="splash-legal-ic" aria-hidden="true">!</span>
    <span>Tu mozo virtual es una <b>guía informativa</b> y puede equivocarse. Ante cualquier
    <b>alergia, intolerancia o condición médica</b>, confirmá siempre con el personal del
    restaurante antes de pedir. La composición final de cada plato es responsabilidad del restaurante.</span>
  </div>
</div>

<!-- ==================== APP ==================== -->
<div id="app">

  <header class="topbar">
    <button class="menu-btn" id="menuBtn" type="button" aria-label="Ver todas las secciones del menú"><span class="mt-ic">☰</span>Menú</button>
    <div class="brand">
      __CV_NOMBRE__
      <small>Carta viva</small>
    </div>
    <div class="topbar-actions">
      <button class="table-chip" id="tableChip" aria-label="Tu número de mesa"><span class="tc-label">Mesa</span><b id="tableNum">—</b></button>
      <button class="chat-trigger" id="solChip" data-state="idle" aria-label="Escribile a tu mesera">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.38 8.38 0 01-9 8.4 8.5 8.5 0 01-3.4-.7L3 21l1.8-5.6a8.38 8.38 0 01-.7-3.4 8.5 8.5 0 018.4-9 8.38 8.38 0 019 8.5z"/></svg>
        <span class="ct-full">Escribile a tu mesera…</span>
        <span class="ct-short">Chat</span>
      </button>
    </div>
  </header>

  <nav class="carta-tabs" id="cartaTabs" aria-label="Secciones de la carta"></nav>

  <main class="carta-body" id="cartaBody"></main>
</div>

<!-- ==================== MENÚ DESPLEGABLE (índice de secciones) ==================== -->
<div class="menu-overlay" id="menuOverlay"></div>
<div class="menu-drop" id="menuDrop" role="menu" aria-label="Secciones del menú"></div>

<!-- ==================== HISTORIAL OVERLAY (se abre del chip) ==================== -->
<div class="history-overlay" id="historyOverlay"></div>
<aside class="history-panel" id="historyPanel" aria-hidden="true">
  <div class="history-handle"></div>
  <div class="history-head">
    <h3>Tu charla con la mesera</h3>
    <button class="history-close" id="historyClose" aria-label="Cerrar">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
    </button>
  </div>
  <div class="history-list" id="historyList"></div>
  <div class="dock panel-dock">
    <div class="dock-row">
      <textarea id="input" rows="1" placeholder="Escribí tu mensaje…" autocomplete="off"></textarea>
      <button class="icon-btn mic-btn" id="micBtn" aria-label="Hablar" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="9" y="3" width="6" height="11" rx="3"/>
          <path d="M5 11a7 7 0 0014 0M12 18v3"/>
        </svg>
      </button>
      <button class="icon-btn send-btn" id="sendBtn" aria-label="Enviar" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12l14-7-5 14-3-6-6-1z"/>
        </svg>
      </button>
    </div>
  </div>
</aside>

<!-- ORBE FLOTANTE — micrófono central -->
<div class="orb-float" id="orbFloat" data-state="idle" role="button" aria-label="Hablar con la mesera">
  <div class="orb-float-halo"></div>
  <div class="orb-float-ring"></div>
  <div class="orb-float-inner"></div>
  <span class="orb-float-label" id="orbLabel">Mantené apretado</span>
</div>

<div class="listening-overlay" id="listenOverlay">Escuchando…</div>
<div class="toast" id="toast"></div>

<!-- ==================== ACCIONES RÁPIDAS (flanquean el orbe) ==================== -->
<div class="quick-actions" id="quickActions">
  <div class="quick-col left">
    <button class="quick-chip" data-ask="¿Cuál es la especialidad de la casa?"><span class="qi">🔥</span>Especialidad de la casa</button>
    <button class="quick-chip" data-ask="¿Qué tenés para picar?"><span class="qi">🍢</span>¿Qué hay para picar?</button>
  </div>
  <div class="quick-col right">
    <button class="quick-chip" data-ask="Recomendame un vino"><span class="qi">🍷</span>Recomendame un vino</button>
    <button class="quick-chip" data-ask="¿Qué postre me recomendás?"><span class="qi">🍰</span>¿Qué postre va bien?</button>
  </div>
</div>

<!-- Botón flotante "Agregar al pedido" — sigue al spotlight mientras la mesera habla -->
<button class="add-float" id="addFloat" aria-label="Agregar al pedido"></button>

<!-- ==================== BARRA "VER MI PEDIDO" ==================== -->
<button class="cart-bar" id="cartBar" aria-label="Ver mi pedido">
  <span class="cart-count" id="cartCount">0</span>
  <span>Ver mi pedido</span>
  <span id="cartTotalBar"></span>
</button>

<!-- ==================== PANTALLA DE PEDIDO ==================== -->
<div class="sheet-overlay" id="orderOverlay"></div>
<section class="sheet" id="orderSheet" aria-hidden="true">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <h3>Tu pedido</h3>
    <button class="sheet-close" id="orderClose" aria-label="Cerrar">✕</button>
  </div>
  <div class="sheet-body">
    <div id="orderItems"></div>
    <div class="order-total"><span>Total estimado</span><b id="orderTotal">$0</b></div>
    <div class="order-tba" id="orderTba"></div>
    <div class="field">
      <label>Número de mesa</label>
      <input id="orderTable" inputmode="numeric" placeholder="Ej: 5" autocomplete="off">
    </div>
    <div class="order-note">📩 El pedido le llega directo al mozo. <b>(En la versión real se configura el número interno del restaurante — mozo, recepción o cocina.)</b></div>
  </div>
  <div class="sheet-foot">
    <button class="btn-primary" id="orderSend">Realizar pedido</button>
    <button class="btn-ghost" id="orderShow">Mostrar al mozo</button>
  </div>
</section>

<!-- ==================== CARTEL PARA EL MOZO ==================== -->
<div class="mozo-card" id="mozoCard">
  <div class="mc-table" id="mcTable"></div>
  <h2>Pedido</h2>
  <div class="mc-list" id="mcList"></div>
  <div class="mc-total"><span>Total estimado</span><span id="mcTotal">$0</span></div>
  <div class="mc-foot"><button class="btn-primary" id="mozoDone">Listo, pedido tomado</button></div>
</div>

<!-- ==================== VALORACIÓN ==================== -->
<div class="sheet-overlay" id="ratingOverlay"></div>
<section class="sheet" id="ratingSheet" aria-hidden="true">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <h3>¿Cómo te atendió?</h3>
    <button class="sheet-close" id="ratingClose" aria-label="Cerrar">✕</button>
  </div>
  <div class="sheet-body">
    <p class="rating-intro">Tu pedido ya está en camino 🎉<br>¿Nos dejás tu opinión? Tarda 10 segundos.</p>

    <div class="rate-block">
      <div class="rate-label">¿Cómo te atendió la mesera virtual?</div>
      <div class="stars" data-target="mesera">
        <span class="star" data-v="1">★</span><span class="star" data-v="2">★</span><span class="star" data-v="3">★</span><span class="star" data-v="4">★</span><span class="star" data-v="5">★</span>
      </div>
    </div>

    <div class="rate-block">
      <div class="rate-label">¿Y el restaurante? (la comida y la atención)</div>
      <div class="stars" data-target="restaurante">
        <span class="star" data-v="1">★</span><span class="star" data-v="2">★</span><span class="star" data-v="3">★</span><span class="star" data-v="4">★</span><span class="star" data-v="5">★</span>
      </div>
      <div class="rate-cta" id="ctaGoogle" hidden>
        <button class="btn-ghost" id="ctaGoogleBtn">⭐ Dejá tu reseña en Google</button>
      </div>
    </div>

    <div class="rate-block">
      <div class="rate-label">¿Y la experiencia digital de QuantumHive?</div>
      <div class="stars" data-target="quantumhive">
        <span class="star" data-v="1">★</span><span class="star" data-v="2">★</span><span class="star" data-v="3">★</span><span class="star" data-v="4">★</span><span class="star" data-v="5">★</span>
      </div>
      <div class="rate-cta" id="ctaQh" hidden>
        <button class="btn-ghost" id="ctaQhBtn">Seguí a QuantumHive</button>
      </div>
    </div>

    <div class="field">
      <label>¿Algo para mejorar? (opcional)</label>
      <input id="ratingComment" placeholder="Escribí tu comentario o queja" autocomplete="off">
    </div>
  </div>
  <div class="sheet-foot">
    <button class="btn-primary" id="ratingSend">Enviar</button>
  </div>
</section>

<!-- ==================== MODAL DE MESA ==================== -->
<div class="modal-overlay" id="tableModal">
  <div class="modal-card">
    <h3>¿En qué mesa estás?</h3>
    <p>Lo encontrás impreso arriba del QR, en tu mesa.</p>
    <div class="field"><input id="tableInput" inputmode="numeric" placeholder="Número de mesa" autocomplete="off"></div>
    <div class="modal-actions" style="margin-top:18px;">
      <button class="leave" id="tableCancel">Cancelar</button>
      <button class="stay" id="tableSave">Guardar</button>
    </div>
  </div>
</div>

<!-- ==================== MODAL DE SALIDA ==================== -->
<div class="modal-overlay" id="exitModal">
  <div class="modal-card">
    <h3>¿Seguro que querés salir?</h3>
    <p>Vas a cerrar la mesera virtual. Si tenés un pedido sin enviar, se va a perder.</p>
    <div class="modal-actions">
      <button class="stay" id="exitStay">Quedarme</button>
      <button class="leave" id="exitLeave">Salir</button>
    </div>
  </div>
</div>

<!-- ==================== MODAL CONFIRMAR (ej: agregar repetido) ==================== -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal-card">
    <h3 id="confirmTitle">¿Agregar otro?</h3>
    <p id="confirmText"></p>
    <div class="modal-actions">
      <button class="stay" id="confirmYes">Sí, agregar</button>
      <button class="leave" id="confirmNo">No</button>
    </div>
  </div>
</div>

<script>
// ============================================================
// State
// ============================================================
const state = {
  history: [],            // [{role, text}]
  menu: null,
  isStreaming: false,
  currentAudio: null,
  recorder: null, recChunks: [], recStream: null,
  micStream: null,  // stream persistente: se pide 1 vez y se reusa
  audioCtx: null,
  cancelToken: 0,         // se incrementa cada vez que arranca una conversación nueva
};

const $ = sel => document.querySelector(sel);

// ============================================================
// UI helpers
// ============================================================
// Nudge de inactividad: si nadie interactúa por un rato, el orbe recuerda que se puede hablar.
let _idleTimer = null;
function cvResetIdleHint() {
  const orb = $('#orbFloat');
  if (orb) orb.classList.remove('idle-hint');
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    const o = $('#orbFloat');
    const cartShown = $('#cartBar') && $('#cartBar').classList.contains('show');
    if (o && o.dataset.state === 'idle' && !state.isStreaming && !chatPanelOpen() && !cartShown) {
      o.classList.add('idle-hint');
    }
  }, 7000);
}

function setSolState(s) {
  $('#solChip').dataset.state = s;
  const orb = $('#orbFloat');
  if (orb) orb.dataset.state = s;
  const labels = {
    idle: '🎙 Mantené apretado para hablar',
    listening: 'Escuchando…',
    thinking: 'Pensando…',
    speaking: 'Tocá para detener',
  };
  const lbl = $('#orbLabel');
  if (lbl) lbl.textContent = labels[s] || 'Tocá para hablar';
  // el cartel "mantené apretado" solo aparece tras inactividad, no de entrada
  if (s === 'idle') { cvResetIdleHint(); }
  else { clearTimeout(_idleTimer); if (orb) orb.classList.remove('idle-hint'); }
  if (typeof toggleQuickActions === 'function') toggleQuickActions();
}

// Mensajes: viven en la lista de la ventana de chat (#historyList)
let _currentBotBubble = null;

function _list() { return $('#historyList'); }
// ¿el usuario está cerca del fondo? (si subió a leer, NO lo tiramos abajo)
function _nearBottom() {
  const l = _list();
  return l ? (l.scrollHeight - l.scrollTop - l.clientHeight) < 80 : true;
}
function _clearEmpty() {
  const e = _list().querySelector('.history-empty');
  if (e) e.remove();
}
function addUserBubble(text) {
  _clearEmpty();
  const el = document.createElement('div');
  el.className = 'msg user';
  el.textContent = text;
  _list().appendChild(el);
  _list().scrollTop = _list().scrollHeight;
}
function startBotBubble() {
  _clearEmpty();
  const el = document.createElement('div');
  el.className = 'msg bot';
  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = 'Mesera';
  const body = document.createElement('span');
  body.className = 'bbody';
  el.appendChild(who); el.appendChild(body);
  _list().appendChild(el);
  _list().scrollTop = _list().scrollHeight;
  _currentBotBubble = body;
  return body;
}
function updateBotBubble(text) {
  if (!_currentBotBubble) startBotBubble();
  const stick = _nearBottom();          // solo seguimos al fondo si ya estabas ahí
  _currentBotBubble.textContent = text;
  if (stick) _list().scrollTop = _list().scrollHeight;
}
function endBotBubble() { _currentBotBubble = null; }

// La carta es el escenario: ya NO hay banner de texto sobre la carta.
// El texto de la mesera vive en el historial; la guía visual es el spotlight.
function chatPanelOpen() { return $('#historyPanel').classList.contains('open'); }

function showToast(text, ms = 3000) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function fmtPrice(n) {
  if (n === null || n === undefined) return '';
  return '$' + n.toLocaleString('es-AR');
}

// ============================================================
// Splash → App
// ============================================================
async function enterApp(tier) {
  window.CV_TIER = tier || null;   // demo: "premium" | "basic" | null (server lo mapea a una voz)
  // Unlock audio en iOS
  try {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    const o = state.audioCtx.createOscillator();
    const g = state.audioCtx.createGain(); g.gain.value = 0;
    o.connect(g).connect(state.audioCtx.destination);
    o.start(); o.stop(state.audioCtx.currentTime + 0.01);
  } catch (e) {}

  // Pedir permiso de micrófono UNA sola vez acá (con el gesto del usuario).
  // Guardamos el stream y lo reusamos, así el navegador no vuelve a preguntar.
  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true }
    });
  } catch (e) {
    console.warn('Permiso de micrófono no concedido todavía:', e);
    state.micStream = null;
  }

  $('#splash').classList.add('gone');
  $('#app').classList.add('ready');

  // Armar la guarda de navegación: que "atrás" no expulse de la carta
  navInit();

  // Cargar menú + render
  await loadMenu();

  // Saludo de Sol con voz
  setTimeout(async () => {
    const greeting = state.menu?.assistant?.greeting || ('¡Bienvenidos a ' + ((window.CV_CONFIG && window.CV_CONFIG.nombre) || 'nuestra mesa') + '!');
    state.history.push({ role: 'model', text: greeting });
    setSolState('speaking');
    await playAudioForText(greeting, ++state.cancelToken);
    setSolState('idle');
    endBotBubble();
  }, 700);
}
$('#splashCta').addEventListener('click', () => enterApp(null));
// DEMO: dos botones que entran con un plan distinto (voz premium vs básica), solo si DEMO_MODE
if (window.CV_DEMO_MODE) {
  const _cta = $('#splashCta'); if (_cta) _cta.style.display = 'none';
  const _dz = $('#splashDemos'); if (_dz) _dz.hidden = false;
  const _dp = $('#demoPremium'); if (_dp) _dp.addEventListener('click', () => enterApp('premium'));
  const _db = $('#demoBasic'); if (_db) _db.addEventListener('click', () => enterApp('basic'));
}

// ============================================================
// Carga + render de la carta
// ============================================================
async function loadMenu() {
  try {
    const r = await fetch('/menu.json');
    state.menu = await r.json();
    renderCarta();
  } catch (e) {
    console.error('No se pudo cargar menu.json', e);
    showToast('No pude cargar la carta');
  }
}

function renderCarta() {
  if (!state.menu) return;
  const tabs = $('#cartaTabs');
  const body = $('#cartaBody');
  tabs.innerHTML = '';
  body.innerHTML = '';
  state.dishIndex = [];   // se repuebla abajo, para el autoguiado
  state.sections = [];    // para navegar la carta por categoría

  const sections = [];

  // Comida
  for (const s of (state.menu.menu || [])) {
    sections.push({ id: 'sec-' + s.id, title: s.name, items: s.items, note: null, group: 'Comida' });
  }
  // Bebidas
  for (const s of (state.menu.drinks || [])) {
    if (s.items) {
      sections.push({ id: 'sec-' + s.id, title: s.name, items: s.items, note: s.note, group: 'Bebidas' });
    }
    if (s.subcategories) {
      for (const sub of s.subcategories) {
        sections.push({
          id: 'sec-' + s.id + '-' + sub.id,
          title: sub.name + ' (' + s.name.replace('Vinos ', '') + ')',
          items: sub.items,
          note: null,
          group: 'Bebidas',
        });
      }
    }
  }

  // El botón "☰ Menú" ahora vive fijo en el header (#menuBtn); la barra de tabs
  // queda solo con las secciones que scrollean.
  sections.forEach((sec, idx) => {
    // tab
    const tab = document.createElement('button');
    tab.className = 'tab' + (idx === 0 ? ' active' : '');
    tab.textContent = sec.title;
    tab.dataset.target = sec.id;
    tab.onclick = () => {
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(sec.id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabs.appendChild(tab);

    // registrar la sección con sus alias (para navegar por categoría)
    const titleNorm = cvNorm(sec.title);
    let aliases = cvSig(titleNorm);
    for (const key in CV_CAT_ALIASES) {
      if (titleNorm.includes(key) || sec.id.includes(key)) aliases = aliases.concat(CV_CAT_ALIASES[key]);
    }
    state.sections.push({ id: sec.id, aliases: [...new Set(aliases)] });

    // sección
    const sectionEl = document.createElement('div');
    sectionEl.className = 'carta-section';
    sectionEl.id = sec.id;
    sectionEl.innerHTML = `<h2>${sec.title}</h2><div class="sep"></div>`;

    if (sec.note) {
      const n = document.createElement('div');
      n.className = 'note';
      n.textContent = sec.note;
      sectionEl.appendChild(n);
    }

    for (const it of sec.items) {
      const dish = document.createElement('div');
      dish.className = 'dish';
      const left = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = it.name;
      left.appendChild(name);
      if (it.description) {
        const d = document.createElement('div');
        d.className = 'desc';
        d.textContent = it.description;
        left.appendChild(d);
      }
      if (it.bodega) {
        const m = document.createElement('div');
        m.className = 'meta';
        m.textContent = it.bodega;
        left.appendChild(m);
      }
      dish.appendChild(left);

      const right = document.createElement('div');
      right.className = 'dish-right';
      let addBtnEl = null;

      if (typeof it.price === 'number') {
        // Precio único: precio + botón "+"
        const priceEl = document.createElement('div');
        priceEl.className = 'price';
        priceEl.textContent = fmtPrice(it.price);
        right.appendChild(priceEl);
        const itemId = sec.id + '|' + it.name;
        const ctl = makeAddControl(itemId, it.name, it.price);
        right.appendChild(ctl);
        addBtnEl = ctl.querySelector('.dish-add');
      } else if (it.price_copa != null || it.price_botella != null) {
        // Vinos/espumantes: una fila por variante (copa / botella), cada una con su "+"
        const variants = [];
        if (it.price_copa != null)    variants.push({ tag: 'Copa',    price: it.price_copa });
        if (it.price_botella != null) variants.push({ tag: 'Botella', price: it.price_botella });
        for (const v of variants) {
          const row = document.createElement('div');
          row.className = 'wine-row';
          const p = document.createElement('div');
          p.className = 'price';
          p.innerHTML = `${fmtPrice(v.price)}<small>${v.tag}</small>`;
          row.appendChild(p);
          const vid = sec.id + '|' + it.name + '|' + v.tag.toLowerCase();
          const vname = it.name + ' (' + v.tag.toLowerCase() + ')';
          const vctl = makeAddControl(vid, vname, v.price);
          row.appendChild(vctl);
          right.appendChild(row);
          if (!addBtnEl) addBtnEl = vctl.querySelector('.dish-add');   // para el hint del autoguiado
        }
      } else {
        // Sin precio: "a confirmar" (sin botón)
        const priceEl = document.createElement('div');
        priceEl.className = 'price';
        priceEl.innerHTML = '<span class="price-tba">a confirmar</span>';
        right.appendChild(priceEl);
      }

      dish.appendChild(right);
      sectionEl.appendChild(dish);

      // Índice para el autoguiado (la mesera resalta lo que nombra)
      const gid = sec.id + '|' + it.name;
      dish.dataset.gid = gid;
      const _dnorm = cvNorm(it.name);
      state.dishIndex.push({
        id: gid,
        el: dish,
        leftEl: left,
        addBtn: addBtnEl,
        name: it.name,
        price: (typeof it.price === 'number' ? it.price : null),
        price_copa: (it.price_copa != null ? it.price_copa : null),
        price_botella: (it.price_botella != null ? it.price_botella : null),
        isSide: /acompanam/.test(sec.id),   // guarnición suelta (papas, puré, etc.)
        norm: _dnorm,
        tokens: cvDishToks(_dnorm),
      });
    }

    body.appendChild(sectionEl);
  });

  buildMenuDrop(sections);   // poblar el desplegable "Menú" con todas las secciones

  // Reglas de la casa al final
  const rules = state.menu.rules || {};
  const houseEl = document.createElement('div');
  houseEl.className = 'house-rules';
  let rulesHtml = '<h3>La casa</h3><ul>';
  if (rules.sharing_surcharge?.note) rulesHtml += `<li>${rules.sharing_surcharge.note}</li>`;
  if (rules.bread) rulesHtml += `<li>${rules.bread}</li>`;
  if (rules.side_salad_addon?.note) rulesHtml += `<li>${rules.side_salad_addon.note}</li>`;
  if (rules.kids_menu?.note) rulesHtml += `<li>${rules.kids_menu.note}</li>`;
  if (rules.happy_hour?.note) rulesHtml += `<li>${rules.happy_hour.note}</li>`;
  if (rules.food_safety_note) rulesHtml += `<li>${rules.food_safety_note}</li>`;
  rulesHtml += '</ul>';
  houseEl.innerHTML = rulesHtml;
  body.appendChild(houseEl);

  // Scroll-spy: al navegar el menú, resaltar la sección actual y mover la barra
  let _lastSectionId = null;
  function updateActiveTab(){
    const line = body.getBoundingClientRect().top + 90;  // detección cerca del tope
    let currentId = null;
    body.querySelectorAll('.carta-section').forEach(s => {
      if (s.getBoundingClientRect().top <= line) currentId = s.id;
    });
    if (!currentId) { const first = body.querySelector('.carta-section'); currentId = first && first.id; }
    if (!currentId) return;
    if (currentId !== _lastSectionId) {
      _lastSectionId = currentId;
      // redisparar la animación SOLO en la sección a la que entrás
      const cur = document.getElementById(currentId);
      if (cur) {
        body.querySelectorAll('.carta-section.reveal').forEach(s => s.classList.remove('reveal'));
        void cur.offsetWidth;
        cur.classList.add('reveal');
      }
    }
    tabs.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.target === currentId;
      t.classList.toggle('active', on);
      if (on) {
        const left = t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2;
        tabs.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    });
  }
  body.addEventListener('scroll', updateActiveTab, { passive: true });
  body.addEventListener('scroll', cvResetIdleHint, { passive: true });
  state.updateActiveTab = updateActiveTab;   // para refrescar el tab activo tras un salto programático
  updateActiveTab();

  // Reflejar el carrito restaurado (localStorage) en los "+" y la barra
  if (typeof refreshCartUI === 'function') refreshCartUI();
}

// ============================================================
// Menú desplegable — índice de todas las secciones
// ============================================================
function buildMenuDrop(sections){
  const drop = $('#menuDrop');
  if (!drop) return;
  drop.innerHTML = '';
  let lastGroup = null;
  for (const sec of sections){
    if (sec.group !== lastGroup){
      lastGroup = sec.group;
      const h = document.createElement('div');
      h.className = 'menu-drop-group';
      h.textContent = (sec.group === 'Bebidas' ? '🍷 ' : '🍽 ') + sec.group;
      drop.appendChild(h);
    }
    const row = document.createElement('button');
    row.className = 'menu-drop-item'; row.type = 'button';
    row.dataset.target = sec.id;
    row.textContent = sec.title;
    row.onclick = () => { closeMenuDrop(); cvScrollToSection(sec.id); };
    drop.appendChild(row);
  }
}
function openMenuDrop(){
  const drop = $('#menuDrop'); if (!drop) return;
  const tabsEl = $('#cartaTabs');
  if (tabsEl) drop.style.top = Math.round(tabsEl.getBoundingClientRect().bottom + 6) + 'px';
  // marcar la sección actual (según el tab activo)
  const cur = $('#cartaTabs .tab.active');
  const curId = cur && cur.dataset.target;
  drop.querySelectorAll('.menu-drop-item').forEach(it => it.classList.toggle('active', it.dataset.target === curId));
  drop.scrollTop = 0;   // abrir siempre desde el tope (Comida primero)
  drop.classList.add('open');
  const ov = $('#menuOverlay'); if (ov) ov.classList.add('open');
  const btn = $('#menuBtn'); if (btn) btn.classList.add('open');
}
function closeMenuDrop(){
  const drop = $('#menuDrop'); if (drop) drop.classList.remove('open');
  const ov = $('#menuOverlay'); if (ov) ov.classList.remove('open');
  const btn = $('#menuBtn'); if (btn) btn.classList.remove('open');
}
function toggleMenuDrop(){
  const drop = $('#menuDrop');
  (drop && drop.classList.contains('open')) ? closeMenuDrop() : openMenuDrop();
}

// ============================================================
// Chip Sol → abre historial
// ============================================================
$('#solChip').addEventListener('click', () => {
  openHistory(true);  // abre la ventana de chat y enfoca el input
});

function openChatDom(focusInput) {
  renderHistory();
  $('#historyOverlay').classList.add('open');
  $('#historyPanel').classList.add('open');
  $('#historyPanel').setAttribute('aria-hidden', 'false');
  if (focusInput) setTimeout(() => { try { input.focus(); } catch(e){} }, 420);
}
function closeChatDom() {
  $('#historyOverlay').classList.remove('open');
  $('#historyPanel').classList.remove('open');
  $('#historyPanel').setAttribute('aria-hidden', 'true');
}
// Integradas con la pila de navegación (que "atrás" cierre el chat, no la página)
function openHistory(focusInput) { navOpen('chat', () => openChatDom(focusInput)); }
function closeHistory() { navCloseUI('chat'); }
$('#historyClose').onclick = closeHistory;
$('#historyOverlay').onclick = closeHistory;

function renderHistory() {
  _currentBotBubble = null;
  const list = $('#historyList');
  list.innerHTML = '';
  if (!state.history.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Todavía no chateaste con tu mesera virtual. Preguntale lo que quieras: sugerencias, maridajes, postres...';
    list.appendChild(empty);
    return;
  }
  for (const turn of state.history) {
    const el = document.createElement('div');
    el.className = 'msg ' + (turn.role === 'user' ? 'user' : 'bot');
    if (turn.role !== 'user') {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = 'Mesera';
      el.appendChild(who);
    }
    const body = document.createElement('span');
    body.textContent = turn.text;
    el.appendChild(body);
    list.appendChild(el);
  }
  // scroll al final
  setTimeout(() => list.scrollTop = list.scrollHeight, 50);
}


// ============================================================
// Input + send
// ============================================================
const input = $('#input');
const sendBtn = $('#sendBtn');
const micBtn = $('#micBtn');

input.addEventListener('input', () => {
  input.style.height = '22px';
  input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  sendBtn.disabled = !input.value.trim();
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.onclick = sendMessage;

async function sendMessage() {
  const text = input.value.trim();
  if (!text || state.isStreaming) return;
  input.value = '';
  input.style.height = '22px';
  sendBtn.disabled = true;
  await converse(text, /*withVoice=*/false);
}

// ============================================================
// CONVERSACIÓN
//   withVoice=true  → respuesta por TTS además de texto
//   withVoice=false → solo texto (banner + historial)
// ============================================================
// ============================================================
// Autoguiado — la mesera resalta y te lleva a lo que va nombrando
// ============================================================
const CV_STOP = new Set([
  'que','los','las','una','uno','con','del','por','sus','mas','muy','dos','para','pero',
  'como','tipo','plato','salsa','estilo','nuestro','nuestra','casero','casera','servido',
  'servida','fresco','fresca','grande','chico','sobre','entre','este','esta','unos','unas'
]);
// Alias de categoría → para navegar la carta cuando la mesera habla de un rubro
const CV_CAT_ALIASES = {
  bebida:   ['bebida','gaseosa','refresco','agua'],
  cerveza:  ['cerveza','birra'],
  champagne:['champagne','champan','espumante','espumoso'],
  vino:     ['vino','tinto','blanco','malbec','cabernet','syrah'],
  postre:   ['postre'],   // OJO: nada de 'dulce' acá — choca con "vino dulce" y manda mal a Postres
  entrada:  ['entrada','picar','picada','fiambre'],
  ensalada: ['ensalada'],
  hamburg:  ['hamburguesa','burger'],
  pizz:     ['pizza','pizzeta'],
};
// Palabras genéricas/ingredientes: si el ÚNICO token fuerte de un plato es una de estas, NO se
// enciende por la palabra suelta (ej. "Té Helado" no se prende ante "...con helado de vainilla").
// Para esos platos se exige el nombre COMPLETO como frase.
const CV_AMBIG = new Set([
  'helado','cafe','agua','leche','crema','pan','arroz','papa','papas','pure',
  'pollo','carne','queso','jamon','huevo','huevos','salsa','tomate','lechuga',
  'cebolla','morron','dulce','fruta','verdura','sopa','fideos','milanesa'
]);
// Atajos por defecto (cuando la mesera no propone sugerencias propias).
// Salen de CARTA_CONFIG.chips (inyectado en window.CV_CONFIG); fallback al set de abajo.
const CV_DEFAULT_CHIPS = (window.CV_CONFIG && Array.isArray(window.CV_CONFIG.chips) && window.CV_CONFIG.chips.length)
  ? window.CV_CONFIG.chips
  : [
  { icon: '🔥', text: '¿Cuál es la especialidad de la casa?', label: 'Especialidad de la casa' },
  { icon: '🍢', text: '¿Qué tenés para picar?', label: '¿Qué hay para picar?' },
  { icon: '🍷', text: 'Recomendame un vino', label: 'Recomendame un vino' },
  { icon: '🍰', text: '¿Qué postre me recomendás?', label: '¿Qué postre va bien?' },
];
function cvNorm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // saca acentos (ñ→n)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
// tokens "fuertes" de un texto normalizado (descarta conectores, genéricas y cantidades)
function cvSig(norm) {
  return norm.split(' ').filter(w => w.length >= 3 && !CV_STOP.has(w) && !/\d/.test(w));
}
function cvDishToks(norm) {
  const t = cvSig(norm);
  return t.length ? t : norm.split(' ').filter(Boolean);   // si quedó vacío, usar el nombre entero
}
// ---------- Detección de platos nombrados (con posición) ----------
// Devuelve el índice del primer match contiguo de D dentro de R, o -1 (tolera plural).
function cvTokSeqMatch(R, D) {
  if (!D.length || D.length > R.length) return -1;
  for (let i = 0; i + D.length <= R.length; i++) {
    let ok = true;
    for (let j = 0; j < D.length; j++) {
      const a = R[i + j], b = D[j];
      if (a !== b && a !== b + 's' && b !== a + 's') { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}
// Platos nombrados en `text`, ordenados por aparición, con fracción de posición (0..1).
function cvDishesIn(text) {
  if (!state.dishIndex || !state.dishIndex.length) return [];
  const norm = cvNorm(text);
  if (!norm.length) return [];
  const toks = [], re = /[a-z0-9]+/g; let mm;
  while ((mm = re.exec(norm))) {
    if (mm[0].length >= 3 && !CV_STOP.has(mm[0]) && !/\d/.test(mm[0])) toks.push({ w: mm[0], pos: mm.index });
  }
  const R = toks.map(t => t.w);
  const padded = ' ' + norm + ' ';
  const hits = [];
  for (const d of state.dishIndex) {
    // Baja confianza: nombre que se reduce a UN token genérico → exigir el nombre completo como
    // frase (así "Té Helado" no se enciende por cualquier "helado" dicho al pasar).
    if (d.tokens.length <= 1 && (!d.tokens.length || CV_AMBIG.has(d.tokens[0]))) {
      const idx = padded.indexOf(' ' + d.norm + ' ');
      if (idx >= 0) hits.push({ entry: d, pos: idx });
      continue;
    }
    const i = cvTokSeqMatch(R, d.tokens);
    if (i >= 0) hits.push({ entry: d, pos: toks[i].pos });
  }
  // supresión: un nombre corto contenido en uno más largo también nombrado
  let kept = hits.filter(h => !hits.some(o => o !== h && o.entry.norm.length > h.entry.norm.length && o.entry.norm.includes(h.entry.norm)));
  // si hay un plato principal nombrado, NO encender las guarniciones (papas/ensalada ya vienen incluidas)
  if (kept.some(h => !h.entry.isSide)) kept = kept.filter(h => !h.entry.isSide);
  kept.sort((a, b) => a.pos - b.pos);
  const L = Math.max(1, norm.length);
  return kept.map(h => ({ entry: h.entry, frac: h.pos / L }));
}
// Categoría/sección nombrada en `text` (cuando no hay un plato puntual).
// Navega SOLO si hay UNA categoría clara: si la frase pisa 0 o varias secciones (ambiguo,
// ej. "vino tinto, blanco o dulce"), no me muevo — quedarse quieto > saltar mal.
function cvCategoryIn(text) {
  if (!state.sections) return null;
  const n = ' ' + cvNorm(text) + ' ';
  const matched = new Set();
  for (const s of state.sections) {
    for (const a of s.aliases) {
      if (a.length < 3) continue;
      if (n.indexOf(' ' + a) >= 0) { matched.add(s.id); break; }   // palabra entera o plural
    }
  }
  return matched.size === 1 ? [...matched][0] : null;
}
function cvScrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const body = document.getElementById('cartaBody');
  if (body) {
    // posición exacta del top de la sección dentro del contenedor que scrollea
    const top = body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 4;
    body.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    body.querySelectorAll('.carta-section.reveal').forEach(s => s.classList.remove('reveal'));
    if (state.updateActiveTab) state.updateActiveTab();   // refrescar el tab activo / scroll-spy
  } else {
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
  void el.offsetWidth; el.classList.add('reveal');
}

// ---------- Spotlight: un solo plato encendido, sigue la voz ----------
function cvClearSpotTimers() {
  if (state.spotTimers) state.spotTimers.forEach(t => clearTimeout(t));
  state.spotTimers = [];
}
function cvSpotlightClear() {
  if (state.dishIndex) for (const d of state.dishIndex) d.el.classList.remove('guided', 'spotlight-current');
  state.spotlightEntry = null;
  cvClearSpotTimers();
  cvUpdateAddFloat(null);
}
// ACUMULA: cada plato nombrado queda resaltado. Solo el actual pulsa y es seguido.
function cvSpotlight(entry) {
  if (!entry || entry === state.spotlightEntry) return;
  if (state.spotlightEntry) state.spotlightEntry.el.classList.remove('spotlight-current');
  state.spotlightEntry = entry;
  entry.el.classList.add('guided');           // resaltado persistente (no se apaga)
  entry.el.classList.add('spotlight-current'); // marca del que está nombrando ahora
  try { entry.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
  cvUpdateAddFloat(entry);
}
// Fin del turno: corta el pulso del actual y oculta el botón, pero deja todo resaltado.
function cvSpotlightSettle() {
  if (state.spotlightEntry) state.spotlightEntry.el.classList.remove('spotlight-current');
  cvUpdateAddFloat(null);
}
// Programa el spotlight de una frase: cada plato en su fracción del audio.
function cvScheduleSpotlight(dishes, cat, totalMs, token) {
  cvClearSpotTimers();
  if ((!dishes || !dishes.length) && cat) {
    if (token === state.cancelToken) cvScrollToSection(cat);
    return;
  }
  if (!dishes || !dishes.length) return;
  dishes.forEach((h, idx) => {
    let delay;
    if (totalMs > 0) delay = Math.max(0, Math.min(totalMs - 150, (h.frac != null ? h.frac : idx / dishes.length) * totalMs));
    else delay = idx * 1100;
    state.spotTimers.push(setTimeout(() => { if (token === state.cancelToken) cvSpotlight(h.entry); }, delay));
  });
}
// Botón flotante "Agregar al pedido" que sigue al spotlight (solo platos de precio único)
function cvUpdateAddFloat(entry) {
  const btn = $('#addFloat');
  if (!btn) return;
  if (entry && entry.price != null) {
    btn.textContent = 'Agregar al pedido · ' + entry.name;
    btn._entry = entry;
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
    btn._entry = null;
  }
}

// ============================================================
// Pedido por voz — la mesera carga/saca/arma el pedido a pedido del cliente
// Emite una línea técnica invisible:  #PEDIDO# {"add":[...],"remove":[...],"clear":false}
// ============================================================
const CV_DIR = '#PEDIDO#';
const CV_CHIPS = '#CHIPS#';
const CV_SENTINELS = [CV_DIR, CV_CHIPS];
// saca las directivas técnicas (y un prefijo parcial al final) del texto hablado/visible
function cvStripDirective(t) {
  let cut = t.length;
  for (const s of CV_SENTINELS) { const i = t.indexOf(s); if (i >= 0 && i < cut) cut = i; }
  if (cut < t.length) return t.slice(0, cut);
  for (const s of CV_SENTINELS) {     // evita "hablar" un #PED o #CH a medio llegar
    for (let k = s.length - 1; k > 0; k--) {
      if (t.endsWith(s.slice(0, k))) return t.slice(0, t.length - k);
    }
  }
  return t;
}
// Sugerencias de seguimiento que propone la mesera:  #CHIPS# ["...","..."]
function cvParseChips(raw) {
  const i = raw.indexOf(CV_CHIPS);
  if (i < 0) return null;
  const m = raw.slice(i + CV_CHIPS.length).match(/\[[\s\S]*?\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (Array.isArray(arr)) return arr.filter(x => typeof x === 'string' && x.trim()).slice(0, 4);
  } catch (e) {}
  return null;
}
// Render de los atajos: por defecto, o las sugerencias contextuales de la mesera
function cvSetChips(arr) {
  const left = document.querySelector('#quickActions .quick-col.left');
  const right = document.querySelector('#quickActions .quick-col.right');
  if (!left || !right) return;
  left.innerHTML = ''; right.innerHTML = '';
  const useDefault = !arr || !arr.length;
  // ¿Son chips de contexto (sugerencias/acciones de la mesera) o los 4 por defecto?
  // Si son de contexto, NO se ocultan aunque la mesera esté hablando (hay que poder tocarlos).
  state.hasContextChips = !useDefault;
  document.body.classList.toggle('has-ctx-chips', !useDefault);   // CSS: visibles en el chat si son de contexto
  // Si ofrece 2+ opciones y ninguna es ya un "otra/más opciones", sumamos un chip "Más opciones"
  // para que el cliente pida otra ronda sin tipear.
  let ctx = useDefault ? null : arr.slice(0, 4);
  if (ctx && ctx.length >= 2 && !ctx.some(c => /opci[oó]n/i.test(String(c)))) {
    ctx = ctx.slice(0, 3); ctx.push('Más opciones');
  }
  const items = useDefault ? CV_DEFAULT_CHIPS : ctx;
  items.forEach((it, i) => {
    const ask = useDefault ? it.text : it;
    const label = useDefault ? it.label : it;
    const icon = useDefault ? it.icon : '💬';
    const b = document.createElement('button');
    b.className = 'quick-chip';
    b.dataset.ask = ask;
    b.innerHTML = '<span class="qi">' + icon + '</span>' + label;
    b.addEventListener('click', () => quickAsk(ask));
    (i < Math.ceil(items.length / 2) ? left : right).appendChild(b);
  });
  if (typeof toggleQuickActions === 'function') toggleQuickActions();   // aplicar visibilidad ya
}
// resuelve {name, variant} contra la carta real → línea de carrito {id,name,price,el} o null
function cvResolveOrderItem(name, variant) {
  const q = cvNorm(name);
  if (!q || !state.dishIndex) return null;
  const qt = cvSig(q);
  const find = (pool) => {
    let hit = pool.find(d => d.norm === q);                          // exacto
    if (hit) return hit;
    hit = pool.find(d => d.norm.includes(q) || q.includes(d.norm));  // uno contiene al otro
    if (hit) return hit;
    return pool.find(d => cvTokSeqMatch(qt, d.tokens) >= 0) || null;  // tokens contiguos
  };
  // 1) precio único (sumable directo)
  let d = find(state.dishIndex.filter(x => x.price != null));
  if (d) return { id: d.id, name: d.name, price: d.price, el: d.el };
  // 2) vino/espumante (requiere variante copa/botella)
  d = find(state.dishIndex.filter(x => x.price_copa != null || x.price_botella != null));
  if (!d) return null;
  const v = (variant || '').toLowerCase();
  let price = null, tag = null;
  if (v.indexOf('cop') >= 0 && d.price_copa != null) { price = d.price_copa; tag = 'copa'; }
  else if (v.indexOf('bot') >= 0 && d.price_botella != null) { price = d.price_botella; tag = 'botella'; }
  if (price == null) return null;   // sin variante válida → no agrega (la mesera repregunta)
  return { id: d.id + '|' + tag, name: d.name + ' (' + tag + ')', price, el: d.el };
}
function cvCartAdd(entry, qty) {
  qty = Math.max(1, qty | 0 || 1);
  const ex = findCart(entry.id);
  if (ex) ex.qty += qty;
  else state.cart.push({ id: entry.id, name: entry.name, price: entry.price, qty });
}
function cvCartRemove(entry, qty) {
  const it = findCart(entry.id);
  if (!it) return;
  if (qty && qty > 0) { it.qty -= qty; if (it.qty <= 0) state.cart = state.cart.filter(x => x.id !== it.id); }
  else state.cart = state.cart.filter(x => x.id !== it.id);   // sin qty = sacar todo
}
// aplica la directiva del modelo al carrito real. Devuelve {changed, added:[], lastEl}
function cvApplyOrderDirective(raw) {
  const res = { changed: false, added: [], lastEl: null };
  const i = raw.indexOf(CV_DIR);
  if (i < 0) return res;
  const m = raw.slice(i + CV_DIR.length).match(/\{[\s\S]*\}/);
  if (!m) return res;
  let obj;
  try { obj = JSON.parse(m[0]); } catch (e) { return res; }
  if (obj.clear && state.cart.length) { state.cart = []; res.changed = true; }
  for (const r of (obj.remove || [])) {
    const nm = typeof r === 'string' ? r : (r && r.name);
    if (!nm) continue;
    const variant = (typeof r === 'object' && r.variant) ? r.variant : '';
    const e = cvResolveOrderItem(nm, variant);
    if (e && findCart(e.id)) { cvCartRemove(e, typeof r === 'object' ? r.qty : 0); res.changed = true; }
  }
  for (const a of (obj.add || [])) {
    const nm = typeof a === 'string' ? a : (a && a.name);
    if (!nm) continue;
    const qty = (typeof a === 'object' && a.qty) ? a.qty : 1;
    const variant = (typeof a === 'object' && a.variant) ? a.variant : '';
    const e = cvResolveOrderItem(nm, variant);
    if (e) { cvCartAdd(e, qty); res.added.push(qty > 1 ? (qty + '× ' + e.name) : e.name); res.lastEl = e.el; res.changed = true; }
  }
  if (res.changed) {
    saveCart();
    refreshCartUI();
    if (typeof renderOrderItems === 'function') renderOrderItems();
  }
  if (res.added.length) showToast('Agregado al pedido: ' + res.added.join(', '));
  if (res.lastEl) { try { res.lastEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }
  return res;
}

async function converse(userText, withVoice) {
  if (!userText) return;
  state.isStreaming = true;

  // cancelar cualquier audio que esté reproduciéndose
  const myToken = ++state.cancelToken;
  stopCurrentAudio();

  // Spotlight: arrancar limpio + atajos por defecto mientras responde
  cvSpotlightClear();
  cvSetChips(null);

  // registrar turn del usuario + mostrar su burbuja
  state.history.push({ role: 'user', text: userText });
  addUserBubble(userText);

  setSolState('thinking');
  startBotBubble();
  updateBotBubble('…');

  let fullReply = '';
  let sentenceBuffer = '';
  let spokenLen = 0;          // cuánto del texto VISIBLE ya pasó a TTS (sin la directiva)
  const ttsQueue = [];
  let producerDone = false;

  // Consumer de audio (solo si withVoice). Cada item lleva los platos de su frase,
  // y el spotlight se programa cuando ESA frase empieza a sonar.
  const playerPromise = withVoice ? (async () => {
    let i = 0;
    while (true) {
      if (myToken !== state.cancelToken) break; // cancelado por nuevo turn
      if (i >= ttsQueue.length) {
        if (producerDone) break;
        await sleep(60); continue;
      }
      const item = ttsQueue[i++];
      try {
        const url = await item.audio;
        if (myToken !== state.cancelToken || !url) {
          if (typeof url === 'string') URL.revokeObjectURL(url);
          continue;
        }
        await playAudioUrl(url, myToken, item);
      } catch (e) { /* sigue */ }
    }
  })() : Promise.resolve();

  // Corta el buffer en frases y encola (con sus platos). En modo texto, sin audio,
  // resalta el plato de la frase al toque.
  function enqueueSentence(s) {
    const dishes = cvDishesIn(s);
    const cat = dishes.length ? null : cvCategoryIn(s);
    if (withVoice) {
      ttsQueue.push({ audio: synthesize(s), dishes, cat });
    } else {
      if (dishes.length) cvSpotlight(dishes[dishes.length - 1].entry);
      else if (cat) cvScrollToSection(cat);
    }
  }
  function flushSentences(force) {
    let m;
    while ((m = sentenceBuffer.match(/^[\s\S]*?[.!?…]+(\s|$)/))) {
      const s = m[0].trim();
      if (s) enqueueSentence(s);
      sentenceBuffer = sentenceBuffer.slice(m[0].length);
    }
    if (force && sentenceBuffer.trim()) { enqueueSentence(sentenceBuffer.trim()); sentenceBuffer = ''; }
  }

  try {
    const resp = await fetch('/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: state.history.slice(0, -1),
        cart: state.cart.map(i => ({ name: i.name, qty: i.qty })),   // lo que ya está en el pedido
      })
    });
    if (!resp.ok) throw new Error('Server ' + resp.status);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let firstChunk = true;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (myToken !== state.cancelToken) { try { reader.cancel(); } catch(e){} break; }
      buf += decoder.decode(value, { stream: true });

      let evtIdx;
      while ((evtIdx = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, evtIdx);
        buf = buf.slice(evtIdx + 2);
        let event = 'message', data = '';
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;

        if (event === 'chunk') {
          try {
            const obj = JSON.parse(data);
            const piece = obj.text || '';
            if (piece) {
              fullReply += piece;
              if (firstChunk) {
                firstChunk = false;
                setSolState(withVoice ? 'speaking' : 'idle');
              }
              // separar lo VISIBLE/hablado de las directivas técnicas (pedido / chips)
              const visible = cvStripDirective(fullReply);
              const added = visible.slice(spokenLen);
              if (added) { sentenceBuffer += added; spokenLen = visible.length; }
              updateBotBubble(visible);   // historial vivo (sin banner sobre la carta)
              flushSentences(false);
            }
          } catch(e) {}
        } else if (event === 'error') {
          showToast('Sol no pudo contestar — revisá /health');
        }
      }
    }
    flushSentences(true);
  } catch (e) {
    console.error(e);
    showToast('No pude conectar. ¿Las claves del Space están bien?');
  }

  producerDone = true;
  const finalVisible = cvStripDirective(fullReply).trim();
  const order = cvApplyOrderDirective(fullReply);   // aplicar add/remove/clear al carrito real
  let chips = cvParseChips(fullReply);              // sugerencias que propone la mesera
  // FALLBACK del lado del cliente: si el modelo NO emitió #CHIPS# pero recomendó platos, sintetizar
  // botones para que SIEMPRE haya algo para tocar (no depender de que el modelo se acuerde).
  if (!chips || !chips.length) {
    const named = cvDishesIn(finalVisible);
    if (named.length >= 2)       chips = named.slice(0, 3).map(h => h.entry.name);
    else if (named.length === 1) chips = ['Sí, agregalo', 'Otra opción'];
  }

  // si solo vino la orden sin texto hablado, dejar una confirmación mínima
  let toStore = finalVisible;
  if (!toStore && order.changed) {
    toStore = '¡Listo, te actualicé el pedido!';
    updateBotBubble(toStore);
  }
  if (toStore) {
    state.history.push({ role: 'model', text: toStore });
    if (state.history.length > 8) state.history = state.history.slice(-8);
  }

  // Mostrar los chips YA (no esperar a que termine de hablar). Con state.hasContextChips, quedan
  // visibles mientras la mesera habla, así el cliente puede tocar "¿cuál te tienta?" en el momento.
  cvSetChips(chips);

  if (withVoice) {
    await playerPromise;
  }

  state.isStreaming = false;
  setSolState('idle');
  endBotBubble();
  cvSpotlightSettle();      // corta el pulso y oculta el botón; deja todo lo nombrado resaltado
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// TTS
// ============================================================
async function synthesize(text) {
  try {
    const r = await fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!r.ok) {
      console.warn('TTS', r.status);
      return { speak: text };   // el server no pudo → que hable el navegador del celu
    }
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      // motor "browser" (o fallback): la voz la pone el navegador del cliente
      const j = await r.json();
      return { speak: (j && j.text) ? j.text : text };
    }
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('TTS err', e);
    return { speak: text };   // sin red / error → fallback al navegador
  }
}

// ---- Voz del NAVEGADOR (motor "browser": instantánea, corre en el celular) ----
let _cvVoice = undefined;
function cvPickVoice() {
  if (_cvVoice !== undefined) return _cvVoice;
  const ss = window.speechSynthesis;
  const vs = ss ? ss.getVoices() : [];
  if (!vs || !vs.length) return null;   // todavía no cargaron las voces
  const pref = ['es-ar', 'es-419', 'es-mx', 'es-us', 'es-es', 'es'];
  for (const p of pref) {
    const v = vs.find(x => (x.lang || '').toLowerCase().startsWith(p));
    if (v) { _cvVoice = v; return v; }
  }
  _cvVoice = vs.find(x => (x.lang || '').toLowerCase().startsWith('es')) || null;
  return _cvVoice;
}
if (window.speechSynthesis) {
  try { window.speechSynthesis.getVoices(); } catch (e) {}
  window.speechSynthesis.onvoiceschanged = () => { _cvVoice = undefined; };
}
// iOS exige un gesto para "desbloquear" la voz: disparamos una vacía en el 1er toque.
let _ttsUnlocked = false;
function cvUnlockSpeech() {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
    if (!_ttsUnlocked) {
      _ttsUnlocked = true;
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(' '));  // "despierta" la voz en el gesto
    }
  } catch (e) {}
}
// desbloqueo en cada toque (iOS necesita el gesto cerca del habla; no usamos {once})
document.addEventListener('pointerdown', cvUnlockSpeech);

function speakBrowser(text, myToken, item) {
  return new Promise((resolve) => {
    const ss = window.speechSynthesis;
    if (!ss || myToken !== state.cancelToken || !text) { resolve(); return; }
    let settled = false, watch = 0;
    const finish = () => {
      if (settled) return; settled = true;
      if (watch) clearInterval(watch);
      if (state.currentSpeech) state.currentSpeech = null;
      resolve();
    };
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = cvPickVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || 'es-AR';
      u.rate = 1.05; u.pitch = 1.0;
      state.currentSpeech = u;
      // spotlight: estimamos la duración por largo del texto (~14 caracteres/seg)
      if (item) cvScheduleSpotlight(item.dishes, item.cat, Math.max(800, Math.round(text.length / 14 * 1000)), myToken);
      u.onend = finish; u.onerror = finish;
      try { ss.resume(); } catch (e) {}   // Chrome Android a veces queda "pausado"
      ss.speak(u);
      // watchdog: si cancelan el turno (o no dispara onend), no colgamos la cola TTS
      watch = setInterval(() => { if (myToken !== state.cancelToken) finish(); }, 250);
    } catch (e) { finish(); }
  });
}

async function playAudioUrl(url, myToken, item) {
  // motor "browser": no hay archivo de audio, la voz la pone el dispositivo
  if (url && typeof url === 'object' && url.speak !== undefined) {
    return speakBrowser(url.speak, myToken, item);
  }
  return new Promise((resolve) => {
    if (myToken !== state.cancelToken) { URL.revokeObjectURL(url); resolve(); return; }
    const a = new Audio(url);
    state.currentAudio = a;
    let settled = false, scheduled = false;
    // cuando ESTA frase empieza a sonar, programar el spotlight de sus platos
    const schedule = () => {
      if (scheduled || !item) return; scheduled = true;
      const dur = (isFinite(a.duration) && a.duration > 0) ? a.duration * 1000 : 0;
      cvScheduleSpotlight(item.dishes, item.cat, dur, myToken);
    };
    const finish = () => {
      if (settled) return; settled = true;
      try { URL.revokeObjectURL(url); } catch(e) {}
      if (state.currentAudio === a) state.currentAudio = null;
      resolve();
    };
    a.onended = finish;
    a.onerror = finish;
    // Cuando "Detener" pausa el audio (stopCurrentAudio), resolvemos para no colgar la cola TTS.
    a.onpause = () => { if (state.currentAudio !== a) finish(); };
    a.onloadedmetadata = schedule;
    a.play().then(schedule).catch(() => finish());
  });
}

async function playAudioForText(text, myToken) {
  const url = await synthesize(text);
  if (url && myToken === state.cancelToken) await playAudioUrl(url, myToken);
}

function stopCurrentAudio() {
  if (state.currentAudio) {
    try { state.currentAudio.pause(); } catch(e) {}
    state.currentAudio = null;
  }
  if (state.currentSpeech) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
    state.currentSpeech = null;
  }
}

// ============================================================
// MIC — el botón mic Y el chip Sol disparan grabación
//   - tap en mic: graba (toggle)
//   - tap en chip Sol: si está grabando, para; si no, abre historial
// ============================================================
// Orbe flotante → MANTENER APRETADO para grabar, SOLTAR para enviar
const orbFloat = $('#orbFloat');
if (orbFloat) {
  let holding = false;

  const beginHold = async (e) => {
    e.preventDefault();
    // Si la mesera está hablando, un toque la DETIENE (no graba).
    if (orbFloat.dataset.state === 'speaking') { stopSpeaking(); return; }
    if (holding || state.isStreaming) return;
    holding = true;
    orbFloat.classList.add('holding');
    await startRecording();
  };
  const endHold = (e) => {
    if (!holding) return;
    e.preventDefault();
    holding = false;
    orbFloat.classList.remove('holding');
    stopRecording();  // al soltar, se envía el audio
  };

  // Touch (celular)
  orbFloat.addEventListener('touchstart', beginHold, { passive: false });
  orbFloat.addEventListener('touchend', endHold);
  orbFloat.addEventListener('touchcancel', endHold);
  // Mouse (escritorio)
  orbFloat.addEventListener('mousedown', beginHold);
  orbFloat.addEventListener('mouseup', endHold);
  orbFloat.addEventListener('mouseleave', endHold);
}

micBtn.addEventListener('click', async () => {
  if (state.recorder) {
    stopRecording();
  } else {
    await startRecording();
  }
});

async function startRecording() {
  // Si Sol está hablando, interrumpila
  stopCurrentAudio();
  state.cancelToken++;

  try {
    // Reusar el stream que ya pedimos al inicio (no vuelve a preguntar permiso)
    let stream = state.micStream;
    if (!stream || !stream.active) {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      state.micStream = stream;
    }
    state.recStream = stream;

    let mime = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mime)) {
        mime = 'audio/mp4';
      }
    }
    state.recorder = new MediaRecorder(stream, { mimeType: mime });
    state.recChunks = [];

    state.recorder.ondataavailable = e => { if (e.data && e.data.size) state.recChunks.push(e.data); };
    state.recorder.onstop = onRecorderStop;

    state.recorder.start();
    micBtn.classList.add('recording');
    setSolState('listening');
    $('#listenOverlay').classList.add('show');

    setupVAD(stream);
    state._maxRecordTimer = setTimeout(stopRecording, 12000);
  } catch (e) {
    console.error('No mic', e);
    showToast('No pude acceder al micrófono');
    setSolState('idle');
    endBotBubble();
  }
}

function setupVAD(stream) {
  try {
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = state.audioCtx.createMediaStreamSource(stream);
    const analyser = state.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    let silenceStart = null;
    const SILENCE_DB = 0.012;
    const SILENCE_MS = 1400;
    let voiceDetected = false;

    function tick() {
      if (!state.recorder || state.recorder.state !== 'recording') return;
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length) / 255;
      if (rms > SILENCE_DB) {
        voiceDetected = true;
        silenceStart = null;
      } else if (voiceDetected) {
        if (silenceStart === null) silenceStart = performance.now();
        else if (performance.now() - silenceStart > SILENCE_MS) {
          stopRecording();
          return;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } catch (e) { console.warn('VAD', e); }
}

function stopRecording() {
  if (!state.recorder) return;
  clearTimeout(state._maxRecordTimer);
  $('#listenOverlay').classList.remove('show');
  micBtn.classList.remove('recording');
  try { state.recorder.stop(); } catch(e) {}
  // NO frenamos los tracks: mantenemos el micStream vivo para no re-pedir permiso.
  // (el stream queda abierto pero el MediaRecorder ya está detenido)
}

async function onRecorderStop() {
  const chunks = state.recChunks;
  const mime = state.recorder?.mimeType || 'audio/webm';
  state.recorder = null;
  state.recStream = null;

  if (!chunks.length) { setSolState('idle'); endBotBubble(); return; }
  const blob = new Blob(chunks, { type: mime });

  setSolState('thinking');

  const b64 = await blobToBase64(blob);

  try {
    const r = await fetch('/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: b64, mime_type: mime })
    });
    if (!r.ok) {
      showToast('No entendí el audio');
      setSolState('idle');
      endBotBubble();
      return;
    }
    const data = await r.json();
    const text = (data.text || '').trim();
    if (!text) {
      setSolState('idle');
      endBotBubble();
      return;
    }
    // Voz disparada → respuesta con voz
    await converse(text, /*withVoice=*/true);
  } catch (e) {
    console.error(e);
    showToast('Falló la transcripción');
    setSolState('idle');
    endBotBubble();
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result.toString();
      const comma = s.indexOf(',');
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ============================================================
// Manejo del teclado virtual en mobile
// Cuando el teclado aparece, scrolleamos el input a la vista
// y achicamos el orbe flotante para que no estorbe
// ============================================================
(function setupKeyboard() {
  const appEl = document.getElementById('app');
  const splashEl = document.getElementById('splash');
  let lastH = 0;

  function visibleHeight() {
    return Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
  }

  function refreshH() {
    const h = visibleHeight();
    const offTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
    const kb = Math.max(0, window.innerHeight - h - offTop);  // alto del teclado
    document.body.style.setProperty('--kb', kb + 'px');  // para subir sheets/modales
    if (h && h !== lastH) {
      lastH = h;
      appEl.style.height = h + 'px';
      document.documentElement.style.height = h + 'px';
      document.body.style.height = h + 'px';
      if (splashEl) splashEl.style.height = h + 'px';
    }
    const list = document.getElementById('historyList');
    if (list && (list.scrollHeight - list.scrollTop - list.clientHeight) < 80) list.scrollTop = list.scrollHeight;
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refreshH);
    window.visualViewport.addEventListener('scroll', refreshH);
  }
  window.addEventListener('resize', refreshH);
  window.addEventListener('orientationchange', () => setTimeout(refreshH, 300));

  // POLLING mientras el teclado está abierto — cubre navegadores que no
  // disparan resize (MIUI, Samsung Internet, etc.)
  let kbPoll = null;
  // Delegado a TODOS los inputs/textarea (chat, pedido, valoración, mesa)
  document.addEventListener('focusin', (e) => {
    if (!e.target || !e.target.matches || !e.target.matches('input, textarea')) return;
    document.body.classList.add('keyboard-open');
    clearInterval(kbPoll);
    kbPoll = setInterval(refreshH, 150);
    setTimeout(refreshH, 100);
    setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(_){} }, 320);
  });
  document.addEventListener('focusout', (e) => {
    if (!e.target || !e.target.matches || !e.target.matches('input, textarea')) return;
    document.body.classList.remove('keyboard-open');
    clearInterval(kbPoll);
    setTimeout(refreshH, 250);
    setTimeout(refreshH, 600);
  });

  refreshH();
})();

// ============================================================
// NUEVO — navegación por capas, pedido, mozo y valoración
// ============================================================
state.cart = (function(){ try { const c = JSON.parse(localStorage.getItem('cv_cart') || '[]'); return Array.isArray(c) ? c : []; } catch(e){ return []; } })();
state.table = (function(){ try { return localStorage.getItem('cv_table') || ''; } catch(e){ return ''; } })();
// Mesa por QR: el QR de cada mesa lleva su número en la URL (.../?mesa=7). Si viene, la mesa queda
// FIJA y no editable (el comensal no la toca). Sin parámetro → carga manual (fallback).
state.tableLocked = false;
(function(){
  try {
    const p = new URLSearchParams(location.search);
    const m = (p.get('mesa') || p.get('m') || p.get('table') || '').trim().slice(0, 12);
    if (m && /^[A-Za-z0-9\-]{1,12}$/.test(m)) {
      state.table = m; state.tableLocked = true;
      try { localStorage.setItem('cv_table', m); } catch(e){}
    }
  } catch(e){}
})();
function saveCart(){ try { localStorage.setItem('cv_cart', JSON.stringify(state.cart)); } catch(e){} }
const _ratings = { mesera: 0, restaurante: 0, quantumhive: 0 };
// Links de reseña — VACÍOS hasta que el cliente contrate. Completar acá la conexión real
// (o setear localStorage 'cv_google' / 'cv_qh' para demostrarlo sin tocar código).
const CV_LINKS = { googleReviewUrl: '', quantumhiveUrl: '' };
// 1) De CARTA_CONFIG.links (inyectado en window.CV_CONFIG).
if (window.CV_CONFIG && window.CV_CONFIG.links) {
  CV_LINKS.googleReviewUrl = window.CV_CONFIG.links.googleReviewUrl || CV_LINKS.googleReviewUrl;
  CV_LINKS.quantumhiveUrl  = window.CV_CONFIG.links.quantumhiveUrl  || CV_LINKS.quantumhiveUrl;
}
// 2) localStorage pisa (para demostrar sin tocar código: 'cv_google' / 'cv_qh').
try {
  CV_LINKS.googleReviewUrl = localStorage.getItem('cv_google') || CV_LINKS.googleReviewUrl;
  CV_LINKS.quantumhiveUrl  = localStorage.getItem('cv_qh') || CV_LINKS.quantumhiveUrl;
} catch(e){}

// ---------- Navegación por capas (que "atrás" no expulse) ----------
const NAV = { armed: false, stack: [], cardOpen: false };
const NAV_CLOSERS = {
  chat:   () => closeChatDom(),
  order:  () => closeOrderDom(),
  rating: () => closeRatingDom(),
  mesa:   () => closeMesaDom(),
};
function navInit(){
  if (NAV.armed) return;
  NAV.armed = true;
  history.pushState({ cv: 'carta' }, '');   // guarda inicial: el primer "atrás" no abandona
  window.addEventListener('popstate', onPop);
}
function navOpen(name, openFn){
  if (NAV.stack.includes(name)) { if (openFn) openFn(); return; }
  if (openFn) openFn();
  NAV.stack.push(name);
  history.pushState({ cv: name }, '');
  toggleQuickActions();
}
function navCloseUI(name){ if (NAV.stack.includes(name)) history.back(); }
function navSwap(from, to, closeFrom, openTo){
  const i = NAV.stack.lastIndexOf(from);
  if (i >= 0) NAV.stack[i] = to; else NAV.stack.push(to);
  if (closeFrom) closeFrom();
  if (openTo) openTo();
  toggleQuickActions();
}
function onPop(){
  const _drop = $('#menuDrop');
  if (_drop && _drop.classList.contains('open')) { closeMenuDrop(); }   // atrás cierra el menú desplegable primero
  else if (NAV.cardOpen) { closeMozoCardDom(); }
  else if (NAV.stack.length) { const name = NAV.stack.pop(); (NAV_CLOSERS[name] || (()=>{}))(); }
  else if (cartaAwayFromHome()) { goHome(); }
  else { openExitModal(); }
  history.pushState({ cv: 'carta' }, '');   // siempre dejamos una guarda arriba
  toggleQuickActions();
}
function cartaAwayFromHome(){
  const body = $('#cartaBody');
  const firstTab = $('#cartaTabs') ? $('#cartaTabs').querySelector('.tab') : null;
  const onFirst = firstTab ? firstTab.classList.contains('active') : true;
  return (body && body.scrollTop > 40) || !onFirst;
}
function goHome(){
  const tabs = $('#cartaTabs');
  if (tabs) { const ts = tabs.querySelectorAll('.tab'); ts.forEach((x, i) => x.classList.toggle('active', i === 0)); }
  const body = $('#cartaBody');
  if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Detener la voz ----------
function stopSpeaking(){
  state.cancelToken++;       // invalida la cola TTS y el player
  stopCurrentAudio();        // pausa el audio actual (dispara onpause → resuelve)
  cvClearSpotTimers();       // frena el avance del spotlight
  cvSpotlightSettle();       // corta el pulso y oculta el botón (deja lo resaltado)
  setSolState('idle');
}

// ---------- Carrito ----------
function cartCount(){ return state.cart.reduce((a, i) => a + i.qty, 0); }
function cartTotal(){ return state.cart.reduce((a, i) => a + (i.price || 0) * i.qty, 0); }
function findCart(id){ return state.cart.find(i => i.id === id); }
function addToCart(item){
  const ex = findCart(item.id);
  if (ex) ex.qty++; else state.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
  saveCart();
  refreshCartUI();
  showToast('Agregado al pedido: ' + item.name);
}
function changeQty(id, d){
  const it = findCart(id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) state.cart = state.cart.filter(x => x.id !== id);
  saveCart();
  refreshCartUI();
  renderOrderItems();
}
function refreshCartUI(){
  const n = cartCount();
  $('#cartCount').textContent = n;
  $('#cartTotalBar').textContent = cartTotal() ? fmtPrice(cartTotal()) : '';
  $('#cartBar').classList.toggle('show', n > 0);
  document.querySelectorAll('.dish-add-ctl').forEach(updateAddControl);
}
// Control de cada plato: botón "Agregar"; si ya está en el pedido, stepper "− N +"
// (así no se apila el carrito con un toque distraído).
function makeAddControl(id, name, price){
  const wrap = document.createElement('div');
  wrap.className = 'dish-add-ctl';
  wrap.dataset.id = id;
  const addb = document.createElement('button');
  addb.className = 'dish-add'; addb.type = 'button'; addb.textContent = 'Agregar';
  addb.dataset.id = id;
  addb.setAttribute('aria-label', 'Agregar ' + name + ' al pedido');
  addb.addEventListener('click', () => addToCart({ id, name, price }));
  const qc = document.createElement('div');
  qc.className = 'qty-ctl';
  qc.innerHTML = '<button class="qm" type="button" aria-label="Quitar uno">−</button>'
               + '<span class="qn">0</span>'
               + '<button class="qp" type="button" aria-label="Sumar uno">+</button>';
  qc.querySelector('.qm').addEventListener('click', () => changeQty(id, -1));
  qc.querySelector('.qp').addEventListener('click', () => changeQty(id, +1));
  wrap.appendChild(addb); wrap.appendChild(qc);
  updateAddControl(wrap);
  return wrap;
}
function updateAddControl(wrap){
  const it = findCart(wrap.dataset.id);
  const n = it ? it.qty : 0;
  wrap.dataset.in = n > 0 ? '1' : '0';
  const qn = wrap.querySelector('.qn'); if (qn) qn.textContent = n;
}

// ---------- Pantalla de pedido ----------
function openOrderDom(){
  renderOrderItems();
  const ot = $('#orderTable');
  if (ot) {
    ot.value = state.table || '';
    ot.readOnly = !!state.tableLocked;            // si vino del QR, no se edita
    ot.classList.toggle('locked', !!state.tableLocked);
  }
  // si la mesa vino del QR, el label aclara que es fija (no se pide cargarla)
  const olab = document.querySelector('label[for="orderTable"], #orderSheet .field label');
  if (olab) olab.textContent = state.tableLocked ? 'Tu mesa' : 'Número de mesa';
  $('#orderOverlay').classList.add('open');
  $('#orderSheet').classList.add('open');
  $('#orderSheet').setAttribute('aria-hidden', 'false');
}
function closeOrderDom(){
  $('#orderOverlay').classList.remove('open');
  $('#orderSheet').classList.remove('open');
  $('#orderSheet').setAttribute('aria-hidden', 'true');
}
function renderOrderItems(){
  const box = $('#orderItems');
  box.innerHTML = '';
  if (!state.cart.length){
    box.innerHTML = '<div class="order-empty">Tu pedido está vacío.<br>Tocá el “+” en los platos para sumarlos.</div>';
    $('#orderTotal').textContent = '$0';
    $('#orderTba').textContent = '';
    return;
  }
  for (const it of state.cart){
    const row = document.createElement('div');
    row.className = 'order-item';
    const info = document.createElement('div');
    info.innerHTML = '<div class="oi-name"></div>' + (it.price ? '<div class="oi-price">' + fmtPrice(it.price) + ' c/u</div>' : '<div class="oi-price">a confirmar</div>');
    info.querySelector('.oi-name').textContent = it.name;
    const step = document.createElement('div');
    step.className = 'qty-stepper';
    const minus = document.createElement('button'); minus.textContent = '−'; minus.onclick = () => changeQty(it.id, -1);
    const q = document.createElement('b'); q.textContent = it.qty;
    const plus = document.createElement('button'); plus.textContent = '+'; plus.onclick = () => changeQty(it.id, 1);
    step.appendChild(minus); step.appendChild(q); step.appendChild(plus);
    const line = document.createElement('div'); line.className = 'oi-line';
    line.textContent = it.price ? fmtPrice(it.price * it.qty) : '—';
    row.appendChild(info); row.appendChild(step); row.appendChild(line);
    box.appendChild(row);
  }
  $('#orderTotal').textContent = fmtPrice(cartTotal());
  const tba = state.cart.filter(i => !i.price).map(i => i.name);
  $('#orderTba').textContent = tba.length ? ('A confirmar con el mozo: ' + tba.join(', ')) : '';
}
function buildOrderMessage(){
  // Formato pensado para que la cocina/el mozo lo lea rápido.
  const rname = (state.menu && state.menu.restaurant && state.menu.restaurant.name) || 'Pedido';
  const sep = '———————————————';
  const lines = [];
  lines.push('*' + rname.toUpperCase() + ' — MESA ' + (state.table || '?') + '*');
  lines.push(sep);
  for (const it of state.cart){
    const price = it.price ? fmtPrice(it.price * it.qty) : '(a confirmar)';
    lines.push(it.qty + 'x ' + it.name + ' — ' + price);
  }
  lines.push(sep);
  if (cartTotal()) lines.push('*TOTAL: ' + fmtPrice(cartTotal()) + '*');
  return lines.join('\n');
}
function realizarPedido(){
  if (!state.cart.length){ showToast('Tu pedido está vacío'); return; }
  const mesa = ($('#orderTable').value || '').trim();
  if (!mesa){ showToast('Decinos tu número de mesa'); $('#orderTable').focus(); return; }
  state.table = mesa; try { localStorage.setItem('cv_table', mesa); } catch(e){}
  updateTableChip();
  // El pedido viaja INTERNO al backend — el comensal NO sale de la app.
  enviarPedidoInterno();
  // Sol se despide por voz (ahora SÍ se escucha, porque seguimos dentro de la app)
  solFarewell();
  showToast('¡Listo! La mesera ya tomó tu pedido 🎉', 4000);
  navSwap('order', 'rating', closeOrderDom, openRatingDom);
}

function enviarPedidoInterno(){
  const payload = {
    table: state.table || null,
    total: cartTotal() || null,
    items: state.cart.map(i => ({ name: i.name, qty: i.qty, price: (i.price === undefined ? null : i.price) })),
    text: buildOrderMessage(),
  };
  try {
    fetch('/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch(e){}
}

// Despedida cálida de la mesera al cerrar el pedido (cierre de experiencia).
function solFarewell(){
  const text = '¡Excelente elección! Ya le mandé tu comanda a los mozos. Disfrutá la comida.';
  try {
    setSolState('speaking');
    playAudioForText(text, ++state.cancelToken)
      .then(() => setSolState('idle'))
      .catch(() => setSolState('idle'));
  } catch(e) { setSolState('idle'); }
}

// ---------- Cartel para el mozo ----------
function openMozoCardDom(){
  $('#mcTable').textContent = 'Mesa ' + (($('#orderTable').value || state.table || '—').trim() || '—');
  const list = $('#mcList'); list.innerHTML = '';
  for (const it of state.cart){
    const row = document.createElement('div'); row.className = 'mc-item';
    const left = document.createElement('span');
    left.innerHTML = '<span class="q"></span> ';
    left.querySelector('.q').textContent = it.qty + '×';
    left.appendChild(document.createTextNode(it.name));
    const rightS = document.createElement('span');
    rightS.textContent = it.price ? fmtPrice(it.price * it.qty) : 'a confirmar';
    row.appendChild(left); row.appendChild(rightS);
    list.appendChild(row);
  }
  $('#mcTotal').textContent = cartTotal() ? fmtPrice(cartTotal()) : '—';
  $('#mozoCard').classList.add('open');
  NAV.cardOpen = true;
  toggleQuickActions();
}
function closeMozoCardDom(){ $('#mozoCard').classList.remove('open'); NAV.cardOpen = false; }
function showMozo(){
  if (!state.cart.length){ showToast('Tu pedido está vacío'); return; }
  const mesa = ($('#orderTable').value || '').trim();
  if (mesa){ state.table = mesa; try { localStorage.setItem('cv_table', mesa); } catch(e){} updateTableChip(); }
  openMozoCardDom();
}
function mozoDone(){
  closeMozoCardDom();
  navSwap('order', 'rating', closeOrderDom, openRatingDom);
}

// ---------- Valoración ----------
function openRatingDom(){
  _ratings.mesera = 0; _ratings.restaurante = 0; _ratings.quantumhive = 0;
  paintStars('mesera', 0); paintStars('restaurante', 0); paintStars('quantumhive', 0);
  document.getElementById('ctaGoogle').hidden = true;
  document.getElementById('ctaQh').hidden = true;
  $('#ratingComment').value = '';
  $('#ratingSend').disabled = false;
  $('#ratingOverlay').classList.add('open');
  $('#ratingSheet').classList.add('open');
  $('#ratingSheet').setAttribute('aria-hidden', 'false');
}
function closeRatingDom(){
  $('#ratingOverlay').classList.remove('open');
  $('#ratingSheet').classList.remove('open');
  $('#ratingSheet').setAttribute('aria-hidden', 'true');
}
function paintStars(target, v){
  document.querySelectorAll('#ratingSheet .stars[data-target="' + target + '"] .star')
    .forEach(s => s.classList.toggle('on', Number(s.dataset.v) <= v));
}
function maybeShowCta(id, url){ const el = document.getElementById(id); if (el) el.hidden = !url; }
async function enviarValoracion(){
  if (!_ratings.mesera && !_ratings.restaurante && !_ratings.quantumhive){ showToast('Tocá las estrellas para valorar'); return; }
  const payload = {
    stars_mesera: _ratings.mesera || null,
    stars_restaurante: _ratings.restaurante || null,
    stars_quantumhive: _ratings.quantumhive || null,
    comment: ($('#ratingComment').value || '').trim() || null,
    table: state.table || null,
    order_items: state.cart.map(i => ({ name: i.name, qty: i.qty, price: (i.price === undefined ? null : i.price) })),
  };
  // Por ahora queda guardada EN LA CARTA (en el dispositivo). Más tarde → Supabase.
  try {
    const arr = JSON.parse(localStorage.getItem('cv_feedback') || '[]');
    arr.push(Object.assign({ at: new Date().toISOString() }, payload));
    localStorage.setItem('cv_feedback', JSON.stringify(arr));
  } catch(e){}
  // Best-effort al backend (si Supabase está configurado, persiste; si no, no rompe).
  try { await fetch('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch(e){}
  $('#ratingSend').disabled = true;
  showToast('¡Gracias por tu valoración! 🙏', 3500);
  state.cart = []; saveCart(); refreshCartUI();
  navCloseUI('rating');
}

// ---------- Mesa ----------
function updateTableChip(){ const el = $('#tableNum'); if (el) el.textContent = state.table ? state.table : '—'; }
function openMesaDom(){
  $('#tableInput').value = state.table || '';
  $('#tableModal').classList.add('open');
  setTimeout(() => { try { $('#tableInput').focus(); } catch(e){} }, 200);
}
function closeMesaDom(){ $('#tableModal').classList.remove('open'); }
function guardarMesa(){
  const v = ($('#tableInput').value || '').trim();
  if (!v){ showToast('Escribí tu número de mesa'); return; }
  state.table = v; try { localStorage.setItem('cv_table', v); } catch(e){}
  updateTableChip();
  const ot = $('#orderTable'); if (ot) ot.value = v;
  navCloseUI('mesa');
}

// ---------- Modal de salida ----------
function openExitModal(){ $('#exitModal').classList.add('open'); }
function closeExitModal(){ $('#exitModal').classList.remove('open'); }

// ---------- Acciones rápidas ----------
function quickAsk(text){
  if (state.isStreaming) return;
  converse(text, true);   // voz + spotlight sobre la carta, sin abrir el chat
}
function toggleQuickActions(){
  const qa = $('#quickActions'); if (!qa) return;
  const orb = $('#orbFloat');
  const orbState = orb ? orb.dataset.state : 'idle';
  // Tarjeta/nav abiertos SIEMPRE tapan los chips. Hablar/pensar (orbe!=idle) o streaming los tapan
  // SOLO si son los 4 por defecto: los chips de contexto (acción/elección) quedan visibles para tocar.
  const hardBusy = NAV.stack.length > 0 || NAV.cardOpen;
  const softBusy = state.isStreaming || (orbState && orbState !== 'idle');
  const busy = hardBusy || (softBusy && !state.hasContextChips);
  qa.classList.toggle('hidden', !!busy);
}

// ---------- Wiring ----------
cvSetChips(null);   // render inicial de los 4 atajos por defecto (con sus listeners)
// Cualquier interacción reinicia el contador de inactividad (esconde el cartel del orbe)
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, cvResetIdleHint, { passive: true }));
// Menú desplegable: tocar afuera lo cierra
$('#menuOverlay').addEventListener('click', closeMenuDrop);
// Botón "☰ Menú" del header → abre/cierra el desplegable de secciones
$('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenuDrop(); });
// Modal de confirmación genérico (callback en Sí)
let _confirmCb = null;
function cvConfirm(text, onYes){
  _confirmCb = onYes;
  $('#confirmText').textContent = text;
  $('#confirmModal').classList.add('open');
}
function cvCloseConfirm(){ $('#confirmModal').classList.remove('open'); _confirmCb = null; }
$('#confirmYes').addEventListener('click', () => { const cb = _confirmCb; cvCloseConfirm(); if (cb) cb(); });
$('#confirmNo').addEventListener('click', cvCloseConfirm);
$('#confirmModal').addEventListener('click', (e) => { if (e.target.id === 'confirmModal') cvCloseConfirm(); });

// Botón flotante "Agregar al pedido": idempotente — si el plato YA está, avisa y NO lo duplica.
// Para sumar más unidades está el stepper "− N +" en la tarjeta del plato.
$('#addFloat').addEventListener('click', () => {
  const btn = $('#addFloat'), e = btn && btn._entry;
  if (!e) return;
  if (findCart(e.id)) { showToast('Ya lo tenés en el pedido'); return; }
  addToCart({ id: e.id, name: e.name, price: e.price });
});
$('#cartBar').addEventListener('click', () => navOpen('order', openOrderDom));
$('#orderClose').addEventListener('click', () => navCloseUI('order'));
$('#orderOverlay').addEventListener('click', () => navCloseUI('order'));
$('#orderSend').addEventListener('click', realizarPedido);
$('#orderShow').addEventListener('click', showMozo);
$('#mozoDone').addEventListener('click', mozoDone);
$('#ratingClose').addEventListener('click', () => navCloseUI('rating'));
$('#ratingOverlay').addEventListener('click', () => navCloseUI('rating'));
$('#ratingSend').addEventListener('click', enviarValoracion);
document.querySelectorAll('#ratingSheet .stars').forEach(group => {
  const target = group.dataset.target;
  group.querySelectorAll('.star').forEach(s => s.addEventListener('click', () => {
    _ratings[target] = Number(s.dataset.v);
    paintStars(target, _ratings[target]);
    if (target === 'restaurante') maybeShowCta('ctaGoogle', CV_LINKS.googleReviewUrl);
    if (target === 'quantumhive') maybeShowCta('ctaQh', CV_LINKS.quantumhiveUrl);
  }));
});
(function(){
  const cg = document.getElementById('ctaGoogleBtn');
  if (cg) cg.addEventListener('click', () => { if (CV_LINKS.googleReviewUrl) window.open(CV_LINKS.googleReviewUrl, '_blank'); });
  const cq = document.getElementById('ctaQhBtn');
  if (cq) cq.addEventListener('click', () => { if (CV_LINKS.quantumhiveUrl) window.open(CV_LINKS.quantumhiveUrl, '_blank'); });
})();
$('#tableChip').addEventListener('click', () => {
  if (state.tableLocked) { showToast('Tu mesa es la ' + state.table + ' — viene del QR de la mesa'); return; }
  navOpen('mesa', openMesaDom);
});
$('#tableSave').addEventListener('click', guardarMesa);
$('#tableCancel').addEventListener('click', () => navCloseUI('mesa'));
$('#tableInput').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); guardarMesa(); } });
$('#exitStay').addEventListener('click', closeExitModal);
$('#exitLeave').addEventListener('click', () => { closeExitModal(); location.reload(); });
updateTableChip();
refreshCartUI();

</script>
</body>
</html>
"""


# ============================================================================
# System prompt builder — convierte menu.json en instrucciones para Sol
# ============================================================================
def _format_price(p: Optional[int], symbol: str = "$") -> str:
    """Formatea precio en palabras para que ElevenLabs lo lea bien.
    Evita que diga 'dólar veintisiete punto cero cero' — dice '27 mil pesos'.
    """
    if p is None:
        return "(precio a confirmar con el mozo)"
    if p == 0:
        return "incluido"
    if p >= 1_000_000:
        m = p / 1_000_000
        return f"{m:g} millón de pesos" if m == 1 else f"{m:g} millones de pesos"
    if p >= 1_000:
        miles = p // 1_000
        resto = p % 1_000
        if resto == 0:
            return f"{miles} mil pesos"
        return f"{miles} mil {resto} pesos"
    return f"{p} pesos"


def build_system_prompt() -> str:
    """Carga menu.json y arma el system prompt completo para Sol."""
    data = json.loads(EMBEDDED_MENU_JSON)
    restaurant = data.get("restaurant", {})
    assistant = data.get("assistant", {})
    rules = data.get("rules", {})
    symbol = restaurant.get("currency_symbol", "$")

    lines: List[str] = []

    # Identidad y personalidad — la mesera
    lines.append(f"""Sos la mesera de {restaurant.get('name', 'el restaurante')}. Trabajás acá hace años, conocés la carta de memoria y sabés leer a cada cliente.

CÓMO RESPONDÉS — REGLA DE ORO:
Directa, concreta y vendedora. Recomendás con seguridad y guiás la venta DE A UN PASO: recomendás UNA cosa a la vez (un plato o una categoría), dejás que el cliente la elija o la agregue, y RECIÉN AHÍ ofrecés el siguiente paso (bebida, postre). Nunca amontonás plato + bebida + postre en una sola respuesta. Prohibido arrancar con "mmm", "a ver" o repetir la pregunta del cliente.

SI TE PIDEN VARIAS COSAS JUNTAS (ej. "recomendame una carne y un vino", o "un postre y el menú infantil"): resolvés EN ORDEN, de a una. Primero la carne: tirás dos o tres opciones y esperás a que el cliente elija o la agregue (cerrás con algo tipo "¿cuál te tiento?"), SIN nombrar el vino todavía. Recién cuando ya eligió la carne, en tu PRÓXIMA respuesta pasás al vino. Una cosa por turno.
PROHIBIDO ABSOLUTO: si decís que algo lo ven "después", "más tarde" o "ahora vemos lo otro" (ej. "después vemos el menú infantil para tu hijo"), entonces en ESE turno NO lo desarrollás, NO lo describís y NO tirás sus opciones — lo dejás de verdad para tu PRÓXIMA respuesta, recién cuando el cliente cerró lo primero. Decir "después vemos X" y en el mismo turno desarrollar X es el error más grave: NO lo hagas. Lo que queda pendiente lo dejás como chip para que el cliente lo toque cuando quiera avanzar.

SOBRE LOS PRECIOS — LEÉS AL CLIENTE:
No cantás precios de entrada: recomendás por el plato, no por el número. Después de recomendar, si el cliente parece indeciso o está comparando opciones, le ofrecés con naturalidad: "¿te paso los precios o preferís elegir primero?". Si el cliente pregunta precios directamente, se los das al toque y se los seguís dando en el resto de la charla (ese cliente mira el bolsillo). Si nunca pregunta, no los mencionás (ese cliente elige por gusto). Te adaptás al perfil.
Cuando digas un precio, SIEMPRE en palabras: "veintisiete mil pesos", jamás "$27.000".

Ejemplos exactos de tu estilo:

Cliente: "recomendame algo rápido y rico"
Vos: "Las Tiras de Pollo Crocante: pollo crocante con salsa honey mustard, salen rápido y no fallan nunca. ¿Te las agrego o querés ver otra opción?"

Cliente: "recomendame una carne y un vino"
Vos: "Arranquemos por la carne. El Ojo de Bife 400gr es jugoso y tierno, un golazo; si te va algo con más carácter, el Bife a las Especias 400gr; y para los de buen diente, las Costillas BBQ 500gr. ¿Cuál te tiento?"
(NO nombrás el vino todavía: esperás a que elija la carne. Recién en tu PRÓXIMA respuesta, cuando ya la eligió, le ofrecés el vino.)

Cliente: "¿y cuánto está eso?"
Vos: "Los tenders están dieciocho mil pesos, la limonada seis mil ochocientos y el cheesecake diecisiete mil. Buen plan completo. ¿Te lo armo así?"

Cliente: "estoy entre el lomo y el salmón, no me decido"
Vos: "Los dos son de lo mejor de la casa. El Filet Mignon viene a la leña con papa rellena, bien contundente; el Salmón Grillado es más liviano, con papas fritas. Si venís con hambre de verdad, lomo sin dudar. ¿Te paso los precios o elegís primero y después vemos?"

Cliente: "¿qué vino va con el lomo?"
Vos: "Un Malbec, de una. El Saint Felicien por botella es el clásico que nunca falla, y por copa el Trapiche Reserva anda bárbaro. Y guardate lugar para el Sundae de Chocolate Caliente de postre, que cierra la noche de diez."

Fijate el patrón: UNA recomendación por turno (dos o tres opciones máximo de UNA sola categoría), esperás que el cliente elija o agregue antes de pasar al siguiente paso de la comanda, y los precios solo cuando el cliente los pide o cuando dudás que esté decidido — ahí los ofrecés, no los imponés.

REGLAS DURAS:
- Nunca decís que sos una IA o un bot. Sos la mesera.
- Nunca inventás precios. Si no está en la carta: "ese te lo confirma el mozo".
- Precios siempre en palabras cuando los digas.
- Los pesos y medidas decilos en palabras completas ("quinientos gramos"), nunca "gr" ni "500gr".
- Nunca emojis.
- Hablás de vos (tenés, querés, podés), porteña natural y amable.
- Si piden TODA la carta: "la tenés completa en pantalla — decime de qué tenés ganas y te tiro la posta".
- UNA categoría por turno SIEMPRE: si dijiste "después vemos X", X no aparece hasta el próximo turno. Esperás la elección del cliente antes de avanzar — no te adelantes nunca.

Tu carta completa con todos los precios está abajo (para cuando te los pidan).""")
    lines.append("")

    # Cargar / modificar el pedido (directiva técnica invisible)
    lines.append("""ARMAR Y MODIFICAR EL PEDIDO — MUY IMPORTANTE:
Vos misma cargás el pedido del cliente. Cuando te pida sumar, sacar o armar el pedido —ejemplos: "agregame una gaseosa", "sumá dos tiras de pollo", "sacá la pizza", "armame el pedido con lo que me recomendaste", "cambiá la coca por agua", "borrá todo"— además de contestarle hablando normal, agregás AL FINAL de tu respuesta UNA SOLA línea técnica con este formato EXACTO:

#PEDIDO# {"add":[{"name":"<nombre EXACTO de la carta>","qty":<numero>,"variant":"<copa|botella, SOLO en vinos/espumantes>"}],"remove":[{"name":"<nombre EXACTO>","qty":<numero, o 0 para sacar todo>}],"clear":false}

Reglas de esa línea (clave):
- Va SOLA, al final, en su propio renglón, arrancando con #PEDIDO#. Es INVISIBLE para el cliente: NUNCA la leas en voz alta ni la menciones. El cliente solo escucha tu confirmación hablada.
- "name" tiene que ser el nombre EXACTO como figura en la carta de abajo (mismas palabras; podés omitir tildes). No inventes nombres.
- "variant" va SOLO en vinos y espumantes (los que tienen precio por copa Y por botella) y vale "copa" o "botella". En el resto de los ítems NO pongas "variant".
- VINOS/ESPUMANTES: si el cliente aclara copa o botella ("la BOTELLA de Baron B"), cargalo con ese "variant". Si NO aclara ("agregá el Baron B"), NO lo cargues todavía: repreguntá hablando "¿lo querés por copa o por botella?" y recién cuando conteste lo agregás con el "variant" correcto.
- Si solo agregás, dejá "remove" vacío (y al revés). "clear": true vacía todo el pedido (solo si el cliente dice "borrá todo" / "empecemos de nuevo").
- GUARNICIONES INCLUIDAS: muchos platos YA vienen con papas fritas, ensalada o puré (lo dice su descripción). Cuando agregás uno de esos platos, NO agregues también la guarnición suelta del Acompañamiento: ya está incluida. Solo agregás un Acompañamiento aparte si el cliente pide EXPRESAMENTE una porción extra ("agregame unas papas aparte"). Podés nombrar la guarnición al describir el plato, pero no la cargues como ítem separado.
- NO REPITAS lo que ya cargaste: en "add" va SOLO lo nuevo de este pedido. Fijate el historial — si algo ya lo agregaste antes en esta charla, NO lo vuelvas a poner en #PEDIDO# (el sistema lo sumaría de nuevo). Solo lo agregás otra vez si el cliente pide EXPRESAMENTE más cantidad ("sumá otra gaseosa").
- Si el cliente NO te pidió tocar el pedido (es solo charla o una pregunta), NO pongas la línea #PEDIDO#.
- Siempre que cargues algo, confirmáselo hablando con naturalidad ("Listo, te sumé una limonada y dos tiras de pollo, ¿algo más?"). El cambio real lo hace la línea técnica, así que cuando confirmás un cambio, la línea SIEMPRE tiene que estar.
- Si te piden "armame el pedido con lo que me recomendaste", meté en "add" lo que vos recomendaste recién.

SUGERENCIAS DE SEGUIMIENTO — otra línea técnica invisible:
Casi siempre que termines de responder, ofrecé de 2 a 4 atajos cortos para que el cliente siga, con esta línea (TAMBIÉN invisible, va al final, después del #PEDIDO# si lo hubiera):
#CHIPS# ["texto corto 1","texto corto 2","texto corto 3"]
- Son frases cortas en primera persona del cliente, como botones. Máximo 4, idealmente de 2 a 4 palabras. NUNCA las leas en voz alta.
- CUANDO RECOMENDÁS UN PLATO O COMBO CONCRETO: cerrá hablando con algo tipo "¿Te lo agrego al pedido o preferís ver otra opción?" y poné chips de ACCIÓN: ["Sí, agregalo","Otra opción"] (o "Sí, el combo" / "Mostrame otra"). Si el cliente después toca "Sí, agregalo" / "Sí, el combo", en tu PRÓXIMA respuesta agregás al pedido lo que acababas de recomendar (con la línea #PEDIDO#).
- Si mostraste varias cosas o ya cargaste algo, sugerí el siguiente paso: bebida, postre, etc. Ej: ["¿Y para tomar?","Un postre rico","Algo más liviano"].
- SI EL CLIENTE PIDIÓ VARIAS COSAS (ej. "recomendá un pescado y después un pollo") y vos resolviste SOLO la primera: los chips TIENEN que dejar las dos salidas a la vista → una o dos opciones para elegir de lo que mostraste, MÁS un chip para avanzar a lo que pidió después. Ej. tras recomendar pescados: ["El salmón grillado","Otro pescado","Ahora el pollo"]. Así el cliente ve el "¿qué sigue?" como botón y no se queda trabado en el pescado.

Ejemplo (las dos últimas líneas el cliente NO las ve ni las escucha):
Cliente: "agregame una gaseosa y dos tiras de pollo"
Vos: "¡Hecho! Te sumé una Coca-Cola y dos porciones de Tiras de Pollo Crocante. ¿Te tiro algún postre para cerrar?
#PEDIDO# {"add":[{"name":"Coca-Cola","qty":1},{"name":"Tiras de Pollo Crocante","qty":2}],"remove":[],"clear":false}
#CHIPS# ["Un postre rico","¿Y para tomar?","Algo más liviano"]\"""")
    lines.append("")

    # Reglas finas
    lines.append("--- REGLAS DE LA CASA ---")
    if "sharing_surcharge" in rules:
        ss = rules["sharing_surcharge"]
        lines.append(f"• Plato compartido: adicional de {_format_price(ss.get('amount'), symbol)}. "
                     f"En la barra NO se cobra adicional por compartir.")
    if "bread" in rules:
        lines.append(f"• {rules['bread']}")
    if "side_salad_addon" in rules:
        sa = rules["side_salad_addon"]
        opts = ", ".join(sa.get("options", []))
        lines.append(f"• Ensalada de acompañamiento ({opts}): {_format_price(sa.get('price'), symbol)}.")
    if "single_dish_surcharge" in rules:
        sd = rules["single_dish_surcharge"]
        lines.append(f"• Plato individual en mesa de varias personas: +{_format_price(sd.get('amount'), symbol)}.")
    if "extras" in rules:
        for k, v in rules["extras"].items():
            lines.append(f"• {v.get('note', k)}: +{_format_price(v.get('amount'), symbol)}.")
    if "kids_menu" in rules:
        km = rules["kids_menu"]
        lines.append(f"• Menú Kids: exclusivo para menores de {km.get('age_limit', 10)} años.")
    if "wine_copa_volume" in rules:
        wv = rules["wine_copa_volume"]
        lines.append(f"• Copa de vinos: {wv.get('vinos', '?')}. Copa de espumantes: {wv.get('champagne_y_espumantes', '?')}.")
    if "happy_hour" in rules:
        lines.append(f"• Happy hour: {rules['happy_hour'].get('note', 'consultar al mozo')}.")
    if "food_safety_note" in rules:
        lines.append(f"• {rules['food_safety_note']}")
    lines.append("")

    # Menú completo
    lines.append("--- CARTA ---")
    for section in data.get("menu", []):
        lines.append(f"\n[{section.get('name', section.get('id', ''))}]")
        for it in section.get("items", []):
            name = it.get("name", "")
            desc = it.get("description", "")
            price = _format_price(it.get("price"), symbol)
            line = f"  · {name} — {price}"
            if desc:
                line += f"  ({desc})"
            lines.append(line)

    # Bebidas
    lines.append("\n--- BEBIDAS ---")
    for section in data.get("drinks", []):
        lines.append(f"\n[{section.get('name', section.get('id', ''))}]")
        if "items" in section:
            for it in section["items"]:
                parts = [it.get("name", "")]
                if it.get("bodega"):
                    parts.append(it["bodega"])
                price_bits = []
                if it.get("price_copa") is not None:
                    price_bits.append(f"copa {_format_price(it['price_copa'], symbol)}")
                if it.get("price_botella") is not None:
                    price_bits.append(f"botella {_format_price(it['price_botella'], symbol)}")
                if it.get("price") is not None:
                    price_bits.append(_format_price(it["price"], symbol))
                if price_bits:
                    parts.append(" / ".join(price_bits))
                lines.append(f"  · {' — '.join(parts)}")
        if "subcategories" in section:
            for sub in section["subcategories"]:
                lines.append(f"  [{sub.get('name', sub.get('id', ''))}]")
                for it in sub.get("items", []):
                    parts = [it.get("name", "")]
                    if it.get("bodega"):
                        parts.append(it["bodega"])
                    price_bits = []
                    if it.get("price_copa") is not None:
                        price_bits.append(f"copa {_format_price(it['price_copa'], symbol)}")
                    if it.get("price_botella") is not None:
                        price_bits.append(f"botella {_format_price(it['price_botella'], symbol)}")
                    if it.get("price") is not None:
                        price_bits.append(_format_price(it["price"], symbol))
                    if price_bits:
                        parts.append(" / ".join(price_bits))
                    lines.append(f"    · {' — '.join(parts)}")

    # Cierre
    lines.append("")
    lines.append("--- RECORDATORIOS FINALES ---")
    lines.append("• Acordate: sos la mesera. Conversás como tal. Si la pregunta es chiquita, respondés corto; si te piden recomendación, te jugás y describís con apetito.")

    return "\n".join(lines)


SYSTEM_PROMPT = build_system_prompt()

# ============================================================================
# FastAPI app
# ============================================================================
app = FastAPI(title="Carta Viva — Kansas")

# (sin static mount — todo embebido en este archivo)


class ChatTurn(BaseModel):
    role: str = "user"   # "user" o "model"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []
    cart: Optional[List[Dict[str, Any]]] = None   # [{name, qty}] — lo que YA está en el pedido


class TTSRequest(BaseModel):
    text: str


class STTRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/webm"


class FeedbackRequest(BaseModel):
    stars_mesera: Optional[int] = None        # nota a la mesera virtual (producto QuantumHive)
    stars_restaurante: Optional[int] = None   # nota al restaurante (→ Google Maps a futuro)
    stars_quantumhive: Optional[int] = None   # nota a la experiencia QuantumHive
    stars: Optional[int] = None               # compat con clientes viejos (= mesera)
    comment: Optional[str] = None
    table: Optional[str] = None
    order_items: Optional[List[Dict[str, Any]]] = None


class OrderRequest(BaseModel):
    table: Optional[str] = None
    whatsapp: Optional[str] = None
    total: Optional[int] = None
    items: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


# ----------------------------------------------------------------------------
@app.get("/")
async def root():
    cfg = CARTA_CONFIG
    tema = cfg.get("tema") or {}
    # Override de colores: cascada DESPUÉS del :root base, así gana sin tocar el CSS.
    vars_css = ""
    if tema.get("accent"):    vars_css += f"--accent:{tema['accent']};"
    if tema.get("accent_dk"): vars_css += f"--accent-dk:{tema['accent_dk']};"
    theme_style = f"<style>:root{{{vars_css}}}</style>" if vars_css else ""
    # Config que lee el frontend (nombre, chips, links). Escapo "</" por seguridad en <script>.
    cv_json = json.dumps({
        "nombre": cfg.get("nombre", ""),
        "chips":  cfg.get("chips", []),
        "links":  cfg.get("links", {}),
    }, ensure_ascii=False).replace("</", "<\\/")
    config_script = f"<script>window.CV_CONFIG = {cv_json};</script>"
    nombre_html = _esc(cfg.get("nombre", "") or "")
    html = (EMBEDDED_INDEX_HTML
            .replace("__CV_DEMO_MODE__", "true" if DEMO_MODE else "false")
            .replace("__CV_THEME_STYLE__", theme_style)
            .replace("__CV_CONFIG_SCRIPT__", config_script)
            .replace("__CV_NOMBRE__", nombre_html))
    return HTMLResponse(html)


@app.get("/menu.json")
async def menu():
    return Response(content=EMBEDDED_MENU_JSON, media_type="application/json")


@app.get("/health")
async def health():
    return {
        "ok": True,
        "gemini_key_set": bool(GEMINI_API_KEY),
        "gemini_model": GEMINI_MODEL,
        "brain_chain": [f"{p}:{m}" for p, m in BRAIN_CHAIN_PARSED],
        "openrouter_key_set": bool(OPENROUTER_API_KEY),
        "minimax_key_set": bool(MINIMAX_API_KEY),
        "tts_voice": MINIMAX_VOICE,
        "tts_model": MINIMAX_MODEL,
        "minimax_speed": MINIMAX_SPEED,
        "tts_cache": _tts_cache_enabled(),
        "tts_cache_bucket": TTS_CACHE_BUCKET if _tts_cache_enabled() else None,
        "demo_mode": DEMO_MODE,
        "system_prompt_chars": len(SYSTEM_PROMPT),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
    }


# ----------------------------------------------------------------------------
# CEREBRO PLUGGABLE — soporta "gemini" (directo) y "openrouter" (OpenAI-compatible,
# 1 key → muchos modelos + su propio failover). El parseo de #PEDIDO#/#CHIPS# trabaja
# sobre el texto, así que da igual qué cerebro responda.
# ----------------------------------------------------------------------------
def _parse_brain_chain() -> List[tuple]:
    raw = BRAIN_CHAIN or f"gemini:{GEMINI_MODEL}"
    chain: List[tuple] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        prov, _, model = entry.partition(":")
        prov = prov.strip().lower()
        model = model.strip() or GEMINI_MODEL
        if prov not in ("gemini", "openrouter"):
            prov = "gemini"
        # saltar entradas sin su key (no rompen la cadena, simplemente no se usan)
        if prov == "openrouter" and not OPENROUTER_API_KEY:
            continue
        if prov == "gemini" and not GEMINI_API_KEY:
            continue
        chain.append((prov, model))
    if not chain:
        chain.append(("gemini", GEMINI_MODEL))
    return chain


BRAIN_CHAIN_PARSED = _parse_brain_chain()


class _BrainUnavailable(Exception):
    """El cerebro no pudo arrancar (429/503/4xx/error) → probar el siguiente de la cadena."""
    def __init__(self, status: int):
        self.status = status
        super().__init__(f"brain unavailable: {status}")


def _trim_history(history: List[ChatTurn]) -> List[ChatTurn]:
    if MAX_HISTORY_TURNS and len(history) > MAX_HISTORY_TURNS:
        return history[-MAX_HISTORY_TURNS:]
    return history


def _cart_note(cart) -> str:
    """Línea dinámica con lo que YA está en el pedido. Se anexa al system prompt por request
    (no toca el SYSTEM_PROMPT estático) para que la mesera no re-recomiende ni re-agregue lo cargado."""
    if not cart:
        return ""
    parts = []
    for it in cart:
        if not isinstance(it, dict):
            continue
        name = (it.get("name") or "").strip()
        if not name:
            continue
        qty = it.get("qty") or 1
        parts.append(f"{qty}× {name}")
    if not parts:
        return ""
    return ("\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n" + ", ".join(parts) +
            "\nNo recomiendes ni agregues de nuevo lo que ya está acá, salvo que el cliente pida MÁS "
            "explícitamente. Si ya está pedido, avanzá al siguiente paso (bebida, postre, etc.).")


def _gemini_chat_body(history: List[ChatTurn], message: str, sys_extra: str = "") -> Dict[str, Any]:
    contents = []
    for t in history:
        contents.append({"role": t.role, "parts": [{"text": t.text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT + sys_extra}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 2048,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }


def _openai_messages(history: List[ChatTurn], message: str, sys_extra: str = "") -> List[Dict[str, str]]:
    msgs = [{"role": "system", "content": SYSTEM_PROMPT + sys_extra}]
    for t in history:
        msgs.append({"role": "assistant" if t.role == "model" else "user", "content": t.text})
    msgs.append({"role": "user", "content": message})
    return msgs


def _brain_request(prov: str, model: str, history: List[ChatTurn], message: str, sys_extra: str = ""):
    """(url, headers, body) para una llamada NO streaming al proveedor dado."""
    if prov == "openrouter":
        return (OPENROUTER_URL,
                {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                {"model": model, "messages": _openai_messages(history, message, sys_extra),
                 "temperature": 0.8, "max_tokens": 2048})
    return (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}",
            {"Content-Type": "application/json"},
            _gemini_chat_body(history, message, sys_extra))


def _brain_extract(prov: str, data: dict) -> str:
    if prov == "openrouter":
        return data["choices"][0]["message"]["content"]
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def _post_with_retry(client: httpx.AsyncClient, url: str, body: dict, headers: dict) -> httpx.Response:
    """POST con reintentos en 429 (cupo/ráfaga) y 503 (caído) con backoff exponencial."""
    delay = 0.6
    r = None
    for attempt in range(GEMINI_MAX_RETRIES + 1):
        r = await client.post(url, json=body, headers=headers)
        if r.status_code == 200 or r.status_code not in (429, 503) or attempt == GEMINI_MAX_RETRIES:
            return r
        await asyncio.sleep(delay)
        delay *= 2
    return r


@app.post("/chat")
async def chat(req: ChatRequest):
    history = _trim_history(req.history)
    sys_extra = _cart_note(req.cart)
    last_status = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for prov, model in BRAIN_CHAIN_PARSED:
            url, headers, body = _brain_request(prov, model, history, req.message, sys_extra)
            try:
                r = await _post_with_retry(client, url, body, headers)
            except Exception:
                last_status = -1
                continue
            if r.status_code == 200:
                try:
                    reply = _brain_extract(prov, r.json())
                except (KeyError, IndexError, ValueError):
                    reply = ""
                if reply:
                    return {"reply": reply, "brain": f"{prov}:{model}"}
            last_status = r.status_code
            # no-200 o respuesta vacía → probar el siguiente cerebro de la cadena
    return {"reply": MESERA_BUSY_MSG, "brain": "busy", "last_status": last_status}


async def _brain_stream_once(client, prov, model, history, message, sys_extra: str = ""):
    """Async-gen que emite texto a medida. Lanza _BrainUnavailable si no logra arrancar
    (para que la cadena rote al siguiente cerebro). Reintenta 429/503 antes del 1er chunk."""
    if prov == "openrouter":
        url = OPENROUTER_URL
        headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
        body = {"model": model, "messages": _openai_messages(history, message, sys_extra),
                "temperature": 0.8, "max_tokens": 2048, "stream": True}
        is_openai = True
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        body = _gemini_chat_body(history, message, sys_extra)
        is_openai = False

    delay = 0.6
    for attempt in range(GEMINI_MAX_RETRIES + 1):
        async with client.stream("POST", url, json=body, headers=headers) as r:
            if r.status_code == 200:
                async for line in r.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if not payload or payload == "[DONE]":
                        continue
                    try:
                        obj = json.loads(payload)
                        if is_openai:
                            piece = obj["choices"][0]["delta"].get("content") or ""
                        else:
                            piece = obj["candidates"][0]["content"]["parts"][0].get("text") or ""
                    except Exception:
                        continue
                    if piece:
                        yield piece
                return
            retryable = r.status_code in (429, 503) and attempt < GEMINI_MAX_RETRIES
            await r.aread()
            if not retryable:
                raise _BrainUnavailable(r.status_code)
        await asyncio.sleep(delay)
        delay *= 2
    raise _BrainUnavailable(503)


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream SSE con cadena de cerebros: si el primero no arranca, rota al siguiente."""
    history = _trim_history(req.history)
    sys_extra = _cart_note(req.cart)

    async def event_gen():
        async with httpx.AsyncClient(timeout=60.0) as client:
            for prov, model in BRAIN_CHAIN_PARSED:
                produced = False
                try:
                    async for piece in _brain_stream_once(client, prov, model, history, req.message, sys_extra):
                        produced = True
                        yield f"event: chunk\ndata: {json.dumps({'text': piece})}\n\n"
                except Exception:
                    # _BrainUnavailable (no arrancó) o corte a mitad
                    if produced:
                        # ya emitimos texto: cerramos limpio (no se puede rotar a mitad)
                        yield "event: done\ndata: {}\n\n"
                        return
                    continue  # no arrancó: probar el siguiente cerebro de la cadena
                else:
                    yield "event: done\ndata: {}\n\n"
                    return
            # ningún cerebro arrancó: la mesera responde con gracia
            yield f"event: chunk\ndata: {json.dumps({'text': MESERA_BUSY_MSG})}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",  # no buffereo en proxies
    })


# ----------------------------------------------------------------------------
# Pronunciación: la voz tiene que decir las unidades en palabras completas, aunque
# en pantalla el plato quede compacto ("500gr"). El \b + el dígito por delante evitan
# tocar palabras como "Grillado" o un "gramos" ya escrito.
_TTS_UNIT_PATTERNS = [
    (re.compile(r'(\d+)\s*grs?\b', re.IGNORECASE), r'\1 gramos'),
    (re.compile(r'(\d+)\s*kgs?\b', re.IGNORECASE), r'\1 kilos'),
    (re.compile(r'(\d+)\s*(?:cc|cm3)\b', re.IGNORECASE), r'\1 centímetros cúbicos'),
    (re.compile(r'(\d+)\s*ml\b', re.IGNORECASE), r'\1 mililitros'),
    (re.compile(r'(\d+)\s*lts?\b', re.IGNORECASE), r'\1 litros'),
]


def _normalize_for_tts(text: str) -> str:
    """Expande abreviaturas de unidad (pegadas o separadas del número) para que la
    voz las pronuncie completas: '500gr' / '500 grs' → '500 gramos'. Solo afecta al
    AUDIO; el texto que se muestra en pantalla no se toca."""
    for pattern, repl in _TTS_UNIT_PATTERNS:
        text = pattern.sub(repl, text)
    return text


# ----------------------------------------------------------------------------
# Caché de voz en Supabase Storage. Una frase ya generada se guarda por su hash; si se repite
# (saludo, despedida, respuestas a los botones guiados, nombres de platos) se sirve $0 e instantáneo.
# TODO tolerante: si Storage falla o no está configurado, se genera con MiniMax igual (nunca rompe).
def _tts_cache_enabled() -> bool:
    return bool(TTS_CACHE and SUPABASE_URL and SUPABASE_KEY)


def _tts_cache_key(text: str) -> str:
    raw = f"{RESTAURANT_ID}|{MINIMAX_MODEL}|{MINIMAX_VOICE}|{MINIMAX_SPEED}|{text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _tts_cache_url(key: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/{TTS_CACHE_BUCKET}/{RESTAURANT_ID}/{key}.mp3"


async def _tts_cache_get(client: httpx.AsyncClient, key: str) -> Optional[bytes]:
    try:
        r = await client.get(_tts_cache_url(key),
                              headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                              timeout=10.0)
        if r.status_code == 200 and r.content:
            return r.content
    except Exception:
        pass
    return None


async def _tts_cache_put(client: httpx.AsyncClient, key: str, audio: bytes) -> None:
    try:
        await client.post(_tts_cache_url(key),
                          headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                                   "Content-Type": "audio/mpeg", "x-upsert": "true"},
                          content=audio, timeout=15.0)
    except Exception:
        pass


async def _minimax_synth(client: httpx.AsyncClient, text: str) -> bytes:
    """Genera el MP3 con MiniMax T2A v2. stream:False → un solo JSON con el audio (sin duplicar)."""
    r = await client.post(
        f"{MINIMAX_API_BASE}/v1/t2a_v2",
        headers={"Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": MINIMAX_MODEL,
            "text": text,
            "stream": False,
            "voice_setting": {"voice_id": MINIMAX_VOICE, "speed": MINIMAX_SPEED, "vol": MINIMAX_VOL, "pitch": 0},
            "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        },
        timeout=30.0,
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"MiniMax TTS error: {r.text[:400]}")
    obj = r.json()
    hex_audio = (obj.get("data") or {}).get("audio", "")
    if not hex_audio:
        br = obj.get("base_resp") or {}
        raise HTTPException(502, f"MiniMax sin audio: {br.get('status_code')} {br.get('status_msg')}")
    return bytes.fromhex(hex_audio)


@app.post("/tts")
async def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "Texto vacío")
    text = _normalize_for_tts(text)
    if not MINIMAX_API_KEY:
        raise HTTPException(500, "MINIMAX_API_KEY no está configurada en el Space")

    use_cache = _tts_cache_enabled()
    key = _tts_cache_key(text) if use_cache else ""
    async with httpx.AsyncClient() as client:
        # 1) ¿está cacheada? → $0, instantáneo
        if use_cache:
            cached = await _tts_cache_get(client, key)
            if cached:
                return Response(content=cached, media_type="audio/mpeg", headers={"X-TTS-Cache": "hit"})
        # 2) generar con MiniMax
        audio = await _minimax_synth(client, text)
        # 3) guardar en el caché para la próxima (no frena la respuesta si falla)
        if use_cache:
            await _tts_cache_put(client, key, audio)
    return Response(content=audio, media_type="audio/mpeg",
                    headers={"X-TTS-Cache": "miss" if use_cache else "off"})


# ----------------------------------------------------------------------------
@app.post("/stt")
async def stt(req: STTRequest):
    """Transcribe audio con Gemini. Más confiable que Web Speech API en iOS."""
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY no está configurada en el Space")
    if not req.audio_base64:
        raise HTTPException(400, "Audio vacío")

    body = {
        "contents": [{
            "parts": [
                {"text": "Transcribí literalmente lo que se dice en este audio en español rioplatense. "
                         "Devolvé SOLO el texto transcripto, sin comillas, sin comentarios, sin nada más. "
                         "Si el audio está en silencio o no se entiende, devolvé una cadena vacía."},
                {"inline_data": {"mime_type": req.mime_type, "data": req.audio_base64}}
            ]
        }],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 256}
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await _post_with_retry(client, f"{GEMINI_GENERATE}?key={GEMINI_API_KEY}", body,
                                   {"Content-Type": "application/json"})
        if r.status_code == 429:
            # cupo/ráfaga: no rompemos; el front lo trata como "no te entendí" y reintenta
            return {"text": "", "busy": True}
        if r.status_code != 200:
            raise HTTPException(r.status_code, f"Gemini STT error: {r.text[:500]}")
        data = r.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError):
            text = ""
        return {"text": text}


# ----------------------------------------------------------------------------
@app.post("/feedback")
async def feedback(req: FeedbackRequest):
    """Guarda la valoración del comensal en Supabase.
    Tolerante: si Supabase no está configurado o falla, NO rompe la demo
    (el frontend igual agradece y guarda una copia local en el dispositivo).
    """
    def _clamp(v):
        try:
            return max(1, min(5, int(v))) if v is not None else None
        except (TypeError, ValueError):
            return None
    row = {
        "restaurant_id": RESTAURANT_ID,
        "table_number": (req.table or None),
        "stars_mesera": _clamp(req.stars_mesera if req.stars_mesera is not None else req.stars),
        "stars_restaurante": _clamp(req.stars_restaurante),
        "stars_quantumhive": _clamp(req.stars_quantumhive),
        "comment": (req.comment or None),
        "order_items": req.order_items,
    }

    if not (SUPABASE_URL and SUPABASE_KEY):
        return {"ok": True, "stored": False, "reason": "supabase_no_configurado"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/{SUPABASE_FEEDBACK_TABLE}",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json=row,
            )
        if r.status_code in (200, 201, 204):
            return {"ok": True, "stored": True}
        return {"ok": True, "stored": False, "reason": f"supabase_{r.status_code}", "detail": r.text[:300]}
    except Exception as e:  # noqa: BLE001 — nunca tirar 500 por el feedback
        return {"ok": True, "stored": False, "reason": "excepcion", "detail": str(e)[:300]}


# ----------------------------------------------------------------------------
@app.post("/order")
async def order(req: OrderRequest):
    """Envío INTERNO del pedido al local — el comensal NO sale de la app.
    Si hay canal configurado (Telegram), manda el pedido; si no, queda recibido.
    """
    msg = req.text or f"Pedido — Mesa {req.table or '?'}"
    sent = False
    if TELEGRAM_TOKEN and ORDER_CHAT_ID:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                    json={"chat_id": ORDER_CHAT_ID, "text": msg, "parse_mode": "Markdown"},
                )
            sent = r.status_code == 200
        except Exception:
            sent = False
    return {"ok": True, "sent": sent}
