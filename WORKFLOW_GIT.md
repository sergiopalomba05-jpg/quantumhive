# Workflow Git Para Este Proyecto

Este archivo explica Git con tus palabras y usando tu caso real: una PC local, una VM, OpenCode, ramas, sandboxes y worktrees.

## Conceptos base

### Repo

El repo es el proyecto Git completo.

En este caso:
- remoto: `origin`
- URL: `https://github.com/sergiopalomba05-jpg/quantumhive.git`

`main` no es el repo. `main` es solo una rama dentro del repo.

### Branch

Un branch es una linea de trabajo.

Ejemplos reales que ya existen en este repo:
- `main`
- `vm1-matrix`
- `claude/kind-merkle-dc3b12`

Cuando haces un `git commit`, el commit queda en el branch actual.

### Worktree

Un worktree es una carpeta fisica en disco que usa el mismo repo Git, pero puede estar parada en otra rama.

Idea corta:
- branch = linea logica de commits
- worktree = carpeta real donde trabajas

Un worktree no es una rama. Normalmente un worktree trabaja sobre una rama.

### Clone

Un clone es otra copia completa del repo en otra maquina o carpeta.

Ejemplo:
- tu PC local tiene un clone
- tu VM tiene otro clone

La VM no comparte el mismo checkout con esta PC. Por eso ya arranca mas aislada que un worktree.

### Sandbox en OpenCode

`sandbox` no es un concepto de Git puro.

En OpenCode, `sandbox` es una etiqueta de interfaz para un espacio de trabajo aislado. Puede apoyarse en un worktree o en otro mecanismo interno del entorno.

Pensalo asi:
- `sandbox` = nombre visual del espacio aislado en OpenCode
- branch = la rama Git sobre la que trabaja ese espacio

## Tu caso real hoy

En este repo local se ve:
- branch local actual: `main`
- ramas remotas y locales varias de agentes Claude
- worktrees locales en `.claude/worktrees/...`

Y en remoto `origin/main` ya entro este commit nuevo:
- `3cfc8e2 feat: add Open Design skills (159 skills for design generation)`

O sea: la VM u otro entorno ya estuvo empujando cambios al repo remoto.

## Como leer lo que ves en OpenCode

Si en la UI ves algo como:
- `local: main`
- `sandbox: vm 1 matrix`

La lectura practica es:
- `local: main` = workspace normal parado en la rama `main`
- `sandbox: vm 1 matrix` = workspace aislado para trabajar separado

Si `vm 1 matrix` es la rama activa de ese sandbox, esta bien usarla como frente de trabajo separado.

## Que pasa cuando haces commit y push

### Commit

Cuando haces `git commit`:
- guardas cambios en tu repo local
- esos cambios quedan en la rama actual
- no se suben todavia a GitHub

Ejemplo:
- estas en `vm1-matrix`
- cambias archivos
- haces `git commit`
- el commit queda en `vm1-matrix` local

### Push

Cuando haces `git push`:
- mandas los commits locales al repo remoto

Ejemplo:
- `git push origin vm1-matrix`

Eso sube la rama `vm1-matrix` al repo en GitHub.

### Merge

Mergear significa integrar una rama dentro de otra.

Ejemplo comun:
- trabajas en `vm1-matrix`
- empujas esa rama
- luego la integras a `main`

## Regla importante

Conversacion no es lo mismo que branch.

No hace falta una rama por cada chat.
Si conviene una rama por:
- tarea importante
- feature nueva
- bugfix aislado
- agente trabajando en paralelo

## Flujo recomendado para vos

### Caso 1: otra maquina o VM

Si trabajas desde otra VM o PC:
- ya tienes aislamiento por clone
- igual conviene una rama propia para ese frente

Ejemplo recomendado:
- VM: `vm1-matrix`
- Hermes: `hermes/...`
- local: otra rama para otra tarea

### Caso 2: misma maquina y mismo clone

Si varios agentes trabajan en la misma maquina sobre el mismo clone:
- usa un worktree por agente
- usa una rama por agente o por tarea

Ejemplo:
- worktree 1 -> `main` solo para revisar
- worktree 2 -> `feature-hermes`
- worktree 3 -> `fix-yas-papeo-audio`

## Lo que no conviene

- trabajar varias cosas activas directo sobre `main`
- tener dos agentes editando el mismo checkout al mismo tiempo
- hacer commits en `main` desde varios entornos en paralelo
- mezclar cambios de VM, local y agentes en una sola rama viva sin separar frentes

## Politica simple recomendada

### `main`
- usarla como rama estable
- evitar trabajo diario largo ahi
- ideal para integrar lo ya terminado

### ramas de trabajo
- una rama por frente importante
- nombres claros

Ejemplos:
- `vm1-matrix`
- `hermes-yas-papeo`
- `fix/cartesia-rate-limit`
- `feat/open-design-skills`

## Comandos mentales mas importantes

### Ver donde estas parado

```bash
git branch --show-current
```

### Ver cambios locales

```bash
git status
```

### Guardar cambios en tu rama actual

```bash
git add .
git commit -m "mensaje"
```

### Subir tu rama actual al remoto

```bash
git push origin NOMBRE_DE_RAMA
```

### Traer lo ultimo del remoto

```bash
git fetch origin
```

### Ver worktrees

```bash
git worktree list
```

## Traduccion rapida de cada palabra

- repo: el proyecto Git entero
- remote: el repo en GitHub
- branch: una linea de trabajo
- worktree: una carpeta local usando una rama
- clone: otra copia completa del repo
- commit: guardar cambios en la rama local
- push: mandar esos commits al remoto
- merge: integrar una rama en otra
- sandbox: etiqueta de OpenCode para un espacio aislado

## Sync automatico entre clones

Cada clone (PC, VM) tiene un proceso de fondo que detecta pushes via GitHub API y hace pull automaticamente.

No es push instantaneo, pero por la practica es lo mismo: trabajas, haces commit, pusheas, y en menos de 30 segundos los otros clones ya tienen los cambios.

### Como funciona

- cada 30 segundos el daemon consulta la API de GitHub
- si el ultimo commit remoto es distinto al local, hace `git pull --rebase`
- si habia cambios locales sin commitear, los stash antes del pull y los pop despues

### Identificacion de clones

- PC local: `C:\Users\sergio\Desktop\boveda obsidian` — lo llamamos **boveda**
- VM: su carpeta local — preguntar al abrirla para etiquetarla

### Comandos

```bash
# Iniciar sync (se daemoniza solo en background)
.\scripts\git-sync.ps1 start

# Ver estado
.\scripts\git-sync.ps1 status

# Detener
.\scripts\git-sync.ps1 stop
```

O con el batch wrapper:

```cmd
scripts\git-sync.bat status
scripts\git-sync.bat stop
scripts\git-sync.bat start
```

### Que hace cuando detecta un cambio

1. Compara SHA del ultimo commit remoto vs local
2. Si son distintos, verifica que el working tree este limpio
3. Si hay cambios locales no commiteados: los stash
4. Hace `git pull --rebase origin`
5. Si hubo stash: los pop de vuelta

### Desincronizaciones

El daemon no puede resolver conflictos de merge. Si hay conflicto:
1. El log avisa
2. Detener el sync con `stop`
3. Resolver manualmente
4. Reiniciar sync con `start`

### Verificar que funciona

```bash
.\scripts\git-sync.ps1 status
# Output esperado:
#   ACTIVO - PID 16672 (cada 30s)
#     -> Sincronizado
#     Local: 83f3c7fb  Remoto: 83f3c7fb
```

## Tu regla practica final

- otra VM = otro clone
- otro agente en el mismo clone = otro worktree
- otra tarea grande = otra rama
- `main` = integrar, no mezclar todo ahi
