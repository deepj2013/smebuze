import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('email_otps')
export class EmailOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 40 })
  purpose: string;

  @Column({ type: 'varchar', length: 255 })
  code_hash: string;

  @Column('timestamptz')
  expires_at: Date;

  @Column('timestamptz', { nullable: true })
  used_at: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  created_at: Date;
}
