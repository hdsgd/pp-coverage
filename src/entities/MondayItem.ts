import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { MondayBoard } from "./MondayBoard";
import 'reflect-metadata';

@Entity("monday_items")
export class MondayItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "bigint" })
  item_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  status: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  max_value?: number;

  // Novo: código auxiliar para o item (opcional)
  @Column({ type: "varchar", length: 100, nullable: true })
  code?: string | null;

  // Novo: times associados ao item (array de strings - armazenado como JSON no MySQL)
  @Column({ type: "json", nullable: true })
  team?: string[] | null;

  // Novo: produto associado ao item
  @Column({ type: "varchar", length: 255, nullable: true })
  product?: string | null;

  @ManyToOne(() => MondayBoard)
  @JoinColumn({ name: "board_id" })
  board: MondayBoard;

  @Column()
  board_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
