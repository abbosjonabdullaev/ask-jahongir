param(
  [string]$RepoName = (Split-Path -Leaf (Get-Location)),
  [ValidateSet("private", "public")]
  [string]$Visibility = "private",
  [string]$GitUserName,
  [string]$GitUserEmail
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Resolve-Gh {
  $command = Get-Command gh -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\GitHub CLI\gh.exe",
    (Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\gh.exe"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\gh.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "GitHub CLI was not found in this shell. Open a new terminal after installing GitHub CLI, then run this script again."
}

$gh = Resolve-Gh

if ($GitUserName) {
  git config user.name $GitUserName
}

if ($GitUserEmail) {
  git config user.email $GitUserEmail
}

$configuredName = (git config user.name).Trim()
$configuredEmail = (git config user.email).Trim()

if (-not $configuredName -or -not $configuredEmail -or $configuredEmail -eq "you@example.com") {
  throw "Refusing to publish with the current git identity '$configuredName <$configuredEmail>'. Set a real local identity first with git config user.name and git config user.email."
}

& $gh auth status 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login' in a normal terminal first."
}

if (-not (Test-Path ".git")) {
  git init | Out-Null
}

git add -A

git rev-parse --verify HEAD *> $null
$hasCommit = $LASTEXITCODE -eq 0
$pending = git status --short

if (-not $hasCommit -or $pending) {
  git commit -m "Initial commit"
}

$origin = git remote get-url origin 2>$null
if (-not $origin) {
  & $gh repo create $RepoName "--$Visibility" --source=. --remote=origin --push
} else {
  git push -u origin HEAD
}
