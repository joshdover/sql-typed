import {
  TableAttributes,
  BooleanExpression,
  Transaction,
  TableQuery,
  CompiledQuery,
  Columns,
  Table,
  MultiTableQuery,
  Predicate,
  JoinType
} from "./types";
import { compileExpressions } from "./expression_compiler";

abstract class BaseQueryImpl<TResult> {
  protected readonly predicates: ReadonlyArray<BooleanExpression>;

  public count() {
    const baseQuery = this;

    return {
      compile() {
        const baseTable = baseQuery.getBaseTable();
        const { join, joinValues } = baseQuery.compileJoin();
        const { where, whereValues } = baseQuery.compileWhere(joinValues);

        const text = ["SELECT", "count(*)", "FROM", baseTable, join, where]
          .filter(s => s.length > 0)
          .join(" ");

        return {
          text,
          values: whereValues
        };
      },

      async execute(transaction: Transaction) {
        const { rows } = await transaction.query(this.compile());
        return parseInt(rows[0].count, 10) as number;
      }
    };
  }

  public compile(): CompiledQuery {
    const columns = this.getSelectColumns();
    const baseTable = this.getBaseTable();
    const { join, joinValues } = this.compileJoin();
    const { where, whereValues } = this.compileWhere(joinValues);

    const text = ["SELECT", columns.join(", "), "FROM", baseTable, join, where]
      .filter(s => s.length > 0)
      .join(" ");

    return {
      text,
      values: whereValues
    };
  }

  public async execute(transaction: Transaction) {
    const { rows } = await transaction.query(this.compile());
    return this.transformResults(rows) as TResult[];
  }

  protected abstract getSelectColumns(): string[];
  protected abstract getBaseTable(): string;
  protected abstract transformResults(rows: any[]): TResult[];

  protected compileJoin(): { join: string; joinValues: any[] } {
    return { join: "", joinValues: [] };
  }

  private compileWhere(existingValues: any[]) {
    if (this.predicates.length) {
      const { expression, values } = compileExpressions(
        this.predicates,
        existingValues
      );
      return {
        where: `WHERE ${expression}`,
        whereValues: values
      };
    } else {
      return {
        where: "",
        whereValues: existingValues
      };
    }
  }
}

export class TableQueryImpl<T extends TableAttributes> extends BaseQueryImpl<T>
  implements TableQuery<T> {
  constructor(
    private readonly table: Table<T>,
    protected readonly predicates: ReadonlyArray<BooleanExpression> = []
  ) {
    super();
  }

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

  public join<TRight extends TableAttributes>(
    rightTable: Table<TRight>,
    matchPredicate: Predicate<[Columns<T>, Columns<TRight>]>,
    joinType: JoinType = JoinType.Inner
  ) {
    return new MultiTableQueryImpl<T, TRight>(
      this.table,
      rightTable,
      matchPredicate,
      joinType,
      this.predicates
    );
  }

  protected getBaseTable = () => this.table.tableName;
  protected getSelectColumns = () => getColumns(this.table);
  protected transformResults(rows: any[]) {
    return rows.map(remapPrefixedKeys(this.table));
  }
}

class MultiTableQueryImpl<
  TLeft extends TableAttributes,
  TRight extends TableAttributes
> extends BaseQueryImpl<[TLeft, TRight]>
  implements MultiTableQuery<TLeft, TRight> {
  constructor(
    private readonly leftTable: Table<TLeft>,
    private readonly rightTable: Table<TRight>,
    private readonly matchPredicate: Predicate<
      [Columns<TLeft>, Columns<TRight>]
    >,
    private readonly joinType: JoinType,
    protected readonly predicates: ReadonlyArray<BooleanExpression> = []
  ) {
    super();
  }

  public where(predicate?: Predicate<[Columns<TLeft>, Columns<TRight>]>) {
    if (predicate === undefined) {
      return this;
    } else if (typeof predicate === "function") {
      const resolvedPredicate = predicate([
        this.leftTable.columns,
        this.rightTable.columns
      ]);

      return new MultiTableQueryImpl<TLeft, TRight>(
        this.leftTable,
        this.rightTable,
        this.matchPredicate,
        this.joinType,
        [...this.predicates, resolvedPredicate]
      );
    } else {
      return new MultiTableQueryImpl<TLeft, TRight>(
        this.leftTable,
        this.rightTable,
        this.matchPredicate,
        this.joinType,
        [...this.predicates, predicate]
      );
    }
  }

  protected compileJoin() {
    const joinString = (() => {
      switch (this.joinType) {
        case JoinType.Inner:
          return "INNER JOIN";
        case JoinType.Left:
          return "OUTER JOIN";
        default:
          throw new Error(`Unrecognized join type: ${this.joinType}`);
      }
    })();

    const matchExpression = (() => {
      if (typeof this.matchPredicate === "function") {
        return this.matchPredicate([
          this.leftTable.columns,
          this.rightTable.columns
        ]);
      } else {
        return this.matchPredicate;
      }
    })();

    const { expression, values } = compileExpressions([matchExpression]);

    return {
      join: `${joinString} ${this.rightTable.tableName} ON ${expression}`,
      joinValues: values
    };
  }

  protected getBaseTable = () => this.leftTable.tableName;
  protected getSelectColumns = () => [
    ...getColumns(this.leftTable),
    ...getColumns(this.rightTable)
  ];

  protected transformResults(rows: any[]): Array<[TLeft, TRight]> {
    const remapLeft = remapPrefixedKeys(this.leftTable);
    const remapRight = remapPrefixedKeys(this.rightTable);
    return rows.map(row => {
      const left = remapLeft(row);
      const right = remapRight(row);
      return [left, right];
    });
  }
}

const getColumns = (table: Table<any>) =>
  Object.keys(table.columns).map(
    columnName =>
      `"${table.tableName}"."${columnName.toLowerCase()}" as "${
        table.tableName
      }_${columnName.toLowerCase()}"`
  );

const remapPrefixedKeys = <T extends TableAttributes>(table: Table<T>) => (
  row: any
): T =>
  Object.keys(table.columns)
    .map(col => col.toLowerCase())
    .reduce(
      (left, col) => ({
        ...left,
        [col]: row[`${table.tableName}_${col}`]
      }),
      {} as T
    );
