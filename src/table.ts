import {
  TableAttributes,
  Columns,
  Table,
  ColumnConfig,
  StringColumn,
  Column,
  TableAttribute,
  ColumnType,
  NumberColumn
} from "./types";
import { QueryImpl } from "./query";
import { StringColumnImpl, NumberColumnImpl } from "./column";
import { InsertImpl } from "./insert";

function getColumn(column: ColumnConfig<string>, tab: Table<any>): StringColumn;
function getColumn(column: ColumnConfig<number>, tab: Table<any>): NumberColumn;
function getColumn<T extends TableAttribute>(
  columnConfig: ColumnConfig<T>,
  tab: Table<any>
): Column<T> {
  if (isStringColumn(columnConfig)) {
    return (new StringColumnImpl(columnConfig, tab) as unknown) as Column<T>;
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
  columns: { [P in keyof T]: ColumnConfig<T[P]> }
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

  tab.select = (selectColumns?: Columns<any>) => {
    return new QueryImpl(selectColumns || tab.columns);
  };

  tab.insert = (obj: T | T[]) => {
    return new InsertImpl<T>(tab, obj);
  };

  return tab;
};
