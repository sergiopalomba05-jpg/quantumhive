#!/usr/bin/env python3
"""Buscador de precios y proveedores mayoristas en Argentina + redes sociales"""

import sys
import re
import json
import os
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
import requests

# Meta API (Facebook + Instagram) - opcional
try:
    from meta_api import (
        buscar_producto_en_redes as buscar_meta_redes,
        test_conexion as test_meta_conexion,
        esta_configurado as meta_configurado,
    )
    META_DISPONIBLE = True
except ImportError:
    META_DISPONIBLE = False

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def buscar_dd(query: str, max_results=10):
    resultados = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, region="ar-es", max_results=max_results):
                resultados.append({
                    "titulo": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                })
    except Exception as e:
        print(f"  [DDG] Error: {e}")
    return resultados

def buscar_ml(query: str):
    url = f"https://listado.mercadolibre.com.ar/{requests.utils.quote(query)}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "lxml")
            items = soup.select("li.ui-search-layout__item, .ui-search-result, .andes-card")
            res = []
            for item in items[:10]:
                tit = item.select_one("h2.ui-search-item__title, .ui-search-item__title, .ui-search-result__content-title")
                prec = item.select_one(".andes-money-amount__fraction, .ui-search-price__part span")
                link = item.select_one("a.ui-search-link, .ui-search-item__group__element a")
                if tit:
                    res.append({
                        "titulo": tit.get_text(strip=True),
                        "precio": prec.get_text(strip=True) if prec else "N/A",
                        "url": link.get("href", "") if link else url,
                        "fuente": "MercadoLibre AR",
                    })
            return res
    except Exception as e:
        print(f"  [ML] Error: {e}")
    return []

def buscar_redes_sociales(query: str):
    """Busca en redes sociales usando DuckDuckGo con site operators"""
    print(f"\n>>> Buscando en redes sociales: {query[:50]}...")
    resultados = []
    sites = [
        ("Instagram", "site:instagram.com"),
        ("Facebook", "site:facebook.com"),
        ("TikTok", "site:tiktok.com"),
        ("WhatsApp", "site:whatsapp.com OR site:chat.whatsapp.com"),
        ("Telegram", "site:t.me OR site:telegram.me"),
        ("YouTube", "site:youtube.com"),
        ("Pinterest", "site:pinterest.com"),
        ("Twitter/X", "site:twitter.com OR site:x.com"),
    ]
    for red, site_op in sites:
        q = f"{query} ({site_op}) Argentina"
        try:
            with DDGS() as ddgs:
                for r in ddgs.text(q, region="ar-es", max_results=5):
                    resultados.append({
                        "red": red,
                        "titulo": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
        except:
            pass
    return resultados

def buscar_facebook_marketplace(query: str):
    """Intenta buscar en Facebook Marketplace"""
    print(f"\n>>> Buscando en Facebook Marketplace: {query[:50]}...")
    url = f"https://www.facebook.com/marketplace/search/?q={requests.utils.quote(query)}"
    resultados = []
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "lxml")
            items = soup.select('[data-testid="marketplace_search_result"], .x1n2onr6, [role="article"]')
            for item in items[:10]:
                tit = item.get_text(strip=True)[:100]
                link = item.find("a")
                if tit and len(tit) > 5:
                    resultados.append({
                        "titulo": tit,
                        "url": f"https://facebook.com{link.get('href','')}" if link else url,
                        "fuente": "Facebook Marketplace",
                    })
        if not resultados:
            print("  [FB] No se pudieron extraer resultados (requiere login)")
    except Exception as e:
        print(f"  [FB] Error: {e}")
    return resultados

def buscar_instagram(query: str):
    """Busca perfiles y posts públicos de Instagram"""
    print(f"\n>>> Buscando en Instagram: {query[:50]}...")
    url = f"https://www.instagram.com/explore/search/keyword/?q={requests.utils.quote(query)}"
    resultados = []
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "lxml")
            scripts = soup.find_all("script", type="text/javascript")
            for script in scripts:
                if "window.__INITIAL_STATE__" in script.text:
                    data = script.text.split("window.__INITIAL_STATE__ = ")[1].split(";</script>")[0]
                    parsed = json.loads(data)
                    edges = parsed.get("explore", {}).get("edge_explore", {}).get("edges", [])
                    for edge in edges[:10]:
                        node = edge.get("node", {})
                        caption = node.get("edge_media_to_caption", {}).get("edges", [{}])[0].get("node", {}).get("text", "")
                        if caption:
                            resultados.append({
                                "titulo": caption[:100],
                                "url": f"https://instagram.com/p/{node.get('shortcode','')}",
                                "fuente": "Instagram",
                            })
        if not resultados:
            print("  [IG] No se pudieron extraer resultados (requiere login)")
    except Exception as e:
        print(f"  [IG] Error: {e}")
    return resultados

def buscar_tiktok(query: str):
    """Busca en TikTok"""
    print(f"\n>>> Buscando en TikTok: {query[:50]}...")
    url = f"https://www.tiktok.com/search?q={requests.utils.quote(query)}"
    resultados = []
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        items = soup.select('[data-e2e="search-result-item"], .search-result-item')
        for item in items[:10]:
            tit = item.get_text(strip=True)[:100]
            link = item.find("a")
            if tit and len(tit) > 5:
                resultados.append({
                    "titulo": tit,
                    "url": f"https://tiktok.com{link.get('href','')}" if link else url,
                    "fuente": "TikTok",
                })
        if not resultados:
            print("  [TT] No se pudieron extraer resultados")
    except Exception as e:
        print(f"  [TT] Error: {e}")
    return resultados

def buscar_grupos_whatsapp(query: str):
    """Busca grupos de WhatsApp públicos"""
    print(f"\n>>> Buscando grupos de WhatsApp: {query[:50]}...")
    resultados = []
    sitios = [
        f"whatsapp.com (group OR canal OR chat) {query}",
        f"chat.whatsapp.com {query}",
        f"site:chat.whatsapp.com {query}",
    ]
    for q in sitios:
        try:
            with DDGS() as ddgs:
                for r in ddgs.text(q, region="ar-es", max_results=5):
                    url = r.get("href", "")
                    if "chat.whatsapp.com" in url or "whatsapp.com" in url:
                        resultados.append({
                            "titulo": r.get("title", ""),
                            "url": url,
                            "snippet": r.get("body", ""),
                            "fuente": "WhatsApp",
                        })
        except:
            pass
    return resultados

def buscar_telegram(query: str):
    """Busca canales y grupos de Telegram"""
    print(f"\n>>> Buscando en Telegram: {query[:50]}...")
    resultados = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(f"site:t.me OR site:telegram.me {query} Argentina", region="ar-es", max_results=10):
                url = r.get("href", "")
                if "t.me" in url or "telegram.me" in url:
                    resultados.append({
                        "titulo": r.get("title", ""),
                        "url": url,
                        "snippet": r.get("body", ""),
                        "fuente": "Telegram",
                    })
    except:
        pass
    return resultados

def buscar_proveedor_directo(query: str):
    """Busca datos de contacto del proveedor"""
    print(f"\n>>> Buscando datos de contacto para: {query[:60]}...")
    try:
        r = requests.get(query, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            text = r.text
            tels = re.findall(r'(?:\+?54)?\s*?\(?\d{2,4}\)?\s*?\d{2,4}[\s-]?\d{4}', text)
            emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
            dirs = re.findall(r'[A-Z][a-záéíóúñ]+ \d{1,5}\s*(?:,\s*[A-Z][a-záéíóúñ]+)*', text)
            if tels or emails or dirs:
                return {"telefonos": list(set(tels))[:3], "emails": list(set(emails))[:3], "direcciones": list(set(dirs))[:3]}
    except:
        pass
    return None

def mostrar_resultados(todos, fuente_label):
    vistos = set()
    for i, r in enumerate(todos, 1):
        url = r.get("url", "")
        tit = r.get("titulo", "")[:100]
        if url in vistos:
            continue
        vistos.add(url)
        precio = r.get("precio", "")
        snippet = r.get("snippet", "")[:150]
        red = r.get("red", "")
        src = r.get("fuente", "Web")
        print(f"--- Resultado {i} ---")
        if red:
            print(f"  Red: {red}")
        print(f"  Titulo: {tit}")
        if precio:
            print(f"  Precio: {precio}")
        if snippet:
            print(f"  Info: {snippet}")
        print(f"  URL: {url}")
        if url.startswith("http") and "google" not in url and "facebook" not in url:
            contacto = buscar_proveedor_directo(url)
            if contacto:
                if contacto.get("telefonos"):
                    print(f"  Telefono(s): {', '.join(contacto['telefonos'])}")
                if contacto.get("emails"):
                    print(f"  Email(s): {', '.join(contacto['emails'])}")
                if contacto.get("direcciones"):
                    print(f"  Direccion(es): {', '.join(contacto['direcciones'])}")
        print()

def buscar_producto(producto: str, max_usd=330):
    sep = "=" * 70
    print(sep)
    print(f"BUSQUEDA: {producto}")
    print(f"FILTRO PRECIO: < ${max_usd} USD")
    print(sep)
    print()

    # --- WEB (DuckDuckGo) ---
    estrategias = [
        f'"{producto}" proveedor mayorista Argentina',
        f'"{producto}" precio Argentina',
        f'distribuidor "{producto}" Argentina telefono direccion',
        f'"{producto}" wholesale Argentina supplier',
        f'comprar "{producto}" Argentina envio',
    ]
    todos_web = []
    for q in estrategias:
        print(f"> Buscando en web: {q}")
        todos_web.extend(buscar_dd(q))
        print(f"  -> {len(todos_web)} resultados")

    # --- MercadoLibre ---
    print(f"\n> Buscando en MercadoLibre: {producto}")
    todos_ml = buscar_ml(producto)
    print(f"  -> {len(todos_ml)} resultados")

    # --- Redes Sociales ---
    todos_redes = buscar_redes_sociales(producto)
    print(f"  -> {len(todos_redes)} resultados en redes")

    # --- Meta API (Facebook + Instagram oficial) ---
    if META_DISPONIBLE and meta_configurado():
        print(f"\n> Buscando via Meta API (Facebook/Instagram): {producto[:60]}")
        meta_results = buscar_meta_redes(producto)
        todos_redes.extend(meta_results)
        print(f"  -> {len(meta_results)} resultados via Meta API")
    elif META_DISPONIBLE:
        print(f"\n> Meta API no configurada - crear .env con META_ACCESS_TOKEN")

    # --- Facebook Marketplace ---
    todos_fb = buscar_facebook_marketplace(producto)
    if todos_fb:
        todos_redes.extend(todos_fb)

    # --- Instagram ---
    todos_ig = buscar_instagram(producto)
    if todos_ig:
        todos_redes.extend(todos_ig)

    # --- TikTok ---
    todos_tt = buscar_tiktok(producto)
    if todos_tt:
        todos_redes.extend(todos_tt)

    # --- WhatsApp ---
    todos_wa = buscar_grupos_whatsapp(producto)
    if todos_wa:
        todos_redes.extend(todos_wa)

    # --- Telegram ---
    todos_tg = buscar_telegram(producto)
    if todos_tg:
        todos_redes.extend(todos_tg)

    # --- Mostrar resultados ---
    print(f"\n{sep}")
    print(f"RESULTADOS WEB ({len(todos_web)} total)")
    print(sep)
    mostrar_resultados(todos_web, "Web")

    print(f"\n{sep}")
    print(f"MERCADOLIBRE ({len(todos_ml)} resultados)")
    print(sep)
    mostrar_resultados(todos_ml, "ML")

    print(f"\n{sep}")
    print(f"REDES SOCIALES ({len(todos_redes)} resultados)")
    print(sep)
    mostrar_resultados(todos_redes, "Redes")

    if not todos_web and not todos_ml and not todos_redes:
        print("No se encontraron resultados.")

def main():
    if len(sys.argv) < 2:
        print("Uso: python scraper_proveedores.py <producto>")
        print("Ej: python scraper_proveedores.py rayban meta wayfarer gen 1")
        print("Ej: python scraper_proveedores.py airpods pro 2 mayorista")
        print()
        print("Opciones:")
        print("  --test-meta    Probar conexion con Meta API (Facebook/Instagram)")
        print("  --configure    Mostrar instrucciones para configurar Meta API")
        sys.exit(1)

    if sys.argv[1] == "--test-meta":
        if not META_DISPONIBLE:
            print("ERROR: meta_api.py no encontrado")
            sys.exit(1)
        ok, msg = test_meta_conexion()
        print(f"Conexion Meta API: {'OK' if ok else 'FALLO'}")
        print(msg)
        sys.exit(0)

    if sys.argv[1] == "--configure":
        print("=" * 60)
        print("CONFIGURAR META API (Facebook + Instagram)")
        print("=" * 60)
        print()
        print("1. Anda a https://developers.facebook.com")
        print("2. Crea una cuenta de desarrollador (si no tenes)")
        print("3. Crea una nueva app -> Tipo: Negocio")
        print("4. Agrega el producto 'Facebook Login'")
        print("5. Copia el App ID y App Secret")
        print("6. Genera un User Access Token (Settings > Advanced)")
        print("7. Si queres Instagram: agrega 'Instagram Basic Display'")
        print()
        print("Luego copiá .env.meta.example a .env y completa los datos:")
        print("  cp .env.meta.example .env")
        print("  (y edita .env con tus credenciales)")
        print()
        print("Despues proba con: python scraper_proveedores.py --test-meta")
        sys.exit(0)

    query = " ".join(sys.argv[1:])
    buscar_producto(query)

if __name__ == "__main__":
    main()
