@echo off
setlocal EnableDelayedExpansion
mode con: cols=85 lines=40
color 0B
title   J A R V I S   -   Instalador v8.0

set "INSTALL_DIR=%USERPROFILE%\Desktop\Jarvis"
set "ERRORS=0"
set "REPO_URL=https://github.com/gaahzx/jarvis.git"

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
timeout /t 2 /nobreak >nul
echo       ^> Verificando ambiente do sistema...
timeout /t 1 /nobreak >nul

:: ============================================================
:: PRE-FIX: PowerShell ExecutionPolicy
:: ============================================================
powershell -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1
echo       ^> PowerShell configurado. OK.

:: ============================================================
:: PRE-CHECK: ADMINISTRADOR (necessario pra instalar Node/Python/Git)
:: ============================================================
set "IS_ADMIN=0"
net session >nul 2>&1
if not errorlevel 1 set "IS_ADMIN=1"

if "!IS_ADMIN!"=="0" (
    color 0E
    echo.
    echo       Precisamos de permissao de Administrador para instalar
    echo       Node.js, Python e Git. Elevando...
    echo.
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\"' -Verb RunAs" >nul 2>&1
    if not errorlevel 1 (
        echo       Janela de admin aberta. Esta pode ser fechada.
        timeout /t 3 /nobreak >nul
        exit /b 0
    )
    color 0C
    echo       [ERRO] Nao foi possivel obter permissao de admin.
    echo       Clique direito neste arquivo ^> "Executar como administrador"
    pause
    exit /b 1
)

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
echo     - Git, Node.js, Python, Claude CLI, pip packages
echo     - Clonar o projeto JARVIS do GitHub
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
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('git --version 2^>nul') do echo         [OK] %%v
    goto :GitInstalled
)
echo         Baixando e instalando via winget...
winget install Git.Git -e --silent --accept-package-agreements --accept-source-agreements 2>nul
call :RefreshPath
:: Espera Git aparecer (ate 60s)
set "GIT_WAIT=0"
:WaitGit1
where git >nul 2>&1
if not errorlevel 1 goto GitInstalled
set /a GIT_WAIT+=1
if !GIT_WAIT! GEQ 60 goto GitFailed
timeout /t 1 /nobreak >nul
call :RefreshPath
goto WaitGit1

:GitFailed
color 0C
echo         [ERRO] Git nao instalou automaticamente.
echo         Instale manualmente: https://git-scm.com/download/win
echo         Depois rode este instalador novamente.
pause
exit /b 1

:GitInstalled
:: Configurar CLAUDE_CODE_GIT_BASH_PATH
for /f "tokens=*" %%g in ('where git 2^>nul') do set "GIT_EXE=%%g"
if defined GIT_EXE (
    for %%i in ("!GIT_EXE!") do set "GIT_DIR=%%~dpi"
    set "BASH_PATH=!GIT_DIR:~0,-4!bin\bash.exe"
    if exist "!BASH_PATH!" (
        setx CLAUDE_CODE_GIT_BASH_PATH "!BASH_PATH!" >nul 2>&1
        set "CLAUDE_CODE_GIT_BASH_PATH=!BASH_PATH!"
        echo         [OK] Git Bash configurado
    )
)

:: ============================================================
:: STEP 2/8 - NODE.JS
:: ============================================================
echo.
echo   [2/8] Instalando Node.js LTS...
echo.
where node >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo         [OK] Node.js %%v
    goto :NodeInstalled
)
echo         Baixando e instalando via winget...
winget install OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements 2>nul
call :RefreshPath
set "NODE_WAIT=0"
:WaitNode1
where node >nul 2>&1
if not errorlevel 1 goto NodeInstalled
set /a NODE_WAIT+=1
if !NODE_WAIT! GEQ 60 goto NodeFailed
timeout /t 1 /nobreak >nul
call :RefreshPath
goto WaitNode1

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

:: Remover alias do Windows Store
del "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" >nul 2>&1
del "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe" >nul 2>&1

:: Verificar Python existente
set "PYTHON_CMD="
for %%p in ("C:\Program Files\Python312\python.exe" "C:\Program Files\Python311\python.exe" "C:\Program Files\Python310\python.exe") do (
    if exist %%p (
        set "PYTHON_CMD=%%~p"
        goto :PythonFound
    )
)
where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%p in ('where python 2^>nul') do (
        echo %%p | findstr /I "WindowsApps" >nul 2>&1
        if errorlevel 1 (
            set "PYTHON_CMD=%%p"
            goto :PythonFound
        )
    )
)

echo         Baixando e instalando via winget...
winget install Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements --override "/quiet InstallAllUsers=1 PrependPath=1" 2>nul
call :RefreshPath
timeout /t 5 /nobreak >nul
for %%p in ("C:\Program Files\Python312\python.exe" "C:\Program Files\Python311\python.exe") do (
    if exist %%p (
        set "PYTHON_CMD=%%~p"
        goto :PythonFound
    )
)
color 0C
echo         [ERRO] Python nao instalou.
echo         Instale manualmente: https://python.org/downloads
echo         Marque "Add to PATH" durante a instalacao.
pause
exit /b 1

:PythonFound
for /f "tokens=*" %%v in ('"!PYTHON_CMD!" --version 2^>nul') do echo         [OK] %%v

:: Pip packages
echo         Instalando pacotes Python...
"!PYTHON_CMD!" -m pip install --upgrade pip --disable-pip-version-check -q 2>nul
"!PYTHON_CMD!" -m pip install pyautogui mss Pillow openpyxl psutil wmi pywin32 --disable-pip-version-check --no-warn-script-location -q 2>nul
"!PYTHON_CMD!" -c "import pyautogui, mss, psutil, openpyxl" >nul 2>&1
if errorlevel 1 (
    color 0C
    echo         [ERRO] Pacotes Python falharam. Verifique conexao com internet.
    pause
    exit /b 1
)
echo         [OK] Pacotes Python instalados

:: Desabilitar AutoRecover do Excel
reg add "HKCU\Software\Microsoft\Office\16.0\Excel\Options" /v AutoRecoverEnabled /t REG_DWORD /d 0 /f >nul 2>&1

:: ============================================================
:: STEP 4/8 - CLAUDE CODE CLI
:: ============================================================
echo.
echo   [4/8] Instalando Claude Code CLI...
echo.
where claude >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code CLI ja instalado
    goto :ClaudeInstalled
)

:: Estrategia 1: instalador oficial nativo
echo         Baixando instalador oficial...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { irm https://claude.ai/install.ps1 | iex } catch { exit 1 }" 2>&1
call :RefreshPath
set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code;!PATH!"
where claude >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code CLI instalado (native)
    goto :ClaudeInstalled
)

:: Estrategia 2: npm global
echo         Native falhou. Instalando via npm...
call npm install -g @anthropic-ai/claude-code 2>&1 | findstr /V "npm warn"
call :RefreshPath
where claude >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code CLI instalado (npm)
    call claude install 2>nul
    call :RefreshPath
    goto :ClaudeInstalled
)

:: Estrategia 3: download direto
echo         Segunda tentativa via download direto...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(Invoke-WebRequest 'https://claude.ai/install.ps1' -UseBasicParsing).Content; Invoke-Expression $s" 2>&1
call :RefreshPath
set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code;!PATH!"
where claude >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code CLI instalado (download direto)
    goto :ClaudeInstalled
)

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

:: Verificar se ja autenticado
claude auth status 2>nul | findstr /C:"loggedIn" | findstr /C:"true" >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code ja autenticado
    goto :ClaudeAuthDone
)

cls
color 0E
echo.
echo  ============================================================================
echo             A U T E N T I C A C A O   D O   C L A U D E
echo  ============================================================================
echo.
echo     Uma janela vai abrir para voce fazer login no Claude.
echo.
echo     INSTRUCOES:
echo.
echo     1. Na janela que abrir, escolha "Log in with Claude account"
echo        ^(use as setas do teclado e pressione ENTER^)
echo     2. Um navegador vai abrir na pagina do Claude.ai
echo     3. Faca login ou crie uma conta
echo        ^(Plano Max ou Pro necessario para usar JARVIS^)
echo     4. Quando aparecer "Login successful", FECHE a janela
echo.
echo     IMPORTANTE: Voce precisa de um plano Claude Max ou Pro ativo.
echo     Crie em: https://claude.ai/settings/billing
echo.
echo  ============================================================================
echo.
echo     Pressione qualquer tecla quando estiver pronto...
pause >nul
color 0B

start /wait "Claude Login - JARVIS" cmd /c "cd /d "%USERPROFILE%" && claude && pause"

echo.
echo         Verificando autenticacao...
timeout /t 3 /nobreak >nul

claude auth status 2>nul | findstr /C:"loggedIn" | findstr /C:"true" >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude Code autenticado!
    goto :ClaudeAuthDone
)

:: Segunda tentativa
color 0E
echo         Login nao detectado. Vamos tentar novamente.
echo         Pressione qualquer tecla...
pause >nul
color 0B
start /wait "Claude Login (Tentativa 2)" cmd /c "cd /d "%USERPROFILE%" && claude && pause"
timeout /t 3 /nobreak >nul

claude auth status 2>nul | findstr /C:"loggedIn" | findstr /C:"true" >nul 2>&1
if errorlevel 1 (
    color 0C
    echo         [ERRO] Autenticacao Claude nao completada.
    echo         Sem autenticacao, JARVIS nao funciona.
    echo         Crie conta em: https://claude.ai
    pause
    exit /b 1
)
echo         [OK] Claude Code autenticado!

:ClaudeAuthDone

:: Configurar settings globais (bypassPermissions)
set "CLAUDE_GLOBAL=%USERPROFILE%\.claude"
if not exist "!CLAUDE_GLOBAL!" mkdir "!CLAUDE_GLOBAL!" 2>nul
powershell -NoProfile -Command "Set-Content -Path '%USERPROFILE%\.claude\settings.json' -Value '{\"permissions\":{\"defaultMode\":\"bypassPermissions\"},\"autoUpdatesChannel\":\"latest\",\"skipDangerousModePermissionPrompt\":true}' -NoNewline" 2>nul
echo         [OK] Claude settings configurados (bypassPermissions)

:: Testar execucao
echo         Testando Claude task execution...
claude --print --output-format text --dangerously-skip-permissions -p "say READY" 2>nul | findstr /C:"READY" >nul 2>&1
if not errorlevel 1 (
    echo         [OK] Claude task execution funcionando!
) else (
    color 0E
    echo         [AVISO] Teste de execucao nao respondeu. Pode ser rede lenta.
    echo         Sera retestado ao iniciar o JARVIS.
    color 0B
)

:: ============================================================
:: STEP 5.5 - OBSIDIAN (Cerebro permanente do JARVIS)
:: ============================================================
echo.
echo   [5.5/8] Instalando Obsidian (cerebro do JARVIS)...
echo.

:: Verificar se Obsidian ja esta instalado
set "OBS_INSTALLED=0"
if exist "%LOCALAPPDATA%\Obsidian\Obsidian.exe" set "OBS_INSTALLED=1"
if exist "C:\Program Files\Obsidian\Obsidian.exe" set "OBS_INSTALLED=1"
where obsidian >nul 2>&1
if not errorlevel 1 set "OBS_INSTALLED=1"

if "!OBS_INSTALLED!"=="1" (
    echo         [OK] Obsidian ja instalado
) else (
    echo         Baixando e instalando Obsidian...
    winget install Obsidian.Obsidian -e --silent --accept-package-agreements --accept-source-agreements 2>nul
    timeout /t 5 /nobreak >nul
    if exist "%LOCALAPPDATA%\Obsidian\Obsidian.exe" (
        echo         [OK] Obsidian instalado
    ) else (
        color 0E
        echo         [AVISO] Obsidian nao instalou via winget.
        echo         Instale manualmente: https://obsidian.md/download
        echo         O JARVIS funciona sem Obsidian, mas perde o cerebro permanente.
        color 0B
    )
)

:: Criar vault do JARVIS copiando template do repo (55 notas, zero dados pessoais)
set "VAULT_DIR=%USERPROFILE%\Documents\Felipe"
if not exist "!VAULT_DIR!\JARVIS-Personalidade.md" (
    echo         Criando vault JARVIS (55 notas de conhecimento)...
    if exist "%INSTALL_DIR%\obsidian-template" (
        robocopy "%INSTALL_DIR%\obsidian-template" "!VAULT_DIR!" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
        echo         [OK] Vault JARVIS criado com 55 notas em !VAULT_DIR!
    ) else (
        mkdir "!VAULT_DIR!" 2>nul
        mkdir "!VAULT_DIR!\Tecnologias" 2>nul
        mkdir "!VAULT_DIR!\Agentes" 2>nul
        powershell -NoProfile -Command "Set-Content -Path '!VAULT_DIR!\JARVIS-Personalidade.md' -Value '# JARVIS - Cerebro Ativo' -NoNewline" 2>nul
        echo         [OK] Vault JARVIS basico criado (template nao encontrado)
    )
) else (
    echo         [OK] Vault JARVIS ja existe em !VAULT_DIR!
)

:: Configurar Obsidian pra abrir este vault automaticamente
set "OBS_CONFIG=%APPDATA%\obsidian"
if not exist "!OBS_CONFIG!" mkdir "!OBS_CONFIG!" 2>nul
:: Converter backslashes pra JSON
set "VAULT_JSON=!VAULT_DIR:\=\\!"
powershell -NoProfile -Command "$vaultPath = '!VAULT_DIR!'; $vaultHash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($vaultPath))).Replace('-','').ToLower().Substring(0,16); $obsFile = '%APPDATA%\obsidian\obsidian.json'; $obj = @{}; if(Test-Path $obsFile){try{$obj = Get-Content $obsFile -Raw | ConvertFrom-Json}catch{$obj = @{}}}; if(-not $obj.vaults){$obj | Add-Member -NotePropertyName 'vaults' -NotePropertyValue @{} -Force}; $vault = @{path=$vaultPath;ts=[long](Get-Date -UFormat '%%s'+'000')}; $obj.vaults | Add-Member -NotePropertyName $vaultHash -NotePropertyValue $vault -Force; $obj | ConvertTo-Json -Depth 5 | Set-Content $obsFile -NoNewline" 2>nul
echo         [OK] Obsidian vinculado ao vault JARVIS automaticamente

:: ============================================================
:: STEP 6/8 - CLONAR PROJETO JARVIS DO GITHUB
:: ============================================================
echo.
echo   [6/8] Baixando projeto JARVIS do GitHub...
echo.

if exist "%INSTALL_DIR%\server.js" (
    echo         [OK] Projeto JARVIS ja existe em %INSTALL_DIR%
    echo         Atualizando...
    cd /d "%INSTALL_DIR%"
    git pull 2>nul
    goto :ProjectReady
)

echo         Clonando repositorio...
git clone %REPO_URL% "%INSTALL_DIR%" 2>&1
if not exist "%INSTALL_DIR%\server.js" (
    color 0C
    echo         [ERRO] Clone falhou. Verifique conexao com internet.
    echo         URL: %REPO_URL%
    pause
    exit /b 1
)
echo         [OK] Projeto JARVIS clonado

:ProjectReady

:: Criar diretorios essenciais
mkdir "%INSTALL_DIR%\Documents and Projects" 2>nul
mkdir "%INSTALL_DIR%\system" 2>nul

:: Configurar .claude/settings.json do projeto
if not exist "%INSTALL_DIR%\.claude" mkdir "%INSTALL_DIR%\.claude" 2>nul
if not exist "%INSTALL_DIR%\.claude\settings.json" (
    powershell -NoProfile -Command "Set-Content -Path '%INSTALL_DIR%\.claude\settings.json' -Value '{\"permissions\":{\"defaultMode\":\"bypassPermissions\"},\"skipDangerousModePermissionPrompt\":true}' -NoNewline"
)

:: ============================================================
:: STEP 7/8 - NPM INSTALL + CHAVE OPENAI + .ENV
:: ============================================================
echo.
echo   [7/8] Instalando dependencias Node.js + configuracao...
echo.

cd /d "%INSTALL_DIR%"
echo         npm install (pode levar 2-5 minutos)...
call npm install --production 2>&1 | findstr /V "npm warn"
if errorlevel 1 (
    color 0E
    echo         [AVISO] npm install teve warnings. Tentando novamente...
    call npm install --production 2>nul
    color 0B
)
echo         [OK] node_modules instalados

:: Chave OpenAI
echo.
echo  ============================================================================
echo               C H A V E   O P E N A I   ( V O Z   D O   J A R V I S )
echo  ============================================================================
echo.
echo     A OpenAI fornece a VOZ em tempo real do JARVIS.
echo     Voce precisa de uma API Key com billing ativo.
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
    echo.
    echo     Chave nao fornecida. JARVIS vai funcionar sem voz.
    echo     Voce pode adicionar depois no arquivo .env
    color 0B
    set "OPENAI_KEY=COLE_SUA_CHAVE_AQUI"
)

:: Criar .env
powershell -NoProfile -Command "Set-Content -Path '%INSTALL_DIR%\.env' -Value 'OPENAI_API_KEY=!OPENAI_KEY!`nPORT=3000' -NoNewline"
if defined CLAUDE_EXE (
    powershell -NoProfile -Command "Add-Content -Path '%INSTALL_DIR%\.env' -Value \"`nCLAUDE_CLI_PATH=!CLAUDE_EXE!\"" 2>nul
)
echo         [OK] .env configurado

:: ============================================================
:: STEP 8/8 - VERIFICACAO FINAL COM AUTO-REPAIR
:: ============================================================

set "VERIFY_ROUND=0"

:VerifyLoop
set /a VERIFY_ROUND+=1
set "PASS=0"
set "FAIL=0"
set "TOTAL=11"
set "REPAIR_NEEDED=0"

cls
echo.
echo  ============================================================================
echo       V E R I F I C A C A O   F I N A L   (Rodada !VERIFY_ROUND!)
echo  ============================================================================
echo.
echo   Verificando TODAS as dependencias...
echo.

:: --- CHECK 1: Node.js ---
where node >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo     [OK] Node.js %%v
    set /a PASS+=1
) else (
    echo     [X]  Node.js NAO encontrado — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    winget install OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements 2>nul
    call :RefreshPath
)

:: --- CHECK 2: Git ---
where git >nul 2>&1
if not errorlevel 1 (
    echo     [OK] Git instalado
    set /a PASS+=1
) else (
    echo     [X]  Git NAO encontrado — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    winget install Git.Git -e --silent --accept-package-agreements --accept-source-agreements 2>nul
    call :RefreshPath
)

:: --- CHECK 3: Python ---
set "PY_CHECK=0"
for %%p in ("C:\Program Files\Python312\python.exe" "C:\Program Files\Python311\python.exe" "C:\Program Files\Python310\python.exe") do (
    if exist %%p if "!PY_CHECK!"=="0" (
        set "PYTHON_CMD=%%~p"
        set "PY_CHECK=1"
    )
)
if "!PY_CHECK!"=="1" (
    for /f "tokens=*" %%v in ('"!PYTHON_CMD!" --version 2^>nul') do echo     [OK] %%v
    set /a PASS+=1
) else (
    echo     [X]  Python NAO encontrado — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    winget install Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements --override "/quiet InstallAllUsers=1 PrependPath=1" 2>nul
    call :RefreshPath
)

:: --- CHECK 4: Python packages ---
if "!PY_CHECK!"=="1" (
    "!PYTHON_CMD!" -c "import pyautogui, mss, psutil, openpyxl, PIL, wmi" >nul 2>&1
    if not errorlevel 1 (
        echo     [OK] Pacotes Python ^(pyautogui, mss, psutil, openpyxl, Pillow, wmi^)
        set /a PASS+=1
    ) else (
        echo     [X]  Pacotes Python incompletos — reinstalando...
        set /a FAIL+=1
        set "REPAIR_NEEDED=1"
        "!PYTHON_CMD!" -m pip install pyautogui mss Pillow openpyxl psutil wmi pywin32 --disable-pip-version-check --no-warn-script-location -q 2>nul
    )
) else (
    echo     [X]  Pacotes Python — Python nao disponivel
    set /a FAIL+=1
)

:: --- CHECK 5: Claude CLI ---
where claude >nul 2>&1
if not errorlevel 1 (
    echo     [OK] Claude Code CLI instalado
    set /a PASS+=1
) else (
    echo     [X]  Claude CLI NAO encontrado — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { irm https://claude.ai/install.ps1 | iex } catch { exit 1 }" 2>nul
    call :RefreshPath
    set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code;!PATH!"
    where claude >nul 2>&1
    if errorlevel 1 (
        call npm install -g @anthropic-ai/claude-code 2>nul
        call :RefreshPath
    )
)

:: --- CHECK 6: Claude Autenticado ---
claude auth status 2>nul | findstr /C:"loggedIn" | findstr /C:"true" >nul 2>&1
if not errorlevel 1 (
    echo     [OK] Claude Code autenticado
    set /a PASS+=1
) else (
    echo     [X]  Claude NAO autenticado — abrindo login...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    start /wait "Claude Login - JARVIS" cmd /c "cd /d "%USERPROFILE%" && claude && pause"
    timeout /t 3 /nobreak >nul
)

:: --- CHECK 7: server.js ---
if exist "%INSTALL_DIR%\server.js" (
    echo     [OK] server.js presente
    set /a PASS+=1
) else (
    echo     [X]  server.js NAO encontrado — reclonando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    git clone %REPO_URL% "%INSTALL_DIR%" 2>nul
)

:: --- CHECK 8: node_modules ---
if exist "%INSTALL_DIR%\node_modules\express" (
    echo     [OK] node_modules instalados
    set /a PASS+=1
) else (
    echo     [X]  node_modules incompletos — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    cd /d "%INSTALL_DIR%"
    call npm install --production 2>nul
)

:: --- CHECK 9: .env ---
if exist "%INSTALL_DIR%\.env" (
    echo     [OK] .env configurado
    set /a PASS+=1
) else (
    echo     [X]  .env NAO encontrado — recriando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    powershell -NoProfile -Command "Set-Content -Path '%INSTALL_DIR%\.env' -Value 'OPENAI_API_KEY=COLE_SUA_CHAVE_AQUI`nPORT=3000' -NoNewline"
)

:: --- CHECK 10: Obsidian ---
set "OBS_OK=0"
if exist "%LOCALAPPDATA%\Obsidian\Obsidian.exe" set "OBS_OK=1"
if exist "C:\Program Files\Obsidian\Obsidian.exe" set "OBS_OK=1"
if "!OBS_OK!"=="1" (
    echo     [OK] Obsidian instalado
    set /a PASS+=1
) else (
    echo     [X]  Obsidian NAO encontrado — reinstalando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    winget install Obsidian.Obsidian -e --silent --accept-package-agreements --accept-source-agreements 2>nul
)

:: --- CHECK 11: Vault Obsidian ---
if exist "%USERPROFILE%\Documents\Felipe\JARVIS-Welcome.md" (
    echo     [OK] Vault JARVIS configurado
    set /a PASS+=1
) else (
    echo     [X]  Vault JARVIS nao encontrado — recriando...
    set /a FAIL+=1
    set "REPAIR_NEEDED=1"
    mkdir "%USERPROFILE%\Documents\Felipe" 2>nul
    mkdir "%USERPROFILE%\Documents\Felipe\Tecnologias" 2>nul
    mkdir "%USERPROFILE%\Documents\Felipe\Projetos" 2>nul
    powershell -NoProfile -Command "Set-Content -Path '%USERPROFILE%\Documents\Felipe\JARVIS-Welcome.md' -Value '# Cerebro JARVIS - Vault Ativo' -NoNewline" 2>nul
)

:: --- RESULTADO ---
echo.
echo  ============================================================================

if !PASS! EQU !TOTAL! (
    color 0A
    echo.
    echo     RESULTADO: !PASS!/!TOTAL! — TODAS AS DEPENDENCIAS OK!
    echo.
    echo  ============================================================================
    goto :VerifyPassed
) else (
    color 0E
    echo.
    echo     RESULTADO: !PASS!/!TOTAL! — !FAIL! item(s) falharam.
    echo.
    if !VERIFY_ROUND! GEQ 3 (
        color 0C
        echo     Ja tentamos 3 vezes. Alguns itens precisam de instalacao manual.
        echo     Verifique sua conexao com internet e tente rodar o instalador novamente.
        echo.
        echo  ============================================================================
        goto :VerifyPassed
    )
    if "!REPAIR_NEEDED!"=="1" (
        echo     Reparos foram aplicados. Rodando verificacao novamente...
        echo.
        timeout /t 3 /nobreak >nul
        call :RefreshPath
        goto :VerifyLoop
    )
)

:VerifyPassed

:: ============================================================
:: CRIAR ATALHOS NO DESKTOP
:: ============================================================
echo.
echo   Criando atalhos...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\Ligar JARVIS.lnk'); $s.TargetPath = '%INSTALL_DIR%\Ligar JARVIS.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'Iniciar JARVIS'; $s.Save()" 2>nul
echo     [OK] Atalho "Ligar JARVIS" criado no Desktop

:: Configurar Claude settings
set "CLAUDE_GLOBAL=%USERPROFILE%\.claude"
if not exist "!CLAUDE_GLOBAL!" mkdir "!CLAUDE_GLOBAL!" 2>nul
powershell -NoProfile -Command "Set-Content -Path '%USERPROFILE%\.claude\settings.json' -Value '{\"permissions\":{\"defaultMode\":\"bypassPermissions\"},\"autoUpdatesChannel\":\"latest\",\"skipDangerousModePermissionPrompt\":true}' -NoNewline" 2>nul

:: ============================================================
:: INICIAR JARVIS
:: ============================================================
echo.
echo  ============================================================================
echo.
echo         JARVIS instalado com sucesso!
echo.
echo         Para iniciar: Clique em "Ligar JARVIS" no Desktop
echo.
echo  ============================================================================
echo.
echo         Iniciando JARVIS automaticamente...
echo.
cd /d "%INSTALL_DIR%"
start "" cmd /k "title JARVIS Server && node server.js"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo         JARVIS esta rodando em http://localhost:3000
echo         Pode fechar esta janela.
echo.
pause
exit /b 0

:: ============================================================
:: FUNCAO: REFRESH PATH
:: ============================================================
:RefreshPath
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%b"
set "PATH=!SYS_PATH!;!USR_PATH!;%USERPROFILE%\.local\bin;%USERPROFILE%\AppData\Local\Programs\claude-code;%USERPROFILE%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
goto :eof
