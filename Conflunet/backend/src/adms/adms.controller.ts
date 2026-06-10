import { Controller, Get, HttpException, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdmsProcessResult, AdmsService } from './adms.service';
import {
  getClientIp,
  isSensitiveAdmsTable,
  redactSensitiveAdmsPayload,
} from '../logging/file-log.util';

// Todas las rutas ADMS que usa el MB360
@Controller('iclock')
export class AdmsController {
  constructor(private readonly adms: AdmsService) {}

  private getPath(req: Request): string {
    return (req.path || req.url || '/').slice(0, 200);
  }

  private getQueryRaw(req: Request): string | null {
    const originalUrl = req.originalUrl || req.url || '';
    const separatorIndex = originalUrl.indexOf('?');
    if (separatorIndex < 0) {
      return null;
    }

    const rawQuery = originalUrl.slice(separatorIndex + 1).trim();
    return rawQuery || null;
  }

  private getSerialNumber(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized || null;
  }

  private getErrorStatus(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return 500;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Error interno al procesar request ADMS';
  }

  private async respondWithAudit(
    req: Request,
    res: Response,
    handler: () => Promise<AdmsProcessResult>,
  ) {
    const rawBody = typeof req.body === 'string' ? req.body : '';
    const table = typeof req.query.table === 'string' ? req.query.table : null;
    const auditBody = isSensitiveAdmsTable(table)
      ? redactSensitiveAdmsPayload({
          table,
          serialNumber: this.getSerialNumber(req.query.SN),
          body: rawBody,
        })
      : rawBody;
    const inboundRequest = await this.adms.startInboundRequest({
      serialNumber: this.getSerialNumber(req.query.SN),
      sourceIp: getClientIp(req),
      method: req.method,
      path: this.getPath(req),
      queryRaw: this.getQueryRaw(req),
      bodyRaw: auditBody || null,
    });

    try {
      const result = await handler();
      await this.adms.completeInboundRequest(inboundRequest.id, {
        serialNumber: result.device?.serialNumber ?? this.getSerialNumber(req.query.SN),
        deviceId: result.device?.id ?? null,
        companyId: result.device?.companyId ?? null,
        responseStatus: 200,
        processedOk: result.processedOk,
        parseError: result.parseError ?? null,
      });
      res.status(200).type('text/plain').send(result.body);
    } catch (error) {
      const device = await this.adms.findDeviceBySerialNumber(this.getSerialNumber(req.query.SN));
      await this.adms.completeInboundRequest(inboundRequest.id, {
        serialNumber: device?.serialNumber ?? this.getSerialNumber(req.query.SN),
        deviceId: device?.id ?? null,
        companyId: device?.companyId ?? null,
        responseStatus: this.getErrorStatus(error),
        processedOk: false,
        parseError: this.getErrorMessage(error),
      });
      throw error;
    }
  }

  // El reloj llama a este endpoint al conectarse y para heartbeat periódico
  @Get(['', 'cdata'])
  async init(
    @Query('SN') sn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.respondWithAudit(req, res, () => this.adms.handleInit(sn, getClientIp(req)));
  }

  // El reloj envía los registros de asistencia aquí
  @Post(['', 'cdata'])
  async push(
    @Query('SN') sn: string,
    @Query('table') table: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.respondWithAudit(req, res, () =>
      this.adms.handlePush(
        sn,
        table,
        typeof req.body === 'string' ? req.body : '',
        getClientIp(req),
        req.method,
        this.getPath(req),
      ),
    );
  }

  // Heartbeat: el reloj pregunta si hay comandos pendientes
  @Get('getrequest')
  async heartbeat(
    @Query('SN') sn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.respondWithAudit(req, res, () =>
      this.adms.handleHeartbeat(sn, getClientIp(req)),
    );
  }

  @Get('ping')
  async ping(
    @Query('SN') sn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.respondWithAudit(req, res, () =>
      this.adms.handlePing(sn, getClientIp(req)),
    );
  }

  // El reloj confirma la ejecución de un comando
  @Post('devicecmd')
  async cmdResult(
    @Query('SN') sn: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.respondWithAudit(req, res, () =>
      this.adms.handleCommandResult(
        sn,
        typeof req.body === 'string' ? req.body : '',
        query,
        getClientIp(req),
      ),
    );
  }
}
