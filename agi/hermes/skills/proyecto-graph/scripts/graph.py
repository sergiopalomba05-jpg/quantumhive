#!/usr/bin/env python3
"""Hermes consulta el grafo de conocimiento del proyecto (graphify) para saber cómo está
armado QuantumHive y qué usar en cada caso. Solo stdlib.

Repo: variable de entorno QH_REPO (default: ~/Desktop/boveda obsidian).
Uso:
  python graph.py overview        -> imprime graphify-out/GRAPH_REPORT.md (panorama)
  python graph.py query "texto"   -> graphify query "texto"
  python graph.py explain "Nodo"  -> graphify explain "Nodo"
"""
import os, sys, subprocess

REPO = os.environ.get("QH_REPO", os.path.expanduser("~/Desktop/boveda obsidian"))


def run_graphify(args):
    try:
        out = subprocess.run(["graphify", *args], cwd=REPO, capture_output=True, text=True)
    except FileNotFoundError:
        sys.exit("ERROR: 'graphify' no está en el PATH. Instalalo o ajustá el PATH de Hermes.")
    sys.stdout.write(out.stdout)
    if out.returncode != 0:
        sys.stderr.write(out.stderr)
        sys.exit(out.returncode)


def overview():
    path = os.path.join(REPO, "graphify-out", "GRAPH_REPORT.md")
    if not os.path.exists(path):
        sys.exit("ERROR: no existe graphify-out/GRAPH_REPORT.md. Corré 'graphify --update' en el repo.")
    with open(path, encoding="utf-8") as f:
        print(f.read())


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == "overview":
        overview()
    elif cmd == "query":
        run_graphify(["query", " ".join(sys.argv[2:])])
    elif cmd == "explain":
        run_graphify(["explain", " ".join(sys.argv[2:])])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
