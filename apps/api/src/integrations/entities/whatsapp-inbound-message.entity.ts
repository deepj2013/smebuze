import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('whatsapp_inbound_messages')
export class WhatsappInboundMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  tenant_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  wa_message_id: string | null;

  @Column({ type: 'varchar', length: 30 })
  from_phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  profile_name: string | null;

  @Column({ type: 'varchar', length: 30, default: 'text' })
  message_type: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', default: {} })
  raw_payload: Record<string, unknown>;

  @Column('uuid', { nullable: true })
  lead_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
