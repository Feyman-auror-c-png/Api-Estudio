[CmdletBinding()]
param(
    [switch]$SkipBuildToolsCheck
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$cargoHome = Join-Path $toolsRoot 'cargo'
$rustupHome = Join-Path $toolsRoot 'rustup'
$rustupInstaller = Join-Path $toolsRoot 'rustup-init.exe'

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null

if (-not $SkipBuildToolsCheck) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) {
        Write-Warning 'No se detectaron Microsoft C++ Build Tools.'
        Write-Host 'Instala "Desktop development with C++" desde Visual Studio Build Tools y ejecuta este script otra vez.'
        Write-Host 'https://visualstudio.microsoft.com/visual-cpp-build-tools/'
        exit 2
    }

    $installationPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $installationPath) {
        Write-Warning 'Visual Studio está instalado, pero falta el componente C++ x64/x86.'
        exit 2
    }
}

$env:CARGO_HOME = $cargoHome
$env:RUSTUP_HOME = $rustupHome
$env:Path = "$(Join-Path $cargoHome 'bin');$env:Path"

if (-not (Test-Path -LiteralPath (Join-Path $cargoHome 'bin\cargo.exe'))) {
    Write-Host 'Descargando Rustup...'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://win.rustup.rs/x86_64' -OutFile $rustupInstaller
    & $rustupInstaller -y --no-modify-path --profile minimal --default-toolchain stable
    if ($LASTEXITCODE -ne 0) { throw "Rustup terminó con código $LASTEXITCODE" }
}

rustc --version
cargo --version

Push-Location $projectRoot
try {
    Write-Host 'Instalando dependencias npm...'
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm terminó con código $LASTEXITCODE" }

    Write-Host 'Validando el frontend...'
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "La compilación frontend terminó con código $LASTEXITCODE" }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Entorno instalado correctamente.' -ForegroundColor Green
Write-Host 'Inicia la aplicación con: .\scripts\dev.ps1'
