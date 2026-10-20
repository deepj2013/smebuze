import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Item } from '../../inventory/entities/item.entity';
import { HubCatalogItem } from './hub-catalog-item.entity';

@Entity('hub_item_links')
export class HubItemLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  hub_item_id: string;

  @ManyToOne(() => HubCatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_item_id' })
  hubItem: HubCatalogItem;

  @Column('uuid')
  item_id: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @CreateDateColumn()
  created_at: Date;
}
