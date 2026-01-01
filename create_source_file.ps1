$outputFile = "FULL_PROJECT_CODE.txt"
$excludePatterns = @("node_modules", "dist", "build", "\.git", "coverage", "package-lock.json", "yarn.lock", "deno.lock")
$extensions = @(".ts", ".tsx", ".css", ".html", ".json", ".sql", ".md", ".java", ".xml", ".gradle")

# تهيئة الملف
"Project Source Code Export - $(Get-Date)" | Out-File -FilePath $outputFile -Encoding utf8

# البحث عن الملفات
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $file = $_
    $isExtensionValid = $extensions -contains $file.Extension
    $isPathValid = $true
    
    foreach ($pattern in $excludePatterns) {
        if ($file.FullName -match $pattern) {
            $isPathValid = $false
            break
        }
    }
    
    return $isExtensionValid -and $isPathValid
}

# كتابة محتوى الملفات
foreach ($file in $files) {
    Write-Host "Adding: $($file.Name)"
    
    " " | Out-File -FilePath $outputFile -Append -Encoding utf8
    "==============================================================================" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "FILE PATH: $($file.FullName.Replace($PWD.Path, ''))" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "==============================================================================" | Out-File -FilePath $outputFile -Append -Encoding utf8
    " " | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Get-Content -Path $file.FullName | Out-File -FilePath $outputFile -Append -Encoding utf8
}

Write-Host "`nDone! All code has been saved to: $outputFile" -ForegroundColor Green






