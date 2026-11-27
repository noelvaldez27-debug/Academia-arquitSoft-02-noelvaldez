import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { usarSesion } from '../../app/sesion';
import { CargasExcel } from './cargas';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));

const solicitar = jest.fn();
const cicloId = '12345678-1234-1234-1234-123456789012';

beforeEach(() => {
  solicitar.mockReset();
  jest.mocked(usarSesion).mockReturnValue({
    solicitar, sesion: null, vencida: false, aviso: '', salir: jest.fn(), completarCambio: jest.fn(),
    ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
  solicitar.mockImplementation(async (ruta: string, opciones?: { method?: string }) => {
    if (ruta === '/api/usuarios/ciclos') return [{ id: cicloId, nombre: 'Ciclo Sintético', cerradoEn: null }];
    if (ruta === '/api/usuarios/cargas-masivas?pagina=1') return { cargas: [], pagina: 1, hayMas: false };
    if (ruta === '/api/usuarios/cargas-masivas?cicloId=' + cicloId && opciones?.method === 'POST') return { id: 'carga-sintetica' };
    if (ruta === '/api/usuarios/cargas-masivas/carga-sintetica') return {
      id: 'carga-sintetica', estado: 'COMPLETADA', cicloNombre: 'Ciclo Sintético', totalFilas: 4,
      creadas: 1, recuperadas: 1, vinculadas: 1, yaExistian: 1, rechazadas: 0, errores: [], avisos: [],
    };
    return {};
  });
});

it('selecciona el único ciclo abierto, lo envía con el XLSX y muestra el resumen del ciclo', async () => {
  const confirmar = jest.spyOn(window, 'confirm').mockReturnValue(true);
  const archivo = new File(['XLSX sintético'], 'estudiantes-ficticios.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  class DatosFormulario {
    get(nombre: string) { return nombre === 'archivo' ? archivo : nombre === 'cicloId' ? cicloId : null; }
    append() { /* El contenido se transporta como FormData por el cliente REST. */ }
  }
  Object.defineProperty(globalThis, 'FormData', { configurable: true, value: DatosFormulario });
  render(<CargasExcel />);

  const entrada = screen.getByLabelText('Archivo Excel (.xlsx)') as HTMLInputElement;
  fireEvent.submit(entrada.closest('form')!);

  await waitFor(() => expect(solicitar).toHaveBeenCalledWith(
    '/api/usuarios/cargas-masivas?cicloId=' + cicloId,
    expect.objectContaining({ method: 'POST' }),
  ));
  expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('recuperar cuentas archivadas elegibles'));
  expect(await screen.findByText('Vinculadas')).toBeVisible();
  expect(screen.getByText('Vinculadas').parentElement).toHaveTextContent('1');
  confirmar.mockRestore();
});
