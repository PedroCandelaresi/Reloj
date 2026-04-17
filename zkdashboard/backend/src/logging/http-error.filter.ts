import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { getClientIp, logError } from './file-log.util';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const response =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: 500,
            message: 'Internal server error',
          };

    const message =
      exception instanceof Error
        ? exception.message
        : typeof response === 'string'
          ? response
          : JSON.stringify(response);

    logError({
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      ipAddress: req ? getClientIp(req) : undefined,
      method: req?.method,
      path: req?.originalUrl || req?.url,
      statusCode,
    });

    if (res.headersSent) {
      return;
    }

    if (typeof response === 'string') {
      res.status(statusCode).json({
        statusCode,
        message: response,
      });
      return;
    }

    res.status(statusCode).json(response);
  }
}
