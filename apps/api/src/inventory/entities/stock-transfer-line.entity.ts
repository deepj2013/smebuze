import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { StockTransfer } from './stock-transfer.entity';
import { Item } from './item.entity';

@Entity('stock_transfer_lines')
export class StockTransferLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  stock_transfer_id: string;

  @ManyToOne(() => StockTransfer, (st) => st.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_transfer_id' })
  stock_transfer: StockTransfer;

  @Column('uuid')
  item_id: string;

  @ManyToOne(() => Item, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column('decimal', { precision: 18, scale: 4 })
  quantity: string;

  @Column({ default: 0 })
  sort_order: number;
}
