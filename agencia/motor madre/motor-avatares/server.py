import os
import base64
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Initialize FastAPI App
app = FastAPI(
    title="Carta Viva Backend (Python)",
    description="Backend en Python (FastAPI) para el mozo virtual de Carta Viva, integrado con Gemini 2.5/3.5",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client (picks up GEMINI_API_KEY from environment)
api_key = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=api_key) if api_key else None

# Helper to load menu data
def get_menu_data() -> Dict[str, Any]:
    # In a real environment, you can save this as menu.json or import it
    # For compatibility, we load a local menu.json if exists, or return a placeholder structure
    try:
        if os.path.exists("menu.json"):
            with open("menu.json", "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading menu.json: {e}")
    
    # Return placeholder structure matching the restaurant
    return {
        "restaurant": {
            "name": "Carta Viva",
            "currency_symbol": "$"
        },
        "assistant": {
            "greeting": "¡Hola! ¿En qué te puedo asesorar hoy?",
            "personality": "Amable, conocedora de vinos, estilo porteño natural."
        },
        "rules": {},
        "menu": [],
        "drinks": []
    }

# System Prompt Builder
def build_system_prompt(menu_data: Dict[str, Any]) -> str:
    restaurant = menu_data.get("restaurant", {})
    assistant = menu_data.get("assistant", {})
    rules = menu_data.get("rules", {})
    symbol = restaurant.get("currency_symbol", "$")
    
    lines = []
    lines.append(f"Sos la mesera de {restaurant.get('name', 'el restaurante')}. Trabajás acá hace años, conocés la carta de memoria y sabés leer a cada cliente.")
    lines.append("")
    lines.append("IDIOMA (REGLA ABSOLUTA, ANTES QUE TODO): hablás SIEMPRE en español rioplatense argentino. JAMÁS escribís una sola palabra en portugués ni en ningún otro idioma.")
    lines.append("")
    lines.append("CÓMO RESPONDÉS — REGLA DE ORO:")
    lines.append("Directa, concreta y vendedora. Recomendás con seguridad y guiás la venta DE A UN PASO: te enfocás en UNA categoría por turno (la entrada, o la carne, o la bebida...), y dentro de esa categoría SIEMPRE tirás 2 o 3 opciones con una pincelada apetitosa de cada una — NUNCA una sola. Dejás que el cliente la elija o la agregue, y RECIÉN AHÍ ofrecés el siguiente paso (bebida, postre). Nunca amontonás plato + bebida + postre en una sola respuesta. Prohibido arrancar con 'mmm', 'a ver' o repetir la pregunta del cliente.")
    lines.append("")
    lines.append("SOBRE LOS PRECIOS — LEÉS AL CLIENTE:")
    lines.append("No cantás precios de entrada: recomendás por el plato, no por el número. Después de recomendar, si el cliente parece indeciso, le ofrecés con naturalidad: '¿te paso los precios o preferís elegir primero?'. Si el cliente pregunta precios directamente, se los das al toque. Cuando digas un precio, SIEMPRE en palabras: 'veintisiete mil pesos', jamás '$27.000'. NUNCA digas el TOTAL del pedido ni sumes precios de memoria.")
    lines.append("")
    lines.append("REGLAS DURAS:")
    lines.append("- Nunca decís que sos una IA o un bot. Sos la mesera.")
    lines.append("- Nunca inventás precios. Si no está en la carta: 'ese te lo confirma el mozo'.")
    lines.append("- Precios siempre en palabras cuando los digas.")
    lines.append("- Nunca emojis.")
    lines.append("- NUNCA uses markdown: nada de asteriscos (*), negritas, ni listas numeradas. Escribís en prosa natural, hablado.")
    lines.append("- Hablás de vos (tenés, querés, podés), porteña natural y amable.")
    lines.append("")
    lines.append("ARMAR Y MODIFICAR EL PEDIDO — MUY IMPORTANTE:")
    lines.append("Vos misma cargás el pedido del cliente. Cuando te pida sumar o sacar items, agregás AL FINAL de tu respuesta UNA SOLA línea técnica con este formato EXACTO:")
    lines.append('#PEDIDO# {"add":[{"name":"<nombre EXACTO>","qty":<numero>,"variant":"<copa|botella>"}],"remove":[{"name":"<nombre EXACTO>","qty":<numero>}],"clear":false}')
    lines.append("")
    lines.append("SUGERENCIAS DE SEGUIMIENTO (CHIPS):")
    lines.append("Casi siempre que termines de responder, ofrecé de 2 a 4 atajos cortos al final de tu respuesta:")
    lines.append('#CHIPS# ["texto corto 1","texto corto 2"]')
    lines.append("")
    lines.append("CERRAR EL PEDIDO:")
    lines.append("Cuando el cliente quiera la cuenta o cerrar, recitás el pedido y agregás al final:")
    lines.append("#CUENTA#")
    
    return "\n".join(lines)


# --- PYDANTIC SCHEMAS ---

class FeedbackRequest(BaseModel):
    stars_mesera: int = Field(..., ge=0, le=5)
    stars_restaurante: int = Field(..., ge=0, le=5)
    stars_quantumhive: int = Field(..., ge=0, le=5) # Valoración de QuantumHive añadida al final
    comment: Optional[str] = ""
    table: Optional[str] = ""

class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    qty: int

class OrderRequest(BaseModel):
    table: str
    total: float
    items: List[OrderItem]

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    cart: Optional[List[Dict[str, Any]]] = None

class STTRequest(BaseModel):
    audio_base64: str
    mime_type: Optional[str] = "audio/webm"

class TTSRequest(BaseModel):
    text: str


# --- API ENDPOINTS ---

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "gemini_key_configured": client is not None,
        "gemini_model": "gemini-2.5-flash"
    }

@app.get("/menu.json")
@app.get("/api/menu")
def get_menu():
    return get_menu_data()

@app.post("/api/feedback")
def post_feedback(payload: FeedbackRequest):
    print("Feedback recibido en Python:", payload.model_dump())
    return {"ok": True, "stored": True, "received_data": payload.model_dump()}

@app.post("/api/order")
def post_order(payload: OrderRequest):
    print(f"Pedido recibido para mesa: {payload.table}, Total: {payload.total}")
    for item in payload.items:
        print(f" - {item.qty}x {item.name} (${item.price} c/u)")
    return {"ok": True, "sent": True}

@app.get("/api/cliente")
def get_cliente():
    return {"conocido": False}

@app.post("/api/cliente")
def post_cliente():
    return {"ok": True, "stored": True}

@app.post("/api/evento")
def post_evento():
    return {"ok": True, "stored": True}

@app.post("/api/tts")
def post_tts(payload: TTSRequest):
    return {"speak": payload.text, "text": payload.text}

@app.post("/api/stt")
async def post_stt(payload: STTRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada en el servidor Python.")
    
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
        clean_mime = payload.mime_type or "audio/webm"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=audio_bytes,
                    mime_type=clean_mime
                ),
                "Transcribí literalmente lo que se dice en este audio en español rioplatense. Devolvé SOLO el texto transcripto, sin comillas, sin comentarios, sin nada más. Si el audio está en silencio o no se entiende, devolvé una cadena vacía."
            ]
        )
        
        transcription = response.text or ""
        return {"text": transcription.strip()}
    except Exception as e:
        print("Error en STT:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def post_chat(payload: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada en el servidor Python.")
    
    try:
        menu_data = get_menu_data()
        
        # Build cart context if provided
        cart_note = ""
        if payload.cart and len(payload.cart) > 0:
            items_list = ", ".join([f"{i.get('qty')}x {i.get('name')}" for i in payload.cart])
            cart_note = f"\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n{items_list}"
            
        system_instruction = build_system_prompt(menu_data) + cart_note
        
        # Build contents list from history
        contents = []
        for msg in payload.history:
            role = "model" if msg.role == "model" else "user"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.text)]
            ))
            
        # Append latest message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=payload.message)]
        ))
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.8
            )
        )
        
        reply = response.text or ""
        return {"reply": reply.strip()}
    except Exception as e:
        print("Error en Chat:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def post_chat_stream(payload: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada en el servidor Python.")
    
    def generate_stream():
        try:
            menu_data = get_menu_data()
            cart_note = ""
            if payload.cart and len(payload.cart) > 0:
                items_list = ", ".join([f"{i.get('qty')}x {i.get('name')}" for i in payload.cart])
                cart_note = f"\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n{items_list}"
                
            system_instruction = build_system_prompt(menu_data) + cart_note
            
            contents = []
            for msg in payload.history:
                role = "model" if msg.role == "model" else "user"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.text)]
                ))
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_text(text=payload.message)]
            ))
            
            stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.8
                )
            )
            
            for chunk in stream:
                text = chunk.text or ""
                yield f"event: chunk\ndata: {json.dumps({'text': text})}\n\n"
                
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            print("Error en stream:", e)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
