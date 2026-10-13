param(
  [Parameter(Mandatory = $true)][uri]$ApiBaseUrl,
  [Parameter(Mandatory = $true)][uri]$AdminBaseUrl,
  [Parameter(Mandatory = $true)][uri]$StorefrontBaseUrl
)
$ErrorActionPreference = 'Stop'
function Assert-Response([uri]$Uri) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 20
  if ($response.StatusCode -ne 200) { throw "HTTP_STATUS_INVALID $Uri $($response.StatusCode)" }
  return $response
}
$live = Assert-Response ([uri]::new($ApiBaseUrl, '/health/live'))
$ready = Assert-Response ([uri]::new($ApiBaseUrl, '/health/ready'))
$admin = Assert-Response $AdminBaseUrl
$storefront = Assert-Response $StorefrontBaseUrl
if ($admin.Headers['X-Content-Type-Options'] -ne 'nosniff') { throw 'ADMIN_SECURITY_HEADERS_MISSING' }
if ($storefront.Headers['X-Content-Type-Options'] -ne 'nosniff') { throw 'STOREFRONT_SECURITY_HEADERS_MISSING' }
if ($ready.Content -notmatch '"status"\s*:\s*"ready"') { throw 'API_NOT_READY' }
Write-Output 'HOMOLOGATION_HTTP_OK'
