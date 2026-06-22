#!/usr/bin/env python3
"""Consulta (solo lectura) del catálogo QuantumHive en Supabase (PostgREST). Solo stdlib.

Lee del entorno: SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY).

Subcomandos:
  divisiones                     -> divisiones + subdivisiones (para mapear el objetivo)
  objetivo --subdivision SLUG    -> herramientas mapeadas a esa subdivisión
  texto --q PALABRAS             -> herramientas por nombre/para_que (ilike)
"""
import os, sys, json, argparse, urllib.request, urllib.parse, urllib.error

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _get(path, params):
    if not URL or not KEY:
        sys.exit("ERROR: faltan SUPABASE_URL / SUPABASE_ANON_KEY en el entorno.")
    url = f"{URL}/rest/v1/{path}?" + urllib.parse.urlencode(params, safe="*.,()")
    req = urllib.request.Request(
        url, headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}, method="GET")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR Supabase {e.code}: {e.read().decode('utf-8')}")


def cmd_divisiones(a):
    divs = _get("divisiones", {"select": "id,nombre,descripcion", "order": "orden"})
    subs = _get("subdivisiones", {"select": "id,division_id,nombre", "order": "orden"})
    print(json.dumps({"divisiones": divs, "subdivisiones": subs}, ensure_ascii=False, indent=2))


def cmd_objetivo(a):
    rows = _get("herramienta_subdivision", {
        "subdivision_id": f"eq.{a.subdivision}",
        "select": "herramientas(nombre,repo_url,para_que,estado,categoria)",
    })
    tools = [r["herramientas"] for r in rows if r.get("herramientas")]
    print(json.dumps(tools, ensure_ascii=False, indent=2))


def cmd_texto(a):
    q = a.q
    rows = _get("herramientas", {
        "or": f"(nombre.ilike.*{q}*,para_que.ilike.*{q}*)",
        "select": "nombre,repo_url,para_que,estado,categoria",
        "order": "estado",
    })
    print(json.dumps(rows, ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="Consulta del catálogo QuantumHive.")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("divisiones")
    o = sub.add_parser("objetivo"); o.add_argument("--subdivision", required=True)
    t = sub.add_parser("texto"); t.add_argument("--q", required=True)
    a = p.parse_args()
    {"divisiones": cmd_divisiones, "objetivo": cmd_objetivo, "texto": cmd_texto}[a.cmd](a)


if __name__ == "__main__":
    main()
