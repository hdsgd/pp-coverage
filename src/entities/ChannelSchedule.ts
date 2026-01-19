import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import 'reflect-metadata';

@Entity('channel_schedules')
export class ChannelSchedule {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    id_canal!: string;

    @Column({ type: 'date', nullable: false })
    data!: Date;

    @Column({ type: 'time', nullable: false })
    hora!: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    qtd!: number;

    @Column({ type: 'varchar', length: 36, nullable: true })
    user_id?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user?: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    area_solicitante!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    solicitante?: string;

    @Column({ type: 'varchar', length: 50, nullable: false, default: 'agendamento' })
    tipo!: 'reserva' | 'agendamento'; // 'reserva' = criado via admin, 'agendamento' = criado via form

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
