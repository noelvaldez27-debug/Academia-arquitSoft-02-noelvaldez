import http from 'k6/http';
import { check, sleep } from 'k6';
import { vu } from 'k6/execution';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const cantidad = Number(__ENV.VUS || '0');
const origen = __ENV.API_LOCAL || '';
const simulacroId = __ENV.SIMULACRO_ID || '';
const cicloId = __ENV.CICLO_ID || '';
const adminCorreo = __ENV.ADMIN_SINTETICO_CORREO || '';
const adminPassword = __ENV.ADMIN_SINTETICO_PASSWORD || '';
const etapa = Number(__ENV.MARCA_SEGUNDOS || '0');
if (__ENV.AUTORIZAR_CARGA !== 'si' || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origen) ||
    !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2000 || !simulacroId ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cicloId) ||
    !adminCorreo.endsWith('.invalid') || !adminPassword ||
    !Number.isInteger(etapa) || etapa < 1 || etapa > 300 || !__ENV.USUARIOS_SINTETICOS) {
  throw new Error('Se exige autorización explícita, API loopback y configuración sintética de la etapa.');
}

const usuarios = new SharedArray('postulantes sintéticos', () => JSON.parse(open(__ENV.USUARIOS_SINTETICOS)));
if (usuarios.length < cantidad || new Set(usuarios.map(usuario => usuario.correo)).size !== usuarios.length ||
    usuarios.some(usuario => !/^\d{8}@sofia\.edu$/.test(usuario.correo) || typeof usuario.password !== 'string')) {
  throw new Error('Se requiere una cuenta sintética distinta por usuario virtual.');
}

const tecnicos = new Rate('errores_tecnicos');
const nota = new Trend('cierre_a_nota_ms', true);
const rankingDefinitivo = new Trend('cierre_general_a_ranking_ms', true);
export const options = {
  maxRedirects: 0,
  scenarios: { simulacro: { executor: 'per-vu-iterations', vus: cantidad, iterations: 1, maxDuration: '12m' } },
  thresholds: {
    'http_req_duration{familia:habitual}': ['p(95)<=2000'],
    'http_req_duration{familia:respuesta}': ['p(95)<=1000'],
    'http_req_duration{familia:ranking}': ['p(95)<=3000'],
    cierre_a_nota_ms: ['p(95)<=5000'],
    errores_tecnicos: ['rate<0.01'],
    checks: ['rate==1'],
    'checks{fase:conciliacion}': ['rate==1'],
  },
  teardownTimeout: '2m',
};

function enviar(metodo, ruta, familia, token, cuerpo) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const respuesta = http.request(metodo, origen + ruta, cuerpo ? JSON.stringify(cuerpo) : null, {
    headers, redirects: 0, tags: { familia, name: metodo + ' ' + ruta.replace(/\/[^/]+\/(respuestas|finalizar)$/, '/:examen/$1')
      .replace(/\/(resultados|rankings)\/[^/]+/, '/$1/:id') },
  });
  tecnicos.add(respuesta.status === 0 || respuesta.status >= 500);
  return respuesta;
}

const rutaExamenes = '/api/v1/examenes/simulacros/' + encodeURIComponent(simulacroId);
const rutaRanking = '/api/v1/rankings/' + encodeURIComponent(simulacroId);

export function setup() {
  const ingreso = enviar('POST', '/api/usuarios/login', 'preparacion', null, { correo: adminCorreo, password: adminPassword });
  if (ingreso.status !== 200 || !ingreso.json('token')) throw new Error('El administrador sintético no pudo autenticarse.');
  const token = ingreso.json('token');
  const habilitacion = enviar('POST', rutaExamenes + '/habilitar', 'preparacion', token, { cicloId });
  if (habilitacion.status !== 200 || habilitacion.json('cicloId') !== cicloId.toLowerCase()) {
    throw new Error('El simulacro no se pudo habilitar para el ciclo sintético.');
  }
  const reporte = enviar('GET', rutaRanking + '/reportes/participacion', 'preparacion', token);
  if (reporte.status !== 200 || reporte.json('resumen.inscritos') !== cantidad ||
      reporte.json('resumen.participantes') !== 0 || reporte.json('estado') !== 'PROVISIONAL') {
    throw new Error('La etapa requiere un simulacro nuevo y un padrón de exactamente un postulante por VU.');
  }
  return { token };
}

export default function () {
  const cuenta = usuarios[vu.idInTest - 1];
  const ingreso = enviar('POST', '/api/usuarios/login', 'autenticacion', null,
    { correo: cuenta.correo, password: cuenta.password });
  if (!check(ingreso, { autenticado: res => res.status === 200 && !!res.json('token') })) return;
  const token = ingreso.json('token');
  const inicio = enviar('POST', '/api/v1/examenes/iniciar', 'habitual', token, { simulacroId });
  if (!check(inicio, { inicio_valido: res => res.status === 200 && !!res.json('id') })) return;
  const examen = '/api/v1/examenes/' + encodeURIComponent(inicio.json('id'));
  const lectura = enviar('GET', examen, 'habitual', token);
  if (!check(lectura, { intento_visible: res => res.status === 200 })) return;
  const marca = enviar('PUT', examen + '/respuestas', 'respuesta', token, {
    numero: 1, alternativa: 'A', revisionBase: 0, operacionId: 'carga-' + vu.idInTest,
  });
  if (!check(marca, { marca_aceptada: res => res.status === 200 })) return;
  sleep(etapa);
  const comienzoCierre = Date.now();
  const cierre = enviar('POST', examen + '/finalizar', 'habitual', token);
  if (!check(cierre, { cierre_aceptado: res => res.status === 200 })) return;
  let disponible = false;
  for (let intento = 0; intento < 20; intento++) {
    const resultado = enviar('GET', '/api/v1/resultados/' + encodeURIComponent(inicio.json('id')), 'resultado', token);
    if (resultado.status === 200) {
      nota.add(Date.now() - comienzoCierre);
      disponible = true;
      break;
    }
    if (resultado.status !== 202) break;
    sleep(0.5);
  }
  if (!check(disponible, { resultado_disponible: valor => valor })) return;
  let ranking;
  for (let intento = 0; intento < 12; intento++) {
    ranking = enviar('GET', rutaRanking + '/propio', 'ranking', token);
    if (ranking.status !== 404) break;
    sleep(0.5);
  }
  check(ranking, { ranking_consultable: res => res.status === 200 });
}

export function teardown({ token }) {
  const inicio = Date.now();
  const cierre = enviar('POST', rutaExamenes + '/cierre', 'conciliacion', token);
  if (!check(cierre, { cierre_general_recibido: res => [200, 202].includes(res.status) }, { fase: 'conciliacion' })) return;
  let reporte;
  for (let intento = 0; intento < 90; intento++) {
    reporte = enviar('GET', rutaRanking + '/reportes/participacion', 'conciliacion', token);
    if (reporte.status !== 200 || reporte.json('estado') === 'DEFINITIVO') break;
    sleep(1);
  }
  if (!check(reporte, {
    ranking_definitivo: res => res.status === 200 && res.json('estado') === 'DEFINITIVO',
    cohorte_reconciliada: res => res.status === 200 && res.json('resumen.inscritos') === cantidad &&
      res.json('resumen.participantes') === cantidad && res.json('resumen.finalizados') === cantidad &&
      res.json('resumen.calificados') === cantidad && res.json('resumen.noParticipantes') === 0,
  }, { fase: 'conciliacion' })) return;
  rankingDefinitivo.add(Date.now() - inicio);
}
