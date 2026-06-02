---
skill: Roteamento (Índice)
nivel: master
modelo_ideal: opus-4-8
keywords: roteamento, qual skill, qual modelo, qual agente, decidir, escolher, índice, biblioteca
quando_usar: SEMPRE primeiro — é o mapa que decide qual skill/modelo/agente usar
prioridade: 0
---

# Skill — Roteamento (Índice)

> O cérebro de decisão do JARVIS. Antes de executar, decide O QUE usar.
> Objetivo: máxima qualidade com mínimo de token e tempo.

## PASSO 1 — CLASSIFICAR A INTENÇÃO
Leia o pedido e identifique o domínio:

| Sinais no pedido | Skill a carregar |
|------------------|------------------|
| site, design, UI, layout, cor, página, landing | `Skill — Claude Design` |
| app, ferramenta, calculadora, dashboard, jogo | `Skill — Artifacts e Web Apps` |
| pdf, word, excel, planilha, slides, documento | `Skill — Documentos Office` |
| abrir, clicar, tela, navegador, tocar, automatizar | `Skill — Computer Use` |
| código, função, bug, api, refatorar, debug | `Skill — Código de Produção` |
| analisar, dados, vários, comparar, todos, lote | `Skill — Análise de Dados` |
| voz, falar, áudio, realtime, tts | `Skill — Voice Realtime` |
| entregar, finalizar, empacotar | `Skill — Delivery System` |
| frontend, react, componente, tailwind | `Skill — Frontend Master` |

## PASSO 2 — ESCOLHER O MODELO (economia de token/tempo)
```
Tarefa nova, ambígua, criativa, arquitetural  → OPUS 4.8 (raciocínio máximo)
Decisão de médio porte, planejamento           → SONNET 4.6
Execução mecânica de blueprint pronto          → HAIKU 4.5 (rápido e barato)
```
**Regra RL**: Sonnet/Opus PENSA → Haiku EXECUTA → Sonnet VALIDA antes de entregar.
Não gaste Opus em tarefa que Haiku resolve. Não jogue tarefa nova no Haiku sem blueprint.

## PASSO 3 — AGENTES AIOX-CORE (usar com PARCIMÔNIA)
Os agentes especializados (Aria/Architect, Atlas/Analyst, Dex/Dev, Quinn/QA, etc.)
existem em `Agentes/`. **Só acione um agente se:**
- A tarefa é genuinamente multi-domínio E complexa
- O ganho de qualidade justifica o custo extra de token/tempo
- Execução direta não dá conta sozinha

**Na dúvida, NÃO acione agente.** Execute direto com a skill certa.
Quando acionar, **Sonnet sempre valida o resultado do agente antes da entrega final** —
garantir que foi REALMENTE feito, não só prometido.

## PASSO 4 — CARREGAR CONTEXTO
Antes de executar, o JARVIS já recebe automaticamente via `readVaultContext()`:
- Contexto ativo (Agora/Contexto-Ativo.md)
- Sessão de hoje (memória recente)
- Preferências do usuário
- Skills relevantes (filtradas por keyword do pedido)

## PASSO 5 — EXECUTAR E VERIFICAR
1. Aplicar a skill carregada
2. Entregar COMPLETO (regra: nunca esboço)
3. Verificar que foi feito de verdade (screenshot/teste/leitura)
4. Salvar resultado no vault (writeSessionMemory)

## PRINCÍPIO ECONÔMICO
> Token e tempo são recursos. A skill certa + o modelo certo + o agente só-quando-preciso
> = máxima qualidade pelo menor custo. Essa biblioteca É a economia: o conhecimento
> já está aqui, não precisa ser redescoberto a cada pedido.
