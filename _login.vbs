Set oShell = CreateObject("Shell.Application")
oShell.ShellExecute "cmd.exe", "/k ""claude auth login""", "", "", 1
