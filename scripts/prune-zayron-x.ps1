param(
  [switch]$Apply,
  [switch]$IncludeUntrackedAuditBackups
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# Only generated artifacts are safe by default. Product code, migrations, and
# documentation are never deleted by this script without an explicit review.
$safeTargets = @(
  '.pytest_cache',
  'zayron-x\.next',
  'zayron-x\.open-next',
  'zayron-x\.wrangler',
  'zayron-x\.vercel',
  'zayron-x\shared\models\__pycache__',
  'workers\__pycache__',
  'workers\ingestors\__pycache__',
  'workers\agents\__pycache__',
  'workers\contracts\__pycache__'
)

$reviewTargets = @(
  'zayron-x\lib\ingestion\orchestrator.ts',
  'zayron-x\scripts\telegram-ingestion.ts',
  'zayron-x\pages\dummy.tsx',
  'docs\audits\wip-homepage-redesign-backup'
)

Write-Host 'ZAYRON-X pruning manifest'
Write-Host "Root: $root"
Write-Host ''
Write-Host 'Safe generated artifacts:'
foreach ($relative in $safeTargets) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path) { Write-Host "  $relative" }
}

Write-Host ''
Write-Host 'Review-only candidates (not deleted):'
foreach ($relative in $reviewTargets) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path) { Write-Host "  $relative" }
}

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Dry run only. Re-run with -Apply to remove generated artifacts.'
  exit 0
}

foreach ($relative in $safeTargets) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
    Write-Host "Removed: $relative"
  }
}

if ($IncludeUntrackedAuditBackups) {
  Write-Warning 'Audit backups are intentionally not removed by this version.'
}

Write-Host 'Pruning complete. Product files, SQL migrations, assets, and docs were preserved.'
