import {
  BooleanExpression,
  OperatorExpression,
  TableAttribute,
  ColumnExpression,
  ComparisonExpression,
  NotExpression,
  ComposedOp,
  ColumnOp,
  Column
} from "./types";
import { addToValues } from "./values";

const joinExpressions = (
  expressions: BooleanExpression[]
): BooleanExpression => {
  return expressions.reduce(
    (rootExp, nextExp) => rootExp.and(nextExp),
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    expressions.pop()!.and(expressions.pop()!)
  );
};

const buildExpression = (
  expression: BooleanExpression,
  values: any[]
): [string, any[]] => {
  if (isComposedExpr(expression)) {
    let left: string, right: string;
    [left, values] = buildExpression(expression.left, values);
    [right, values] = buildExpression(expression.right, values);
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

      if (isColumn(expression.value)) {
        return [
          `${getColumnName(expression.column)} ${stringOp} ${getColumnName(
            expression.value
          )}`,
          values
        ];
      } else {
        const nextValues = addToValues(values, expression.value);
        return [
          `${getColumnName(expression.column)} ${stringOp} ${
            nextValues.valueIdx
          }`,
          nextValues.values
        ];
      }
    } else {
      switch (expression.op) {
        case ColumnOp.IsNull:
          return [`${getColumnName(expression.column)} IS NULL`, values];
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
        `${getColumnName(expression.expression.column)} IS NOT NULL`,
        values
      ];
    } else if (
      isColumnExpression(expression.expression) &&
      isComparisonExpression(expression.expression) &&
      expression.expression.op === ColumnOp.Like
    ) {
      const nextValues = addToValues(values, expression.expression.value);
      return [
        `${getColumnName(expression.expression.column)} NOT LIKE ${
          nextValues.valueIdx
        }`,
        nextValues.values
      ];
    } else {
      let innerExp: string;
      [innerExp, values] = buildExpression(expression.expression, values);
      return [`!(${innerExp})`, values];
    }
  }

  throw new Error(`Unrecognized expression: ${Object.keys(expression)}`);
};

const getColumnName = (column: Column<any>): string => {
  // TODO: add reverse index to speed this up
  for (const columnName in column.table.columns) {
    if (column.table.columns[columnName] === column) {
      return `"${column.table.tableName}"."${columnName.toLowerCase()}"`;
    }
  }

  throw new Error(`Column not found!`);
};

function isColumn(value: any): value is Column<any> {
  const col = value as Column<any>;
  return Boolean(
    col.config &&
      col.table &&
      typeof col.eqls === "function" &&
      typeof col.isNull === "function"
  );
}

function isComposedExpr(expr: BooleanExpression): expr is OperatorExpression {
  const compExp = expr as OperatorExpression;
  return Boolean(compExp.left && compExp.right && compExp.op !== undefined);
}

function isColumnExpression(
  expr: BooleanExpression
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

function isNotExpression(expr: BooleanExpression): expr is NotExpression {
  const notExp = expr as NotExpression;
  return Boolean(notExp.isNot && notExp.expression);
}

export const compileExpressions = (
  expressions: ReadonlyArray<BooleanExpression>,
  values: any[] = []
): { expression: string; values: any[] } => {
  const internalExpressions = [...expressions];

  const rootExpression =
    internalExpressions.length > 1
      ? joinExpressions(internalExpressions)
      : internalExpressions[0];

  const [expression, nextValues] = buildExpression(rootExpression, values);
  return { expression, values: nextValues };
};
