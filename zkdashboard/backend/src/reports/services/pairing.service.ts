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
    const workedMinutes =
      firstPunch && lastPunch && punchCount >= 2
        ? Math.max(0, Math.floor((lastPunch.getTime() - firstPunch.getTime()) / 60000))
        : 0;
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
}
