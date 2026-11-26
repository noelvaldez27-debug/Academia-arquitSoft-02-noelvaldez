import type { CacheConsultas } from '../../../compartido/aplicacion/cache-consultas.port';
import type { SimulacroParaRendicion } from '../aplicacion/gestionar-simulacros.use-case';

export async function consultarVersionVisible(
  id: string,
  consultar: () => Promise<SimulacroParaRendicion>,
  cache?: CacheConsultas,
  despuesDeConfirmar?: (accion: () => Promise<void>) => void,
): Promise<SimulacroParaRendicion> {
  if (!cache || !despuesDeConfirmar) return consultar();
  const clave = 'banco:version-visible:v1:' + id;
  const vigente = await cache.leer(clave, (valor): valor is SimulacroParaRendicion => {
    if (!valor || typeof valor !== 'object') return false;
    const dto = valor as SimulacroParaRendicion;
    return dto.id === id && Number.isFinite(dto.duracionMinutos) && Array.isArray(dto.preguntas)
      && dto.preguntas.length > 0 && dto.preguntas.every(p => p && typeof p.id === 'string'
        && typeof p.cursoId === 'string' && typeof p.enunciado === 'string' && p.alternativas
        && ['A', 'B', 'C', 'D', 'E'].every(k => typeof p.alternativas[k as keyof typeof p.alternativas] === 'string'));
  });
  if (!vigente) {
    const version = await consultar();
    despuesDeConfirmar(() => cache.guardar(clave, version, 3600));
    return version;
  }
  return {
    id: vigente.id, duracionMinutos: vigente.duracionMinutos,
    preguntas: vigente.preguntas.map(({ id, cursoId, enunciado, alternativas: { A, B, C, D, E } }) =>
      ({ id, cursoId, enunciado, alternativas: { A, B, C, D, E } })),
  };
}
