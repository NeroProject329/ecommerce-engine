param([string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\backups'))
$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) { throw 'DATABASE_URL_NOT_CONFIGURED' }
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) { throw 'PG_DUMP_NOT_AVAILABLE' }
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$dumpPath = Join-Path $resolvedOutput "ecommerce-$timestamp.dump"
$manifestPath = "$dumpPath.json"
& $pgDump.Source --dbname=$env:DATABASE_URL --format=custom --no-owner --no-privileges --file=$dumpPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $dumpPath)) { throw 'POSTGRES_BACKUP_FAILED' }
$file = Get-Item -LiteralPath $dumpPath
$hash = Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256
[ordered]@{ file=$file.Name; bytes=$file.Length; sha256=$hash.Hash.ToLowerInvariant(); createdAt=(Get-Date).ToUniversalTime().ToString('o'); format='postgres-custom' } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM
Write-Output "BACKUP_OK $dumpPath"
