# Informe Fase 2 - Estabilizacion funcional critica

## 1. Resumen ejecutivo

Se aplico una estabilizacion funcional enfocada en los problemas criticos y altos detectados en la auditoria: exportaciones, adjuntos, reportes con datos insuficientes, contexto de empresa, fechas operativas, fichada manual, auditoria de empleados y mensajes engañosos.

El objetivo no fue agregar funcionalidad nueva ni redisenar el sistema, sino evitar comportamientos peligrosos para operacion real: archivos vacios exportados como validos, adjuntos perdidos o inaccesibles sin explicacion, reportes parciales presentados como completos, filtros multiempresa inconsistentes y acciones que aparentan resolverse sin confirmacion real.

El sistema queda mejor preparado para una prueba controlada, pero todavia requiere validacion end-to-end en un entorno con dependencias instaladas, base de datos real, Nginx productivo y datos de asistencia representativos.

## 2. Que se corrigio

### 2.1 Exportaciones

- Se agregaron validaciones en exportaciones de reportes para impedir generar archivos cuando no existen filas suficientes.
- Se agrego el mensaje operativo: `No existen datos suficientes para exportar.`
- Se bloqueo la exportacion de resumen mensual cuando existen resumenes parciales.
- Se bloqueo la exportacion de cierre mensual cuando la cobertura del periodo no esta completa.
- Se agrego manejo de errores en los route handlers Next de exportacion para devolver mensajes legibles en lugar de respuestas JSON genericas o fallos silenciosos.
- Se corrigio el parsing de fechas en exportaciones de fichadas para usar inicio/fin de dia de Argentina, evitando corrimientos por `new Date('YYYY-MM-DD')`.
- Se agregaron excepciones especificas en Nginx para que `/api/export` y `/api/reports/export` lleguen al frontend Next cuando necesitan traducir cookie a Bearer.

Archivos principales:

- `zkdashboard/backend/src/reports/reports.controller.ts`
- `zkdashboard/backend/src/attendance/export.service.ts`
- `zkdashboard/backend/src/attendance/attendance.service.ts`
- `zkdashboard/frontend/src/app/api/export/route.ts`
- `zkdashboard/frontend/src/app/api/reports/export/route.ts`
- `infra/nginx/el77.nqn.net.ar.conf`

### 2.2 Adjuntos

- Se agrego validacion de existencia fisica antes de entregar un adjunto para descarga.
- Si el registro existe pero el archivo ya no esta en storage, el backend devuelve un error claro.
- Se mejoraron los errores de listado y descarga desde los route handlers Next para que la UI pueda mostrar el motivo real.
- Se agrego volumen persistente para adjuntos en el compose productivo de `infra/docker`.
- Se seteo `ATTENDANCE_ATTACHMENTS_DIR` en el compose productivo.
- Se agrego excepcion Nginx para que las rutas de adjuntos pasen por Next y puedan usar la cookie de sesion correctamente.
- Se agrego mensaje de eliminacion clara en la UI: `Adjunto eliminado.`

Archivos principales:

- `zkdashboard/backend/src/attendance/attendance-requests.service.ts`
- `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/route.ts`
- `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/[attachmentId]/download/route.ts`
- `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx`
- `infra/docker/docker-compose.yml`
- `infra/nginx/el77.nqn.net.ar.conf`

### 2.3 Reportes inconsistentes

- Se impidio exportar reportes sin filas reales.
- Se impidio exportar resumen mensual con cobertura parcial de resumenes diarios.
- Se impidio exportar cierre mensual incompleto.
- Se corrigio el selector de empleados para reportes multiempresa: ahora puede recibir `companyId`.
- Se preserva `companyId` al limpiar filtros de reportes generales.
- Se preserva `companyId` al limpiar filtros en empleados sin horario.

Archivos principales:

- `zkdashboard/backend/src/reports/reports.controller.ts`
- `zkdashboard/backend/src/attendance/attendance.controller.ts`
- `zkdashboard/backend/src/attendance/attendance.service.ts`
- `zkdashboard/frontend/src/lib/api.ts`
- `zkdashboard/frontend/src/components/reports/ReportFilters.tsx`
- Paginas de reportes bajo `zkdashboard/frontend/src/app/(protected)/reports/*`

### 2.4 Fichada manual

- Se redujo la exposicion visual de fichada manual y correccion de fichada.
- Las acciones visibles desde reportes y fichadas quedaron restringidas a `super_admin` y `company_admin`.
- En el formulario de solicitudes, los tipos `manual_punch` y `punch_correction` se ocultan para roles no revisores.
- Se agrego validacion para evitar enviar fichadas manuales o correcciones con fecha/hora incompleta.
- La logica manual no se elimino; queda disponible para administracion y casos excepcionales.

Archivos principales:

- `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx`
- `zkdashboard/frontend/src/app/(protected)/records/page.tsx`
- `zkdashboard/frontend/src/app/(protected)/reports/incomplete-records/page.tsx`
- `zkdashboard/frontend/src/app/(protected)/reports/day-summaries/page.tsx`
- `zkdashboard/frontend/src/app/(protected)/reports/late-arrivals/page.tsx`
- `zkdashboard/frontend/src/app/(protected)/reports/absences/page.tsx`
- `zkdashboard/backend/src/attendance/attendance-requests.service.ts`

### 2.5 Contexto empresa

- El endpoint de usuarios/fichadores ahora acepta `companyId` para super admin.
- Los selectores de empleados en reportes y solicitudes pasan el `companyId` activo cuando existe.
- La limpieza de filtros ya no expulsa al super admin del contexto de empresa en reportes que usan `ReportFilters`.

Archivos principales:

- `zkdashboard/backend/src/attendance/attendance.controller.ts`
- `zkdashboard/backend/src/attendance/attendance.service.ts`
- `zkdashboard/frontend/src/lib/api.ts`
- `zkdashboard/frontend/src/app/(protected)/attendance/requests/page.tsx`
- `zkdashboard/frontend/src/app/(protected)/reports/*/page.tsx`

### 2.6 Auditoria

- Se corrigio la auditoria de edicion de empleados.
- El snapshot `before` ahora se captura antes de mutar el empleado.
- Esto permite registrar cambios reales en estado, sector, puesto y perfil horario.

Archivo principal:

- `zkdashboard/backend/src/employees/employees.service.ts`

### 2.7 Mensajes engañosos y acciones sin resolucion real

- El endpoint de contacto dejo de responder como si la consulta ya hubiera sido enviada por un canal real.
- El mensaje ahora indica que la consulta queda preparada y que debe continuarse por WhatsApp para confirmar el envio.
- Se corrigio el flujo de justificaciones para que, al crear una solicitud que depende de resumen diario, se intente asegurar/calcular el resumen necesario antes de marcar el estado pendiente.

Archivos principales:

- `zkdashboard/frontend/src/app/api/contact/route.ts`
- `zkdashboard/backend/src/attendance/attendance-requests.service.ts`

## 3. Que se verifico

- Se verifico el estado de cambios con `git status --short`.
- Se reviso el alcance con `git diff --stat`.
- Se ejecuto `git diff --check` sin errores de whitespace.
- Se reviso que el proyecto no tenga `node_modules` disponibles localmente.
- Se revisaron los scripts reales de build en `zkdashboard/package.json`, `zkdashboard/backend/package.json` y `zkdashboard/frontend/package.json`.

No se pudieron ejecutar builds reales porque las dependencias no estan instaladas:

- `npm run build` en backend falla por `nest: not found`.
- `npm run build` en frontend falla por `next: not found`.

No se instalaron dependencias porque la consigna fue no instalar nada.

## 4. Validacion final por area

- Exportaciones: corregidas a nivel de validacion backend, errores frontend y rutas Nginx especificas.
- Adjuntos: corregidos a nivel de persistencia docker, existencia fisica y mensajes de acceso/descarga.
- CompanyId: corregido en selectores de empleados y limpieza de filtros de reportes.
- Reportes: exportaciones vacias/parciales bloqueadas en los casos criticos.
- Auditoria: corregida la captura de estado previo en edicion de empleados.
- Manejo de errores: mejorado en exportaciones y adjuntos.
- Estados vacios: reforzados en exportacion; quedan pendientes algunos estados visuales de tablas.
- Permisos fichada manual: reducida exposicion visual y validacion de datos obligatorios.
- Mensajes al usuario: corregidos en contacto, adjuntos y errores de exportacion.

## 5. Que quedo pendiente

- Ejecutar build, typecheck y pruebas en un entorno con dependencias instaladas.
- Probar end-to-end exportaciones detras del Nginx real.
- Probar end-to-end adjuntos con contenedores recreados y volumen persistente.
- Validar que el frontend muestre correctamente todos los errores `text/plain` devueltos por las rutas Next de exportacion.
- Revisar `/records` para super admin: sigue siendo una pantalla con potencial consulta global si se accede por URL directa.
- Agregar auditoria explicita de exportaciones si el producto exige trazabilidad formal de archivos descargados.
- Completar estados vacios visuales en todas las tablas de reportes, no solo bloquear exportaciones.
- Definir si usuarios no super admin con multiples empresas deben tener selector de empresa activa o si se debe impedir esa configuracion.
- Convertir el formulario de contacto en una integracion real si se quiere capturar leads sin depender de WhatsApp.
- Validar con datos reales feriados globales vs feriados de empresa en recalculo y reportes.

## 6. Riesgos remanentes

- Sin build local no hay garantia completa de compilacion TypeScript.
- El cambio de Nginx debe probarse con el archivo productivo cargado realmente por el servidor.
- Las exportaciones quedan mas estrictas: usuarios que antes recibian archivos vacios ahora veran errores operativos.
- Si existen datos historicos con adjuntos guardados fuera de `/home/reloj/attachments`, se debe migrar o mapear el storage correcto antes de redeploy.
- El recalculo automatico de resumen al crear justificaciones depende de que empleados, horarios y fichadas base esten consistentes.
- La ocultacion visual de fichada manual reduce exposicion, pero no reemplaza una politica completa de permisos si hay clientes API directos.

## 7. Posibles regresiones

- Exportaciones que antes generaban un archivo vacio ahora fallaran con mensaje. Es un cambio esperado, pero puede cambiar rutinas operativas existentes.
- Si algun endpoint de adjuntos era consumido directamente por backend bajo `/api/attendance/requests/...`, la nueva regla Nginx lo enviara al frontend. En el flujo actual se necesita ese proxy para autenticar con cookie.
- El selector de empleados filtrado por `companyId` puede ocultar empleados que antes aparecian globalmente para super admin. Es deseado para evitar mezcla de empresas.
- La validacion de fecha/hora completa en fichada manual y correcciones puede bloquear envios incompletos que antes llegaban al backend.
- El cambio de parsing de fechas en fichadas puede modificar resultados cerca de medianoche; corrige el criterio operativo Argentina, pero conviene revisarlo con datos historicos.

## 8. Modulos tocados

- Backend asistencia:
  - fichadas
  - exportacion de asistencia
  - solicitudes
  - adjuntos
  - justificaciones
- Backend reportes:
  - exportacion Excel
  - cobertura de resumen mensual
  - cobertura de cierre mensual
- Backend empleados:
  - auditoria de cambios
- Frontend reportes:
  - filtros
  - selectores de empleados
  - acciones de solicitud/manual punch
- Frontend solicitudes:
  - adjuntos
  - validaciones de fecha/hora
  - visibilidad por rol
- Frontend API routes:
  - exportaciones
  - adjuntos
  - contacto
- Infraestructura:
  - Nginx
  - Docker compose productivo

## 9. Conclusion tecnica

La fase 2 resolvio los puntos mas peligrosos para una operacion controlada: exportaciones vacias, adjuntos no persistentes, rutas productivas que salteaban Next, filtros multiempresa inconsistentes, fechas con corrimiento horario, auditoria incompleta de empleados y mensajes de exito falso.

El sistema queda funcionalmente mas estable y entendible, pero no deberia pasar a piloto real sin una prueba completa con dependencias instaladas, Nginx real, base productiva o staging y datos representativos. La siguiente decision tecnica deberia ser validar end-to-end estos flujos antes de aceptar nuevas funcionalidades.
