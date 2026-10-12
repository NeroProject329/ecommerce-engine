[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\Users\mathe\Downloads\ecommerce-engine'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)

function Invoke-Gate {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [string[]]$Arguments
    )

    Write-Host "[EXECUTANDO] $Name"
    & pnpm @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "$Name falhou com código $exitCode."
    }
    Write-Host "[OK] $Name"
}

Push-Location -LiteralPath $ProjectRoot
try {
    Invoke-Gate -Name 'Instalação congelada' -Arguments @('install', '--frozen-lockfile')
    Invoke-Gate -Name 'Lint' -Arguments @('lint')
    Invoke-Gate -Name 'Typecheck' -Arguments @('typecheck')
    Invoke-Gate -Name 'Testes' -Arguments @('test')
    Invoke-Gate -Name 'Build' -Arguments @('build')

    & (Join-Path $ProjectRoot 'scripts\SMOKE_ETAPA_1.ps1') -ProjectRoot $ProjectRoot
    if ($LASTEXITCODE -ne 0) {
        throw "Smoke test falhou com código $LASTEXITCODE."
    }

    Write-Host '[OK] Etapa 1 validada localmente.'
}
finally {
    Pop-Location
}
