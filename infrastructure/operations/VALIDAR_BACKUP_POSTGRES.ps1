param([Parameter(Mandatory = $true)][string]$DumpPath)
$ErrorActionPreference = 'Stop'
$resolvedDump = (Resolve-Path -LiteralPath $DumpPath).Path
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) { throw 'PG_RESTORE_NOT_AVAILABLE' }
& $pgRestore.Source --list $resolvedDump | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'POSTGRES_BACKUP_INVALID' }
$manifestPath = "$resolvedDump.json"
if (Test-Path -LiteralPath $manifestPath) { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json; $hash = (Get-FileHash -LiteralPath $resolvedDump -Algorithm SHA256).Hash.ToLowerInvariant(); if ($hash -ne $manifest.sha256) { throw 'POSTGRES_BACKUP_HASH_MISMATCH' } }
Write-Output "BACKUP_VALID $resolvedDump"
