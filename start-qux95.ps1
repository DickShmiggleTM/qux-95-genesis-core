# QUX-95 Genesis Core Startup Script
# This script launches the QUX-95 system in Windows Terminal with two panes

# Script parameters
param(
    [switch]$SkipNpmInstall = $false,
    [switch]$SkipPythonSetup = $false
)

# Configuration
$RepoRoot = $PSScriptRoot
$PythonVenvPath = Join-Path $RepoRoot ".venv"
$PythonExe = Join-Path $PythonVenvPath "Scripts" "python.exe"
$ActivateScript = Join-Path $PythonVenvPath "Scripts" "Activate.ps1"

# Function to check if a command exists
function Test-Command {
    param ($Command)
    
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check if Windows Terminal is installed
if (-not (Test-Command -Command "wt")) {
    Write-Host "Windows Terminal is not installed. Please install it from the Microsoft Store." -ForegroundColor Red
    Write-Host "https://aka.ms/terminal" -ForegroundColor Blue
    exit 1
}

# Check if Git is installed
if (-not (Test-Command -Command "git")) {
    Write-Host "Git is not installed. Please install it from https://git-scm.com/downloads" -ForegroundColor Red
    exit 1
}

# Check Git SSH key
$SshKeyPath = "~/.ssh/id_ed25519"
if (-not (Test-Path -Path (Resolve-Path $SshKeyPath -ErrorAction SilentlyContinue))) {
    Write-Host "SSH key not found at $SshKeyPath" -ForegroundColor Yellow
    Write-Host "The specified SSH key for authentication is not found."
    Write-Host "You may need to create it with: ssh-keygen -t ed25519"
}

# Setup Python environment if needed
if (-not $SkipPythonSetup) {
    # Check if Python is installed
    if (-not (Test-Command -Command "python")) {
        Write-Host "Python is not installed. Please install Python 3.11 from https://python.org/downloads/" -ForegroundColor Red
        exit 1
    }

    # Check Python version
    $PythonVersion = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
    if ([version]$PythonVersion -lt [version]"3.10") {
        Write-Host "Python version $PythonVersion is too old. Please install Python 3.11+" -ForegroundColor Red
        exit 1
    }

    # Create virtual environment if it doesn't exist
    if (-not (Test-Path $PythonVenvPath)) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Green
        python -m venv $PythonVenvPath
        if (-not $?) {
            Write-Host "Failed to create virtual environment." -ForegroundColor Red
            exit 1
        }
    }

    # Activate virtual environment and install dependencies
    Write-Host "Activating virtual environment and installing dependencies..." -ForegroundColor Green
    & $ActivateScript
    pip install -r (Join-Path $RepoRoot "requirements.txt")
    if (-not $?) {
        Write-Host "Failed to install Python dependencies." -ForegroundColor Red
        exit 1
    }
}

# Install npm dependencies if needed
if (-not $SkipNpmInstall) {
    # Check if Node.js is installed
    if (-not (Test-Command -Command "npm")) {
        Write-Host "Node.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }

    # Install npm dependencies
    Write-Host "Installing npm dependencies..." -ForegroundColor Green
    Push-Location $RepoRoot
    npm install
    if (-not $?) {
        Write-Host "Failed to install npm dependencies." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Check if Ollama is installed and running
$OllamaRunning = $false
try {
    $OllamaStatus = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -Method Get -ErrorAction SilentlyContinue
    $OllamaRunning = $true
    Write-Host "Ollama is running: v$($OllamaStatus.version)" -ForegroundColor Green
}
catch {
    Write-Host "Ollama is not running or not installed." -ForegroundColor Yellow
    Write-Host "Please install Ollama from https://ollama.com/" -ForegroundColor Yellow
    Write-Host "After installation, run: ollama pull llama3" -ForegroundColor Yellow
}

# Start Windows Terminal with two panes
Write-Host "Starting QUX-95 Genesis Core in Windows Terminal..." -ForegroundColor Green

# Command for Pane A: npm run dev
$NpmDevCommand = "cd '$RepoRoot'; npm run dev; pause"

# Command for Pane B: Python REPL with pre-loaded modules
$PythonReplCommand = @"
cd '$RepoRoot'
& '$ActivateScript'
Write-Host 'Starting QUX-95 Genesis Core Python environment...' -ForegroundColor Cyan
Write-Host 'Available commands:' -ForegroundColor Cyan
Write-Host '- python -i' -ForegroundColor Yellow
Write-Host '- python server.py' -ForegroundColor Yellow
Write-Host '- python cli.py --watch src/' -ForegroundColor Yellow
python -i
"@

# Launch Windows Terminal with two panes
Start-Process wt -ArgumentList "new-tab -d '$RepoRoot' powershell -NoExit -Command `"$NpmDevCommand`"; split-pane -d '$RepoRoot' powershell -NoExit -Command `"$PythonReplCommand`""

# Output completion message
Write-Host "QUX-95 Genesis Core environment is starting..." -ForegroundColor Green
Write-Host "Front-end will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API server can be started with: python server.py" -ForegroundColor Cyan
Write-Host "It will be available at: http://localhost:5000" -ForegroundColor Cyan
