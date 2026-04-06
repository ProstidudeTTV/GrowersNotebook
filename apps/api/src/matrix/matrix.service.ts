import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { SignJWT } from 'jose';

function redactBase(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return '(invalid URL)';
  }
}

@Injectable()
export class MatrixService {
  constructor(private readonly config: ConfigService) {}

  private required(name: string): string {
    const v = this.config.get<string>(name)?.trim();
    if (!v) {
      throw new ServiceUnavailableException(
        `Matrix is not configured: missing ${name}`,
      );
    }
    return v;
  }

  matrixConfigured(): boolean {
    const keys = [
      'SYNAPSE_BASE_URL',
      'SYNAPSE_SERVER_NAME',
      'SYNAPSE_ADMIN_ACCESS_TOKEN',
      'SYNAPSE_JWT_SECRET',
    ] as const;
    return keys.every((k) => Boolean(this.config.get<string>(k)?.trim()));
  }

  /** Stable Matrix localpart for UUID profile ids (alphanumeric + underscore). */
  localpartForUserId(userId: string): string {
    const hex = createHash('sha256').update(userId).digest('hex').slice(0, 24);
    return `gn_${hex}`;
  }

  mxidForUserId(userId: string): string {
    const server = this.required('SYNAPSE_SERVER_NAME');
    return `@${this.localpartForUserId(userId)}:${server}`;
  }

  homeserverUrlForClient(): string {
    const pub = this.config.get<string>('SYNAPSE_PUBLIC_BASE_URL')?.trim();
    const base = this.required('SYNAPSE_BASE_URL');
    return (pub || base).replace(/\/+$/, '');
  }

  async ensureSynapseUser(userId: string): Promise<void> {
    const base = this.required('SYNAPSE_BASE_URL').replace(/\/+$/, '');
    const adminTok = this.required('SYNAPSE_ADMIN_ACCESS_TOKEN');
    const serverName = this.required('SYNAPSE_SERVER_NAME');
    const lp = this.localpartForUserId(userId);
    const url = `${base}/_synapse/admin/v2/users/@${lp}:${serverName}`;
    const password = randomBytes(24).toString('base64url');
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminTok}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        admin: false,
      }),
    });
    if (res.ok || res.status === 409) return;
    const text = await res.text();
    throw new Error(
      `Synapse create user failed ${res.status} for ${redactBase(base)}: ${text.slice(0, 500)}`,
    );
  }

  /** HS256 JWT for `org.matrix.login.jwt` (Synapse `jwt_config`). */
  async mintLoginJwt(userId: string): Promise<{ jwt: string; expiresInSec: number }> {
    const secretStr = this.required('SYNAPSE_JWT_SECRET');
    const secret = new TextEncoder().encode(secretStr);
    const lp = this.localpartForUserId(userId);
    const ttlSec = 900;
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(lp)
      .setIssuedAt()
      .setExpirationTime(`${ttlSec}s`)
      .sign(secret);
    return { jwt, expiresInSec: ttlSec };
  }
}
