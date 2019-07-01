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
  ColumnConfigs
} from "./types";
import { QueryImpl } from "./query";
import { StringColumnImpl, NumberColumnImpl } from "./column";
import { InsertImpl } from "./insert";
import { UpdateImpl } from "./update";
import { MigrationImpl } from "./migration";

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
export const table = <T extends TableAttributes>(
  tableName: string,
  columns: ColumnConfigs<T>
): Table<T> => {
  const tab = {
    tableName
  } as any;

  const tableColumns: Columns<T> = Object.getOwnPropertyNames(columns).reduce(
    (tableCols, columnName) => {
      tableCols[columnName] = getColumn(columns[columnName], tab);
      return tableCols;
    },
    {} as any
  );

  tab.columns = tableColumns;
  tab.columnConfigs = columns;

  tab.select = (selectColumns?: Columns<any>) => {
    return new QueryImpl(selectColumns || tab.columns);
  };

  tab.insert = () => new InsertImpl<T>(tab);
  tab.update = () => new UpdateImpl<T>(tab);
  tab.migrate = () => new MigrationImpl<T>(tab);

  return tab;
};
