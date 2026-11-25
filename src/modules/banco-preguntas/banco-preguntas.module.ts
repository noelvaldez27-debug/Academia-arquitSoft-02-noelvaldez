import { RepositoriosBanco } from './infraestructura/repositorios-banco';

export class BancoPreguntasModule {
  constructor(readonly repositorios: RepositoriosBanco) {}
}
