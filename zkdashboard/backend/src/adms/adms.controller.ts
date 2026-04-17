import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdmsService } from './adms.service';
import { getClientIp } from '../logging/file-log.util';

// Todas las rutas ADMS que usa el MB360
@Controller('iclock')
export class AdmsController {
  constructor(private readonly adms: AdmsService) {}

  // El reloj llama a este endpoint al conectarse y para heartbeat periódico
  @Get(['', 'cdata'])
  async init(
    @Query('SN') sn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const body = await this.adms.handleInit(sn, ip);
    res.type('text/plain').send(body);
  }

  // El reloj envía los registros de asistencia aquí
  @Post(['', 'cdata'])
  async push(
    @Query('SN') sn: string,
    @Query('table') table: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // El body llega como texto plano (configurado en main.ts)
    const raw = typeof req.body === 'string' ? req.body : '';
    const result = await this.adms.handlePush(sn, table, raw, getClientIp(req), req.method, req.originalUrl || req.url);
    res.type('text/plain').send(result);
  }

  // Heartbeat: el reloj pregunta si hay comandos pendientes
  @Get('getrequest')
  async heartbeat(
    @Query('SN') sn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const result = await this.adms.handleHeartbeat(sn, ip);
    res.type('text/plain').send(result);
  }

  // El reloj confirma la ejecución de un comando
  @Post('devicecmd')
  async cmdResult(@Res() res: Response) {
    res.type('text/plain').send('OK');
  }
}
