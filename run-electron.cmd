@echo off
cd /d "%~dp0"
if exist node_modules\electron (
  ren node_modules\electron electron_backup
)
node_modules\electron_backup\dist\electron.exe electron-main.cjs
if exist node_modules\electron_backup (
  ren node_modules\electron_backup electron
)
