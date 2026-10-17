import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type BackupFileInfo = {
  name: string;
  size_bytes: number;
  created_at: string;
};

@Injectable()
export class AdminBackupService {
  private backupDir(): string {
    const root = process.env.APP_DIR || resolve(process.cwd(), '../..');
    const dir = process.env.BACKUP_DIR || join(root, 'backups', 'db');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    return dir;
  }

  private scriptPath(): string {
    const root = process.env.APP_DIR || resolve(process.cwd(), '../..');
    return join(root, 'scripts', 'backup-db.sh');
  }

  list(): { dir: string; keep_days: number; files: BackupFileInfo[] } {
    const dir = this.backupDir();
    const files = readdirSync(dir)
      .filter((n) => /^smebuze-\d{8}T\d{6}Z\.dump$/.test(n))
      .map((name) => {
        const st = statSync(join(dir, name));
        return {
          name,
          size_bytes: st.size,
          created_at: st.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      dir,
      keep_days: parseInt(process.env.BACKUP_KEEP_DAYS || '14', 10),
      files,
    };
  }

  async create(): Promise<BackupFileInfo> {
    const script = this.scriptPath();
    if (!existsSync(script)) {
      throw new ServiceUnavailableException(
        'Backup script missing on server. Deploy latest production, then retry.',
      );
    }
    const root = process.env.APP_DIR || resolve(process.cwd(), '../..');
    try {
      const { stdout } = await execFileAsync('bash', [script], {
        env: { ...process.env, APP_DIR: root },
        timeout: 10 * 60 * 1000,
        maxBuffer: 2 * 1024 * 1024,
      });
      const path = stdout.trim().split('\n').filter(Boolean).pop();
      if (!path || !existsSync(path)) {
        throw new ServiceUnavailableException('pg_dump finished but no dump file was written.');
      }
      const name = basename(path);
      const st = statSync(path);
      return { name, size_bytes: st.size, created_at: st.mtime.toISOString() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`Database backup failed: ${msg}`);
    }
  }

  openDownload(name: string): { stream: ReturnType<typeof createReadStream>; size: number; name: string } {
    const base = basename(name);
    if (!/^smebuze-\d{8}T\d{6}Z\.dump$/.test(base)) {
      throw new BadRequestException('Invalid backup file name.');
    }
    const dir = resolve(this.backupDir());
    const safe = resolve(dir, base);
    if (!safe.startsWith(dir + '/') && safe !== dir) {
      throw new BadRequestException('Invalid backup path.');
    }
    if (!existsSync(safe)) throw new NotFoundException('Backup file not found.');
    const st = statSync(safe);
    return { stream: createReadStream(safe), size: st.size, name: base };
  }
}
