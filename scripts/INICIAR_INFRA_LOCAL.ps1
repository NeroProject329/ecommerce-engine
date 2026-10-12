[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\Users\mathe\Downloads\ecommerce-engine'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
$composeFile = Join-Path $ProjectRoot 'infrastructure\local\docker-compose.yml'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker não está instalado ou não está disponível no PATH.'
}

& docker compose -f $composeFile config --quiet
if ($LASTEXITCODE -ne 0) { throw 'docker compose config falhou.' }

& docker compose -f $composeFile up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'docker compose up falhou.' }

Write-Host '[OK] PostgreSQL e Redis locais estão saudáveis.'
Write-Host 'Próximo comando: pnpm --filter @ecommerce/database db:migrate:dev --name init'
