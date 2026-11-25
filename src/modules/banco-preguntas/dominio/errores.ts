export class ErrorBancoPreguntas extends Error {
  constructor(readonly tipo: 'validacion' | 'acceso' | 'no-encontrado' | 'conflicto', mensaje: string) {
    super(mensaje);
  }
}
