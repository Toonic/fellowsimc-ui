#!/usr/bin/env bash
set -e

# Change directory to the script's directory
cd "$(dirname "$0")"

echo "==================================================="
echo "  Starting FellowSimc Web UI and Character Importer"
echo "==================================================="
echo ""

# Find python3 or python
if command -v python3 &>/dev/null; then
    PY_CMD=python3
elif command -v python &>/dev/null; then
    PY_CMD=python
else
    echo "[ERROR] Python 3 was not found on your system!"
    echo "Please install Python 3 (e.g. sudo apt install python3) to run FellowSimc UI."
    exit 1
fi

# Check for Wine if running Windows simc.exe
if [ ! -f "./simc" ] && [ -f "./simc.exe" ]; then
    if ! command -v wine &>/dev/null && ! command -v wine64 &>/dev/null; then
        echo "[WARNING] Wine is required to run the Windows simulation engine on Linux!"
        echo "Please install Wine (e.g. sudo apt install wine or sudo pacman -S wine)."
        echo ""
    fi
fi

if [ -f "./simc" ]; then
    chmod +x ./simc
fi

echo "[INFO] Starting FellowSimc local server using $PY_CMD..."
echo "[INFO] Open http://localhost:5000 in your browser to begin."
echo ""

$PY_CMD ui/server.py

