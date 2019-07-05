import {
  TableAttributes,
  Expression,
  Transaction,
  Query,
  CompiledQuery,
  Columns
} from "./types";
import { compileExpressions } from "./expression_compiler";

export class QueryImpl<T extends TableAttributes, C extends Columns<T>>
  implements Query<T, C> {
  constructor(
    private readonly columns: Columns<T>,
    private readonly expressions: Readonly<Array<Expression>> = []
  ) {}

  public where(condition?: Expression | ((columns: Columns<T>) => Expression)) {
    if (condition === undefined) {
      return this;
    } else if (typeof condition === 'function') {
      const resolvedCondition = condition(this.columns);
      return new QueryImpl<T, C>(this.columns, [...this.expressions, resolvedCondition]);
    } else {
      return new QueryImpl<T, C>(this.columns, [...this.expressions, condition]);
    }
  }

  public async count(transaction: Transaction) {
    // TODO: compile query string and params
    return 0;
  }

  public groupBy<X extends TableAttributes>(columns: Columns<X>) {
    return new QueryImpl<T, C>(this.columns, [...this.expressions]);
  }

  public async execute(transaction: Transaction) {
    const { rows } = await transaction.query(this.compile());
    return rows as T[];
  }

  public compile(): CompiledQuery {
    // TODO support joins / multiple tables
    const tableName = Object.getOwnPropertyNames(this.columns).map(
      col => this.columns[col].table.tableName
    )[0];
    let text = `SELECT * FROM ${tableName}`;

    // Compile where conditions
    const { where, values } = this.compileWhere();
    text += where;

    return {
      text,
      values
    };
  }

  private compileWhere() {
    if (this.expressions.length) {
      const { expression, values } = compileExpressions(
        this.columns,
        this.expressions
      );
      return {
        where: ` WHERE ${expression}`,
        values
      };
    } else {
      return {
        where: "",
        values: []
      };
    }
  }
}
