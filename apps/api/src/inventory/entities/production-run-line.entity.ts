import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Item } from './item.entity';
import { ProductionRun } from './production-run.entity';

@Entity('production_run_lines')
export class ProductionRunLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  run_id: string;

  @ManyToOne(() => ProductionRun, (run) => run.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: ProductionRun;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  component_item_id: string;

  @ManyToOne(() => Item, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_item_id' })
  component_item: Item;

  @Column('decimal', { precision: 18, scale: 4 })
  qty_used: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  unit_cost: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  line_cost: string;
}
