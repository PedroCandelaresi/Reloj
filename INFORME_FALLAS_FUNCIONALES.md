# Informe de fallas funcionales

Auditoría enfocada únicamente en bugs de uso, acciones sin resolución clara, filtros defectuosos, exportaciones frágiles, endpoints desconectados y mensajes que pueden inducir a error. No incluye roadmap general, stack ni arquitectura.

## Hallazgos concretos

### 1. Exportar Excel desde reportes puede no ejecutar ninguna ruta válida en producción

- Estado: **confirmado**
- Módulo afectado: Reportes / exportaciones Excel
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/reports/ExportButtons.tsx:1-9`
  - `zkdashboard/frontend/src/lib/api.ts:1541-1694`
  - `zkdashboard/frontend/src/app/api/reports/export/route.ts:57-98`
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
- Acción del usuario: pulsar “Exportar Excel” en cualquier reporte.
- Qué falla: el link apunta a `/api/reports/export`, pero en producción Nginx envía `/api/*` al backend NestJS, no al frontend Next.
- Por qué falla: el route handler de Next es quien lee la cookie y agrega `Authorization: Bearer`. Si Nginx lo saltea, el backend recibe una ruta que no corresponde al controlador real de reportes.
- Impacto real: el usuario ve botón de exportación, pero puede obtener 404/401 o una respuesta vacía/error en producción.
- Cómo reproducirlo: desplegar con el Nginx actual y pulsar exportar en `/reports/late-arrivals?companyId=...` o cualquier reporte.
- Solución recomendada: sacar estas rutas Next de la regla `/api/` o mover la exportación a endpoints backend reales consumidos directamente con autenticación consistente.
- Prioridad: **crítica**

### 2. Exportar PDF/Excel desde Fichadas usa otra ruta `/api` igualmente frágil

- Estado: **confirmado**
- Módulo afectado: Fichadas / exportaciones de asistencia y horas
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/app/(protected)/records/page.tsx:80-94`
  - `zkdashboard/frontend/src/app/api/export/route.ts:6-47`
  - `zkdashboard/backend/src/attendance/attendance.controller.ts:112-149`
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
- Acción del usuario: pulsar “Exportar Excel”, “Exportar PDF”, “Horas Excel” o “Horas PDF” en `/records`.
- Qué falla: los botones llaman `/api/export`, pero producción lo redirige al backend como `/export`, ruta inexistente.
- Por qué falla: el frontend tiene un proxy Next que debería traducir cookie a Bearer y llamar `/attendance/export`; Nginx lo evita.
- Impacto real: las exportaciones principales de fichadas pueden no funcionar en el entorno real aunque funcionen localmente.
- Cómo reproducirlo: abrir `/records` en producción con Nginx y probar cualquiera de los cuatro botones.
- Solución recomendada: unificar exportaciones en backend o ajustar Nginx para que `/api/export` llegue a Next.
- Prioridad: **crítica**

### 3. “Descargar plantilla CSV” para importar empleados puede romperse en producción

- Estado: **confirmado**
- Módulo afectado: Empleados / importación
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/EmployeesManager.tsx:971-977`
  - `zkdashboard/frontend/src/app/api/employees/import/template/route.ts:3-15`
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
- Acción del usuario: abrir “Importar empleados” y pulsar “Descargar plantilla CSV”.
- Qué falla: el link apunta a `/api/employees/import/template`. Con Nginx productivo se envía al backend como `/employees/import/template`, pero no existe un `GET` backend para esa plantilla.
- Por qué falla: la plantilla vive solo como route handler de Next bajo `/api`.
- Impacto real: el usuario no puede bajar el archivo modelo para importar empleados.
- Cómo reproducirlo: probar el link de plantilla en el despliegue con Nginx actual.
- Solución recomendada: servir la plantilla desde backend, moverla fuera de `/api`, o excluir esa ruta de la regla Nginx hacia backend.
- Prioridad: **alta**

### 4. Formulario de contacto comercial puede fallar por Nginx y, si funciona, no deja registro real

- Estado: **confirmado**
- Módulo afectado: Marketing / contacto
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/marketing/MarketingContactForm.tsx:78-104`
  - `zkdashboard/frontend/src/app/api/contact/route.ts:29-50`
  - `infra/nginx/el77.nqn.net.ar.conf:53-62`
- Acción del usuario: enviar el formulario comercial.
- Qué falla: en producción `/api/contact` puede terminar en backend como `/contact`, ruta inexistente. Si Next sí lo atiende, responde éxito pero solo hace `console.info`.
- Por qué falla: no hay persistencia, email, webhook, CRM ni notificación real; además la ruta queda bajo el prefijo que Nginx manda al backend.
- Impacto real: consultas comerciales pueden perderse o mostrar éxito sin que nadie las reciba.
- Cómo reproducirlo: enviar el formulario en producción; revisar que no exista mail, DB, webhook ni endpoint backend `/contact`.
- Solución recomendada: implementar canal real de envío/registro y resolver la ruta fuera del choque `/api`.
- Prioridad: **alta**

### 5. “Ver adjuntos” y descarga de adjuntos pueden no funcionar detrás del proxy

- Estado: **confirmado**
- Módulo afectado: Solicitudes de asistencia / adjuntos
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx:193-198`
  - `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx:537-543`
  - `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/route.ts:6-21`
  - `zkdashboard/frontend/src/app/api/attendance/requests/[id]/attachments/[attachmentId]/download/route.ts:6-33`
  - `zkdashboard/backend/src/auth/jwt.strategy.ts:13-17`
- Acción del usuario: pulsar “Ver adjuntos” o abrir el nombre de un adjunto.
- Qué falla: la UI usa rutas `/api/attendance/...`; en producción Nginx las manda directo a NestJS sin que Next agregue Bearer.
- Por qué falla: el backend solo autentica por `Authorization: Bearer`; el navegador envía cookie al frontend, no Bearer directo al backend.
- Impacto real: un adjunto cargado puede no verse ni descargarse.
- Cómo reproducirlo: crear solicitud con adjunto y probar “Ver adjuntos”/descarga en producción.
- Solución recomendada: corregir el enrutamiento o exponer endpoints backend consumidos por server actions/route handlers que no choquen con Nginx.
- Prioridad: **crítica**

### 6. Adjuntos subidos pueden perderse al recrear el backend productivo

- Estado: **confirmado**
- Módulo afectado: Solicitudes de asistencia / adjuntos
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:341-362`
  - `infra/docker/docker-compose.yml:46-65`
  - `zkdashboard/docker-compose.yml:31-40`
- Acción del usuario: subir certificado o comprobante a una solicitud.
- Qué falla: la base conserva metadata, pero el archivo físico queda en filesystem interno si se usa `infra/docker`.
- Por qué falla: el compose productivo no define `ATTENDANCE_ATTACHMENTS_DIR` ni volumen para `/home/reloj/attachments`.
- Impacto real: solicitudes pueden quedar con adjuntos “fantasma”: figuran en DB pero el archivo ya no existe.
- Cómo reproducirlo: subir adjunto, recrear contenedor backend con `infra/docker`, intentar descargarlo.
- Solución recomendada: declarar volumen persistente y variable `ATTENDANCE_ATTACHMENTS_DIR` en el compose productivo.
- Prioridad: **crítica**

### 7. Reportes de tardanzas, ausencias, salidas tempranas y horas trabajadas devuelven vacío si no se recalculó

- Estado: **confirmado**
- Módulo afectado: Reportes calculados
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/reports/services/phase2-reports.service.ts:47-72`
  - `zkdashboard/backend/src/reports/services/phase2-reports.service.ts:80-110`
  - `zkdashboard/frontend/src/app/(protected)/reports/late-arrivals/page.tsx:55`
- Acción del usuario: abrir reportes de tardanzas, ausencias, salidas tempranas u horas trabajadas.
- Qué falla: pueden aparecer vacíos aunque existan fichadas crudas.
- Por qué falla: estos reportes leen solo `attendance_day_summaries`; no consultan fichadas directas si faltan resúmenes.
- Impacto real: el usuario puede creer que no hubo ausencias/tardanzas cuando en realidad falta cálculo.
- Cómo reproducirlo: cargar fichadas, no recalcular, abrir `/reports/absences` o `/reports/late-arrivals`.
- Solución recomendada: bloquear/advertir con cobertura de resúmenes y acceso directo a recálculo antes de mostrar “no hay datos”.
- Prioridad: **alta**

### 8. Resumen mensual mezcla una fuente parcial con días vacíos

- Estado: **confirmado**
- Módulo afectado: Reporte mensual
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/reports/services/monthly-summary.service.ts:52-56`
  - `zkdashboard/backend/src/reports/services/monthly-summary.service.ts:168-172`
  - `zkdashboard/frontend/src/app/(protected)/reports/monthly-summary/page.tsx:92-104`
- Acción del usuario: consultar o exportar resumen mensual.
- Qué falla: si existe aunque sea un resumen diario, usa `summaries` para todo el mes y rellena los días faltantes como `no_records`.
- Por qué falla: el fallback a fichadas crudas solo se usa cuando no existe ningún resumen diario.
- Impacto real: totales de horas, ausencias y presentismo pueden quedar incorrectos.
- Cómo reproducirlo: recalcular un solo día del mes, dejar otros días con fichadas sin resumen y abrir resumen mensual.
- Solución recomendada: exigir cobertura completa para exportar o calcular los días faltantes desde fichadas crudas.
- Prioridad: **alta**

### 9. Cierre mensual puede entregar documento vacío o incompleto

- Estado: **confirmado**
- Módulo afectado: Cierre mensual
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/reports/services/monthly-closing.service.ts:144-168`
  - `zkdashboard/backend/src/reports/services/monthly-closing.service.ts:195-210`
  - `zkdashboard/backend/src/reports/exporters/reports-excel.exporter.ts:363-420`
- Acción del usuario: abrir/exportar cierre mensual.
- Qué falla: si no hay resúmenes, devuelve `rows: []`; si hay resúmenes parciales, exporta con datos incompletos.
- Por qué falla: el cierre mensual depende exclusivamente de `attendance_day_summaries`.
- Impacto real: riesgo de usar un cierre inválido para revisión de sueldos o RRHH.
- Cómo reproducirlo: empresa con empleados/fichadas, sin recálculo mensual, abrir `/reports/monthly-closing`.
- Solución recomendada: impedir exportación si `coverage.isComplete` es falso o generar aviso visible dentro del Excel.
- Prioridad: **alta**

### 10. Selector de empleados muestra empleados de otras empresas para super admin

- Estado: **confirmado**
- Módulo afectado: Filtros de reportes, solicitudes y fichadas
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/lib/api.ts:1366-1368`
  - `zkdashboard/backend/src/attendance/attendance.controller.ts:50-52`
  - `zkdashboard/backend/src/attendance/attendance.service.ts:233-263`
  - `zkdashboard/frontend/src/app/(protected)/attendance/requests/page.tsx:49-53`
- Acción del usuario: como super admin, seleccionar empresa y filtrar por empleado.
- Qué falla: el selector puede listar empleados/fichadores globales, no solo de la empresa seleccionada.
- Por qué falla: `/attendance/users` no recibe `companyId`; para super admin el scope backend queda global.
- Impacto real: filtros que devuelven vacío o datos engañosos cuando se selecciona empleado de otra empresa.
- Cómo reproducirlo: con dos empresas, abrir reporte con `companyId=A` y elegir un empleado de B en el selector.
- Solución recomendada: aceptar `companyId` en `/attendance/users` y pasarlo desde todas las pantallas multiempresa.
- Prioridad: **alta**

### 11. Botón “Limpiar” pierde la empresa seleccionada

- Estado: **confirmado**
- Módulo afectado: Filtros de reportes
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/reports/ReportFilters.tsx:47-49`
  - `zkdashboard/frontend/src/components/reports/ReportFilters.tsx:194-200`
  - `zkdashboard/frontend/src/app/(protected)/reports/employees-without-schedule/page.tsx:61-80`
- Acción del usuario: como super admin, limpiar filtros de un reporte.
- Qué falla: se pierde `companyId` y la pantalla vuelve a pedir selección de empresa.
- Por qué falla: el formulario preserva `companyId` con hidden input, pero el link “Limpiar” usa `href={action}` sin query.
- Impacto real: el usuario sale del contexto de empresa y debe volver a navegar.
- Cómo reproducirlo: abrir `/reports/late-arrivals?companyId=...` y pulsar “Limpiar”.
- Solución recomendada: construir el href de limpiar preservando `companyId`.
- Prioridad: **media**

### 12. Links “Volver a Reportes” pierden `companyId`

- Estado: **confirmado**
- Módulo afectado: Navegación de reportes para super admin
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/AdminCompanyDetailPanel.tsx:217`
  - `zkdashboard/frontend/src/app/(protected)/reports/page.tsx:16-17`
  - `zkdashboard/frontend/src/app/(protected)/reports/late-arrivals/page.tsx:65`
  - patrón repetido en páginas de reportes con `href="/reports"`
- Acción del usuario: entrar a reportes desde una empresa y luego pulsar “← Reportes”.
- Qué falla: vuelve a `/reports` sin `companyId`; para super admin eso muestra “seleccioná una empresa”.
- Por qué falla: las páginas hijas no preservan el query de empresa en el link de regreso.
- Impacto real: navegación rota o confusa en uso multiempresa.
- Cómo reproducirlo: desde `/admin/companies`, entrar a reportes de una empresa, abrir “Tardanzas”, pulsar “← Reportes”.
- Solución recomendada: construir backHref con `companyId` cuando venga en search params.
- Prioridad: **media**

### 13. Justificación puede crearse pero fallar recién al aprobar

- Estado: **confirmado**
- Módulo afectado: Solicitudes / justificaciones
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:116-175`
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:537-555`
- Acción del usuario: crear justificación de ausencia/tardanza y luego aprobarla.
- Qué falla: la solicitud queda creada, pero si no existe resumen diario, no marca el día como pendiente. Al aprobar falla con “No existe resumen diario para justificar”.
- Por qué falla: al crear, `markSummaryJustification` retorna silenciosamente si no hay summary y status no es `approved`.
- Impacto real: flujo con apariencia de éxito que se bloquea al final.
- Cómo reproducirlo: crear justificación para fecha sin resumen calculado y aprobarla.
- Solución recomendada: validar o crear/recalcular resumen al crear la solicitud; no esperar a la aprobación.
- Prioridad: **alta**

### 14. Fichada manual permite fecha sin hora y puede guardar un horario incorrecto

- Estado: **confirmado**
- Módulo afectado: Solicitudes / fichada manual
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/MaskedDateInput.tsx:69-106`
  - `zkdashboard/frontend/src/lib/input-masks.ts:45-51`
  - `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx:311-313`
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:898-910`
- Acción del usuario: crear fichada manual y completar solo la fecha en “Hora fichada”.
- Qué falla: el input visible `required` queda satisfecho con una fecha, `displayDateTimeToIso` devuelve solo `YYYY-MM-DD`, y backend lo parsea como fecha válida.
- Por qué falla: no se exige hora completa `HH:MM` en el frontend ni en el DTO.
- Impacto real: puede guardarse una fichada en medianoche UTC, que en Argentina cae el día anterior a las 21:00.
- Cómo reproducirlo: en nueva solicitud manual, escribir `26/05/2026` en “Hora fichada” sin hora y enviar.
- Solución recomendada: validar formato completo `YYYY-MM-DDTHH:mm` para `punchTime` y `newPunchTime`.
- Prioridad: **alta**

### 15. Rechazar solicitud permite avanzar sin nota y falla después del confirm

- Estado: **confirmado**
- Módulo afectado: Solicitudes / revisión
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/AttendanceRequestsManager.tsx:220-247`
  - `zkdashboard/backend/src/attendance/attendance-requests.service.ts:231-235`
- Acción del usuario: pulsar “Rechazar” sin escribir notas.
- Qué falla: la UI muestra confirmación y recién después backend responde error.
- Por qué falla: backend exige `reviewNotes`, pero frontend no valida antes de confirmar.
- Impacto real: experiencia trabada y mensaje tardío para una regla que podía validarse en pantalla.
- Cómo reproducirlo: solicitud pendiente, dejar “Notas de revisión” vacío y pulsar Rechazar.
- Solución recomendada: deshabilitar “Rechazar” o mostrar validación local si notas está vacío.
- Prioridad: **baja**

### 16. Auditoría de cambios de empleado no registra cambios reales

- Estado: **confirmado**
- Módulo afectado: Empleados / auditoría
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/employees/employees.service.ts:199-235`
  - `zkdashboard/backend/src/employees/employees.service.ts:262-320`
- Acción del usuario: cambiar perfil horario, sector, puesto o estado de empleado.
- Qué falla: el cambio se guarda, pero puede no generarse log de auditoría.
- Por qué falla: el snapshot `before` se arma después de mutar el objeto `employee`.
- Impacto real: acciones sensibles quedan sin trazabilidad aunque la pantalla muestre éxito.
- Cómo reproducirlo: editar un empleado, cambiar perfil o inactivarlo y revisar auditoría administrativa.
- Solución recomendada: capturar `before` antes de cualquier mutación.
- Prioridad: **alta**

### 17. Filtros de fecha en Fichadas pueden filtrar otro rango horario

- Estado: **confirmado**
- Módulo afectado: Fichadas / exportación clásica
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/attendance/attendance.service.ts:217-224`
  - `zkdashboard/backend/src/attendance/export.service.ts:90-96`
  - `zkdashboard/backend/src/attendance/export.service.ts:56-63`
- Acción del usuario: filtrar o exportar fichadas por día.
- Qué falla: `new Date('YYYY-MM-DD')` se interpreta en UTC, no como inicio de día Argentina.
- Por qué falla: estos endpoints no usan `parseArgentinaDateStart/End`, a diferencia de reportes nuevos.
- Impacto real: registros cerca de medianoche pueden aparecer en el día incorrecto o quedar fuera.
- Cómo reproducirlo: crear fichadas entre 21:00 y 00:00 Argentina y filtrar por día exacto.
- Solución recomendada: usar utilidades de fecha Argentina en `attendance.service` y `export.service`.
- Prioridad: **alta**

### 18. Botones “Actualizar desde reloj” y “Pedir fichadas” solo encolan, pero el mensaje puede sentirse como resolución

- Estado: **confirmado**
- Módulo afectado: Fichadas / sincronización de reloj
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/RecordsSyncControls.tsx:45-65`
  - `zkdashboard/frontend/src/components/DeviceStatusPanel.tsx:37-45`
  - `zkdashboard/backend/src/devices/devices.controller.ts:137-153`
- Acción del usuario: pedir fichadas al reloj.
- Qué falla: la acción no trae fichadas inmediatamente; solo encola `DATA QUERY ATTLOG` para el próximo heartbeat.
- Por qué falla: es un flujo asincrónico, pero la pantalla no muestra seguimiento claro hasta confirmación del dispositivo.
- Impacto real: el usuario puede creer que ya actualizó datos y abrir reportes que siguen vacíos.
- Cómo reproducirlo: pulsar “Actualizar desde reloj” con reloj offline o sin heartbeat inmediato.
- Solución recomendada: mostrar estado “pendiente de retiro por reloj”, fecha de confirmación y recomendación de esperar/reintentar.
- Prioridad: **media**

### 19. Sincronización de usuarios del reloj recarga conciliación antes de tener respuesta del reloj

- Estado: **confirmado**
- Módulo afectado: Empleados / sincronización con dispositivos
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/components/EmployeesManager.tsx:315-347`
  - `zkdashboard/backend/src/devices/devices.controller.ts:43-64`
  - `zkdashboard/backend/src/devices/devices.controller.ts:67-87`
- Acción del usuario: consultar usuarios del reloj o enviar un empleado al reloj.
- Qué falla: la UI muestra éxito y llama `loadReconciliation` inmediatamente, aunque el reloj responderá en un heartbeat posterior.
- Por qué falla: se recarga un dato dependiente de una operación asincrónica todavía no confirmada.
- Impacto real: la conciliación puede seguir igual, dando sensación de que la acción no hizo nada o de que falló silenciosamente.
- Cómo reproducirlo: pulsar “Actualizar usuarios del reloj” y observar que la conciliación no cambia hasta que el reloj responda.
- Solución recomendada: mostrar comando pendiente y refrescar conciliación solo tras confirmación o polling explícito.
- Prioridad: **media**

### 20. Endpoints de sincronización de empleados existen pero no se usan desde la UI actual

- Estado: **confirmado**
- Módulo afectado: Empleados / endpoints desconectados
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/employees/employees.controller.ts:95-120`
  - `zkdashboard/frontend/src/app/(protected)/employees/actions.ts:142-153`
  - `zkdashboard/frontend/src/app/(protected)/employees/actions.ts:185-204`
  - `zkdashboard/frontend/src/components/EmployeesManager.tsx:315-347`
- Acción del usuario: importar desde reloj o enviar empleado al reloj desde la pantalla de empleados.
- Qué falla: la UI usa `/devices/:id/query-users` y `/devices/:id/employees/:employeeId/sync-user`; los actions `importEmployeesFromDeviceAction` y `exportEmployeeToDeviceAction` quedan sin uso.
- Por qué falla: quedaron dos caminos de API para una funcionalidad similar, pero uno no está conectado.
- Impacto real: mantenimiento confuso y riesgo de corregir/probar el endpoint equivocado. Además, `POST /employees/device-sync/:deviceId/export` masivo existe pero siempre devuelve error “deshabilitada”.
- Cómo reproducirlo: buscar referencias a `importEmployeesFromDeviceAction` o `exportEmployeeToDeviceAction`; solo están definidos.
- Solución recomendada: eliminar/deprecar endpoints y actions no usados o conectar explícitamente una única ruta funcional.
- Prioridad: **baja**

### 21. Importación de empleados puede informar éxito aunque no haya creado nada

- Estado: **confirmado**
- Módulo afectado: Empleados / importación CSV-Excel
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/app/(protected)/employees/actions.ts:249-262`
  - `zkdashboard/backend/src/employees/employees.service.ts:543-552`
- Acción del usuario: confirmar importación con empleados ya existentes.
- Qué falla: backend omite duplicados, pero el mensaje principal puede ser “La importación creó 0 empleado(s).”
- Por qué falla: el flujo trata `createdCount=0` como éxito sin advertencia destacada.
- Impacto real: acción sin efecto presentada como satisfactoria.
- Cómo reproducirlo: importar un CSV cuyos documentos ya existan.
- Solución recomendada: mostrar creado/omitido/error y usar advertencia si no se creó ningún registro.
- Prioridad: **baja**

### 22. Pantallas de reportes muestran empleados sin datos personales como si fueran opciones normales

- Estado: **confirmado**
- Módulo afectado: Filtros / empleados generados por fichadas
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/attendance/attendance.service.ts:69-90`
  - `zkdashboard/backend/src/attendance/attendance.service.ts:233-263`
  - `zkdashboard/frontend/src/components/reports/ReportFilters.tsx:90-104`
- Acción del usuario: abrir selector “Empleado”.
- Qué falla: pueden aparecer usuarios creados automáticamente con nombre/apellido vacío.
- Por qué falla: al recibir fichadas de un userId desconocido, backend crea `Employee` mínimo con nombre y apellido vacíos.
- Impacto real: el usuario ve opciones poco claras y puede filtrar por personas no identificadas.
- Cómo reproducirlo: recibir fichada de un DNI/PIN no cargado como empleado y abrir cualquier filtro de empleados.
- Solución recomendada: marcar estos registros como “Empleado no identificado” y ofrecer flujo de completar datos/asignar empresa.
- Prioridad: **media**

### 23. Checklist “Período recalculado” lleva al resumen mensual, no al recálculo

- Estado: **confirmado**
- Módulo afectado: Dashboard / guía operativa
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/app/(protected)/dashboard/page.tsx:96-104`
- Acción del usuario: en el dashboard, pulsar “Período recalculado”.
- Qué falla: el link va a `/reports/monthly-summary`, que consulta resultados; no va a `/reports/day-summaries`, donde está el botón “Recalcular período”.
- Por qué falla: el CTA apunta a una pantalla de lectura, no a la acción necesaria.
- Impacto real: usuario nuevo puede no encontrar cómo recalcular y luego ver reportes vacíos.
- Cómo reproducirlo: abrir dashboard de empresa y pulsar “Período recalculado”.
- Solución recomendada: apuntar al reporte de resúmenes diarios o cambiar el texto del checklist.
- Prioridad: **media**

### 24. `GET /attendance/devices` existe pero el frontend usa `/devices`

- Estado: **confirmado**
- Módulo afectado: API / endpoints no usados
- Archivo o ruta exacta:
  - `zkdashboard/backend/src/attendance/attendance.controller.ts:55-58`
  - `zkdashboard/frontend/src/lib/api.ts:1180-1182`
- Acción del usuario: ninguna directa; es endpoint expuesto sin consumidor visible.
- Qué falla: hay dos rutas potenciales para obtener dispositivos, pero la UI usa `/devices`.
- Por qué falla: endpoint duplicado o legado quedó en el controller de asistencia.
- Impacto real: bajo para usuario final, pero aumenta superficie API y confusión al mantener permisos/contratos.
- Cómo reproducirlo: buscar `/attendance/devices` en frontend; no hay llamadas.
- Solución recomendada: documentar como público interno o retirarlo si es legado.
- Prioridad: **baja**

### 25. Acceso directo de super admin a `/records` muestra fichadas globales sin selector de empresa

- Estado: **requiere verificación**
- Módulo afectado: Fichadas / permisos multiempresa
- Archivo o ruta exacta:
  - `zkdashboard/frontend/src/app/(protected)/records/page.tsx:43-55`
  - `zkdashboard/backend/src/attendance/attendance.service.ts:199-230`
  - `zkdashboard/backend/src/auth/company-scope.util.ts:4-7`
- Acción del usuario: super admin entra manualmente a `/records`.
- Qué falla: no hay selector/guard de empresa; backend no aplica `companyId` para super admin.
- Por qué falla: `getCompanyScope` devuelve `null` para super admin, y la página no exige `companyId`.
- Impacto real: puede mostrar fichadas de todas las empresas juntas, lo que contradice otros reportes que obligan a seleccionar empresa.
- Cómo reproducirlo: iniciar sesión como super admin y navegar directo a `/records`.
- Solución recomendada: confirmar intención de producto; si no es vista global deseada, exigir `companyId`.
- Prioridad: **media**

## Priorización funcional inmediata

1. Resolver todas las rutas `/api/*` usadas por botones reales: exportaciones, adjuntos, contacto y plantilla CSV.
2. Proteger persistencia de adjuntos.
3. Evitar reportes vacíos/incorrectos por falta de recálculo o cobertura parcial.
4. Corregir filtros multiempresa: selector de empleados, limpiar filtros y volver a reportes.
5. Validar fichadas manuales con fecha y hora completas.
6. Corregir flujo de justificaciones sin resumen diario.
7. Separar visualmente acciones “encoladas” de acciones “confirmadas”.
8. Limpiar endpoints/actions no usados para no mantener flujos muertos.

