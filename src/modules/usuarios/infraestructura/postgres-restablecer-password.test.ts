import type { Pool } from 'pg';
import { PostgresRestablecerPassword } from './postgres-restablecer-password';

function adaptar(query: jest.Mock) {
  const release = jest.fn();
  const pool = { connect: async () => ({ query, release }) } as unknown as Pool;
  return { adapter: new PostgresRestablecerPassword(pool), release };
}

test('restablece solo dentro del alcance, revoca sesiones y audita con el hash en una transacción', async () => {
  const venceEn = new Date('2030-01-02T03:04:05Z');
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'SEDE', sedeId: '2' }] })
    .mockResolvedValueOnce({ rows: [{ sedeId: '2' }] })
    .mockResolvedValueOnce({ rows: [{ venceEn }] })
    .mockResolvedValueOnce({ rows: [] });
  const { adapter, release } = adaptar(query);
  await expect(adapter.ejecutar('21', '8', 'bcrypt-hash-sintetico')).resolves.toEqual(venceEn);
  expect(query.mock.calls[0][0]).toBe('BEGIN');
  expect(query.mock.calls[3][0]).toContain("password_cambio_motivo = 'RESTABLECIMIENTO_ADMINISTRATIVO'");
  expect(query.mock.calls[3][0]).toContain('version_sesion = version_sesion + 1');
  expect(query.mock.calls[3][0]).toContain('INSERT INTO auditoria_credenciales_usuarios');
  expect(query.mock.calls[3][1]).toEqual(['21', 'bcrypt-hash-sintetico', '8']);
  expect(query.mock.calls[4][0]).toBe('COMMIT');
  expect(release).toHaveBeenCalledTimes(1);
});

test('revierte y no autoriza restablecer otra sede', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'SEDE', sedeId: '1' }] })
    .mockResolvedValueOnce({ rows: [{ sedeId: '2' }] })
    .mockResolvedValueOnce({ rows: [] });
  const { adapter, release } = adaptar(query);
  await expect(adapter.ejecutar('21', '8', 'hash-sintetico')).resolves.toBeNull();
  expect(query.mock.calls[3][0]).toBe('ROLLBACK');
  expect(release).toHaveBeenCalledTimes(1);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE usuarios SET password_hash'))).toBe(false);
});
