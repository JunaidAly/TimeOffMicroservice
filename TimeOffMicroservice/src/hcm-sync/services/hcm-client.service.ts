import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { IHcmClient, HcmBalance, HcmUpdateResult } from '../interfaces/hcm-client.interface';
import { TimeOffType } from '../../time-off/entities/time-off-request.entity';

const HCM_BASE_URL = process.env.HCM_BASE_URL || 'http://localhost:3000/mock-hcm';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class HcmClientService implements IHcmClient {
  private readonly logger = new Logger(HcmClientService.name);

  async getBalance(employeeId: string, locationId: string, type: TimeOffType): Promise<HcmBalance> {
    const url = `${HCM_BASE_URL}/balances/${employeeId}/${locationId}/${type}`;
    return this.withRetry(
      () => this.fetchJson<HcmBalance>(url, 'GET'),
      `getBalance(${employeeId},${locationId},${type})`,
    );
  }

  async updateBalance(
    employeeId: string,
    locationId: string,
    type: TimeOffType,
    delta: number,
    idempotencyKey: string,
  ): Promise<HcmUpdateResult> {
    const url = `${HCM_BASE_URL}/balances/${employeeId}/${locationId}/${type}`;
    return this.withRetry(
      () => this.fetchJson<HcmUpdateResult>(url, 'PUT', { delta }, { 'X-Idempotency-Key': idempotencyKey }),
      `updateBalance(${employeeId},${locationId},${type},delta=${delta})`,
    );
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        const isRetryable = this.isRetryableError(err);
        this.logger.warn(`HCM [${label}] attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

        if (!isRetryable || attempt === MAX_RETRIES) break;

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new ServiceUnavailableException({
      error: 'HCM_UNAVAILABLE',
      message: `HCM system unavailable: ${lastError?.message}`,
    });
  }

  private isRetryableError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return !status || status >= 500;
  }

  private async fetchJson<T>(
    url: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      const err = new Error(`HCM ${response.status}: ${JSON.stringify(errorBody)}`) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    return response.json() as Promise<T>;
  }
}
