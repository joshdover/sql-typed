import {
  TableAttributes,
  Update,
  Expression,
  ColumnsValues,
  Table,
  Transaction,
} from "./types";
import { addToValues } from "./values";
import { compileExpressions } from "./expression_compiler";

export class UpdateImpl<T extends TableAttributes> implements Update<T> {
  constructor(
    private readonly table: Table<T>,
    private readonly expressions: Expression[] = [],
    private readonly columnsToSet: ColumnsValues<T> = {}
  ) {}

  public set<C extends keyof T>(values: ColumnsValues<T>): Update<T> {
    return new UpdateImpl(this.table, this.expressions, {
      ...this.columnsToSet,
      ...values
    });
  }

  public readonly where = (expression?: Expression) => {
    return expression === undefined
      ? this
      : new UpdateImpl(
          this.table,
          [...this.expressions, expression],
          this.columnsToSet
        );
  };

  public readonly compile = () => {
    // Make this error impossible by making this state impossible.
    if (Object.keys(this.columnsToSet).length === 0) {
      throw new Error(`No columns were set`);
    }

    let values: any[] = [];
    const setClauses = Object.keys(this.columnsToSet)
      .map((column: keyof T) => {
        const nextVal = addToValues(values, this.columnsToSet[column]);
        values = nextVal.values;
        return `${column} = ${nextVal.valueIdx}`;
      })
      .join(", ");

    let whereClause = "";
    if (this.expressions.length > 0) {
      const compiledExpr = compileExpressions(
        this.table.columns,
        this.expressions,
        values
      );
      whereClause = `WHERE ${compiledExpr.expression}`;
      values = compiledExpr.values;
    }

    return {
      text: `UPDATE ${
        this.table.tableName
      } SET ${setClauses} ${whereClause} RETURNING *`,
      values
    };
  };

  public readonly execute = async (transaction: Transaction) => {
    const { rows } = await transaction.query(this.compile());
    return rows as T[];
  };
}
