Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
url = "http://192.168.40.10:5000"

For attempt = 1 To 60
    On Error Resume Next
    Set request = CreateObject("WinHttp.WinHttpRequest.5.1")
    request.Open "GET", url & "/api/health", False
    request.SetTimeouts 1000, 1000, 1000, 1000
    request.Send
    If Err.Number = 0 And request.Status = 200 Then
        On Error GoTo 0
        shell.Run """" & url & """", 1, False
        WScript.Quit 0
    End If
    Err.Clear
    On Error GoTo 0
    WScript.Sleep 500
Next

shell.Run """" & url & """", 1, False
