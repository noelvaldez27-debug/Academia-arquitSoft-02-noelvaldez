param([Parameter(Mandatory)][ValidateSet(10,20)][int]$Pool, [switch]$Autorizado)
$ErrorActionPreference='Stop'
if (!$Autorizado) { throw 'Confirma la autorización del perfil con -Autorizado.' }
$b='evalua-campana-k6-backend-1'
if ((docker network inspect evalua-campana-k6_default --format '{{.Internal}}') -ne 'true' -or
    (docker port $b) -or (docker exec $b printenv ANALITICA_IA) -ne 'simulada' -or
    (docker exec evalua-campana-k6-worker-separatas-1 printenv SEPARATAS_IA_PROVEEDOR) -ne 'simulado') {
  throw 'Aislamiento e IA simulada requeridos.'
}
$config=docker inspect $b --format '{{json .Config.Env}}' | ConvertFrom-Json
foreach ($v in @('ADMIN_GENERAL_NOMBRE','ADMIN_GENERAL_CORREO','ADMIN_GENERAL_PASSWORD','JWT_SECRET')) {
  $valor=$config | Where-Object { $_.StartsWith($v+'=') }
  if (!$valor) { throw 'Configuración sintética no disponible.' }
  [Environment]::SetEnvironmentVariable($v,$valor.Substring($v.Length+1),'Process')
}
$env:VUS='10'
$env:MODO_CAMPANA='no'
$env:ANALITICA_IA='simulada'
$env:SEPARATAS_IA_PROVEEDOR='simulado'
$env:DB_POOL_MAX_API=[string]$Pool
$fixture=Get-Content -Raw -Encoding UTF8 pruebas/carga/preparar-humo.cjs | docker exec -i -e VUS -e MODO_CAMPANA $b node -
if ($LASTEXITCODE -ne 0 -or !$fixture) { throw 'No se prepararon las cuentas sintéticas.' }
$archivo=Get-Content -Raw -Encoding UTF8 pruebas/carga/perfilar-autenticacion.cjs
$datos=ConvertTo-Json -InputObject @(($fixture | ConvertFrom-Json).cuentas) -Compress
$salida=(New-Item -ItemType Directory -Force ('docs/evidencias/campana-k6/autenticacion-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))).FullName
$base=@('-p','evalua-campana-k6','-f','docker-compose.yml','-f','pruebas/carga/compose.aislado.yml')
$nl=[Environment]::NewLine
foreach ($modo in 'perfil','sin-perfil') {
  $c=$base
  if ($modo -eq 'perfil') { $c+=@('-f','pruebas/carga/compose.perfil.yml') }
  docker compose @c up -d --wait --wait-timeout 90
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $script=$archivo+$nl+"ejecutar("+$datos+").catch(error=>{ console.error(error.name); process.exitCode=1; });"
  $script | docker exec -i $b node - | Set-Content -Encoding UTF8 (Join-Path $salida "$modo.json")
  if ($LASTEXITCODE -ne 0) { throw 'No terminó la medición aislada de autenticación.' }
  if ($modo -eq 'perfil') {
    docker logs $b 2>&1 | Where-Object { $_ -like 'PERFIL_K6 *' } | ForEach-Object { $_.Substring(10) } |
      Set-Content -Encoding UTF8 (Join-Path $salida 'perfil-backend.ndjson')
  }
}
($archivo+$nl+"console.log(JSON.stringify(medirCostoBcryptAislado()));") | docker exec -i $b node - |
  Set-Content -Encoding UTF8 (Join-Path $salida 'bcrypt-cpu.json')
if ($LASTEXITCODE -ne 0) { throw 'No terminó la medición aislada de CPU.' }
"pool=$Pool evidencia=$salida"
