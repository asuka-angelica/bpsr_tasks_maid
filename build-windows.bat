@echo off
rem build-windows.bat — Windows 配布ビルド
rem 使い方: このフォルダで build-windows.bat を実行する
setlocal
cd /d %~dp0
if not exist node_modules (
  echo [build] npm install を実行します
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)
echo [build] electron-packager で Windows 向けに固めます
call npm run package:win
if errorlevel 1 goto :fail
echo [build] 完了: dist\BpsrTasksMaid-win32-x64\
exit /b 0
:fail
echo [build] 失敗しました
exit /b 1
