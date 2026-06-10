# Cierre tecnico para piloto CONFLUNET

## Build y migraciones

Antes de publicar:

```bash
git diff --check
npm run build:backend
npm run build:frontend
```

Si se ejecuta dentro de Docker, validar que el build de backend y frontend termine sin errores y que las migraciones corran en orden.

Entidades criticas registradas:

- AttendanceDaySummary
- AttendanceRequest
- AttendanceRequestAttachment
- AttendanceJustificationType
- DeviceUserSnapshot
- ScheduleProfileDayInterval
- EmployeeTimeBankLedger

## Nginx / rutas

Reglas esperadas:

- `/api/reports/export` debe ir al frontend Next.js. Esa ruta usa handlers del frontend para descargar archivos.
- `/api/` debe ir al backend NestJS.
- `/iclock` debe ir al backend NestJS para ADMS.

Ejemplo de prioridad:

```nginx
location /api/reports/export {
  proxy_pass http://frontend:4200;
}

location /api/ {
  proxy_pass http://backend:4370;
}

location /iclock {
  proxy_pass http://backend:4370;
}
```

## Adjuntos

Variable requerida:

```bash
ATTENDANCE_ATTACHMENTS_DIR=/home/reloj/attachments
```

En Docker debe existir volumen persistente montado en esa ruta. El backend no expone `storagePath` al frontend; las descargas pasan por endpoints con validacion de permisos.

Verificaciones:

- La carpeta existe.
- El usuario del contenedor puede escribir.
- El volumen se incluye en backups.
- Restaurar el volumen junto con la base de datos.

## Backup

Script:

```bash
./scripts/backup-pilot.sh
```

Variables opcionales:

```bash
BACKUP_DIR=./backups
DB_CONTAINER=zkdashboard_db
DB_USER=zkuser
DB_NAME=zkdashboard
ATTACHMENTS_VOLUME=zkdashboard_attendance_attachments
```

Genera:

- `db-YYYYMMDD-HHMMSS.dump`
- `attachments-YYYYMMDD-HHMMSS.tar.gz`

## Restore

Script:

```bash
./scripts/restore-pilot.sh ./backups/db-YYYYMMDD-HHMMSS.dump ./backups/attachments-YYYYMMDD-HHMMSS.tar.gz
```

El restore limpia y reemplaza datos de la base y adjuntos del volumen indicado.

## Idempotencia ATTLOG

La tabla `attendance_records` mantiene índice único por:

- `device_sn`
- `user_id`
- `timestamp`

El ingreso ADMS usa inserción idempotente: si el reloj reenvía una fichada duplicada, se ignora y el lote sigue.

Flujos manuales/corrección:

- Si RRHH intenta crear/corregir una fichada hacia un horario ya existente, se responde:
  `Ya existe una fichada para ese empleado en ese horario.`

## Checklist ADMS real

1. Conectar reloj y validar heartbeat en `/iclock/getrequest`.
2. Confirmar que el dispositivo queda online.
3. Generar una fichada real y verificar ATTLOG.
4. Reenviar la misma fichada y confirmar que no duplica ni corta el lote.
5. Consultar usuarios del reloj (`USERINFO`).
6. Enviar un empleado individual al reloj (`DATA UPDATE USERINFO`).
7. Confirmar `devicecmd` con `ID` y `SN` correctos.
8. Ejecutar `CHECK TIME`.
9. Ejecutar `SET TIME`.
10. Cortar internet del reloj y confirmar estado offline.
11. Restaurar conexion y confirmar online + envio de pendientes.

## Riesgos para piloto

- Validar build real en el entorno que tenga Node/npm.
- Confirmar que Nginx respete la prioridad de `/api/reports/export` antes de `/api/`.
- Confirmar que el volumen de adjuntos se incluye en el plan de backups.
- Ejecutar una prueba ADMS con reloj fisico antes de abrir piloto con RRHH.
