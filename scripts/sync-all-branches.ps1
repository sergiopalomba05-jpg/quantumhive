# sync-all-branches.ps1
# Sincroniza todas las ramas locales con sus remotos
# Ejecutar desde la raíz del repo o desde cualquier directorio

param(
    [switch]$AutoMerge,
    [switch]$DryRun
)

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No estás en un repo git" -ForegroundColor Red
    exit 1
}

Write-Host "=== QuantumHive Git Sync ===" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot" -ForegroundColor Gray
Write-Host ""

# 1. Fetch all remotes
Write-Host "[1/4] Fetching all remotes..." -ForegroundColor Yellow
git fetch --all --prune 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-Host ""

# 2. Get current branch
$currentBranch = git branch --show-current
Write-Host "[2/4] Branch actual: $currentBranch" -ForegroundColor Green
Write-Host ""

# 3. List all branches with status
Write-Host "[3/4] Estado de ramas:" -ForegroundColor Yellow
Write-Host ""

$localBranches = git branch --format='%(refname:short)' 2>$null
$remoteBranches = git branch -r --format='%(refname:short)' 2>$null

foreach ($branch in $localBranches) {
    $remoteTracking = git rev-parse --abbrev-ref "$branch@{upstream}" 2>$null
    if ($remoteTracking) {
        $behind = git rev-list --count "$branch..$remoteTracking" 2>$null
        $ahead = git rev-list --count "$remoteTracking..$branch" 2>$null
        if ($behind -gt 0) {
            Write-Host "  $branch" -ForegroundColor Red -NoNewline
            Write-Host " (behind $behind, ahead $ahead)" -ForegroundColor DarkYellow
        } elseif ($ahead -gt 0) {
            Write-Host "  $branch" -ForegroundColor Yellow -NoNewline
            Write-Host " (ahead $ahead)" -ForegroundColor DarkYellow
        } else {
            Write-Host "  $branch" -ForegroundColor Green -NoNewline
            Write-Host " (synced)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  $branch" -ForegroundColor Magenta -NoNewline
        Write-Host " (no upstream)" -ForegroundColor DarkGray
    }
}

# Show remote-only branches
$remoteOnly = $remoteBranches | Where-Object {
    $short = $_ -replace 'origin/', '' -replace 'hf/', ''
    $localBranches -notcontains $short
}
if ($remoteOnly.Count -gt 0) {
    Write-Host ""
    Write-Host "  Ramas remotas sin checkout local:" -ForegroundColor DarkYellow
    foreach ($rb in $remoteOnly) {
        Write-Host "    $rb" -ForegroundColor DarkGray
    }
}
Write-Host ""

# 4. Update current branch
Write-Host "[4/4] Actualizando branch actual ($currentBranch)..." -ForegroundColor Yellow
if (-not $DryRun) {
    git pull --ff-only 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
} else {
    Write-Host "  [DRY RUN] Se haría: git pull --ff-only" -ForegroundColor DarkGray
}
Write-Host ""

# 5. Optionally merge all branches from their remotes
if ($AutoMerge) {
    Write-Host "=== Auto-merge habilitado ===" -ForegroundColor Cyan
    foreach ($branch in $localBranches) {
        if ($branch -eq $currentBranch) { continue }
        $remoteTracking = git rev-parse --abbrev-ref "$branch@{upstream}" 2>$null
        if ($remoteTracking) {
            $behind = git rev-list --count "$branch..$remoteTracking" 2>$null
            if ($behind -gt 0) {
                Write-Host "  Merging $branch (behind $behind commits)..." -ForegroundColor Yellow
                if (-not $DryRun) {
                    git checkout $branch 2>&1 | Out-Null
                    git merge --ff-only $remoteTracking 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
                }
            }
        }
    }
    git checkout $currentBranch 2>&1 | Out-Null
}

Write-Host ""
Write-Host "=== Sync completo ===" -ForegroundColor Cyan
Write-Host "Para hacer pull de una rama específica: git checkout <rama> && git pull" -ForegroundColor Gray
