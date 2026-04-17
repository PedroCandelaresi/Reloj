import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  id: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true })
  email: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
