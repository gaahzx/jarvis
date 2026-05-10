Set oShell = CreateObject("Shell.Application")
oShell.ShellExecute "cmd.exe", "/c ""cd /d """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & """ && INSTALAR-JARVIS-v8.bat""", "", "runas", 1
