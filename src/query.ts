import {
  TableAttributes,
  BooleanExpression,
  Transaction,
  TableQuery,
  CompiledQuery,
  Columns
} from "./types";
import { compileExpressions } from "./expression_compiler";

export class QueryImpl<T extends TableAttributes>
  implements TableQuery<T> {
  constructor(
    private readonly columns: Columns<T>,
    private readonly predicates: Readonly<Array<BooleanExpression>> = []
  ) {}

  public where(predicate?: BooleanExpression | ((columns: Columns<T>) => BooleanExpression)) {
    if (predicate === undefined) {
      return this;
    } else if (typeof predicate === 'function') {
      const resolvedPredicate = predicate(this.columns);
      return new QueryImpl<T>(this.columns, [...this.predicates, resolvedPredicate]);
    } else {
      return new QueryImpl<T>(this.columns, [...this.predicates, predicate]);
    }
  }

  public async count(transaction: Transaction) {
    // TODO: compile query string and params
    return 0;
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

    // Compile where predicates
    const { where, values } = this.compileWhere();
    text += where;

    return {
      text,
      values
    };
  }

  private compileWhere() {
    if (this.predicates.length) {
      const { expression, values } = compileExpressions(
        this.columns,
        this.predicates
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
