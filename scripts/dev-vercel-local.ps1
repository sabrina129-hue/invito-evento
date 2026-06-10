param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$VercelArgs
)

$ErrorActionPreference = "Stop"

Set-Location (Resolve-Path "$PSScriptRoot\..")

Get-Content ".env.local" | ForEach-Object {
  $line = $_.Trim()

  if (!$line -or $line.StartsWith("#") -or !$line.Contains("=")) {
    return
  }

  $name, $value = $line.Split("=", 2)
  $name = $name.Trim()
  $value = $value.Trim().Trim('"')

  if ($name) {
    Set-Item -Path "Env:$name" -Value $value
  }
}

if ($VercelArgs.Count -gt 0) {
  vercel dev @VercelArgs
} else {
  npm run dev:vercel
}
