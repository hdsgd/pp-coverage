import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMondayBoards1723426800000 implements MigrationInterface {
    name = 'CreateMondayBoards1723426800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "monday_boards",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "board_id",
                        type: "varchar",
                        length: "50",
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "is_active",
                        type: "boolean",
                        default: true,
                    },
                    {
                        name: "query_fields",
                        type: "json",
                        isNullable: true,
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("monday_boards");
    }
}
