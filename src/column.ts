import {
  TableAttribute,
  Column,
  ColumnConfig,
  BooleanExpression,
  ComparisonExpression,
  NotExpression,
  Table,
  ColumnOp,
  OperatorExpression,
  ColumnExpression,
  StringColumn,
  ComposedOp,
  NumberColumn
} from "./types";

const baseExpression = <T extends TableAttribute, U extends BooleanExpression>(
  x: Partial<U> = {}
): U => {
  const thisExp: U = { ...x } as any;

  Object.defineProperties(thisExp, {
    and: {
      enumerable: true,
      value(otherExp: BooleanExpression): OperatorExpression {
        return baseExpression<T, OperatorExpression>({
          ...x,
          op: ComposedOp.And,
          left: x,
          right: otherExp
        });
      }
    },
    or: {
      enumerable: true,
      value(otherExp: BooleanExpression): OperatorExpression {
        return baseExpression<T, OperatorExpression>({
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
    });
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
