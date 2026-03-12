import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('onboarding_events')
export class OnboardingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  tenant_id: string | null;

  @Column('uuid', { nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 100 })
  event_name: string;

  @Column('jsonb', { default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
