import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Role } from './role.entity';

@Entity('pending_invites')
export class PendingInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column('uuid', { nullable: true })
  role_id: string | null;

  @ManyToOne(() => Role, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column('timestamptz')
  expires_at: Date;

  @Column('timestamptz', { nullable: true })
  used_at: Date | null;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;
}
