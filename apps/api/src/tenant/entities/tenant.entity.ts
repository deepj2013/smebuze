import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlatformOrg } from './platform-org.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  platform_org_id: string;

  @ManyToOne(() => PlatformOrg, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platform_org_id' })
  platformOrg: PlatformOrg;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 50, default: 'basic' })
  plan: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  license_key: string | null;

  @Column({ type: 'jsonb', default: [] })
  features: string[];

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  subscription_ends_at: Date | null;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
