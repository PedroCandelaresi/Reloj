# Guía de Implementación de Hooks de Auditoría - Etapa 4

## Objetivo
Integrar el logging de cambios de configuración (AdminAuditService) en los servicios existentes para crear una auditoría completa de todas las acciones de RH.

## Servicios a Modificar

### 1. AttendanceCalculationService
**Archivo**: `src/attendance/attendance-calculation.service.ts`
**Método**: `recalculateCompanyRange()` (o similar método de recálculo)

**Cambios**:
```typescript
// Agregar AdminAuditService al constructor
constructor(
  // ... otros servicios
  private readonly adminAuditService: AdminAuditService,
  private readonly requestContext: RequestContext, // o extraer userId del JWT
) {}

// En el método recalculateCompanyRange()
async recalculateCompanyRange(
  companyId: string,
  dateFrom: string,
  dateTo: string,
  employeeId?: string,
  userId?: number,
) {
  // 1. Loguear inicio
  let recalcLog: AttendanceRecalculationLog;
  try {
    recalcLog = await this.adminAuditService.logRecalculationStart(
      companyId,
      userId || 0, // Obtener del contexto actual
      dateFrom,
      dateTo,
      employeeId || null,
    );

    // 2. Ejecutar recálculo (código existente)
    const result = await this.performRecalculation(
      companyId,
      dateFrom,
      dateTo,
      employeeId,
    );

    // 3. Loguear éxito
    await this.adminAuditService.logRecalculationComplete(
      recalcLog.id,
      result.employeesProcessed,
      result.daysProcessed,
    );

    return result;
  } catch (error) {
    // 4. Loguear fallo
    await this.adminAuditService.logRecalculationFailed(
      recalcLog.id,
      error.message || 'Unknown error',
    );
    throw error;
  }
}
```

---

### 2. ScheduleProfileService (si existe)
**Archivo**: `src/[schedule-module]/schedule-profile.service.ts`
**Métodos**: `create()`, `update()`, `delete()`

**Cambios**:
```typescript
constructor(
  // ... otros servicios
  private readonly adminAuditService: AdminAuditService,
) {}

// CREATE
async create(companyId: string, dto: CreateScheduleProfileDto, userId: number) {
  const profile = await this.profilesRepository.save({
    companyId,
    ...dto,
  });

  await this.adminAuditService.logConfigChange(
    companyId,
    'schedule_profile_created',
    'schedule_profile',
    profile.id,
    null,
    {
      name: profile.name,
      description: profile.description,
      // ... otros campos relevantes
    },
    `Perfil "${profile.name}" creado`,
    userId,
  );

  return profile;
}

// UPDATE
async update(companyId: string, id: string, dto: UpdateScheduleProfileDto, userId: number) {
  const before = await this.profilesRepository.findOneByOrFail({ id, companyId });
  
  const profile = await this.profilesRepository.save({
    ...before,
    ...dto,
  });

  await this.adminAuditService.logConfigChange(
    companyId,
    'schedule_profile_updated',
    'schedule_profile',
    profile.id,
    {
      name: before.name,
      description: before.description,
    },
    {
      name: profile.name,
      description: profile.description,
    },
    `Perfil actualizado: ${Object.keys(dto).join(', ')}`,
    userId,
  );

  return profile;
}

// DELETE
async delete(companyId: string, id: string, userId: number) {
  const profile = await this.profilesRepository.findOneByOrFail({ id, companyId });
  
  await this.profilesRepository.remove(profile);

  await this.adminAuditService.logConfigChange(
    companyId,
    'schedule_profile_deleted',
    'schedule_profile',
    id,
    {
      name: profile.name,
      description: profile.description,
    },
    null,
    `Perfil "${profile.name}" eliminado`,
    userId,
  );
}
```

---

### 3. EmployeesService
**Archivo**: `src/employees/employees.service.ts`
**Métodos**: `create()`, `update()`, `assignProfile()`, `changeStatus()`, etc.

**Cambios**:
```typescript
constructor(
  // ... otros servicios
  private readonly adminAuditService: AdminAuditService,
) {}

// PROFILE ASSIGNMENT
async assignProfile(
  companyId: string,
  employeeId: string,
  profileId: string,
  userId: number,
) {
  const employee = await this.employeesRepository.findOneByOrFail({
    id: employeeId,
    companyId,
  });
  const beforeProfileId = employee.scheduleProfileId;

  employee.scheduleProfileId = profileId;
  await this.employeesRepository.save(employee);

  await this.adminAuditService.logConfigChange(
    companyId,
    'employee_schedule_profile_assigned',
    'employee',
    employeeId,
    { profileId: beforeProfileId },
    { profileId },
    `Empleado: Perfil asignado`,
    userId,
  );
}

// STATUS CHANGE
async changeStatus(
  companyId: string,
  employeeId: string,
  newStatus: 'active' | 'inactive' | 'on_leave',
  userId: number,
) {
  const employee = await this.employeesRepository.findOneByOrFail({
    id: employeeId,
    companyId,
  });
  const beforeStatus = employee.status;

  employee.status = newStatus;
  await this.employeesRepository.save(employee);

  await this.adminAuditService.logConfigChange(
    companyId,
    'employee_status_changed',
    'employee',
    employeeId,
    { status: beforeStatus },
    { status: newStatus },
    `Estado cambió de ${beforeStatus} a ${newStatus}`,
    userId,
  );
}

// DEPARTMENT CHANGE
async changeDepartment(
  companyId: string,
  employeeId: string,
  departmentId: string,
  userId: number,
) {
  const employee = await this.employeesRepository.findOneByOrFail({
    id: employeeId,
    companyId,
  });
  const beforeDepartmentId = employee.departmentId;

  employee.departmentId = departmentId;
  await this.employeesRepository.save(employee);

  await this.adminAuditService.logConfigChange(
    companyId,
    'employee_department_changed',
    'employee',
    employeeId,
    { departmentId: beforeDepartmentId },
    { departmentId },
    `Departamento cambiado`,
    userId,
  );
}

// POSITION CHANGE
async changePosition(
  companyId: string,
  employeeId: string,
  positionId: string,
  userId: number,
) {
  const employee = await this.employeesRepository.findOneByOrFail({
    id: employeeId,
    companyId,
  });
  const beforePositionId = employee.positionId;

  employee.positionId = positionId;
  await this.employeesRepository.save(employee);

  await this.adminAuditService.logConfigChange(
    companyId,
    'employee_position_changed',
    'employee',
    employeeId,
    { positionId: beforePositionId },
    { positionId },
    `Posición cambiada`,
    userId,
  );
}
```

---

### 4. DepartmentService (si existe)
**Métodos**: `create()`, `update()`, `delete()`

```typescript
// Similar al patrón de ScheduleProfileService
// Actions: department_created, department_updated, department_deleted
```

---

### 5. PositionService (si existe)
**Métodos**: `create()`, `update()`, `delete()`

```typescript
// Similar al patrón de ScheduleProfileService
// Actions: position_created, position_updated, position_deleted
```

---

### 6. HolidayService (si existe)
**Métodos**: `create()`, `update()`, `delete()`

```typescript
// Similar al patrón de ScheduleProfileService
// Actions: holiday_created, holiday_updated, holiday_deleted
```

---

### 7. CompaniesService (si existe)
**Métodos**: `updateSettings()`

```typescript
// Action: company_default_settings_updated
```

---

## Patrones Comunes

### Pattern A: Create
```typescript
async create(companyId: string, dto: CreateDto, userId: number) {
  const entity = await this.repository.save({ companyId, ...dto });

  await this.adminAuditService.logConfigChange(
    companyId,
    'entity_type_created',  // ← Action
    'entity_type',          // ← Entity type
    entity.id,              // ← Entity ID
    null,                   // ← Before (null for create)
    { /* snapshot of entity */ },  // ← After
    `Entity created: ${entity.name}`,  // ← Description
    userId,
  );

  return entity;
}
```

### Pattern B: Update
```typescript
async update(companyId: string, id: string, dto: UpdateDto, userId: number) {
  const before = await this.repository.findOneByOrFail({ id, companyId });
  const after = await this.repository.save({ ...before, ...dto });

  await this.adminAuditService.logConfigChange(
    companyId,
    'entity_type_updated',
    'entity_type',
    id,
    { /* relevant before fields */ },
    { /* relevant after fields */ },
    `Entity updated: ${Object.keys(dto).join(', ')}`,
    userId,
  );

  return after;
}
```

### Pattern C: Delete
```typescript
async delete(companyId: string, id: string, userId: number) {
  const entity = await this.repository.findOneByOrFail({ id, companyId });
  await this.repository.remove(entity);

  await this.adminAuditService.logConfigChange(
    companyId,
    'entity_type_deleted',
    'entity_type',
    id,
    { /* snapshot of deleted entity */ },
    null,
    `Entity deleted: ${entity.name}`,
    userId,
  );
}
```

---

## Inyección de Dependencias

En cada módulo, asegurarse de que AdminModule esté importado:

```typescript
// En schedule.module.ts, employees.module.ts, etc.
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    AdminModule,  // ← Add this
  ],
  // ...
})
export class YourModule {}
```

---

## Extracción de UserId del Contexto

Existen varias formas de obtener el userId actual:

### Opción 1: Mediante RequestContext (Recomendado)
```typescript
constructor(
  private readonly requestContext: RequestContext,
  private readonly adminAuditService: AdminAuditService,
) {}

async someMethod(companyId: string, dto: SomeDto) {
  const userId = this.requestContext.getUserId(); // ← Obtener del contexto

  // ...
  await this.adminAuditService.logConfigChange(
    companyId,
    'action',
    'entity_type',
    entityId,
    before,
    after,
    description,
    userId,
  );
}
```

### Opción 2: Mediante Request HTTP en Controller
```typescript
// En el controller, pasar userId al service
@Post()
async create(@Request() req, @Body() dto: CreateDto) {
  const userId = req.user?.id;
  return this.service.create(companyId, dto, userId);
}
```

### Opción 3: Mediante JWT Verification
```typescript
// Si es necesario, decodificar el JWT
const decoded = await this.jwtService.verify(token);
const userId = decoded.sub; // ← Depende de la estructura del JWT
```

---

## Testing

Después de implementar los hooks:

```bash
# 1. Ejecutar migraciones
npm run typeorm migration:run

# 2. Crear/actualizar perfil y verificar en DB
SELECT * FROM admin_config_audit_logs 
WHERE company_id = 'UUID' 
ORDER BY created_at DESC 
LIMIT 10;

# 3. Recalcular asistencia y verificar
SELECT * FROM attendance_recalculation_logs 
WHERE company_id = 'UUID' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## Notas Importantes

1. **UserId**: Algunos servicios pueden no tener acceso al userId. En ese caso, pasar `null` es válido.
2. **Snapshot**: Incluir solo los campos relevantes en before/after para mantener auditlogs legible.
3. **Descripción**: Usar texto descriptivo en español para facilitar lectura manual.
4. **Transacciones**: Si la operación falla, el logging también falla. Esto es intencional para mantener consistencia.
5. **Performance**: El logging es asincrónico pero no impide el retorno de la operación.

---

## Checklist de Implementación

- [ ] Identificar todos los servicios de RH a modificar
- [ ] Agregar `AdminAuditService` al constructor de cada servicio
- [ ] Importar `AdminModule` en cada módulo
- [ ] Implementar logging en create/update/delete/change methods
- [ ] Ejecutar migración en DB de test
- [ ] Verificar que logs se crean correctamente
- [ ] Testear API endpoint `/admin/support/config-audit`
- [ ] Verificar que before/after snapshots son correctos
- [ ] Deploy a staging
- [ ] Testing E2E
- [ ] Deploy a producción
