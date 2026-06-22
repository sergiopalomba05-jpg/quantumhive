---
name: proyecto-graph
description: Le da a Hermes el mapa completo del proyecto QuantumHive. Úsalo cuando necesites entender cómo está armado el repo/proyecto, dónde vive algo, cómo se conectan las piezas, o qué herramienta/archivo usar para una tarea. Consulta el grafo de conocimiento (graphify) del repo ANTES de leer archivos sueltos.
---

# Proyecto-graph — el mapa de QuantumHive para Hermes

## Cuándo usar
Cuando necesites saber cómo está estructurado el proyecto, dónde vive algo, cómo se relacionan
las piezas, o qué herramienta/archivo corresponde a una tarea — **antes** de leer archivos
sueltos (igual que la regla #11 del CLAUDE.md para Claude Code).

## Variables de entorno
- `QH_REPO` — ruta al repo (default: `~/Desktop/boveda obsidian`).
- Requiere el CLI `graphify` instalado y `graphify-out/` generado (el hook post-commit lo
  mantiene al día en cada commit de código).

## Procedimiento
1. Panorama general del proyecto: `python scripts/graph.py overview`  (lee `GRAPH_REPORT.md`)
2. Buscar algo puntual: `python scripts/graph.py query "dónde está X / cómo se conecta Y"`
3. Explicar un nodo concreto: `python scripts/graph.py explain "Nombre del nodo"`
4. Respondé con eso. Si notás que el grafo está desactualizado, avisá que conviene correr
   `graphify --update` en el repo.

## Regla
- El grafo es el **primer** recurso para "¿cómo se arma / qué uso?", no el último.
