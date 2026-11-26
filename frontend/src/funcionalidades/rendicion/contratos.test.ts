import { formatoTiempo, restante, type Reloj } from './contratos';
import { proximaRevision, retencionMs } from './cola-local';

it('proyecta la cuenta regresiva desde el dato del servidor y la detiene en cero', () => {
  const origen = { intento: { tiempoRestanteMs: 2100 }, recibidoEn: 1000 } as Reloj;
  expect(restante(origen, 900)).toBe(2100);
  expect(formatoTiempo(restante(origen, 1100))).toBe('00:02');
  expect(formatoTiempo(restante(origen, 3500))).toBe('00:00');
});

it('encadena solo las revisiones de la misma pregunta y respeta la revisión confirmada mayor', () => {
  const cola = [{ numero: 1, revisionBase: 2 }, { numero: 1, revisionBase: 3 }, { numero: 2, revisionBase: 9 }];
  expect(proximaRevision(cola, 1, 2)).toBe(4);
  expect(proximaRevision(cola, 1, 5)).toBe(5);
  expect(proximaRevision(cola, 3, 0)).toBe(0);
  expect(retencionMs).toBe(86400000);
});
