NOTES & SILLAGE - EJECUCION LOCAL
==================================

Requisitos
----------
- Un navegador web actualizado.
- Python 3 para iniciar un servidor local.

Este proyecto es un sitio estatico hecho con HTML, CSS y JavaScript. No
requiere instalar dependencias, compilar codigo ni configurar una base de datos.

Opcion recomendada: servidor local con Python
---------------------------------------------
1. Abre una terminal.
2. Entra a la carpeta del proyecto:

   cd /Users/alexsander/Desktop/proyectos/notes-and-sillage

3. Inicia el servidor:

   python3 -m http.server 8000

4. Abre en el navegador:

   http://localhost:8000

   Puedes abrir el navegador de estas formas:

   - Google Chrome: abre Chrome, escribe http://localhost:8000 en la barra
     de direcciones y presiona Enter.
   - Safari: abre Safari, escribe http://localhost:8000 en la barra de
     direcciones y presiona Enter.
   - Desde la terminal en macOS, ejecuta:

     open http://localhost:8000

5. Para detener el servidor, vuelve a la terminal y presiona Ctrl + C.

Abrir dentro de Visual Studio Code
----------------------------------
Con el servidor de Python ejecutándose, puedes ver el sitio sin salir de
Visual Studio Code:

1. Presiona Cmd + Shift + P.
2. Escribe y selecciona "Simple Browser: Show".
3. Ingresa la dirección:

   http://localhost:8000

4. Presiona Enter.

El navegador se abrirá como una pestaña dentro de Visual Studio Code.

Opcion alternativa: Live Server en Visual Studio Code
-----------------------------------------------------
1. Abre la carpeta notes-and-sillage en Visual Studio Code.
2. Instala la extension "Live Server" si aun no la tienes.
3. Abre index.html.
4. Ejecuta "Open with Live Server" desde el menu contextual o el boton
   "Go Live".

El sitio se abrira en el navegador predeterminado con una direccion local
indicada por la extension.

Archivos principales
--------------------
- index.html: estructura de la pagina.
- css/estilos.css: estilos responsive.
- js/base-datos.js: catalogo, precios y datos de contacto.
- js/app.js: busqueda, carrito, mapa olfativo y pedido por WhatsApp.

Para ver cambios
----------------
Guarda los archivos modificados y recarga el navegador. Si usas Live Server,
la pagina se recargara automaticamente.
