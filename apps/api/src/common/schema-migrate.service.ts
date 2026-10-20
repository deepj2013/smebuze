import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Applies packages/db-migrations/*.sql on API boot.
 * Additive only (IF NOT EXISTS). Never drops tenant data.
 * Set AUTO_MIGRATE=0 to skip (CI / one-shot npm run db:migrate).
 */
@Injectable()
export class SchemaMigrateService implements OnModuleInit {
  private readonly logger = new Logger(SchemaMigrateService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if ((process.env.AUTO_MIGRATE || '1').trim() === '0') {
      this.logger.log('AUTO_MIGRATE=0 — skipping boot migrations');
      return;
    }
    try {
      await this.applyPending();
    } catch (err) {
      this.logger.error(`Boot migrate failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private migrationsDir(): string | null {
    const candidates = [
      join(process.cwd(), 'packages/db-migrations'),
      join(process.cwd(), '../../packages/db-migrations'),
      join(__dirname, '../../../../packages/db-migrations'),
    ];
    return candidates.find((p) => existsSync(p)) ?? null;
  }

  async applyPending() {
    const dir = this.migrationsDir();
    if (!dir) {
      this.logger.warn('db-migrations folder not found — skip auto migrate');
      return;
    }
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const appliedRows = (await this.dataSource.query(`SELECT filename FROM _schema_migrations`)) as Array<{
      filename: string;
    }>;
    const applied = new Set(appliedRows.map((r) => r.filename));
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const tenants = await this.dataSource.query(`SELECT to_regclass('public.tenants') IS NOT NULL AS ok`);
    if (tenants?.[0]?.ok === true && applied.size === 0) {
      this.logger.log('Existing DB without tracker — recording 001–034 as applied (no re-run).');
      for (const file of files) {
        const num = parseInt(file.slice(0, 3), 10);
        if (!Number.isNaN(num) && num <= 34) {
          await this.dataSource.query(`INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [
            file,
          ]);
          applied.add(file);
        }
      }
    }

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      this.logger.log(`Applying ${file}`);
      const sql = readFileSync(join(dir, file), 'utf8');
      await this.runSqlFile(sql);
      await this.dataSource.query(`INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [file]);
      ran++;
    }
    this.logger.log(`Boot migrate done. applied=${ran} skipped=${files.length - ran}`);
  }

  private async runSqlFile(sql: string) {
    const statements = splitSqlStatements(sql);
    for (const stmt of statements) {
      await this.dataSource.query(stmt);
    }
  }
}

function splitSqlStatements(sql: string): string[] {
  const cleaned = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
