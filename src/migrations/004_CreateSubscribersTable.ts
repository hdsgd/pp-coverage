import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSubscribersTable1723427100000 implements MigrationInterface {
    name = 'CreateSubscribersTable1723427100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "subscribers",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "50",
                        isPrimary: true,
                        comment: "ID único do subscriber no Monday.com"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                        comment: "Nome completo do subscriber"
                    },
                    {
                        name: "email",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                        comment: "Email do subscriber"
                    },
                    {
                        name: "board_id",
                        type: "varchar",
                        length: "50",
                        isNullable: false,
                        comment: "ID do board no Monday.com"
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        comment: "Data de criação do registro"
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                        comment: "Data da última atualização"
                    }
                ]
            }),
            true
        );

        // Índices para otimizar consultas
        await queryRunner.createIndex("subscribers", new TableIndex({
            name: "IDX_subscribers_board_id",
            columnNames: ["board_id"]
        }));

        await queryRunner.createIndex("subscribers", new TableIndex({
            name: "IDX_subscribers_email",
            columnNames: ["email"]
        }));

        await queryRunner.createIndex("subscribers", new TableIndex({
            name: "IDX_subscribers_name",
            columnNames: ["name"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("subscribers");
    }
}
