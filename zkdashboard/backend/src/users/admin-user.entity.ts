import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  nombre: string | null;

  @Column({ nullable: true })
  apellido: string | null;

  @Column({ nullable: true })
  dni: string | null;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
