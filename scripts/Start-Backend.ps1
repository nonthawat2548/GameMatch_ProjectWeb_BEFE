param([string]$EnvFile = "$PSScriptRoot/../backend/.env")

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path "$PSScriptRoot/..").Path
if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw 'Missing backend/.env. Copy backend/.env.example and configure the database first.'
}
# Read values as text; never execute the contents of an environment file.
foreach ($line in Get-Content -LiteralPath $EnvFile -Encoding UTF8) {
    if ($line.Trim() -eq '' -or $line.TrimStart().StartsWith('#')) { continue }
    if ($line -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$') { throw 'Invalid environment file line.' }
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
}
$goCommand = Get-Command go -ErrorAction SilentlyContinue
$goExecutable = if ($goCommand) { $goCommand.Source } else { Join-Path $projectRoot '.tools/go/bin/go.exe' }
if (-not (Test-Path -LiteralPath $goExecutable)) { throw 'Install Go 1.22+ before starting the API.' }
Push-Location (Join-Path $projectRoot 'backend')
try {
    & $goExecutable run .
    if ($LASTEXITCODE -ne 0) { throw 'GameMatch backend exited with an error.' }
} finally {
    Pop-Location
}
