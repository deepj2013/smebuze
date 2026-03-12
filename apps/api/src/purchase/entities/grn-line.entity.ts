import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Grn } from './grn.entity';

@Entity('grn_lines')
export class GrnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  grn_id: string;

  @ManyToOne(() => Grn, (grn) => grn.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grn_id' })
  grn: Grn;

  @Column('uuid', { nullable: true })
  item_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  ordered_qty: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  received_qty: string;

  @Column({ default: 0 })
  sort_order: number;
}
