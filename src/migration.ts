import dedent from "dedent";

import {
  TableAttributes,
  Table,
  Migration,
  ColumnType,
  Transaction,
  TableDefinition,
  ColumnConfig,
  MigrationFactory
} from "./types";

export class MigrationFactoryImpl<T extends TableAttributes>
  implements MigrationFactory {
  constructor(private readonly table: Table<T>) {}

  public create() {
    return new CreateMigration(this.table);
  }

  public update(currentSchema: TableDefinition) {
    return new UpdateMigration(this.table, currentSchema);
  }
}

class CreateMigration<T extends TableAttributes> implements Migration {
  constructor(private readonly table: Table<T>) {}

  public compile() {
    const columns = Object.keys(this.table.columnConfigs)
      .map(
        columnName =>
          [columnName, this.table.columnConfigs[columnName]] as [
            string,
            ColumnConfig<any>
          ]
      )
      .map(([columnName, config]) => getColumnDdl(columnName, config));

    return {
      text: dedent(`
        CREATE TABLE ${this.table.tableName} (
          ${columns.join(", ")}
        )
      `)
    };
  }

  public async execute(transaction: Transaction) {
    await transaction.query(this.compile());
  }
}

class UpdateMigration<T extends TableAttributes> implements Migration {
  constructor(
    private readonly table: Table<T>,
    private readonly currentSchema: TableDefinition
  ) {}

  public compile() {
    const existingColumnNames = new Set(
      this.currentSchema.map(({ columnName }) => columnName)
    );
    const columnsNeeded = Object.keys(this.table.columnConfigs).filter(
      columnName => !existingColumnNames.has(columnName)
    );
    const addColumns = columnsNeeded
      .map(
        columnName =>
          [columnName, this.table.columnConfigs[columnName]] as [
            string,
            ColumnConfig<any>
          ]
      )
      .map(([columnName, config]) => getColumnDdl(columnName, config))
      .map(ddl => `ADD COLUMN ${ddl}`);

    return {
      text: dedent(`
        ALTER TABLE ${this.table.tableName}
          ${addColumns.join(", ")}
      `)
    };
  }

  public async execute(transaction: Transaction) {
    await transaction.query(this.compile());
  }
}

const getColumnDdl = (
  columnName: string,
  columnConfig: ColumnConfig<any>
): string => {
  const dbType =
    columnConfig.databaseType ||
    (() => {
      switch (columnConfig.type) {
        case ColumnType.Number:
          return "bigint";
        case ColumnType.String:
          return "varchar(256)";
        case ColumnType.PrimaryKey:
          return "serial";
        default:
          throw new Error(`Unknown column type: ${columnConfig.type}`);
      }
    })();

  const options = `${
    columnConfig.nullable ? "NOT NULL" : ""
  } ${columnConfig.options || ""}`.trim();

  return `${columnName} ${dbType} ${options}`.trim();
};
