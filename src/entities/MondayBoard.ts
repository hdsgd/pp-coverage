import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import 'reflect-metadata';

@Entity("monday_boards")
export class MondayBoard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: "bigint" })
  board_id: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "json", nullable: true })
  query_fields: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
