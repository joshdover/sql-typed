import { Insert, Transaction, Table } from './types';

export class InsertImpl<T> implements Insert<T> {
  constructor(private readonly table: Table<any>, private readonly obj: T | T[]) {}

  public readonly execute = async (transaction: Transaction) => {
    const res = await transaction.query(this.compile());
    return Array.isArray(this.obj) ? res.rows : res.rows[0];
  }

  public readonly compile = () => {
    const columnOrder = Object.keys(this.table.columns);
    const columnList = columnOrder.join(', ');
    const objects = Array.isArray(this.obj) ? this.obj : [this.obj];

    const values: any[] = [];
    const nextValueIdx = () => `$${values.length + 1}`;
    const valuesIdxs = objects.map((obj: any) => {
      const idxs = columnOrder.map((column) => {
        const idx = nextValueIdx();
        values.push(obj[column] as any);
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
