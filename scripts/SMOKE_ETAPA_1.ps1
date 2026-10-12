[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\Users\mathe\Downloads\ecommerce-engine'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
$nodePath = (Get-Command node -ErrorAction Stop).Source
$processes = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()
$logFiles = [System.Collections.Generic.List[string]]::new()

function Start-HiddenNodeProcess {
    param(
        [Parameter(Mandatory)] [string]$ScriptPath,
        [Parameter(Mandatory)] [string]$Name,
        [hashtable]$Environment = @{}
    )

    $stdout = Join-Path ([System.IO.Path]::GetTempPath()) "ecommerce-engine-$Name-$PID.out.log"
    $stderr = Join-Path ([System.IO.Path]::GetTempPath()) "ecommerce-engine-$Name-$PID.err.log"
    $logFiles.Add($stdout)
    $logFiles.Add($stderr)

    $process = Start-Process -FilePath $nodePath `
        -ArgumentList @($ScriptPath) `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Hidden `
        -Environment $Environment `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    $processes.Add($process)
    return $process
}

function Wait-HttpOk {
    param(
        [Parameter(Mandatory)] [string]$Uri,
        [int]$Attempts = 40
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                return $response
            }
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }

    throw "Timeout aguardando HTTP 200 em $Uri"
}

try {
    $apiScript = Join-Path $ProjectRoot 'apps\api\dist\main.js'
    $workerScript = Join-Path $ProjectRoot 'apps\worker\dist\main.js'
    $storefrontScript = Join-Path $ProjectRoot 'apps\storefront\.next\standalone\apps\storefront\server.js'
    $adminScript = Join-Path $ProjectRoot 'apps\admin\.next\standalone\apps\admin\server.js'

    foreach ($script in @($apiScript, $workerScript, $storefrontScript, $adminScript)) {
        if (-not (Test-Path -LiteralPath $script -PathType Leaf)) {
            throw "Build ausente: $script"
        }
    }

    $api = Start-HiddenNodeProcess -ScriptPath $apiScript -Name 'api' -Environment @{ API_PORT = '4000'; NODE_ENV = 'test' }
    $worker = Start-HiddenNodeProcess -ScriptPath $workerScript -Name 'worker' -Environment @{ NODE_ENV = 'test'; WORKER_NAME = 'smoke-worker' }
    $storefront = Start-HiddenNodeProcess -ScriptPath $storefrontScript -Name 'storefront' -Environment @{ PORT = '3000'; HOSTNAME = '127.0.0.1'; NODE_ENV = 'production' }
    $admin = Start-HiddenNodeProcess -ScriptPath $adminScript -Name 'admin' -Environment @{ PORT = '3001'; HOSTNAME = '127.0.0.1'; NODE_ENV = 'production' }

    $apiResponse = Wait-HttpOk -Uri 'http://127.0.0.1:4000/health/live'
    $storefrontResponse = Wait-HttpOk -Uri 'http://127.0.0.1:3000/'
    $adminResponse = Wait-HttpOk -Uri 'http://127.0.0.1:3001/'

    $health = $apiResponse.Content | ConvertFrom-Json
    if ($health.status -ne 'ok' -or $health.service -ne 'ecommerce-api') {
        throw 'Resposta de health inválida.'
    }
    if ($worker.HasExited) {
        throw 'Worker encerrou inesperadamente durante o smoke test.'
    }

    Write-Host '[OK] Storefront HTTP 200 em http://127.0.0.1:3000/'
    Write-Host '[OK] Admin HTTP 200 em http://127.0.0.1:3001/'
    Write-Host '[OK] API health HTTP 200 em http://127.0.0.1:4000/health/live'
    Write-Host '[OK] Worker iniciou e permaneceu ativo.'
}
finally {
    foreach ($process in $processes) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }

    foreach ($logFile in $logFiles) {
        if (Test-Path -LiteralPath $logFile -PathType Leaf) {
            Remove-Item -LiteralPath $logFile -Force -ErrorAction SilentlyContinue
        }
    }
}
