export class ErrorRendicion extends Error {
  constructor(readonly codigo: 'invalido' | 'no-encontrado' | 'conflicto' | 'vencido', mensaje: string) {
    super(mensaje);
  }
}
