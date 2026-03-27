@echo off
setlocal

cd /d "%~dp0"

echo Starting frontend on http://127.0.0.1:3000

call npm.cmd run dev -- --host 127.0.0.1 --port 3000
