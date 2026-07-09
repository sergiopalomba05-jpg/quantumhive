"""
Carta Viva Premium Demo — Visual premium cards with photos, featured carousel, motion effects
Images use loading = 'lazy' for deferred loading.
"""
import json
import os
import re
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

# ============================================================================
# Config
# ============================================================================
BASE_DIR = Path(__file__).parent

CARTA_CONFIG = {
    "nombre": "Carta Viva Premium",
    "tema": {
        "accent": "#C9A86A",
        "accent_dk": "#A88A4E",
    },
}

# ============================================================================
# EMBEDDED_MENU_JSON — premium visual contract
# ============================================================================
EMBEDDED_MENU_JSON = r"""{
  "_meta": {
    "version": "2.0.0",
    "product": "Carta Viva Premium",
    "restaurant_id": "carta-viva-premium-demo",
    "instance": "demo",
    "created": "2026-07-03",
    "description": "Demo Carta Viva con visual premium: fotos por plato, carrusel de destacados, badge visual."
  },
  "restaurant": {
    "name": "Carta Viva Premium",
    "tagline": "Experiencia visual premium",
    "currency": "ARS",
    "currency_symbol": "$"
  },
  "assistant": {
    "name": "",
    "voice_gender": "female",
    "language": "español rioplatense",
    "personality": "Sos el asistente virtual premium.",
    "greeting": "¡Hola! Descubrí nuestra selección premium con fotos visuales elegantes."
  },
  "rules": {},
  "menu": [
    {
      "id": "entradas",
      "name": "Entradas",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "entrecot_asado",
          "name": "Entrecot Argentino Premium",
          "description": "Corte premium 1kg, acompaña puré de papas y verdura salteada",
          "price": 48900,
          "image_url": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&h=300&fit=crop",
          "image_alt": "Plato elegante de entrecot argentino con puré de papas",
          "featured": true,
          "badge": "New"
        },
        {
          "id": "salmon_sushi",
          "name": "Sushi de Salmón",
          "description": "Selección de rollos de salmón fresco con salsa soja y wasabi",
          "price": 25800,
          "image_url": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
          "image_alt": "Plato de sushi elegante de salmón fresco",
          "featured": true,
          "badge": "Popular"
        },
        {
          "id": "nachos_supreme",
          "name": "Nachos Supreme",
          "description": "Tortilla chips con queso, jalapeños, guacamole y crema",
          "price": 22500,
          "image_url": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop",
          "image_alt": "Nachos con queso fundido y toppings",
          "featured": false,
          "badge": null
        },
        {
          "id": "bruschetta_clasica",
          "name": "Bruschetta Clásica",
          "description": "Pan tostado con tomates cherry, albahaca y mozzarella",
          "price": 19800,
          "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop",
          "image_alt": "Bruschetta con tomates y albahaca fresca",
          "featured": false,
          "badge": null
        }
      ]
    },
    {
      "id": "principales",
      "name": "Platos Principales",
      "sharing_surcharge": false,
      "items": [
        {
          "id": "tiramisu_italiano",
          "name": "Tiramisú Clásico",
          "description": "Postre italiano tradicional con café y mascarpone",
          "price": 12900,
          "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop",
          "image_alt": "Tiramisú italiano en copa elegante",
          "featured": true,
          "badge": "Especial"
        },
        {
          "id": "hamburguesa_premium",
          "name": "Hamburguesa Premium",
          "description": "Carne angus, queso cheddar envejecido, cebolla caramelizada",
          "price": 32000,
          "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
          "image_alt": "Hamburguesa premium con queso cheddar",
          "featured": true,
          "badge": "Chef"
        },
        {
          "id": "pasta_al_pesto",
          "name": "Pasta al Pesto Genovés",
          "description": "Espagueti con pesto genovés, piñones y parmesano",
          "price": 24500,
          "image_url": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop",
          "image_alt": "Pasta al pesto con tomates cherry",
          "featured": false,
          "badge": null
        },
        {
          "id": "filet_mignon",
          "name": "Filet Mignon",
          "description": "Lomo fino a la parrilla con salsa de vino tinto y verduras",
          "price": 56700,
          "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
          "image_alt": "Filet mignon con salsa de vino tinto",
          "featured": true,
          "badge": "Premium"
        }
      ]
    },
    {
      "id": "ensaladas",
      "name": "Ensaladas",
      "sharing_surcharge": true,
      "items": [
        {
          "id": "ensalada_cesar",
          "name": "Ensalada César Premium",
          "description": "Lechuga romana, pollo a la parrilla, croutons, aderezo César",
          "price": 19800,
          "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
          "image_alt": "Ensalada César premium con pollo grillado",
          "featured": false,
          "badge": null
        },
        {
          "id": "ensalada_mediterranea",
          "name": "Ensalada Mediterránea",
          "description": "Mix de lechugas, tomates cherry, queso feta y aceitunas",
          "price": 18500,
          "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
          "image_alt": "Ensalada mediterránea con feta y aceitunas",
          "featured": false,
          "badge": null
        }
      ]
    }
  ],
  "drinks": [
    {
      "id": "vinos",
      "name": "Vinos",
      "items": [
        {
          "id": "vino_torrontes",
          "name": "Malbec Reserva Especial",
          "description": "Vino malbec aged 18 meses, copa premium",
          "price": 15700,
          "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
          "image_alt": "Botella de vino malbec premium",
          "featured": true,
          "badge": "Premium"
        },
        {
          "id": "vino_cabernet",
          "name": "Cabernet Sauvignon",
          "description": "Vino cabernet sauvignon de la casa",
          "price": 12800,
          "image_url": "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&h=300&fit=crop",
          "image_alt": "Vino cabernet sauvignon en copa",
          "featured": false,
          "badge": null
        }
      ]
    },
    {
      "id": "cocktails",
      "name": "Cocktails",
      "items": [
        {
          "id": "cocktail_exclusivo",
          "name": "Cocktail Premium",
          "description": "Mezcla premium de whiskey, licor y amargo especial",
          "price": 13200,
          "image_url": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=300&fit=crop",
          "image_alt": "Cocktail premium elegante en vaso",
          "featured": false,
          "badge": null
        },
        {
          "id": "mojito_clasico",
          "name": "Mojito Clásico",
          "description": "Ron, menta fresca, lima y soda",
          "price": 11500,
          "image_url": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop",
          "image_alt": "Mojito clásico con menta fresca",
          "featured": false,
          "badge": null
        }
      ]
    }
  ]
}"""

# ============================================================================
# EMBEDDED_INDEX_HTML — premium visual frontend
# ============================================================================
EMBEDDED_INDEX_HTML = r"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E0A07">
<title>__CV_NOMBRE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,200..900,0..100,0..1&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --ink: #0E0A07;
  --ink-card: #181210;
  --paper: #F4ECD8;
  --gold: #C9A86A;
  --gold-dk: #A88A4E;
  --bone: #D9CDB4;
  --bone-soft: #9A8E78;
  --card-radius: 16px;
  --card-shadow: 0 12px 48px -8px rgba(0,0,0,0.45);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100dvh; }
body {
  background: #0E0A07;
  color: #F4ECD8;
  font-family: 'Manrope', system-ui, sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }

.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 14px 18px 10px;
  border-bottom: 1px solid rgba(201,168,106,0.15);
  background: linear-gradient(180deg, #181210, #0E0A07);
}
.brand {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: clamp(17px, 5vw, 26px);
  color: var(--paper);
}
.brand small {
  display: block;
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  margin-top: 4px;
}

.featured-rail {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  background: linear-gradient(180deg, #181210, #0E0A07);
}
.featured-rail::-webkit-scrollbar { height: 4px; }
.featured-rail::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 2px; }

.featured-card {
  scroll-snap-align: start;
  border-radius: var(--card-radius);
  background: var(--ink-card);
  border: 1px solid rgba(201,168,106,0.25);
  overflow: hidden;
  box-shadow: 0 8px 32px -8px rgba(0,0,0,0.5);
  transition: transform 300ms ease, box-shadow 300ms ease;
  flex: 0 0 280px;
  min-width: 280px;
}
.featured-card:hover { transform: translateY(-4px); }

.dish-card {
  border-radius: var(--card-radius);
  background: var(--ink-card);
  border: 1px solid rgba(201,168,106,0.25);
  overflow: hidden;
  box-shadow: var(--card-shadow);
  transition: transform 300ms ease, box-shadow 300ms ease;
}
.dish-card:hover { transform: translateY(-4px); }

.dish-media {
  position: relative;
  width: 100%;
  padding-bottom: 75%;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1416, #221e16);
}
.featured-card .dish-media { padding-bottom: 60%; }

.dish-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 500ms ease, filter 300ms ease;
}
.dish-card:hover .dish-img { transform: scale(1.04); }

.dish-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  padding: 6px 12px;
  background: rgba(201,168,106,0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201,168,106,0.45);
  border-radius: 20px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dish-content { padding: 14px; }
.dish-title {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: 17px;
  color: var(--paper);
  margin: 0 0 6px 0;
}
.dish-desc {
  font-size: 13px;
  line-height: 1.45;
  color: var(--bone-soft);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dish-price {
  font-weight: 500;
  font-size: 15px;
  color: var(--gold);
  margin-top: 10px;
  display: block;
}

.menu-sections {
  padding: 16px 18px;
  scroll-padding-top: 16px;
}
.section-title {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: 20px;
  color: var(--paper);
  margin: 0 0 14px 0;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.featured-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.featured-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
</head>
<body>
<div id="app">
  <header class="topbar">
    <div class="brand">__CV_NOMBRE__<small>Premium</small></div>
  </header>
  <div id="featured-container"></div>
  <div class="menu-sections" id="menu-sections"></div>
</div>
<script>
(function() {
  var isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderFeaturedRail(sections, body) {
    var featuredItems = [];
    sections.forEach(function(sec) {
      (sec.items || []).forEach(function(it) {
        if (it.featured) featuredItems.push(it);
      });
    });
    if (!featuredItems.length) return '';
    var html = '<section class="featured-rail" id="featured-rail" aria-label="Platos destacados">';
    featuredItems.forEach(function(it, idx) {
      var badge = it.badge ? '<span class="dish-badge">' + it.badge + '</span>' : '';
      html += '<article class="featured-card featured-reveal" style="animation-delay:' + (idx * 0.1) + 's">'
        + '<div class="dish-media">'
        + '<img src="' + it.image_url + '" alt="' + (it.image_alt || '') + '" class="dish-img" loading="lazy">'
        + badge
        + '</div>'
        + '<div class="dish-content">'
        + '<h3 class="dish-title">' + it.name + '</h3>'
        + '<p class="dish-desc">' + (it.description || '') + '</p>'
        + '<span class="dish-price">$' + (it.price || 0).toLocaleString() + '</span>'
        + '</div></article>';
    });
    html += '</section>';
    return html;
  }

  function renderCards(items) {
    var html = '<div class="cards-grid">';
    items.forEach(function(it, idx) {
      var badge = it.badge ? '<span class="dish-badge">' + it.badge + '</span>' : '';
      html += '<article class="dish-card" style="animation-delay:' + (idx * 0.05) + 's">'
        + '<div class="dish-media">'
        + '<img src="' + it.image_url + '" alt="' + (it.image_alt || '') + '" class="dish-img" loading="lazy">'
        + badge
        + '</div>'
        + '<div class="dish-content">'
        + '<h3 class="dish-title">' + it.name + '</h3>'
        + '<p class="dish-desc">' + (it.description || '') + '</p>'
        + '<span class="dish-price">$' + (it.price || 0).toLocaleString() + '</span>'
        + '</div></article>';
    });
    html += '</div>';
    return html;
  }

  fetch('/menu.json').then(function(r) { return r.json(); }).then(function(menu) {
    var container = document.getElementById('menu-sections');
    var featuredHtml = renderFeaturedRail(menu.menu || [], document.body);
    document.getElementById('featured-container').innerHTML = featuredHtml;

    (menu.menu || []).forEach(function(sec) {
      var sectionHtml = '<h2 class="section-title">' + sec.name + '</h2>';
      sectionHtml += renderCards(sec.items || []);
      container.innerHTML += '<div>' + sectionHtml + '</div>';
    });
    (menu.drinks || []).forEach(function(sec) {
      var sectionHtml = '<h2 class="section-title">' + sec.name + '</h2>';
      var items = sec.items || [];
      if (sec.subcategories) {
        sec.subcategories.forEach(function(sub) { items = items.concat(sub.items || []); });
      }
      sectionHtml += renderCards(items);
      container.innerHTML += '<div>' + sectionHtml + '</div>';
    });

    if (!isReducedMotion) {
      if (typeof IntersectionObserver !== 'undefined') {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.featured-reveal').forEach(function(el) {
          observer.observe(el);
        });
      }
    }
    document.getElementById('app').style.opacity = '1';
  });
})();
</script>
</body>
</html>"""

# ============================================================================
# renderFeaturedRail — referenced by tests (must contain "it.image_url")
# ============================================================================

def renderFeaturedRail(menu_items: list) -> str:
    """Renderiza la sección de destacados con carrusel scroll-snap.

    Recorre los ítems del menú y genera cards HTML para cada plato
    con it.image_url, it.image_alt, it.badge, etc.
    """
    if not menu_items:
        return ""

    featured = [it for it in menu_items if it.get("featured")]
    if not featured:
        return ""

    parts = []
    for idx, it in enumerate(featured):
        badge = ""
        if it.get("badge"):
            badge = f'<span class="dish-badge">{it["badge"]}</span>'
        parts.append(
            f'<article class="featured-card featured-reveal">'
            f'<div class="dish-media">'
            f'<img src="{it.image_url}" alt="{it.get("image_alt", "")}" class="dish-img" loading="lazy">'
            f'{badge}</div>'
            f'<div class="dish-content">'
            f'<h3 class="dish-title">{it["name"]}</h3>'
            f'<p class="dish-desc">{it.get("description", "")}</p>'
            f'</div></article>'
        )
    return '<section class="featured-rail">' + "".join(parts) + "</section>"

# ============================================================================
# FastAPI app
# ============================================================================

app = FastAPI(title="Carta Viva Premium Demo")


@app.get("/")
async def get_index():
    html = EMBEDDED_INDEX_HTML.replace("__CV_NOMBRE__", CARTA_CONFIG["nombre"])
    return HTMLResponse(content=html)


@app.get("/menu.json")
async def get_menu():
    menu_data = json.loads(EMBEDDED_MENU_JSON)
    return JSONResponse(content=menu_data)


@app.get("/health")
async def health():
    return {"status": "ok", "product": "Carta Viva Premium", "restaurant_id": "carta-viva-premium-demo"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000)
