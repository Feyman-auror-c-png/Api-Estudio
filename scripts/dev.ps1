$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cargoHome = Join-Path $projectRoot '.tools\cargo'
$rustupHome = Join-Path $projectRoot '.tools\rustup'

$env:CARGO_HOME = $cargoHome
$env:RUSTUP_HOME = $rustupHome
$env:Path = "$(Join-Path $cargoHome 'bin');$env:Path"

Push-Location $projectRoot
try {
    npm run tauri dev
}
finally {
    Pop-Location
}
