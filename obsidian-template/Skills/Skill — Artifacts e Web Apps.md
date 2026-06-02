---
skill: Artifacts e Web Apps
nivel: master
modelo_ideal: opus-4-8
keywords: app, aplicativo, ferramenta, calculadora, dashboard, jogo, simulador, react, componente, interativo, web app, single page, spa, artifact, protótipo, mvp
quando_usar: Criar aplicações interativas completas, ferramentas funcionais, dashboards, jogos, protótipos rodando
---

# Skill — Artifacts e Web Apps

> Como o Opus 4.8 constrói apps completos e funcionais de uma vez só — não esboços.

## REGRA MESTRA
Entregue SEMPRE o app COMPLETO e FUNCIONANDO. Nunca "estrutura básica", nunca TODO comments,
nunca "você pode adicionar depois". Se o usuário pediu uma calculadora, ela calcula. Se pediu um
jogo, ele joga do início ao fim.

## ARQUITETURA DE UM APP DE QUALIDADE
1. **Estado primeiro**: defina o modelo de dados e o estado antes da UI
2. **Componentização**: quebre em componentes reutilizáveis, um arquivo lógico cada
3. **Single source of truth**: estado central, props descendo, eventos subindo
4. **Estados de UI completos**: loading, vazio, erro, sucesso, sem-dados — TODOS tratados
5. **Persistência quando faz sentido**: localStorage para preferências/progresso

## STACK POR TIPO DE APP
| Tipo | Stack recomendada |
|------|-------------------|
| App interativo no navegador | React + Tailwind (CDN) ou HTML+JS puro |
| App de produção | Next.js 14 + Tailwind + shadcn/ui |
| Dashboard com dados | React + Recharts/Chart.js + Tailwind |
| Jogo simples | Canvas API + requestAnimationFrame |
| Ferramenta desktop local | Electron OU HTML servido pelo JARVIS |

## PADRÕES DE QUALIDADE OBRIGATÓRIOS
- **Validação de input**: nunca confie no usuário. Trate vazio, negativo, texto onde espera número
- **Feedback imediato**: toda ação tem resposta visual em < 100ms
- **Atalhos de teclado** em apps de produtividade (Enter, Esc, Ctrl+algo)
- **Responsivo de verdade**: funciona em mobile, não só "não quebra"
- **Sem dependências desnecessárias**: cada lib precisa justificar seu peso
- **Acessível**: labels, roles ARIA, foco gerenciado

## FLUXO DE CONSTRUÇÃO (JARVIS)
1. Entender o objetivo real (não só o pedido literal)
2. Definir dados + estado
3. Montar UI seguindo `Skill — Claude Design`
4. Implementar lógica completa
5. Tratar TODOS os edge cases
6. Testar mentalmente os fluxos principais e os de erro
7. Entregar funcionando + explicar como usar em 2-3 frases

## ANTI-PADRÕES (NUNCA fazer)
- ❌ "Aqui está um exemplo básico que você pode expandir"
- ❌ Funções vazias com `// implementar lógica aqui`
- ❌ Dados mockados quando dá pra fazer real
- ❌ Ignorar mobile
- ❌ App que quebra com input inesperado
