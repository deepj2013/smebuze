import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('stock_reservations')
export class StockReservation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenant_id: string;
  @Column('uuid') sales_order_id: string;
  @Column('uuid') warehouse_id: string;
  @Column('uuid') item_id: string;
  @Column('decimal',{precision:18,scale:4}) quantity: string;
  @Column('decimal',{precision:18,scale:4,default:0}) consumed_quantity: string;
  @Column({type:'varchar',length:20,default:'active'}) status: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
