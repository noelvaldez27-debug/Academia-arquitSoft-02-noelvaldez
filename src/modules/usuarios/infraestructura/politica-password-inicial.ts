export function resolverPasswordInicialDni(valor: string | boolean | undefined, entorno = process.env.NODE_ENV): boolean {
  const habilitado = valor === true || valor === 'true';
  if (valor !== undefined && valor !== false && valor !== true && valor !== 'false' && valor !== 'true') {
    throw new Error('USUARIOS_PASSWORD_INICIAL_DNI debe ser true o false.');
  }
  if (habilitado && entorno !== 'test' && entorno !== 'development') {
    throw new Error('USUARIOS_PASSWORD_INICIAL_DNI solo puede activarse en test o development.');
  }
  return habilitado;
}
