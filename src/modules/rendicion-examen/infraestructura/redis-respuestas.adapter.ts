import { Redis } from 'ioredis';
import { RegistrarRespuestaCommand } from '../aplicacion/registrar-respuesta.command';
import { RespuestasTemporales } from '../aplicacion/respuestas-temporales.port';
import { ErrorRendicion } from '../dominio/error-rendicion';
import { Respuesta } from '../dominio/respuesta';

const registrar = `
local tiempo = redis.call('TIME')
local ahora = tonumber(tiempo[1]) * 1000 + math.floor(tonumber(tiempo[2]) / 1000)
if ahora >= tonumber(ARGV[1]) then return {'vencido'} end
if redis.call('HEXISTS', KEYS[1], 'activo') == 0 then return {'sin-sesion'} end
if redis.call('HEXISTS', KEYS[1], 'cierre') == 1 then return {'cerrado'} end

local operacion = ARGV[2]
local marca = ARGV[3]
local entrada = ARGV[4]
local repetida = redis.call('HGET', KEYS[1], operacion)
if repetida then
  local previa = cjson.decode(repetida)
  if previa.entrada ~= entrada then return {'conflicto'} end
  return {'ok', previa.respuesta}
end

local comando = cjson.decode(entrada)
local guardada = redis.call('HGET', KEYS[1], marca)
local revision = 0
if guardada then revision = cjson.decode(guardada).revision end
if revision ~= comando.revisionBase then return {'conflicto'} end
local respuesta = cjson.encode({
  numero = comando.numero, alternativa = comando.alternativa, revision = revision + 1
})
redis.call('HSET', KEYS[1], marca, respuesta, operacion, cjson.encode({entrada = entrada, respuesta = respuesta}))
return {'ok', respuesta}
`;

function clave(id: string): string {
  return 'rendicion:examen:' + id;
}

const sellar = `
if redis.call('HEXISTS', KEYS[1], 'activo') == 0 then return {} end
redis.call('HSETNX', KEYS[1], 'cierre', ARGV[1])
return redis.call('HGETALL', KEYS[1])
`;

function extraer(datos: Record<string, string>): Respuesta[] {
  if (!datos.activo) throw new Error('No están disponibles las respuestas temporales.');
  return Object.entries(datos)
    .filter(([campo]) => campo.startsWith('marca:'))
    .map(([, valor]) => JSON.parse(valor) as Respuesta)
    .sort((a, b) => a.numero - b.numero);
}

export class RedisRespuestasAdapter implements RespuestasTemporales {
  constructor(private readonly redis: Pick<Redis, 'hset' | 'hgetall' | 'eval' | 'del'>) {}

  async inicializar(id: string): Promise<void> {
    await this.redis.hset(clave(id), 'activo', '1');
  }

  async listar(id: string): Promise<Respuesta[]> {
    return extraer(await this.redis.hgetall(clave(id)));
  }

  async sellar(id: string, cierre: Date) {
    const campos = await this.redis.eval(sellar, 1, clave(id), cierre.getTime()) as string[];
    const datos: Record<string, string> = {};
    for (let i = 0; i < campos.length; i += 2) datos[campos[i]] = campos[i + 1];
    return { respuestas: extraer(datos), cierre: new Date(Number(datos.cierre)) };
  }

  async limpiar(id: string): Promise<void> {
    await this.redis.del(clave(id));
  }

  async registrar(id: string, vence: Date, comando: RegistrarRespuestaCommand): Promise<Respuesta> {
    const [estado, respuesta] = await this.redis.eval(registrar, 1, clave(id), vence.getTime(),
      'operacion:' + comando.operacionId, 'marca:' + comando.numero, JSON.stringify(comando)) as [string, string];
    switch (estado) {
      case 'ok': return JSON.parse(respuesta) as Respuesta;
      case 'vencido': throw new ErrorRendicion('vencido', 'El plazo venció.');
      case 'cerrado': throw new ErrorRendicion('conflicto', 'El examen ya finalizó.');
      case 'conflicto': throw new ErrorRendicion('conflicto', 'La revisión o la operación están en conflicto.');
      default: throw new Error('No están disponibles las respuestas temporales.');
    }
  }
}
