import { Injectable } from '@nestjs/common';
import { PairingInputRecord, PairingResult } from '../types/report.types';

@Injectable()
export class PairingService {
  summarize(records: PairingInputRecord[]): PairingResult {
    const sorted = [...records].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const firstPunch = sorted[0]?.timestamp ?? null;
    const lastPunch = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null;
    const punchCount = sorted.length;
    const isIncomplete = punchCount === 1 || punchCount % 2 === 1;
    const workedMinutes = this.sumWorkedPairs(sorted);
    const devices = [...new Set(sorted.map((record) => record.deviceSn).filter(Boolean))];
    const primaryDevice = this.findPrimaryDevice(sorted);

    return {
      firstPunch,
      lastPunch,
      punchCount,
      workedMinutes,
      isIncomplete,
      punchTimes: sorted.map((record) => record.timestamp),
      devices,
      primaryDevice,
    };
  }

  private findPrimaryDevice(records: PairingInputRecord[]): string | null {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!record.deviceSn) {
        continue;
      }
      counts.set(record.deviceSn, (counts.get(record.deviceSn) ?? 0) + 1);
    }

    let primary: string | null = null;
    let max = 0;
    for (const [deviceSn, count] of counts.entries()) {
      if (count > max) {
        primary = deviceSn;
        max = count;
      }
    }

    return primary;
  }

  private sumWorkedPairs(records: PairingInputRecord[]): number {
    let total = 0;
    for (let index = 0; index + 1 < records.length; index += 2) {
      total += Math.max(
        0,
        Math.floor((records[index + 1].timestamp.getTime() - records[index].timestamp.getTime()) / 60000),
      );
    }
    return total;
  }
}
