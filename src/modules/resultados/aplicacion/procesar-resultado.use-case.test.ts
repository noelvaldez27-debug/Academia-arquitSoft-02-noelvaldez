import { ProcesarResultadoUseCase } from './procesar-resultado.use-case';

it('CA-PR03 salta entregas repetidas tras persistir', async () => {
  const existePorExamen = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const guardarSiNoExiste = jest.fn();
  const consultar = jest.fn().mockResolvedValue({ examenId: 'e', postulanteId: 'u', simulacroId: 's', respuestas: [] });
  const clave = jest.fn().mockResolvedValue([{ preguntaId: 'p', cursoId: 'c', correcta: 'A' }]);
  const caso = new ProcesarResultadoUseCase({ existePorExamen, guardarSiNoExiste }, { consultar }, { clave });
  await caso.ejecutar('e');
  await caso.ejecutar('e');
  expect(consultar).toHaveBeenCalledTimes(1);
  expect(clave).toHaveBeenCalledWith('s');
  expect(guardarSiNoExiste).toHaveBeenCalledTimes(1);
  expect(guardarSiNoExiste).toHaveBeenCalledWith(expect.objectContaining({ omitidas: 1, puntajeCentesimos: 0 }));
});

it('CA-PR01 no persiste si falta el examen o su versión congelada', async () => {
  const consultar = jest.fn().mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ examenId: 'distinto' }).mockResolvedValue({ examenId: 'e', simulacroId: 's' });
  const clave = jest.fn().mockResolvedValue(null);
  const guardarSiNoExiste = jest.fn();
  const caso = new ProcesarResultadoUseCase({ existePorExamen: async () => false, guardarSiNoExiste }, { consultar }, { clave });
  await expect(caso.ejecutar('e')).rejects.toThrow('examen finalizado');
  await expect(caso.ejecutar('e')).rejects.toThrow('examen finalizado');
  await expect(caso.ejecutar('e')).rejects.toThrow('versión congelada');
  expect(guardarSiNoExiste).not.toHaveBeenCalled();
});
