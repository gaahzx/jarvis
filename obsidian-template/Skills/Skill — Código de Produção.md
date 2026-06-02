---
skill: Código de Produção
nivel: master
modelo_ideal: opus-4-8 (arquitetura) / haiku-4-5 (execução do blueprint)
keywords: código, programar, função, script, api, backend, frontend, bug, erro, debug, refatorar, javascript, python, node, react, sql, banco, endpoint, integração
quando_usar: Escrever, revisar, debugar ou refatorar código de qualquer linguagem
---

# Skill — Código de Produção

> Como o Opus 4.8 escreve código que vai pra produção — não snippet de tutorial.

## HIERARQUIA DE DECISÃO (regra RL: Sonnet pensa → Haiku executa)
1. **Tarefa nova/ambígua/arquitetural** → Opus/Sonnet pensa primeiro, produz blueprint completo
2. **Blueprint pronto, execução mecânica** → Haiku executa
3. **Sempre**: Sonnet valida o output do Haiku antes da entrega final

## PRINCÍPIOS DE CÓDIGO QUE DURA
- **Legível > esperto**: código é lido 10× mais do que escrito
- **Nomes que explicam**: `calcularImpostoMensal()` não `calc()`. `usuariosAtivos` não `arr`
- **Funções pequenas, uma responsabilidade**: se precisa de "e" pra descrever, divida
- **Falhe cedo e claro**: valide entradas no topo, erros descritivos
- **DRY com bom senso**: não abstraia cedo demais; duplicação às vezes é mais clara
- **Comentar o PORQUÊ, não o O QUÊ** (regra RL: só quando a lógica não é autoevidente)

## TRATAMENTO DE ERRO (não-negociável)
- Todo I/O (rede, arquivo, DB) em try/catch com mensagem útil
- Nunca engolir erro silencioso sem log
- Estados de falha tratados na UI (não tela branca)
- Timeouts em chamadas externas

## SEGURANÇA POR PADRÃO
- **Nunca** commitar segredos (.env no .gitignore SEMPRE)
- Validar e sanitizar TODA entrada do usuário
- SQL parametrizado, nunca concatenação (SQL injection)
- Princípio do menor privilégio
- HTTPS, tokens com expiração

## ANTES DE ENTREGAR CÓDIGO
- [ ] Roda sem erro?
- [ ] Edge cases tratados (vazio, null, negativo, grande demais)?
- [ ] Erros tratados com mensagens úteis?
- [ ] Sem segredos hardcoded?
- [ ] Nomes claros?
- [ ] Funciona no caso real do usuário, não só no feliz?

## DEBUG SISTEMÁTICO
1. Reproduzir o erro de forma confiável
2. Ler a mensagem de erro INTEIRA (stack trace)
3. Isolar: onde exatamente quebra?
4. Hipótese → teste → confirma/descarta
5. Corrigir a CAUSA, não o sintoma
6. Verificar que não quebrou outra coisa
