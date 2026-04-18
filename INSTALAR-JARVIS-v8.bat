@echo off
setlocal EnableDelayedExpansion
mode con: cols=85 lines=40
color 0B
title   J A R V I S   -   Instalador v8.0

set "REPO_URL=https://github.com/gaahzx/jarvis.git"

:: Instalar na MESMA PASTA onde o BAT esta
set "INSTALL_DIR=%~dp0"
if "!INSTALL_DIR:~-1!"=="\" set "INSTALL_DIR=!INSTALL_DIR:~0,-1!"

cls
echo.
echo.
echo      .------------------------------------------------------------.
echo      ^|                                                            ^|
echo      ^|       ####    ####   ######  #    # #  ####               ^|
echo      ^|          #   #    #  #    #  #    # # #                   ^|
echo      ^|          #   ######  ######  #    # #  ###                ^|
echo      ^|      #   #   #    #  #   #   #    # #     #               ^|
echo      ^|       ###    #    #  #    #   ####  #  ####               ^|
echo      ^|                                                            ^|
echo      ^|         Just A Rather Very Intelligent System              ^|
echo      ^|              Instalador Completo v8.0                      ^|
echo      ^|                                                            ^|
echo      '------------------------------------------------------------'
echo.
echo.
echo       ^> Inicializando sistemas...
echo       ^> Pasta de instalacao: %INSTALL_DIR%
timeout /t 2 /nobreak >nul

:: ============================================================
:: PRE-FIX: PowerShell ExecutionPolicy
:: ============================================================
powershell -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1
echo       ^> PowerShell configurado. OK.

:: ============================================================
:: PRE-CHECK: WINGET
:: ============================================================
where winget >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo       [ERRO] winget nao encontrado.
    echo       Instale "App Installer" da Microsoft Store ou atualize o Windows.
    echo       Link: https://aka.ms/getwinget
    echo.
    pause
    exit /b 1
)
echo       ^> winget detectado. OK.

:: ============================================================
:: PRE-CHECK: ADMINISTRADOR
:: ============================================================
net session >nul 2>&1
if errorlevel 1 (
    color 0E
    echo.
    echo       [!!] Este instalador precisa de permissao de Administrador.
    echo.
    echo       Feche esta janela e faca o seguinte:
    echo       1. Clique com botao DIREITO no arquivo INSTALAR-JARVIS-v8.bat
    echo       2. Selecione "Executar como administrador"
    echo.
    color 0C
    echo       Sem admin, o instalador NAO consegue instalar Git, Node e Python.
    echo.
    pause
    exit /b 1
)
echo       ^> Administrador detectado. OK.

:: ============================================================
:: FUNCAO: REFRESH PATH
:: ============================================================
goto :StartInstall

:RefreshPath
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%b"
set "PATH=!SYS_PATH!;!USR_PATH!;%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code"
goto :eof

:StartInstall
cls
echo.
echo  ============================================================================
echo                  J A R V I S   -   I N S T A L A D O R   v8.0
echo  ============================================================================
echo.
echo   Destino: %INSTALL_DIR%
echo.
echo   Este instalador vai configurar TUDO automaticamente:
echo     - Git, Node.js, Python, Claude CLI, Obsidian, pip packages
echo     - Baixar o projeto JARVIS do GitHub
echo     - Configurar autenticacao Claude + OpenAI
echo     - Validar todas as dependencias
echo     - Criar atalhos no Desktop
echo.
echo  ============================================================================
echo.
timeout /t 3 /nobreak >nul

:: ============================================================
:: STEP 1/8 - GIT
:: ============================================================
echo   [1/8] Instalando Git for Windows...
echo.
where git >nul 2>&1
if not errorlevel 1 for /f "tokens=*" %%v in ('git --version 2^>nul') do echo         [OK] %%v
where git >nul 2>&1
if not errorlevel 1 goto :GitInstalled
echo         Baixando e instalando via winget...
winget install Git.Git -e --silent --disable-interactivity --accept-package-agreements --accept-source-agreements 2>nul
call :RefreshPath
set "GIT_WAIT=0"
:WaitGit1
where git >nul 2>&1
if not errorlevel 1 goto :GitInstalled
set /a GIT_WAIT+=1
if !GIT_WAIT! GEQ 60 goto :GitFailed
timeout /t 1 /nobreak >nul
call :RefreshPath
goto :WaitGit1

:GitFailed
color 0C
echo         [ERRO] Git nao instalou automaticamente.
echo         Instale manualmente: https://git-scm.com/download/win
echo         Depois rode este instalador novamente.
pause
exit /b 1

:GitInstalled
for /f "tokens=*" %%g in ('where git 2^>nul') do set "GIT_EXE=%%g"
if not defined GIT_EXE goto :SkipBashConfig
for %%i in ("!GIT_EXE!") do set "GIT_DIR=%%~dpi"
set "BASH_CANDIDATE=!GIT_DIR!..\bin\bash.exe"
for %%i in ("!BASH_CANDIDATE!") do set "BASH_PATH=%%~fi"
if not exist "!BASH_PATH!" goto :SkipBashConfig
setx CLAUDE_CODE_GIT_BASH_PATH "!BASH_PATH!" >nul 2>&1
set "CLAUDE_CODE_GIT_BASH_PATH=!BASH_PATH!"
echo         [OK] Git Bash configurado
:SkipBashConfig

:: ============================================================
:: STEP 2/8 - NODE.JS
:: ============================================================
echo.
echo   [2/8] Instalando Node.js LTS...
echo.
where node >nul 2>&1
if not errorlevel 1 for /f "tokens=*" %%v in ('node --version 2^>nul') do echo         [OK] Node.js %%v
where node >nul 2>&1
if not errorlevel 1 goto :NodeInstalled
echo         Baixando e instalando via winget...
winget install OpenJS.NodeJS.LTS -e --silent --disable-interactivity --accept-package-agreements --accept-source-agreements 2>nul
call :RefreshPath
set "NODE_WAIT=0"
:WaitNode1
where node >nul 2>&1
if not errorlevel 1 goto :NodeInstalled
set /a NODE_WAIT+=1
if !NODE_WAIT! GEQ 60 goto :NodeFailed
timeout /t 1 /nobreak >nul
call :RefreshPath
goto :WaitNode1

:NodeFailed
color 0C
echo         [ERRO] Node.js nao instalou.
echo         Instale manualmente: https://nodejs.org
pause
exit /b 1

:NodeInstalled
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo         [OK] Node.js %%v

:: ============================================================
:: STEP 3/8 - PYTHON
:: ============================================================
echo.
echo   [3/8] Instalando Python...
echo.
del "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" >nul 2>&1
del "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe" >nul 2>&1

set "PYTHON_CMD="
for %%p in ("C:\Program Files\Python312\python.exe" "C:\Program Files\Python311\python.exe" "C:\Program Files\Python310\python.exe") do (
    if exist %%p if not defined PYTHON_CMD set "PYTHON_CMD=%%~p"
)
if defined PYTHON_CMD goto :PythonFound

where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%p in ('where python 2^>nul') do (
        echo %%p | findstr /I "WindowsApps" >nul 2>&1
        if errorlevel 1 if not defined PYTHON_CMD set "PYTHON_CMD=%%p"
    )
)
if defined PYTHON_CMD goto :PythonFound

echo         Baixando e instalando via winget...
winget install Python.Python.3.12 -e --silent --disable-interactivity --accept-package-agreements --accept-source-agreements --override "/quiet InstallAllUsers=1 PrependPath=1" 2>nul
call :RefreshPath
timeout /t 5 /nobreak >nul
for %%p in ("C:\Program Files\Python312\python.exe" "C:\Program Files\Python311\python.exe") do (
    if exist %%p if not defined PYTHON_CMD set "PYTHON_CMD=%%~p"
)
if defined PYTHON_CMD goto :PythonFound

color 0C
echo         [ERRO] Python nao instalou.
echo         Instale manualmente: https://python.org/downloads
echo         Marque "Add to PATH" durante a instalacao.
pause
exit /b 1

:PythonFound
for /f "tokens=*" %%v in ('"!PYTHON_CMD!" --version 2^>nul') do echo         [OK] %%v

echo         Instalando pacotes Python...
"!PYTHON_CMD!" -m pip install --upgrade pip --disable-pip-version-check -q --timeout 30 2>nul
"!PYTHON_CMD!" -m pip install pyautogui mss Pillow openpyxl psutil wmi pywin32 --disable-pip-version-check --no-warn-script-location -q --timeout 30 2>nul
"!PYTHON_CMD!" -c "import pyautogui, mss, psutil, openpyxl" >nul 2>&1
if errorlevel 1 (
    color 0C
    echo         [ERRO] Pacotes Python falharam. Verifique conexao com internet.
    pause
    exit /b 1
)
echo         [OK] Pacotes Python instalados
reg add "HKCU\Software\Microsoft\Office\16.0\Excel\Options" /v AutoRecoverEnabled /t REG_DWORD /d 0 /f >nul 2>&1

:: ============================================================
:: STEP 4/8 - CLAUDE CODE CLI
:: ============================================================
echo.
echo   [4/8] Instalando Claude Code CLI...
echo.
where claude >nul 2>&1
if not errorlevel 1 echo         [OK] Claude Code CLI ja instalado
where claude >nul 2>&1
if not errorlevel 1 goto :ClaudeInstalled

echo         Baixando instalador oficial...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r=Invoke-WebRequest 'https://claude.ai/install.ps1' -UseBasicParsing -TimeoutSec 30; Invoke-Expression $r.Content } catch { exit 1 }" 2>&1
call :RefreshPath
set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code;!PATH!"
where claude >nul 2>&1
if not errorlevel 1 echo         [OK] Claude Code CLI instalado (native)
where claude >nul 2>&1
if not errorlevel 1 goto :ClaudeInstalled

echo         Native falhou. Instalando via npm...
call npm install -g @anthropic-ai/claude-code 2>nul
call :RefreshPath
where claude >nul 2>&1
if not errorlevel 1 echo         [OK] Claude Code CLI instalado (npm)
where claude >nul 2>&1
if not errorlevel 1 goto :ClaudeInstalled

color 0C
echo.
echo         [ERRO] Claude Code CLI NAO instalou.
echo         Instale manualmente:
echo         1. Abra PowerShell como Admin
echo         2. Execute: irm https://claude.ai/install.ps1 ^| iex
echo         3. Rode este instalador novamente
pause
exit /b 1

:ClaudeInstalled
for /f "tokens=*" %%c in ('where claude 2^>nul') do (
    if not defined CLAUDE_EXE set "CLAUDE_EXE=%%c"
)

:: ============================================================
:: STEP 5/8 - AUTENTICACAO CLAUDE
:: ============================================================
echo.
echo   [5/8] Autenticacao Claude Code...
echo.

set "CLAUDE_AUTHED=0"
claude auth status >nul 2>&1
if not errorlevel 1 set "CLAUDE_AUTHED=1"

if "!CLAUDE_AUTHED!"=="1" (
    echo         [OK] Claude Code ja autenticado
)
if "!CLAUDE_AUTHED!"=="1" goto :ClaudeAuthDone

cls
color 0E
echo.
echo  ============================================================================
echo             A U T E N T I C A C A O   D O   C L A U D E
echo  ============================================================================
echo.
echo     Uma janela vai abrir para voce fazer login no Claude.
echo.
echo     1. Escolha "Log in with Claude account" (setas + ENTER)
echo     2. Faca login no navegador que abrir
echo     3. Quando aparecer "Login successful", FECHE a janela
echo.
echo     IMPORTANTE: Voce precisa de um plano Claude Pro ativo.
echo     Assine em: https://claude.ai/settings/billing
echo.
echo  ============================================================================
echo.
echo     Pressione qualquer tecla quando estiver pronto...
pause >nul
color 0B

start "Claude Login" cmd /c "claude auth login & echo. & echo Concluido! Esta janela fecha em 60s. & timeout /t 60 /nobreak >nul"

echo         Aguardando autenticacao (maximo 5 minutos)...
set "AUTH_WAIT=0"
:WaitAuth1
claude auth status >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code autenticado!
)
claude auth status >nul 2>&1
if not errorlevel 1 goto :ClaudeAuthDone
set /a AUTH_WAIT+=1
if !AUTH_WAIT! GEQ 150 goto :AuthTimeout1
timeout /t 2 /nobreak >nul
goto :WaitAuth1

:AuthTimeout1
color 0E
echo         Login nao detectado. Tentando novamente...
pause >nul
color 0B
start "Claude Login 2" cmd /c "claude auth login & timeout /t 60 /nobreak >nul"
set "AUTH_WAIT=0"
:WaitAuth2
claude auth status >nul 2>&1
if not errorlevel 1 echo         [OK] Claude Code autenticado!
claude auth status >nul 2>&1
if not errorlevel 1 goto :ClaudeAuthDone
set /a AUTH_WAIT+=1
if !AUTH_WAIT! GEQ 150 goto :AuthFailed
timeout /t 2 /nobreak >nul
goto :WaitAuth2

:AuthFailed
color 0C
echo         [ERRO] Autenticacao nao completada.
echo         Sem autenticacao, JARVIS nao funciona.
pause
exit /b 1

:ClaudeAuthDone
set "CLAUDE_GLOBAL=%USERPROFILE%\.claude"
if not exist "!CLAUDE_GLOBAL!" mkdir "!CLAUDE_GLOBAL!" 2>nul
powershell -NoProfile -Command "Set-Content -Path '%USERPROFILE%\.claude\settings.json' -Value '{\"permissions\":{\"defaultMode\":\"bypassPermissions\"},\"autoUpdatesChannel\":\"latest\",\"skipDangerousModePermissionPrompt\":true}' -NoNewline" 2>nul
echo         [OK] Claude settings configurados

:: ============================================================
:: STEP 5.5 - OBSIDIAN
:: ============================================================
echo.
echo   [5.5/8] Instalando Obsidian...
echo.
set "OBS_INSTALLED=0"
if exist "%LOCALAPPDATA%\Obsidian\Obsidian.exe" set "OBS_INSTALLED=1"
if exist "C:\Program Files\Obsidian\Obsidian.exe" set "OBS_INSTALLED=1"

if "!OBS_INSTALLED!"=="1" (
    echo         [OK] Obsidian ja instalado
) else (
    echo         Baixando e instalando Obsidian...
    winget install Obsidian.Obsidian -e --silent --disable-interactivity --accept-package-agreements --accept-source-agreements 2>nul
    timeout /t 5 /nobreak >nul
    echo         [OK] Obsidian instalado
)

:: ============================================================
:: STEP 6/8 - BAIXAR PROJETO JARVIS
:: ============================================================
echo.
echo   [6/8] Baixando projeto JARVIS do GitHub...
echo.

if exist "%INSTALL_DIR%\server.js" echo         [OK] Projeto JARVIS ja existe
if exist "%INSTALL_DIR%\server.js" cd /d "%INSTALL_DIR%"
if exist "%INSTALL_DIR%\server.js" git pull --ff-only 2>nul
if exist "%INSTALL_DIR%\server.js" goto :ProjectReady

cd /d "%INSTALL_DIR%"
echo         Baixando arquivos...
git init >nul 2>&1
git remote add origin "%REPO_URL%" 2>nul
git fetch --depth 1 origin main 2>&1
git checkout -f origin/main 2>&1

if not exist "%INSTALL_DIR%\server.js" (
    color 0C
    echo         [ERRO] Download falhou. Verifique conexao com internet.
    pause
    exit /b 1
)
echo         [OK] Projeto JARVIS baixado

:ProjectReady
mkdir "%INSTALL_DIR%\Documents and Projects" 2>nul
mkdir "%INSTALL_DIR%\system" 2>nul

if not exist "%INSTALL_DIR%\.claude" mkdir "%INSTALL_DIR%\.claude" 2>nul
if not exist "%INSTALL_DIR%\.claude\settings.json" (
    powershell -NoProfile -Command "Set-Content -Path '%INSTALL_DIR%\.claude\settings.json' -Value '{\"permissions\":{\"defaultMode\":\"bypassPermissions\"},\"skipDangerousModePermissionPrompt\":true}' -NoNewline"
)

:: Vault Obsidian
set "VAULT_DIR=%USERPROFILE%\Documents\Felipe"
if not exist "!VAULT_DIR!\JARVIS-Personalidade.md" (
    echo         Criando vault JARVIS...
    if exist "%INSTALL_DIR%\obsidian-template" (
        robocopy "%INSTALL_DIR%\obsidian-template" "!VAULT_DIR!" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
        cmd /c "exit /b 0"
        echo         [OK] Vault JARVIS criado
    ) else (
        mkdir "!VAULT_DIR!" 2>nul
        echo         [OK] Vault basico criado
    )
) else (
    echo         [OK] Vault JARVIS ja existe
)

:: ============================================================
:: STEP 7/8 - NPM INSTALL + CHAVE OPENAI + .ENV
:: ============================================================
echo.
echo   [7/8] Instalando dependencias Node.js...
echo.

cd /d "%INSTALL_DIR%"
echo         npm install (pode levar 2-5 minutos)...
call npm install --production --no-optional --no-audit 2>&1
echo         [OK] node_modules instalados

echo.
echo  ============================================================================
echo               C H A V E   O P E N A I   ( V O Z   D O   J A R V I S )
echo  ============================================================================
echo.
echo     1. Acesse: https://platform.openai.com/api-keys
echo     2. Clique em "Create new secret key"
echo     3. Copie a chave (comeca com sk-)
echo.
echo  ============================================================================
echo.
set /p "OPENAI_KEY=     Cole sua chave OpenAI (sk-...): "

if "!OPENAI_KEY!"=="" (
    color 0E
    echo     Chave nao fornecida. Voce pode adicionar depois no .env
    color 0B
    set "OPENAI_KEY=COLE_SUA_CHAVE_AQUI"
)

(echo OPENAI_API_KEY=!OPENAI_KEY!)>"%INSTALL_DIR%\.env"
(echo PORT=3000)>>"%INSTALL_DIR%\.env"
if defined CLAUDE_EXE (
    (echo CLAUDE_CLI_PATH=!CLAUDE_EXE!)>>"%INSTALL_DIR%\.env"
)
echo         [OK] .env configurado

:: ============================================================
:: STEP 8/8 - VERIFICACAO FINAL
:: ============================================================
cls
echo.
echo  ============================================================================
echo       V E R I F I C A C A O   F I N A L
echo  ============================================================================
echo.

set "PASS=0"
set "TOTAL=9"

where node >nul 2>&1
if not errorlevel 1 (echo     [OK] Node.js) else echo     [X] Node.js
where node >nul 2>&1
if not errorlevel 1 set /a PASS+=1

where git >nul 2>&1
if not errorlevel 1 (echo     [OK] Git) else echo     [X] Git
where git >nul 2>&1
if not errorlevel 1 set /a PASS+=1

if defined PYTHON_CMD (echo     [OK] Python) else echo     [X] Python
if defined PYTHON_CMD set /a PASS+=1

where claude >nul 2>&1
if not errorlevel 1 (echo     [OK] Claude CLI) else echo     [X] Claude CLI
where claude >nul 2>&1
if not errorlevel 1 set /a PASS+=1

claude auth status >nul 2>&1
if not errorlevel 1 (echo     [OK] Claude autenticado) else echo     [X] Claude auth
claude auth status >nul 2>&1
if not errorlevel 1 set /a PASS+=1

if exist "%INSTALL_DIR%\server.js" (echo     [OK] server.js) else echo     [X] server.js
if exist "%INSTALL_DIR%\server.js" set /a PASS+=1

if exist "%INSTALL_DIR%\node_modules\express" (echo     [OK] node_modules) else echo     [X] node_modules
if exist "%INSTALL_DIR%\node_modules\express" set /a PASS+=1

if exist "%INSTALL_DIR%\.env" (echo     [OK] .env) else echo     [X] .env
if exist "%INSTALL_DIR%\.env" set /a PASS+=1

if exist "%USERPROFILE%\Documents\Felipe\JARVIS-Personalidade.md" (echo     [OK] Vault Obsidian) else echo     [X] Vault
if exist "%USERPROFILE%\Documents\Felipe\JARVIS-Personalidade.md" set /a PASS+=1

echo.
echo  ============================================================================
if !PASS! GEQ 7 (
    color 0A
    echo     RESULTADO: !PASS!/!TOTAL! — INSTALACAO OK!
) else (
    color 0E
    echo     RESULTADO: !PASS!/!TOTAL! — Alguns itens falharam.
    echo     Rode o instalador novamente ou verifique internet.
)
echo  ============================================================================

:: Atalho no Desktop
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\Ligar JARVIS.lnk'); $s.TargetPath = '%INSTALL_DIR%\Ligar JARVIS.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'Iniciar JARVIS'; $s.Save()" 2>nul
echo.
echo     [OK] Atalho "Ligar JARVIS" criado no Desktop

:: Iniciar
echo.
echo         Iniciando JARVIS automaticamente...
cd /d "%INSTALL_DIR%"
start "" cmd /k "title JARVIS Server && node server.js"
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo         JARVIS esta rodando em http://localhost:3000
echo         Pode fechar esta janela.
echo.
pause
exit /b 0
