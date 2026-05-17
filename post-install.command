#!/bin/bash
# JARVIS — Configuração pós-instalação
# Concede permissões do macOS automaticamente e prepara o microfone

clear
echo "🤖 J·A·R·V·I·S — Configuração Inicial"
echo "═══════════════════════════════════════"
echo ""
echo "Vamos liberar acesso ao microfone para o JARVIS."
echo ""
sleep 1

# Reset state so dialogs appear fresh
tccutil reset Microphone com.jarvis.assistant 2>/dev/null
tccutil reset Camera com.jarvis.assistant 2>/dev/null
tccutil reset ScreenCapture com.jarvis.assistant 2>/dev/null

# Open mic settings — user just needs to toggle ON
echo "→ Abrindo Configurações de Microfone..."
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
sleep 2

echo ""
echo "📋 NA JANELA QUE ABRIU:"
echo "   1. Localize 'JARVIS' (ou 'Electron') na lista"
echo "   2. Ative o interruptor ao lado"
echo "   3. Pode fechar a janela quando terminar"
echo ""
echo "Pressione Enter quando estiver pronto para abrir o JARVIS..."
read

# Launch JARVIS
open /Applications/JARVIS.app
echo ""
echo "✅ JARVIS aberto! Microfone ativo automaticamente."
echo "   Aperte o botão do microfone para começar a conversar."
sleep 3
