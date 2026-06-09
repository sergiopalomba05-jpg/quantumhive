#!/usr/bin/env python3
"""Meta API (Facebook + Instagram) integration for the scraper"""

import os
import json
import requests
from typing import Optional

META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
INSTAGRAM_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")

GRAPH_API_BASE = "https://graph.facebook.com/v22.0"

def esta_configurado() -> bool:
    return bool(META_ACCESS_TOKEN)

def esta_instagram_configurado() -> bool:
    return bool(INSTAGRAM_ACCESS_TOKEN)

def _get(path: str, params: dict = None) -> dict:
    if params is None:
        params = {}
    params["access_token"] = META_ACCESS_TOKEN
    url = f"{GRAPH_API_BASE}{path}"
    try:
        r = requests.get(url, params=params, timeout=15)
        return r.json()
    except Exception as e:
        return {"error": {"message": str(e)}}

def buscar_grupos(query: str, limit=10):
    """Busca grupos públicos de Facebook"""
    data = _get("/search", {"q": query, "type": "group", "limit": limit})
    results = []
    for g in data.get("data", []):
        results.append({
            "nombre": g.get("name", ""),
            "id": g.get("id", ""),
            "descripcion": g.get("description", "")[:200],
            "miembros": g.get("member_count", 0),
            "url": f"https://facebook.com/groups/{g.get('id', '')}",
            "fuente": "Facebook Grupos",
        })
    return results

def buscar_paginas(query: str, limit=10):
    """Busca páginas públicas de Facebook"""
    data = _get("/search", {"q": query, "type": "page", "limit": limit})
    results = []
    for p in data.get("data", []):
        results.append({
            "nombre": p.get("name", ""),
            "id": p.get("id", ""),
            "descripcion": p.get("description", "")[:200],
            "url": f"https://facebook.com/{p.get('id', '')}",
            "fuente": "Facebook Paginas",
        })
    return results

def buscar_publicaciones(query: str, limit=20):
    """Busca publicaciones públicas en Facebook"""
    data = _get("/search", {"q": query, "type": "post", "limit": limit})
    results = []
    for p in data.get("data", []):
        results.append({
            "mensaje": p.get("message", "")[:300],
            "id": p.get("id", ""),
            "created_time": p.get("created_time", ""),
            "url": f"https://facebook.com/{p.get('id', '')}",
            "fuente": "Facebook Publicaciones",
        })
    return results

def obtener_publicaciones_grupo(group_id: str, limit=20):
    """Obtiene publicaciones recientes de un grupo"""
    data = _get(f"/{group_id}/feed", {"limit": limit})
    results = []
    for p in data.get("data", []):
        results.append({
            "mensaje": p.get("message", "")[:300],
            "id": p.get("id", ""),
            "created_time": p.get("created_time", ""),
            "url": f"https://facebook.com/{p.get('id', '')}",
            "fuente": "Facebook Grupo",
        })
    return results

def buscar_marketplace(query: str, limit=10):
    """Busca en Facebook Marketplace (limitado - requiere permiso especifico)"""
    print("  [FB Marketplace] No disponible via Graph API publica")
    return []

def buscar_instagram(query: str, limit=20):
    """Busca en Instagram (requiere Instagram Basic Display token)"""
    if not INSTAGRAM_ACCESS_TOKEN:
        print("  [IG API] No configurado - falta INSTAGRAM_ACCESS_TOKEN")
        return []

    url = f"https://graph.instagram.com/v22.0/me/media"
    params = {
        "fields": "id,caption,media_type,media_url,permalink,timestamp",
        "access_token": INSTAGRAM_ACCESS_TOKEN,
        "limit": limit,
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
        results = []
        for m in data.get("data", []):
            caption = m.get("caption", "")
            if query.lower() in caption.lower():
                results.append({
                    "caption": caption[:300],
                    "url": m.get("permalink", ""),
                    "tipo": m.get("media_type", ""),
                    "fuente": "Instagram",
                })
        return results
    except Exception as e:
        print(f"  [IG API] Error: {e}")
        return []

def buscar_instagram_etiqueta(query: str, limit=20):
    """Busca en Instagram por hashtag usando Facebook Graph API con permiso instagram_manage"""
    data = _get("/ig_hashtag_search", {"q": query, "limit": limit})
    if "error" in data:
        return []
    results = []
    for tag in data.get("data", []):
        results.append({
            "nombre": tag.get("name", ""),
            "id": tag.get("id", ""),
            "fuente": "Instagram Hashtag",
        })
    return results

def test_conexion():
    """Prueba la conexion con la Graph API"""
    data = _get("/me", {"fields": "id,name,email"})
    if "error" in data:
        return False, data.get("error", {}).get("message", "Error desconocido")
    return True, f"Conectado como: {data.get('name', '?')}"

def buscar_producto_en_redes(query: str):
    """Busca un producto en todas las redes disponibles via Meta API"""
    resultados = []

    if not esta_configurado():
        print("  [Meta API] No configurado - falta META_ACCESS_TOKEN")
        return resultados

    print(f"\n>>> Buscando en Facebook via API: {query[:50]}...")

    paginas = buscar_paginas(query, 5)
    resultados.extend(paginas)
    print(f"  -> {len(paginas)} paginas encontradas")

    grupos = buscar_grupos(query, 5)
    resultados.extend(grupos)
    print(f"  -> {len(grupos)} grupos encontrados")

    posts = buscar_publicaciones(query, 10)
    resultados.extend(posts)
    print(f"  -> {len(posts)} publicaciones encontradas")

    if esta_instagram_configurado():
        print(f">>> Buscando en Instagram via API: {query[:50]}...")
        ig_results = buscar_instagram(query, 20)
        resultados.extend(ig_results)
        print(f"  -> {len(ig_results)} resultados en Instagram")

    return resultados

if __name__ == "__main__":
    ok, msg = test_conexion()
    print(f"Conexion Meta API: {'OK' if ok else 'FALLO'}")
    print(msg)
    if ok:
        print("\nBuscando ejemplo...")
        res = buscar_producto_en_redes("rayban meta")
        for r in res:
            print(f"  - {r.get('nombre') or r.get('mensaje','')[:80]}")
            print(f"    {r.get('url','')}")
