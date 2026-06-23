#!/usr/bin/env python3
"""CRUD del catálogo QuantumHive en Supabase (vía PostgREST). Solo stdlib.

Lee del entorno (.env de Hermes):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Subcomandos:
  taxonomia                         -> divisiones + subdivisiones (slugs válidos)
  buscar --nombre N [--repo-url U]  -> herramientas que matchean (dedup)
  guardar --json '{...}'            -> inserta herramienta (+ subdivisiones opcionales)
  mapear --herramienta-id ID --subdivision SLUG
  estado --id ID --estado E         -> cambia el estado (para reemplazos)
"""
import os, sys, json, argparse, urllib.request, urllib.parse, urllib.error

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _req(method, path, params=None, body=None, prefer=None):
    if not URL or not KEY:
        sys.exit("ERROR: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.")
    url = f"{URL}/rest/v1/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, safe="*.,()")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode("utf-8")
            return json.loads(txt) if txt.strip() else []
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR Supabase {e.code}: {e.read().decode('utf-8')}")


def cmd_taxonomia(a):
    divs = _req("GET", "divisiones", {"select": "id,nombre", "order": "orden"})
    subs = _req("GET", "subdivisiones", {"select": "id,division_id,nombre", "order": "orden"})
    print(json.dumps({"divisiones": divs, "subdivisiones": subs}, ensure_ascii=False, indent=2))


def cmd_buscar(a):
    ors = []
    if a.nombre:
        ors.append(f"nombre.ilike.*{a.nombre}*")
    if a.repo_url:
        ors.append(f"repo_url.ilike.*{a.repo_url}*")
    params = {"select": "id,nombre,repo_url,categoria,estado,para_que"}
    if ors:
        params["or"] = "(" + ",".join(ors) + ")"
    print(json.dumps(_req("GET", "herramientas", params), ensure_ascii=False, indent=2))


def cmd_guardar(a):
    fila = json.loads(a.json)
    subs = fila.pop("subdivisiones", []) or []
    row = _req("POST", "herramientas", body=fila, prefer="return=representation")
    hid = row[0]["id"] if row else None
    for s in subs:
        if hid:
            _req("POST", "herramienta_subdivision",
                 body={"herramienta_id": hid, "subdivision_id": s},
                 prefer="resolution=ignore-duplicates")
    print(json.dumps({"guardada": row, "subdivisiones": subs}, ensure_ascii=False, indent=2))


def cmd_mapear(a):
    _req("POST", "herramienta_subdivision",
         body={"herramienta_id": a.herramienta_id, "subdivision_id": a.subdivision},
         prefer="resolution=ignore-duplicates")
    print(json.dumps({"ok": True}, ensure_ascii=False))


def cmd_estado(a):
    row = _req("PATCH", "herramientas", {"id": f"eq.{a.id}"},
               {"estado": a.estado}, "return=representation")
    print(json.dumps(row, ensure_ascii=False, indent=2))


def cmd_enriquecer(a):
    row = _req("PATCH", "herramientas", {"id": f"eq.{a.id}"},
               {"detalle": a.detalle}, "return=representation")
    print(json.dumps(row, ensure_ascii=False, indent=2))


def cmd_contenido(a):
    body = {"herramienta_id": a.herramienta_id, "guion": a.guion,
            "descripcion_visual": a.visual, "formato": a.formato, "notas": a.notas}
    row = _req("POST", "contenido_herramienta", body=body, prefer="return=representation")
    print(json.dumps(row, ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="CRUD del catálogo QuantumHive en Supabase.")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("taxonomia")
    b = sub.add_parser("buscar"); b.add_argument("--nombre"); b.add_argument("--repo-url", dest="repo_url")
    g = sub.add_parser("guardar"); g.add_argument("--json", required=True)
    m = sub.add_parser("mapear"); m.add_argument("--herramienta-id", dest="herramienta_id", required=True); m.add_argument("--subdivision", required=True)
    e = sub.add_parser("estado"); e.add_argument("--id", required=True); e.add_argument("--estado", required=True)
    en = sub.add_parser("enriquecer"); en.add_argument("--id", required=True); en.add_argument("--detalle", required=True)
    c = sub.add_parser("contenido")
    c.add_argument("--herramienta-id", dest="herramienta_id", required=True)
    c.add_argument("--guion", default=""); c.add_argument("--visual", default="")
    c.add_argument("--formato", default=""); c.add_argument("--notas", default="")
    a = p.parse_args()
    {"taxonomia": cmd_taxonomia, "buscar": cmd_buscar, "guardar": cmd_guardar,
     "mapear": cmd_mapear, "estado": cmd_estado,
     "enriquecer": cmd_enriquecer, "contenido": cmd_contenido}[a.cmd](a)


if __name__ == "__main__":
    main()
