# ═══════════════════════════════════════════════════════════
# MomentCraft Studios — Supabase Setup Script
# Run this AFTER settling the lawfirm-one-org invoice
# ═══════════════════════════════════════════════════════════

Write-Host "`n✦ MomentCraft Studios — Supabase Setup" -ForegroundColor Cyan
Write-Host "────────────────────────────────────────`n"

# Step 1: Create the project
Write-Host "[1/5] Creating Supabase project..." -ForegroundColor Yellow
$result = supabase projects create "MomentCraft Studios" --org-id rkhayougxhcgvofpesxl --region us-east-1 --db-password "MCS_Inv3st0r_2026!" 2>&1
Write-Host $result

# Extract project ref from output
$ref = ($result | Select-String -Pattern "Created a new project.*?(\w{20})" | ForEach-Object { $_.Matches.Groups[1].Value })
if (-not $ref) {
    Write-Host "`n⚠ Could not auto-detect project ref. Please enter it manually:" -ForegroundColor Red
    $ref = Read-Host "Project Reference ID"
}
Write-Host "Project ref: $ref" -ForegroundColor Green

# Step 2: Link the project
Write-Host "`n[2/5] Linking project..." -ForegroundColor Yellow
supabase link --project-ref $ref 2>&1

# Step 3: Run schema SQL
Write-Host "`n[3/5] Running schema.sql..." -ForegroundColor Yellow
supabase db push 2>&1
# If db push doesn't work, fallback:
# supabase db execute --file supabase/schema.sql 2>&1

# Step 4: Deploy edge functions
Write-Host "`n[4/5] Deploying edge functions..." -ForegroundColor Yellow
$functions = @("verify-token", "track-event", "admin-manage-token", "admin-get-analytics")
foreach ($fn in $functions) {
    Write-Host "  → Deploying $fn..." -ForegroundColor Gray
    supabase functions deploy $fn --no-verify-jwt 2>&1
}

# Step 5: Get the project URL
$projectUrl = "https://$ref.supabase.co"
Write-Host "`n[5/5] Updating HTML files with project URL..." -ForegroundColor Yellow

$files = @(
    "index.html",
    "room.html",
    "admin\index.html"
)
foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        (Get-Content $path -Raw) -replace 'https://YOUR_PROJECT\.supabase\.co', $projectUrl | Set-Content $path -NoNewline
        Write-Host "  ✓ Updated $file" -ForegroundColor Green
    }
}

Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✦ DONE! Your Supabase project is live." -ForegroundColor Green
Write-Host "  Project URL: $projectUrl" -ForegroundColor White
Write-Host "  Dashboard:   https://supabase.com/dashboard/project/$ref" -ForegroundColor White
Write-Host "`nNow run: vercel --prod --yes" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════`n" -ForegroundColor Cyan
