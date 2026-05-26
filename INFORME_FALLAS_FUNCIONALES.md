# Informe de fallas funcionales

## 1. Resumen ejecutivo

El sistema tiene una base funcional amplia, pero el riesgo funcional general es **alto** para una prueba piloto real sin estabilización previa. La mayor concentración de fallas está en cuatro zonas: exportaciones/rutas de producción, reportes calculados que dependen de resúmenes diarios, filtros multiempresa para super admin y flujos de solicitudes/adjuntos.

Hay hallazgos **confirmados por código** que pueden producir acciones aparentemente disponibles pero sin resultado real para el usuario: exportar reportes desde producción, descargar adjuntos, enviar consultas comerciales, limpiar filtros de empresa, aprobar justificaciones sin resumen diario calculado y consultar reportes con empleados de otra empresa en el selector.

La aplicación no debe considerarse lista para operar datos críticos de asistencia/RRHH sin corregir primero estos puntos. Para una demo controlada puede funcionar, siempre que se use un entorno conocido, con resúmenes recalculados, una sola empresa activa por usuario y sin depender de exportaciones detrás del Nginx actual.

## 2. Hallazgos críticos

### Hallazgo 1: Exportaciones de reportes rotas en producción por choque entre Next route handlers y Nginx

- Estado: **confirmado**
- Módulo afectado: Reportes, fichadas, exportaciones Excel/PDF
- Archivo/ruta probable:
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
  - `zkdashboard/frontend/src/app/api/reports/export/route.ts:57-98`
  - `zkdashboard/frontend/src/app/api/export/route.ts:6-47`
  - `zkdashboard/frontend/src/lib/api.ts:1541-1694`
  - `zkdashboard/frontend/src/app/(protected)/records/page.tsx:80-94`
- Qué intenta hacer el usuario: exportar Excel/PDF desde reportes o desde la pantalla de fichadas.
- Qué puede fallar: el navegador solicita `/api/reports/export` o `/api/export`, pero Nginx enruta todo `/api/` al backend NestJS y no al frontend Next. Los route handlers de Next no se ejecutan.
- Por qué falla: las rutas Next son necesarias para leer la cookie `token` y reenviar la petición al backend con `Authorization: Bearer ...`. Nginx hace strip de `/api/` y manda la solicitud directo a NestJS. El backend no tiene `reports/export` ni `export` como rutas equivalentes, y además el JWT backend solo se extrae desde header Bearer.
- Impacto real: las exportaciones pueden devolver 404/401 en producción aunque la UI muestre botones disponibles. Es una falla crítica porque afecta salida operativa y auditoría.
- Cómo reproducirlo: en entorno con `infra/nginx/el77.nqn.net.ar.conf`, ingresar autenticado y pulsar `Exportar Excel` en cualquier reporte o `Exportar PDF/Excel` en `/records`.
- Recomendación de solución: decidir una estrategia única: o bien excluir rutas Next específicas de `/api/` en Nginx y enviarlas al frontend, o eliminar route handlers Next y apuntar la UI a endpoints backend reales que acepten autenticación correctamente. Validar todos los href de exportación bajo el mismo proxy productivo.
- Prioridad: **crítica**

### Hallazgo 2: Descarga/listado de adjuntos puede fallar detrás de Nginx por bypass del proxy Next con cookie

- Estado: **confirmado**
- Módulo afectado: Solicitudes de asistencia, adjuntos
- Archivo/ruta probable:
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
  - `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/route.ts:6-21`
  - `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/[attachmentId]/download/route.ts:6-33`
  - `zkdashboard/backend/src/auth/jwt.strategy.ts:13-17`
  - `zkdashboard/backend/src/attendance/attendance-requests.controller.ts:71-100`
- Qué intenta hacer el usuario: ver o descargar adjuntos de una solicitud.
- Qué puede fallar: las URLs `/api/attendance/requests/.../attachments` pueden llegar directo al backend por Nginx sin que Next agregue el header Bearer.
- Por qué falla: el backend usa `ExtractJwt.fromAuthHeaderAsBearerToken()` y no lee la cookie del frontend. Los route handlers Next sí leen cookie y reenvían Bearer, pero producción los evita por la regla `/api/`.
- Impacto real: adjuntos subidos correctamente pueden quedar inaccesibles desde la UI en producción. Esto afecta revisión de justificaciones y cumplimiento documental.
- Cómo reproducirlo: subir una solicitud con adjunto, desplegar con el Nginx actual, abrir la solicitud y descargar el archivo.
- Recomendación de solución: aplicar la misma corrección de enrutamiento que en exportaciones. Además, probar explícitamente listado, descarga, subida y eliminación de adjuntos detrás del proxy real.
- Prioridad: **crítica**

### Hallazgo 3: Adjuntos no tienen persistencia garantizada en compose productivo

- Estado: **confirmado**
- Módulo afectado: Solicitudes de asistencia, almacenamiento de adjuntos
- Archivo/ruta probable:
  - `infra/docker/docker-compose.yml:46-65`
  - `zkdashboard/docker-compose.yml:31-40`
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:341-362`
- Qué intenta hacer el usuario: adjuntar documentación a una solicitud y recuperarla más tarde.
- Qué puede fallar: el registro queda en base de datos, pero el archivo físico puede perderse al recrear el contenedor backend productivo.
- Por qué falla: el compose raíz de producción solo monta `/home/reloj/log`. No define `ATTENDANCE_ATTACHMENTS_DIR` ni volumen para `/home/reloj/attachments`. El compose interno sí lo hacía, pero no el de `infra/docker`.
- Impacto real: links de adjuntos pueden romperse con 404/error de archivo inexistente, dejando solicitudes aprobadas o pendientes sin evidencia.
- Cómo reproducirlo: levantar con `infra/docker`, subir adjunto, recrear backend sin preservar filesystem interno y descargar el adjunto.
- Recomendación de solución: declarar volumen persistente para adjuntos y setear `ATTENDANCE_ATTACHMENTS_DIR` en el compose productivo. Migrar/copiar archivos existentes antes de redeploy si ya hay operación real.
- Prioridad: **crítica**

### Hallazgo 4: Tardanzas, ausencias, salidas tempranas y horas trabajadas pueden mostrarse vacías aunque existan fichadas

- Estado: **confirmado**
- Módulo afectado: Reportes calculados fase 2
- Archivo/ruta probable:
  - `zkdashboard/backend/src/reports/services/phase2-reports.service.ts:47-72`
  - `zkdashboard/backend/src/reports/services/phase2-reports.service.ts:80-110`
  - `zkdashboard/frontend/src/app/(protected)/reports/day-summaries/page.tsx:84-115`
- Qué intenta hacer el usuario: consultar tardanzas, ausencias, salidas tempranas u horas trabajadas.
- Qué puede fallar: el reporte devuelve cero filas aunque existan fichadas crudas del reloj.
- Por qué falla: estos reportes consultan exclusivamente `attendance_day_summaries`. Si no se recalculó el período, no hay fallback a fichadas crudas.
- Impacto real: el usuario puede interpretar “no hay tardanzas/ausencias” como resultado operativo, cuando en realidad faltan resúmenes calculados.
- Cómo reproducirlo: cargar fichadas para un empleado, no recalcular resúmenes diarios y abrir `/reports/late-arrivals` o `/reports/absences`.
- Recomendación de solución: bloquear o advertir de forma explícita cuando no hay cobertura de resúmenes para el rango. Idealmente mostrar cobertura calculada y CTA de recálculo.
- Prioridad: **alta**

### Hallazgo 5: Resumen mensual usa resúmenes parciales y deja días faltantes como vacíos, ignorando fichadas crudas existentes

- Estado: **confirmado**
- Módulo afectado: Reporte resumen mensual
- Archivo/ruta probable:
  - `zkdashboard/backend/src/reports/services/monthly-summary.service.ts:52-56`
  - `zkdashboard/backend/src/reports/services/monthly-summary.service.ts:151-172`
  - `zkdashboard/frontend/src/app/(protected)/reports/monthly-summary/page.tsx:87-104`
- Qué intenta hacer el usuario: obtener resumen mensual para RRHH.
- Qué puede fallar: si existe al menos un resumen diario del mes, el backend usa fuente `summaries` para todo el mes. Los días sin resumen se generan como `no_records` con cero minutos, aunque existan fichadas crudas.
- Por qué falla: el fallback a fichadas directas solo ocurre cuando `summaries.length === 0`. Con cobertura parcial no mezcla fuentes ni consulta crudas para días faltantes.
- Impacto real: totales mensuales, presentismo, ausencias y horas pueden quedar incorrectos. La UI advierte cobertura parcial, pero el Excel se puede descargar igual y los números ya salen contaminados por faltantes.
- Cómo reproducirlo: recalcular solo un día de un mes con fichadas en varios días, abrir resumen mensual y exportar.
- Recomendación de solución: exigir cobertura completa para reportes de RRHH o calcular fallback por día faltante. Si se permite exportar parcial, marcar el Excel con cobertura y advertencias visibles.
- Prioridad: **alta**

### Hallazgo 6: Cierre mensual puede exportarse vacío o incompleto si no hay resúmenes calculados

- Estado: **confirmado**
- Módulo afectado: Cierre mensual
- Archivo/ruta probable:
  - `zkdashboard/backend/src/reports/services/monthly-closing.service.ts:144-168`
  - `zkdashboard/backend/src/reports/services/monthly-closing.service.ts:195-210`
  - `zkdashboard/backend/src/reports/exporters/reports-excel.exporter.ts:363-420`
- Qué intenta hacer el usuario: generar cierre mensual para liquidación/control.
- Qué puede fallar: el cierre devuelve `rows: []` cuando no hay resúmenes, o filas con observaciones de período incompleto cuando faltan días. Aun así puede exportarse.
- Por qué falla: el cierre depende de `attendance_day_summaries` y no calcula desde fichadas crudas.
- Impacto real: riesgo de entregar cierre mensual vacío/incompleto como documento válido.
- Cómo reproducirlo: abrir cierre mensual para una empresa con empleados y fichadas, pero sin recálculo del mes.
- Recomendación de solución: impedir exportación si `coverage.isComplete` es falso, o exigir confirmación/leyenda fuerte en pantalla y Excel.
- Prioridad: **alta**

### Hallazgo 7: Selector de empleados no respeta `companyId` para super admin

- Estado: **confirmado**
- Módulo afectado: Filtros de reportes, solicitudes, fichadas
- Archivo/ruta probable:
  - `zkdashboard/frontend/src/lib/api.ts:1366-1368`
  - `zkdashboard/backend/src/attendance/attendance.controller.ts:50-52`
  - `zkdashboard/backend/src/attendance/attendance.service.ts:233-263`
  - `zkdashboard/frontend/src/app/(protected)/reports/late-arrivals/page.tsx:29-33`
  - `zkdashboard/frontend/src/app/(protected)/attendance/requests/page.tsx:49-53`
- Qué intenta hacer el usuario: como super admin, seleccionar empresa y luego filtrar por empleado.
- Qué puede fallar: el selector de empleados puede listar empleados/fichadores de todas las empresas. Si se elige un empleado de otra empresa, el reporte de la empresa seleccionada queda vacío o inconsistente.
- Por qué falla: `getDistinctUsers()` no acepta ni envía `companyId`; backend aplica scope solo por JWT. Para super admin, `getCompanyScope` devuelve `null`, por lo tanto devuelve usuarios globales.
- Impacto real: filtros engañosos, reportes vacíos falsos y dificultad operativa para administrar varias empresas.
- Cómo reproducirlo: con super admin y dos empresas con fichadas, abrir reporte con `companyId=A`; revisar el selector de empleados y elegir un empleado de empresa B.
- Recomendación de solución: agregar `companyId` a `/attendance/users` para super admin y pasar el parámetro desde todas las pantallas filtradas por empresa.
- Prioridad: **alta**

### Hallazgo 8: Botón “Limpiar” elimina `companyId` y expulsa al super admin del contexto del reporte

- Estado: **confirmado**
- Módulo afectado: Reportes multiempresa
- Archivo/ruta probable:
  - `zkdashboard/frontend/src/components/reports/ReportFilters.tsx:47-49`
  - `zkdashboard/frontend/src/components/reports/ReportFilters.tsx:194-200`
  - `zkdashboard/frontend/src/app/(protected)/reports/employees-without-schedule/page.tsx:61-80`
- Qué intenta hacer el usuario: limpiar filtros de fecha/empleado manteniendo la empresa seleccionada.
- Qué puede fallar: al limpiar, se pierde `companyId` y el super admin ve la pantalla de “seleccioná una empresa”.
- Por qué falla: el formulario preserva `companyId` como hidden input al filtrar, pero el link `Limpiar` navega a `href={action}` sin query params.
- Impacto real: navegación frustrante y pérdida de contexto. En uso multiempresa es una falla cotidiana.
- Cómo reproducirlo: abrir `/reports/late-arrivals?companyId=...`, pulsar `Limpiar`.
- Recomendación de solución: construir el href de limpieza preservando `companyId` cuando exista.
- Prioridad: **media**

### Hallazgo 9: Solicitudes de justificación pueden crearse pero no impactar el resumen si el día no fue recalculado

- Estado: **confirmado**
- Módulo afectado: Solicitudes, justificaciones, reportes calculados
- Archivo/ruta probable:
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:116-175`
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:537-555`
- Qué intenta hacer el usuario: crear y aprobar una justificación de ausencia o tardanza.
- Qué puede fallar: la solicitud queda pendiente, pero el resumen diario no queda marcado como pendiente si no existe. Al aprobar, el backend falla con “No existe resumen diario para justificar. Recalculá el período primero.”
- Por qué falla: `markSummaryJustification` retorna sin error cuando no hay resumen y el estado no es `approved`; solo lanza error al aprobar.
- Impacto real: el usuario cree que inició un trámite válido, pero el flujo se bloquea recién al aprobar. Los reportes no reflejan estado pendiente.
- Cómo reproducirlo: crear una justificación para un día sin `attendance_day_summary` calculado y luego intentar aprobarla.
- Recomendación de solución: validar existencia de resumen al crear justificación, crear/recalcular el resumen automáticamente, o informar claramente que debe recalcularse antes de permitir el trámite.
- Prioridad: **alta**

### Hallazgo 10: Auditoría de cambios de empleado no registra cambios reales de estado, sector, puesto o perfil horario

- Estado: **confirmado**
- Módulo afectado: Empleados, auditoría administrativa
- Archivo/ruta probable:
  - `zkdashboard/backend/src/employees/employees.service.ts:199-235`
  - `zkdashboard/backend/src/employees/employees.service.ts:262-320`
- Qué intenta hacer el usuario: modificar empleado y conservar trazabilidad del cambio.
- Qué puede fallar: no se generan logs de auditoría para cambios que sí ocurrieron.
- Por qué falla: el objeto `before` se arma después de mutar `employee.scheduleProfileId`, `departmentId`, `positionId` e `isActive`. Luego `before` y `after` quedan iguales.
- Impacto real: auditoría incompleta en cambios sensibles que afectan cálculo y permisos operativos.
- Cómo reproducirlo: cambiar el perfil horario o inactivar un empleado; revisar tabla/log de auditoría administrativa.
- Recomendación de solución: capturar snapshot `before` inmediatamente después de `findOne` y antes de mutar el empleado.
- Prioridad: **alta**

### Hallazgo 11: Filtros de fecha en fichadas/exportación usan `new Date('YYYY-MM-DD')` y pueden tener corrimiento horario

- Estado: **confirmado**
- Módulo afectado: Fichadas, exportaciones antiguas de asistencia/horas, dashboard
- Archivo/ruta probable:
  - `zkdashboard/backend/src/attendance/attendance.service.ts:127-159`
  - `zkdashboard/backend/src/attendance/attendance.service.ts:217-224`
  - `zkdashboard/backend/src/attendance/export.service.ts:56-63`
  - `zkdashboard/backend/src/attendance/export.service.ts:90-96`
- Qué intenta hacer el usuario: filtrar fichadas por día o exportar por rango.
- Qué puede fallar: el rango puede incluir/excluir registros cercanos al inicio/fin del día en Argentina. Los labels `Desde/Hasta` pueden mostrarse un día anterior si se formatea un date-only parseado como UTC.
- Por qué falla: `new Date('YYYY-MM-DD')` se interpreta en UTC. Otros reportes usan utilidades explícitas de Argentina (`parseArgentinaDateStart/End`), pero fichadas/export viejo no.
- Impacto real: diferencias entre reportes calculados y lista/exportación de fichadas. Puede afectar conciliación diaria.
- Cómo reproducirlo: crear fichadas cerca de medianoche Argentina y filtrar/exportar por fecha exacta en `/records`.
- Recomendación de solución: reemplazar parsing de fichadas/export por `parseArgentinaDateStart` y `parseArgentinaDateEnd`. Unificar todas las fechas operativas en la misma utilidad.
- Prioridad: **alta**

### Hallazgo 12: Formulario comercial devuelve éxito pero no registra ni notifica realmente

- Estado: **confirmado**
- Módulo afectado: Marketing/contacto
- Archivo/ruta probable:
  - `zkdashboard/frontend/src/app/api/contact/route.ts:29-50`
- Qué intenta hacer el usuario: enviar una consulta comercial.
- Qué puede fallar: la pantalla informa “Consulta enviada correctamente”, pero solo se escribe `console.info`. No hay persistencia, email, CRM, webhook ni alerta.
- Por qué falla: el endpoint actúa como placeholder operativo.
- Impacto real: pérdida silenciosa de leads o consultas. El usuario recibe una respuesta engañosa.
- Cómo reproducirlo: enviar el formulario de contacto y revisar que no exista registro persistente ni integración de salida.
- Recomendación de solución: integrar un canal real o cambiar el texto para indicar que la continuidad debe hacerse por WhatsApp. Registrar en base de datos si se necesita trazabilidad.
- Prioridad: **media**

### Hallazgo 13: Usuarios con múltiples empresas quedan atados a la primera membresía sin selector de empresa activa

- Estado: **confirmado**
- Módulo afectado: Autenticación, permisos, scope de empresa
- Archivo/ruta probable:
  - `zkdashboard/backend/src/users/users.service.ts:69-116`
  - `zkdashboard/backend/src/auth/auth.service.ts:27-40`
  - `zkdashboard/frontend/src/components/NavbarClient.tsx:53-63`
- Qué intenta hacer el usuario: operar en más de una empresa con el mismo usuario no super admin.
- Qué puede fallar: solo se usa la primera membresía ordenada por `createdAt`, salvo que el usuario tenga empleado asociado. No hay selector de empresa activa.
- Por qué falla: `buildAuthenticatedUser` resuelve una única `companyId` y `companyRole`; el JWT queda fijo hasta nuevo login y no hay cambio de contexto.
- Impacto real: un admin/operador multiempresa puede ver o modificar la empresa equivocada o quedar sin forma de operar otra empresa asignada.
- Cómo reproducirlo: crear usuario con dos membresías no super admin e iniciar sesión; intentar cambiar empresa activa.
- Recomendación de solución: incorporar selector de empresa activa o impedir múltiples membresías no super admin si el producto no las soporta.
- Prioridad: **media**

### Hallazgo 14: Importación desde reloj y sincronización al reloj informan éxito de encolado, pero la conciliación se recarga antes de que el reloj responda

- Estado: **confirmado**
- Módulo afectado: Empleados, sincronización con dispositivos
- Archivo/ruta probable:
  - `zkdashboard/frontend/src/components/EmployeesManager.tsx:315-347`
  - `zkdashboard/frontend/src/app/(protected)/employees/actions.ts:171-223`
- Qué intenta hacer el usuario: consultar usuarios del reloj o enviar empleado al reloj y ver el resultado.
- Qué puede fallar: la UI muestra éxito y recarga conciliación inmediatamente, pero la operación real depende de que el reloj tome/comunique el comando después. La conciliación puede seguir vacía/vieja.
- Por qué falla: la acción encola comando; no hay confirmación end-to-end de ejecución por el dispositivo antes de mostrar el nuevo estado.
- Impacto real: el usuario puede creer que el empleado ya quedó sincronizado cuando solo se encoló la orden.
- Cómo reproducirlo: usar “consultar usuarios” o “enviar empleado” con un reloj que no haga heartbeat inmediatamente.
- Recomendación de solución: diferenciar “comando encolado” de “confirmado por reloj”, mostrar estado pendiente y refresco posterior.
- Prioridad: **media**

### Hallazgo 15: Importación de empleados puede terminar con éxito operacional ambiguo cuando todo fue omitido

- Estado: **confirmado**
- Módulo afectado: Importación de empleados
- Archivo/ruta probable:
  - `zkdashboard/frontend/src/app/(protected)/employees/actions.ts:249-262`
  - `zkdashboard/backend/src/employees/employees.service.ts:543-552`
- Qué intenta hacer el usuario: importar empleados desde CSV/Excel.
- Qué puede fallar: si todos los documentos ya existen, el backend incrementa `skippedCount`, pero el mensaje principal dice “La importación creó 0 empleado(s).”
- Por qué falla: el mensaje de éxito no distingue importación sin cambios de importación efectiva.
- Impacto real: acción con efecto nulo presentada como operación completada correctamente.
- Cómo reproducirlo: importar un archivo con empleados ya existentes.
- Recomendación de solución: mostrar creado/omitido/error de forma explícita y marcar como advertencia si `createdCount === 0`.
- Prioridad: **baja**

## 3. Reportes y exportaciones

- **Exportaciones por `/api/reports/export`**: confirmadas como riesgosas en producción por Nginx. Afecta presencia diaria, fichadas incompletas, resumen mensual, cierre mensual, tardanzas, salidas tempranas, ausencias, horas trabajadas, fichadas manuales, fichadas corregidas, empleados sin horario y empleados sin fichadas.
- **Exportaciones por `/api/export` desde `/records`**: confirmadas como riesgosas en producción por Nginx y por parsing de fechas UTC.
- **Tardanzas / Ausencias / Salidas tempranas / Horas trabajadas**: confirmados como dependientes de `attendance_day_summaries`; pueden devolver vacío si no hubo recálculo.
- **Resumen mensual**: confirmado que con cobertura parcial usa `summaries` y genera días vacíos para faltantes. Puede producir totales incorrectos aunque advierta parcialidad.
- **Cierre mensual**: confirmado que no usa fallback a fichadas crudas. Puede exportarse vacío o incompleto si faltan resúmenes.
- **Empleados sin fichadas**: confirmado que usa rango Argentina correcto, pero depende de `companyId` para super admin. El selector global de empleados puede inducir filtros vacíos.
- **Pantalla vs Excel**: requiere verificación funcional completa. El Excel exporta desde backend y la pantalla consume el mismo endpoint para reportes nuevos, pero el canal de exportación tiene una ruta distinta en frontend/proxy. La diferencia principal confirmada no es de columnas, sino de enrutamiento/autenticación y cobertura parcial.

## 4. Acciones sin efecto real

- **Formulario de contacto comercial**: confirmado. Devuelve éxito y solo escribe en consola.
- **Exportar Excel/PDF en producción**: confirmado. Botones visibles, route handler Next no ejecutado por Nginx.
- **Descargar/ver adjuntos en producción**: confirmado como falla probable por bypass de route handler Next y ausencia de Bearer.
- **Limpiar filtros como super admin**: confirmado. Pierde `companyId` y no limpia dentro del contexto esperado.
- **Crear justificación sin resumen diario**: confirmado. Crea solicitud, pero no impacta reportes hasta recalcular; aprobar falla.
- **Importar usuarios del reloj / enviar empleado al reloj**: confirmado como acción asincrónica no confirmada end-to-end. No es falsa en sí misma, pero puede parecer resuelta antes de que el reloj confirme.
- **Importación de empleados con todos omitidos**: confirmado. Puede mostrar éxito con cero creados.
- **Sincronización masiva a reloj**: confirmado endpoint backend deshabilitado en `employees.controller.ts:104-109`. No se detectó botón directo en UI actual, por lo que no se marca como falla visible; mantener como limitación explícita si aparece en futuras pantallas.

## 5. Inconsistencias frontend/backend

- **`/api/*` en frontend vs Nginx productivo**: confirmado. Frontend define route handlers bajo `/api`, pero Nginx manda `/api/` al backend.
- **Cookie frontend vs Bearer backend**: confirmado. Backend JWT solo lee `Authorization: Bearer`; route handlers Next traducen cookie a Bearer, pero producción los puede saltar.
- **`getDistinctUsers()` sin `companyId`**: confirmado. La UI de reportes envía `companyId` a reportes, departamentos y puestos, pero no al selector de empleados.
- **Fichadas/exportación usan fechas de forma distinta a reportes calculados**: confirmado. Parte del backend usa utilidades Argentina y parte usa `new Date(dateOnly)`.
- **Solicitudes de justificación aceptan creación sin resumen existente, pero aprobación exige resumen**: confirmado. Validación tardía y experiencia inconsistente.
- **Super admin puede acceder directo a `/records`**: requiere verificación de intención de producto. El navbar no muestra “Fichadas” a super admin, pero la página no bloquea y backend devuelve registros globales sin `companyId`.
- **Middleware no lista `/reports` ni `/attendance/requests` como protected paths**: requiere verificación de impacto. Las páginas llaman `requireCurrentSession`, por lo que hay protección server-side, pero el middleware no redirige anticipadamente como en `/records`, `/employees`, etc.

## 6. Problemas de permisos/roles

- **Read-only ve navegación a “Solicitudes”**: confirmado en navbar común. Backend impide crear solicitudes a read_only, pero la pantalla se ofrece como módulo operativo. Puede ser aceptable para consulta; requiere validar UX esperada.
- **Operador puede crear solicitudes pero no recalcular resúmenes**: confirmado. Si crea justificación para un día sin resumen, dependerá de company_admin/super_admin para recalcular/aprobar.
- **Super admin en reportes requiere `companyId`, pero filtros auxiliares no siempre lo preservan**: confirmado.
- **Usuarios multiempresa no super admin sin selector de empresa activa**: confirmado. Es un problema de scope funcional más que de autorización puntual.
- **Acceso directo de super admin a fichadas globales**: requiere verificación. Puede ser deseado por auditoría global, pero contradice el patrón de pedir empresa en reportes.
- **Recalcular resúmenes**: backend sí valida company_admin/super_admin (`attendance-calculation.service.ts:92-113`). No se observó exposición indebida a operator/read_only.

## 7. Casos borde no resueltos

- **Empresa sin empleados**: confirmado parcialmente. Recalcular devuelve cero procesados; cierre mensual produce cobertura con `hasEmployees: false` y filas vacías. Falta mensaje operativo consistente en todos los reportes.
- **Empleado sin horario**: confirmado que existe reporte y advertencia, pero reportes calculados quedan limitados porque no hay expected minutes/tardanza/ausencia confiable hasta asignar perfil.
- **Dispositivo sin empresa**: confirmado en backend que varias acciones lanzan `BadRequestException('El reloj debe estar asignado a una empresa.')`. Requiere validación UX para que el usuario no vea acciones imposibles.
- **Fichada sin empleado asociado**: confirmado que `saveRecords` crea empleados mínimos con nombre/apellido vacío. Puede generar selectores y reportes con usuarios sin datos personales.
- **Solicitud sin adjunto**: confirmado que el backend solo exige adjunto al aprobar si el tipo lo requiere. Si la UI no lo deja claro antes, el bloqueo aparece tarde.
- **Reporte sin rango de fechas**: confirmado que varios reportes normalizan a hoy. Puede ser correcto, pero con inputs incompletos puede filtrar hoy silenciosamente.
- **Feriados globales vs empresa**: requiere verificación. La carga soporta feriados globales/empresa según servicios, pero el impacto en recálculo debe probarse con una empresa con feriados propios y globales superpuestos.
- **Usuario con múltiples empresas**: confirmado sin selector de empresa activa.
- **Super admin vs company admin**: confirmado que el super admin necesita `companyId` en reportes, pero selectores y limpiar filtros rompen el contexto.
- **Corrección de fichada ya aprobada**: confirmado que solicitudes revisadas no pueden reaprobarse, pero requiere verificación de posibilidad de crear una nueva corrección sobre una fichada ya corregida.
- **Recalcular resumen sin fichadas**: confirmado que genera resúmenes de ausencias/fin de semana/feriados para empleados con horario. Si no hay empleados, no genera nada.

## 8. Priorización

1. Corregir estrategia de rutas `/api` en producción: exportaciones y adjuntos no pueden quedar en un estado incierto.
2. Asegurar persistencia de adjuntos en `infra/docker/docker-compose.yml`.
3. Unificar parsing de fechas de fichadas/exportaciones con utilidades de Argentina.
4. Corregir reportes basados en resúmenes: cobertura obligatoria, bloqueo de exportación incompleta o fallback real.
5. Pasar `companyId` a `/attendance/users` y preservar `companyId` al limpiar filtros.
6. Corregir flujo de justificaciones cuando no existe resumen diario.
7. Arreglar auditoría de cambios de empleado capturando `before` antes de mutar.
8. Definir producto para usuarios multiempresa no super admin.
9. Mejorar estados de acciones asincrónicas de reloj: encolado vs confirmado.
10. Ajustar mensajes de acciones con efecto nulo, especialmente importación de empleados y contacto comercial.

## 9. Conclusión

El sistema **no está listo todavía para una prueba piloto real con datos críticos** sin una etapa previa de estabilización funcional. Tiene módulos importantes implementados, pero hay fallas confirmadas que pueden entregar información vacía o incorrecta, bloquear exportaciones en producción, perder adjuntos o mostrar acciones como exitosas sin resolución real.

La recomendación técnica honesta es congelar features nuevas y ejecutar una fase corta de hardening enfocada en rutas productivas, persistencia de adjuntos, fechas, cobertura de reportes y consistencia multiempresa. Después de corregir esos puntos y probar flujos end-to-end con Nginx real, sí puede pasar a piloto controlado.
