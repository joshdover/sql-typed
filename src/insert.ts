import { Insert, Transaction, Table, InsertValues, TableAttributes, Columns, Query } from './types';
import { addToValues } from './values';

class InsertValuesImpl<T extends TableAttributes> implements InsertValues<T> {
  constructor(private readonly table: Table<T>, private readonly objs: T[]) {}

  public readonly execute = async (transaction: Transaction) => {
    const { rows } = await transaction.query(this.compile());
    return rows;
  }

  public readonly compile = () => {
    const columnOrder = Object.keys(this.table.columns);
    const columnList = columnOrder.join(', ');

    let values: any[] = [];
    const nextValueIdx = (nextVal: any) => {
      const nextValues = addToValues(values, nextVal);
      values = nextValues.values;
      return nextValues.valueIdx;
    }
    const valuesIdxs = this.objs.map((obj: any) => {
      const idxs = columnOrder.map((column) => {
        const idx = nextValueIdx(obj[column]);
        return idx;
      })

      return `(${idxs.join(', ')})`;
    });

    return {
      text: `INSERT INTO ${this.table.tableName}(${columnList}) VALUES ${valuesIdxs.join(', ')} RETURNING *`,
      values: values
    };
  }
}

class InsertFromImpl<T extends TableAttributes> implements InsertFromImpl<T> {
  constructor(private readonly table: Table<T>, private readonly query: Query<any, Columns<any>>) {}

  public readonly execute = async (transaction: Transaction) => {
    const { rows } = await transaction.query(this.compile());
    return rows;
  }

  public readonly compile = () => {
    const compiledQuery = this.query.compile();

    return {
      text: `INSERT INTO ${this.table.tableName} (${compiledQuery.text})`,
      values: compiledQuery.values
    }
  }
}

export class InsertImpl<T extends TableAttributes> implements Insert<T> {
  constructor(private readonly table: Table<T>) {}

  public readonly values = (objs: T[]) => new InsertValuesImpl(this.table, objs);
  public readonly from = (query: Query<T, Columns<T>>) => new InsertFromImpl(this.table, query);
}
