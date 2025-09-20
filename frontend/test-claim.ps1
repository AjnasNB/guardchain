$body = @{
    policyTokenId = "4"
    amount = 560
    description = "I have injured my left foot"
    claimType = "general"
    evidenceHashes = @("QmEvidence1")
    userAddress = "0x8BebaDf625b932811Bf71fBa961ed067b5770EfA"
    userId = "0x8BebaDf625b932811Bf71fBa961ed067b5770EfA"
} | ConvertTo-Json

Write-Host "Testing claim submission with body:"
Write-Host $body

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/blockchain/claim/submit" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Success! Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error occurred:"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
