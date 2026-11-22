export class ErrorValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorValidacion';
  }
}

export class ErrorConflicto extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConflicto';
  }
}

export class ErrorAccesoDenegado extends Error {
  constructor(mensaje: string = 'Acceso denegado.') {
    super(mensaje);
    this.name = 'ErrorAccesoDenegado';
  }
}

export class ErrorNoAutenticado extends Error {
  constructor(mensaje: string = 'Acceso no autorizado.') {
    super(mensaje);
    this.name = 'ErrorNoAutenticado';
  }
}

export class ErrorAutenticacion extends Error {
  constructor(mensaje: string = 'Credenciales invalidas o cuenta no activa.') {
    super(mensaje);
    this.name = 'ErrorAutenticacion';
  }
}

export class ErrorNoEncontrado extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNoEncontrado';
  }
}
