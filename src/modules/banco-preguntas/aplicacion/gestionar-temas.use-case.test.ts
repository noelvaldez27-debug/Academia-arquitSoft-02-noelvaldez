import { GestionarTemasUseCase } from './gestionar-temas.use-case';
import { Tema } from '../dominio/tema-repository';

const general = { id: 'admin', permiso: 'general' } as const;
const docente = { id: 'docente', permiso: 'docente' } as const;

function preparar() {
  const temas = new Map<string, Tema>();
  const casos = new GestionarTemasUseCase({
    crear: async tema => { temas.set(tema.id, tema); return tema; },
    actualizar: async (id, cambios) => {
      const tema = { ...temas.get(id)!, ...cambios };
      temas.set(id, tema);
      return tema;
    },
    listar: async cursoId => [...temas.values()].filter(tema => tema.cursoId === cursoId && tema.activo),
  }, async id => id === 'c1' || id === 'c2', async () => ['c1'], () => 't1');
  return casos;
}

test('CA-AE05 el administrador general crea, renombra y desactiva temas', async () => {
  const casos = preparar();
  expect(await casos.crear(general, 'c1', ' Algebra ')).toMatchObject({ nombre: 'Algebra', activo: true });
  expect(await casos.editar(general, 't1', 'Geometria')).toMatchObject({ nombre: 'Geometria' });
  expect(await casos.listar(docente, 'c1')).toHaveLength(1);
  expect(await casos.desactivar(general, 't1')).toMatchObject({ activo: false });
  expect(await casos.listar(docente, 'c1')).toEqual([]);
});

test('CA-AE05 se restringen las mutaciones y la consulta docente por curso', async () => {
  const casos = preparar();
  await expect(casos.crear(docente, 'c1', 'Tema')).rejects.toMatchObject({ tipo: 'acceso' });
  await expect(casos.editar(docente, 't1', 'Tema')).rejects.toMatchObject({ tipo: 'acceso' });
  await expect(casos.desactivar(docente, 't1')).rejects.toMatchObject({ tipo: 'acceso' });
  await expect(casos.listar(docente, 'c2')).rejects.toMatchObject({ tipo: 'acceso' });
  await expect(casos.crear(general, 'c1', ' ')).rejects.toMatchObject({ tipo: 'validacion' });
});
