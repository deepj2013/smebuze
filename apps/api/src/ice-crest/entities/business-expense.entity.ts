import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_expenses')
export class BusinessExpense {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenant_id: string;
  @Column('uuid', { nullable: true }) company_id: string | null;
  @Column({type:'varchar',length:30,default:'operating_expense'}) entry_type: string;
  @Column({type:'varchar',length:60,nullable:true}) expense_number: string | null;
  @Column('uuid',{nullable:true}) vendor_id: string | null;
  @Column({type:'varchar',length:150,nullable:true}) employee_name: string | null;
  @Column({ length: 60 }) category: string;
  @Column('decimal', { precision: 18, scale: 2 }) amount: string;
  @Column('decimal',{precision:18,scale:2,default:0}) taxable_amount: string;
  @Column('decimal',{precision:5,scale:2,default:0}) gst_rate: string;
  @Column('decimal',{precision:18,scale:2,default:0}) gst_amount: string;
  @Column('decimal',{precision:18,scale:2,default:0}) tds_amount: string;
  @Column('decimal',{precision:18,scale:2,default:0}) paid_amount: string;
  @Column('date',{nullable:true}) due_date: Date | null;
  @Column({type:'varchar',length:20,default:'unpaid'}) status: string;
  @Column({type:'varchar',length:100,nullable:true}) invoice_number: string | null;
  @Column('text',{nullable:true}) attachment_url: string | null;
  @Column('date') expense_date: Date;
  @Column('text', { nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) payment_mode: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference: string | null;
  @Column('uuid', { nullable: true }) created_by: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
