// Este archivo es un shim para que la importación de dotenv no cause errores en el navegador
export default {
  config: () => {
    // No hacemos nada en el navegador
    console.log('dotenv shim: No se requiere cargar .env en el navegador');
  }
};
