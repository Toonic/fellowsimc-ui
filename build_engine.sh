#!/usr/bin/env bash
set -e

# Change directory to the script's directory
cd "$(dirname "$0")"

echo "==================================================="
echo "  FellowSimc - Local Engine Build Script (Linux)   "
echo "==================================================="
echo ""

# 1. Initialize / Update Submodule
echo "[1/3] Checking engine submodule..."
if [ ! -f "simc-engine/CMakeLists.txt" ]; then
    echo "[INFO] Initializing simc-engine submodule..."
    git submodule update --init --recursive
else
    echo "[INFO] simc-engine submodule is present."
fi

if [ "$1" == "--sync" ] || [ "$1" == "--update" ]; then
    echo "[INFO] Updating submodule to latest upstream commit..."
    git submodule update --remote --merge
fi

# 2. Check CMake and compilers
echo ""
echo "[2/3] Configuring build..."
if ! command -v cmake &>/dev/null; then
    echo "[ERROR] cmake was not found! Please install cmake (e.g. sudo apt install cmake build-essential libcurl4-openssl-dev)"
    exit 1
fi

cmake -B simc-engine/build -S simc-engine -DCMAKE_BUILD_TYPE=Release -DBUILD_GUI=OFF

# 3. Compile
echo ""
echo "[3/3] Compiling engine..."
cmake --build simc-engine/build --config Release -j"$(nproc 2>/dev/null || echo 2)"

if [ -f "simc-engine/build/simc" ]; then
    cp simc-engine/build/simc simc-engine/simc
    chmod +x simc-engine/simc
    echo ""
    echo "==================================================="
    echo "  BUILD SUCCESSFUL! Binary ready at simc-engine/simc"
    echo "==================================================="
    echo "You can now run start_ui.sh to launch the UI."
fi

