@echo off
rem Start a local web server for the game (requires Python 3).
cd /d "%~dp0"
echo HAMSIN 3D: open http://localhost:8000 in your browser (Ctrl+C to stop)
start "" http://localhost:8000
python -m http.server 8000
