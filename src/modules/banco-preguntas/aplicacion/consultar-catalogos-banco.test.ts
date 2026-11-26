import { ConsultarCatalogosBanco } from './consultar-catalogos-banco';

it('autoriza catálogo docente y reserva asignaciones y configuraciones al administrador general', async () => {
  const consultas = {
    cursos: jest.fn().mockResolvedValue([{ id: 'a', nombre: 'Curso A' }, { id: 'b', nombre: 'Curso B' }]),
    simulacros: jest.fn().mockResolvedValue([]),
    docentes: jest.fn().mockResolvedValue([]),
  };
  const caso = new ConsultarCatalogosBanco(consultas);
  const docente = { id: '7', permiso: 'docente' as const };
  const opciones = { pagina: 2, limite: 1, q: 'Curso' };
  await expect(caso.cursos(docente, opciones)).resolves.toEqual({ datos: [{ id: 'a', nombre: 'Curso A' }], pagina: 2, hayMas: true });
  expect(() => caso.cursos({ ...docente, permiso: 'ninguno' }, opciones)).toThrow();
  expect(() => caso.simulacros(docente, opciones)).toThrow();
  expect(() => caso.docentes(docente, 'curso', opciones)).toThrow();
  expect(consultas.simulacros).not.toHaveBeenCalled();
  expect(consultas.docentes).not.toHaveBeenCalled();
  const general = { id: '1', permiso: 'general' as const };
  await caso.simulacros(general, opciones);
  await caso.docentes(general, 'curso', opciones);
  expect(consultas.docentes).toHaveBeenCalledWith('curso', opciones);
});
