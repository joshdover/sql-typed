import dedent from 'dedent';

import { TableAttributes, Table, Migration, ColumnType, Transaction } from "./types";

export class MigrationImpl<T extends TableAttributes> implements Migration {
  constructor(private readonly table: Table<T>) {};

  public compile() {
    const columns = Object.keys(this.table.columnConfigs).map(columnName => {
      const col = this.table.columnConfigs[columnName];

      const dbType = col.databaseType || (() => {
        switch (col.type) {
          case ColumnType.Number:
            return 'bigint';
          case ColumnType.String:
            return 'varchar(256)';
          case ColumnType.PrimaryKey:
            return 'serial';
          default:
            throw new Error(`Unknown column type: ${col.type}`);
        }
      })();

      const options = `${col.nullable ? 'NOT NULL' : ''} ${col.options || ''}`.trim();
      
      return `${columnName} ${dbType} ${options}`.trim();
    });

    return {
      text: dedent(`
        CREATE TABLE ${this.table.tableName} (
          ${columns.join(', ')}
        )
      `)
    };
  }

  public async execute(transaction: Transaction) {
    await transaction.query(this.compile());
  }
}
