import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateChannelSchedules1723427000000 implements MigrationInterface {
    name = 'CreateChannelSchedules1723427000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "channel_schedules",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "id_canal",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "data",
                        type: "date",
                        isNullable: false,
                    },
                    {
                        name: "hora",
                        type: "time",
                        isNullable: false,
                    },
                    {
                        name: "qtd",
                        type: "decimal",
                        precision: 15,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        // Create indexes for better performance
        await queryRunner.createIndex("channel_schedules", new TableIndex({
            name: "idx_channel_schedules_id_canal",
            columnNames: ["id_canal"]
        }));

        await queryRunner.createIndex("channel_schedules", new TableIndex({
            name: "idx_channel_schedules_data",
            columnNames: ["data"]
        }));

        await queryRunner.createIndex("channel_schedules", new TableIndex({
            name: "idx_channel_schedules_hora",
            columnNames: ["hora"]
        }));

        // Composite index for common queries
        await queryRunner.createIndex("channel_schedules", new TableIndex({
            name: "idx_channel_schedules_canal_data",
            columnNames: ["id_canal", "data"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("channel_schedules");
    }
}
