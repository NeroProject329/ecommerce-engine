param([Parameter(Mandatory = $true)][string]$DumpPath,[Parameter(Mandatory = $true)][switch]$Execute)
$ErrorActionPreference = 'Stop'
if (-not $Execute) { throw 'RESTORE_REQUIRES_EXECUTE_SWITCH' }
if (-not $env:RESTORE_DATABASE_URL) { throw 'RESTORE_DATABASE_URL_NOT_CONFIGURED' }
if ($env:DATABASE_URL) {
  try {
    $source = [Uri]$env:DATABASE_URL
    $target = [Uri]$env:RESTORE_DATABASE_URL
    $sourceIdentity = '{0}:{1}{2}' -f $source.Host.ToLowerInvariant(), $source.Port, $source.AbsolutePath.TrimEnd('/')
    $targetIdentity = '{0}:{1}{2}' -f $target.Host.ToLowerInvariant(), $target.Port, $target.AbsolutePath.TrimEnd('/')
    if ($sourceIdentity -eq $targetIdentity) { throw 'RESTORE_TARGET_MATCHES_SOURCE' }
  } catch {
    if ($_.Exception.Message -eq 'RESTORE_TARGET_MATCHES_SOURCE') { throw }
    throw 'RESTORE_DATABASE_URL_INVALID'
  }
}
$resolvedDump = (Resolve-Path -LiteralPath $DumpPath).Path
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) { throw 'PG_RESTORE_NOT_AVAILABLE' }
& $pgRestore.Source --dbname=$env:RESTORE_DATABASE_URL --clean --if-exists --no-owner --no-privileges $resolvedDump
if ($LASTEXITCODE -ne 0) { throw 'POSTGRES_RESTORE_FAILED' }
Write-Output 'RESTORE_OK'
