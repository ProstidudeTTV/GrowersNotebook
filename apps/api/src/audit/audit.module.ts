import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditRequestInterceptor } from './audit-request.interceptor';
import { AuditService } from './audit.service';

@Module({
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditRequestInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
