import {
  TableAttributes,
  BooleanExpression,
  Transaction,
  TableQuery,
  CompiledQuery,
  Columns,
  Table
} from "./types";
import { compileExpressions } from "./expression_compiler";

export class TableQueryImpl<T extends TableAttributes>
  implements TableQuery<T> {
  constructor(
    private readonly table: Table<T>,
    private readonly predicates: Readonly<BooleanExpression[]> = []
  ) {}

  public where(
    predicate?: BooleanExpression | ((columns: Columns<T>) => BooleanExpression)
  ) {
    if (predicate === undefined) {
      return this;
    } else if (typeof predicate === "function") {
      const resolvedPredicate = predicate(this.table.columns);
      return new TableQueryImpl<T>(this.table, [
        ...this.predicates,
        resolvedPredicate
      ]);
    } else {
      return new TableQueryImpl<T>(this.table, [...this.predicates, predicate]);
    }
  }

  public count() {
    const baseQuery = this;

    return {
      compile() {
        let text = `SELECT count(*) FROM ${baseQuery.table.tableName}`;

        // Compile where predicates
        const { where, values } = baseQuery.compileWhere();
        text += where;

        return {
          text,
          values
        };
      },

      async execute(transaction: Transaction) {
        const { rows } = await transaction.query(this.compile());
        return parseInt(rows[0].count, 10) as number;
      }
    };
  }

  public async execute(transaction: Transaction) {
    const { rows } = await transaction.query(this.compile());
    return rows as T[];
  }

  public compile(): CompiledQuery {
    const columns = Object.keys(this.table.columns)
      .map(columnName => `"${this.table.tableName}"."${columnName}"`)
      .join(", ");
    let text = `SELECT ${columns} FROM ${this.table.tableName}`;

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
        this.table.columns,
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
