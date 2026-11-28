import { ErrorAccesoDenegado, ErrorValidacion } from '../dominio';
import type { ConsultaHistorialCredencialesPort } from './consultar-historial-credenciales.port';

export class ConsultarHistorialCredencialesUseCase {
  constructor(private readonly consulta: ConsultaHistorialCredencialesPort) {}

  async ejecutar(targetId: string, actorId: string, paginaEntrada?: unknown, limiteEntrada?: unknown) {
    if (!/^\d+$/.test(targetId) || !/^\d+$/.test(actorId)) {
      throw new ErrorValidacion('El identificador de usuario no es válido.');
    }
    const pagina = numeroPositivo(paginaEntrada, 1, 'página');
    const limite = numeroPositivo(limiteEntrada, 20, 'límite');
    if (limite > 50) throw new ErrorValidacion('El límite máximo por página es 50.');
    const datos = await this.consulta.consultar(targetId, actorId, pagina, limite);
    if (!datos) throw new ErrorAccesoDenegado('No se puede consultar el historial de este estudiante.');
    return {
      estado: { cambioObligatorio: datos.cambioObligatorio, venceEn: datos.venceEn },
      eventos: datos.eventos,
      paginacion: { pagina, limite, total: datos.total },
    };
  }
}

function numeroPositivo(valor: unknown, defecto: number, etiqueta: string): number {
  if (valor === undefined) return defecto;
  const texto = String(valor);
  if (!/^\d+$/.test(texto) || Number(texto) < 1 || !Number.isSafeInteger(Number(texto))) {
    throw new ErrorValidacion(`El parámetro ${etiqueta} debe ser un entero positivo.`);
  }
  return Number(texto);
}
