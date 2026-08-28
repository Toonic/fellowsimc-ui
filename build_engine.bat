@echo off
setlocal enabledelayedexpansion
title FellowSimc Engine Builder

echo ===================================================
echo   FellowSimc - Local Engine Build Script (Windows)
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check Submodule
echo [1/3] Checking engine submodule...
if not exist "simc-engine\.git" (
    echo [INFO] Initializing simc-engine submodule...
    git submodule update --init --recursive
) else (
    echo [INFO] simc-engine submodule is present.
)

if "%1"=="--sync" (
    echo [INFO] Updating submodule to latest upstream commit...
    git submodule update --remote --merge
)
if "%1"=="--update" (
    echo [INFO] Updating submodule to latest upstream commit...
    git submodule update --remote --merge
)

:: 2. Locate MSBuild
echo.
echo [2/3] Locating build tools...
set "MSBUILD_EXE="

:: Check known standard MSBuild locations first
if exist "%ProgramFiles%\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles%\Microsoft Visual Studio\18\Professional\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\18\Professional\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles%\Microsoft Visual Studio\18\Enterprise\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\18\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe" set "MSBUILD_EXE=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe"

:: Query vswhere if not at standard path
if not defined MSBUILD_EXE (
    set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
    if exist "!VSWHERE!" (
        for /f "usebackq delims=" %%F in (`"!VSWHERE!" -latest -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe"`) do (
            if exist "%%F" set "MSBUILD_EXE=%%F"
        )
    )
)

if not defined MSBUILD_EXE (
    where msbuild >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set "MSBUILD_EXE=msbuild"
    )
)

if defined MSBUILD_EXE (
    echo [INFO] Found MSBuild: "!MSBUILD_EXE!"
    echo.
    echo [3/3] Compiling engine in Release mode...
    cd simc-engine
    if exist "simc_vs2026.sln" (
        "!MSBUILD_EXE!" simc_vs2026.sln /p:Configuration=Release /p:Platform=x64 /m
    ) else if exist "simc_vs2022.sln" (
        "!MSBUILD_EXE!" simc_vs2022.sln /p:Configuration=Release /p:Platform=x64 /m
    ) else (
        "!MSBUILD_EXE!" simc_vs2019.sln /p:Configuration=Release /p:Platform=x64 /m
    )
    set "BUILD_EXIT_CODE=!ERRORLEVEL!"
    cd ..
    if not "!BUILD_EXIT_CODE!"=="0" goto error_exit
    goto copy_binaries
)

echo [ERROR] MSBuild could not be found!
echo Please install Visual Studio with 'Desktop development with C++' workload.
goto error_exit

:copy_binaries
echo.
echo ===================================================
echo   BUILD SUCCESSFUL!
echo ===================================================

if exist "simc-engine\bin\x64\Release\simc.exe" (
    copy /y "simc-engine\bin\x64\Release\simc.exe" "simc-engine\simc.exe" >nul 2>&1
    copy /y "simc-engine\bin\x64\Release\simc.exe" "simc.exe" >nul 2>&1
    echo [INFO] Binary ready at: .\simc.exe and simc-engine\simc.exe
) else if exist "simc-engine\simc.exe" (
    copy /y "simc-engine\simc.exe" "simc.exe" >nul 2>&1
    echo [INFO] Binary ready at: .\simc.exe and simc-engine\simc.exe
)

echo.
echo [SUCCESS] Engine is ready. You can now launch the UI with start_ui.bat
echo.
goto end

:error_exit
echo.
echo [FAIL] Build failed! Check compiler messages above.
echo.

:end
if "%~1"=="" pause
