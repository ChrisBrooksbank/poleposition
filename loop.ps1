#Requires -Version 7
# Ralph Wiggum Loop - Fresh context per iteration (PowerShell 7)
# Usage: ./loop.ps1 [-Mode plan|build] [-MaxIterations N]
#
# Examples:
#   ./loop.ps1 -Mode plan                # Planning mode, unlimited
#   ./loop.ps1 -Mode plan -MaxIterations 5
#   ./loop.ps1 -Mode build               # Build mode, unlimited
#   ./loop.ps1 -Mode build -MaxIterations 20

[CmdletBinding()]
param(
    [ValidateSet('plan', 'build')]
    [string]$Mode = 'build',

    [ValidateRange(0, [int]::MaxValue)]
    [int]$MaxIterations = 0
)

$ErrorActionPreference = 'Stop'

$PromptFile = if ($Mode -eq 'plan') { 'PROMPT_plan.md' } else { 'PROMPT_build.md' }

if (-not (Test-Path $PromptFile)) {
    Write-Error "Error: $PromptFile not found"
    exit 1
}

Write-Host '=========================================='
Write-Host 'Ralph Wiggum Loop'
Write-Host "Mode: $Mode"
Write-Host "Prompt: $PromptFile"
if ($MaxIterations -gt 0) { Write-Host "Max iterations: $MaxIterations" }
Write-Host '=========================================='

$Iteration = 0

while ($true) {
    if ($MaxIterations -gt 0 -and $Iteration -ge $MaxIterations) {
        Write-Host "`nReached max iterations ($MaxIterations). Stopping."
        break
    }

    $Iteration++
    Write-Host "`n=========================================="
    Write-Host "Iteration $Iteration (Mode: $Mode)"
    Write-Host (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    Write-Host '=========================================='

    # Fresh Claude session each iteration - context resets!
    Get-Content $PromptFile -Raw | claude -p `
        --dangerously-skip-permissions `
        --model sonnet

    # Auto-commit progress after each iteration
    git add -A
    $staged = git diff --staged --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        git commit -m "Ralph iteration $Iteration ($Mode mode)`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
        Write-Host 'Changes committed.'
    } else {
        Write-Host 'No changes to commit.'
    }

    Write-Host "Iteration $Iteration complete."
    Start-Sleep -Seconds 2
}

Write-Host "`nRalph loop finished after $Iteration iterations."
