---
skill: Computer Use
nivel: master
modelo_ideal: opus-4-8
keywords: abrir, clicar, digitar, tela, mouse, teclado, navegador, chrome, youtube, aplicativo, programa, screenshot, captura, automatizar, controlar pc, computador, janela, abrir site, tocar música
quando_usar: Controlar o PC do usuário — abrir apps, navegar, clicar, digitar, automatizar tarefas na tela
---

# Skill — Computer Use

> Controle total do computador com segurança e verificação. O JARVIS AGE, não descreve.

## CICLO FUNDAMENTAL (sempre)
```
1. SCREENSHOT (ver o estado atual)
2. ANALISAR (onde estou? o que preciso fazer?)
3. AGIR (clicar / digitar / atalho)
4. SCREENSHOT (deu certo?)
5. SE FALHOU → analisar o erro e tentar caminho diferente
```
Nunca aja às cegas. Nunca assuma que funcionou. SEMPRE verifique com screenshot depois.

## FERRAMENTAS (JARVIS / Python)
- `pyautogui` — mouse, teclado, screenshot
- `mss` — captura de tela rápida e multi-monitor
- Coordenadas relativas à resolução real (capturar primeiro, calcular depois)

## REGRAS DE EXECUÇÃO
- **Ação completa, não parcial**: "tocar música no YouTube" = abrir + buscar + clicar no vídeo + DAR PLAY. Abrir sem dar play = FALHA
- **Esperas inteligentes**: aguardar a página/app carregar antes de clicar (não sleep fixo cego — verificar com screenshot)
- **Foco da janela**: garantir que a janela certa está em foco antes de digitar
- **Atalhos > cliques** quando possível (mais confiável): Ctrl+L para barra de endereço, Ctrl+T nova aba
- **Texto literal**: ao digitar, digitar EXATAMENTE o que foi pedido, sem reinterpretar

## PADRÕES COMUNS
| Tarefa | Caminho confiável |
|--------|-------------------|
| Abrir site | Abrir Chrome → Ctrl+L → digitar URL → Enter |
| Tocar no YouTube | Abrir YouTube → buscar → clicar 1º vídeo → confirmar play (barra de progresso mexendo) |
| Digitar em editor | Abrir app → garantir foco → digitar texto literal |
| Preencher formulário | Tab entre campos OU clicar em cada campo |

## SEGURANÇA
- Nunca executar ação destrutiva (deletar, formatar, comprar) sem confirmação explícita
- Em dúvida sobre o que clicar, screenshot e analisar — não chutar
- Reportar ao usuário o que foi feito ao final

## VERIFICAÇÃO DE SUCESSO
Sempre terminar com prova: "Música tocando — barra de progresso avançando" /
"Texto digitado e visível no editor" / "Site carregado, título da página: X".
