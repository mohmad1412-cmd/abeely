param(
    [Parameter(Mandatory=$false)]
    [string]$Json = "{}"
)

# Get repo root (parent of scripts directory)
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Parse JSON input (optional, not always needed)
$inputData = $null
try {
    $inputData = $Json | ConvertFrom-Json
} catch {
    # Continue without JSON input
}

# Get the most recent spec file from specs directory
$specsDir = Join-Path $repoRoot "specs"
if (-not (Test-Path $specsDir)) {
    Write-Error "Specs directory not found. Run specify command first."
    exit 1
}

# Find the most recent spec file
$specFiles = Get-ChildItem -Path $specsDir -Filter "*.md" | Sort-Object LastWriteTime -Descending
if ($specFiles.Count -eq 0) {
    Write-Error "No spec files found in specs directory."
    exit 1
}

$featureSpec = $specFiles[0].FullName

# Generate plan file path
$featureName = $specFiles[0].BaseName
$planFile = Join-Path $specsDir "$featureName-plan.md"

# Get current branch name
$branchName = "main"
try {
    $branchName = git rev-parse --abbrev-ref HEAD
} catch {
    # Git not available, use default
}

# Output JSON for spec-kit
$output = @{
    FEATURE_SPEC = $featureSpec
    IMPL_PLAN = $planFile
    SPECS_DIR = $specsDir
    BRANCH = $branchName
} | ConvertTo-Json -Compress

Write-Output $output
