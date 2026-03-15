param(
  [string]$SiteName,
  [switch]$Production
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$linkedStatePath = Join-Path $repoRoot ".netlify\state.json"

if (-not $env:NETLIFY_AUTH_TOKEN) {
  npx.cmd netlify status 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Netlify CLI is not authenticated. Run 'npm run netlify:login' first, or set NETLIFY_AUTH_TOKEN."
  }
}

$args = @("netlify", "deploy", "--build")

if ($Production) {
  $args += "--prod"
}

if (-not (Test-Path $linkedStatePath)) {
  if (-not $SiteName) {
    throw "This folder is not linked to a Netlify site yet. Re-run with -SiteName <your-site-name> so the CLI can create and link a new site."
  }

  $args += @("--create-site", $SiteName)
}

npx.cmd @args
