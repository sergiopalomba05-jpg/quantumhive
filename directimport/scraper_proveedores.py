#!/usr/bin/env python3
"""Buscador de precios y proveedores mayoristas en Argentina"""

import sys
import re
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
import requests

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

def buscar_proveedor_directo(query: str):
    """Busca datos de contacto del proveedor"""
    print(f"\n>>> Buscando datos de contacto para: {query[:60]}...")
    try:
        r = requests.get(query, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            text = r.text
            # Buscar telefonos
            tels = re.findall(r'(?:\+?54)?\s*?\(?\d{2,4}\)?\s*?\d{2,4}[\s-]?\d{4}', text)
            # Buscar emails
            emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
            # Buscar direcciones (calle + numero)
            dirs = re.findall(r'[A-Z][a-záéíóúñ]+ \d{1,5}\s*(?:,\s*[A-Z][a-záéíóúñ]+)*', text)
            if tels or emails or dirs:
                return {"telefonos": list(set(tels))[:3], "emails": list(set(emails))[:3], "direcciones": list(set(dirs))[:3]}
    except:
        pass
    return None

def buscar_producto(producto: str, max_usd=330):
    sep = "=" * 70
    print(sep)
    print(f"BUSQUEDA: {producto}")
    print(f"FILTRO PRECIO: < ${max_usd} USD")
    print(sep)
    print()

    # Estrategias de busqueda
    estrategias = [
        f'"{producto}" proveedor mayorista Argentina',
        f'"{producto}" precio Argentina',
        f'distribuidor "{producto}" Argentina telefono direccion',
        f'"{producto}" wholesale Argentina supplier',
        f'comprar "{producto}" Argentina envio',
    ]

    todos = []
    for q in estrategias:
        print(f"> Buscando: {q}")
        todos.extend(buscar_dd(q))
        print(f"  -> {len(todos)} resultados acumulados")

    # Tambien ML
    print(f"\n> Buscando en MercadoLibre: {producto}")
    todos.extend(buscar_ml(producto))

    print(f"\n{sep}")
    print(f"RESULTADOS ({len(todos)} total, mostrando unicos)")
    print(sep)
    print()

    if not todos:
        print("No se encontraron resultados.")
        return

    vistos = set()
    for i, r in enumerate(todos, 1):
        url = r.get("url", "")
        tit = r.get("titulo", "")[:100]
        if url in vistos:
            continue
        vistos.add(url)

        precio = r.get("precio", "")
        snippet = r.get("snippet", "")[:150]
        fuente = r.get("fuente", "Web")

        print(f"--- Resultado {i} ---")
        print(f"  Titulo: {tit}")
        if precio:
            print(f"  Precio: {precio}")
        if snippet:
            print(f"  Info: {snippet}")
        print(f"  URL: {url}")

        # Intentar extraer contacto de la pagina
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

def main():
    if len(sys.argv) < 2:
        print("Uso: python scraper_proveedores.py <producto>")
        print("Ej: python scraper_proveedores.py rayban meta wayfarer gen 1")
        print("Ej: python scraper_proveedores.py airpods pro 2 mayorista")
        sys.exit(1)

    query = " ".join(sys.argv[1:])
    buscar_producto(query)

if __name__ == "__main__":
    main()
