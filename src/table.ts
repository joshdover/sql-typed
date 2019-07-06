import {
  TableAttributes,
  Columns,
  Table,
  ColumnConfig,
  StringColumn,
  Column,
  TableAttribute,
  ColumnType,
  NumberColumn,
  primaryKey,
  PrimaryKeyColumn,
  ColumnConfigs,
  Transaction,
  TableDefinition,
  Insert,
  Update,
  MigrationFactory,
  TableQuery
} from "./types";
import { TableQueryImpl } from "./query";
import { StringColumnImpl, NumberColumnImpl } from "./column";
import { InsertImpl } from "./insert";
import { UpdateImpl } from "./update";
import { MigrationFactoryImpl } from "./migration";

function getColumn(column: ColumnConfig<string>, tab: Table<any>): StringColumn;
function getColumn(
  column: ColumnConfig<primaryKey>,
  tab: Table<any>
): PrimaryKeyColumn;
function getColumn(column: ColumnConfig<number>, tab: Table<any>): NumberColumn;
function getColumn<T extends TableAttribute>(
  columnConfig: ColumnConfig<T>,
  tab: Table<any>
): Column<T> {
  if (isStringColumn(columnConfig)) {
    return (new StringColumnImpl(columnConfig, tab) as unknown) as Column<T>;
  } else if (isPrimaryKeyColumn(columnConfig)) {
    return (new NumberColumnImpl(columnConfig, tab) as unknown) as Column<T>;
  } else if (isNumberColumn(columnConfig)) {
    return (new NumberColumnImpl(columnConfig, tab) as unknown) as Column<T>;
  } else {
    throw new Error(`Unknown column type: ${columnConfig}`);
  }
}

function isStringColumn<T extends TableAttribute>(
  config: ColumnConfig<T>
): config is ColumnConfig<string> {
  return config.type === ColumnType.String;
}
function isPrimaryKeyColumn<T extends TableAttribute>(
  config: ColumnConfig<T>
): config is ColumnConfig<primaryKey> {
  return config.type === ColumnType.PrimaryKey;
}
function isNumberColumn<T extends TableAttribute>(
  config: ColumnConfig<T>
): config is ColumnConfig<number> {
  return config.type === ColumnType.Number;
}

/**
 * Creates a table instance
 * @param tableName
 * @param columns
 */
export const createTable = <T extends TableAttributes>(
  tableName: string,
  columns: ColumnConfigs<T>
): Table<T> => new TableImpl<T>(tableName, columns);

class TableImpl<T extends TableAttributes> implements Table<T> {
  public readonly columns: Columns<T>;

  constructor(
    public readonly tableName: string,
    public readonly columnConfigs: ColumnConfigs<T>
  ) {
    this.columns = Object.getOwnPropertyNames(columnConfigs).reduce(
      (tableCols, columnName) => {
        tableCols[columnName] = getColumn(columnConfigs[columnName], this);
        return tableCols;
      },
      {} as any
    );
  }

  public select = (): TableQuery<T> => new TableQueryImpl<T>(this);
  public insert = (): Insert<T> => new InsertImpl<T>(this);
  public update = (): Update<T> => new UpdateImpl<T>(this);
  public migrate = (): MigrationFactory => new MigrationFactoryImpl<T>(this);
  public definition = (transaction: Transaction): Promise<TableDefinition> =>
    transaction.query({
      text: `
        SELECT column_name as columnName, data_type as dataType
        FROM INFORMATION_SCHEMA.COLUMNS where table_name = $1
      `,
      values: [this.tableName]
    }) as Promise<any>;
}
