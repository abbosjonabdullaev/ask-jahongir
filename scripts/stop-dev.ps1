$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Output "No process is listening on port 3000."
  exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Output "Stopped process $processId on port 3000."
  } catch {
    Write-Output ("Failed to stop process {0}: {1}" -f $processId, $_.Exception.Message)
  }
}
