# Setup do Auto-Update do FELIPE

Guia rápido pra configurar o sistema de atualizações automáticas via GitHub.

---

## Passo 1: Criar o Repo Privado no GitHub

1. Acesse https://github.com/new
2. Nome: `felipe-updates` (ou outro que preferir)
3. **Privado** ✅
4. **NÃO** marque "Initialize with README"
5. Clique em **Create repository**

## Passo 2: Fazer Push do Projeto

Abra o PowerShell na pasta do Jarvis:

```powershell
cd C:\Users\Gamer\Desktop\Jarvis

# Inicializar Git (se ainda não tem)
git init
git branch -M main

# Criar .gitignore
@"
.env
node_modules/
system/FELIPE-MEMORY.md
system/FELIPE-HISTORY.json
system/JARVIS-MEMORY.md
system/JARVIS-HISTORY.json
system/memory-embeddings.json
Documents and Projects/
.claude/settings.local.json
FELIPE-Launcher.exe
Documents and Projects - Backup/
temp_*.jpg
launcher/node_modules/
launcher/dist/
*.log
"@ | Out-File -Encoding utf8 .gitignore

# Commit inicial
git add .
git commit -m "Initial release v4.0.0"

# Conectar ao repo (substitua SEU_USER pelo seu username)
git remote add origin https://github.com/SEU_USER/felipe-updates.git
git push -u origin main
```

## Passo 3: Gerar Fine-Grained PAT (Read-Only)

1. Acesse https://github.com/settings/tokens?type=beta
2. Clique em **Generate new token** → **Generate new token (Beta)**
3. Configure:
   - **Token name:** `felipe-updater`
   - **Expiration:** 1 year (ou Custom até 2030)
   - **Repository access:** **Only select repositories** → escolha `felipe-updates`
   - **Permissions:**
     - **Contents:** ✅ **Read-only**
     - **Metadata:** ✅ Read-only (automático)
4. Clique em **Generate token**
5. **COPIE O TOKEN AGORA** (começa com `github_pat_...`). Não vai aparecer de novo.

## Passo 4: Me Manda os Dados

Me mande aqui:

1. **Seu username do GitHub:** (ex: `gabrielfelipefernandes`)
2. **Nome do repo:** (ex: `felipe-updates`)
3. **Token:** (o `github_pat_...`)

Eu plugo no `launcher/updater.js`, rebuildo o FELIPE-Launcher.exe e recompilo o setup.

## Passo 5: Como Lançar Atualizações Futuras

Sempre que você editar o código e quiser atualizar todos os alunos:

```powershell
# 1. Incrementar a versão
echo "4.1.0" | Out-File -Encoding utf8 VERSION.txt -NoNewline

# 2. Commitar e dar push
git add .
git commit -m "v4.1.0 - Nova feature X"
git push

# 3. Pronto! Na próxima vez que qualquer aluno abrir o launcher,
#    ele baixa o update automaticamente.
```

## Fluxo no PC do Aluno

1. Aluno abre `FELIPE-Launcher.exe`
2. Launcher faz check da VERSION.txt no GitHub (uso: ~1KB)
3. Se tiver update → baixa zipball do repo
4. Extrai sobre os arquivos locais (preserva `.env`, memórias, projetos)
5. Card de progresso no launcher mostra: "Atualizando 4.0.0 → 4.1.0"
6. Aluno vê status: "Atualização concluída — 15 arquivos atualizados"

## Arquivos Preservados (Nunca Sobrescritos)

- `.env` — chave OpenAI do aluno
- `Documents and Projects/` — arquivos criados pelo aluno
- `system/FELIPE-MEMORY.md` — memória personalizada
- `system/FELIPE-HISTORY.json` — histórico
- `system/memory-embeddings.json` — RAG do aluno
- `node_modules/` — deps (muito grande, só atualiza se mudar package.json)
- `FELIPE-Launcher.exe` — próprio launcher
- Autenticação Claude (`%USERPROFILE%\.claude\`) — fora da pasta, sempre segura

## Quanto Custa

**R$ 0,00.** GitHub Free Plan:
- Repos privados ilimitados
- GitHub API: 5000 requests/hora por token
- Bandwidth suficiente pra milhares de alunos

---

**Pronto pra executar?** Me manda os 3 dados (username, repo, token) quando criar.
