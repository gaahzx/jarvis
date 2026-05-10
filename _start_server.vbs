Set oShell = CreateObject("Shell.Application")
oShell.ShellExecute "cmd.exe", "/k ""cd /d ""C:\Users\MUSIKI-PC\Desktop\Instalador Jarvis"" && node server.js""", "", "", 1
