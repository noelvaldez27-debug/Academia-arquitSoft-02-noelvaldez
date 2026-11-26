import { AlcanceAdministrador, RolUsuario, Usuario } from '../dominio';
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
