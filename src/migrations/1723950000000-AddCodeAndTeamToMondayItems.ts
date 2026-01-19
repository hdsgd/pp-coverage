import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCodeAndTeamToMondayItems1723950000000 implements MigrationInterface {
  name = 'AddCodeAndTeamToMondayItems1723950000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'monday_items',
      new TableColumn({
        name: 'code',
        type: 'varchar',
        length: '100',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'monday_items',
      new TableColumn({
        name: 'team',
        type: 'json',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('monday_items', 'team');
    await queryRunner.dropColumn('monday_items', 'code');
  }
}
