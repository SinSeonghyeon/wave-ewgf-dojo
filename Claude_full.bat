@echo off
setlocal EnableExtensions

pushd "%~dp0"

set "CLAUDE_PATHS=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\Microsoft\WinGet\Links;%APPDATA%\npm;%LOCALAPPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs-portable;%ProgramFiles%\nodejs"
set "PATH=%CLAUDE_PATHS%;%PATH%"

echo [Claude] Step 1/6 - Checking Claude Code CLI...
where claude >nul 2>nul
if errorlevel 1 (
    echo [Claude] Claude Code CLI was not found.
    call :install_claude
    if errorlevel 1 goto :fail
) else (
    echo [Claude] Claude Code CLI found.
)

echo [Claude] Step 2/6 - Verifying Claude Code CLI...
set "PATH=%CLAUDE_PATHS%;%PATH%"
where claude >nul 2>nul
if errorlevel 1 (
    echo [Claude] Claude Code CLI is still unavailable after installation.
    goto :fail
)

echo [Claude] Step 3/6 - Full access mode selected.

echo [Claude] Step 4/6 - Syncing project instructions (CLAUDE.md ^<- AGENTS.md)...
call :ensure_claude_md

echo [Claude] Step 5/6 - Linking project skills (.claude\skills ^<- .agents\skills)...
call :ensure_skill_links

echo [Claude] Step 6/6 - Launching Claude Code...
claude --dangerously-skip-permissions %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXIT_CODE%

:ensure_claude_md
rem Claude Code auto-loads CLAUDE.md but not AGENTS.md.
rem Mirror AGENTS.md into CLAUDE.md so project instructions load on boot.
if not exist "AGENTS.md" (
    echo [Claude] AGENTS.md not found. Skipping CLAUDE.md sync.
    exit /b 0
)
if exist "CLAUDE.md" (
    echo [Claude] CLAUDE.md already present. Skipping sync.
    exit /b 0
)
mklink "CLAUDE.md" "AGENTS.md" >nul 2>nul
if not errorlevel 1 (
    echo [Claude] Linked CLAUDE.md -^> AGENTS.md ^(symbolic^).
    exit /b 0
)
echo [Claude] Symbolic link failed ^(needs Developer Mode or admin^). Trying hard link...
mklink /H "CLAUDE.md" "AGENTS.md" >nul 2>nul
if not errorlevel 1 (
    echo [Claude] Linked CLAUDE.md = AGENTS.md ^(hard link^).
    exit /b 0
)
echo [Claude] Hard link failed. Falling back to file copy...
copy /Y "AGENTS.md" "CLAUDE.md" >nul 2>nul
if not errorlevel 1 (
    echo [Claude] Copied AGENTS.md to CLAUDE.md.
    exit /b 0
)
echo [Claude] Could not create CLAUDE.md from AGENTS.md. Continuing anyway.
exit /b 0

:ensure_skill_links
rem Claude Code discovers skills only in .claude\skills, but this project keeps the
rem single source under .agents\skills. Link each skill folder into .claude\skills so
rem Claude can invoke them, without committing the links (see .gitignore).
if not exist ".agents\skills" exit /b 0
if not exist ".claude\skills" mkdir ".claude\skills"
for /d %%D in (".agents\skills\*") do call :link_skill "%%~fD" "%%~nxD"
exit /b 0

:link_skill
rem %1 = full source path, %2 = skill folder name
if exist ".claude\skills\%~2" (
    echo [Claude] Skill '%~2' already present. Skipping.
    exit /b 0
)
mklink /J ".claude\skills\%~2" "%~1" >nul 2>nul
if not errorlevel 1 (
    echo [Claude] Linked skill '%~2' -^> .agents\skills\%~2 ^(junction^).
    exit /b 0
)
echo [Claude] Junction failed for '%~2'. Falling back to copy...
xcopy "%~1" ".claude\skills\%~2\" /E /I /Y >nul 2>nul
if not errorlevel 1 (
    echo [Claude] Copied skill '%~2'.
    exit /b 0
)
echo [Claude] Could not provision skill '%~2'. Continuing anyway.
exit /b 0

:install_claude
echo [Claude] Installing with the official native installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://claude.ai/install.ps1 ^| iex"
if not errorlevel 1 (
    set "PATH=%CLAUDE_PATHS%;%PATH%"
    where claude >nul 2>nul
    if not errorlevel 1 (
        echo [Claude] Native installer completed.
        exit /b 0
    )
    if exist "%USERPROFILE%\.local\bin\claude.exe" (
        echo [Claude] Native installer completed.
        exit /b 0
    )
)

echo [Claude] Native installer did not make Claude available in this shell.
echo [Claude] Falling back to npm installation.
call :ensure_node
if errorlevel 1 exit /b 1

echo [Claude] Installing @anthropic-ai/claude-code with npm...
npm.cmd install -g @anthropic-ai/claude-code@latest --include=optional
if errorlevel 1 (
    echo [Claude] npm installation failed.
    exit /b 1
)

set "PATH=%CLAUDE_PATHS%;%PATH%"
where claude >nul 2>nul
if errorlevel 1 (
    echo [Claude] npm finished, but claude was not found on PATH.
    exit /b 1
)

echo [Claude] npm installation completed.
exit /b 0

:ensure_node
echo [Claude] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 goto :install_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto :install_node
echo [Claude] Node.js and npm found.
exit /b 0

:install_node
echo [Claude] Node.js/npm missing. Installing portable Node.js LTS locally...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $arch=if([Environment]::Is64BitOperatingSystem){'x64'}else{'x86'}; $token='win-' + $arch + '-zip'; $dest=Join-Path $env:LOCALAPPDATA 'Programs\nodejs-portable'; $tmp=Join-Path $env:TEMP ('node-lts-' + [guid]::NewGuid() + '.zip'); $stage=Join-Path $env:TEMP ('node-lts-' + [guid]::NewGuid()); $index=Invoke-RestMethod 'https://nodejs.org/dist/index.json'; $latest=$index | Where-Object { $_.lts -ne $false -and $_.files -contains $token } | Select-Object -First 1; if(-not $latest){ throw 'Could not resolve latest Node.js LTS zip.' }; $url='https://nodejs.org/dist/' + $latest.version + '/node-' + $latest.version + '-win-' + $arch + '.zip'; Write-Host ('Downloading ' + $url); Invoke-WebRequest -UseBasicParsing $url -OutFile $tmp; Expand-Archive -LiteralPath $tmp -DestinationPath $stage -Force; $root=Get-ChildItem -LiteralPath $stage -Directory | Select-Object -First 1; if(Test-Path -LiteralPath $dest){ Remove-Item -LiteralPath $dest -Recurse -Force }; New-Item -ItemType Directory -Force -Path $dest | Out-Null; Copy-Item -Path (Join-Path $root.FullName '*') -Destination $dest -Recurse -Force; Remove-Item -LiteralPath $tmp -Force; Remove-Item -LiteralPath $stage -Recurse -Force; Write-Host ('Installed portable Node.js to ' + $dest)"
if errorlevel 1 (
    echo [Claude] Portable Node.js installation failed.
    exit /b 1
)

set "PATH=%LOCALAPPDATA%\Programs\nodejs-portable;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
    echo [Claude] node.exe was not found after portable installation.
    exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [Claude] npm.cmd was not found after portable installation.
    exit /b 1
)
echo [Claude] Portable Node.js and npm are ready.
exit /b 0

:fail
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" set "EXIT_CODE=1"
echo [Claude] Setup failed. Exit code: %EXIT_CODE%
popd
endlocal & exit /b %EXIT_CODE%
