import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import 'reflect-metadata';

@Entity('subscribers')
export class Subscriber {
    @PrimaryColumn('varchar', { length: 50 })
    id: string;

    @Column('varchar', { length: 255 })
    name: string;

    @Column('varchar', { length: 255 })
    email: string;

    @Column('varchar', { length: 50 })
    board_id: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
