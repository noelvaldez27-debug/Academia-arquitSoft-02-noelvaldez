import type { Pool } from 'pg';
import { PostgresConsultarHistorialCredenciales } from './postgres-consultar-historial-credenciales';

function adaptar(query: jest.Mock) {
  const release = jest.fn();
  const pool = { connect: async () => ({ query, release }) } as unknown as Pool;
  return { adapter: new PostgresConsultarHistorialCredenciales(pool), release };
}

test('devuelve estado sin hash y lista vacía cuando aún no hay auditoría', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ cambioObligatorio: false, venceEn: null }] })
    .mockResolvedValueOnce({ rows: [{ total: '0' }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });
  const { adapter, release } = adaptar(query);
  await expect(adapter.consultar('21', '8', 1, 20)).resolves.toEqual({
    cambioObligatorio: false, venceEn: null, eventos: [], total: 0,
  });
  expect(query.mock.calls[1][0]).toContain("a.rol = 'ADMINISTRADOR'");
  expect(query.mock.calls[1][0]).toContain("u.rol = 'POSTULANTE'");
  expect(query.mock.calls[3][1]).toEqual(['21', 20, 0]);
  expect(query.mock.calls.every(([sql]) => !String(sql).includes('password_hash'))).toBe(true);
  expect(release).toHaveBeenCalledTimes(1);
});

test('devuelve eventos recientes con responsable y paginación sin exponer credenciales', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ cambioObligatorio: true, venceEn: new Date('2030-01-02T03:04:05Z') }] })
    .mockResolvedValueOnce({ rows: [{ total: '3' }] })
    .mockResolvedValueOnce({ rows: [{ id: '3', evento: 'CAMBIO_OBLIGATORIO', creadoEn: new Date('2030-01-01T00:00:00Z'), actorId: '21', actorNombre: 'Estudiante Sintético' }] })
    .mockResolvedValueOnce({ rows: [] });
  const { adapter } = adaptar(query);
  const resultado = await adapter.consultar('21', '8', 2, 1);
  expect(resultado?.eventos[0]).toEqual({ id: '3', evento: 'CAMBIO_OBLIGATORIO',
    creadoEn: '2030-01-01T00:00:00.000Z', actor: { id: '21', nombre: 'Estudiante Sintético' } });
  expect(resultado?.total).toBe(3);
  expect(query.mock.calls[3][1]).toEqual(['21', 1, 1]);
});

test('no revela ni consulta historial de estudiantes fuera de la sede', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });
  const { adapter } = adaptar(query);
  await expect(adapter.consultar('21', '8', 1, 20)).resolves.toBeNull();
  expect(query.mock.calls[2][0]).toBe('ROLLBACK');
});
