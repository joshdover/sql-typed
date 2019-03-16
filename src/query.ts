import {
  TableAttributes,
  Expression,
  Transaction,
  Query,
  CompiledQuery,
  ComposedExpression,
  TableAttribute,
  ColumnExpression,
  ComparisonExpression,
  NotExpression,
  Columns,
  Column,
  ComposedOp,
  ColumnOp
} from "./types";

export class QueryImpl<T extends TableAttributes, C extends Columns<T>>
  implements Query<T, C> {
  constructor(
    private readonly columns: Columns<T>,
    private readonly conditions: Readonly<Array<Expression>> = []
  ) {}

  public where(condition?: Expression) {
    return condition === undefined
      ? this
      : new QueryImpl<T, C>(this.columns, [...this.conditions, condition]);
  }

  public async count(transaction: Transaction) {
    // TODO: compile query string and params
    return 0;
  }

  public groupBy<X extends TableAttributes>(columns: Columns<X>) {
    return new QueryImpl<T, C>(this.columns, [...this.conditions]);
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
    if (this.conditions.length) {
      const rootExpression =
        this.conditions.length > 1 ? this.joinConditions() : this.conditions[0];

      const [where, values] = this.buildExpression(rootExpression);
      return {
        where: ` WHERE ${where}`,
        values
      };
    } else {
      return {
        where: "",
        values: []
      };
    }
  }

  private joinConditions(): Expression {
    return this.conditions.reduce(
      (rootExp, nextExp) => rootExp.and(nextExp),
      this.conditions.pop()!.and(this.conditions.pop()!)
    );
  }

  private buildExpression(
    expression: Expression,
    values: any[] = []
  ): [string, any[]] {
    if (isComposedExpr(expression)) {
      let left: string, right: string;
      [left, values] = this.buildExpression(expression.left, values);
      [right, values] = this.buildExpression(expression.right, values);
      switch (expression.op) {
        case ComposedOp.And:
          return [`(${left}) AND (${right})`, values];
        case ComposedOp.Or:
          return [`(${left}) OR (${right})`, values];
        default:
          throw new Error(
            `Unknown operator for composed expression: ${expression.op}`
          );
      }
    }

    if (isColumnExpression(expression)) {
      if (isComparisonExpression(expression)) {
        let stringOp: string;
        switch (expression.op) {
          case ColumnOp.Equals:
            stringOp = "=";
            break;
          case ColumnOp.Like:
            stringOp = "LIKE";
            break;
          case ColumnOp.GreaterThan:
            stringOp = ">";
            break;
          case ColumnOp.GreaterThanOrEqual:
            stringOp = ">=";
            break;
          case ColumnOp.LessThan:
            stringOp = "<";
            break;
          case ColumnOp.LessThanOrEqual:
            stringOp = "<=";
            break;
          default:
            throw new Error(
              `Unknown operator for comparison expression: ${expression.op}`
            );
        }

        const val = this.nextValIdx(values);
        return [
          `${this.columnName(expression.column)} ${stringOp} ${val}`,
          [...values, expression.value]
        ];
      } else {
        switch (expression.op) {
          case ColumnOp.IsNull:
            return [`${this.columnName(expression.column)} IS NULL`, values];
          default:
            throw new Error(
              `Unknown operator for column expression: ${expression.op}`
            );
        }
      }
    }

    if (isNotExpression(expression)) {
      // Handle IS NOT NULL
      if (
        isColumnExpression(expression.expression) &&
        expression.expression.op === ColumnOp.IsNull
      ) {
        return [
          `${this.columnName(expression.expression.column)} IS NOT NULL`,
          values
        ];
      } else if (
        isColumnExpression(expression.expression) &&
        isComparisonExpression(expression.expression) &&
        expression.expression.op === ColumnOp.Like
      ) {
        const val = this.nextValIdx(values);
        return [
          `${this.columnName(expression.expression.column)} NOT LIKE ${val}`,
          [...values, expression.expression.value]
        ];
      } else {
        let innerExp: string;
        [innerExp, values] = this.buildExpression(
          expression.expression,
          values
        );
        return [`!(${innerExp})`, values];
      }
    }

    throw new Error(`Unrecognized expression: ${expression}`);
  }

  private nextValIdx(values: any[]) {
    return `$${values.length + 1}`;
  }

  private columnName(column: Column<any>): string {
    // TODO: add reverse index to speed this up
    for (const columnName in this.columns) {
      if (this.columns[columnName] === column) {
        return columnName;
      }
    }

    throw new Error(`Column not found!`);
  }
}

function isComposedExpr(expr: Expression): expr is ComposedExpression {
  const compExp = expr as ComposedExpression;
  return Boolean(compExp.left && compExp.right && compExp.op !== undefined);
}

function isColumnExpression(
  expr: Expression
): expr is ColumnExpression<TableAttribute> {
  const colExp = expr as ColumnExpression<TableAttribute>;
  return Boolean(colExp.column && colExp.op !== undefined);
}

function isComparisonExpression(
  expr: ColumnExpression<any>
): expr is ComparisonExpression<any> {
  const compExp = expr as ComparisonExpression<any>;
  return Boolean(compExp.value !== undefined);
}

function isNotExpression(expr: Expression): expr is NotExpression {
  const notExp = expr as NotExpression;
  return Boolean(notExp.isNot && notExp.expression);
}
