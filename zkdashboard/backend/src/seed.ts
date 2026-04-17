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
import { Device } from './devices/device.entity';
import { AdminUser } from './users/admin-user.entity';
import { Employee } from './employees/employee.entity';

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
  '1002': 4,  // rostro
  '1003': 1,
  '1004': 15, // tarjeta
  '1005': 4,
  '1006': 1,
  '1007': 15,
  '1008': 4,
  '1009': 1,
  '1010': 4,
  '1011': 1,
  '1012': 15,
};

const DEVICE_SN = 'MB360-001';
const DEVICE_IP = '192.168.1.141';

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

const ds = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'zkuser',
  password: process.env.DB_PASSWORD || 'zkpassword',
  database: process.env.DB_NAME     || 'zkdashboard',
  entities: [AttendanceRecord, Device, AdminUser, Employee],
  synchronize: true,
});

// ─── Seed ─────────────────────────────────────────────────────────────────

async function seed() {
  await ds.initialize();
  console.log('✓ Conectado a la base de datos');

  const deviceRepo = ds.getRepository(Device);
  const userRepo   = ds.getRepository(AdminUser);
  const attRepo    = ds.getRepository(AttendanceRecord);
  const employeeRepo = ds.getRepository(Employee);

  // 1. Dispositivo
  const existingDevice = await deviceRepo.findOneBy({ serialNumber: DEVICE_SN });
  if (!existingDevice) {
    await deviceRepo.save({ serialNumber: DEVICE_SN, ipAddress: DEVICE_IP });
    console.log(`✓ Dispositivo creado: ${DEVICE_SN}`);
  } else {
    console.log(`  Dispositivo ya existe: ${DEVICE_SN}`);
  }

  // 2. Admin inicial
  if ((await userRepo.count()) === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await userRepo.save({
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: hash,
    });
    console.log('✓ Admin creado: usuario=admin, contraseña=admin123');
  }

  // 3. Maestra de empleados
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
        };
      }),
    );
    console.log(`✓ ${EMPLOYEES.length} empleados creados`);
  } else {
    console.log(`  Ya existen ${(await employeeRepo.count())} empleados`);
  }

  // 4. Registros de asistencia
  const existing = await attRepo.count();
  if (existing > 0) {
    console.log(`  Ya existen ${existing} registros. Para regenerar, borrá los datos primero.`);
    await ds.destroy();
    return;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 0);

  const records: Partial<AttendanceRecord>[] = [];

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const day = new Date(today);
    day.setDate(today.getDate() - daysAgo);
    day.setHours(0, 0, 0, 0);

    if (!isWeekday(day)) continue;

    for (const emp of EMPLOYEES) {
      // ~88 % de asistencia por día
      if (Math.random() < 0.12) continue;

      const verifyType = VERIFY_PREFERENCE[emp.id] ?? 1;

      // Entrada
      const entryTs = entryTime(day);
      records.push({
        deviceSn: DEVICE_SN,
        userId:   emp.id,
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
          timestamp: setTime(day, breakOutH, rand(0, 30), rand(0, 59)),
          status:   2,
          verifyType,
          workCode: null,
        });
        records.push({
          deviceSn: DEVICE_SN,
          userId:   emp.id,
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
