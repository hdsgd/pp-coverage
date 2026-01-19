import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class AddUserIdToChannelSchedules1730000000000 implements MigrationInterface {
    name = 'AddUserIdToChannelSchedules1730000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar coluna user_id
        await queryRunner.addColumn("channel_schedules", new TableColumn({
            name: "user_id",
            type: "varchar",
            length: "36",
            isNullable: true, // Temporariamente nullable para não quebrar dados existentes
        }));

        // Criar índice para melhor performance nas consultas por usuário
        await queryRunner.createIndex("channel_schedules", new TableIndex({
            name: "idx_channel_schedules_user_id",
            columnNames: ["user_id"]
        }));

        // Criar foreign key para users
        await queryRunner.createForeignKey("channel_schedules", new TableForeignKey({
            name: "fk_channel_schedules_user",
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover foreign key
        await queryRunner.dropForeignKey("channel_schedules", "fk_channel_schedules_user");

        // Remover índice
        await queryRunner.dropIndex("channel_schedules", "idx_channel_schedules_user_id");

        // Remover coluna
        await queryRunner.dropColumn("channel_schedules", "user_id");
    }
}
