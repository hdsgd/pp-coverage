import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateMondayItems1723426900000 implements MigrationInterface {
    name = 'CreateMondayItems1723426900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "monday_items",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "item_id",
                        type: "varchar",
                        length: "50",
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "100",
                        isNullable: true,
                    },
                    {
                        name: "max_value",
                        type: "decimal",
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "board_id",
                        type: "varchar",
                        length: "36",
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

        // Create index on board_id for better performance
        await queryRunner.createIndex("monday_items", new TableIndex({
            name: "idx_monday_items_board_id",
            columnNames: ["board_id"]
        }));

        // Create index on status for filtering
        await queryRunner.createIndex("monday_items", new TableIndex({
            name: "idx_monday_items_status",
            columnNames: ["status"]
        }));

        // Create foreign key constraint to monday_boards
        await queryRunner.createForeignKey("monday_items", new TableForeignKey({
            columnNames: ["board_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "monday_boards",
            onDelete: "CASCADE",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("monday_items");
    }
}
