# Informe tecnico de continuidad

Fecha de auditoria: 2026-05-26  
Proyecto auditado: `Reloj / zkdashboard`  
Alcance: analisis estatico del repositorio abierto, sin modificar codigo fuente, sin instalar dependencias y sin ejecutar migraciones.

## 1. Resumen ejecutivo

El proyecto es una plataforma web multiempresa para control de asistencia con relojes biometricos ZKTeco/ADMS. La arquitectura real esta separada en:

- Backend NestJS + TypeORM + PostgreSQL.
- Frontend Next.js App Router + React + Tailwind CSS.
- Infraestructura Docker Compose + Nginx + GitHub Actions para build/deploy en runners self-hosted.

El sistema tiene una cobertura funcional amplia: login JWT, usuarios por empresa, empresas, empleados, dispositivos, recepcion ADMS `/iclock`, fichadas, reportes, feriados, solicitudes de justificacion/correccion, adjuntos, perfiles horarios, resumen diario, banco de horas, auditoria parcial y dashboard global de super admin.

El estado actual no debe considerarse listo para produccion sin correcciones previas. Hay riesgos concretos de despliegue, seguridad operacional y continuidad:

- No hay tests automatizados ni configuracion de test.
- No hay `.env.example`, aunque el workflow de validacion lo exige.
- El Nginx productivo actual rompe rutas API del frontend como `/api/reports/export` y `/api/export`.
- El `docker-compose` productivo de `infra/docker` no persiste adjuntos, aunque la documentacion tecnica indica que deben persistirse.
- El CI/CD depende de runners self-hosted y de un `.env` manual no versionado.
- El backend no valida explicitamente variables criticas como `JWT_SECRET`.
- La cookie de sesion no declara `secure`, `sameSite` ni estrategia CSRF.
- La auditoria de configuracion RH existe, pero no cubre todos los modulos y en `EmployeesService.update()` el snapshot `before` se toma despues de mutar la entidad, por lo que varios cambios no se auditan correctamente.
- No hay evidencia local de dependencias instaladas (`node_modules` ausente) ni build verificable en esta auditoria.

Madurez estimada: prototipo avanzado / piloto tecnico, no produccion robusta.

## 2. Stack tecnologico real

### Backend

- Node.js 20 en Docker.
- NestJS 10.
- TypeScript.
- TypeORM 0.3.
- PostgreSQL 16.
- Passport JWT + `@nestjs/jwt`.
- `bcrypt` para hashes de contrasenas.
- `class-validator` y `class-transformer` para DTOs.
- `helmet`.
- `exceljs` y `pdfkit` para exportaciones.
- Logs por archivo con utilidades propias.

### Frontend

- Next.js 14.2 App Router.
- React 18.3.
- TypeScript estricto en frontend.
- Tailwind CSS 3.4.
- Server Components, Server Actions y Route Handlers.
- Cookies HTTP-only para token JWT.
- Componentes cliente para gestores CRUD y UX interactiva.
- Dependencias 3D (`three`, `@react-three/fiber`, `@react-three/drei`) presentes, aunque el core operativo no depende de 3D.

### Infraestructura

- Docker Compose para `postgres`, `backend`, `frontend`.
- Nginx reverse proxy para dominio `el77.nqn.net.ar`.
- GitHub Actions con workflows `validate.yml` y `deploy.yml`.
- Runners self-hosted.
- Scripts manuales de backup/restore para piloto.

### Gestion de paquetes

- Monorepo npm workspaces en `zkdashboard/package.json`.
- Backend usa `package.json` sin lock propio visible.
- Frontend tiene `pnpm-lock.yaml`.
- Raiz `zkdashboard` tiene `package-lock.json`.

Hay mezcla de lockfiles npm/pnpm. Esto no es automaticamente invalido, pero aumenta el riesgo de builds no reproducibles si el equipo no define un gestor unico por workspace.

## 3. Arquitectura detectada

Arquitectura general:

```text
Reloj ZKTeco/ADMS
        |
        | HTTP plano /iclock
        v
Backend NestJS
        |
        | TypeORM
        v
PostgreSQL

Usuario web
        |
        | Next.js UI
        v
Frontend Next.js
        |
        | fetch server-side con Bearer token
        v
Backend NestJS
```

El frontend no consume el backend directamente desde el browser para la mayoria de operaciones. Usa Server Components, Server Actions y Route Handlers que leen la cookie `token` y agregan `Authorization: Bearer ...` hacia el backend.

El backend concentra reglas de negocio, scoping multiempresa, recepcion ADMS, persistencia y exportaciones.

## 4. Flujo general del sistema

1. Un usuario ingresa en `/login`.
2. El frontend llama a `POST /auth/login`.
3. El backend valida usuario/contrasena con bcrypt y firma un JWT.
4. El frontend guarda el JWT en cookie HTTP-only llamada `token`.
5. El middleware de Next redirige segun presencia de token y rol super admin.
6. Las paginas protegidas llaman a funciones de `src/lib/api.ts`.
7. `apiFetch()` lee la cookie, agrega Bearer token y consulta el backend.
8. Los relojes biometricos se comunican con el backend por `/iclock`.
9. El backend registra dispositivos, heartbeats, comandos, ATTLOG, snapshots USERINFO e inbound requests.
10. Las fichadas se guardan en `attendance_records`.
11. Los reportes basicos consultan fichadas y empleados.
12. Los reportes avanzados dependen de recalcular `attendance_day_summaries`.
13. RRHH puede crear solicitudes de fichada manual, correccion o justificacion.
14. Al aprobar solicitudes se actualizan registros/resumenes y se escriben auditorias de asistencia.

## 5. Modulos existentes

### Backend

- `auth`: login, perfil, cambio de contrasena, JWT strategy, guards por rol.
- `users`: usuarios administrativos, bootstrap de super admin inicial.
- `companies`: empresas, membresias, usuarios por empresa, settings y perfiles horarios.
- `employees`: empleados, importacion CSV, import/export hacia reloj, banco de horas, departamentos y puestos.
- `devices`: dispositivos, comandos, reconciliacion USERINFO, asignacion a empresas, estado online/offline.
- `adms`: endpoints `/iclock`, `/iclock/cdata`, `/iclock/getrequest`, `/iclock/devicecmd`, `/iclock/ping`.
- `attendance`: fichadas, dashboard, export basico, resumenes diarios, solicitudes, adjuntos, feriados.
- `reports`: reportes diarios, incompletos, resumen mensual, cierre mensual, tardanzas, ausencias, horas, fichadas manuales/corregidas.
- `admin-dashboard`: dashboard global de super admin.
- `admin`: soporte, auditoria de recalculos y auditoria de configuracion.
- `logging`: access log, error log, security log y redaccion parcial de payloads biometricos.
- `database`: data source TypeORM y migraciones.

### Frontend

- `(marketing)`: landing comercial CONFLUNET.
- `(auth)/login`: login.
- `(protected)/dashboard`: panel empresa.
- `(protected)/admin/dashboard`: panel global.
- `(protected)/admin/companies`: gestion global de empresas.
- `(protected)/admin/devices`: gestion global de relojes.
- `(protected)/employees`: empleados, importacion y sincronizacion con relojes.
- `(protected)/records`: fichadas.
- `(protected)/reports/*`: hub y reportes operativos.
- `(protected)/attendance/requests`: solicitudes y justificaciones.
- `(protected)/settings`: perfiles horarios.
- `(protected)/settings/holidays`: feriados.
- `(protected)/settings/org-structure`: departamentos y puestos.
- `(protected)/users`: usuarios de empresa.
- `(protected)/profile`: perfil y cambio de contrasena.
- `app/api/*`: proxies/route handlers para exportaciones, adjuntos, contacto y plantilla CSV.

## 6. Estado real del proyecto

El proyecto esta funcionalmente avanzado, pero presenta estado de piloto:

- Hay muchas entidades y migraciones, lo que indica evolucion real del modelo.
- Hay documentacion parcial de etapa/piloto.
- Hay Dockerfiles productivos.
- Hay workflows de deploy.
- No hay tests automatizados.
- No hay seed productivo seguro; existe bootstrap automatico de admin si la tabla esta vacia.
- No hay monitoreo externo ni observabilidad formal, solo logs por archivo y dashboards internos.
- No hay gestion versionada de variables de entorno de ejemplo.
- No hay evidencia de que el stack compile actualmente en este entorno porque no hay dependencias instaladas y no se instalaron por instruccion expresa.

## 7. Que funciona actualmente

Segun el codigo implementado, el sistema soporta:

- Login JWT.
- Perfil de usuario y cambio de contrasena.
- Roles: `super_admin`, `company_admin`, `operator`, `read_only`.
- Multiempresa mediante `company_memberships`.
- CRUD de empresas para super admin.
- Asignacion de empleados y usuarios a empresas.
- CRUD de empleados por empresa.
- Importacion de empleados por archivo.
- Departamentos y puestos.
- Perfiles horarios con reglas por dia, turnos partidos, ciclos y banco de horas.
- Feriados globales y por empresa.
- Recepcion ADMS de relojes.
- Rechazo logico de ATTLOG si el dispositivo no esta registrado o no tiene empresa.
- Insercion idempotente de fichadas por indice unico `(device_sn, user_id, timestamp)`.
- Comandos hacia relojes por heartbeat.
- Consulta/importacion USERINFO desde reloj.
- Sincronizacion individual de empleado hacia reloj.
- Dashboard de empresa.
- Dashboard global de super admin.
- Reportes y exportaciones Excel/PDF.
- Solicitudes de fichada manual, correccion y justificacion.
- Adjuntos PDF/JPG/PNG con validacion de extension, MIME y magic bytes.
- Auditoria de solicitudes de asistencia.
- Auditoria parcial de recalculos y algunos cambios de empleados.

## 8. Que falta para produccion

Faltan condiciones basicas:

- Suite de tests unitarios, integracion y e2e.
- Validacion automatica real en CI con instalacion reproducible de dependencias.
- `.env.example` completo y actualizado.
- Validacion fail-fast de variables criticas (`JWT_SECRET`, DB, URLs, paths de adjuntos).
- Correccion de Nginx para rutas API propias del frontend.
- Persistencia productiva de adjuntos en `infra/docker/docker-compose.yml`.
- Politica formal de backup para PostgreSQL y adjuntos en produccion.
- Migraciones probadas en base limpia y base existente.
- Hardening de cookies y CSRF.
- Rate limiting distribuido si se escala a mas de una instancia.
- Logs estructurados con rotacion y retencion.
- Observabilidad externa: metricas, alertas, health checks semanticos.
- Documentacion operacional de despliegue, rollback y recuperacion.
- Auditoria completa y confiable de cambios RH.

## 9. Riesgos tecnicos

### Criticos

1. Nginx productivo rompe exportaciones del frontend.
   - La app usa `/api/reports/export` y `/api/export` como Route Handlers de Next.
   - El Nginx actual manda todo `/api/` al backend con strip de `/api`.
   - Resultado probable: exportaciones llegan a rutas backend inexistentes o incorrectas.
   - La documentacion `piloto-cierre-tecnico.md` advierte una regla especial para `/api/reports/export`, pero `infra/nginx/el77.nqn.net.ar.conf` no la implementa.

2. Adjuntos no persistidos en compose productivo.
   - El compose viejo `zkdashboard/docker-compose.yml` monta `attendance_attachments`.
   - El compose productivo `infra/docker/docker-compose.yml` solo monta logs.
   - `ATTENDANCE_ATTACHMENTS_DIR` tampoco esta configurado ahi.
   - Riesgo: perdida de adjuntos al recrear contenedor.

3. No hay tests.
   - No existen archivos `*.spec`, `*.test`, Jest, Vitest, Playwright ni Cypress.
   - La regresion de reglas de asistencia y permisos es muy probable.

4. `JWT_SECRET` no se valida.
   - El backend toma `JWT_SECRET` desde config, pero no hay validacion de presencia.
   - Un despliegue mal configurado puede fallar en runtime o quedar inseguro segun comportamiento de librerias.

### Altos

5. CI inconsistente.
   - `validate.yml` usa `docker compose --env-file .env.example`, pero no existe `.env.example`.
   - Deploy usa `.env` manual en runner y `clean: false`.
   - Dependencia fuerte de estado local del runner self-hosted.

6. Auditoria RH incompleta/incorrecta.
   - `OrgStructureService`, `HolidaysService` y `CompaniesService` no integran `AdminAuditService`.
   - En `EmployeesService.update()` el objeto `before` se arma despues de modificar la entidad, por lo que cambios de estado, departamento, puesto y perfil pueden no quedar auditados.

7. Cookie de sesion incompleta.
   - Se setea `httpOnly`, `path` y `maxAge`.
   - No se setea `secure`, `sameSite`, `domain` ni estrategia CSRF.

8. Rate limiting en memoria.
   - Sirve para una instancia.
   - No sirve correctamente en despliegues horizontales ni sobre reinicios.

9. Logs por archivo sin rotacion visible.
   - Puede llenar disco.
   - No hay retencion ni formato JSON estructurado.

10. Super admin puede consultar reportes globales sin `companyId` en backend.
    - El frontend intenta pedir `companyId`, pero el backend permite `companyId = null`.
    - Puede generar consultas pesadas y mezclar datos de todas las empresas.

## 10. Deuda tecnica

- Servicios muy grandes:
  - `DevicesService`: 1839 lineas.
  - `CompaniesService`: 1103 lineas.
  - `AttendanceRequestsService`: 1064 lineas.
  - `EmployeesService`: 979 lineas.
  - `frontend/src/lib/api.ts`: 1719 lineas.
- Tipado backend relajado:
  - `strict: false`.
  - `noImplicitAny: false`.
  - Uso de `any` en controladores y servicios.
- Validacion de entorno inexistente.
- Reglas de negocio complejas concentradas en servicios monoliticos.
- Documentacion desfasada respecto al codigo actual.
- Mezcla npm/pnpm.
- Bootstrap automatico de usuario admin con fallback de contrasena.
- Ausencia de OpenAPI/Swagger o contrato versionado de API.
- Sin estrategia de versionado de endpoints.
- Sin fixtures ni datos de prueba automatizados.
- Importaciones y conciliacion con relojes dependen de protocolo textual propio sin tests de parser.

## 11. Escalabilidad

El sistema puede operar como monolito para piloto o baja carga. Para escalar hay limitaciones:

- Rate limit local en memoria.
- Procesamiento ADMS y app web comparten el mismo proceso backend.
- Recalculos se ejecutan sin cola de trabajos.
- Comandos a dispositivos dependen de polling/heartbeat y base relacional.
- Reportes pueden volverse costosos con muchas empresas, empleados y fichadas.
- Logs a filesystem local dificultan despliegue multiinstancia.
- Adjuntos en filesystem local requieren volumen compartido o storage externo.
- No hay cache, cola, Redis ni workers.

Recomendacion: antes de escalar, separar tareas pesadas en jobs/queue, mover rate limits a Redis, definir storage de adjuntos externo o volumen persistente compartido, y agregar indices/query plans validados con datos reales.

## 12. Seguridad

Aspectos positivos:

- JWT con expiracion configurable.
- Hash de contrasenas con bcrypt.
- Guards por rol en backend.
- Scoping multiempresa implementado en servicios principales.
- `helmet` activo.
- Rate limit para login y endpoints ADMS.
- Redaccion de payloads biometricos sensibles en tablas ADMS conocidas.
- Adjuntos validan extension, MIME y magic bytes.
- Descarga de adjuntos pasa por permisos.

Riesgos:

- Cookie sin `secure` ni `sameSite`.
- No hay CSRF para Server Actions mutantes.
- `JWT_SECRET` sin validacion.
- Bootstrap crea admin inicial con fallback (`admin1234` en servicio, `admin123` en compose productivo), riesgo si se despliega mal.
- CORS permite un solo `FRONTEND_URL`, pero no hay validacion de entorno.
- ADMS por HTTP plano, aceptado por compatibilidad, pero expone superficie publica.
- No hay allowlist de IPs para relojes.
- No hay rotacion/revocacion de tokens.
- No hay bloqueo persistente de intentos fallidos.
- No hay 2FA para super admin.
- No hay auditoria completa confiable de cambios administrativos.

## 13. Persistencia

Persistencia principal:

- PostgreSQL.
- TypeORM migrations.
- Tablas principales:
  - `admin_users`
  - `companies`
  - `company_memberships`
  - `employees`
  - `departments`
  - `positions`
  - `devices`
  - `device_commands`
  - `device_user_snapshots`
  - `inbound_requests`
  - `attendance_records`
  - `attendance_day_summaries`
  - `attendance_requests`
  - `attendance_request_attachments`
  - `attendance_justification_types`
  - `attendance_audit_logs`
  - `holidays`
  - `schedule_profiles`
  - `schedule_profile_day_rules`
  - `schedule_profile_day_intervals`
  - `employee_time_bank_ledger`
  - `attendance_recalculation_logs`
  - `admin_config_audit_logs`

Persistencia secundaria:

- Logs en filesystem (`/home/reloj/log`).
- Adjuntos en filesystem (`ATTENDANCE_ATTACHMENTS_DIR` o `/home/reloj/attachments`).

Problema: la persistencia de adjuntos esta contemplada en codigo y docs, pero no queda bien resuelta en el compose productivo principal.

## 14. Backend/API

Endpoints principales:

- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me`
- `PUT /auth/change-password`
- `GET /admin/dashboard`
- `GET /admin/support/*`
- `GET|POST|PUT|DELETE /admin/companies`
- `GET|PUT|DELETE /admin/devices`
- `GET|PUT|POST|DELETE /company/*`
- `GET|POST|PUT|DELETE /employees`
- `GET|POST|PUT|DELETE /departments`
- `GET|POST|PUT|DELETE /positions`
- `GET /devices`
- `POST /devices/:id/*`
- `GET|POST /iclock`
- `GET /iclock/getrequest`
- `POST /iclock/devicecmd`
- `GET /attendance`
- `GET /attendance/dashboard`
- `GET /attendance/day-summaries`
- `POST /attendance/recalculate`
- `GET|POST|PUT|DELETE /attendance/requests`
- `GET|POST|PUT|DELETE /holidays`
- `GET /reports/*`

El backend no define prefijo global `/api`; el Nginx productivo lo agrega externamente y lo elimina al proxyar.

## 15. Base de datos

El modelo relacional esta razonablemente normalizado para el dominio actual. Hay indices importantes en:

- Fichadas por dispositivo/usuario/timestamp.
- Fichadas por empresa/timestamp.
- Resumenes diarios por empresa/empleado/fecha.
- Solicitudes por empresa/estado/tipo/empleado.
- Auditorias por empresa/fecha/accion.
- Dispositivos por empresa.
- Comandos por dispositivo/estado.

Observaciones:

- La unicidad de fichadas por `(device_sn, user_id, timestamp)` evita duplicados de reenvio ADMS.
- Para fichadas manuales/correcciones puede haber restricciones funcionales que dependen del mismo indice.
- No hay evidencia de tests de migraciones.
- Varias migraciones usan `IF NOT EXISTS`, util para idempotencia, pero puede ocultar drift de esquema si una tabla existe con estructura distinta.
- `DB_SYNCHRONIZE` esta desactivado por defecto y bloqueado en produccion salvo env, lo cual es correcto.

## 16. Recomendaciones prioritarias

Prioridad 0, antes de produccion:

1. Corregir Nginx para que `/api/reports/export`, `/api/export` y rutas frontend necesarias lleguen a Next.js antes de `/api/`.
2. Agregar volumen persistente y variable `ATTENDANCE_ATTACHMENTS_DIR` al compose productivo.
3. Crear `.env.example` real para `infra/docker` y alinear workflows.
4. Validar `JWT_SECRET` y variables criticas al boot.
5. Harden de cookie: `secure`, `sameSite`, configuracion por entorno y revisar CSRF.
6. Corregir auditoria de `EmployeesService.update()` y completar auditoria en feriados, estructura, settings y perfiles.
7. Agregar tests minimos para auth, scoping multiempresa, ADMS ATTLOG, solicitudes, recalculo y reportes.

Prioridad 1:

8. Unificar gestor de paquetes y lockfiles.
9. Agregar OpenAPI o documentacion automatica de endpoints.
10. Implementar rotacion de logs o envio a plataforma externa.
11. Agregar backups productivos probados para DB y adjuntos.
12. Agregar health checks semanticos (`/health`) que validen DB.
13. Mover rate limiting a storage compartido si habra mas de una instancia.

Prioridad 2:

14. Separar jobs de recalculo y reportes pesados.
15. Dividir servicios monoliticos.
16. Agregar metricas de ADMS, latencia, errores, comandos pendientes y almacenamiento.
17. Agregar 2FA o controles reforzados para super admin.

## 17. Roadmap tecnico sugerido

### Fase 1: estabilizacion de deploy

- Arreglar Nginx.
- Arreglar compose productivo de adjuntos.
- Crear `.env.example`.
- Validar variables requeridas.
- Probar build backend/frontend en runner limpio.
- Ejecutar migraciones en base staging.

### Fase 2: seguridad basica

- Cookie segura por entorno.
- Estrategia CSRF para mutaciones.
- Politica de contrasenas y bootstrap admin sin defaults inseguros.
- Rate limit persistente para login.
- Reglas de exposicion ADMS por IP o token si el hardware lo permite.

### Fase 3: confiabilidad funcional

- Tests de permisos multiempresa.
- Tests de ATTLOG idempotente.
- Tests de calculo diario.
- Tests de solicitudes y adjuntos.
- Tests de reportes criticos.
- Fixtures de datos representativos.

### Fase 4: operacion productiva

- Backups automatizados y restore ensayado.
- Logs estructurados y rotados.
- Alertas por dispositivos offline, errores ADMS, comandos vencidos y disco.
- Dashboard support conectado al frontend o herramienta operacional.

### Fase 5: escalabilidad

- Queue para recalculos y comandos pesados.
- Redis para rate limit y locks.
- Storage externo para adjuntos.
- Optimizacion de queries/reportes con datos reales.
- Separacion eventual de worker ADMS si la carga lo justifica.

## 18. Nivel de madurez del sistema

Evaluacion honesta:

- Dominio funcional: alto para piloto.
- Arquitectura base: correcta para monolito modular.
- Seguridad: media-baja para produccion publica.
- Testing: muy bajo.
- CI/CD: bajo-medio, existe pero fragil.
- Observabilidad: baja.
- Persistencia: media, con hueco importante en adjuntos productivos.
- Escalabilidad: baja-media, suficiente para una instancia/piloto.
- Mantenibilidad: media-baja por servicios grandes y falta de tests.

Nivel global: 5/10.

El proyecto esta por encima de un prototipo simple, pero todavia por debajo de un sistema productivo confiable.

## 19. Conclusion tecnica honesta

El sistema tiene mucho trabajo implementado y una direccion tecnica razonable: separacion frontend/backend, NestJS con TypeORM, migraciones, scoping por empresa, integracion ADMS, reportes y flujo operativo completo para RRHH.

El problema no es falta de funcionalidad. El problema es falta de garantias.

Hoy el mayor riesgo es operar en produccion con comportamientos no verificados: rutas de Nginx que contradicen al frontend, adjuntos sin persistencia en el compose principal, ausencia total de tests, CI incompleto por falta de `.env.example`, seguridad de sesion incompleta y auditoria administrativa parcial. Estos puntos no son cosmeticos; pueden provocar perdida de archivos, fallas visibles para usuarios, brechas de permisos o imposibilidad de diagnosticar incidentes.

Recomendacion final: tratar el proyecto como piloto avanzado. No abrirlo a produccion real multiempresa hasta completar la fase de estabilizacion, seguridad basica y pruebas minimas. Con esas correcciones, la base tecnica puede evolucionar bien; sin ellas, el costo de soporte y riesgo operativo va a crecer rapidamente.
