import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompanyRole } from '../companies/company-role.enum';
import { CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto } from './dto/holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidaysRepo: Repository<Holiday>,
  ) {}

  async findAll(user: AuthenticatedUser, query: HolidayQueryDto): Promise<Holiday[]> {
    const companyId = this.resolveReadableCompanyId(user, query.companyId);
    const qb = this.holidaysRepo.createQueryBuilder('holiday').where('1 = 1');

    if (companyId) {
      qb.andWhere('(holiday.company_id = :companyId OR holiday.company_id IS NULL)', { companyId });
    } else if (query.companyId) {
      qb.andWhere('(holiday.company_id = :companyId OR holiday.company_id IS NULL)', { companyId: query.companyId });
    }

    const year = query.year ? Number.parseInt(query.year, 10) : null;
    const month = query.month ? Number.parseInt(query.month, 10) : null;
    if (year && month) {
      if (month < 1 || month > 12) throw new BadRequestException('Mes inválido.');
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const to = `${year}-${String(month).padStart(2, '0')}-${String(this.daysInMonth(year, month)).padStart(2, '0')}`;
      qb.andWhere('holiday.date >= :from AND holiday.date <= :to', { from, to });
    } else if (year) {
      qb.andWhere('holiday.date >= :from AND holiday.date <= :to', {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      });
    }

    return qb.orderBy('holiday.date', 'ASC').addOrderBy('holiday.name', 'ASC').getMany();
  }

  async create(user: AuthenticatedUser, dto: CreateHolidayDto): Promise<Holiday> {
    const companyId = this.resolveWritableCompanyId(user, dto.companyId);
    return this.holidaysRepo.save(
      this.holidaysRepo.create({
        companyId,
        date: dto.date,
        name: dto.name.trim(),
        type: dto.type ?? (companyId ? 'company' : 'national'),
        isWorkable: dto.isWorkable ?? false,
      }),
    );
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findWritableHoliday(user, id);

    if (dto.companyId !== undefined) holiday.companyId = this.resolveWritableCompanyId(user, dto.companyId);
    if (dto.date !== undefined) holiday.date = dto.date;
    if (dto.name !== undefined) holiday.name = dto.name.trim();
    if (dto.type !== undefined) holiday.type = dto.type;
    if (dto.isWorkable !== undefined) holiday.isWorkable = dto.isWorkable;

    return this.holidaysRepo.save(holiday);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<{ success: true }> {
    const holiday = await this.findWritableHoliday(user, id);
    await this.holidaysRepo.remove(holiday);
    return { success: true };
  }

  private async findWritableHoliday(user: AuthenticatedUser, id: string): Promise<Holiday> {
    const holiday = await this.holidaysRepo.findOneBy({ id });
    if (!holiday) throw new NotFoundException('Feriado no encontrado.');

    if (user.isSuperAdmin) return holiday;
    if (!user.companyId || holiday.companyId !== user.companyId) {
      throw new ForbiddenException('No podés modificar este feriado.');
    }
    if (user.companyRole !== CompanyRole.COMPANY_ADMIN) {
      throw new ForbiddenException('Se requieren permisos de administrador de empresa.');
    }
    return holiday;
  }

  private resolveReadableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string | null): string | null {
    if (user.isSuperAdmin) return requestedCompanyId || null;
    if (!user.companyId) throw new ForbiddenException('El usuario no tiene empresa activa asignada.');
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés consultar otra empresa.');
    }
    return user.companyId;
  }

  private resolveWritableCompanyId(user: AuthenticatedUser, requestedCompanyId?: string | null): string | null {
    if (user.isSuperAdmin) return requestedCompanyId || null;
    if (!user.companyId) throw new ForbiddenException('El usuario no tiene empresa activa asignada.');
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('No podés modificar otra empresa.');
    }
    if (user.companyRole !== CompanyRole.COMPANY_ADMIN) {
      throw new ForbiddenException('Se requieren permisos de administrador de empresa.');
    }
    return user.companyId;
  }

  private daysInMonth(year: number, month: number): number {
    const days = [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[month - 1];
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}
