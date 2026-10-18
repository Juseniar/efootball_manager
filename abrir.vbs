Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
launcher = files.BuildPath(root, "start.py")
localPython = files.BuildPath(root, ".venv\Scripts\pythonw.exe")

On Error Resume Next
If files.FileExists(localPython) Then
    shell.Run """" & localPython & """ """ & launcher & """", 0, False
Else
    shell.Run "pyw -3 """ & launcher & """", 0, False
End If
If Err.Number <> 0 Then
    Err.Clear
    shell.Run "pythonw """ & launcher & """", 0, False
End If
If Err.Number <> 0 Then
    MsgBox "Instala Python 3 y vuelve a abrir este archivo.", vbCritical, "eFootball Manager"
End If