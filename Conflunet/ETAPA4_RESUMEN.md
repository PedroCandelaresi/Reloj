## Etapa 4: Support & Monitoring - Resumen Técnico

### ✅ Completado

Se ha implementado la infraestructura backend para monitoreo de super_admin:

#### Base de Datos (Entities + Migración)
- **AttendanceRecalculationLog**: Tracka todas las solicitudes de recálculo con estado, tiempo, empleados procesados
- **AdminConfigAuditLog**: Auditoría completa de cambios en configuración RH (perfiles, empleados, departamentos, posiciones, feriados)
- Migración TypeORM lista para ejecutar

#### Servicios
- **AdminAuditService**: Métodos para loguear y consultar recalculaciones y cambios de configuración
- **SupportService**: Agregación de datos para dashboard (devices, commands, communication, alerts)

#### API (Endpoints Super_Admin)
```
GET /admin/support/overview              → Dashboard global
GET /admin/support/devices?state=online  → Dispositivos por estado
GET /admin/support/company/:id/devices   → Dispositivos por empresa
GET /admin/support/recalculations        → Historial de recálculos
GET /admin/support/config-audit          → Auditoría de configuración
```

#### Seguridad
- Guard `SuperAdminOnly` en todos los endpoints
- Solo usuarios con `isSuperAdmin=true` pueden acceder

### 🔄 Próximos Pasos

#### 1. Ejecutar Migración (Database)
```bash
cd zkdashboard/backend
npm run typeorm migration:run
```

#### 2. Agregar Hooks de Logging (Services)
- En `AttendanceCalculationService.recalculateCompanyRange()`:
  ```typescript
  // Al inicio
  const recalcLog = await this.adminAuditService.logRecalculationStart(...);
  // Al final (success)
  await this.adminAuditService.logRecalculationComplete(recalcLog.id, ...);
  // En catch (error)
  await this.adminAuditService.logRecalculationFailed(recalcLog.id, error.message);
  ```

- En servicios de RH (Profile, Employee, Department, Position, Holiday):
  ```typescript
  // Después de create/update/delete
  await this.adminAuditService.logConfigChange(
    companyId,
    'entity_type_action', // e.g., 'profile_created'
    'entityType',          // e.g., 'profile'
    entityId,
    beforeValue,           // null para create
    afterValue,
    changeDescription,
    userId
  );
  ```

#### 3. Verificar Endpoints (Testing)
```bash
# Ver dashboard completo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/support/overview

# Ver dispositivos online
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/support/devices?state=online

# Ver auditoría de configuración para una empresa
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/admin/support/config-audit?companyId=UUID"
```

#### 4. Frontend Dashboard (UI)
Crear componente React en `/frontend/src/app/(authenticated)/admin/support/page.tsx`:
- Tarjetas KPI: empresas, dispositivos online/offline/idle/nunca vistos
- Tabla de recalculaciones recientes
- Tabla de cambios de configuración
- Alertas de problemas detectados
- Filtros: empresa, estado dispositivo, rango de fechas

#### 5. Build & Deploy
```bash
# Backend
cd zkdashboard/backend && npm run build

# Frontend
cd zkdashboard/frontend && npm run build
```

### 📊 Dashboard Data Model

El endpoint `/admin/support/overview` retorna:

```json
{
  "global": {
    "totalCompanies": 150,
    "activeCompanies": 145,
    "totalDevices": 3200,
    "onlineDevices": 3050,
    "offlineDevices": 120,
    "neverSeenDevices": 30,
    "deviceStates": {
      "online": 3050,
      "idle": 50,
      "offline": 120,
      "never_seen": 30,
      "disabled": 10
    }
  },
  "commands": {
    "pendingCount": 5,
    "failedCount": 3,
    "expiredCount": 1,
    "recentFailed": [...]
  },
  "communication": {
    "lastInboundRequestAt": "2025-04-30T14:35:22Z",
    "totalInboundRequests24h": 45000,
    "failedRequests24h": 12,
    "avgResponseTime": 245
  },
  "recalculation": {
    "running": 1,
    "failed": 0,
    "recentFailed": [...]
  },
  "issues": [
    "120 dispositivo(s) sin conexión.",
    "30 dispositivo(s) nunca conectado(s).",
    "5 comando(s) pendiente(s)."
  ]
}
```

### 🔐 Restricciones de Seguridad (IMPLEMENTADAS)

✅ Super_admin only (guard en cada endpoint)
✅ Sin exposición de datos biométricos
✅ Sin operaciones destructivas
✅ Sin modificación de vistas RRHH
✅ Solo lectura para monitoreo
✅ Ámbito de empresa respetado

### 📝 Detalles Técnicos

**Umbrales de Estado Dispositivo:**
- Online: lastSeen < 5 minutos
- Idle: lastSeen 5-30 minutos
- Offline: lastSeen > 30 minutos
- Never seen: lastSeen = null

**Estados Recalculación:**
- running: En ejecución
- completed: Finalizado exitosamente
- failed: Error durante procesamiento

**Acciones Config Audit:**
- schedule_profile_created/updated/deleted
- employee_schedule_profile_assigned/removed
- employee_status_changed
- employee_department_changed
- employee_position_changed
- department_created/updated/deleted
- position_created/updated/deleted
- holiday_created/updated/deleted
- company_default_settings_updated

### ✨ Ventajas

1. **Visibilidad Operacional**: Super_admin ve estado global sin SSH
2. **Auditoría Completa**: Quién cambió qué y cuándo
3. **Troubleshooting**: Historial de recalculaciones, errores de dispositivos
4. **Performance**: Índices en compound keys para queries rápidas
5. **Extensible**: Fácil agregar más acciones de auditoría

### 🚀 Deployment Checklist

- [ ] Ejecutar migración en DB
- [ ] Agregar todos los hooks en servicios
- [ ] Testing local de endpoints
- [ ] Build backend sin errores
- [ ] Crear dashboard frontend
- [ ] Build frontend sin errores
- [ ] Deploy a staging
- [ ] Testing E2E con super_admin
- [ ] Deploy a producción
