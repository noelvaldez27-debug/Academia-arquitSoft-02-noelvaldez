import type { Pool } from 'pg';
import { crearTransaccionExamen } from './transaccion-examen';

const miembro = { postulanteId: '1', carrera: 'MEDICINA', sedeId: '1', condicion: null };
const padron = { cicloId: 'ciclo', habilitadoEn: new Date(0) };
function preparar(estado: { requiere?: boolean | null; padron?: boolean; miembro?: boolean; vigente?: boolean;
  fallo?: boolean; cierre?: boolean } = {}) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('FROM padrones_simulacro_rendicion')) return { rows: estado.padron ? [padron] : [] };
    if (sql.includes('FROM habilitados_simulacro_rendicion')) return { rows: estado.miembro ? [miembro] : [] };
    if (sql.includes('INSERT INTO padrones_simulacro_rendicion')) return { rows: [padron] };
    if (sql.includes('INSERT INTO habilitados_simulacro_rendicion') && estado.fallo) throw new Error('Fallo de escritura');
    if (sql.includes('FROM cierres_simulacro_rendicion')) return { rows: estado.cierre ? [{}] : [] };
    return { rows: [] };
  });
  const release = jest.fn();
  const cliente = { query, release };
  const pool = { connect: async () => cliente } as unknown as Pool;
  const congelar = jest.fn().mockResolvedValue({ id: 's', preguntas: [], duracionMinutos: 5 });
  const bloquear = jest.fn().mockResolvedValue(undefined);
  const tx = crearTransaccionExamen(pool, () => congelar, undefined, {
    requierePadron: () => async () => estado.requiere === undefined ? true : estado.requiere,
    ciclos: () => ({
      bloquearAbierto: bloquear, habilitados: async () => [miembro], sigueVinculado: async () => Boolean(estado.vigente),
    }),
  });
  return { tx, query, release, congelar, bloquear };
}

test('CA-VS03 revierte encabezado y congelamiento si falla escribir el padrón', async () => {
  const { tx, query, release, congelar, bloquear } = preparar({ fallo: true });
  await expect(tx(ops => ops.habilitarSimulacro!('s', 'ciclo', 'admin'))).rejects.toThrow('Fallo de escritura');
  expect(bloquear).toHaveBeenCalledWith('ciclo');
  expect(congelar).toHaveBeenCalledWith('s');
  expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(release).toHaveBeenCalledTimes(1);
});
test.each([{ requiere: false }, { requiere: null }, { cierre: true }])
('CA-VS03 rechaza habilitar un simulacro no elegible sin congelar ni escribir %j', async estado => {
  const { tx, query, congelar } = preparar(estado);
  await expect(tx(ops => ops.habilitarSimulacro!('s', 'ciclo', 'admin'))).rejects.toThrow();
  expect(congelar).not.toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
});
test('CA-VS03 conserva admisión legada y usa dimensiones congeladas para miembros vigentes', async () => {
  const legado = preparar({ requiere: false });
  await expect(legado.tx(ops => ops.verificarPadron!('s', '1'))).resolves.toBeNull();
  const vigente = preparar({ padron: true, miembro: true, vigente: true });
  await expect(vigente.tx(ops => ops.verificarPadron!('s', '1'))).resolves.toEqual(miembro);
  const desvinculado = preparar({ padron: true, miembro: true });
  await expect(desvinculado.tx(ops => ops.verificarPadron!('s', '1'))).rejects.toMatchObject({ codigo: 'conflicto' });
});
