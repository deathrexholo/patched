# Backup Script - Download all landing page files from Firebase
$baseUrl = "https://amaplay007.web.app/landing"
$targetDir = "public\landing"

Write-Host "Starting landing page backup..." -ForegroundColor Cyan

# Create directories
@("assets\css", "assets\js", "images\athlete", "images\coaches", "images\org", "images\video") | ForEach-Object {
    $dir = Join-Path $targetDir $_
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Download files
$files = @(
    "index.html",
    "coaches.html",
    "organizations.html",
    "style.css",
    "script.js",
    "assets/css/main.css",
    "assets/js/main.js",
    "images/logo2.png",
    "images/slide01.jpg",
    "images/coaches.jpg",
    "images/organisation.jpg",
    "images/vision.png",
    "images/mission1.png",
    "images/athlete/raaghav.jpeg",
    "images/athlete/KARTIK.jpeg",
    "images/athlete/dev.jpeg",
    "images/coaches/baldivya.png",
    "images/coaches/rodrigueg.png",
    "images/coaches/swimming.png",
    "images/org/elitesportaca.png",
    "images/org/meerutbasketball.png",
    "images/org/metrosoccerclub].png",
    "images/video/boatrift.mp4",
    "images/video/chess.mp4"
)

$total = $files.Count
$current = 0

foreach ($file in $files) {
    $current++
    $url = "$baseUrl/$file"
    $output = Join-Path $targetDir ($file -replace '/', '\')
    
    Write-Host "[$current/$total] Downloading $file..." -NoNewline
    
    Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction SilentlyContinue
    
    if (Test-Path $output) {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
    }
}

Write-Host "`nBackup complete!" -ForegroundColor Cyan
