@echo off
setlocal

cd /d "%~dp0\.."

set "PYTHON_EXE=E:\66\py312\python.exe"
set "HOST=127.0.0.1"
set "PORT=8000"
set "AI_PROVIDER=ollama"
set "OLLAMA_BASE_URL=http://127.0.0.1:11434"
set "OLLAMA_MODEL=qwen3.5-9b:latest"
set "AI_MAX_TOKENS=512"

echo Starting backend on http://%HOST%:%PORT%
echo AI provider: %AI_PROVIDER%
echo Ollama model: %OLLAMA_MODEL%

"%PYTHON_EXE%" -m uvicorn qwen.backend.app.main:app --host %HOST% --port %PORT%
