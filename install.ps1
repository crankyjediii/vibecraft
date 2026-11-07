<#
.SYNOPSIS
  VibeCraft Windows installer and uninstaller (PowerShell 5.1+ and PowerShell 7+).

.DESCRIPTION
  Merges pinned VibeCraft MCP server entries into `%APPDATA%\Claude\claude_desktop_config.json`
  (preserving unrelated MCP servers, symlinks, and UTF-8 BOM-free formatting) and installs the
  standalone skill bundle into `$HOME\.claude\skills\vibecraft`.

  For Claude Code native plugin installs, run inside Claude Code:
    /plugin install vibecraft --marketplace crankyjediii/vibecraft
#>
[CmdletBinding()]
param(
  [Parameter()]
  [switch]$Yes,

  [Parameter()]
  [switch]$DryRun,

  [Parameter()]
  [switch]$Uninstall,

  [Parameter()]
  [switch]$Check,

  [Parameter()]
  [switch]$NoDesktop,

  [Parameter()]
  [switch]$NoCli,

  [Parameter()]
  [string]$Workspace = "",

  [Parameter()]
  [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Show-VibeCraftUsage {
  Write-Host @"
Usage: .\install.ps1 [options]

Options:
  -Yes               Run non-interactively using safe defaults
  -DryRun            Preview planned changes without writing files
  -Check             Verify installation health and exit 0 (ok) or 1 (missing/invalid)
  -Uninstall         Remove vibecraft-* MCP entries and `$HOME\.claude\skills\vibecraft
  -NoDesktop         Skip Claude Desktop claude_desktop_config.json merge
  -NoCli             Skip standalone `$HOME\.claude\skills\vibecraft installation
  -Workspace <dir>   Workspace directory exposed to vibecraft-filesystem MCP
  -Help              Show this help text
"@
}

if ($Help) {
  Show-VibeCraftUsage
  exit 0
}

if ($NoDesktop -and $NoCli) {
  Write-Host "Nothing selected (-NoDesktop and -NoCli both passed)."
  exit 0
}

$nodeCmd = Get-Command -Name 'node' -ErrorAction SilentlyContinue
if ($null -eq $nodeCmd) {
  Write-Error "Node.js (>= 18) is required on PATH. Install from https://nodejs.org"
  exit 1
}

$nodeMajorRaw = & node -p "process.versions.node.split('.')[0]" 2>$null
$nodeMajor = 0
[void][int]::TryParse("$nodeMajorRaw", [ref]$nodeMajor)
if ($nodeMajor -lt 18) {
  Write-Error "Node.js >= 18 is required (found $(& node -v))."
  exit 1
}

$tempFetchDir = $null
try {
  $repoDir = $null
  if ($PSScriptRoot -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'scripts\lib\installer-core.mjs'))) {
    $repoDir = $PSScriptRoot
  }

  if (-not $repoDir) {
    $zipUrl = if ($env:VIBECRAFT_ARCHIVE_URL) {
      $env:VIBECRAFT_ARCHIVE_URL
    } else {
      'https://github.com/crankyjediii/vibecraft/archive/refs/tags/v1.0.0.zip'
    }
    $tempFetchDir = Join-Path ([System.IO.Path]::GetTempPath()) ("vibecraft-install-" + [System.Guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $tempFetchDir -Force)
    $zipFile = Join-Path $tempFetchDir 'vibecraft.zip'
    Write-Host "Downloading VibeCraft bundle from $zipUrl ..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
    Expand-Archive -LiteralPath $zipFile -DestinationPath $tempFetchDir -Force

    $extracted = Get-ChildItem -LiteralPath $tempFetchDir -Directory | Where-Object {
      Test-Path -LiteralPath (Join-Path $_.FullName 'scripts\lib\installer-core.mjs')
    } | Select-Object -First 1

    if ($null -eq $extracted) {
      throw "Downloaded archive did not contain scripts\lib\installer-core.mjs."
    }
    $repoDir = $extracted.FullName
  }

  if ((-not $Yes) -and (-not $DryRun) -and (-not $Check)) {
    $actionLabel = if ($Uninstall) { 'uninstall VibeCraft' } else { 'install VibeCraft' }
    $answer = Read-Host -Prompt "Proceed to $actionLabel? [Y/n]"
    if ($answer -and ($answer -notmatch '^(y|yes)$')) {
      Write-Host 'Aborted.'
      exit 0
    }
  }

  $coreArgs = @('--repo-root', $repoDir)
  if ($DryRun) { $coreArgs += '--dry-run' }
  if ($Uninstall) { $coreArgs += '--uninstall' }
  if ($Check) { $coreArgs += '--check' }
  if ($NoDesktop) { $coreArgs += '--no-desktop' }
  if ($NoCli) { $coreArgs += '--no-cli' }
  if (-not [string]::IsNullOrWhiteSpace($Workspace)) {
    $coreArgs += @('--workspace', $Workspace)
  }

  $coreScript = Join-Path $repoDir 'scripts\lib\installer-core.mjs'
  & node $coreScript @coreArgs
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    exit $exitCode
  }

  # Restrict Claude Desktop config ACL to current Windows user + Administrators/SYSTEM when written
  if ((-not $NoDesktop) -and (-not $DryRun) -and (-not $Check) -and ($env:OS -eq 'Windows_NT')) {
    $cfgPath = if ($env:CLAUDE_DESKTOP_CONFIG) {
      $env:CLAUDE_DESKTOP_CONFIG
    } else {
      Join-Path $env:APPDATA 'Claude\claude_desktop_config.json'
    }
    if (Test-Path -LiteralPath $cfgPath) {
      $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
      & icacls $cfgPath /inheritance:r /grant:r "${currentUser}:(F)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
    }
  }

  if ((-not $Check) -and (-not $Uninstall) -and (-not $DryRun)) {
    $uvxCmd = Get-Command -Name 'uvx' -ErrorAction SilentlyContinue
    if ($null -eq $uvxCmd) {
      Write-Host "Note: optional 'uvx' CLI not found on PATH (needed only for vibecraft-fetch MCP server)."
      Write-Host "      Install uv later if desired: powershell -ExecutionPolicy ByPass -c `"irm https://astral.sh/uv/install.ps1 | iex`""
    }
    Write-Host "Note: set BRAVE_API_KEY in your user environment variables if you use vibecraft-brave-search."
    Write-Host "Done. Run 'node scripts/doctor.mjs' (or '/vibecraft:doctor' in Claude Code) to verify."
  }
} finally {
  if ($tempFetchDir -and (Test-Path -LiteralPath $tempFetchDir)) {
    Remove-Item -LiteralPath $tempFetchDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
