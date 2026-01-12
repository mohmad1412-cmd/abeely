param(
    [Parameter(Mandatory=$false)]
    [string]$Json = "{}"
)

# Get repo root
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Parse JSON input
$featureName = $null
if ($Json -and $Json -ne "{}") {
    try {
        $cleanJson = $Json -replace '\\"', '"'
        $inputData = $cleanJson | ConvertFrom-Json
        $featureName = $inputData.featureName
    } catch {
        if ($Json -match 'featureName["\s]*:\s*["\s]*([^"]+)') {
            $featureName = $matches[1]
        }
    }
}

# Default feature name if not provided
if (-not $featureName) {
    $featureName = "ratings-and-reviews-system"
}

# Feature directory (assuming it's in specs/)
$featureDir = Join-Path $repoRoot "specs"

# List of available documents to check
$availableDocs = @()

# Check for common design documents
$documents = @(
    @{ Name = "plan.md"; Path = Join-Path $featureDir "$featureName-plan.md" },
    @{ Name = "plan.md (alternative)"; Path = Join-Path $featureDir "ratings-and-reviews-system-plan.md" },
    @{ Name = "data-model.md"; Path = Join-Path $featureDir "data-model.md" },
    @{ Name = "research.md"; Path = Join-Path $featureDir "research.md" },
    @{ Name = "quickstart.md"; Path = Join-Path $featureDir "quickstart.md" }
)

# Check which documents exist
foreach ($doc in $documents) {
    if (Test-Path $doc.Path) {
        $availableDocs += $doc.Name.Split(' ')[0]  # Take only the first part (filename)
    }
}

# Check for contracts directory
$contractsDir = Join-Path $featureDir "contracts"
if (Test-Path $contractsDir) {
    $contractFiles = Get-ChildItem -Path $contractsDir -Filter "*.md" -ErrorAction SilentlyContinue
    if ($contractFiles) {
        $availableDocs += "contracts"
        foreach ($file in $contractFiles) {
            $availableDocs += "contracts/$($file.Name)"
        }
    }
}

# Output JSON
$output = @{
    FEATURE_DIR = $featureDir
    AVAILABLE_DOCS = $availableDocs
} | ConvertTo-Json -Compress

Write-Output $output
