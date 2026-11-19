import { crearApp } from './compartido/infraestructura';

const app = crearApp();
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Servidor EVALUA-NET escuchando en http://${host}:${port}`);
  console.log(`Documentación Swagger disponible en http://${host}:${port}/api-docs`);
});
