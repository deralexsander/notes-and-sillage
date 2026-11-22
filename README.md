<div align="center">

# 🌸 Notes & Sillage — Plataforma Comercial & Catálogo Digital de Fragancias

**Emprendimiento propio de perfumería fina de inspiración en Chile**  
*Notas que cautivan, una estela que perdura.*

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/es/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/es/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS%20%26%20SSL-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![ntfy](https://img.shields.io/badge/ntfy.sh-Push%20Notifications-4285F4?style=for-the-badge&logo=googlemessages&logoColor=white)](https://ntfy.sh/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)
[![Dominio](https://img.shields.io/badge/Dominio-notes.cl-111111?style=for-the-badge&logo=googlechrome&logoColor=white)](https://notes.cl/)

[🌐 Ver catálogo en producción: notes.cl](https://notes.cl/)
</div>

---

## 📌 1. ¿Qué es Notes & Sillage?

**Notes & Sillage** es una solución web integral diseñada y construida para gestionar de punta a punta un emprendimiento real de venta de fragancias y perfumería fina de inspiración en Chile.

Nació para solucionar dos problemas críticos en el comercio digital independiente:

1. **Para los Clientes (Front-Office):** Evitar las interminables y desordenadas listas de precios en PDF o mensajes de texto por WhatsApp. El cliente accede a una experiencia ultra fluida, rápida y optimizada para celulares donde puede buscar fragancias por nombre, código o notas aromáticas, visualizar frascos, elegir tamaños, calcular totales y enviar su pedido con un toque a WhatsApp, registrándose automáticamente en la nube.
2. **Para el Emprendedor / Administrador (Back-Office):** Centralizar la contabilidad, cobranza y logística de compras en una única plataforma en tiempo real con **Google Firebase Firestore**. Permite agrupar pedidos en lotes para el proveedor, monitorear la meta de **envío gratis ($120.000)**, cobrar a clientes morosos mediante mensajes preescritos con un clic, gestionar los saldos y deducir capitales de inversión (ej. **$150.000 de capital de Octubre**).

El proyecto fue desarrollado bajo una arquitectura **Serverless Jamstack**, sin costes mensuales de servidores backend ni mantenimiento de bases de datos relacionales tradicionales, garantizando disponibilidad 24/7 y velocidad instantánea.

---

## 🏗️ 2. Arquitectura del Sistema

```text
                                  ┌───────────────────────────┐
                                  │   Cliente (Navegador)     │
                                  │   https://notes.cl        │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌─────────────────────────┐       ┌───────────────────────────┐       ┌─────────────────────────┐
│   GitHub Pages          │◄─────►│    Cloudflare Edge        │◄─────►│   Google Firestore      │
│   (Hosting Estático)    │       │   (DNS, SSL & Redirección)│       │   (Base de Datos NoSQL) │
└─────────────────────────┘       └─────────────┬─────────────┘       └────────────┬────────────┘
                                                │                                  │
                                                ▼                                  ▼
                                  ┌───────────────────────────┐       ┌─────────────────────────┐
                                  │   ntfy.sh (Push Alertas)  │◄──────┤   Planilla de Ventas    │
                                  │   (Móvil del Administrador│       │   https://notes.cl/     │
                                  │   pedidos & total acumul) │       │   ventas.html           │
                                  └───────────────────────────┘       └─────────────────────────┘
```

### Componentes clave

* **Catálogo para Clientes (`catalogo.html` + `js/app.js`):** Interfaz pública mobile-first con renderizado reactivo, buscador con tolerancia a errores tipográficos, mapa olfativo, carrito flotante y asistente de cambios/cancelaciones.
* **Control de Ventas y Finanzas (`ventas.html` + `js/ventas.js`):** Hoja de cálculo interactiva conectada en vivo a Firestore. Calcula márgenes de ganancia unitarios y totales, agrupa compras por lotes para el proveedor, gestiona cobranzas y balances financieros.
* **Historial y Análisis de Pedidos Proveedor (`pedidos.html` + `js/pedidos.js`):** Cuadro de mando histórico con métricas consolidadas de compras a Parfums, análisis de productos más pedidos e inventario de regalías.
* **Capa de Notificaciones Inmediatas (ntfy.sh):** Envío automático de notificaciones push de alta prioridad al teléfono del administrador tanto del pedido unitario entrante como del total acumulado de compras pendientes.

---

## ✨ 3. Módulos y Funcionalidades Detalladas

### 3.1. Catálogo Digital y Carrito Interactivo (Front-Office)

| Característica                                   | Descripción y Valor Comercial                                                                                                                                      |
| :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔎 **Búsqueda Inteligente y Códigos**     | Permite buscar por código de fragancia (ej. `H-13`, `F-57`), nombre del perfume original o notas aromáticas. Normaliza mayúsculas, minúsculas y tildes.     |
| 💡 **Sugerencia "¿Quisiste decir...?"**    | Algoritmo basado en distancia de Levenshtein que detecta errores tipográficos (ej. `sandal 33`) y sugiere el perfume exacto de la base de datos (`Santal 33`). |
| 🧭 **Mapa Olfativo Femenino y Masculino**   | Brújula visual interactiva que organiza las fragancias desde frescas/ligeras hasta intensas/cálidas categorizadas por familias olfativas con guía cromática.    |
| 🧴 **Selector de Formato Dinámico**        | Cada perfume ofrece opciones de 100 ml, 50 ml y 20 ml, actualizando el precio y costo de forma inmediata.                                                           |
| 🛒 **Carrito Flotante con Persistencia**    | Barra inferior persistente que calcula subtotales, permite editar unidades y valida el ingreso del nombre y teléfono del comprador.                                |
| 🔄 **Asistente de Cambios y Cancelaciones** | Módulo asistido unidad por unidad para clientes que ya enviaron un pedido y necesitan reemplazar un aroma o cancelar unidades antes de que se despache.            |
| 📱 **Pedido Instantáneo por WhatsApp**     | Genera el texto estructurado del pedido con un clic hacia el número del vendedor, dejando el carrito limpio para una nueva compra.                                 |

---

### 3.2. Planilla de Ventas y Control de Cobranzas (Back-Office)

| Característica                                    | Descripción y Valor Comercial                                                                                                                                                                                             |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚡ **Sincronización en Vivo (Firestore)**   | Lectura y escritura asíncrona en la colección `ventas` con estados dinámicos (`Pendiente`, `Pedido`, `Recepcionado`, `Entregado`, `Cancelado`).                                                             |
| 📦 **Agrupación por Lotes de Proveedor**    | Clasifica automáticamente los perfumes en compras históricas cerradas o compras pendientes. Permite seleccionar pendientes y sellar un nuevo lote de pedido con fecha.                                                   |
| 🚚 **Monitoreo de Envío Gratis ($120.000)** | Barra e indicador en tiempo real en la cabecera de pendientes que calcula cuánto dinero en compras al proveedor falta para obtener **envío gratis** (leído dinámicamente de Firestore y editable).               |
| 💰 **Módulo "Faltantes por Pagar"**         | Vista filtrada exclusiva que reúne a todos los clientes con pedidos entregados que aún no han pagado (`estado === "Entregado"` y `pagado === false`), con monto total por cobrar.                                    |
| 📲 **Cobro Amable por WhatsApp en 1 Clic**   | Botón directo de cobro que abre una conversación con mensaje preescrito amable, detallando el pedido, el total a transferir y los **datos de cuenta bancaria del vendedor** (Mercado Pago / Christian Fuentealba). |
| ✅ **Baja Inmediata al Marcar Pagado**       | Botón directo "Marcar Pagado" que actualiza Firestore a `pagado: true`, emite una alerta flotante y **remueve al cliente de la tabla de faltantes en tiempo real**.                                               |
| 📊 **Métricas y Rendimiento Financiero**    | Tablero con tarjetas KPI (Venta Total, Ganancia Neta, Costo de Mercadería, Perfumes Vendidos, Margen Medio %) y gráficos interactivos con **Chart.js** (Top Fragancias, Top Instituciones y Top Clientes).         |

---

### 3.3. Módulo "Gastos y Balances" y Capital de Octubre

Ubicado en la barra superior de `ventas.html`, este centro de configuración permite:

1. **Configuración de Envío Gratis:** Modificar en cualquier momento el umbral de envío gratis (por defecto `$120.000`), impactando de inmediato en el cálculo de pendientes y en las alertas móviles.
2. **Datos Bancarios de Cobranza:** Mantener actualizados el titular, RUT, banco, tipo de cuenta, número de cuenta y correo electrónico para las plantillas de WhatsApp sin tocar una sola línea de código.
3. **Balance Especial de Octubre ($150.000 de Capital):**
   * Incorpora un capital de **$150.000 CLP** generado en Octubre.
   * Se registra en los egresos y **se resta del total de ganancias de Octubre**, reflejando la rentabilidad neta real del negocio.
4. **Registro de Nuevos Gastos Operacionales:** Registro categorizado de gastos (Insumos, Bolsas, Fletes, Membresías) con impacto directo en los balances.

---

### 3.4. Sistema de Alertas Móviles Push (ntfy.sh)

Cuando un cliente confirma un pedido desde el catálogo digital, se activan dos despachos automáticos en segundo plano:

1. **Canal de Pedido Unitario (`ntfy.sh/pedidos-notesandsillage-2042`):**Alerta con sonido y vibración indicando cliente, teléfono, institución, desglose de perfumes y enlace de contacto directo.
2. **Canal de Acumulado de Pendientes (`ntfy.sh/total-pedidos-pendientes-notes-and-sillage`):**
   Alerta con el resumen consolidado de todos los pedidos pendientes acumulados, inversión requerida y el saldo restante exacto para alcanzar el envío gratis de $120.000 con el proveedor.

---

## 📸 4. Guía Visual del Catálogo (Docs e Imágenes)

A continuación se presentan capturas recientes de la experiencia en un viewport móvil de 390 × 844 px. Muestran el catálogo público y sus flujos principales. Los datos visibles en los formularios son de ejemplo; no se envió ningún pedido.

| Catálogo y tendencias | Búsqueda por código |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/01-catalogo-inicio.png" alt="Catálogo móvil con tendencias, tamaños y precios" width="220"> <br> *Tendencias, categorías, tarjetas, tamaños y precios.* | <img src="docs/imagenes/imagenes readme/02-busqueda-por-codigo.png" alt="Resultado de buscar la fragancia H-13" width="220"> <br> *Búsqueda por código, nombre o aroma.* |

| Catálogo de fragancias femeninas |
| :---: |
| <img src="docs/imagenes/imagenes readme/05-catalogo-mujer.png" alt="Catálogo móvil de perfumería fina femenina" width="220"> <br> *Tarjetas con imagen, familia aromática, tamaños y precios.* |

| Mapa olfativo femenino | Mapa olfativo masculino |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/03-mapa-olfativo-mujer.png" alt="Mapa olfativo femenino por intensidad y familia" width="220"> <br> *Familias aromáticas, colores e intensidad.* | <img src="docs/imagenes/imagenes readme/04-mapa-olfativo-hombre.png" alt="Mapa olfativo masculino por intensidad y familia" width="220"> <br> *Exploración de fragancias masculinas.* |

| Búsqueda y sugerencias | Aroma y tema oscuro |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/08-buscador-placeholder.png" alt="Buscador del catálogo en móvil" width="220"> <br> *Acceso rápido al buscador desde el celular.* | <img src="docs/imagenes/imagenes readme/09-sugerencia-busqueda.png" alt="Sugerencia de búsqueda para corregir un error tipográfico" width="220"> <br> *Corrección inteligente de errores al buscar.* |

| Notas y familias olfativas | Modo oscuro |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/10-notas-olfativas.png" alt="Tarjetas de fragancias con notas aromáticas" width="220"> <br> *Familia y presentación visual de cada perfume.* | <img src="docs/imagenes/imagenes readme/18-modo-oscuro.png" alt="Catálogo móvil con tema oscuro activo" width="220"> <br> *Alternancia entre tema claro y oscuro.* |

| Carrito flotante | Revisión del pedido |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/06-barra-de-carrito.png" alt="Barra fija del carrito con cantidad y total" width="220"> <br> *Resumen persistente de productos y total.* | <img src="docs/imagenes/imagenes readme/07-resumen-del-pedido.png" alt="Carrito con productos y controles de cantidad" width="220"> <br> *Edición de unidades y datos de contacto.* |

| Datos del pedido | Privacidad de datos |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/12-confirmar-pedido.png" alt="Formulario móvil de datos de contacto y revisión del pedido" width="220"> <br> *Formulario de contacto y opción para recordar datos.* | <img src="docs/imagenes/imagenes readme/17-privacidad-de-datos.png" alt="Explicación de uso y almacenamiento de datos del cliente" width="220"> <br> *Información transparente sobre el uso de datos.* |

| Ayuda para cambios | Selección de pedido a modificar |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/11-globo-ayuda.png" alt="Ayuda flotante para cambios y cancelaciones" width="220"> <br> *Acceso guiado a cambios y cancelaciones.* | <img src="docs/imagenes/imagenes readme/13-modo-cambio-catalogo.png" alt="Catálogo móvil en modo de cambio o cancelación" width="220"> <br> *Selección de los perfumes incluidos en el pedido.* |

| Decisión por unidad | Revisión del cambio |
| :---: | :---: |
| <img src="docs/imagenes/imagenes readme/14-cambio-por-unidad.png" alt="Opciones para mantener, cambiar o cancelar una unidad" width="220"> <br> *Mantener, reemplazar o cancelar cada unidad.* | <img src="docs/imagenes/imagenes readme/15-resumen-cambio.png" alt="Resumen de la decisión y perfume de reemplazo" width="220"> <br> *Revisión de la fragancia elegida como reemplazo.* |

| Solicitud de cambio lista para enviar |
| :---: |
| <img src="docs/imagenes/imagenes readme/16-confirmar-cambio.png" alt="Resumen final de cambio y formulario de nombre" width="220"> <br> *Resumen final antes de enviar la solicitud por WhatsApp.* |

---

## 🛠️ 5. Tecnologías Empleadas

| Área                     | Herramientas y Librerías                                                                                  |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- |
| **Frontend**        | HTML5 semántico, CSS3 Vanilla con variables CSS y diseño responsive mobile-first.                        |
| **Lógica**         | JavaScript Vanilla moderno (ES6+ Modules, Async/Await, Fetch API, LocalStorage).                           |
| **Backend / DB**    | Google Firebase (Cloud Firestore NoSQL Database y Firebase Authentication).                                |
| **Gráficos**       | [Chart.js 4.4](https://www.chartjs.org/) para visualización interactiva de ventas y ranking de fragancias. |
| **Íconos**         | [Lucide Icons](https://lucide.dev/) (iconografía SVG modular y liviana).                                   |
| **Notificaciones**  | [ntfy.sh](https://ntfy.sh/) (API REST HTTP para alertas push inmediatas a smartphones Android/iOS).         |
| **Infraestructura** | GitHub Pages (CI/CD continuo desde rama `main`), NIC Chile y Cloudflare.                                 |

---

## 📂 6. Estructura del Repositorio

```text
notes-and-sillage/
├── .gitignore                          # Archivos y carpetas ignorados por Git
├── README.md                           # Documentación exhaustiva y preservación técnica del proyecto
├── docs/                               # Documentación oficial y recursos de soporte
│   ├── dominio/                        # Respaldos y registros oficiales del dominio
│   │   ├── certificados/               # Certificado de registro oficial NIC Chile (.cl)
│   │   └── cname/                      # Archivo CNAME de configuración de dominio
│   └── imagenes/                       # Recursos visuales y capturas del sistema
│       ├── imagenes promocional/       # Favicons, tarjetas de presentación, logos HD y QR
│       └── imagenes readme/            # 18 capturas de pantalla documentadas para este README
├── funciones/                          # Lógica y estilos del sistema
│   ├── css/                            # Hojas de estilo modular
│   │   ├── estilos.css                 # Estilos del catálogo, buscador, animaciones y tema oscuro
│   │   ├── gastos.css                  # Estilos del módulo de control de gastos
│   │   ├── pedidos.css                 # Estilos del cuadro de mando del historial de pedidos
│   │   └── ventas.css                  # Estilos de la planilla de ventas, modales y tablas financieras
│   └── js/                             # Scripts y módulos JavaScript ES6+
│       ├── app.js                      # Lógica del catálogo: carrito, buscador, sugerencias y ntfy
│       ├── firebase-config.js          # Conexión, autenticación y operaciones CRUD en Firestore
│       ├── gastos.js                   # Lógica y persistencia del control de gastos
│       ├── lucide.min.js               # Librería local de iconografía SVG
│       ├── pedidos-data.js             # Dataset histórico consolidado de compras a Parfums
│       ├── pedidos.js                  # Lógica interactiva de pedidos históricos
│       ├── settings-modal.js           # Modal global de configuración y tema
│       └── ventas.js                   # Lógica completa de ventas, lotes, balances y cobranzas
├── paginas/                            # Vistas y pantallas HTML del sistema
│   ├── catalogo.html                   # Catálogo digital interactivo orientado a clientes
│   ├── gastos.html                     # Control y registro de egresos y gastos del negocio
│   ├── pedidos.html                    # Historial mensual consolidado de compras al proveedor
│   └── ventas.html                     # Planilla en vivo de ventas, finanzas, lotes y cobranzas
└── productos/                          # Banco de imágenes del catálogo comercial
    ├── black and red/                  # Fotografías de líneas Black & Red Parfums
    ├── colonias/                       # Colonias para hombre y mujer (400ml)
    ├── cremas/                         # Línea de cremas y cosmética
    ├── no-img/                         # Imagen de fallback para productos sin fotografía
    └── perfumes/                       # Fragancias femeninas, masculinas y línea teen
```

---

## 👤 Autor y Contacto

Proyecto concebido, diseñado y programado por **Alexsander Muñoz**.

* [GitHub: @deralexsander](https://github.com/deralexsander)
* [Sitio Oficial en Producción: notes.cl](https://notes.cl/)

---

<div align="center">
Hecho con dedicación para <strong>Notes & Sillage</strong> 🌸
</div>
