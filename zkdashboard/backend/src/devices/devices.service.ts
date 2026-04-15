import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly repo: Repository<Device>,
  ) {}

  async upsert(serialNumber: string, ipAddress: string): Promise<void> {
    const existing = await this.repo.findOneBy({ serialNumber });
    if (existing) {
      await this.repo.update(existing.id, { ipAddress });
    } else {
      await this.repo.save({ serialNumber, ipAddress });
    }
  }

  findAll(): Promise<Device[]> {
    return this.repo.find({ order: { lastSeen: 'DESC' } });
  }
}
