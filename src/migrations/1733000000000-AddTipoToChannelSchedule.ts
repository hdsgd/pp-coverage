import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTipoToChannelSchedule1733000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar coluna tipo com valor padrão 'agendamento'
        await queryRunner.addColumn(
            'channel_schedules',
            new TableColumn({
                name: 'tipo',
                type: 'varchar',
                length: '50',
                isNullable: false,
                default: "'agendamento'",
                comment: 'Tipo do registro: reserva (admin) ou agendamento (form)'
            })
        );

        // Atualizar registros existentes sem user_id como 'reserva' (foram criados pelo admin)
        await queryRunner.query(`
            UPDATE channel_schedules
            SET tipo = 'reserva'
            WHERE user_id IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('channel_schedules', 'tipo');
    }
}