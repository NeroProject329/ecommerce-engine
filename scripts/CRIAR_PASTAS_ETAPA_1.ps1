# Ecommerce Engine - Etapa 1A
# Objetivo: criar SOMENTE diretorios. Nao escreve codigo, nao instala dependencias,
# nao apaga arquivos, nao cria banco e nao modifica configuracoes do computador.

[CmdletBinding()]
param(
    [string]$ProjectRoot = 'C:\Users\mathe\Downloads\ecommerce-engine'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
        throw 'ProjectRoot nao pode ser vazio.'
    }

    $ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
    if (-not [System.IO.Path]::IsPathRooted($ProjectRoot)) {
        throw "Caminho do projeto precisa ser absoluto: $ProjectRoot"
    }

    if (Test-Path -LiteralPath $ProjectRoot -PathType Leaf) {
        throw "Ja existe um ARQUIVO com o nome da pasta raiz: $ProjectRoot"
    }

    if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
        $null = New-Item -ItemType Directory -Path $ProjectRoot -Force
        Write-Host "[CRIADO] $ProjectRoot"
    } else {
        Write-Host "[EXISTE] $ProjectRoot"
    }

    $relativeDirectories = @(
        'apps',
        'apps\storefront',
        'apps\storefront\src',
        'apps\storefront\src\app',
        'apps\admin',
        'apps\admin\src',
        'apps\admin\src\app',
        'apps\api',
        'apps\api\src',
        'apps\worker',
        'apps\worker\src',
        'packages',
        'packages\database',
        'packages\database\prisma',
        'packages\contracts',
        'packages\validation',
        'packages\auth',
        'packages\catalog',
        'packages\commerce',
        'packages\payments',
        'packages\media',
        'packages\ui',
        'packages\config',
        'packages\observability',
        'infrastructure',
        'infrastructure\local',
        'infrastructure\docker',
        'infrastructure\nginx',
        'infrastructure\cloudflare',
        'infrastructure\deploy',
        'scripts',
        'docs',
        'docs\adr',
        'docs\api',
        'docs\architecture',
        'docs\database',
        'docs\stages',
        'docs\runbooks',
        'docs\references',
        'tests',
        'tests\integration',
        'tests\e2e',
        'tests\load',
        'tests\security'
    )

    $created = 0
    $existing = 0

    foreach ($relativeDirectory in $relativeDirectories) {
        $targetPath = Join-Path -Path $ProjectRoot -ChildPath $relativeDirectory

        if (Test-Path -LiteralPath $targetPath -PathType Leaf) {
            throw "Conflito: um arquivo ocupa o caminho de diretorio $targetPath"
        }

        if (Test-Path -LiteralPath $targetPath -PathType Container) {
            $existing++
            Write-Host "[EXISTE] $relativeDirectory"
            continue
        }

        $null = New-Item -ItemType Directory -Path $targetPath -Force
        if (-not (Test-Path -LiteralPath $targetPath -PathType Container)) {
            throw "Falha ao criar: $targetPath"
        }
        $created++
        Write-Host "[CRIADO] $relativeDirectory"
    }

    $missing = @(
        $relativeDirectories | Where-Object {
            -not (Test-Path -LiteralPath (Join-Path -Path $ProjectRoot -ChildPath $_) -PathType Container)
        }
    )

    if ($missing.Count -gt 0) {
        throw "Diretorios ausentes ao final: $($missing -join ', ')"
    }

    Write-Host ''
    Write-Host '=============================================='
    Write-Host '[OK] Estrutura de diretorios verificada.'
    Write-Host "Raiz: $ProjectRoot"
    Write-Host "Criados agora: $created"
    Write-Host "Ja existentes: $existing"
    Write-Host "Total verificado: $($relativeDirectories.Count)"
    Write-Host 'Nenhum arquivo de codigo foi criado/modificado.'
    Write-Host 'Etapa 1 NAO esta concluida; proximo arquivo: package.json.'
    Write-Host '=============================================='
}
catch {
    Write-Error "[FALHA] $($_.Exception.Message)"
    exit 1
}
