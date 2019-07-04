import {
  Insert,
  Transaction,
  Table,
  InsertValues,
  TableAttributes,
  Columns,
  Query,
  WithoutPrimaryKeys
} from "./types";
import { addToValues } from "./values";

function flatten(arr: Array<Array<any>>): Array<any> {
  return arr.reduce((acc, item) => acc.concat(item), []);
}

class InsertValuesImpl<T extends TableAttributes> implements InsertValues<T> {
  constructor(
    private readonly table: Table<T>,
    private readonly objs: Array<T | WithoutPrimaryKeys<T>>
  ) {}

  public readonly execute = async (transaction: Transaction) => {
    const { rows } = await transaction.query(this.compile());
    return rows;
  };

  public readonly compile = () => {
    // Get list of columns in all objects
    const presentColumns = flatten(
      this.objs.map((obj: any) =>
        Object.keys(obj).filter(key => obj[key] !== undefined)
      )
    );
    const objColumns = [...new Set<string>(presentColumns).values()];
    const columnList = objColumns.join(", ");

    let values: any[] = [];
    const nextValueIdx = (nextVal: any) => {
      const nextValues = addToValues(values, nextVal || null);
      values = nextValues.values;
      return nextValues.valueIdx;
    };
    const valuesIdxs = this.objs.map((obj: any) => {
      const idxs = objColumns.map(column => {
        const idx = nextValueIdx(obj[column]);
        return idx;
      });

      return `(${idxs.join(", ")})`;
    });

    return {
      text: `INSERT INTO ${
        this.table.tableName
      }(${columnList}) VALUES ${valuesIdxs.join(", ")} RETURNING *`,
      values: values
    };
  };
}

class InsertFromImpl<T extends TableAttributes> implements InsertFromImpl<T> {
  constructor(
    private readonly table: Table<T>,
    private readonly query: Query<any, Columns<any>>
  ) {}

  public readonly execute = async (transaction: Transaction) => {
    const { rows } = await transaction.query(this.compile());
    return rows;
  };

  public readonly compile = () => {
    const compiledQuery = this.query.compile();

    return {
      text: `INSERT INTO ${this.table.tableName} (${compiledQuery.text})`,
      values: compiledQuery.values
    };
  };
}

export class InsertImpl<T extends TableAttributes> implements Insert<T> {
  constructor(private readonly table: Table<T>) {}

  public readonly values = (objs: Array<T | WithoutPrimaryKeys<T>>) =>
    new InsertValuesImpl(this.table, objs);
  public readonly from = (query: Query<T, Columns<T>>) =>
    new InsertFromImpl(this.table, query);
}
