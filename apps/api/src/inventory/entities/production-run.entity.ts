import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Warehouse } from './warehouse.entity';
import { Item } from './item.entity';
import { ProductionRunLine } from './production-run-line.entity';

@Entity('production_runs')
export class ProductionRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  warehouse_id: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column('uuid')
  finished_item_id: string;

  @ManyToOne(() => Item, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'finished_item_id' })
  finished_item: Item;

  @Column('decimal', { precision: 18, scale: 4 })
  qty_produced: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  unit_cost: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  total_cost: string;

  @Column({ type: 'date' })
  produced_at: string;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @OneToMany(() => ProductionRunLine, (line) => line.run)
  lines: ProductionRunLine[];

  @CreateDateColumn()
  created_at: Date;
}
