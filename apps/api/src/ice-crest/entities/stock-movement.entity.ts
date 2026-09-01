import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenant_id: string;
  @Column('uuid') warehouse_id: string;
  @Column('uuid') item_id: string;
  @Column({ length: 20 }) movement_type: string;
  @Column('decimal', { precision: 18, scale: 4 }) quantity: string;
  @Column('date') movement_date: Date;
  @Column({ type: 'varchar', length: 40, nullable: true }) reference_type: string | null;
  @Column('uuid', { nullable: true }) reference_id: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference_number: string | null;
  @Column('text', { nullable: true }) notes: string | null;
  @Column('uuid', { nullable: true }) created_by: string | null;
  @CreateDateColumn() created_at: Date;
}
