import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('onboarding_surveys')
export class OnboardingSurvey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  tenant_id: string | null;

  @Column('uuid', { nullable: true })
  user_id: string | null;

  @Column('int', { nullable: true })
  rating: number | null;

  @Column('text', { nullable: true })
  feedback: string | null;

  @CreateDateColumn()
  created_at: Date;
}
