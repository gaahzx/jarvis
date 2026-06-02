---
skill: Análise de Dados
nivel: master
modelo_ideal: opus-4-8
keywords: analisar, análise, dados, vários, múltiplos, lista, comparar, planilha, csv, relatório, insight, tendência, gráfico, processar, lote, batch, todos, cada
quando_usar: Analisar múltiplos itens, processar dados, comparar, gerar insights — especialmente "analise todos os N"
quando_usar_loop: Quando o usuário pede análise de MÚLTIPLOS itens — processar TODOS, um por um, sem parar
---

# Skill — Análise de Dados

> Como o Opus 4.8 processa N itens sem desistir no meio nem inventar resultado.

## REGRA DE OURO — "TODOS" SIGNIFICA TODOS
Se o usuário pede "analise todos os 50 arquivos", o JARVIS analisa os 50.
Não 10 com "e os demais seguem o padrão". Não amostra. TODOS, um por um.
Se for muito, processa em lotes mas COMPLETA o conjunto inteiro.

## FLUXO DE ANÁLISE MÚLTIPLA
```
1. INVENTARIAR: listar todos os itens a processar (contar exato)
2. DEFINIR critério: o que extrair/comparar de cada um
3. PROCESSAR em loop: item por item, registrando resultado de cada
4. AGREGAR: consolidar os resultados individuais
5. SINTETIZAR: padrões, outliers, insights acionáveis
6. ENTREGAR: resultado por item + visão geral
```

## QUALIDADE DA ANÁLISE
- **Dados antes de opinião**: número primeiro, interpretação depois
- **Mostrar o trabalho**: como cheguei nessa conclusão?
- **Outliers importam**: o que foge do padrão geralmente é o insight
- **Acionável > descritivo**: "vendas caíram 12%" é fato; "caíram 12% por causa de X, faça Y" é valor
- **Honestidade estatística**: correlação ≠ causalidade; amostra pequena = cautela

## FERRAMENTAS (JARVIS)
- `pandas` — manipulação de dados tabulares
- `openpyxl` — ler/escrever Excel
- Gráficos: `matplotlib` / Chart.js (web) / Recharts (React)

## VISUALIZAÇÃO DE DADOS (segue Claude Design)
- **Gráfico certo para a pergunta**: linha=tendência, barra=comparação, pizza=proporção (máx 5 fatias), scatter=correlação
- **Sem lixo visual**: remover grades desnecessárias, 3D, sombras inúteis (data-ink ratio)
- **Eixo Y começa no zero** em barras (senão distorce)
- **Cor com propósito**: destacar o que importa, cinza pro resto
- **Rótulos diretos** > legenda quando possível

## ANTI-PADRÕES
- ❌ "Analisei alguns e o resto é parecido"
- ❌ Inventar número que não está nos dados
- ❌ Gráfico bonito que esconde a verdade
- ❌ Parar no meio de um lote grande
