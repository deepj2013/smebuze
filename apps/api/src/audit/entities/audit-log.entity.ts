import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  tenant_id: string | null;

  @Column('uuid', { nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resource_id: string | null;

  @Column('jsonb', { default: {} })
  details: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
