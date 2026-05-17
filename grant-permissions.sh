#!/bin/bash
# JARVIS — Grant macOS Permissions
# Run once after installing JARVIS to grant Microphone, Screen Recording, Accessibility

echo "🔐 Granting JARVIS system permissions..."

# Open System Settings > Privacy > Microphone
osascript -e 'tell application "System Settings" to activate' 2>/dev/null || \
  osascript -e 'tell application "System Preferences" to activate' 2>/dev/null

sleep 1

# macOS 13+ (Ventura+): open directly to mic privacy pane
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone" 2>/dev/null || \
open "/System/Library/PreferencePanes/Security.prefPane" 2>/dev/null

echo ""
echo "📋 INSTRUÇÕES:"
echo "  1. Ative o toggle para JARVIS em Microfone"
echo "  2. Ative o toggle para JARVIS em Gravação de Tela"
echo "  3. Ative o toggle para JARVIS em Acessibilidade"
echo "  4. Reinicie JARVIS"
echo ""
echo "Pressione Enter após concluir..."
read
open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture" 2>/dev/null
echo "Ative JARVIS em Gravação de Tela, depois pressione Enter..."
read
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility" 2>/dev/null
echo "Ative JARVIS em Acessibilidade, depois pressione Enter..."
read
echo "✅ Permissões concedidas! Reinicie JARVIS."
