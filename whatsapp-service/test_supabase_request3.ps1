$supabase = 'https://apqrjkobktjcyrxhqwtm.supabase.co'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
$tests = @(
    "{0}/rest/v1/clientes?select=*&status_triagem=eq.aguardando&order=created_at.asc" -f $supabase,
    "{0}/rest/v1/whatsapp_conversations?select=*&limit=1" -f $supabase
)
foreach ($url in $tests) {
    Write-Output "\nRequesting: $url"
    try {
        $resp = Invoke-WebRequest -Uri $url -Headers @{ apikey = $anon; Authorization = "Bearer $anon" } -Method Get -ErrorAction Stop
        Write-Output "Status: $($resp.StatusCode)"
        Write-Output $resp.Content
    } catch {
        Write-Output 'ERROR'
        if ($_.Exception.Response) {
            $r = $_.Exception.Response
            Write-Output "Status: $($r.StatusCode.Value__)"
            $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Output "Body: $body"
        } else {
            Write-Output 'No response object'
            Write-Output $_ | Out-String
        }
    }
}