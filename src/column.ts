import {
  TableAttribute,
  Column,
  ColumnConfig,
  Expression,
  ComparisonExpression,
  NotExpression,
  Table,
  ColumnOp,
  ComposedExpression,
  ColumnExpression,
  StringColumn,
  ComposedOp,
  NumberColumn
} from "./types";

const baseExpression = <T extends TableAttribute, U extends Expression>(
  x: Partial<U> = {}
): U => {
  const thisExp = { ...x } as U;

  Object.defineProperties(thisExp, {
    and: {
      enumerable: true,
      value(otherExp: Expression): ComposedExpression {
        return baseExpression<T, ComposedExpression>({
          ...x,
          op: ComposedOp.And,
          left: x,
          right: otherExp
        });
      }
    },
    or: {
      enumerable: true,
      value(otherExp: Expression): ComposedExpression {
        return baseExpression<T, ComposedExpression>({
          ...x,
          op: ComposedOp.Or,
          left: x,
          right: otherExp
        });
      }
    },
    not: {
      configurable: true,
      enumerable: true,
      get() {
        return baseExpression<T, NotExpression>({
          isNot: (x as any).isNot ? false : true,
          expression: thisExp
        });
      }
    }
  });

  return thisExp;
};

class BaseColumnImpl<T extends TableAttribute> implements Column<T> {
  constructor(
    public readonly config: ColumnConfig<T>,
    public readonly table: Table<any>
  ) {}

  public readonly eqls = (value: T): ComparisonExpression<T> => {
    return this.comparisonExpression(ColumnOp.Equals, value);
  };

  public readonly isNull = (): ColumnExpression<T> => {
    return this.comparisonExpression(ColumnOp.IsNull);
  };

  protected comparisonExpression = (
    op: ColumnOp,
    value?: T
  ): ComparisonExpression<T> => {
    return baseExpression<T, ComparisonExpression<T>>({
      column: this,
      op,
      value
    } as Partial<ComparisonExpression<T>>);
  };
}

export class StringColumnImpl extends BaseColumnImpl<string>
  implements StringColumn {
  public readonly like = (string: string): ComparisonExpression<string> =>
    this.comparisonExpression(ColumnOp.Like, string);
}

export class NumberColumnImpl extends BaseColumnImpl<number>
  implements NumberColumn {
  public readonly lt = (number: number) =>
    this.comparisonExpression(ColumnOp.LessThan, number);
  public readonly lte = (number: number) =>
    this.comparisonExpression(ColumnOp.LessThanOrEqual, number);
  public readonly gt = (number: number) =>
    this.comparisonExpression(ColumnOp.GreaterThan, number);
  public readonly gte = (number: number) =>
    this.comparisonExpression(ColumnOp.GreaterThanOrEqual, number);
}

/**
 * Creates a column instance
 * @param config
 */
export const column = <T extends TableAttribute>(
  config: ColumnConfig<T>
): ColumnConfig<T> => config;
