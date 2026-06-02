---
skill: Claude Design
nivel: master
modelo_ideal: opus-4-8
keywords: design, ui, ux, interface, site, landing, página, layout, cor, paleta, tipografia, fonte, componente, visual, estética, css, tailwind, gradiente, glassmorphism, animação, responsivo, mobile, hero, seção
quando_usar: Qualquer criação ou melhoria visual — sites, apps, dashboards, landing pages, componentes, sistemas de design
---

# Skill — Claude Design

> A estética de ponta do Opus 4.8 destilada. Quando o JARVIS cria algo visual,
> ELE NÃO IMPROVISA — segue estes princípios que separam "feito por IA" de "feito por estúdio premium".

## PRINCÍPIO ZERO — Intenção antes de pixel
Antes de qualquer linha de CSS, defina:
1. **Quem é o usuário** e em que estado emocional chega (ansioso? curioso? comprando?)
2. **A ÚNICA ação** que essa tela precisa provocar
3. **O sentimento** que o visual deve transmitir (confiança? urgência? sofisticação? calma?)
Design sem intenção = decoração. Design com intenção = conversão.

## 1. TIPOGRAFIA — onde 80% da qualidade percebida acontece
- **Escala modular**: use razão 1.25 (Major Third) ou 1.333 (Perfect Fourth). Tamanhos: 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49px
- **Máximo 2 famílias**: uma display (títulos) + uma neutra (corpo). Ex: Orbitron+Inter, Space Grotesk+Inter, Clash Display+Satoshi
- **Peso cria hierarquia, não só tamanho**: title 700-900, body 400, label 500-600
- **Line-height**: títulos 1.1-1.2, corpo 1.5-1.7, nunca 1.0
- **Letter-spacing**: títulos grandes apertam (-0.02em a -0.04em), labels/uppercase abrem (+0.1em a +0.2em)
- **Largura de leitura**: máximo 65-75 caracteres por linha (max-width ~680px em corpo de texto)
- **Tabular numbers** em dashboards/preços (`font-variant-numeric: tabular-nums`)

## 2. COR — sistema, nunca aleatório
- **Estrutura 60-30-10**: 60% neutro de fundo, 30% cor secundária, 10% cor de destaque (CTA)
- **Uma cor de marca + neutros**: gere a escala completa (50→900) da cor de marca
- **Neutros nunca puros**: cinza puro (#808080) é morto. Injete a temperatura da marca — neutros levemente quentes ou frios
- **Dark mode de verdade**: fundo NÃO é #000 (causa halação). Use #0A0E14, #0D1117, #060C12. Texto NÃO é #FFF puro — use rgba(255,255,255,0.87)
- **Contraste WCAG AA mínimo**: 4.5:1 texto normal, 3:1 texto grande. Sempre verificar
- **Cor com significado**: verde=sucesso/online, âmbar=atenção, vermelho=erro/urgência, azul/ciano=info/tech
- **Acentos saturados em pouca área**: quanto mais saturada a cor, menos área ela ocupa

## 3. ESPAÇAMENTO — o ritmo invisível
- **Escala base 4px ou 8px**: 4/8/12/16/24/32/48/64/96/128. Nunca valores aleatórios (17px, 23px)
- **Whitespace é luxo**: marcas premium respiram. Aperto = barato. Generoso = caro
- **Proximidade agrupa**: elementos relacionados ficam perto, grupos diferentes ficam longe
- **Padding interno > margem externa** em cards para sensação de profundidade
- **Seções de landing**: 80-120px de padding vertical em desktop, 48-64px em mobile

## 4. LAYOUT & COMPOSIÇÃO
- **Grid de 12 colunas** com gutter consistente
- **Alinhamento óptico, não matemático**: ícones e textos às vezes precisam de ajuste fino de 1-2px
- **Lei de proximidade e alinhamento de Gestalt**: tudo se alinha a uma grade invisível
- **Ponto focal único por viewport**: o olho precisa saber onde pousar primeiro (tamanho, cor ou contraste cria isso)
- **Assimetria controlada** é mais interessante que simetria perfeita
- **Z-pattern** (landing) e **F-pattern** (conteúdo denso) guiam o scan visual

## 5. PROFUNDIDADE & ACABAMENTO (o que faz parecer "caro")
- **Sombras em camadas**, nunca uma só: combine 2-3 sombras (uma curta+escura, uma longa+suave)
  ```css
  box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.06);
  ```
- **Bordas sutis sobre fundos escuros**: rgba(255,255,255,0.08) cria definição sem peso
- **Glassmorphism com moderação**: `backdrop-filter: blur(12px)` + fundo semi-transparente + borda fina luminosa
- **Gradientes sofisticados**: nunca 2 cores opostas berrantes. Use tons próximos no mesmo matiz, ou mesh gradients suaves
- **Glow funcional**: brilho ciano/cor-marca em elementos ativos/hover sinaliza interatividade
- **Cantos arredondados consistentes**: defina um raio base (8/12/16px) e use múltiplos. Botões menores, cards maiores

## 6. MOVIMENTO — vida, não distração
- **Duração**: micro-interações 150-250ms, transições de página 300-500ms. Nada acima de 600ms (parece lento)
- **Easing real**: nunca `linear`. Use `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out padrão) ou spring
- **Entrada escalonada (stagger)**: elementos aparecem em sequência (delay 50-80ms entre cada), não todos juntos
- **Hover dá feedback**: elevação, brilho, leve scale (1.02-1.05), nunca mudança brusca
- **Respeite `prefers-reduced-motion`**: desligue animações para quem precisa
- **Anime transform e opacity** (GPU), evite animar width/height/top/left (causa reflow)

## 7. MOBILE-FIRST (obrigatório — regra do RL)
- Desenhe o mobile primeiro, expanda para desktop
- **Touch targets ≥ 44×44px**
- **Texto base ≥ 16px** (evita zoom automático no iOS)
- Empilhar, não espremer. Esconder o secundário, não miniaturizar tudo
- **CTA fixo/sticky** no mobile para conversão (WhatsApp flutuante no padrão BR)

## 8. CHECKLIST DE ENTREGA (rodar mentalmente antes de entregar)
- [ ] Hierarquia visual clara — sei onde olhar primeiro em 1 segundo?
- [ ] Espaçamento na escala, zero valores aleatórios
- [ ] Contraste AA verificado
- [ ] Estados completos: hover, focus, active, disabled, loading, empty, error
- [ ] Responsivo testado em 375px, 768px, 1440px
- [ ] Microinterações nos pontos de ação
- [ ] Nada de lorem ipsum — conteúdo real (regra RL)
- [ ] Dark mode com fundos corretos (não #000, não #FFF)
- [ ] Acessibilidade: alt em imagens, foco visível, navegação por teclado

## STACK PADRÃO (proposta-site / RL)
Next.js 14+ · Tailwind CSS · shadcn/ui · Lucide icons · Framer Motion

## REGRA DE OURO
> Se parece "template", refaça. Detalhe é o que separa amador de premium:
> a sombra em camadas, o stagger na entrada, o neutro com temperatura,
> o espaçamento que respira. O usuário não sabe nomear — mas sente.
