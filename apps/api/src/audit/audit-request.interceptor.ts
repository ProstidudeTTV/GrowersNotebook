import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { JwtUser } from '../auth/jwt-user';
import { AuditService } from './audit.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim() ?? null;
  }
  return req.socket.remoteAddress ?? null;
}

/** Store a coarse network prefix instead of a full client IP in audit rows. */
function privacySafeClientIp(req: Request): string | null {
  const raw = clientIp(req);
  if (!raw) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) {
    const parts = raw.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (raw.includes(':')) {
    const parts = raw.split(':').filter(Boolean);
    if (parts.length >= 3) return `${parts.slice(0, 3).join(':')}::`;
  }
  return '[redacted]';
}

const SENSITIVE_KEY =
  /^(password|token|access_?token|refresh_?token|authorization|secret|api_?key|apikey|card)$/i;

function summarizeValue(v: unknown, depth: number, maxStr: number): unknown {
  if (depth <= 0) return '[truncated]';
  if (v === null || v === undefined) return v;
  if (typeof v === 'string')
    return v.length > maxStr ? `${v.slice(0, maxStr)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) {
    const cap = Math.min(v.length, 30);
    const out: unknown[] = [];
    for (let i = 0; i < cap; i++) {
      out.push(summarizeValue(v[i], depth - 1, maxStr));
    }
    if (v.length > cap) out.push(`…(+${v.length - cap} more)`);
    return out;
  }
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = '[redacted]';
        continue;
      }
      out[k] = summarizeValue(val, depth - 1, maxStr);
    }
    return out;
  }
  return String(v);
}

function summarizeBody(body: unknown): unknown {
  if (body === undefined || body === null) return undefined;
  return summarizeValue(body, 4, 400);
}

/** Avoid flooding audit with health checks, root hint, and DM message polling. */
function shouldSkipReadAudit(pathNoQuery: string): boolean {
  if (pathNoQuery === '/health' || pathNoQuery === '/') return true;
  if (/^\/direct-messages\/threads\/[^/]+\/messages$/i.test(pathNoQuery))
    return true;
  return false;
}

/** Tie HTTP rows to a profile when the path clearly refers to one (admin + self). */
function inferSubjectProfileId(
  path: string,
  actorId: string | undefined,
): string | null {
  const adminProf = path.match(/^\/admin\/profiles\/([0-9a-f-]{36})(?:\/|$)/i);
  if (adminProf?.[1]) return adminProf[1];
  if (path === '/profiles/me' || path.startsWith('/profiles/me/')) {
    return actorId ?? null;
  }
  return null;
}

type ReqUser = Request & { user?: JwtUser };

@Injectable()
export class AuditRequestInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditRequestInterceptor.name);

  constructor(
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<ReqUser>();
    const res = ctx.getResponse<Response>();
    const method = req.method.toUpperCase();
    const path =
      (req.originalUrl ?? req.url ?? '').split('?')[0]?.trim() || '/';

    const includeGet =
      this.config
        .get<string>('AUDIT_INCLUDE_HTTP_GET')
        ?.trim()
        .toLowerCase() === 'true';

    const shouldAudit =
      MUTATING.has(method) ||
      (includeGet && method === 'GET' && !shouldSkipReadAudit(path));

    if (!shouldAudit) {
      return next.handle();
    }

    const started = Date.now();
    let logged = false;

    const persist = (status: number) => {
      if (logged) return;
      logged = true;
      const user = req.user;
      const durationMs = Date.now() - started;
      const bodyRaw = req.body;
      const metadata: Record<string, unknown> = {
        httpMethod: method,
        path,
        statusCode: status,
        durationMs,
      };
      if (Object.keys(req.query ?? {}).length > 0) {
        metadata.query = summarizeBody(req.query);
      }
      if (
        bodyRaw !== undefined &&
        bodyRaw !== null &&
        typeof bodyRaw === 'object' &&
        !Buffer.isBuffer(bodyRaw) &&
        Object.keys(bodyRaw as object).length > 0
      ) {
        metadata.body = summarizeBody(bodyRaw);
      }

      const action = `${method} ${path}`;
      const subjectProfileId = inferSubjectProfileId(path, user?.sub);

      void this.audit
        .append({
          actorProfileId: user?.sub ?? null,
          actorRole: null,
          action,
          entityType: 'http_request',
          entityId: null,
          subjectProfileId,
          metadata,
          ip: privacySafeClientIp(req),
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`audit append failed: ${msg}`);
        });
    };

    return next.handle().pipe(
      tap({
        error: (err: unknown) => {
          const status =
            err instanceof HttpException
              ? err.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;
          persist(status);
        },
        finalize: () => {
          if (!logged) persist(res.statusCode || 200);
        },
      }),
    );
  }
}
