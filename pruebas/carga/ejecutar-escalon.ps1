param(
  [Parameter(Mandatory)][ValidateSet(50,100,250,500,1000,1500,2000)][int]$Usuarios,
  [switch]$Autorizado
)
$ErrorActionPreference='Stop'
if (!$Autorizado) { throw 'Confirma la autorización del escalón con -Autorizado.' }
$b='evalua-campana-k6-backend-1'
$pg='evalua-campana-k6-postgres-1'
$mq='evalua-campana-k6-rabbitmq-1'
$env:VUS=[string]$Usuarios
$env:MODO_CAMPANA='si'
$env:AUTORIZAR_CARGA='si'
$env:API_LOCAL='http://127.0.0.1:3000'
$env:MARCA_SEGUNDOS='1'
$env:USUARIOS_SINTETICOS='/fixture/cuentas.json'
if ((docker inspect $b --format '{{index .Config.Labels "com.docker.compose.project"}}') -ne 'evalua-campana-k6' -or
    (docker network inspect evalua-campana-k6_default --format '{{.Internal}}') -ne 'true' -or
    (docker port $b) -or
    (docker exec $b printenv ANALITICA_IA) -ne 'simulada' -or
    (docker exec evalua-campana-k6-worker-separatas-1 printenv SEPARATAS_IA_PROVEEDOR) -ne 'simulado') {
  throw 'El aislamiento o la configuración simulada no están verificados.'
}
$env:ADMIN_SINTETICO_CORREO=docker exec $b printenv ADMIN_GENERAL_CORREO
$env:ADMIN_SINTETICO_PASSWORD=docker exec $b printenv ADMIN_GENERAL_PASSWORD
$fixture=Get-Content -Raw -Encoding UTF8 pruebas/carga/preparar-humo.cjs | docker exec -i -e VUS -e MODO_CAMPANA $b node -
if ($LASTEXITCODE -ne 0 -or !$fixture) { throw 'No se preparó el conjunto sintético.' }
$datos=$fixture | ConvertFrom-Json
$env:CICLO_ID=$datos.cicloId
$env:SIMULACRO_ID=$datos.simulacroId
$sub="docs/evidencias/campana-k6/vu-$Usuarios-"+(Get-Date -Format 'yyyyMMdd-HHmmss')
$e=(New-Item -ItemType Directory -Force $sub).FullName
$f=(New-Item -ItemType Directory ('.campana-fixture-'+[Guid]::NewGuid().ToString('N'))).FullName
$g=(Resolve-Path 'pruebas/carga').Path
$trabajo=$null
try {
  ConvertTo-Json -InputObject @($datos.cuentas) -Compress | Set-Content -Encoding ascii (Join-Path $f 'cuentas.json')
  docker info --format 'cpu={{.NCPU}} mem_bytes={{.MemTotal}} docker={{.ServerVersion}}' | Set-Content (Join-Path $e 'entorno.txt')
  git rev-parse HEAD | Add-Content (Join-Path $e 'entorno.txt')
  docker image inspect grafana/k6:1.0.0 --format '{{index .RepoDigests 0}}' | Add-Content (Join-Path $e 'entorno.txt')
  "VUS=$Usuarios MARCA_SEGUNDOS=$env:MARCA_SEGUNDOS red_interna=true" | Add-Content (Join-Path $e 'entorno.txt')
  $trabajo=Start-Job -ArgumentList $e -ScriptBlock {
    param($destino)
    $ruta=Join-Path $destino 'recursos.txt'
    while ($true) {
      $instante=(Get-Date).ToUniversalTime().ToString('o')
      docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.PIDs}}|{{.NetIO}}|{{.BlockIO}}' |
        Where-Object { $_ -like 'evalua-campana-k6-*' } | ForEach-Object { "$instante|$_" } | Add-Content $ruta
      Start-Sleep -Seconds 1
    }
  }
  $PSNativeCommandUseErrorActionPreference=$false
  docker run --rm --name evalua-campana-k6-generador --network "container:$b" --user 0 --mount "type=bind,source=$g,target=/guion,readonly" --mount "type=bind,source=$f,target=/fixture,readonly" --mount "type=bind,source=$e,target=/evidencia" -e VUS -e MARCA_SEGUNDOS -e API_LOCAL -e AUTORIZAR_CARGA -e USUARIOS_SINTETICOS -e ADMIN_SINTETICO_CORREO -e ADMIN_SINTETICO_PASSWORD -e CICLO_ID -e SIMULACRO_ID grafana/k6:1.0.0 run --out json=/evidencia/metricas.ndjson --summary-export=/evidencia/resumen.json /guion/simulacro.k6.js
  $codigo=$LASTEXITCODE
  "k6_exit=$codigo" | Set-Content (Join-Path $e 'salida.txt')
  docker ps --filter label=com.docker.compose.project=evalua-campana-k6 --format '{{.Names}}|{{.Status}}|{{.Ports}}' | Set-Content (Join-Path $e 'servicios.txt')
  docker exec $mq rabbitmqctl list_queues name messages_ready messages_unacknowledged | Set-Content (Join-Path $e 'colas.txt')
  $id=[Guid]::Parse($datos.simulacroId).ToString()
  $sql=@"
SELECT
 (SELECT count(*) FROM habilitados_simulacro_rendicion WHERE simulacro_id='$id') inscritos,
 (SELECT count(*) FROM examenes_rendicion WHERE simulacro_id='$id') intentos,
 (SELECT count(*) FROM examenes_rendicion WHERE simulacro_id='$id' AND cierre IS NOT NULL) finalizados,
 (SELECT count(*) FROM resultados_examen WHERE simulacro_id='$id') calificados,
 (SELECT count(DISTINCT postulante_id) FROM examenes_rendicion WHERE simulacro_id='$id') postulantes_distintos,
 (SELECT count(*) FROM resultados_examen WHERE simulacro_id='$id' AND puntaje_centesimos=100000) notas_esperadas;
"@
  $sql | docker exec -i $pg sh -c 'psql -X -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | Set-Content (Join-Path $e 'postgres.txt')
  @'
const { crearClienteRedis, obtenerConfiguracionRedisDesdeEnv } = require('/app/dist/compartido/infraestructura');
(async () => {
  const cliente = crearClienteRedis(obtenerConfiguracionRedisDesdeEnv());
  try {
    console.log(await cliente.ping());
    for (const linea of (await cliente.info('memory')).split(/\r?\n/)) {
      if (/^(used_memory|used_memory_peak):/.test(linea)) console.log(linea);
    }
  } finally { await cliente.quit(); }
})().catch(error => { console.error(error.name); process.exitCode = 1; });
'@ | docker exec -i $b node - | Set-Content (Join-Path $e 'redis.txt')
  "evidencia=$sub codigo=$codigo"
  exit $codigo
} finally {
  if ($trabajo) { Stop-Job $trabajo; Remove-Job $trabajo }
  Remove-Item -LiteralPath (Join-Path $f 'cuentas.json') -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $f -ErrorAction SilentlyContinue
}
