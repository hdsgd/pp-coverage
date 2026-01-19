import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAreaSolicitanteToChannelSchedule1732000000000 implements MigrationInterface {
    name = 'AddAreaSolicitanteToChannelSchedule1732000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adiciona campo area_solicitante na tabela channel_schedules
        await queryRunner.addColumn(
            'channel_schedules',
            new TableColumn({
                name: 'area_solicitante',
                type: 'varchar',
                length: '255',
                isNullable: false,
                comment: 'ID da área solicitante do Monday.com'
            })
        );

        // Adiciona índice para melhor performance nas consultas
        await queryRunner.query(`
            CREATE INDEX idx_channel_schedules_area_solicitante
            ON channel_schedules(area_solicitante)
        `);

        // Adiciona índice composto para consultas por canal, data, hora e área
        await queryRunner.query(`
            CREATE INDEX idx_channel_schedules_canal_data_hora_area
            ON channel_schedules(id_canal, data, hora, area_solicitante)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove índices
        await queryRunner.query(`DROP INDEX idx_channel_schedules_canal_data_hora_area`);
        await queryRunner.query(`DROP INDEX idx_channel_schedules_area_solicitante`);

        // Remove coluna
        await queryRunner.dropColumn('channel_schedules', 'area_solicitante');
    }
}