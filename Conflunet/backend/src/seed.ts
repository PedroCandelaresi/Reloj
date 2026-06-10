/**
 * Seed de datos de demostración — ZK Dashboard
 * Genera 30 días de asistencia para 12 empleados ficticios.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/seed.ts
 *
 * Asegurá que .env esté configurado antes de correr.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AttendanceRecord } from './attendance/attendance.entity';
import { CompanyMembership } from './companies/company-membership.entity';
import { CompanyRole } from './companies/company-role.enum';
import { Company } from './companies/company.entity';
import { Device } from './devices/device.entity';
import { AdminUser } from './users/admin-user.entity';
import { Employee } from './employees/employee.entity';
import { buildDatabaseOptions } from './database/data-source';

// ─── Empleados ficticios ───────────────────────────────────────────────────

const EMPLOYEES = [
  { id: '1001', name: 'García, Juan' },
  { id: '1002', name: 'Martínez, Ana' },
  { id: '1003', name: 'López, Carlos' },
  { id: '1004', name: 'Rodríguez, María' },
  { id: '1005', name: 'González, Pablo' },
  { id: '1006', name: 'Fernández, Laura' },
  { id: '1007', name: 'Torres, Diego' },
  { id: '1008', name: 'Silva, Valentina' },
  { id: '1009', name: 'Romero, Matías' },
  { id: '1010', name: 'Pérez, Camila' },
  { id: '1011', name: 'Díaz, Sebastián' },
  { id: '1012', name: 'Moreno, Lucía' },
];

// Tipo de verificación preferido por empleado (más realista que aleatorio puro)
const VERIFY_PREFERENCE: Record<string, number> = {
  '1001': 1,  // huella
  '1002': 15, // rostro
  '1003': 1,
  '1004': 15,
  '1005': 15,
  '1006': 1,
  '1007': 15,
  '1008': 15,
  '1009': 1,
  '1010': 15,
  '1011': 1,
  '1012': 15,
};

const DEVICE_SN = 'MB360-001';
const DEVICE_IP = '192.168.1.141';
const DEMO_COMPANY_CUIT = '30712345678';
const DEMO_OPERATOR_USERNAME = 'operador@demo.com';
const DEMO_OPERATOR_PASSWORD = 'operador123';

// ─── Utilidades ───────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWeekday(date: Date): boolean {
  const d = date.getDay();
  return d >= 1 && d <= 5;
}

function setTime(base: Date, h: number, m: number, s: number): Date {
  const d = new Date(base);
  d.setHours(h, m, s, 0);
  return d;
}

// Genera un horario de entrada típico (7:45 – 9:30)
function entryTime(base: Date): Date {
  const h = rand(7, 9);
  const m = h === 7 ? rand(45, 59) : h === 8 ? rand(0, 59) : rand(0, 30);
  return setTime(base, h, m, rand(0, 59));
}

// Genera un horario de salida típico (17:00 – 19:30)
function exitTime(base: Date): Date {
  const h = rand(17, 19);
  const m = h === 19 ? rand(0, 30) : rand(0, 59);
  return setTime(base, h, m, rand(0, 59));
}

// ─── DataSource ───────────────────────────────────────────────────────────

const ds = new DataSource(buildDatabaseOptions(process.env));

// ─── Seed ─────────────────────────────────────────────────────────────────

async function seed() {
  await ds.initialize();
  await ds.runMigrations();
  console.log('✓ Conectado a la base de datos');

  const deviceRepo = ds.getRepository(Device);
  const userRepo   = ds.getRepository(AdminUser);
  const attRepo    = ds.getRepository(AttendanceRecord);
  const employeeRepo = ds.getRepository(Employee);
  const companyRepo = ds.getRepository(Company);
  const membershipRepo = ds.getRepository(CompanyMembership);

  // 1. Empresa demo
  let company = await companyRepo.findOneBy({ cuit: DEMO_COMPANY_CUIT });
  if (!company) {
    company = await companyRepo.save({
      cuit: DEMO_COMPANY_CUIT,
      razonSocial: 'Empresa Demo S.A.',
      nombreFantasia: 'Empresa Demo',
      isActive: true,
      defaultEntryTime: '08:00',
      defaultExitTime: '17:00',
      defaultWorkDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      email: 'demo@empresa.local',
      phone: null,
    });
    console.log(`✓ Empresa demo creada: ${company.nombreFantasia}`);
  } else {
    console.log(`  Empresa demo ya existe: ${company.nombreFantasia || company.razonSocial}`);
  }

  // 2. Dispositivo
  let device = await deviceRepo.findOneBy({ serialNumber: DEVICE_SN });
  if (!device) {
    device = await deviceRepo.save({ serialNumber: DEVICE_SN, ipAddress: DEVICE_IP, companyId: company.id });
    console.log(`✓ Dispositivo creado: ${DEVICE_SN}`);
  } else {
    if (device.companyId !== company.id || device.ipAddress !== DEVICE_IP) {
      device.companyId = company.id;
      device.ipAddress = DEVICE_IP;
      device = await deviceRepo.save(device);
      console.log(`✓ Dispositivo asociado a ${company.nombreFantasia || company.razonSocial}: ${DEVICE_SN}`);
    }
    console.log(`  Dispositivo ya existe: ${DEVICE_SN}`);
  }

  // 3. Admin inicial
  let admin = await userRepo.findOne({ where: { username: process.env.ADMIN_USERNAME || 'admin' } });
  if (!admin) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin1234', 10);
    admin = await userRepo.save({
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: hash,
      isSuperAdmin: true,
      employeeId: null,
    });
    console.log('✓ Admin creado: usuario=admin, contraseña=admin1234');
  } else if (admin) {
    console.log(`  Admin ya existe: usuario=${admin.username}`);
  }

  if (admin) {
    const existingMembership = await membershipRepo.findOneBy({ companyId: company.id, adminUserId: admin.id });
    if (!existingMembership) {
      await membershipRepo.save({
        companyId: company.id,
        adminUserId: admin.id,
        role: CompanyRole.COMPANY_ADMIN,
      });
      console.log(`✓ Admin asociado a ${company.nombreFantasia || company.razonSocial}`);
    }
  }

  // 4. Usuario operativo demo
  const operatorHash = await bcrypt.hash(DEMO_OPERATOR_PASSWORD, 10);
  let operator = await userRepo.findOne({ where: { username: DEMO_OPERATOR_USERNAME } });
  if (!operator) {
    operator = await userRepo.save({
      username: DEMO_OPERATOR_USERNAME,
      email: DEMO_OPERATOR_USERNAME,
      nombre: 'Operador',
      apellido: 'Demo',
      passwordHash: operatorHash,
      isSuperAdmin: false,
      employeeId: null,
    });
    console.log(`✓ Operador demo creado: usuario=${DEMO_OPERATOR_USERNAME}, contraseña=${DEMO_OPERATOR_PASSWORD}`);
  } else {
    operator.email = operator.email || DEMO_OPERATOR_USERNAME;
    operator.nombre = operator.nombre || 'Operador';
    operator.apellido = operator.apellido || 'Demo';
    operator.passwordHash = operatorHash;
    operator.isSuperAdmin = false;
    operator.employeeId = null;
    operator = await userRepo.save(operator);
    console.log(`✓ Operador demo actualizado: usuario=${DEMO_OPERATOR_USERNAME}, contraseña=${DEMO_OPERATOR_PASSWORD}`);
  }

  const existingOperatorMembership = await membershipRepo.findOneBy({ companyId: company.id, adminUserId: operator.id });
  if (!existingOperatorMembership) {
    await membershipRepo.save({
      companyId: company.id,
      adminUserId: operator.id,
      role: CompanyRole.OPERATOR,
    });
    console.log(`✓ Operador demo asociado a ${company.nombreFantasia || company.razonSocial}`);
  } else if (existingOperatorMembership.role !== CompanyRole.OPERATOR) {
    existingOperatorMembership.role = CompanyRole.OPERATOR;
    await membershipRepo.save(existingOperatorMembership);
    console.log(`✓ Operador demo reasignado con rol operator en ${company.nombreFantasia || company.razonSocial}`);
  }

  // 5. Maestra de empleados
  if ((await employeeRepo.count()) === 0) {
    await employeeRepo.save(
      EMPLOYEES.map((emp) => {
        const [apellido, nombre] = emp.name.split(',').map((value) => value.trim());
        return {
          id: emp.id,
          nombre,
          apellido,
          telefono: null,
          email: null,
          companyId: company.id,
        };
      }),
    );
    console.log(`✓ ${EMPLOYEES.length} empleados creados`);
  } else {
    for (const emp of EMPLOYEES) {
      await employeeRepo.update({ id: emp.id }, { companyId: company.id });
    }
    console.log(`  Ya existen ${(await employeeRepo.count())} empleados`);
    console.log(`✓ Empleados demo asociados a ${company.nombreFantasia || company.razonSocial}`);
  }

  // 6. Registros de asistencia
  const existing = await attRepo.count();
  if (existing > 0) {
    await attRepo
      .createQueryBuilder()
      .update(AttendanceRecord)
      .set({ companyId: company.id, deviceId: device.id })
      .where('device_sn = :deviceSn', { deviceSn: DEVICE_SN })
      .execute();
    console.log(`  Ya existen ${existing} registros. Para regenerar, borrá los datos primero.`);
    console.log(`✓ Registros existentes del reloj demo asociados a ${company.nombreFantasia || company.razonSocial}`);
    await ds.destroy();
    return;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 0);

  const records: Partial<AttendanceRecord>[] = [];

  // Generar fichadas para los últimos 90 días hábiles
  let daysCount = 0;
  let daysAgo = 0;
  while (daysCount < 90) {
    const day = new Date(today);
    day.setDate(today.getDate() - daysAgo);
    day.setHours(0, 0, 0, 0);
    daysAgo++;
    if (!isWeekday(day)) continue;
    daysCount++;
    for (const emp of EMPLOYEES) {
      // ~88 % de asistencia por día
      if (Math.random() < 0.12) continue;
      const verifyType = VERIFY_PREFERENCE[emp.id] ?? 1;
      // Entrada
      const entryTs = entryTime(day);
      records.push({
        deviceSn: DEVICE_SN,
        userId:   emp.id,
        deviceId: device.id,
        companyId: company.id,
        timestamp: entryTs,
        status:   0,
        verifyType,
        workCode: null,
      });
      // Salida (~95 % la registra)
      if (Math.random() < 0.95) {
        records.push({
          deviceSn: DEVICE_SN,
          userId:   emp.id,
          deviceId: device.id,
          companyId: company.id,
          timestamp: exitTime(day),
          status:   1,
          verifyType,
          workCode: null,
        });
      }
      // Algunos empleados hacen descanso (~20 %)
      if (Math.random() < 0.2) {
        const breakOutH = rand(12, 13);
        const breakInH  = breakOutH;
        records.push({
          deviceSn: DEVICE_SN,
          userId:   emp.id,
          deviceId: device.id,
          companyId: company.id,
          timestamp: setTime(day, breakOutH, rand(0, 30), rand(0, 59)),
          status:   2,
          verifyType,
          workCode: null,
        });
        records.push({
          deviceSn: DEVICE_SN,
          userId:   emp.id,
          deviceId: device.id,
          companyId: company.id,
          timestamp: setTime(day, breakInH, rand(31, 59), rand(0, 59)),
          status:   3,
          verifyType,
          workCode: null,
        });
      }
    }
  }

  // Guardar en lotes para no saturar la DB
  const BATCH = 200;
  for (let i = 0; i < records.length; i += BATCH) {
    await attRepo.save(records.slice(i, i + BATCH));
  }

  console.log(`✓ ${records.length} registros de asistencia generados`);
  console.log(`  Empleados: ${EMPLOYEES.length}`);
  console.log(`  Período: últimos 30 días hábiles`);

  await ds.destroy();
  console.log('✓ Seed completado');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
