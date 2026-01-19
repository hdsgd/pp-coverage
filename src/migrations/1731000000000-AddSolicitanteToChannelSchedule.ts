import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSolicitanteToChannelSchedule1731000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verifica se a coluna já existe
        const table = await queryRunner.getTable("channel_schedules");
        const columnExists = table?.columns.some(column => column.name === "solicitante");

        if (!columnExists) {
            await queryRunner.addColumn(
                "channel_schedules",
                new TableColumn({
                    name: "solicitante",
                    type: "varchar",
                    length: "255",
                    isNullable: true,
                    comment: "Nome do solicitante/demandante da reserva"
                })
            );
            console.log("✅ Coluna 'solicitante' adicionada com sucesso");
        } else {
            console.log("⚠️ Coluna 'solicitante' já existe, pulando criação");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("channel_schedules");
        const columnExists = table?.columns.some(column => column.name === "solicitante");

        if (columnExists) {
            await queryRunner.dropColumn("channel_schedules", "solicitante");
            console.log("✅ Coluna 'solicitante' removida com sucesso");
        } else {
            console.log("⚠️ Coluna 'solicitante' não existe, nada para remover");
        }
    }
}