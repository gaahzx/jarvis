Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d """ & WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop\Jarvis"" && node server.js", 0, False
