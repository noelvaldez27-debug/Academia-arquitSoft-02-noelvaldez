const { monitorEventLoopDelay, performance } = require('node:perf_hooks');
const { createRequire } = require('node:module');
const desdeApp = createRequire('/app/package.json');
const muestras = new Map();
const demora = monitorEventLoopDelay({ resolution: 20 });
demora.enable();
function guardar(nombre, inicio, fallo) {
  const valores = muestras.get(nombre) || [];
  valores.push([performance.now() - inicio, fallo ? 1 : 0]);
  muestras.set(nombre, valores);
}
function medir(objeto, metodo, clasificar) {
  const original = objeto[metodo];
  objeto[metodo] = function (...args) {
    const nombre = clasificar(args);
    const inicio = performance.now();
    const i = args.length - 1;
    if (typeof args[i] === 'function') {
      const callback = args[i];
      args[i] = function (error, ...resto) {
        guardar(nombre, inicio, error);
        return callback.call(this, error, ...resto);
      };
    }
    const resultado = original.apply(this, args);
    if (resultado && typeof resultado.then === 'function') return resultado.then(
      valor => { guardar(nombre, inicio, false); return valor; },
      error => { guardar(nombre, inicio, true); throw error; },
    );
    return resultado;
  };
}
const { Pool, Client } = desdeApp('pg');
medir(Pool.prototype, 'connect', () => 'pg_pool');
medir(Client.prototype, 'query', args => {
  const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || '';
  const tabla = /\b(?:FROM|INTO|UPDATE)\s+([a-z_]+)/i.exec(sql)?.[1] ?? 'otra';
  return 'pg_' + tabla;
});
medir(desdeApp('bcryptjs'), 'compare', () => 'bcrypt');
medir(desdeApp('amqplib'), 'connect', () => 'rabbit_conexion');
const Redis = desdeApp('ioredis').Redis;
medir(Redis.prototype, 'sendCommand', () => 'redis');
setInterval(() => {
  if (!muestras.size) { demora.reset(); return; }
  const datos = {};
  for (const [nombre, valores] of muestras) {
    valores.sort((a,b) => a[0]-b[0]);
    datos[nombre] = { n: valores.length, p95: +valores[Math.ceil(valores.length * 0.95)-1][0].toFixed(2),
      max: +valores[valores.length - 1][0].toFixed(2), errores: valores.reduce((n,v)=>n+v[1],0) };
  }
  console.log('PERFIL_K6 ' + JSON.stringify({ instante: new Date().toISOString(),
    eventLoopP95: +(demora.percentile(95)/1e6).toFixed(2), eventLoopMax: +(demora.max/1e6).toFixed(2),
    rssMiB: +(process.memoryUsage.rss()/1048576).toFixed(2), datos }));
  demora.reset();
  muestras.clear();
}, 1000).unref();
