import { AlcanceAdministrador, RolUsuario, Usuario } from '../dominio';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorValidacion } from '../dominio';
import { PostgresRegistroCiclo } from './postgres-registro-ciclo';

const usuario = Usuario.crearPostulante({
  nombre: 'Postulante sintético', dni: '12345678', correo: '12345678@sofia.edu',
  passwordHash: 'hash-sintetico', sedeId: '1', carrera: 'Medicina',
});
const actor = { id: '8', rol: RolUsuario.Administrador, sedeId: '1', alcanceAdministrador: AlcanceAdministrador.Sede };
const emision = { administradorId: '8', referencia: 'ref-sintetica', passwordHash: 'hash-sintetico' };

test('CA-VS01 la recuperación rechaza el DNI de otra sede antes de cambiar credenciales', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerrado: false }] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'SEDE', sedeId: '1' }] })
    .mockResolvedValueOnce({ rows: [{ id: '10', rol: 'POSTULANTE', activo: false, sedeId: '2' }] });
  const registro = new PostgresRegistroCiclo({ query });
  await expect(registro.guardar('ciclo', usuario, actor, emision)).rejects.toMatchObject({ name: 'ErrorAccesoDenegado' });
  expect(query).toHaveBeenCalledTimes(3);
});

test('CA-VS02 una carga que encuentra cerrado el ciclo rechaza la fila antes de cambiar la cuenta', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ cerrado: true }] });
  const registro = new PostgresRegistroCiclo({ query });
  await expect(registro.guardar('ciclo', usuario, actor, { ...emision, cargaId: 'lote' }))
    .rejects.toMatchObject({ name: 'ErrorValidacion' });
  expect(query).toHaveBeenCalledTimes(1);
});

test('la importación automática vincula un activo sin cambiar su cuenta o credenciales', async () => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT cerrado_en')) return { rows: [{ cerrado: false }] };
    if (sql.includes('SELECT alcance_administrador')) return { rows: [{ alcance: 'SEDE', sedeId: '1' }] };
    if (sql.includes('SELECT id::text, nombre, sede_id')) return { rows: [{ id: '10', nombre: 'Postulante sintético', sedeId: '1', activo: true, rol: 'POSTULANTE', alcance: null }] };
    if (sql.includes('SELECT ciclo_id::text')) return { rows: [] };
    if (sql.includes('SELECT id, nombre, dni')) return { rows: [{
      id: 10, nombre: 'Postulante sintético', dni: '12345678', correo: '12345678@sofia.edu',
      password_hash: 'hash-anterior', rol: 'POSTULANTE', activo: true, version_sesion: 1,
      password_provisional_hasta: null, sede_id: 1, carrera: 'Medicina', condicion: null,
      alcance_administrador: null,
    }] };
    return { rows: [] };
  });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  const resultado = await registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Derecho', condicion: null,
  }, actor, emitir);
  expect(resultado.resultado).toBe('vinculada');
  expect(emitir).not.toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE usuarios'))).toBe(false);
  expect(query.mock.calls.some(([sql]) => String(sql).includes("'VINCULADO'"))).toBe(true);
});

test('la importación automática rechaza una discrepancia de identidad antes de emitir credenciales', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerrado: false }] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'GENERAL', sedeId: null }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: '10', nombre: 'Otra Persona', sedeId: '1', activo: true, rol: 'POSTULANTE', alcance: null }] });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  await expect(registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, { ...actor, alcanceAdministrador: AlcanceAdministrador.General }, emitir)).rejects.toThrow(ErrorConflicto);
  expect(emitir).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledTimes(4);
});

test('la recuperación automática conserva credencial y estado, revoca sesiones y crea membresía', async () => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT cerrado_en')) return { rows: [{ cerrado: false }] };
    if (sql.includes('SELECT alcance_administrador')) return { rows: [{ alcance: 'GENERAL', sedeId: null }] };
    if (sql.includes('SELECT id::text, nombre, sede_id')) return { rows: [{ id: '10', nombre: 'Postulante sintético', sedeId: '1', activo: false, rol: 'POSTULANTE', alcance: null }] };
    if (sql.includes('SELECT ciclo_id::text')) return { rows: [] };
    if (sql.includes('SELECT EXISTS (SELECT 1 FROM auditoria_postulantes')) return { rows: [{ elegible: true }] };
    if (sql.includes('SELECT id, nombre, dni')) return { rows: [{
      id: 10, nombre: 'Postulante sintético', dni: '12345678', correo: '12345678@sofia.edu',
      password_hash: 'hash-anterior', rol: 'POSTULANTE', activo: true, version_sesion: 2,
      password_provisional_hasta: null, password_cambio_obligatorio: false, sede_id: 1, carrera: 'Medicina', condicion: null,
      alcance_administrador: null,
    }] };
    return { rows: [] };
  });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  const resultado = await registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Otra carrera', condicion: null,
  }, { ...actor, alcanceAdministrador: AlcanceAdministrador.General }, emitir);
  expect(resultado.resultado).toBe('recuperada');
  expect(emitir).not.toHaveBeenCalled();
  expect(resultado.usuario.passwordHash).toBe('hash-anterior');
  const recuperacion = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE usuarios SET activo = true'));
  expect(recuperacion?.[0]).not.toContain('password_hash');
  expect(recuperacion?.[0]).not.toContain('password_provisional_hasta');
  expect(recuperacion?.[0]).toContain('version_sesion = version_sesion + 1');
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO postulantes_ciclo'))).toBe(true);
});

test('una cuenta nueva obtiene credencial provisional y membresía dentro de la transacción', async () => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT cerrado_en')) return { rows: [{ cerrado: false }] };
    if (sql.includes('SELECT alcance_administrador')) return { rows: [{ alcance: 'GENERAL', sedeId: null }] };
    if (sql.includes('SELECT id::text, nombre, sede_id')) return { rows: [] };
    if (sql.includes('INSERT INTO usuarios')) return { rows: [{
      id: 20, nombre: 'Nuevo Sintético', dni: '12345678', correo: '12345678@sofia.edu',
      password_hash: 'hash-temporal', rol: 'POSTULANTE', activo: true, version_sesion: 1,
      password_provisional_hasta: new Date(), sede_id: 1, carrera: 'Medicina', condicion: null,
      alcance_administrador: null,
    }] };
    return { rows: [] };
  });
  const emitir = jest.fn().mockResolvedValue({ administradorId: '8', cargaId: 'carga', referencia: 'ref', passwordHash: 'hash-temporal' });
  const registro = new PostgresRegistroCiclo({ query } as never);
  const resultado = await registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Nuevo Sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, { ...actor, alcanceAdministrador: AlcanceAdministrador.General }, emitir);
  expect(resultado.resultado).toBe('creada');
  expect(resultado.usuario.passwordHash).toBe('hash-temporal');
  expect(emitir).toHaveBeenCalledTimes(1);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO postulantes_ciclo'))).toBe(true);
});

test('la importación automática vuelve a comprobar que el ciclo siga abierto', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ cerrado: true }] });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  await expect(registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, actor, emitir)).rejects.toThrow(ErrorValidacion);
  expect(query).toHaveBeenCalledTimes(1);
  expect(emitir).not.toHaveBeenCalled();
});

test('la importación automática respeta el alcance de sede del administrador', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerrado: false }] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'SEDE', sedeId: '2' }] });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  await expect(registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, actor, emitir)).rejects.toThrow(ErrorAccesoDenegado);
  expect(query).toHaveBeenCalledTimes(2);
  expect(emitir).not.toHaveBeenCalled();
});

test('la importación automática no vincula una cuenta que pertenece a otro ciclo activo', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerrado: false }] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'GENERAL', sedeId: null }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: '10', nombre: 'Postulante sintético', sedeId: '1', activo: true, rol: 'POSTULANTE', alcance: null }] })
    .mockResolvedValueOnce({ rows: [{ cicloId: 'otro-ciclo' }] });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  await expect(registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, { ...actor, alcanceAdministrador: AlcanceAdministrador.General }, emitir)).rejects.toThrow(ErrorValidacion);
  expect(query).toHaveBeenCalledTimes(5);
  expect(emitir).not.toHaveBeenCalled();
});

test('la importación automática no recupera una cuenta inactiva sin auditoría de archivo elegible', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerrado: false }] })
    .mockResolvedValueOnce({ rows: [{ alcance: 'GENERAL', sedeId: null }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: '10', nombre: 'Postulante sintético', sedeId: '1', activo: false, rol: 'POSTULANTE', alcance: null }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ elegible: false }] });
  const emitir = jest.fn();
  const registro = new PostgresRegistroCiclo({ query } as never);
  await expect(registro.ejecutarAutomaticoDesdeDatos('ciclo', {
    nombre: 'Postulante sintético', dni: '12345678', sedeId: '1', carrera: 'Medicina', condicion: null,
  }, { ...actor, alcanceAdministrador: AlcanceAdministrador.General }, emitir)).rejects.toThrow(ErrorConflicto);
  expect(query).toHaveBeenCalledTimes(6);
  expect(emitir).not.toHaveBeenCalled();
});
