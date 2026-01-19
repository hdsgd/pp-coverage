import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import bcrypt from 'bcryptjs';
import 'reflect-metadata';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
    username!: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    password!: string;

    @Column({ type: 'varchar', length: 50, nullable: false, default: 'admin' })
    role!: string; // admin, user, etc.

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.password && !this.password.startsWith('$2a$')) {
            // Só faz hash se a senha não estiver já hasheada
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password);
    }
}
