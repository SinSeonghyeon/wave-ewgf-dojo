@echo off
setlocal EnableExtensions

pushd "%~dp0"

set "CODEX_PATHS=%LOCALAPPDATA%\Programs\OpenAI\Codex\bin;%USERPROFILE%\.codex\bin;%APPDATA%\npm;%LOCALAPPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs-portable;%ProgramFiles%\nodejs"
set "PATH=%CODEX_PATHS%;%PATH%"

echo [Codex] Step 1/4 - Checking Codex CLI...
where codex >nul 2>nul
if errorlevel 1 (
    echo [Codex] Codex CLI was not found.
    call :install_codex
    if errorlevel 1 goto :fail
) else (
    echo [Codex] Codex CLI found.
)

echo [Codex] Step 2/4 - Verifying Codex CLI...
where codex >nul 2>nul
if errorlevel 1 (
    echo [Codex] Codex CLI is still unavailable after installation.
    goto :fail
)

echo [Codex] Step 3/4 - Full access mode selected.
echo [Codex] Step 4/4 - Launching Codex...
codex --dangerously-bypass-approvals-and-sandbox %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXIT_CODE%

:install_codex
echo [Codex] Installing with the official standalone installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://chatgpt.com/codex/install.ps1 ^| iex"
if not errorlevel 1 (
    set "PATH=%CODEX_PATHS%;%PATH%"
    where codex >nul 2>nul
    if not errorlevel 1 (
        echo [Codex] Standalone installer completed.
        exit /b 0
    )
)

echo [Codex] Standalone installer did not make Codex available in this shell.
echo [Codex] Falling back to npm installation.
call :ensure_node
if errorlevel 1 exit /b 1

echo [Codex] Installing @openai/codex with npm...
npm.cmd install -g @openai/codex@latest --include=optional
if errorlevel 1 (
    echo [Codex] npm installation failed.
    exit /b 1
)

set "PATH=%CODEX_PATHS%;%PATH%"
where codex >nul 2>nul
if errorlevel 1 (
    echo [Codex] npm finished, but codex was not found on PATH.
    exit /b 1
)

echo [Codex] npm installation completed.
exit /b 0

:ensure_node
echo [Codex] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 goto :install_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto :install_node
echo [Codex] Node.js and npm found.
exit /b 0

:install_node
echo [Codex] Node.js/npm missing. Installing portable Node.js LTS locally...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $arch=if([Environment]::Is64BitOperatingSystem){'x64'}else{'x86'}; $token='win-' + $arch + '-zip'; $dest=Join-Path $env:LOCALAPPDATA 'Programs\nodejs-portable'; $tmp=Join-Path $env:TEMP ('node-lts-' + [guid]::NewGuid() + '.zip'); $stage=Join-Path $env:TEMP ('node-lts-' + [guid]::NewGuid()); $index=Invoke-RestMethod 'https://nodejs.org/dist/index.json'; $latest=$index | Where-Object { $_.lts -ne $false -and $_.files -contains $token } | Select-Object -First 1; if(-not $latest){ throw 'Could not resolve latest Node.js LTS zip.' }; $url='https://nodejs.org/dist/' + $latest.version + '/node-' + $latest.version + '-win-' + $arch + '.zip'; Write-Host ('Downloading ' + $url); Invoke-WebRequest -UseBasicParsing $url -OutFile $tmp; Expand-Archive -LiteralPath $tmp -DestinationPath $stage -Force; $root=Get-ChildItem -LiteralPath $stage -Directory | Select-Object -First 1; if(Test-Path -LiteralPath $dest){ Remove-Item -LiteralPath $dest -Recurse -Force }; New-Item -ItemType Directory -Force -Path $dest | Out-Null; Copy-Item -Path (Join-Path $root.FullName '*') -Destination $dest -Recurse -Force; Remove-Item -LiteralPath $tmp -Force; Remove-Item -LiteralPath $stage -Recurse -Force; Write-Host ('Installed portable Node.js to ' + $dest)"
if errorlevel 1 (
    echo [Codex] Portable Node.js installation failed.
    exit /b 1
)

set "PATH=%LOCALAPPDATA%\Programs\nodejs-portable;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
    echo [Codex] node.exe was not found after portable installation.
    exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [Codex] npm.cmd was not found after portable installation.
    exit /b 1
)
echo [Codex] Portable Node.js and npm are ready.
exit /b 0

:fail
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" set "EXIT_CODE=1"
echo [Codex] Setup failed. Exit code: %EXIT_CODE%
popd
endlocal & exit /b %EXIT_CODE%
