import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

function errorChainMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [err.message];
  let c: unknown = (err as Error & { cause?: unknown }).cause;
  let depth = 0;
  while (c instanceof Error && depth++ < 8) {
    parts.push(c.message);
    c = (c as Error & { cause?: unknown }).cause;
  }
  return parts.filter(Boolean).join(' | ');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const isProd = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (isProd && status >= 500) {
        response.status(status).json({
          statusCode: status,
          message:
            status === HttpStatus.SERVICE_UNAVAILABLE
              ? 'Service unavailable'
              : 'Internal server error',
        });
        return;
      }
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
        response.status(status).json(body);
      } else {
        response.status(status).json({
          statusCode: status,
          message: body,
        });
      }
      return;
    }

    const msg = errorChainMessage(exception);
    this.logger.error(msg, exception instanceof Error ? exception.stack : undefined);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProd ? 'Internal server error' : msg,
    });
  }
}
