@echo off
set VERTEX_PROXY_PORT=8765
set VERTEX_PROXY_PROJECT=project-aa5fb956-b08a-4e13-869
set VERTEX_PROXY_LOCATION=us-central1
set VERTEX_PROXY_MODEL=gemini-2.5-flash

cd /d "%~dp0"
start /b /min "VertexAIProxy" "%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\python.exe" server.py

