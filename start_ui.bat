@echo off
cd /d "%~dp0"

title FellowSimc Simulator and Character Importer
echo ===================================================
echo   Starting FellowSimc Web UI and Character Importer
echo ===================================================
echo.

set PY_CMD=python
python --version >nul 2>&1
if errorlevel 1 goto check_py
goto check_reqs

:check_py
py --version >nul 2>&1
if errorlevel 1 goto no_python
set PY_CMD=py
goto check_reqs

:check_reqs
%PY_CMD% -c "import requests" >nul 2>&1
if errorlevel 1 goto install_reqs
goto start_server

:install_reqs
echo [INFO] Installing required Python library: requests
%PY_CMD% -m pip install requests
echo.
goto start_server

:start_server
echo [INFO] Starting FellowSimc local server...
echo [INFO] Opening http://localhost:5000 in your browser...
echo.
%PY_CMD% ui\server.py
goto end

:no_python
echo.
echo [ERROR] Python 3 was not found on your system!
echo Please install Python 3.8+ from https://www.python.org/downloads/
echo IMPORTANT: Make sure to check the box "Add Python to PATH" during install.
echo.
goto end

:end
echo.
echo ===================================================
echo   FellowSimc has stopped.
echo ===================================================
pause
