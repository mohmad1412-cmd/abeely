param(
    [Parameter(Mandatory=$false)]
    [string]$Json = "{}"
)

# Get repo root (parent of scripts directory)
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Parse JSON input or use default
$featureName = $null
if ($Json -and $Json -ne "{}") {
    try {
        # Fix escaped JSON
        $cleanJson = $Json -replace '\\"', '"'
        $inputData = $cleanJson | ConvertFrom-Json
        $featureName = $inputData.featureName
    } catch {
        # If parsing fails, try to extract featureName manually
        if ($Json -match 'featureName["\s]*:\s*["\s]*([^"]+)') {
            $featureName = $matches[1]
        }
    }
}

# If still no feature name, prompt or use default
if (-not $featureName) {
    $featureName = "ratings-and-reviews-system"
}

# Generate branch name (kebab-case, lowercase)
$branchName = $featureName.ToLower() -replace '[^a-z0-9-]', '-' -replace '-+', '-'
if (-not $branchName.StartsWith("feature/")) {
    $branchName = "feature/$branchName"
}

# Create specs directory if it doesn't exist
$specsDir = Join-Path $repoRoot "specs"
if (-not (Test-Path $specsDir)) {
    New-Item -ItemType Directory -Path $specsDir -Force | Out-Null
}

# Generate spec file path
$specFileName = "$featureName.md"
$specFile = Join-Path $specsDir $specFileName

# Create branch (if git is available)
$gitAvailable = $false
try {
    git --version | Out-Null
    $gitAvailable = $true
} catch {
    # Git not available, continue without it
}

if ($gitAvailable) {
    # Check if branch exists
    $branchExists = git branch --list $branchName
    if ($branchExists) {
        Write-Host "Branch $branchName already exists. Checking out..." -ForegroundColor Yellow
        git checkout $branchName 2>&1 | Out-Null
    } else {
        git checkout -b $branchName 2>&1 | Out-Null
    }
}

# Create spec file with basic structure (always create/overwrite)
$specContent = @"
# $featureName

## Overview
[Feature description goes here]

## User Stories
- [ ] As a [user type], I want to [action] so that [benefit]

## Requirements
### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Considerations
- [ ] Consideration 1
- [ ] Consideration 2

"@
Set-Content -Path $specFile -Value $specContent

# Output JSON for spec-kit
$output = @{
    BRANCH_NAME = $branchName
    SPEC_FILE = $specFile
} | ConvertTo-Json -Compress

Write-Output $output
