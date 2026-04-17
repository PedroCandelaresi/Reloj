import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.repo.find({
      order: {
        apellido: 'ASC',
        nombre: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.repo.findOneBy({ id });
    if (!employee) {
      throw new NotFoundException(`Empleado ${id} no encontrado`);
    }
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) {
      throw new ConflictException(`Ya existe un empleado con DNI ${dto.id}`);
    }

    const employee = this.repo.create({
      id: dto.id,
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
    });

    return this.repo.save(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (dto.nombre !== undefined) employee.nombre = dto.nombre;
    if (dto.apellido !== undefined) employee.apellido = dto.apellido;
    if (dto.telefono !== undefined) employee.telefono = dto.telefono;
    if (dto.email !== undefined) employee.email = dto.email;

    return this.repo.save(employee);
  }

  async remove(id: string): Promise<{ success: true }> {
    const employee = await this.findOne(id);
    await this.repo.remove(employee);
    return { success: true as const };
  }
}
