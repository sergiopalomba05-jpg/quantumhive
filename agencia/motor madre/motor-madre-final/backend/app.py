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
import asyncio
from google import genai
from google.genai import types
import base64

import base64
import asyncio
import hashlib
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from html import escape as _esc

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse, JSONResponse, HTMLResponse, FileResponse
from pydantic import BaseModel

# ============================================================================
# Configuración — todo desde env vars (las setea el Space)
# ============================================================================
GEMINI_MODEL        = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
# Gemini admite VARIAS keys (free tier) para repartir el límite por minuto: GEMINI_API_KEY (compat)
# + GEMINI_KEY_1, GEMINI_KEY_2, … GEMINI_KEY_8. Cada key es un "carril" propio; el cerebro rota entre
# todos en round-robin (ver _brain_order) → con N keys multiplicás por N el cupo por minuto antes de
# que se sature. Beta gratis; en producción se reemplaza por una paga.
def _collect_gemini_keys() -> List[str]:
    names = ["GEMINI_API_KEY"] + [f"GEMINI_KEY_{i}" for i in range(1, 9)]
    keys: List[str] = []
    for n in names:
        v = os.environ.get(n, "").strip()
        if v and v not in keys:
            keys.append(v)
    return keys
GEMINI_KEYS        = _collect_gemini_keys()
GEMINI_API_KEY     = GEMINI_KEYS[0] if GEMINI_KEYS else ""   # compat: 1ª key para usos directos (/stt)
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
# Cerebros gratis con ROUND-ROBIN + failover. Si BRAIN_CHAIN está vacío, se arma solo con los que
# tengan key (orden base: groq → gemini[todas sus keys] → openrouter → huggingface). Cada request
# ARRANCA en el siguiente carril (reparte la carga para no quemar el cupo por minuto de uno) y, si
# ese falla, cae por el resto (failover). Beta gratis; en producción se mete una key paga y listo.
GROQ_API_KEY       = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_MODEL         = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_URL           = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL   = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free").strip()
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
# HuggingFace como cerebro vía su router compatible con OpenAI (mismo formato que Groq/OpenRouter).
HF_TOKEN           = os.environ.get("HF_TOKEN", "").strip()
HF_MODEL           = os.environ.get("HF_MODEL", "meta-llama/Llama-3.3-70B-Instruct").strip()
HF_URL             = os.environ.get("HF_URL", "https://router.huggingface.co/v1/chat/completions").strip()
# DeepInfra (PAGA) — motor PRINCIPAL: sin techo diario ni límite por minuto apretado de las gratis →
# contesta siempre (mata el "estoy con mucha gente"). OpenAI-compatible. La key va SOLO a env vars del Space.
DEEPINFRA_API_KEY  = os.environ.get("DEEPINFRA_API_KEY", "").strip()
DEEPINFRA_MODEL    = os.environ.get("DEEPINFRA_MODEL", "Qwen/Qwen2.5-72B-Instruct").strip()
DEEPINFRA_URL      = os.environ.get("DEEPINFRA_URL", "https://api.deepinfra.com/v1/openai/chat/completions").strip()
STT_CHAIN          = os.environ.get("STT_CHAIN", "deepinfra,gemini").strip()
DEEPINFRA_STT_MODEL = os.environ.get("DEEPINFRA_STT_MODEL", "openai/whisper-large-v3").strip()
DEEPINFRA_STT_URL   = os.environ.get("DEEPINFRA_STT_URL", f"https://api.deepinfra.com/v1/inference/{DEEPINFRA_STT_MODEL}").strip()
# VOZ en DeepInfra (Kokoro-82M): ~150ms y $0.62/1M caracteres (≈ gratis) → reemplaza a MiniMax (misma
# infra que el cerebro, un solo proveedor). Reusa DEEPINFRA_API_KEY. Probado: el que clona (Chatterbox)
# es 7-10s = inusable; Kokoro vuela. Voz española neutra (la clonación argentina = futuro, F5 self-host).
DEEPINFRA_TTS_MODEL = os.environ.get("DEEPINFRA_TTS_MODEL", "hexgrad/Kokoro-82M").strip()
DEEPINFRA_TTS_VOICE = os.environ.get("DEEPINFRA_TTS_VOICE", "ef_dora").strip()   # voz española femenina (mesera)
DEEPINFRA_TTS_URL   = os.environ.get("DEEPINFRA_TTS_URL", "https://api.deepinfra.com/v1/inference").strip().rstrip("/")
# Motor de Voz propio de QuantumHive (Chatterbox en Modal, voz clonada argentina + volumen normalizado).
# Si VOZTTS_URL está seteada, es la voz PRINCIPAL de la carta; si falla, cae a DeepInfra/Kokoro.
VOZTTS_URL   = os.environ.get("VOZTTS_URL", "").strip().rstrip("/")
VOZTTS_TOKEN = os.environ.get("VOZTTS_TOKEN", "").strip()
VOZTTS_VOICE = os.environ.get("VOZTTS_VOICE", "mesera-arg").strip()
VOZTTS_EXAG  = float(os.environ.get("VOZTTS_EXAG", "0.85"))   # expresividad/personalidad de la voz (modula)
VOZTTS_CFG   = float(os.environ.get("VOZTTS_CFG", "0.3"))   # id de la voz del cliente en el motor
# Proveedores que hablan el dialecto OpenAI (Bearer + /chat/completions): URL por nombre. Gemini va aparte.
_OPENAI_URLS       = {"groq": GROQ_URL, "openrouter": OPENROUTER_URL, "huggingface": HF_URL, "deepinfra": DEEPINFRA_URL}
MAX_HISTORY_TURNS  = int(os.environ.get("MAX_HISTORY_TURNS", "8"))  # 8 ≈ 4 intercambios (contexto para que mantenga la charla)

# MiniMax T2A v2 — MINIMAX_API_KEY va SOLO en env vars del Space, nunca al repo.
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "").strip()
MINIMAX_VOICE   = os.environ.get("MINIMAX_VOICE", "Spanish_FrankLady").strip()
MINIMAX_MODEL   = os.environ.get("MINIMAX_MODEL", "speech-02-turbo").strip()  # turbo = menor latencia
MINIMAX_API_BASE = os.environ.get("MINIMAX_API_BASE", "https://api.minimax.io").strip().rstrip("/")
try:
    MINIMAX_SPEED = float(os.environ.get("MINIMAX_SPEED", "1.2"))   # 1.2 = ágil sin atropellarse
except ValueError:
    MINIMAX_SPEED = 1.2
try:
    MINIMAX_VOL = float(os.environ.get("MINIMAX_VOL", "3.5"))       # 1.0 normal · subí/bajá si satura (hasta 10)
except ValueError:
    MINIMAX_VOL = 3.5

# VOZ PLUGGABLE — cadena de proveedores TTS con fallback (misma idea que BRAIN_CHAIN).
# TTS_CHAIN: orden de prioridad "minimax,elevenlabs,cartesia". Se prueba el primero; si tira
# error de cuota/servidor/red (Exception), rota al siguiente. Vacío = se arma solo con los
# proveedores que tengan su key (orden por defecto: minimax → elevenlabs → cartesia).
# Cada proveedor trae su propia voz/modelo por su env (no se mezclan). El TTS_CACHE aplica a todos.
TTS_CHAIN           = os.environ.get("TTS_CHAIN", "").strip()
# ElevenLabs — ELEVENLABS_API_KEY va SOLO en env vars del Space, nunca al repo.
ELEVENLABS_API_KEY  = os.environ.get("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_VOICE    = os.environ.get("ELEVENLABS_VOICE", "EXAVITQu4vr4xnSDxMaL").strip()  # voz multilingüe por defecto
ELEVENLABS_MODEL    = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2").strip()
ELEVENLABS_API_BASE = os.environ.get("ELEVENLABS_API_BASE", "https://api.elevenlabs.io").strip().rstrip("/")
# Cartesia — CARTESIA_API_KEY va SOLO en env vars del Space, nunca al repo.
CARTESIA_API_KEY    = os.environ.get("CARTESIA_API_KEY", "").strip()
CARTESIA_VOICE      = os.environ.get("CARTESIA_VOICE", "").strip()   # voice_id de Cartesia (obligatorio si se usa)
CARTESIA_MODEL      = os.environ.get("CARTESIA_MODEL", "sonic-2").strip()
CARTESIA_API_BASE   = os.environ.get("CARTESIA_API_BASE", "https://api.cartesia.ai").strip().rstrip("/")
CARTESIA_VERSION    = os.environ.get("CARTESIA_VERSION", "2024-11-13").strip()  # header obligatorio; override por env
# Voces compatibles para LEER cache ya existente. Sirve al migrar de cuenta/key/voice_id sin regrabar todo.
# La primera que aparezca se prueba primero. CARTESIA_VOICE siempre se agrega al final para generar lo nuevo.
CARTESIA_CACHE_READ_VOICES = os.environ.get("CARTESIA_CACHE_READ_VOICES", "").strip()

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
# Caché de respuestas del flujo guiado (chips): la pregunta de un chip es fija, así que la respuesta
# del LLM se guarda una vez y se reproduce $0. Solo aplica a mensajes "guided" (no a preguntas libres).
RESPUESTAS_CACHE = os.environ.get("RESPUESTAS_CACHE", "1").strip().lower() in ("1", "true", "yes", "si", "sí")
RESPUESTAS_TABLE = os.environ.get("RESPUESTAS_TABLE", "respuestas_cache").strip()
# Variantes rotativas: cuántas respuestas distintas se guardan por pregunta guiada. La mesera rota
# entre ellas (no repite siempre lo mismo) y todas quedan cacheadas → variedad sin gastar de más.
try:
    RESPUESTAS_VARIANTES = max(1, int(os.environ.get("RESPUESTAS_VARIANTES", "3")))
except ValueError:
    RESPUESTAS_VARIANTES = 3
# Pre-warming OFF por defecto: al arrancar dispara llamadas al LLM que pueden saturar la cuota por
# minuto de Gemini (free) y dejar a los clientes sin respuesta. Prenderlo (PREWARM=1) solo para
# "entrenar" el caché una vez; corre espaciado para no agotar la cuota.
PREWARM = os.environ.get("PREWARM", "").strip().lower() in ("1", "true", "yes", "si", "sí")
# Memoria de clientes (Plan Premium): reconoce al comensal que vuelve (por device_id). Default OFF
# → el Plan Básico NO recuerda nada. Aislada por restaurant_id.
MEMORIA        = os.environ.get("MEMORIA", "").strip().lower() in ("1", "true", "yes", "si", "sí")
CLIENTES_TABLE = os.environ.get("CLIENTES_TABLE", "clientes").strip()
# Métricas de la demo: registra eventos de interacción (entrada, plato, chat, pedido) en la tabla
# eventos. Default off. Aislado por restaurant_id. Tolerante (nunca frena ni rompe la app).
METRICAS       = os.environ.get("METRICAS", "").strip().lower() in ("1", "true", "yes", "si", "sí")
EVENTOS_TABLE  = os.environ.get("EVENTOS_TABLE", "eventos").strip()

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

EMBEDDED_INDEX_HTML = ""


# ============================================================================
# System prompt builder — convierte menu.json en instrucciones para Sol
# ============================================================================
def _format_price(p: Optional[int], symbol: str = "$") -> str:
    """Formatea precio en palabras para que la voz lo lea bien.
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


# ============================================================================
# GUIÓN DEL AUTOGUIADO (determinístico) — base del cache pregrabado plato-por-plato.
# El autoguiado NO improvisa: cada plato dice SIEMPRE el mismo texto, así su MP3 se pregraba UNA vez
# y después es $0/instantáneo, con la pronunciación ya revisada. Es la MISMA fuente para /guion (lo
# que pide el front) y /pregrabar (lo que se cachea) → el texto, y por ende la key del cache,
# coinciden exacto, y el front siempre pega cache hit.
# ============================================================================
def _texto_tts_plato(it: dict, symbol: str = "$") -> str:
    """Lo que la mesera DICE de un plato en el autoguiado: nombre, descripción y precio. Si el item
    trae 'tts', se usa ese texto tal cual (override para corregir pronunciación puntual de un plato
    sin tocar la descripción que se ve en pantalla)."""
    override = (it.get("tts") or "").strip()
    if override:
        return override
    name = (it.get("name") or "").strip().rstrip(".")
    desc = (it.get("description") or "").strip().rstrip(".")
    precio = _format_price(it.get("price"), symbol)
    partes = [p for p in (name, desc) if p]
    partes.append(precio)
    return ". ".join(partes) + "."


def _build_categorias_autoguiado() -> List[Dict[str, Any]]:
    data = json.loads(EMBEDDED_MENU_JSON)
    symbol = (data.get("restaurant") or {}).get("currency_symbol", "$")
    categorias = []
    for grupo in ("menu", "drinks"):
        for section in data.get(grupo, []):
            platos = []
            for it in section.get("items", []):
                did = (it.get("id") or "").strip()
                nombre = (it.get("name") or "").strip()
                if not did or not nombre:
                    continue   # sin id no se puede resaltar de forma determinística
                platos.append({
                    "dish_id": did,
                    "chip": nombre,
                    "texto_tts": _texto_tts_plato(it, symbol),
                })
            if platos:
                categorias.append({
                    "id": (section.get("id") or "").strip(),
                    "nombre": (section.get("name") or "").strip(),
                    "grupo": grupo,
                    "platos": platos,
                })
    return categorias


def _platos_por_id(categorias: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for cat in categorias:
        for p in cat.get("platos", []):
            did = (p.get("dish_id") or "").strip()
            if did:
                out[did] = p
    return out


def build_flujos_guiados() -> dict:
    """Flujos determinísticos de los 4 chips principales. No llaman al LLM: son playlists de
    frases puente + platos existentes, todas pregrabables por /pregrabar."""
    platos = _platos_por_id(_build_categorias_autoguiado())

    def puente(texto: str) -> Dict[str, str]:
        return {"tipo": "puente", "texto_tts": texto}

    def plato(dish_id: str) -> Dict[str, str]:
        p = platos[dish_id]
        return {"tipo": "plato", "dish_id": dish_id, "chip": p["chip"], "texto_tts": p["texto_tts"]}

    return {
        "¿Cuál es la especialidad de la casa?": {
            "items": [
                puente("Te recomiendo dos bien de la casa."),
                plato("bbq_ribs"),
                puente("Y si querés algo bien jugoso a la leña, mirá este."),
                plato("rib_eye"),
                puente("¿Cuál te tienta más?"),
            ],
            "chips": ["Costillas BBQ 500gr", "Ojo de Bife 400gr", "¿Algo para tomar?", "Más opciones"],
        },
        "¿Qué tenés para picar?": {
            "items": [
                puente("Para picar, iría por estas opciones."),
                plato("spinach_dip"),
                puente("Otra que funciona muy bien para compartir es esta."),
                plato("kansas_rolls"),
                puente("¿Te agrego alguna?"),
            ],
            "chips": ["Dip de Espinaca y Queso", "Arrolladitos de Pollo y Verduras", "Mini Nachos", "Más opciones"],
        },
        "Recomendame un vino": {
            "items": [
                puente("Para acompañar la comida, te marco estas opciones."),
                plato("baron_b"),
                puente("Y si preferís blanco, este va muy bien."),
                plato("santa_julia_sauv"),
                puente("¿Querés que te muestre otra bebida?"),
            ],
            "chips": ["Baron B Cuvée Spéciale", "Santa Julia Sauvignon Blanc", "Con alcohol", "Sin alcohol"],
        },
        "¿Qué postre me recomendás?": {
            "items": [
                puente("Para cerrar, te recomiendo estos postres."),
                plato("kansas_cheesecake"),
                puente("Y si querés algo más goloso, este es tremendo."),
                plato("going_bananas"),
                puente("¿Con cuál cerramos?"),
            ],
            "chips": ["Cheesecake de la Casa", "Banana Split", "Café", "Así está bien"],
        },
    }


def build_guion_autoguiado() -> dict:
    """Guión determinístico del autoguiado, derivado del menú embebido. Por plato:
      dish_id   → id del item (para resaltarlo en la carta SIN detección frágil)
      chip      → nombre visible (el botón)
      texto_tts → lo que dice la mesera (lo que se pregraba y lo que el front pide a /tts)
    Única fuente: /guion se lo da al front y /pregrabar genera su audio con el MISMO texto."""
    return {"restaurant_id": RESTAURANT_ID, "categorias": _build_categorias_autoguiado(), "flujos": build_flujos_guiados()}


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

IDIOMA (REGLA ABSOLUTA, ANTES QUE TODO): hablás SIEMPRE en español rioplatense argentino. JAMÁS escribís una sola palabra en portugués ni en ningún otro idioma, aunque el cliente te hable en portugués o en otro idioma. Ante cualquier duda, es español argentino.

CÓMO RESPONDÉS — REGLA DE ORO:
Directa, concreta y vendedora. Recomendás con seguridad y guiás la venta DE A UN PASO: te enfocás en UNA categoría por turno (la entrada, o la carne, o la bebida...), y dentro de esa categoría SIEMPRE tirás 2 o 3 opciones con una pincelada apetitosa de cada una — NUNCA una sola (salvo que el cliente pida algo muy puntual, ej. "el ojo de bife"). Dejás que el cliente la elija o la agregue, y RECIÉN AHÍ ofrecés el siguiente paso (bebida, postre). Nunca amontonás plato + bebida + postre en una sola respuesta. Prohibido arrancar con "mmm", "a ver" o repetir la pregunta del cliente.

SI TE PIDEN VARIAS COSAS JUNTAS (ej. "recomendame una carne y un vino", o "un postre y el menú infantil"): resolvés EN ORDEN, de a una. Primero la carne: tirás dos o tres opciones y esperás a que el cliente elija o la agregue (cerrás con algo tipo "¿cuál preferís?" o "¿te apetece alguna?"), SIN nombrar el vino todavía. Recién cuando ya eligió la carne, en tu PRÓXIMA respuesta pasás al vino. Una cosa por turno.
PROHIBIDO ABSOLUTO: si decís que algo lo ven "después", "más tarde" o "ahora vemos lo otro" (ej. "después vemos el menú infantil para tu hijo"), entonces en ESE turno NO lo desarrollás, NO lo describís y NO tirás sus opciones — lo dejás de verdad para tu PRÓXIMA respuesta, recién cuando el cliente cerró lo primero. Decir "después vemos X" y en el mismo turno desarrollar X es el error más grave: NO lo hagas. Lo que queda pendiente lo dejás como chip para que el cliente lo toque cuando quiera avanzar.

SOBRE LOS PRECIOS — LEÉS AL CLIENTE:
No cantás precios de entrada: recomendás por el plato, no por el número. Después de recomendar, si el cliente parece indeciso o está comparando opciones, le ofrecés con naturalidad: "¿te paso los precios o preferís elegir primero?". Si el cliente pregunta precios directamente, se los das al toque y se los seguís dando en el resto de la charla (ese cliente mira el bolsillo). Si nunca pregunta, no los mencionás (ese cliente elige por gusto). Te adaptás al perfil.
Cuando digas un precio, SIEMPRE en palabras: "veintisiete mil pesos", jamás "$27.000".
NUNCA digas el TOTAL del pedido ni sumes precios de memoria (te equivocás con la cuenta): el total exacto lo muestra la app sola en la ventana del pedido. Podés decir el precio SUELTO de cada cosa si te lo piden, pero el total no lo calcules ni lo cantes vos — si te preguntan cuánto da todo, decí algo como "te lo muestro en pantalla con el total exacto".

Ejemplos del ESTILO y el tono (los platos de acá son genéricos, SOLO para mostrarte CÓMO hablás — NO son tu carta; vos nombrás SIEMPRE los platos reales de la carta de abajo):

Cliente: "recomendame algo rápido y rico"
Vos: "Te tiro tres que salen al toque y no fallan: una bien clásica, otra para picar y compartir, y una más contundente. ¿Cuál te suena, o querés que te cuente alguna?"

Cliente: "recomendame una carne y un vino"
Vos: "Arranquemos por la carne. Tengo tres que vuelan: una bien jugosa y tierna, otra con más carácter, y una contundente para los de buen diente. ¿Cuál preferís, o querés que te dé más opciones?"
(NO nombrás el vino todavía: esperás a que elija la carne. Recién en tu PRÓXIMA respuesta, cuando ya la eligió, le ofrecés el vino.)

Cliente: "¿y cuánto está eso?"
Vos: "La entrada está dieciocho mil pesos, la limonada seis mil ochocientos y el postre diecisiete mil. Buen plan completo. ¿Te lo armo así?"

Fijate el patrón: UNA categoría por turno, pero SIEMPRE 2 o 3 opciones de esa categoría (nunca una sola), esperás que el cliente elija o agregue antes de pasar al siguiente paso de la comanda, y los precios solo cuando el cliente los pide o cuando dudás que esté decidido — ahí los ofrecés, no los imponés.

REGLAS DURAS:
- Nunca decís que sos una IA o un bot. Sos la mesera.
- Nunca inventás precios. Si no está en la carta: "ese te lo confirma el mozo".
- Precios siempre en palabras cuando los digas.
- Los pesos y medidas decilos en palabras completas ("quinientos gramos"), nunca "gr" ni "500gr".
- Nunca emojis.
- NUNCA uses markdown: nada de asteriscos (*) ni negritas, ni almohadillas (#), ni listas numeradas (1. 2. 3.) o con guiones. Escribís en prosa natural, hablado, como una persona — la voz lee TODO lo que pongas (un "**" lo diría como "asterisco asterisco").
- Hablás de vos (tenés, querés, podés), porteña natural y amable.
- Si piden TODA la carta: "la tenés completa en pantalla — decime de qué tenés ganas y te tiro la posta".
- UNA categoría por turno SIEMPRE: si dijiste "después vemos X", X no aparece hasta el próximo turno. Esperás la elección del cliente antes de avanzar — no te adelantes nunca.
- IDIOMA: hablás SIEMPRE en español rioplatense (argentino). JAMÁS en portugués ni en ningún otro idioma, aunque el cliente te escriba en portugués, inglés o lo que sea. Pase lo que pase, vos contestás en castellano argentino.
- SOLO LO QUE ESTÁ EN LA CARTA: los platos, bebidas y vinos nombrados en los EJEMPLOS de arriba (Ojo de Bife, Saint Felicien, Salmón, Trapiche, etc.) son SOLO para mostrarte el ESTILO — NO son tu carta. Recomendás y nombrás ÚNICAMENTE lo que figure EXACTO en la carta de abajo. Si un plato o un vino no está en esa carta, para vos NO existe: no lo recomendás, no lo nombrás y no lo inventás. Ante la duda, mirá la carta de abajo.

Tu carta completa con todos los precios está abajo (para cuando te los pidan).""")
    lines.append("")

    # Tono/personalidad por carta (opcional): adapta el registro al tipo de local (parrilla casera,
    # cervecería casual/joven, sushi sobrio…). Si no se define, queda el tono cálido/porteño de arriba.
    personalidad = (assistant.get("personalidad") or "").strip()
    if personalidad:
        lines.append("TONO PROPIO DE ESTE RESTAURANTE (mantené todo lo de arriba, pero adaptá tu registro a esto):")
        lines.append(personalidad)
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
- NO REPITAS lo que ya cargaste: en "add" va SOLO lo nuevo. Mirá la lista del pedido — si algo YA está, NO lo vuelvas a poner en #PEDIDO# (el sistema lo duplicaría) y tampoco lo vuelvas a OFRECER. Si el cliente pide agregar algo que ya tiene, NO lo dupliques en silencio: primero avisá hablando "Ya tenés un café, ¿querés otro más o seguimos?" (con chips ["Sí, otro","No, sigamos"]) y recién si confirma que quiere MÁS lo sumás.
- Si el cliente NO te pidió tocar el pedido (es solo charla o una pregunta), NO pongas la línea #PEDIDO#.
- Siempre que cargues algo, confirmáselo hablando con naturalidad ("Listo, te sumé una limonada y dos tiras de pollo, ¿algo más?"). El cambio real lo hace la línea técnica, así que cuando confirmás un cambio, la línea SIEMPRE tiene que estar.
- Si te piden "armame el pedido con lo que me recomendaste", meté en "add" lo que vos recomendaste recién.

SUGERENCIAS DE SEGUIMIENTO — otra línea técnica invisible:
Casi siempre que termines de responder, ofrecé de 2 a 4 atajos cortos para que el cliente siga, con esta línea (TAMBIÉN invisible, va al final, después del #PEDIDO# si lo hubiera):
#CHIPS# ["texto corto 1","texto corto 2","texto corto 3"]
- Son frases cortas en primera persona del cliente, como botones. Máximo 4, idealmente de 2 a 4 palabras. NUNCA las leas en voz alta.
- CUANDO RECOMENDÁS UN PLATO O COMBO CONCRETO: cerrá hablando con algo tipo "¿Te lo agrego al pedido o preferís ver otra opción?" y poné chips de ACCIÓN: ["Sí, agregalo","Otra opción"] (o "Sí, el combo" / "Mostrame otra"). Si el cliente después toca "Sí, agregalo" / "Sí, el combo", en tu PRÓXIMA respuesta agregás al pedido lo que acababas de recomendar (con la línea #PEDIDO#).
- CUANDO OFRECÉS VARIAS OPCIONES (2 o 3 platos de una categoría — el caso normal): los chips son ESAS opciones para elegir + un "Más opciones", ej. ["El ojo de bife","El bife de chorizo","Más opciones"]. Si el cliente toca "Más opciones" / "Mostrame otra", en tu PRÓXIMA respuesta mostrá platos DISTINTOS de los que ya nombraste (no repitas ninguno) y poné ESOS nuevos como chips — nunca devuelvas el mismo set de chips dos veces seguidas.
- Si mostraste varias cosas o ya cargaste algo, sugerí el siguiente paso: bebida, postre, etc. Ej: ["¿Y para tomar?","Un postre rico","Algo más liviano"].
- SI HACÉS UNA PREGUNTA CON OPCIONES (ej. "¿con o sin alcohol?", "¿tinto o blanco?", "¿copa o botella?", "¿una o dos porciones?"): los chips son EXACTAMENTE esas opciones, para que el cliente toque y siga guiado. Ej. ["Con alcohol","Sin alcohol"], ["Tinto","Blanco"], ["Por copa","Por botella"]. NUNCA dejes una pregunta sin sus opciones como chips.
- GUIÁ HASTA CERRAR EL PEDIDO: después de cada cosa que el cliente elige o agrega, ofrecé SIEMPRE el siguiente paso con chips (picada/entrada → plato principal → para tomar → postre → cerrar el pedido). Nunca vuelvas a fojas cero ni sueltes al cliente: llevalo paso a paso hasta "¿Cerramos el pedido?". Cada turno tuyo termina con chips para avanzar.
- SI EL CLIENTE PIDIÓ VARIAS COSAS (ej. "recomendá un pescado y después un pollo") y vos resolviste SOLO la primera: los chips TIENEN que dejar las dos salidas a la vista → una o dos opciones para elegir de lo que mostraste, MÁS un chip para avanzar a lo que pidió después. Ej. tras recomendar pescados: ["El salmón grillado","Otro pescado","Ahora el pollo"]. Así el cliente ve el "¿qué sigue?" como botón y no se queda trabado en el pescado.

Ejemplo del FORMATO (los nombres van EXACTOS como figuran en tu carta; los de acá son genéricos de muestra):
Cliente: "agregame una gaseosa y dos porciones de la entrada"
Vos: "¡Hecho! Te sumé una gaseosa y dos porciones de la entrada. ¿Te tiro algún postre para cerrar?
#PEDIDO# {"add":[{"name":"Gaseosa","qty":1},{"name":"Entrada","qty":2}],"remove":[],"clear":false}
#CHIPS# ["Un postre rico","¿Y para tomar?","Algo más liviano"]

CERRAR EL PEDIDO — otra línea técnica invisible:
Cuando el cliente diga que ya está, que es todo, "cerrá el pedido", "la cuenta", "nada más", "listo",
RECITÁ el pedido completo con calidez (ej. "¡Buenísimo! Te queda entonces: dos empanadas, un ojo de bife y
una limonada. Ya te lo confirmo en pantalla.") y agregá al final esta línea sola (NUNCA la leas en voz alta):
#CUENTA#
AL RECITAR: nombrá EXACTAMENTE los ítems y cantidades que figuran en "LO QUE EL CLIENTE YA TIENE EN EL
PEDIDO" (te lo paso más abajo) — NUNCA inventes, agregues ni nombres algo que no esté en esa lista.
Eso le abre la ventana del pedido para que lo confirme y lo mande al mozo. Ponela SOLO cuando el cliente
quiere cerrar, no en cada respuesta.\"""")
    lines.append("")

    # cerrar-vs-agregar + bebida guiada por tipo
    lines.append('''CERRAR vs AGREGAR (clave): si el cliente dice "así está bien", "listo", "nada más", "eso es todo" o toca
un chip así, eso significa CERRAR el pedido → poné #CUENTA# y NO agregues ni recomiendes nada nuevo en
ese turno.

BEBIDA — GUIÁ POR PASOS (no saltes directo a una sección): cuando ofrezcas algo para tomar, primero
preguntá CON o SIN alcohol, con chips ["Con alcohol","Sin alcohol"]. Cuando el cliente elija con o sin
alcohol, si tu carta tiene VARIAS secciones de ese tipo (con alcohol suele haber cervezas, vinos,
espumantes, tragos; sin alcohol: gaseosas, jugos, aguas), preguntá PRIMERO qué tipo prefiere, con chips de
esas secciones REALES de tu carta (ej. ["Una cerveza","Un vino","Un trago"]), y RECIÉN cuando elige el
tipo le tirás 2 o 3 opciones de ESA sección. Si de ese tipo hay una sola opción en la carta, ofrecésela
directo. NUNCA mezcles con alcohol y sin alcohol en la misma tanda.''')
    lines.append("")

    # Preferencias/restricciones del cliente (#NOTA#) — memoria
    lines.append('''PREFERENCIAS DEL CLIENTE (#NOTA#) — otra línea técnica invisible:
Si el cliente menciona algo que conviene RECORDAR para no errarle —una restricción ("soy diabético",
"soy celíaco", "soy alérgico al maní", "soy vegetariano/vegano", "no como cerdo") o un gusto fuerte
("me encanta el picante", "odio el cilantro")— agregá al final esta línea invisible:
#NOTA# ["diabético — evitar azúcar y postres dulces"]
- Anotá lo IMPORTANTE en pocas palabras, con la implicancia si la tiene. Es INVISIBLE: NUNCA la leas.
- Y RESPETALA YA en este mismo turno: a un diabético no le ofrecés postres azucarados, a un celíaco no le
  ofrecés algo con TACC, a un vegetariano no le ofrecés carne, etc.
- Solo cuando el cliente DICE una preferencia/restricción nueva; si no, no pongas #NOTA#.

NUNCA inventes datos del cliente (su nombre, lo que pidió antes, sus gustos) que no figuren explícitamente
más abajo. Si no sabés algo del cliente, no lo adivines.''')
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
            desc = (it.get("description", "") or "").strip()
            if len(desc) > 90:                       # recorte SOLO para el prompt (la carta visual no cambia)
                desc = desc[:88].rsplit(" ", 1)[0] + "…"
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
    lines.append("• IDIOMA: TODO en español rioplatense argentino. NI UNA palabra en portugués (ni 'você', 'obrigada', 'comida deliciosa' a la portuguesa, nada). Si algo te sale en portugués, corregilo a castellano ANTES de mandar la respuesta.")
    lines.append("• El TOTAL del pedido NO lo decís ni lo sumás vos (te equivocás): la app lo muestra exacto en pantalla.")

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
    guided: bool = False                          # viene de un chip/flujo guiado → cacheable ($0)
    device_id: Optional[str] = None               # id anónimo del dispositivo (memoria/métricas)


class ClienteRequest(BaseModel):
    device_id: str
    nombre: Optional[str] = None
    ultimo_pedido: Optional[List[Dict[str, Any]]] = None
    gustos: Optional[List[str]] = None
    bump_visita: bool = False


class EventoRequest(BaseModel):
    tipo: str
    device_id: Optional[str] = None
    detalle: Optional[Dict[str, Any]] = None


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
    sugerencia: Optional[str] = None          # feedback de producto (demo): qué agregar/mejorar
    table: Optional[str] = None
    order_items: Optional[List[Dict[str, Any]]] = None


class OrderRequest(BaseModel):
    table: Optional[str] = None
    whatsapp: Optional[str] = None
    total: Optional[int] = None
    items: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None




# ============================================================================
# ENDPOINT WEBSOCKET: GEMINI LIVE API (MULTIMODAL EN TIEMPO REAL)
# ============================================================================
@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Intentar recibir la configuración inicial del negocio (system_instruction)
    # Si no llega en 3 segundos, usamos la de por defecto de la mesera.
    try:
        initial_msg = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
        config = json.loads(initial_msg)
        sys_prompt = config.get("system_instruction", SYSTEM_PROMPT)
    except Exception as e:
        sys_prompt = SYSTEM_PROMPT

    # Definimos la lógica de comunicación en una función interna para evitar duplicar código en el fallback
    async def run_live_loop(session):
        async def receive_from_client():
            try:
                bytes_count = 0
                while True:
                    data = await websocket.receive()
                    if "bytes" in data:
                        # Recibimos audio PCM (16kHz) desde el frontend
                        bytes_count += len(data["bytes"])
                        if bytes_count % 32000 == 0 or bytes_count < 10000:
                            print(f"[WebSocket] Recibidos {len(data['bytes'])} bytes de audio (total: {bytes_count})")
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=data["bytes"], 
                                mime_type="audio/pcm;rate=16000"
                            )
                        )
                    elif "text" in data:
                        print(f"[WebSocket] Recibido texto de cliente: {data['text']}")
                        try:
                            msg = json.loads(data["text"])
                            if "client_content" in msg:
                                print(f"[WebSocket] Enviando client_content a Gemini: {msg['client_content']}")
                                # Enviar texto oculto (prompt) al modelo en tiempo real
                                await session.send_client_content(
                                    turns=[types.Content(parts=[types.Part.from_text(
                                        text=msg["client_content"]
                                    )])]
                                )
                        except Exception as parse_e:
                            print("[WebSocket] Error parseando JSON de cliente:", parse_e)
            except WebSocketDisconnect:
                print("[WebSocket] Cliente desconectado.")
            except Exception as e:
                print("[WebSocket] Error cliente:", e)

        async def receive_from_gemini():
            try:
                async for response in session.receive():
                    server_content = response.server_content
                    if server_content is not None:
                        model_turn = server_content.model_turn
                        if model_turn is not None:
                            for part in model_turn.parts:
                                if part.inline_data is not None:
                                    # Audio PCM (24kHz nativo de Gemini) -> Enviar al frontend
                                    await websocket.send_bytes(part.inline_data.data)
                                elif part.text is not None:
                                    print(f"[WebSocket] Gemini texto: {part.text}")
                    if response.tool_call is not None:
                        print(f"[WebSocket] Gemini tool call recibida...")
                        # Gemini quiere ejecutar una herramienta
                        for function_call in response.tool_call.function_calls:
                            await websocket.send_text(json.dumps({
                                "type": "tool_call",
                                "name": function_call.name,
                                "args": function_call.args
                            }))
                            # Responder inmediatamente a Gemini que la tool fue ejecutada
                            await session.send_tool_response(
                                function_responses=[
                                    types.FunctionResponse(
                                        name=function_call.name,
                                        response={"status": "ok"}
                                    )
                                ]
                            )
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print("[WebSocket] Error Gemini:", e)

        # Handshake: notify client that session is ready
        print("[WebSocket] Enviando mensaje ready a cliente...")
        await websocket.send_text(json.dumps({"type": "ready"}))

        client_task = asyncio.create_task(receive_from_client())
        gemini_task = asyncio.create_task(receive_from_gemini())
        
        done, pending = await asyncio.wait(
            [client_task, gemini_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()

    # Declaramos algunas tools para probar el modo empleado virtual
    tools = [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="add_to_cart",
                    description="Agrega un producto al carrito de compras.",
                    parameters={
                        "type": "OBJECT",
                        "properties": {
                            "item_name": {"type": "STRING", "description": "Nombre del producto"},
                            "quantity": {"type": "INTEGER", "description": "Cantidad a agregar"}
                        },
                        "required": ["item_name", "quantity"]
                    }
                )
            ]
        )
    ]

    connected = False
    
    # Capa 1: Intentar usar Vertex AI con gemini-live-2.5-flash-native-audio (Consume los $1000 de créditos)
    try:
        VERTEX_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", os.environ.get("GCLOUD_PROJECT", "project-aa5fb956-b08a-4e13-869"))
        VERTEX_LOCATION = os.environ.get("VERTEX_LOCATION", "us-central1")
        client_vertex = genai.Client(
            vertexai=True,
            project=VERTEX_PROJECT,
            location=VERTEX_LOCATION,
        )
        model_vertex = "gemini-live-2.5-flash-native-audio"
        print(f"[WebSocket] Intentando conectar a Gemini Live en Vertex AI ({model_vertex})...")
        
        async with client_vertex.aio.live.connect(
            model=model_vertex,
            config=types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                system_instruction=types.Content(parts=[types.Part.from_text(text=sys_prompt)]),
                tools=tools
            )
        ) as session:
            print("[WebSocket] Conectado a Gemini Live API en Vertex AI con éxito.")
            connected = True
            await run_live_loop(session)
    except Exception as e_vertex:
        print("[WebSocket] Fallo de conexión a Vertex AI:", e_vertex)

    # Capa 2: Fallback a AI Studio si Vertex AI falla o da error 1008 (usando API key provista)
    if not connected:
        api_key_env = os.environ.get("GEMINI_API_KEY", "").strip()
        if api_key_env:
            try:
                client_studio = genai.Client(api_key=api_key_env)
                model_studio = "gemini-3.1-flash-live-preview"
                print(f"[WebSocket] Fallback: Intentando conectar a Gemini Live en AI Studio ({model_studio})...")
                
                async with client_studio.aio.live.connect(
                    model=model_studio,
                    config=types.LiveConnectConfig(
                        response_modalities=["AUDIO"],
                        system_instruction=types.Content(parts=[types.Part.from_text(text=sys_prompt)]),
                        tools=tools
                    )
                ) as session:
                    print("[WebSocket] Conectado a Gemini Live API en AI Studio con éxito.")
                    connected = True
                    await run_live_loop(session)
            except Exception as e_studio:
                print("[WebSocket] Fallo de conexión a AI Studio:", e_studio)

    if not connected:
        print("[WebSocket] No se pudo establecer conexión con ninguna plataforma de Gemini Live.")
        await websocket.close(code=1008, reason="No se pudo iniciar la sesión de Gemini Live")


from fastapi.staticfiles import StaticFiles
import os

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    # Mount the entire dist folder as /static to support Range requests (needed for mobile video)
    app.mount("/static", StaticFiles(directory=frontend_dist), name="static_dist")

@app.get("/")
async def root():
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(html)
    return HTMLResponse("<h1>Vite Frontend no construido</h1><p>Ejecuta npm run build en frontend</p>")

@app.get("/sol_video_nobg.mp4")
async def serve_video_nobg():
    # Redirect to StaticFiles mount so Range headers work (mobile video streaming)
    from starlette.responses import RedirectResponse
    return RedirectResponse("/static/sol_video_nobg.mp4")

@app.get("/sol_video.mp4")
async def serve_video():
    from starlette.responses import RedirectResponse
    return RedirectResponse("/static/sol_video.mp4")

@app.get("/menu.json")
async def menu():
    return Response(content=EMBEDDED_MENU_JSON, media_type="application/json")


@app.api_route("/health", methods=["GET", "HEAD"])   # HEAD: el ping de UptimeRobot ya no da 405
async def health():
    return {
        "ok": True,
        "gemini_key_set": bool(GEMINI_API_KEY),
        "gemini_keys": len(GEMINI_KEYS),       # cuántas keys de Gemini se rotan (GEMINI_API_KEY + GEMINI_KEY_n)
        "gemini_model": GEMINI_MODEL,
        "brain_lanes": len(BRAIN_CHAIN_PARSED),  # carriles totales (1 por key/proveedor)
        "brain_chain": [f"{p}:{m}" for p, m, _k in BRAIN_CHAIN_PARSED],  # sin keys (repo público)
        "brain_primary": ("deepinfra:" + DEEPINFRA_MODEL) if DEEPINFRA_API_KEY else ((BRAIN_CHAIN_PARSED[0][0] + ":" + BRAIN_CHAIN_PARSED[0][1]) if BRAIN_CHAIN_PARSED else None),
        "deepinfra_key_set": bool(DEEPINFRA_API_KEY),
        "stt_chain": STT_CHAIN_PARSED,
        "stt_primary": STT_CHAIN_PARSED[0] if STT_CHAIN_PARSED else None,
        "deepinfra_stt_model": DEEPINFRA_STT_MODEL,
        "groq_key_set": bool(GROQ_API_KEY),
        "openrouter_key_set": bool(OPENROUTER_API_KEY),
        "hf_key_set": bool(HF_TOKEN),
        "minimax_key_set": bool(MINIMAX_API_KEY),
        "elevenlabs_key_set": bool(ELEVENLABS_API_KEY),
        "cartesia_key_set": bool(CARTESIA_API_KEY),
        "tts_chain": TTS_CHAIN_PARSED,
        "tts_primary": TTS_CHAIN_PARSED[0] if TTS_CHAIN_PARSED else None,
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
    """Cadena de cerebros como (prov, model, key). Gemini se EXPANDE a todas sus keys (GEMINI_KEY_1,
    _2, …): cada una es un carril propio para el round-robin. Si BRAIN_CHAIN está vacío se arma solo
    con los proveedores que tengan key (orden base: groq → gemini[todas] → openrouter)."""
    def gem_lanes(model: str) -> List[tuple]:
        return [("gemini", model or GEMINI_MODEL, k) for k in GEMINI_KEYS]
    raw = BRAIN_CHAIN.strip()
    chain: List[tuple] = []
    if raw:
        for entry in raw.split(","):
            entry = entry.strip()
            if not entry:
                continue
            prov, _, model = entry.partition(":")
            prov = prov.strip().lower()
            model = model.strip()
            # cada proveedor solo entra si tiene su key (no rompe la cadena, simplemente se saltea)
            if prov == "deepinfra":
                if DEEPINFRA_API_KEY:
                    chain.append(("deepinfra", model or DEEPINFRA_MODEL, DEEPINFRA_API_KEY))
            elif prov == "groq":
                if GROQ_API_KEY:
                    chain.append(("groq", model or GROQ_MODEL, GROQ_API_KEY))
            elif prov == "openrouter":
                if OPENROUTER_API_KEY:
                    chain.append(("openrouter", model or OPENROUTER_MODEL, OPENROUTER_API_KEY))
            elif prov in ("huggingface", "hf"):
                if HF_TOKEN:
                    chain.append(("huggingface", model or HF_MODEL, HF_TOKEN))
            else:  # gemini → un carril por cada key
                chain.extend(gem_lanes(model))
    else:
        if DEEPINFRA_API_KEY:  chain.append(("deepinfra", DEEPINFRA_MODEL, DEEPINFRA_API_KEY))  # PRINCIPAL (pago)
        if GROQ_API_KEY:       chain.append(("groq", GROQ_MODEL, GROQ_API_KEY))
        chain.extend(gem_lanes(GEMINI_MODEL))
        if OPENROUTER_API_KEY: chain.append(("openrouter", OPENROUTER_MODEL, OPENROUTER_API_KEY))
        if HF_TOKEN:           chain.append(("huggingface", HF_MODEL, HF_TOKEN))
    if not chain and GEMINI_KEYS:
        chain.append(("gemini", GEMINI_MODEL, GEMINI_KEYS[0]))
    return chain


BRAIN_CHAIN_PARSED = _parse_brain_chain()


def _parse_stt_chain() -> List[str]:
    has = {"deepinfra": bool(DEEPINFRA_API_KEY), "gemini": bool(GEMINI_KEYS)}
    order: List[str] = []
    for entry in (STT_CHAIN or "deepinfra,gemini").split(","):
        prov = entry.strip().lower().split(":")[0].strip()
        if prov in has and prov not in order:
            order.append(prov)
    return [p for p in order if has.get(p)]


STT_CHAIN_PARSED = _parse_stt_chain()

# Round-robin: puntero que avanza un carril por request. Reparte la carga entre las keys/proveedores
# ANTES de toparse con el límite por minuto (en vez de quemar uno hasta el 429 y recién ahí rotar).
# Si el carril elegido igual falla, la llamada cae por el resto de la cadena (failover).
_brain_rr = 0
# Motor(es) PRINCIPAL(es) pago(s) (DeepInfra): arrancan SIEMPRE primero y fijos (no rotan) → confiables.
_PRIMARY_PROVS = {"deepinfra"}
# Carriles LENTOS / con cola (HF router, OpenRouter free): nunca arrancan el turno (sumaban ~30s de
# latencia cuando el round-robin caía ahí); quedan SOLO como respaldo al final, tras los rápidos.
_SLOW_PROVS = {"openrouter", "huggingface"}


def _brain_order() -> List[tuple]:
    """Orden para ESTE request: el motor PRINCIPAL pago (DeepInfra) SIEMPRE primero; después round-robin
    entre las rápidas gratis (Groq/Gemini) para repartir carga; al final las lentas gratis (HF/OpenRouter)
    como último respaldo. Así DeepInfra atiende casi todo y las gratis son red de seguridad."""
    global _brain_rr
    primary = [c for c in BRAIN_CHAIN_PARSED if c[0] in _PRIMARY_PROVS]
    fast = [c for c in BRAIN_CHAIN_PARSED if c[0] not in _PRIMARY_PROVS and c[0] not in _SLOW_PROVS]
    slow = [c for c in BRAIN_CHAIN_PARSED if c[0] in _SLOW_PROVS]
    if len(fast) <= 1:
        return primary + fast + slow
    i = _brain_rr % len(fast)
    _brain_rr = (_brain_rr + 1) % len(fast)
    return primary + fast[i:] + fast[:i] + slow


# Rotación independiente de las keys de Gemini para /stt (la transcripción también pega a Gemini).
_gemini_stt_rr = 0


def _next_gemini_key() -> str:
    global _gemini_stt_rr
    if not GEMINI_KEYS:
        return ""
    k = GEMINI_KEYS[_gemini_stt_rr % len(GEMINI_KEYS)]
    _gemini_stt_rr += 1
    return k


def _gemini_stt_key_order() -> List[str]:
    """Orden rotativo para STT: si una key está en ráfaga/cuota, probar las demás antes de rendirse."""
    global _gemini_stt_rr
    if not GEMINI_KEYS:
        return []
    start = _gemini_stt_rr % len(GEMINI_KEYS)
    _gemini_stt_rr += 1
    return GEMINI_KEYS[start:] + GEMINI_KEYS[:start]


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
            "\nReglas con esto:\n"
            "• NUNCA ofrezcas ni preguntes si agregar algo que YA está en esta lista (si ya tiene un "
            "café, NO le preguntes '¿te agrego un café?').\n"
            "• Si el cliente igual pide agregar algo que YA tiene, NO lo dupliques en silencio: primero "
            "avisá 'Ya tenés un café en el pedido, ¿querés otro más o seguimos?' con chips "
            "[\"Sí, otro\",\"No, sigamos\"]. Recién si confirma que quiere MÁS, lo sumás.\n"
            "• Avanzá al siguiente paso (bebida, postre, cerrar el pedido) en vez de repetir lo cargado.\n"
            "• Si el cliente CIERRA el pedido o pide la cuenta, recitá EXACTAMENTE esta lista (estos ítems y "
            "cantidades), sin agregar, sacar ni inventar nada que no esté acá.")


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


def _brain_request(prov: str, model: str, key: str, history: List[ChatTurn], message: str, sys_extra: str = ""):
    """(url, headers, body) para una llamada NO streaming al carril dado (prov/model/key)."""
    if prov in _OPENAI_URLS:
        return (_OPENAI_URLS[prov],
                {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                {"model": model, "messages": _openai_messages(history, message, sys_extra),
                 "temperature": 0.8, "max_tokens": 2048})
    return (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
            {"Content-Type": "application/json"},
            _gemini_chat_body(history, message, sys_extra))


def _brain_extract(prov: str, data: dict) -> str:
    if prov in _OPENAI_URLS:
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


async def _deepinfra_stt(client: httpx.AsyncClient, audio_bytes: bytes, mime_type: str) -> str:
    r = await client.post(
        DEEPINFRA_STT_URL,
        headers={"Authorization": f"Bearer {DEEPINFRA_API_KEY}"},
        files={"audio": ("audio.webm", audio_bytes, mime_type or "audio/webm")},
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"DeepInfra STT error: {r.text[:500]}")
    data = r.json()
    return ((data.get("text") or data.get("transcription") or "").strip())


async def _gemini_stt(client: httpx.AsyncClient, body: dict) -> str:
    last_status = 0
    last_text = ""
    for key in _gemini_stt_key_order():
        r = await _post_with_retry(client, f"{GEMINI_GENERATE}?key={key}", body,
                                   {"Content-Type": "application/json"})
        last_status = r.status_code
        last_text = r.text[:500]
        if r.status_code in (429, 503):
            continue
        if r.status_code != 200:
            raise HTTPException(r.status_code, f"Gemini STT error: {last_text}")
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError):
            return ""
    raise HTTPException(last_status or 503, f"Gemini STT error: {last_text}")


# ----------------------------------------------------------------------------
# Caché de respuestas del flujo guiado (chips) en Supabase. Tolerante: si falla o no está
# configurado, se genera con el LLM igual (nunca rompe). Solo cachea mensajes "guided".
def _resp_cache_on() -> bool:
    return False


def _resp_cache_key(message: str) -> str:
    raw = f"{RESTAURANT_ID}|{(message or '').strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _resp_cache_get(client: httpx.AsyncClient, key: str) -> Optional[str]:
    try:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{RESPUESTAS_TABLE}",
            params={"restaurant_id": f"eq.{RESTAURANT_ID}", "hash": f"eq.{key}",
                    "select": "respuesta", "limit": "1"},
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=8.0)
        if r.status_code == 200:
            rows = r.json()
            if rows:
                return ((rows[0] or {}).get("respuesta") or {}).get("raw")
    except Exception:
        pass
    return None


async def _resp_cache_put(client: httpx.AsyncClient, key: str, message: str, raw: str) -> None:
    if not (raw or "").strip():
        return
    if "#PEDIDO#" in raw:   # respuestas que agregan/sacan del carrito dependen del contexto → no cachear
        return
    try:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/{RESPUESTAS_TABLE}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                     "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"},
            json={"restaurant_id": RESTAURANT_ID, "hash": key,
                  "pregunta": (message or "")[:300], "respuesta": {"raw": raw}},
            timeout=8.0)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Memoria de clientes (Premium). Tolerante: si Supabase falla o no está, la mesera atiende igual.
def _memoria_on() -> bool:
    return bool(MEMORIA and SUPABASE_URL and SUPABASE_KEY)


async def _memoria_get(client: httpx.AsyncClient, device_id: str) -> Optional[Dict[str, Any]]:
    if not (device_id and _memoria_on()):
        return None
    try:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{CLIENTES_TABLE}",
            params={"restaurant_id": f"eq.{RESTAURANT_ID}", "device_id": f"eq.{device_id}",
                    "select": "nombre,ultimo_pedido,gustos,visitas", "limit": "1"},
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}, timeout=8.0)
        if r.status_code == 200:
            rows = r.json()
            if rows:
                return rows[0]
    except Exception:
        pass
    return None


def _memoria_note(perfil: Optional[Dict[str, Any]]) -> str:
    if not perfil:
        return ""
    nombre = (perfil.get("nombre") or "").strip()
    visitas = perfil.get("visitas") or 0
    ultimo = perfil.get("ultimo_pedido") or []
    gustos = perfil.get("gustos") or []
    if not (nombre or ultimo or gustos):
        return ""
    parts = ["\n\n--- CLIENTE QUE YA TE CONOCE (Plan Premium) ---"]
    if nombre:
        parts.append(f"Se llama {nombre}.")
    if visitas:
        parts.append(f"Ya vino {visitas} ve{'z' if visitas == 1 else 'ces'}.")
    if ultimo:
        nombres = ", ".join([(i.get("name") if isinstance(i, dict) else str(i)) for i in ultimo][:5])
        if nombres:
            parts.append(f"La última vez pidió: {nombres}. (Si te pregunta qué pidió la vez pasada, repetí "
                         "EXACTAMENTE esto; nunca inventes ni cambies ítems.)")
    if gustos:
        g = ", ".join([str(x) for x in gustos][:6])
        if g:
            parts.append(f"Preferencias/restricciones del cliente (RESPETALAS: no le ofrezcas lo que no "
                         f"puede o no quiere — ej. a un diabético nada de azúcar/postres dulces): {g}.")
    if nombre:
        parts.append(f"Saludalo con calidez como a un conocido y SIEMPRE nombralo por su nombre en el saludo "
                     f"(ej. \"¡Hola, {nombre}! Qué bueno verte de nuevo\"). Variá QUÉ MÁS mencionás cada vez "
                     "(a veces un gusto, a veces las visitas, a veces lo último que pidió); no lo enumeres "
                     "todo junto ni suene robótico.")
    else:
        parts.append("Saludá con calidez como a un conocido y variá qué mencionás cada vez (un gusto, las "
                     "visitas, lo último que pidió); no lo enumeres todo junto ni suene robótico.")
    return "\n".join(parts)


async def _memoria_upsert(client: httpx.AsyncClient, device_id: str, nombre=None,
                          ultimo_pedido=None, gustos=None, bump: bool = False) -> None:
    if not (device_id and _memoria_on()):
        return
    try:
        row = {"restaurant_id": RESTAURANT_ID, "device_id": device_id,
               "ultima_visita": datetime.now(timezone.utc).isoformat()}
        if nombre is not None:
            row["nombre"] = str(nombre)[:80]
        if ultimo_pedido is not None:
            row["ultimo_pedido"] = ultimo_pedido
        prev = await _memoria_get(client, device_id) if (gustos is not None or bump) else None
        if gustos is not None:
            # MERGE: acumular gustos/notas del cliente sin duplicar (no pisar lo que ya sabíamos de él).
            merged = list((prev or {}).get("gustos") or [])
            seen = {str(x).strip().lower() for x in merged}
            for g in gustos:
                gs = str(g).strip()[:120]
                if gs and gs.lower() not in seen:
                    merged.append(gs); seen.add(gs.lower())
            row["gustos"] = merged[:12]
        if bump:
            row["visitas"] = ((prev or {}).get("visitas") or 0) + 1
        await client.post(
            f"{SUPABASE_URL}/rest/v1/{CLIENTES_TABLE}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                     "Content-Type": "application/json",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=row, timeout=8.0)
    except Exception:
        pass


@app.post("/chat")
async def chat(req: ChatRequest):
    history = _trim_history(req.history)
    sys_extra = _cart_note(req.cart)
    last_status = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        if MEMORIA and req.device_id:
            sys_extra += _memoria_note(await _memoria_get(client, req.device_id))
        # 2 pasadas: si TODA la cadena falla (típico del arranque en frío del Space, cuando el
        # contenedor recién despierta y la red de salida todavía no está lista) esperamos un toque y
        # reintentamos antes de rendirnos con el "estoy ocupada".
        for attempt in range(2):
            for prov, model, key in _brain_order():
                url, headers, body = _brain_request(prov, model, key, history, req.message, sys_extra)
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
                # no-200 o respuesta vacía → probar el siguiente carril de la cadena
            if attempt == 0:
                await asyncio.sleep(2.0)   # arranque en frío: esperar a que caliente y reintentar
    return {"reply": MESERA_BUSY_MSG, "brain": "busy", "last_status": last_status}


async def _brain_stream_once(client, prov, model, key, history, message, sys_extra: str = ""):
    """Async-gen que emite texto a medida. Lanza _BrainUnavailable si no logra arrancar
    (para que la cadena rote al siguiente carril). Reintenta 429/503 antes del 1er chunk."""
    if prov in _OPENAI_URLS:
        url = _OPENAI_URLS[prov]
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        body = {"model": model, "messages": _openai_messages(history, message, sys_extra),
                "temperature": 0.8, "max_tokens": 2048, "stream": True}
        is_openai = True
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}"
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
    """Stream SSE con cadena de cerebros: si el primero no arranca, rota al siguiente.
    Flujo guiado (chips): si la respuesta ya está cacheada, se reproduce sin tocar el LLM ($0)."""
    history = _trim_history(req.history)
    base_extra = _cart_note(req.cart)

    async def event_gen():
        # Timeout corto de PRIMER TOKEN: si un carril (HF router / OpenRouter free) no arranca a
        # responder en ~12s, se abandona y rota al siguiente (antes el timeout de 60s lo dejaba colgado
        # ~30s y la mesera "pensaba" un montón). En streaming, los chunks siguientes llegan seguidos,
        # así que el read=12 no corta una respuesta que ya está fluyendo.
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=6.0, read=12.0, write=10.0, pool=6.0)) as client:
            # Memoria (Premium): inyectar el perfil del cliente que vuelve al prompt
            mem_note = ""
            if MEMORIA and req.device_id:
                mem_note = _memoria_note(await _memoria_get(client, req.device_id))
            sys_extra = base_extra + mem_note
            # Caché del flujo guiado: SOLO sin perfil personalizado (básico/anónimo). Con memoria la
            # respuesta es personalizada (lleva el nombre) y no se comparte entre clientes.
            # Variantes rotativas: elige un "slot" al azar → la mesera no repite siempre la misma
            # recomendación, y cada variante queda cacheada (variedad sin gastar de más).
            cache_key = None
            if req.guided and _resp_cache_on() and not mem_note:
                slot = random.randint(0, RESPUESTAS_VARIANTES - 1)
                cache_key = _resp_cache_key(f"{req.message}#v{slot}")
            # Flujo guiado ya cacheado → reproducir tal cual, sin LLM
            if cache_key:
                cached = await _resp_cache_get(client, cache_key)
                if cached:
                    yield f"event: chunk\ndata: {json.dumps({'text': cached})}\n\n"
                    yield "event: done\ndata: {}\n\n"
                    return
            # 2 pasadas: si NINGÚN carril arranca (típico del arranque en frío del Space, contenedor
            # recién despierto con la red de salida fría) esperamos un toque y reintentamos toda la
            # cadena antes de mandar el "estoy ocupada". Solo reintenta si no se emitió NADA.
            for attempt in range(2):
                collected = []   # para cachear la respuesta si es guiada y nueva
                for prov, model, key in _brain_order():
                    produced = False
                    try:
                        async for piece in _brain_stream_once(client, prov, model, key, history, req.message, sys_extra):
                            produced = True
                            collected.append(piece)
                            yield f"event: chunk\ndata: {json.dumps({'text': piece})}\n\n"
                    except Exception:
                        # _BrainUnavailable (no arrancó) o corte a mitad
                        if produced:
                            # ya emitimos texto: cerramos limpio (no se puede rotar a mitad)
                            yield "event: done\ndata: {}\n\n"
                            if cache_key:
                                await _resp_cache_put(client, cache_key, req.message, "".join(collected))
                            return
                        continue  # no arrancó: probar el siguiente cerebro de la cadena
                    else:
                        yield "event: done\ndata: {}\n\n"
                        if cache_key:
                            await _resp_cache_put(client, cache_key, req.message, "".join(collected))
                        return
                # ningún carril arrancó en esta pasada
                if attempt == 0:
                    await asyncio.sleep(2.0)   # arranque en frío: esperar a que caliente y reintentar
            # tras 2 pasadas, nada: la mesera responde con gracia
            yield f"event: chunk\ndata: {json.dumps({'text': MESERA_BUSY_MSG})}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",  # no buffereo en proxies
    })


# ----------------------------------------------------------------------------
# Memoria de clientes (Premium): el front consulta el perfil al entrar y lo guarda al dar el
# nombre / cerrar el pedido. Tolerante: si la memoria está off o Supabase falla, no rompe.
@app.get("/cliente")
async def get_cliente(device_id: str = ""):
    if not (device_id and _memoria_on()):
        return {"conocido": False}
    async with httpx.AsyncClient(timeout=10.0) as client:
        perfil = await _memoria_get(client, device_id)
    if not perfil:
        return {"conocido": False}
    return {"conocido": True, "nombre": perfil.get("nombre"), "visitas": perfil.get("visitas"),
            "ultimo_pedido": perfil.get("ultimo_pedido"), "gustos": perfil.get("gustos")}


@app.post("/cliente")
async def post_cliente(req: ClienteRequest):
    if not _memoria_on():
        return {"ok": True, "stored": False, "reason": "memoria_off"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        await _memoria_upsert(client, req.device_id, nombre=req.nombre,
                              ultimo_pedido=req.ultimo_pedido, gustos=req.gustos, bump=req.bump_visita)
    return {"ok": True, "stored": True}


# ----------------------------------------------------------------------------
# Métricas de la demo: el front registra eventos de interacción (fire-and-forget). Tolerante.
def _metricas_on() -> bool:
    return bool(METRICAS and SUPABASE_URL and SUPABASE_KEY)


@app.post("/evento")
async def post_evento(req: EventoRequest):
    if not (_metricas_on() and (req.tipo or "").strip()):
        return {"ok": True, "stored": False}
    row = {"restaurant_id": RESTAURANT_ID, "device_id": req.device_id,
           "tipo": req.tipo[:40], "detalle": req.detalle}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/{EVENTOS_TABLE}",
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                         "Content-Type": "application/json", "Prefer": "return=minimal"},
                json=row)
    except Exception:
        pass
    return {"ok": True, "stored": True}


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
    # Pronunciación: MiniMax se come la "e" final de "bife" (suena "bif"). El acento fuerza la vocal.
    # Solo afecta el AUDIO; en pantalla sigue diciendo "Bife".
    (re.compile(r'\bbifes\b', re.IGNORECASE), 'bifés'),
    (re.compile(r'\bbife\b', re.IGNORECASE), 'bifé'),
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


def _tts_primary_identity() -> str:
    """Identidad de la voz PRINCIPAL (1er proveedor de la cadena) para el hash del caché.
    Si cambia el proveedor/voz principal por env, el caché se invalida solo y regenera."""
    prov = TTS_CHAIN_PARSED[0] if TTS_CHAIN_PARSED else "minimax"
    if prov == "voztts":
        return f"voztts|{VOZTTS_URL}|{VOZTTS_VOICE}"
    if prov == "deepinfra":
        return f"deepinfra|{DEEPINFRA_TTS_MODEL}|{DEEPINFRA_TTS_VOICE}"
    if prov == "elevenlabs":
        return f"elevenlabs|{ELEVENLABS_MODEL}|{ELEVENLABS_VOICE}"
    if prov == "cartesia":
        return f"cartesia|{CARTESIA_MODEL}|{CARTESIA_VOICE}"
    return f"minimax|{MINIMAX_MODEL}|{MINIMAX_VOICE}|{MINIMAX_SPEED}"


def _tts_cache_read_identities() -> List[str]:
    """Identidades compatibles para LEER cache. No cambian el proveedor de generación: solo permiten
    reutilizar MP3 ya guardados cuando una voz fue clonada/migrada a otro voice_id o cuenta."""
    current = _tts_primary_identity()
    prov = TTS_CHAIN_PARSED[0] if TTS_CHAIN_PARSED else "minimax"
    if prov != "cartesia":
        return [current]
    voices = []
    for raw in CARTESIA_CACHE_READ_VOICES.split(","):
        v = raw.strip()
        if v and v not in voices:
            voices.append(v)
    if CARTESIA_VOICE and CARTESIA_VOICE not in voices:
        voices.append(CARTESIA_VOICE)
    identities = [f"cartesia|{CARTESIA_MODEL}|{v}" for v in voices]
    return identities or [current]


def _tts_cache_key_for_identity(text: str, identity: str) -> str:
    raw = f"{RESTAURANT_ID}|{identity}|{text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _tts_cache_key(text: str) -> str:
    return _tts_cache_key_for_identity(text, _tts_primary_identity())


def _tts_cache_keys_for_read(text: str) -> List[str]:
    keys, seen = [], set()
    for identity in _tts_cache_read_identities():
        k = _tts_cache_key_for_identity(text, identity)
        if k not in seen:
            keys.append(k); seen.add(k)
    return keys


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


async def _elevenlabs_synth(client: httpx.AsyncClient, text: str) -> bytes:
    """Genera el MP3 con ElevenLabs. Devuelve audio/mpeg directo (no hace falta decodificar)."""
    r = await client.post(
        f"{ELEVENLABS_API_BASE}/v1/text-to-speech/{ELEVENLABS_VOICE}",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        json={"text": text, "model_id": ELEVENLABS_MODEL,
              "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
        timeout=30.0,
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"ElevenLabs TTS error: {r.text[:400]}")
    if not r.content:
        raise HTTPException(502, "ElevenLabs sin audio")
    return r.content


async def _cartesia_synth(client: httpx.AsyncClient, text: str) -> bytes:
    """Genera el MP3 con Cartesia (endpoint /tts/bytes). Requiere CARTESIA_VOICE (voice_id)."""
    if not CARTESIA_VOICE:
        raise HTTPException(500, "CARTESIA_VOICE no está configurada (voice_id de Cartesia)")
    r = await client.post(
        f"{CARTESIA_API_BASE}/tts/bytes",
        headers={"Authorization": f"Bearer {CARTESIA_API_KEY}", "Cartesia-Version": CARTESIA_VERSION,
                 "Content-Type": "application/json"},
        json={"model_id": CARTESIA_MODEL, "transcript": text, "language": "es",
              "voice": {"mode": "id", "id": CARTESIA_VOICE},
              "output_format": {"container": "mp3", "sample_rate": 24000, "bit_rate": 128000}},
        timeout=30.0,
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Cartesia TTS error: {r.text[:400]}")
    if not r.content:
        raise HTTPException(502, "Cartesia sin audio")
    return r.content


async def _voztts_synth(client: httpx.AsyncClient, text: str) -> bytes:
    """Motor de Voz propio de QuantumHive (Chatterbox en Modal): voz clonada argentina con volumen
    normalizado. Devuelve los bytes del MP3 directo. Timeout amplio por el cold start de la GPU."""
    r = await client.post(
        VOZTTS_URL,
        headers={"Content-Type": "application/json"},
        json={"token": VOZTTS_TOKEN, "texto": text, "voice_id": VOZTTS_VOICE, "idioma": "es",
              "exaggeration": VOZTTS_EXAG, "cfg_weight": VOZTTS_CFG},
        timeout=60.0,
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"VozTTS error: {r.text[:300]}")
    if not r.content:
        raise HTTPException(502, "VozTTS sin audio")
    return r.content


async def _deepinfra_tts_synth(client: httpx.AsyncClient, text: str) -> bytes:
    """Genera el MP3 con Kokoro-82M en DeepInfra (~150ms, baratísimo). DeepInfra devuelve el audio como
    data-URI base64 dentro del JSON → lo decodificamos a bytes mp3."""
    r = await client.post(
        f"{DEEPINFRA_TTS_URL}/{DEEPINFRA_TTS_MODEL}",
        headers={"Authorization": f"Bearer {DEEPINFRA_API_KEY}", "Content-Type": "application/json"},
        json={"text": text, "preset_voice": DEEPINFRA_TTS_VOICE, "output_format": "mp3"},
        timeout=30.0,
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"DeepInfra TTS error: {r.text[:400]}")
    audio = (r.json() or {}).get("audio") or ""
    if "," not in audio:
        raise HTTPException(502, f"DeepInfra TTS sin audio: {audio[:120]}")
    return base64.b64decode(audio.split(",", 1)[1])


# Cadena de proveedores TTS (igual que BRAIN_CHAIN). Orden por TTS_CHAIN o, si está vacío, los que tengan
# key (deepinfra PRINCIPAL → minimax → elevenlabs → cartesia). Cada proveedor entra si tiene su key.
def _parse_tts_chain() -> List[str]:
    has = {"voztts": bool(VOZTTS_URL),
           "deepinfra": bool(DEEPINFRA_API_KEY),
           "minimax": bool(MINIMAX_API_KEY),
           "elevenlabs": bool(ELEVENLABS_API_KEY),
           "cartesia": bool(CARTESIA_API_KEY)}
    order: List[str] = []
    raw = TTS_CHAIN.strip()
    if raw:
        for entry in raw.split(","):
            prov = entry.strip().lower().split(":")[0].strip()  # admite "minimax:voz" → toma el proveedor
            if prov in has and prov not in order:
                order.append(prov)
    chain = [p for p in order if has.get(p)]
    if chain:
        return chain
    # Sin TTS_CHAIN (o el explícito quedó sin keys válidas) → automático: Motor propio (voztts) PRINCIPAL
    # si está configurado; DeepInfra/Kokoro y MiniMax de failover (no dejar la voz muerta).
    return [p for p in ("voztts", "deepinfra", "minimax", "elevenlabs", "cartesia") if has.get(p)]


TTS_CHAIN_PARSED = _parse_tts_chain()


async def _tts_synth_one(client: httpx.AsyncClient, prov: str, text: str) -> bytes:
    if prov == "voztts":
        return await _voztts_synth(client, text)
    if prov == "deepinfra":
        return await _deepinfra_tts_synth(client, text)
    if prov == "elevenlabs":
        return await _elevenlabs_synth(client, text)
    if prov == "cartesia":
        return await _cartesia_synth(client, text)
    return await _minimax_synth(client, text)


async def _tts_synth_chain(client: httpx.AsyncClient, text: str) -> tuple:
    """Sintetiza con la cadena: primero el proveedor principal; ante Exception (cuota/servidor/red),
    try/except y rota al siguiente. Devuelve (audio_bytes, proveedor_usado). Lanza si ninguno responde."""
    last_err = None
    for prov in TTS_CHAIN_PARSED:
        try:
            return await _tts_synth_one(client, prov, text), prov
        except Exception as e:  # cuota/servidor/red → probar el siguiente proveedor de voz
            last_err = e
            continue
    raise HTTPException(502, f"TTS sin proveedor disponible: {last_err}")


@app.post("/tts")
async def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "Texto vacío")
    text = _normalize_for_tts(text)
    if not TTS_CHAIN_PARSED:
        raise HTTPException(500, "Ningún proveedor de TTS configurado (MINIMAX/ELEVENLABS/CARTESIA)")

    use_cache = _tts_cache_enabled()
    key = _tts_cache_key(text) if use_cache else ""
    async with httpx.AsyncClient() as client:
        # 1) ¿está cacheada? → $0, instantáneo (cualquier proveedor; el caché aplica a todos)
        if use_cache:
            for cache_key in _tts_cache_keys_for_read(text):
                cached = await _tts_cache_get(client, cache_key)
                if cached:
                    return Response(content=cached, media_type="audio/mpeg", headers={"X-TTS-Cache": "hit"})
        # 2) generar con la cadena de proveedores: principal → fallback ante cuota/error
        audio, used = await _tts_synth_chain(client, text)
        # 3) guardar en el caché para la próxima (no frena la respuesta si falla)
        if use_cache:
            await _tts_cache_put(client, key, audio)
    return Response(content=audio, media_type="audio/mpeg",
                    headers={"X-TTS-Cache": "miss" if use_cache else "off", "X-TTS-Provider": used})


@app.get("/warm")
async def warm():
    """Despierta el Motor de Voz (cold start) cuando un cliente ENTRA a la carta, así la primera
    respuesta no se corta ni entrecorta. Fire-and-forget: dispara una síntesis mínima y contesta al toque."""
    if not VOZTTS_URL:
        return {"warmed": False, "reason": "sin motor propio"}

    async def _go():
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                await _voztts_synth(client, "Hola, ya te atiendo.")
        except Exception:
            pass
    asyncio.create_task(_go())
    return {"warmed": True}


@app.get("/guion")
async def guion():
    """Guión determinístico del autoguiado (categorías → platos con dish_id, chip y texto_tts).
    El front lo usa para el autoguiado atómico: tocar un chip de plato → /tts(texto_tts) (cache hit)
    + resaltar su dish_id en la carta."""
    return build_guion_autoguiado()


@app.post("/pregrabar")
async def pregrabar(force: bool = False, token: str = ""):
    """Pre-genera y cachea el MP3 de CADA texto del autoguiado (saludo + cada plato) en UNA pasada
    por carta. Después los clientes lo reciben $0 e instantáneo (cache hit). Idempotente: salta lo ya
    cacheado (force=1 regenera, p. ej. tras ajustar la pronunciación). Reusa la MISMA
    normalización/key/cadena que /tts → el cache coincide exacto con el runtime."""
    admin = os.environ.get("ADMIN_TOKEN", "").strip()
    if admin and token != admin:
        raise HTTPException(401, "token inválido")
    if not _tts_cache_enabled():
        raise HTTPException(500, "Cache TTS no configurado (TTS_CACHE + SUPABASE_URL + SUPABASE_SERVICE_KEY)")
    if not TTS_CHAIN_PARSED:
        raise HTTPException(500, "Sin proveedor de TTS configurado")

    data = json.loads(EMBEDDED_MENU_JSON)
    saludo = ((data.get("assistant") or {}).get("greeting") or "").strip()
    textos = [saludo] if saludo else []
    for cat in build_guion_autoguiado()["categorias"]:
        for p in cat["platos"]:
            textos.append(p["texto_tts"])
    for flujo in build_guion_autoguiado().get("flujos", {}).values():
        for item in flujo.get("items", []):
            textos.append(item["texto_tts"])
    vistos, unicos = set(), []
    for t in textos:                          # dedupe conservando orden
        if t and t not in vistos:
            vistos.add(t); unicos.append(t)

    stats = {"total": len(unicos), "generados": 0, "ya_estaban": 0, "errores": 0}
    sem = asyncio.Semaphore(2)                 # baja concurrencia: el free tier de Cartesia limita ráfagas (429)

    async def _uno(client: httpx.AsyncClient, t: str):
        st = _normalize_for_tts(t)
        k = _tts_cache_key(st)
        async with sem:
            if not force:
                for cache_key in _tts_cache_keys_for_read(st):
                    if await _tts_cache_get(client, cache_key):
                        stats["ya_estaban"] += 1
                        return
            last = None
            for intento in range(4):           # reintenta ante rate limit con backoff creciente
                try:
                    audio, _ = await _tts_synth_chain(client, st)
                    await _tts_cache_put(client, k, audio)
                    stats["generados"] += 1
                    return
                except Exception as e:
                    last = e
                    await asyncio.sleep(1.5 * (intento + 1))
            stats["errores"] += 1
            stats["ejemplo_error"] = str(last)[:160]

    async with httpx.AsyncClient(timeout=60.0) as client:
        await asyncio.gather(*[_uno(client, t) for t in unicos])
    return {"ok": True, **stats}


# ----------------------------------------------------------------------------
# Pre-warming: al arrancar deja listo el saludo (audio) y las respuestas de los chips por defecto
# (texto), para que el PRIMER cliente ya los reciba al toque (no solo los que repiten).
async def _brain_once(client: httpx.AsyncClient, message: str) -> str:
    """Una respuesta completa del cerebro (sin stream). Devuelve '' si ningún cerebro respondió."""
    for prov, model, key in _brain_order():
        url, headers, body = _brain_request(prov, model, key, [], message, "")
        try:
            r = await _post_with_retry(client, url, body, headers)
        except Exception:
            continue
        if r.status_code == 200:
            try:
                reply = _brain_extract(prov, r.json())
            except Exception:
                reply = ""
            if reply:
                return reply
    return ""


@app.on_event("startup")
async def _prewarm():
    if not PREWARM:        # OFF por defecto: no gastar cuota al arrancar
        return
    async def _warm():
        try:
            data = json.loads(EMBEDDED_MENU_JSON)
            saludo = ((data.get("assistant") or {}).get("greeting") or "").strip()
            chips = [c.get("text", "") for c in (CARTA_CONFIG.get("chips") or []) if c.get("text")]
            async with httpx.AsyncClient(timeout=60.0) as client:
                # audio del saludo genérico (se reproduce entero → su hash coincide con el de /tts)
                if saludo and TTS_CHAIN_PARSED and _tts_cache_enabled():
                    st = _normalize_for_tts(saludo)
                    k = _tts_cache_key(st)
                    try:
                        exists = False
                        for cache_key in _tts_cache_keys_for_read(st):
                            if await _tts_cache_get(client, cache_key):
                                exists = True
                                break
                        if not exists:
                            audio, _ = await _tts_synth_chain(client, st)
                            await _tts_cache_put(client, k, audio)
                    except Exception:
                        pass
                # texto de las respuestas de los chips por defecto (saca el LLM en la 1ª vez)
                if _resp_cache_on():
                    for msg in chips:
                        for slot in range(RESPUESTAS_VARIANTES):   # pre-generar las N variantes
                            try:
                                key = _resp_cache_key(f"{msg}#v{slot}")
                                if await _resp_cache_get(client, key):
                                    continue
                                reply = await _brain_once(client, msg)
                                if reply and "#PEDIDO#" not in reply:
                                    await _resp_cache_put(client, key, msg, reply)
                                await asyncio.sleep(4)   # espaciar: no saturar la cuota por minuto
                            except Exception:
                                pass
            print("[prewarm] listo")
        except Exception as e:  # nunca romper el arranque por el pre-warming
            print(f"[prewarm] {type(e).__name__}: {e}")
    asyncio.create_task(_warm())


# ----------------------------------------------------------------------------
@app.post("/stt")
async def stt(req: STTRequest):
    """Transcribe audio con la cadena STT: DeepInfra Whisper primero, Gemini como fallback."""
    if not STT_CHAIN_PARSED:
        raise HTTPException(500, "No hay proveedor STT configurado (DEEPINFRA_API_KEY / GEMINI_API_KEY)")
    if not req.audio_base64:
        raise HTTPException(400, "Audio vacío")

    try:
        audio_bytes = base64.b64decode(req.audio_base64.split(",", 1)[-1])
    except Exception:
        raise HTTPException(400, "Audio inválido")

    body = {
        "contents": [{
            "parts": [
                {"text": "Transcribí literalmente lo que se dice en este audio en español rioplatense. "
                         "Devolvé SOLO el texto transcripto, sin comillas, sin comentarios, sin nada más. "
                         "Si el audio está en silencio o no se entiende, devolvé una cadena vacía."},
                {"inline_data": {"mime_type": req.mime_type, "data": req.audio_base64}}
            ]
        }],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 256,
                             "thinkingConfig": {"thinkingBudget": 0}}
    }

    last_status = 0
    last_text = ""
    async with httpx.AsyncClient(timeout=30.0) as client:
        for provider in STT_CHAIN_PARSED:
            try:
                if provider == "deepinfra":
                    text = await _deepinfra_stt(client, audio_bytes, req.mime_type)
                elif provider == "gemini":
                    text = await _gemini_stt(client, body)
                else:
                    continue
                return {"text": text}
            except HTTPException as e:
                last_status = e.status_code
                last_text = str(e.detail)[:500]
                continue
            except Exception as e:
                last_status = 503
                last_text = str(e)[:500]
                continue
        if last_status in (429, 500, 502, 503, 504):
            return {"text": "", "busy": True}
        raise HTTPException(last_status or 503, f"STT error: {last_text}")


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
        "sugerencia": (req.sugerencia or None),
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
