# Bot de Telegram "Cata" (Demo Cata Home) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el demo en Telegram del agente humanizado "Cata" para Cata Home: conversa con naturalidad (voseo), recomienda productos sin inventar precios, responde por voz si le mandan audio, y muestra las respuestas escribiéndose en vivo (streaming).

**Architecture:** Bot en `python-telegram-bot` (polling) → orquestador que llama a Gemini (cerebro + STT + TTS, una sola key) con tool calling → proveedores detrás de interfaces (`CatalogProvider`, `TTSProvider`, `MemoryStore`) para poder cambiar a Tienda Nube / ElevenLabs / Supabase sin tocar el resto. La base de conocimiento (persona, FAQ, promos) vive en archivos de datos del cliente y se inyecta en el system prompt; los precios/stock se traen por la tool `buscar_producto`.

**Tech Stack:** Python 3.11+ · python-telegram-bot v20+ · google-genai (Gemini) · SQLite · ffmpeg (conversión de audio) · pytest + pytest-asyncio.

**Convención de trabajo:** se trabaja sobre `main` (regla #12 del CLAUDE.md). Todos los comandos `pytest`/`python` se corren desde `agencia/productos/bot-telegram/` salvo que se indique otra cosa. Las keys viven solo en `agencia/clientes/cata-home/.env` (ya creado y gitignoreado) — **nunca** se commitea.

---

## Estructura de archivos

```
agencia/productos/bot-telegram/        ← el PRODUCTO (motor reusable)
├── config.py                          ← carga .env del cliente + flags
├── pytest.ini                         ← pythonpath=. + asyncio auto
├── requirements.txt / requirements-dev.txt
├── .env.ejemplo                       ← claves vacías (SÍ va al repo)
├── README.md
├── Dockerfile                         ← deploy con ffmpeg (Render)
├── scripts/smoke_gemini.py            ← spike: confirma IDs de modelo + SDK
├── providers/
│   ├── catalog.py                     ← Producto + CatalogProvider + JSONCatalogProvider
│   ├── memory.py                      ← Turno + MemoryStore + SQLiteMemoryStore
│   ├── stt.py                         ← transcribir() con Gemini
│   └── tts.py                         ← TTSProvider + GeminiTTS + pcm_a_ogg()
├── knowledge/loader.py                ← KnowledgeBase + cargar_kb()
├── agent/
│   ├── persona.py                     ← construir_system_prompt()
│   ├── tools.py                       ← buscar_producto (decl + ejecutor)
│   └── orchestrator.py                ← Agente (Gemini stream + tool loop)
├── bot/
│   ├── streaming.py                   ← StreamThrottle
│   ├── handlers.py                    ← on_start / on_text / on_voice
│   ├── app.py                         ← arma la Application + inyecta deps
│   └── __main__.py                    ← entrypoint (python -m bot)
└── tests/                             ← un test_*.py por módulo

agencia/clientes/cata-home/            ← CONFIG del cliente
├── perfil.md                          ← ajustes finos de la persona
├── .env                               ← TELEGRAM_TOKEN, GEMINI_API_KEY (gitignoreado)
└── datos/                             ← base de conocimiento (editable por Alan)
    ├── negocio.md · promos.md · envios.md · pagos.md · politicas.md
    ├── escalamiento.md                ← WhatsApp/email + HORARIO (pendiente Sergio)
    └── catalogo.json                  ← semilla (Alan reemplaza)
```

Cada `providers/`, `knowledge/`, `agent/`, `bot/`, `tests/` lleva un `__init__.py` vacío.

---

## Task 1: Scaffolding, config y dependencias

**Files:**
- Create: `agencia/productos/bot-telegram/requirements.txt`
- Create: `agencia/productos/bot-telegram/requirements-dev.txt`
- Create: `agencia/productos/bot-telegram/pytest.ini`
- Create: `agencia/productos/bot-telegram/.env.ejemplo`
- Create: `agencia/productos/bot-telegram/config.py`
- Create: `agencia/productos/bot-telegram/{providers,knowledge,agent,bot,tests}/__init__.py`
- Test: `agencia/productos/bot-telegram/tests/test_config.py`

- [ ] **Step 1: Crear los `__init__.py` y archivos de dependencias**

`requirements.txt`:
```
python-telegram-bot[ext]>=20.7,<22
google-genai>=1.0,<2
python-dotenv>=1.0
```

`requirements-dev.txt`:
```
-r requirements.txt
pytest>=8
pytest-asyncio>=0.23
```

`pytest.ini`:
```ini
[pytest]
pythonpath = .
asyncio_mode = auto
testpaths = tests
```

`.env.ejemplo`:
```
TELEGRAM_TOKEN=
TELEGRAM_ADMIN_ID=
GEMINI_API_KEY=
# Opcionales (tienen default en config.py):
# MODEL_CHAT=gemini-3.5-flash
# MODEL_TTS=gemini-3.1-flash-tts-preview
# TTS_VOICE=Aoede
# MEMORY_WINDOW=12
# VOICE_REPLY_MIRROR=true
```

Crear los paquetes:
```bash
cd agencia/productos/bot-telegram
mkdir -p providers knowledge agent bot tests scripts
touch providers/__init__.py knowledge/__init__.py agent/__init__.py bot/__init__.py tests/__init__.py
```

- [ ] **Step 2: Escribir el test de config**

`tests/test_config.py`:
```python
import importlib, os


def test_config_lee_env_y_defaults(tmp_path, monkeypatch):
    cliente = tmp_path / "cliente"
    (cliente / "datos").mkdir(parents=True)
    (cliente / ".env").write_text(
        "TELEGRAM_TOKEN=tok123\nGEMINI_API_KEY=key456\n", encoding="utf-8")
    monkeypatch.setenv("CATAHOME_CLIENT_DIR", str(cliente))
    # asegurar que no haya valores heredados del entorno real
    for v in ["TELEGRAM_TOKEN", "GEMINI_API_KEY", "MODEL_CHAT"]:
        monkeypatch.delenv(v, raising=False)

    import config
    importlib.reload(config)

    assert config.Config.TELEGRAM_TOKEN == "tok123"
    assert config.Config.GEMINI_API_KEY == "key456"
    assert config.Config.MODEL_CHAT  # default no vacío
    assert config.validar() == []


def test_config_reporta_faltantes(tmp_path, monkeypatch):
    cliente = tmp_path / "cliente2"
    (cliente / "datos").mkdir(parents=True)
    (cliente / ".env").write_text("", encoding="utf-8")
    monkeypatch.setenv("CATAHOME_CLIENT_DIR", str(cliente))
    for v in ["TELEGRAM_TOKEN", "GEMINI_API_KEY"]:
        monkeypatch.delenv(v, raising=False)

    import config
    importlib.reload(config)
    faltan = config.validar()
    assert "TELEGRAM_TOKEN" in faltan and "GEMINI_API_KEY" in faltan
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `pytest tests/test_config.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'config'`.

- [ ] **Step 4: Escribir `config.py`**

```python
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

PRODUCT_DIR = Path(__file__).resolve().parent
DEFAULT_CLIENT_DIR = (PRODUCT_DIR / ".." / ".." / "clientes" / "cata-home").resolve()

CLIENT_DIR = Path(os.environ.get("CATAHOME_CLIENT_DIR", str(DEFAULT_CLIENT_DIR))).resolve()
DATOS_DIR = CLIENT_DIR / "datos"

# Carga el .env del cliente si existe (en prod las vars vienen del entorno)
load_dotenv(CLIENT_DIR / ".env", override=False)


class Config:
    TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
    TELEGRAM_ADMIN_ID = os.environ.get("TELEGRAM_ADMIN_ID", "")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    MODEL_CHAT = os.environ.get("MODEL_CHAT", "gemini-3.5-flash")
    MODEL_TTS = os.environ.get("MODEL_TTS", "gemini-3.1-flash-tts-preview")
    TTS_VOICE = os.environ.get("TTS_VOICE", "Aoede")
    MEMORY_DB = os.environ.get("MEMORY_DB", str(CLIENT_DIR / "cata.db"))
    MEMORY_WINDOW = int(os.environ.get("MEMORY_WINDOW", "12"))
    VOICE_REPLY_MIRROR = os.environ.get("VOICE_REPLY_MIRROR", "true").lower() == "true"
    STREAM_THROTTLE_SECS = float(os.environ.get("STREAM_THROTTLE_SECS", "1.1"))


def validar() -> list[str]:
    faltan = []
    if not Config.TELEGRAM_TOKEN:
        faltan.append("TELEGRAM_TOKEN")
    if not Config.GEMINI_API_KEY:
        faltan.append("GEMINI_API_KEY")
    return faltan
```

> Nota: `config.py` lee `CATAHOME_CLIENT_DIR` en import-time, por eso los tests hacen `importlib.reload`.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pytest tests/test_config.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/requirements.txt agencia/productos/bot-telegram/requirements-dev.txt agencia/productos/bot-telegram/pytest.ini agencia/productos/bot-telegram/.env.ejemplo agencia/productos/bot-telegram/config.py agencia/productos/bot-telegram/providers/__init__.py agencia/productos/bot-telegram/knowledge/__init__.py agencia/productos/bot-telegram/agent/__init__.py agencia/productos/bot-telegram/bot/__init__.py agencia/productos/bot-telegram/tests/__init__.py agencia/productos/bot-telegram/tests/test_config.py
git commit -m "feat(bot-telegram): scaffolding + config del demo Cata Home"
```

---

## Task 2: Base de conocimiento (datos del cliente)

Contenido (no código) extraído del brief. Va en el repo (no es secreto). El `horario` queda como pendiente declarado (input de Sergio, ver spec §14).

**Files:**
- Create: `agencia/clientes/cata-home/datos/negocio.md`
- Create: `agencia/clientes/cata-home/datos/promos.md`
- Create: `agencia/clientes/cata-home/datos/envios.md`
- Create: `agencia/clientes/cata-home/datos/pagos.md`
- Create: `agencia/clientes/cata-home/datos/politicas.md`
- Create: `agencia/clientes/cata-home/datos/escalamiento.md`
- Create: `agencia/clientes/cata-home/datos/catalogo.json`
- Create: `agencia/clientes/cata-home/perfil.md`

- [ ] **Step 1: `negocio.md`**
```markdown
Cata Home — Deco & Hogar. Marca argentina de deco y artículos para el hogar.
Lema: "Cada mesa, un encuentro". No vendemos objetos, vendemos momentos y un hogar lindo.
Instagram: @catahome.ar · Tienda online: https://catahome.com.ar
Email: catahome.ar@gmail.com · CUIT: 20340270321
Linktree: linktr.ee/catahome
Categorías: Mesa (vajilla, individuales, vasos & copas, tazas & jarros, jarras & set, bowls & ensaladeras, cubiertos), Cocina (accesorios, cocción), Textiles (alfombras, almohadones, mantas, pie de cama), Baño (accesorios, sets, dispensers), Deco (bandejas, cestos & canastos). Además: New in (novedades) y Oportunidades (ofertas).
Materiales frecuentes: vidrio borosilicato, cerámica, porcelana, fibras naturales, madera/bambú, hierro, acero inox, mármol, melamina, resina, PVC.
```

- [ ] **Step 2: `promos.md`**
```markdown
- 20% OFF pagando con transferencia o depósito bancario.
- 3 cuotas sin interés con tarjeta de crédito (en todo el sitio).
- Envío gratis: +$80.000 en CABA/GBA · +$160.000 a todo el país.
- Envío Next Day GRATIS sin monto mínimo en Vicente López y San Isidro.
- Sección "Oportunidades": hasta 40% OFF en seleccionados.
```

- [ ] **Step 3: `envios.md`**
```markdown
Envíos a todo el país por OCA (a domicilio o retiro en sucursal). El costo se calcula por código postal, peso y medidas en el carrito.
Envío gratis: +$80.000 CABA/GBA, +$160.000 todo el país. Next Day gratis sin mínimo en Vicente López y San Isidro.
Tiempos (aproximados, días hábiles, sujeto a OCA y CP): despacho 1–2 días hábiles; luego OCA entrega ~2 días hábiles (CABA/GBA) y ~3 días hábiles (interior). Se avisa por mail con código de seguimiento.
Si no hay nadie al entregar: OCA reintenta a las 24/48 h; si no, se retira en el centro de distribución dentro de 72 h con DNI + código. Puede recibir cualquier adulto.
```

- [ ] **Step 4: `pagos.md`**
```markdown
Formas de pago: Mercado Pago (tarjetas crédito/débito, dinero en cuenta, efectivo en Pago Fácil/Rapipago).
3 cuotas sin interés con crédito bancarizado. 20% OFF por transferencia/depósito.
Todos los precios incluyen IVA. Nunca pedimos datos de tarjeta por el chat.
Cómo comprar: elegir productos → agregar al carrito → iniciar compra → datos (nombre, email, dirección, DNI) → elegir envío → pagar. Notificaciones por mail en cada etapa.
```

- [ ] **Step 5: `politicas.md`**
```markdown
Cambios: por no satisfacción dentro de los 7 días, con el producto sin uso; el envío del cambio corre por cuenta del comprador.
Productos dañados/rotos: enviar fotos + N° de orden a catahome.ar@gmail.com o por WhatsApp; Cata Home cubre el cambio. El reembolso se hace por el mismo medio de pago tras verificar el producto.
Cancelar una compra: por WhatsApp con el N° de orden a mano.
```

- [ ] **Step 6: `escalamiento.md`**
```markdown
Derivar a una persona ante: reclamos, post-venta complejo, productos dañados, cancelaciones, o si el cliente lo pide.
Al derivar, pedile que tenga a mano: N° de orden y, si es un dañado, fotos del producto.
WhatsApp de atención: +54 9 11 3026 8179
Email: catahome.ar@gmail.com
Horario de atención: (PENDIENTE — lo completa Sergio antes del go-live)
```

- [ ] **Step 7: `catalogo.json` (semilla — Alan reemplaza)**
```json
[
  {"nombre": "Mug Inger", "categoria": "Mesa", "descripcion": "Taza/jarro para el día a día.", "material": "cerámica", "precio_lista": 9900, "stock": true, "relacionados": ["Bowl Túnez"]},
  {"nombre": "Bowl Túnez", "categoria": "Mesa", "descripcion": "Bowl de la línea Túnez.", "material": "cerámica", "precio_lista": 15990, "stock": true, "relacionados": ["Plato playo Túnez"]},
  {"nombre": "Plato playo Túnez", "categoria": "Mesa", "descripcion": "Plato playo de la línea Túnez.", "material": "cerámica", "precio_lista": 16675, "stock": true, "relacionados": ["Bowl Túnez"]},
  {"nombre": "Jarra Suiza", "categoria": "Mesa", "descripcion": "Jarra con tapa de bambú y acero. Apta lavavajillas y microondas.", "material": "vidrio borosilicato", "capacidad": "1500 ml", "cuidados": "apto lavavajillas y microondas", "precio_lista": 35006, "stock": true, "relacionados": ["Set de vasos altos"]},
  {"nombre": "Canasto fibra natural", "categoria": "Deco", "descripcion": "Cesto de fibra natural para orden y deco.", "material": "fibras naturales", "precio_lista": 37000, "stock": true, "relacionados": []}
]
```

- [ ] **Step 8: `perfil.md`**
```markdown
# Ajustes finos de la persona (Cata Home)
- Privilegiar respuestas cortas y cálidas; nunca sonar robótica.
- Si el cliente parece dudar, recordar con naturalidad un beneficio (3 cuotas, 20% transferencia, envío gratis según monto) sin ser insistente.
- Cuando recomiendes un producto, sumá un cross-sell con el "relacionados" de su ficha si encaja.
```

- [ ] **Step 9: Verificar que el catálogo es JSON válido**

Run: `python -c "import json,pathlib;json.loads(pathlib.Path('../../clientes/cata-home/datos/catalogo.json').read_text(encoding='utf-8'));print('JSON OK')"`
Expected: `JSON OK`

- [ ] **Step 10: Commit**

```bash
cd ../../..
git add agencia/clientes/cata-home/datos agencia/clientes/cata-home/perfil.md
git commit -m "feat(cata-home): base de conocimiento del demo (negocio, FAQ, catalogo semilla)"
```

---

## Task 3: CatalogProvider (Producto + JSON)

**Files:**
- Create: `agencia/productos/bot-telegram/providers/catalog.py`
- Test: `agencia/productos/bot-telegram/tests/test_catalog.py`

- [ ] **Step 1: Escribir el test**

`tests/test_catalog.py`:
```python
import json
from providers.catalog import Producto, JSONCatalogProvider


def _catalogo(tmp_path):
    data = [
        {"nombre": "Jarra Suiza", "categoria": "Mesa", "material": "vidrio borosilicato",
         "precio_lista": 35006, "stock": True, "relacionados": ["Set de vasos"]},
        {"nombre": "Canasto fibra natural", "categoria": "Deco", "material": "fibras naturales",
         "precio_lista": 37000, "stock": False},
    ]
    p = tmp_path / "catalogo.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return JSONCatalogProvider(p)


def test_precios_derivados_coinciden_con_el_brief():
    p = Producto(nombre="Jarra Suiza", precio_lista=35006)
    assert p.precio_efectivo == 35006
    assert p.precio_transferencia == 28004   # int(35006*0.8)
    assert p.valor_cuota == 11668            # int(35006/3)


def test_precio_oferta_manda_sobre_lista():
    p = Producto(nombre="X", precio_lista=10000, precio_oferta=8000)
    assert p.precio_efectivo == 8000
    assert p.precio_transferencia == 6400


def test_buscar_por_nombre_y_material(tmp_path):
    cat = _catalogo(tmp_path)
    assert [p.nombre for p in cat.buscar("jarra")] == ["Jarra Suiza"]
    assert [p.nombre for p in cat.buscar("fibra")] == ["Canasto fibra natural"]
    assert cat.buscar("zzz") == []
    assert cat.buscar("") == []


def test_por_categoria_y_categorias(tmp_path):
    cat = _catalogo(tmp_path)
    assert [p.nombre for p in cat.por_categoria("Mesa")] == ["Jarra Suiza"]
    assert cat.por_categoria("mesa")[0].nombre == "Jarra Suiza"  # case-insensitive
    assert cat.categorias() == ["Mesa", "Deco"]


def test_archivo_inexistente_no_explota(tmp_path):
    cat = JSONCatalogProvider(tmp_path / "no_existe.json")
    assert cat.buscar("algo") == []
    assert cat.categorias() == []
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_catalog.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'providers.catalog'`.

- [ ] **Step 3: Escribir `providers/catalog.py`**

```python
from __future__ import annotations
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Producto:
    nombre: str
    categoria: str = ""
    descripcion: str = ""
    material: str = ""
    medidas: str = ""
    capacidad: str = ""
    cuidados: str = ""
    precio_lista: int = 0
    precio_oferta: int | None = None
    stock: bool = True
    relacionados: list[str] = field(default_factory=list)

    @property
    def precio_efectivo(self) -> int:
        return self.precio_oferta if self.precio_oferta else self.precio_lista

    @property
    def precio_transferencia(self) -> int:
        # 20% OFF; truncado para coincidir con los ejemplos del brief
        return int(self.precio_efectivo * 0.8)

    @property
    def valor_cuota(self) -> int:
        # 3 cuotas sin interés
        return int(self.precio_efectivo / 3)


class CatalogProvider(ABC):
    @abstractmethod
    def buscar(self, query: str) -> list[Producto]: ...
    @abstractmethod
    def por_categoria(self, categoria: str) -> list[Producto]: ...
    @abstractmethod
    def categorias(self) -> list[str]: ...


class JSONCatalogProvider(CatalogProvider):
    """Lee un catálogo de un archivo JSON. (Futuro: TiendaNubeCatalogProvider con el mismo contrato.)"""

    def __init__(self, path: str | Path):
        self._path = Path(path)
        self._productos = self._cargar()

    def _cargar(self) -> list[Producto]:
        if not self._path.exists():
            return []
        data = json.loads(self._path.read_text(encoding="utf-8"))
        return [Producto(**p) for p in data]

    def buscar(self, query: str) -> list[Producto]:
        q = (query or "").lower().strip()
        if not q:
            return []
        tokens = [t for t in q.split() if t]
        res = []
        for p in self._productos:
            heno = f"{p.nombre} {p.categoria} {p.descripcion} {p.material}".lower()
            if any(t in heno for t in tokens):
                res.append(p)
        return res

    def por_categoria(self, categoria: str) -> list[Producto]:
        c = (categoria or "").lower().strip()
        return [p for p in self._productos if p.categoria.lower() == c]

    def categorias(self) -> list[str]:
        vistos: list[str] = []
        for p in self._productos:
            if p.categoria and p.categoria not in vistos:
                vistos.append(p.categoria)
        return vistos
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_catalog.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/providers/catalog.py agencia/productos/bot-telegram/tests/test_catalog.py
git commit -m "feat(bot-telegram): CatalogProvider con Producto y precios derivados"
```

---

## Task 4: MemoryStore (SQLite)

**Files:**
- Create: `agencia/productos/bot-telegram/providers/memory.py`
- Test: `agencia/productos/bot-telegram/tests/test_memory.py`

- [ ] **Step 1: Escribir el test**

`tests/test_memory.py`:
```python
from providers.memory import SQLiteMemoryStore, Turno


def test_guardar_y_cargar_en_orden(tmp_path):
    store = SQLiteMemoryStore(tmp_path / "m.db")
    store.guardar(111, "user", "hola")
    store.guardar(111, "model", "¡hola! 🏠")
    turnos = store.cargar(111)
    assert [(t.rol, t.texto) for t in turnos] == [("user", "hola"), ("model", "¡hola! 🏠")]
    assert all(isinstance(t, Turno) for t in turnos)


def test_ventana_limita_y_mantiene_los_ultimos(tmp_path):
    store = SQLiteMemoryStore(tmp_path / "m.db")
    for i in range(10):
        store.guardar(1, "user", f"msg{i}")
    turnos = store.cargar(1, limite=3)
    assert [t.texto for t in turnos] == ["msg7", "msg8", "msg9"]


def test_aislamiento_por_chat(tmp_path):
    store = SQLiteMemoryStore(tmp_path / "m.db")
    store.guardar(1, "user", "a")
    store.guardar(2, "user", "b")
    assert [t.texto for t in store.cargar(1)] == ["a"]
    assert [t.texto for t in store.cargar(2)] == ["b"]
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_memory.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'providers.memory'`.

- [ ] **Step 3: Escribir `providers/memory.py`**

```python
from __future__ import annotations
import sqlite3
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Turno:
    rol: str  # "user" | "model"
    texto: str
    ts: float


class MemoryStore(ABC):
    @abstractmethod
    def guardar(self, chat_id: int, rol: str, texto: str) -> None: ...
    @abstractmethod
    def cargar(self, chat_id: int, limite: int = 12) -> list[Turno]: ...


class SQLiteMemoryStore(MemoryStore):
    """Memoria por chat en SQLite. (Futuro: SupabaseMemoryStore con el mismo contrato.)"""

    def __init__(self, db_path: str | Path):
        self._db = str(db_path)
        self._init()

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db)

    def _init(self) -> None:
        with self._conn() as c:
            c.execute(
                """CREATE TABLE IF NOT EXISTS turnos(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER NOT NULL,
                    rol TEXT NOT NULL,
                    texto TEXT NOT NULL,
                    ts REAL NOT NULL)"""
            )
            c.execute("CREATE INDEX IF NOT EXISTS idx_chat ON turnos(chat_id, id)")

    def guardar(self, chat_id: int, rol: str, texto: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO turnos(chat_id, rol, texto, ts) VALUES(?,?,?,?)",
                (chat_id, rol, texto, time.time()),
            )

    def cargar(self, chat_id: int, limite: int = 12) -> list[Turno]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT rol, texto, ts FROM turnos WHERE chat_id=? ORDER BY id DESC LIMIT ?",
                (chat_id, limite),
            ).fetchall()
        rows.reverse()
        return [Turno(r[0], r[1], r[2]) for r in rows]
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_memory.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/providers/memory.py agencia/productos/bot-telegram/tests/test_memory.py
git commit -m "feat(bot-telegram): MemoryStore con SQLite por chat"
```

---

## Task 5: KnowledgeLoader

**Files:**
- Create: `agencia/productos/bot-telegram/knowledge/loader.py`
- Test: `agencia/productos/bot-telegram/tests/test_loader.py`

- [ ] **Step 1: Escribir el test**

`tests/test_loader.py`:
```python
from knowledge.loader import cargar_kb, KnowledgeBase
from providers.catalog import CatalogProvider, Producto


class FakeCatalog(CatalogProvider):
    def buscar(self, query): return []
    def por_categoria(self, categoria): return []
    def categorias(self): return ["Mesa", "Deco"]


def test_carga_archivos_existentes(tmp_path):
    d = tmp_path / "datos"
    d.mkdir()
    (d / "negocio.md").write_text("Cata Home", encoding="utf-8")
    (d / "promos.md").write_text("20% OFF", encoding="utf-8")
    kb = cargar_kb(d, FakeCatalog())
    assert isinstance(kb, KnowledgeBase)
    assert kb.negocio == "Cata Home"
    assert kb.promos == "20% OFF"
    assert kb.envios == ""  # no existe -> string vacío
    assert kb.categorias == ["Mesa", "Deco"]
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_loader.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'knowledge.loader'`.

- [ ] **Step 3: Escribir `knowledge/loader.py`**

```python
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from providers.catalog import CatalogProvider


@dataclass
class KnowledgeBase:
    negocio: str
    promos: str
    envios: str
    pagos: str
    politicas: str
    escalamiento: str
    categorias: list[str]


def _leer(datos_dir: Path, nombre: str) -> str:
    p = datos_dir / nombre
    return p.read_text(encoding="utf-8").strip() if p.exists() else ""


def cargar_kb(datos_dir: str | Path, catalog: CatalogProvider) -> KnowledgeBase:
    d = Path(datos_dir)
    return KnowledgeBase(
        negocio=_leer(d, "negocio.md"),
        promos=_leer(d, "promos.md"),
        envios=_leer(d, "envios.md"),
        pagos=_leer(d, "pagos.md"),
        politicas=_leer(d, "politicas.md"),
        escalamiento=_leer(d, "escalamiento.md"),
        categorias=catalog.categorias(),
    )
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_loader.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/knowledge/loader.py agencia/productos/bot-telegram/tests/test_loader.py
git commit -m "feat(bot-telegram): loader de la base de conocimiento"
```

---

## Task 6: Persona / system prompt

**Files:**
- Create: `agencia/productos/bot-telegram/agent/persona.py`
- Test: `agencia/productos/bot-telegram/tests/test_persona.py`

- [ ] **Step 1: Escribir el test**

`tests/test_persona.py`:
```python
from agent.persona import construir_system_prompt
from knowledge.loader import KnowledgeBase


def _kb():
    return KnowledgeBase(
        negocio="Cata Home — lema Cada mesa, un encuentro",
        promos="20% OFF transferencia",
        envios="OCA a todo el país",
        pagos="Mercado Pago",
        politicas="cambios 7 días",
        escalamiento="WhatsApp +54 9 11 3026 8179",
        categorias=["Mesa", "Deco"],
    )


def test_prompt_incluye_persona_reglas_y_kb():
    p = construir_system_prompt(_kb(), perfil="Respuestas cortas.")
    # persona
    assert "Cata" in p and "voseo" in p.lower()
    # reglas duras
    assert "NUNCA inventes precios" in p
    assert "buscar_producto" in p
    assert "datos de tarjeta" in p
    # contenido de la kb
    assert "20% OFF transferencia" in p
    assert "WhatsApp +54 9 11 3026 8179" in p
    assert "Mesa" in p and "Deco" in p
    # perfil del cliente
    assert "Respuestas cortas." in p


def test_prompt_sin_perfil_no_explota():
    p = construir_system_prompt(_kb())
    assert "Cata Home" in p
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_persona.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'agent.persona'`.

- [ ] **Step 3: Escribir `agent/persona.py`**

```python
from __future__ import annotations
from knowledge.loader import KnowledgeBase

PERSONA_BASE = """\
Sos "Cata", parte del equipo de Cata Home — una marca argentina de deco y hogar.
Hablás en primera persona del singular, en castellano rioplatense (voseo: "tenés", "podés", "te paso").
Tono: cálido, cercano, prolijo. Cata Home transmite calidez de hogar; el lema es "Cada mesa, un encuentro": no vendemos objetos, vendemos momentos.
Usás emojis de hogar con mesura (🏠 ✨ 🛋️). Siempre orientás a ayudar y a cerrar la venta sin ser invasiva.

REGLAS QUE NUNCA ROMPÉS:
- NUNCA digas que sos una IA, un bot, ni nombres de modelos o proveedores. Sos del equipo de Cata Home.
- NUNCA inventes precios ni stock. Si no tenés el dato exacto, decí que lo confirmás y ofrecé pasar con una persona.
- Para precios o stock puntuales usá SIEMPRE la herramienta buscar_producto. Si no devuelve nada, no inventes.
- NUNCA prometas plazos de envío fijos: aclarás "días hábiles aproximados, sujeto a OCA y el código postal".
- NUNCA pidas datos de tarjeta por el chat.
- Temas sensibles (reclamos, productos dañados, cancelaciones): derivá a una persona y pedí que tenga a mano N° de orden y fotos.
- Cerrá siempre ofreciendo una ayuda adicional.
- Usá la memoria de la charla: no repreguntes lo que el cliente ya dijo.

CÓMO RESPONDÉS (ejemplos de tono):
[Cliente] hola, busco algo lindo para regalar
[Cata] ¡Hola! 🏠 Qué lindo regalo de Cata Home. Contame un poco: ¿es para alguien que disfruta la mesa, el mate, la cocina o la deco? Así te muestro lo que mejor pega. Por ejemplo, los sets de vajilla y los canastos de fibra natural son de los más elegidos para regalar ✨
[Cliente] cuánto sale la jarra suiza?
[Cata] La Jarra Suiza (vidrio borosilicato, tapa de bambú y acero, 1,5 L) está $35.006. Pagando por transferencia te queda $28.004 (20% OFF) o en 3 cuotas sin interés de $11.668. ¿Te la reservo o querés ver jarras parecidas?
[Cliente] hacen envíos a Córdoba?
[Cata] ¡Sí! Enviamos a todo el país por OCA 🚚. El costo se calcula por tu código postal en el carrito, y si tu compra supera los $160.000 el envío es gratis a todo el país. Al interior suele llegar en ~3 días hábiles desde que despachamos. ¿Querés que te ayude a armar el pedido?\
"""


def construir_system_prompt(kb: KnowledgeBase, perfil: str = "") -> str:
    cats = ", ".join(kb.categorias) if kb.categorias else "Mesa, Cocina, Textiles, Baño, Deco"
    bloques = [
        PERSONA_BASE,
        f"\n# CATEGORÍAS DEL CATÁLOGO\n{cats}",
        f"\n# EL NEGOCIO\n{kb.negocio}",
        f"\n# PROMOS\n{kb.promos}",
        f"\n# ENVÍOS\n{kb.envios}",
        f"\n# PAGOS\n{kb.pagos}",
        f"\n# CAMBIOS Y DEVOLUCIONES\n{kb.politicas}",
        f"\n# CUÁNDO Y CÓMO DERIVAR A UNA PERSONA\n{kb.escalamiento}",
    ]
    if perfil.strip():
        bloques.append(f"\n# AJUSTES DEL CLIENTE\n{perfil.strip()}")
    return "\n".join(b for b in bloques if b.strip())
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_persona.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/agent/persona.py agencia/productos/bot-telegram/tests/test_persona.py
git commit -m "feat(bot-telegram): system prompt con la persona de Cata + reglas"
```

---

## Task 7: Tool `buscar_producto`

**Files:**
- Create: `agencia/productos/bot-telegram/agent/tools.py`
- Test: `agencia/productos/bot-telegram/tests/test_tools.py`

- [ ] **Step 1: Escribir el test**

`tests/test_tools.py`:
```python
from agent.tools import ejecutar_buscar_producto, BUSCAR_PRODUCTO_DECL
from providers.catalog import CatalogProvider, Producto


class FakeCatalog(CatalogProvider):
    def __init__(self):
        self._p = [Producto(nombre="Jarra Suiza", categoria="Mesa", material="vidrio borosilicato",
                            capacidad="1500 ml", precio_lista=35006, stock=True)]
    def buscar(self, query):
        return self._p if "jarra" in query.lower() else []
    def por_categoria(self, categoria):
        return self._p if categoria.lower() == "mesa" else []
    def categorias(self):
        return ["Mesa"]


def test_declaracion_tiene_nombre_y_params():
    assert BUSCAR_PRODUCTO_DECL["name"] == "buscar_producto"
    assert "query" in BUSCAR_PRODUCTO_DECL["parameters"]["properties"]


def test_busca_y_devuelve_ficha_con_precios():
    res = ejecutar_buscar_producto({"query": "jarra"}, FakeCatalog())
    assert res["encontrados"] == 1
    ficha = res["productos"][0]
    assert ficha["nombre"] == "Jarra Suiza"
    assert ficha["precio_lista"] == 35006
    assert ficha["precio_transferencia"] == 28004
    assert ficha["valor_cuota"] == 11668
    assert ficha["stock"] == "disponible"


def test_por_categoria():
    res = ejecutar_buscar_producto({"categoria": "Mesa"}, FakeCatalog())
    assert res["encontrados"] == 1


def test_sin_resultados_no_inventa():
    res = ejecutar_buscar_producto({"query": "inexistente"}, FakeCatalog())
    assert res["encontrados"] == 0
    assert "nota" in res and "no inventes" in res["nota"].lower()
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_tools.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'agent.tools'`.

- [ ] **Step 3: Escribir `agent/tools.py`**

```python
from __future__ import annotations
from providers.catalog import CatalogProvider, Producto

BUSCAR_PRODUCTO_DECL = {
    "name": "buscar_producto",
    "description": (
        "Busca productos de Cata Home por nombre, palabra clave o categoría. "
        "Usar SIEMPRE antes de dar un precio o decir si hay stock. Devuelve precio de lista, "
        "precio por transferencia (20% OFF), valor de cada cuota (3 sin interés) y disponibilidad."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Nombre o palabra clave del producto, ej: 'jarra suiza', 'canastos'.",
            },
            "categoria": {
                "type": "string",
                "description": "Categoría exacta si el cliente pide una categoría, ej: 'Textiles'.",
            },
        },
    },
}


def _ficha(p: Producto) -> dict:
    return {
        "nombre": p.nombre,
        "categoria": p.categoria,
        "descripcion": p.descripcion,
        "material": p.material,
        "medidas": p.medidas,
        "capacidad": p.capacidad,
        "cuidados": p.cuidados,
        "precio_lista": p.precio_lista,
        "precio_transferencia": p.precio_transferencia,
        "valor_cuota": p.valor_cuota,
        "stock": "disponible" if p.stock else "SIN STOCK",
        "relacionados": p.relacionados,
    }


def ejecutar_buscar_producto(args: dict, catalog: CatalogProvider) -> dict:
    args = args or {}
    query = args.get("query", "") or ""
    categoria = args.get("categoria", "") or ""
    productos: list[Producto] = []
    if categoria:
        productos = catalog.por_categoria(categoria)
    if not productos and query:
        productos = catalog.buscar(query)
    if not productos:
        return {
            "encontrados": 0,
            "productos": [],
            "nota": "No encontré ese producto en el catálogo cargado. No inventes precio ni stock; ofrecé confirmarlo o derivar a una persona.",
        }
    return {"encontrados": len(productos), "productos": [_ficha(p) for p in productos[:5]]}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_tools.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/agent/tools.py agencia/productos/bot-telegram/tests/test_tools.py
git commit -m "feat(bot-telegram): tool buscar_producto (no inventa precios)"
```

---

## Task 8: StreamThrottle

**Files:**
- Create: `agencia/productos/bot-telegram/bot/streaming.py`
- Test: `agencia/productos/bot-telegram/tests/test_streaming.py`

- [ ] **Step 1: Escribir el test**

`tests/test_streaming.py`:
```python
from bot.streaming import StreamThrottle


def test_no_refresca_antes_del_intervalo():
    t = StreamThrottle(intervalo=1.0, min_chars=5)
    # primer chequeo: pasó tiempo suficiente desde 0, pero pocos chars
    assert t.deberia_refrescar(ahora=5.0, largo_actual=3) is False
    # suficientes chars y suficiente tiempo
    assert t.deberia_refrescar(ahora=5.0, largo_actual=20) is True


def test_respeta_intervalo_temporal_tras_marcar():
    t = StreamThrottle(intervalo=1.0, min_chars=1)
    t.marcar(ahora=10.0, largo_actual=10)
    assert t.deberia_refrescar(ahora=10.5, largo_actual=25) is False  # solo pasó 0.5s
    assert t.deberia_refrescar(ahora=11.2, largo_actual=25) is True   # pasó 1.2s
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_streaming.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'bot.streaming'`.

- [ ] **Step 3: Escribir `bot/streaming.py`**

```python
from __future__ import annotations


class StreamThrottle:
    """Decide cada cuánto refrescar el mensaje en Telegram durante el streaming,
    para no chocar con los rate limits (Telegram tolera ~1 edición/seg por chat)."""

    def __init__(self, intervalo: float = 1.1, min_chars: int = 12):
        self._intervalo = intervalo
        self._min_chars = min_chars
        self._ultimo_ts = 0.0
        self._ultimo_len = 0

    def deberia_refrescar(self, ahora: float, largo_actual: int) -> bool:
        if largo_actual - self._ultimo_len < self._min_chars:
            return False
        if ahora - self._ultimo_ts < self._intervalo:
            return False
        return True

    def marcar(self, ahora: float, largo_actual: int) -> None:
        self._ultimo_ts = ahora
        self._ultimo_len = largo_actual
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_streaming.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/bot/streaming.py agencia/productos/bot-telegram/tests/test_streaming.py
git commit -m "feat(bot-telegram): StreamThrottle para editar el mensaje sin chocar rate limits"
```

---

## Task 9: Smoke test de Gemini (spike de validación del SDK)

Antes de codear los wrappers de Gemini, confirmar con la key real: (a) los IDs de modelo exactos, (b) que el streaming de texto anda, (c) la forma del TTS. Si algún ID cambió, se ajusta en el `.env`/`config.py` (no en el código de los wrappers).

**Files:**
- Create: `agencia/productos/bot-telegram/scripts/smoke_gemini.py`

- [ ] **Step 1: Escribir el script de smoke**

`scripts/smoke_gemini.py`:
```python
"""Spike manual: valida la key de Gemini y la forma del SDK antes de construir los wrappers.
Uso: cd agencia/productos/bot-telegram && python scripts/smoke_gemini.py
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google import genai
from google.genai import types
from config import Config


def main() -> None:
    if not Config.GEMINI_API_KEY:
        raise SystemExit("Falta GEMINI_API_KEY en el .env del cliente.")
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    print("== Modelos disponibles (buscar los IDs reales de chat y *-tts) ==")
    for m in client.models.list():
        print(" -", m.name)

    print("\n== Streaming de texto ==")
    stream = client.models.generate_content_stream(
        model=Config.MODEL_CHAT,
        contents="Saludá en una línea, cálido y en voseo argentino, como Cata Home.",
    )
    for chunk in stream:
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print("\n[OK texto]")

    print("\n== TTS ==")
    resp = client.models.generate_content(
        model=Config.MODEL_TTS,
        contents="Hola, soy Cata de Cata Home. ¿En qué te doy una mano?",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=Config.TTS_VOICE)
                )
            ),
        ),
    )
    pcm = resp.candidates[0].content.parts[0].inline_data.data
    Path("smoke_tts.pcm").write_bytes(pcm)
    print(f"[OK TTS] {len(pcm)} bytes PCM -> smoke_tts.pcm")
    print("Convertir a OGG y escuchar: "
          "ffmpeg -f s16le -ar 24000 -ac 1 -i smoke_tts.pcm -c:a libopus smoke_tts.ogg")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Instalar dependencias y correr el smoke**

Run:
```bash
cd agencia/productos/bot-telegram
pip install -r requirements-dev.txt
python scripts/smoke_gemini.py
```
Expected: lista de modelos, un saludo en streaming, y `smoke_tts.pcm` creado.

- [ ] **Step 3: Confirmar / corregir los IDs de modelo**

De la lista impresa, anotar el ID real de chat (un `*flash*`) y el de TTS (un `*tts*`). Si difieren de los defaults en `config.py`, fijarlos en `agencia/clientes/cata-home/.env`:
```
MODEL_CHAT=<id-real-de-chat>
MODEL_TTS=<id-real-de-tts>
```
(También confirmar si el streaming async usa `await client.aio.models.generate_content_stream(...)` o sin `await`; anotarlo para la Task 10.)

- [ ] **Step 4: Limpiar artefactos y commit del script**

Run: `rm -f smoke_tts.pcm smoke_tts.ogg`
```bash
cd ../../..
git add agencia/productos/bot-telegram/scripts/smoke_gemini.py
git commit -m "chore(bot-telegram): smoke test para validar Gemini (modelos, stream, TTS)"
```

> Si el TTS de Gemini no convence (calidad/cuota), el plan sigue igual: en la Task 11 se implementa `TTSProvider`; cambiar a ElevenLabs es otra implementación del mismo contrato.

---

## Task 10: Orchestrator (Agente Gemini con streaming + tool loop)

**Files:**
- Create: `agencia/productos/bot-telegram/agent/orchestrator.py`
- Test: `agencia/productos/bot-telegram/tests/test_orchestrator.py`

- [ ] **Step 1: Escribir el test (con cliente Gemini falso)**

`tests/test_orchestrator.py`:
```python
import types as pytypes
from unittest.mock import AsyncMock, MagicMock
from agent.orchestrator import Agente
from providers.catalog import CatalogProvider, Producto
from providers.memory import Turno


class FakeCatalog(CatalogProvider):
    def buscar(self, query):
        return [Producto(nombre="Jarra Suiza", precio_lista=35006)]
    def por_categoria(self, categoria): return []
    def categorias(self): return ["Mesa"]


def _part(text=None, function_call=None):
    return pytypes.SimpleNamespace(text=text, function_call=function_call)


def _chunk(parts):
    cand = pytypes.SimpleNamespace(content=pytypes.SimpleNamespace(parts=parts))
    return pytypes.SimpleNamespace(candidates=[cand])


class FakeAsyncStream:
    def __init__(self, chunks):
        self._chunks = chunks
    def __aiter__(self):
        self._it = iter(self._chunks)
        return self
    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


def _fake_client(secuencia_de_streams):
    """secuencia_de_streams: lista de listas-de-chunks, una por cada llamada al modelo."""
    client = MagicMock()
    streams = [FakeAsyncStream(chs) for chs in secuencia_de_streams]
    client.aio.models.generate_content_stream = AsyncMock(side_effect=streams)
    return client


async def test_responde_texto_directo():
    client = _fake_client([[_chunk([_part(text="¡Hola! ")]), _chunk([_part(text="🏠")])]])
    ag = Agente(client, "m", "system", FakeCatalog())
    out = "".join([c async for c in ag.responder([], "hola")])
    assert out == "¡Hola! 🏠"


async def test_ejecuta_tool_y_luego_responde():
    fc = pytypes.SimpleNamespace(name="buscar_producto", args={"query": "jarra"}, id="1")
    client = _fake_client([
        [_chunk([_part(function_call=fc)])],            # 1ra llamada: pide la tool
        [_chunk([_part(text="La Jarra Suiza está $35.006")])],  # 2da: responde
    ])
    ag = Agente(client, "m", "system", FakeCatalog())
    out = "".join([c async for c in ag.responder([Turno("user", "hola", 0.0)], "cuanto sale la jarra")])
    assert "35.006" in out
    assert client.aio.models.generate_content_stream.await_count == 2
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_orchestrator.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'agent.orchestrator'`.

- [ ] **Step 3: Escribir `agent/orchestrator.py`**

```python
from __future__ import annotations
from typing import AsyncIterator, Iterable
from google import genai
from google.genai import types
from providers.catalog import CatalogProvider
from agent.tools import BUSCAR_PRODUCTO_DECL, ejecutar_buscar_producto

MAX_SALTOS_TOOL = 4


class Agente:
    """Orquesta la conversación con Gemini: arma el contexto, streamea la respuesta
    y resuelve las llamadas a herramientas (tool calling)."""

    def __init__(self, client: genai.Client, model: str, system_prompt: str, catalog: CatalogProvider):
        self._client = client
        self._model = model
        self._system = system_prompt
        self._catalog = catalog
        self._tools = types.Tool(function_declarations=[BUSCAR_PRODUCTO_DECL])

    def _config(self) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            system_instruction=self._system,
            tools=[self._tools],
            temperature=0.7,
        )

    def _contents(self, historial: Iterable, mensaje: str) -> list:
        contents = []
        for t in historial:
            rol = "user" if t.rol == "user" else "model"
            contents.append(types.Content(role=rol, parts=[types.Part(text=t.texto)]))
        contents.append(types.Content(role="user", parts=[types.Part(text=mensaje)]))
        return contents

    async def responder(self, historial: Iterable, mensaje: str) -> AsyncIterator[str]:
        contents = self._contents(historial, mensaje)
        for _ in range(MAX_SALTOS_TOOL):
            stream = await self._client.aio.models.generate_content_stream(
                model=self._model, contents=contents, config=self._config()
            )
            func_calls = []
            model_parts = []
            async for chunk in stream:
                if not chunk.candidates:
                    continue
                cand = chunk.candidates[0]
                if not cand.content or not cand.content.parts:
                    continue
                for part in cand.content.parts:
                    if getattr(part, "text", None):
                        model_parts.append(part)
                        yield part.text
                    elif getattr(part, "function_call", None):
                        func_calls.append(part.function_call)
                        model_parts.append(part)
            if not func_calls:
                return
            # reinyectar lo que pidió el modelo + el resultado de las tools
            contents.append(types.Content(role="model", parts=model_parts))
            respuestas = []
            for fc in func_calls:
                if fc.name == "buscar_producto":
                    res = ejecutar_buscar_producto(dict(fc.args or {}), self._catalog)
                else:
                    res = {"error": "herramienta desconocida"}
                respuestas.append(types.Part.from_function_response(name=fc.name, response=res))
            contents.append(types.Content(role="user", parts=respuestas))
```

> Si el spike (Task 9) indicó que el stream async NO se `await`-ea, quitar el `await` de la línea `stream = ...` y dejar `stream = self._client.aio.models.generate_content_stream(...)`. El AsyncMock del test tolera ambas formas si se ajusta; con `await` + `AsyncMock(side_effect=...)` funciona como está escrito.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_orchestrator.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/agent/orchestrator.py agencia/productos/bot-telegram/tests/test_orchestrator.py
git commit -m "feat(bot-telegram): orquestador Gemini con streaming y tool calling"
```

---

## Task 11: STT (transcripción con Gemini)

**Files:**
- Create: `agencia/productos/bot-telegram/providers/stt.py`
- Test: `agencia/productos/bot-telegram/tests/test_stt.py`

- [ ] **Step 1: Escribir el test**

`tests/test_stt.py`:
```python
import types as pytypes
from unittest.mock import AsyncMock, MagicMock
from providers.stt import transcribir


async def test_transcribir_devuelve_texto_limpio():
    client = MagicMock()
    resp = pytypes.SimpleNamespace(text="  hola, busco una jarra  ")
    client.aio.models.generate_content = AsyncMock(return_value=resp)
    out = await transcribir(client, "m", b"audiobytes", "audio/ogg")
    assert out == "hola, busco una jarra"
    client.aio.models.generate_content.assert_awaited_once()


async def test_transcribir_texto_vacio():
    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value=pytypes.SimpleNamespace(text=None))
    out = await transcribir(client, "m", b"x")
    assert out == ""
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_stt.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'providers.stt'`.

- [ ] **Step 3: Escribir `providers/stt.py`**

```python
from __future__ import annotations
from google import genai
from google.genai import types


async def transcribir(client: genai.Client, model: str, audio_bytes: bytes,
                      mime_type: str = "audio/ogg") -> str:
    """Transcribe una nota de voz usando Gemini (multimodal)."""
    resp = await client.aio.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            types.Part(text="Transcribí este audio al español rioplatense. "
                            "Devolvé solo el texto, sin comillas ni comentarios."),
        ],
    )
    return (resp.text or "").strip()
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_stt.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/providers/stt.py agencia/productos/bot-telegram/tests/test_stt.py
git commit -m "feat(bot-telegram): STT de notas de voz con Gemini"
```

---

## Task 12: TTS (Gemini TTS + conversión a OGG)

**Files:**
- Create: `agencia/productos/bot-telegram/providers/tts.py`
- Test: `agencia/productos/bot-telegram/tests/test_tts.py`

- [ ] **Step 1: Escribir el test**

`tests/test_tts.py`:
```python
import shutil
import types as pytypes
from unittest.mock import AsyncMock, MagicMock
import pytest
from providers import tts as tts_mod
from providers.tts import GeminiTTS, pcm_a_ogg


async def test_sintetizar_devuelve_ogg(monkeypatch):
    client = MagicMock()
    inline = pytypes.SimpleNamespace(data=b"PCMFAKE")
    part = pytypes.SimpleNamespace(inline_data=inline)
    cand = pytypes.SimpleNamespace(content=pytypes.SimpleNamespace(parts=[part]))
    resp = pytypes.SimpleNamespace(candidates=[cand])
    client.aio.models.generate_content = AsyncMock(return_value=resp)
    # evitar ffmpeg en el unit test
    monkeypatch.setattr(tts_mod, "pcm_a_ogg", lambda pcm, sample_rate=24000: b"OGG:" + pcm)

    g = GeminiTTS(client, "tts-model", voz="Aoede")
    out = await g.sintetizar("hola")
    assert out == b"OGG:PCMFAKE"
    client.aio.models.generate_content.assert_awaited_once()


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg no instalado")
def test_pcm_a_ogg_real_genera_bytes():
    pcm = b"\x00\x00" * 24000  # 1 seg de silencio s16le mono 24kHz
    ogg = pcm_a_ogg(pcm)
    assert isinstance(ogg, bytes) and len(ogg) > 0
    assert ogg[:4] == b"OggS"
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_tts.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'providers.tts'`.

- [ ] **Step 3: Escribir `providers/tts.py`**

```python
from __future__ import annotations
import asyncio
import subprocess
from abc import ABC, abstractmethod
from google import genai
from google.genai import types


class TTSProvider(ABC):
    @abstractmethod
    async def sintetizar(self, texto: str) -> bytes:
        """Devuelve audio OGG/Opus listo para Telegram send_voice."""


def pcm_a_ogg(pcm: bytes, sample_rate: int = 24000) -> bytes:
    """Convierte PCM s16le mono a OGG/Opus con ffmpeg (requiere ffmpeg en el PATH)."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error",
         "-f", "s16le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0",
         "-c:a", "libopus", "-b:a", "32k", "-f", "ogg", "pipe:1"],
        input=pcm, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
    )
    return proc.stdout


class GeminiTTS(TTSProvider):
    """TTS con Gemini. (Futuro: ElevenLabsTTS / clonación, con el mismo contrato.)"""

    def __init__(self, client: genai.Client, model: str, voz: str = "Aoede"):
        self._client = client
        self._model = model
        self._voz = voz

    async def sintetizar(self, texto: str) -> bytes:
        resp = await self._client.aio.models.generate_content(
            model=self._model,
            contents=f"Decí esto con voz cálida, cercana y natural, como alguien del equipo de Cata Home: {texto}",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self._voz)
                    )
                ),
            ),
        )
        pcm = resp.candidates[0].content.parts[0].inline_data.data
        return await asyncio.to_thread(pcm_a_ogg, pcm)
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_tts.py -v`
Expected: PASS (2 passed, o 1 passed + 1 skipped si no hay ffmpeg).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/providers/tts.py agencia/productos/bot-telegram/tests/test_tts.py
git commit -m "feat(bot-telegram): TTS con Gemini + conversion PCM->OGG"
```

---

## Task 13: Handlers de Telegram (texto + voz + streaming)

**Files:**
- Create: `agencia/productos/bot-telegram/bot/handlers.py`
- Test: `agencia/productos/bot-telegram/tests/test_handlers.py`

- [ ] **Step 1: Escribir el test**

`tests/test_handlers.py`:
```python
import types as pytypes
from unittest.mock import AsyncMock, MagicMock
from bot import handlers


async def _gen(chunks):
    for c in chunks:
        yield c


def _ctx(deps):
    ctx = MagicMock()
    ctx.application.bot_data = {"deps": deps}
    ctx.bot.send_chat_action = AsyncMock()
    return ctx


def _update(text):
    msg_enviado = MagicMock()
    msg_enviado.edit_text = AsyncMock()
    update = MagicMock()
    update.effective_chat.id = 999
    update.message.text = text
    update.message.reply_text = AsyncMock(return_value=msg_enviado)
    update.message.reply_voice = AsyncMock()
    return update, msg_enviado


async def test_on_text_streamea_y_guarda_memoria():
    memory = MagicMock()
    agente = MagicMock()
    agente.responder = MagicMock(return_value=_gen(["Hola ", "🏠"]))
    deps = {"agente": agente, "memory": memory, "tts": None,
            "window": 12, "throttle": 0.0, "voice_mirror": False, "model_chat": "m", "client": MagicMock()}
    ctx = _ctx(deps)
    update, msg = _update("hola")

    await handlers.on_text(update, ctx)

    # el texto final quedó en el mensaje editado
    msg.edit_text.assert_awaited()
    assert msg.edit_text.await_args_list[-1].args[0] == "Hola 🏠"
    # memoria: guardó user y model
    roles = [c.args[1] for c in memory.guardar.call_args_list]
    assert roles == ["user", "model"]


async def test_on_text_con_voz_envia_nota():
    memory = MagicMock()
    agente = MagicMock()
    agente.responder = MagicMock(return_value=_gen(["Listo"]))
    tts = MagicMock()
    tts.sintetizar = AsyncMock(return_value=b"OGGBYTES")
    deps = {"agente": agente, "memory": memory, "tts": tts,
            "window": 12, "throttle": 0.0, "voice_mirror": True, "model_chat": "m", "client": MagicMock()}
    ctx = _ctx(deps)
    update, msg = _update("hola")

    await handlers._responder_texto(update, ctx, "hola", responder_con_voz=True)

    tts.sintetizar.assert_awaited_once_with("Listo")
    update.message.reply_voice.assert_awaited_once_with(b"OGGBYTES")
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pytest tests/test_handlers.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'bot.handlers'`.

- [ ] **Step 3: Escribir `bot/handlers.py`**

```python
from __future__ import annotations
import time
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes
from providers.stt import transcribir
from bot.streaming import StreamThrottle


def _deps(context: ContextTypes.DEFAULT_TYPE) -> dict:
    return context.application.bot_data["deps"]


async def on_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "¡Hola! 🏠 Soy Cata, del equipo de Cata Home. "
        "Te puedo mostrar productos, contarte de envíos, pagos y promos, o pasarte con una persona. "
        "¿En qué te doy una mano?"
    )


async def _responder_texto(update: Update, context: ContextTypes.DEFAULT_TYPE,
                           texto_usuario: str, responder_con_voz: bool) -> None:
    deps = _deps(context)
    chat_id = update.effective_chat.id
    historial = deps["memory"].cargar(chat_id, deps["window"])

    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    msg = await update.message.reply_text("…")

    throttle = StreamThrottle(intervalo=deps["throttle"])
    acumulado = ""
    async for chunk in deps["agente"].responder(historial, texto_usuario):
        acumulado += chunk
        ahora = time.monotonic()
        if throttle.deberia_refrescar(ahora, len(acumulado)):
            try:
                await msg.edit_text(acumulado)
            except Exception:
                pass  # ediciones intermedias: si Telegram rechaza una, seguimos
            throttle.marcar(ahora, len(acumulado))

    acumulado = acumulado.strip() or "Perdón, no te llegué a responder bien. ¿Me lo repetís? 🙏"

    if responder_con_voz and deps.get("tts"):
        await context.bot.send_chat_action(chat_id, ChatAction.RECORD_VOICE)
        try:
            ogg = await deps["tts"].sintetizar(acumulado)
            await update.message.reply_voice(ogg)
        except Exception:
            pass  # si falla la voz, igual dejamos el texto
    # edición final con el texto completo
    try:
        await msg.edit_text(acumulado)
    except Exception:
        pass

    deps["memory"].guardar(chat_id, "user", texto_usuario)
    deps["memory"].guardar(chat_id, "model", acumulado)


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _responder_texto(update, context, update.message.text, responder_con_voz=False)


async def on_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    deps = _deps(context)
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id, ChatAction.TYPING)
    tg_file = await update.message.voice.get_file()
    audio = bytes(await tg_file.download_as_bytearray())
    texto = await transcribir(deps["client"], deps["model_chat"], audio, "audio/ogg")
    if not texto:
        await update.message.reply_text(
            "No te llegué a entender el audio 🙈 ¿Me lo escribís o me lo mandás de nuevo?"
        )
        return
    await _responder_texto(update, context, texto, responder_con_voz=deps["voice_mirror"])
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pytest tests/test_handlers.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/bot/handlers.py agencia/productos/bot-telegram/tests/test_handlers.py
git commit -m "feat(bot-telegram): handlers de texto/voz con streaming y memoria"
```

---

## Task 14: Wiring (app + entrypoint) y prueba end-to-end manual

**Files:**
- Create: `agencia/productos/bot-telegram/bot/app.py`
- Create: `agencia/productos/bot-telegram/bot/__main__.py`

- [ ] **Step 1: Escribir `bot/app.py`**

```python
from __future__ import annotations
from pathlib import Path
from google import genai
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from config import Config, DATOS_DIR, CLIENT_DIR
from providers.catalog import JSONCatalogProvider
from providers.memory import SQLiteMemoryStore
from providers.tts import GeminiTTS
from knowledge.loader import cargar_kb
from agent.persona import construir_system_prompt
from agent.orchestrator import Agente
from bot import handlers


def construir_app() -> Application:
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    catalog = JSONCatalogProvider(DATOS_DIR / "catalogo.json")
    kb = cargar_kb(DATOS_DIR, catalog)
    perfil_path = CLIENT_DIR / "perfil.md"
    perfil = perfil_path.read_text(encoding="utf-8") if perfil_path.exists() else ""
    system_prompt = construir_system_prompt(kb, perfil)

    agente = Agente(client, Config.MODEL_CHAT, system_prompt, catalog)
    memory = SQLiteMemoryStore(Config.MEMORY_DB)
    tts = GeminiTTS(client, Config.MODEL_TTS, Config.TTS_VOICE)

    app = Application.builder().token(Config.TELEGRAM_TOKEN).build()
    app.bot_data["deps"] = {
        "client": client,
        "agente": agente,
        "memory": memory,
        "tts": tts,
        "window": Config.MEMORY_WINDOW,
        "throttle": Config.STREAM_THROTTLE_SECS,
        "voice_mirror": Config.VOICE_REPLY_MIRROR,
        "model_chat": Config.MODEL_CHAT,
    }
    app.add_handler(CommandHandler("start", handlers.on_start))
    app.add_handler(MessageHandler(filters.VOICE, handlers.on_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handlers.on_text))
    return app
```

- [ ] **Step 2: Escribir `bot/__main__.py`**

```python
from __future__ import annotations
from config import validar
from bot.app import construir_app


def main() -> None:
    faltan = validar()
    if faltan:
        raise SystemExit(f"Faltan variables en el .env del cliente: {', '.join(faltan)}")
    app = construir_app()
    print("Cata corriendo (polling). Ctrl+C para frenar.")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Verificar que toda la suite pasa**

Run: `cd agencia/productos/bot-telegram && pytest -v`
Expected: todos los tests PASS (test_tts puede mostrar 1 skipped si no hay ffmpeg).

- [ ] **Step 4: Verificar que la app se arma sin tocar Telegram**

Run:
```bash
python -c "from bot.app import construir_app; print('app OK' if construir_app() else 'fail')"
```
Expected: imprime `app OK` (usa el `.env` real ya cargado; valida que el wiring importa y construye).

- [ ] **Step 5: Prueba end-to-end manual en Telegram**

Requisitos: `ffmpeg` instalado (`ffmpeg -version`), `.env` con TELEGRAM_TOKEN y GEMINI_API_KEY.
Run: `python -m bot`
Luego en Telegram, en @catahomedeco_bot, verificar el checklist de aceptación (spec §15):
1. `/start` saluda cálido en voseo.
2. "cuánto sale la jarra suiza?" → da precio lista + transferencia + cuota (usa la tool, no inventa).
3. "hacen envíos a Córdoba?" → explica OCA + umbral de envío gratis, sin prometer plazo fijo.
4. La respuesta se ve **escribiéndose** (streaming) con "escribiendo…".
5. Mandar una **nota de voz** preguntando algo → transcribe y responde con **nota de voz**.
6. Preguntar por algo fuera del catálogo → ofrece confirmar/derivar, no inventa precio.
7. "se me rompió un plato" → deriva al WhatsApp pidiendo N° de orden + fotos.
8. No dice que es IA en ningún momento.

- [ ] **Step 6: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/bot/app.py agencia/productos/bot-telegram/bot/__main__.py
git commit -m "feat(bot-telegram): wiring de la app + entrypoint (python -m bot)"
```

---

## Task 15: README, Dockerfile y notas de deploy (Render)

**Files:**
- Create: `agencia/productos/bot-telegram/README.md`
- Create: `agencia/productos/bot-telegram/Dockerfile`
- Create: `agencia/productos/bot-telegram/.dockerignore`

- [ ] **Step 1: Escribir `README.md`**

````markdown
# Bot Telegram "Cata" — Demo Cata Home

Agente humanizado de atención al cliente (Módulo 1 del ecosistema QuantumHive × Cata Home), en fase demo sobre Telegram.

## Correr local
```bash
cd agencia/productos/bot-telegram
pip install -r requirements-dev.txt
# requiere ffmpeg en el PATH (para las notas de voz)
python -m bot
```
Las credenciales van en `agencia/clientes/cata-home/.env` (gitignoreado): `TELEGRAM_TOKEN`, `GEMINI_API_KEY`.

## Tests
```bash
pytest -v
```

## Arquitectura
Telegram (PTB) → `agent/orchestrator.py` (Gemini stream + tool calling) → proveedores detrás de interfaces:
- `providers/catalog.py` — catálogo (demo: JSON; futuro: Tienda Nube).
- `providers/tts.py` — voz (demo: Gemini TTS; futuro: ElevenLabs/clonación).
- `providers/memory.py` — memoria por chat (demo: SQLite; futuro: Supabase).
La base de conocimiento (persona + FAQ + promos) vive en `agencia/clientes/cata-home/datos/`.

## Deploy (Render, demo 24/7)
- Servicio tipo **Background Worker** desde el `Dockerfile` (incluye ffmpeg).
- Variables de entorno en el panel de Render: `TELEGRAM_TOKEN`, `GEMINI_API_KEY` (no se sube `.env`).
- El disco de Render es efímero: la memoria SQLite se reinicia en cada deploy (aceptable para el demo; para persistir, apuntar `MemoryStore` a Supabase).
````

- [ ] **Step 2: Escribir `Dockerfile`**

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY agencia/productos/bot-telegram/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY agencia /app/agencia
WORKDIR /app/agencia/productos/bot-telegram
CMD ["python", "-m", "bot"]
```

- [ ] **Step 3: Escribir `.dockerignore`**

```
**/.env
**/__pycache__/
**/*.pyc
**/cata.db
tests/
```

- [ ] **Step 4: Verificar que el `.env` no entra al contexto de Docker**

Run: `grep -q "\.env" agencia/productos/bot-telegram/.dockerignore && echo "protegido"`
Expected: `protegido`

- [ ] **Step 5: Commit**

```bash
cd ../../..
git add agencia/productos/bot-telegram/README.md agencia/productos/bot-telegram/Dockerfile agencia/productos/bot-telegram/.dockerignore
git commit -m "docs(bot-telegram): README + Dockerfile con ffmpeg + notas de deploy"
```

- [ ] **Step 6: Actualizar el grafo y push**

```bash
graphify --update || true
git push
```

---

## Self-Review (cobertura del spec)

- **§3 Stack** → Tasks 1, 9–12. ✓
- **§4 Arquitectura / interfaces** (CatalogProvider, TTSProvider, MemoryStore) → Tasks 3, 4, 12. ✓
- **§5 Base de conocimiento** (archivos de datos) → Task 2. ✓
- **§6 Agente** (persona + tool buscar_producto) → Tasks 6, 7, 10. ✓
- **§7 Intents** → cubiertos por persona+tool+escalamiento; verificados en la prueba manual (Task 14 Step 5). ✓
- **§8 Voz** (STT mirror + TTS + OGG) → Tasks 11, 12, 13. ✓
- **§9 Streaming** (typing + throttle) → Tasks 8, 13. ✓
- **§10 Memoria** → Task 4 + wiring Task 14. ✓
- **§11 Hosting** → Task 15 (Render + Dockerfile). ✓
- **§12 Estructura repo** → Task 1 + ubicaciones de cada archivo. ✓
- **§13 Secrets** → `.env` ya creado/gitignoreado, `.env.ejemplo` Task 1, `.dockerignore` Task 15. ✓
- **§14 Inputs pendientes** → horario en `escalamiento.md` (Task 2) marcado como pendiente. ✓
- **§15 Criterios de aceptación** → checklist manual Task 14 Step 5. ✓

Nota de riesgo conocido: los IDs de modelo y la forma exacta del streaming async del SDK `google-genai` se confirman en la Task 9 (smoke) antes de construir los wrappers; cualquier ajuste es de config, no de arquitectura.
