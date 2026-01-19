import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddProductToMondayItems1728000000000 implements MigrationInterface {
  name = 'AddProductToMondayItems1728000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'monday_items',
      new TableColumn({
        name: 'product',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('monday_items', 'product');
  }
}