import {
  TableAttributes,
  BooleanExpression,
  Transaction,
  TableQuery,
  CompiledQuery,
  Columns,
  Table,
  DoubleTableQuery,
  Predicate,
  JoinType,
  MultiTableQuery
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
    }
    const resolvedPredicate =
      typeof predicate === "function"
        ? predicate(this.table.columns)
        : predicate;

    return new TableQueryImpl<T>(this.table, [
      ...this.predicates,
      resolvedPredicate
    ]);
  }

  public join<TRight extends TableAttributes>(
    rightTable: Table<TRight>,
    matchPredicate: Predicate<[Columns<T>, Columns<TRight>]>,
    joinType: JoinType = JoinType.Inner
  ) {
    return new DoubleTableQueryImpl<T, TRight>(
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

class DoubleTableQueryImpl<
  TLeft extends TableAttributes,
  TRight extends TableAttributes
> extends BaseQueryImpl<[TLeft, TRight]>
  implements DoubleTableQuery<TLeft, TRight> {
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
    }
    const resolvedPredicate =
      typeof predicate === "function"
        ? predicate([this.leftTable.columns, this.rightTable.columns])
        : predicate;

    return new DoubleTableQueryImpl<TLeft, TRight>(
      this.leftTable,
      this.rightTable,
      this.matchPredicate,
      this.joinType,
      [...this.predicates, resolvedPredicate]
    );
  }

  public join(
    table: Table<any>,
    matchPredicate: Predicate<Array<Columns<any>>>,
    joinType: JoinType = JoinType.Inner
  ) {
    return new MultiTableQueryImpl(
      this.leftTable,
      [
        {
          table: this.rightTable,
          matchPredicate: this.matchPredicate as Predicate<Array<Columns<any>>>,
          joinType: this.joinType
        },
        { table, matchPredicate, joinType }
      ],
      this.predicates
    );
  }

  protected compileJoin() {
    return compileJoin(
      {
        table: this.rightTable,
        joinType: this.joinType,
        matchPredicate: this.matchPredicate as Predicate<Array<Columns<any>>>
      },
      [this.leftTable.columns, this.rightTable.columns]
    );
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

class MultiTableQueryImpl extends BaseQueryImpl<TableAttributes[]>
  implements MultiTableQuery {
  constructor(
    private readonly leftTable: Table<any>,
    private readonly joins: Array<Join>,
    protected readonly predicates: ReadonlyArray<BooleanExpression>
  ) {
    super();
  }

  public where(predicate?: Predicate<Array<Columns<any>>>): MultiTableQuery {
    if (predicate === undefined) {
      return this;
    }

    const resolvedPredicate =
      typeof predicate === "function"
        ? predicate([
            this.leftTable.columns,
            ...this.joins.map(j => j.table.columns)
          ])
        : predicate;

    return new MultiTableQueryImpl(this.leftTable, this.joins, [
      ...this.predicates,
      resolvedPredicate
    ]);
  }

  public join(
    table: Table<any>,
    matchPredicate: Predicate<Array<Columns<any>>>,
    joinType: JoinType = JoinType.Inner
  ): MultiTableQuery {
    return new MultiTableQueryImpl(
      this.leftTable,
      [...this.joins, { table, matchPredicate, joinType }],
      this.predicates
    );
  }

  protected compileJoin() {
    const columns = [
      this.leftTable.columns,
      ...this.joins.map(j => j.table.columns)
    ];
    return this.joins.reduce(
      ({ join, joinValues }, nextJoin) =>
        compileJoin(nextJoin, columns, { join, joinValues }),
      { join: "", joinValues: [] as any[] }
    );
  }

  protected getBaseTable = () => this.leftTable.tableName;
  protected getSelectColumns = () => [
    ...getColumns(this.leftTable),
    ...flatMap(this.joins, j => getColumns(j.table))
  ];

  protected transformResults(rows: TableAttributes[]) {
    const remapLeft = remapPrefixedKeys(this.leftTable);
    const remapJoins = this.joins.map(j => remapPrefixedKeys(j.table));
    return rows.map(row => [
      remapLeft(row),
      ...remapJoins.map(remap => remap(row))
    ]);
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

interface Join {
  table: Table<any>;
  matchPredicate: Predicate<Array<Columns<any>>>;
  joinType: JoinType;
}

const compileJoin = (
  { table, matchPredicate, joinType }: Join,
  columns: Array<Columns<any>>,
  existingJoin: { join: string; joinValues: any[] } = {
    join: "",
    joinValues: []
  }
) => {
  const joinString = (() => {
    switch (joinType) {
      case JoinType.Inner:
        return "INNER JOIN";
      case JoinType.Left:
        return "LEFT JOIN";
      default:
        throw new Error(`Unrecognized join type: ${joinType}`);
    }
  })();

  const matchExpression = (() => {
    if (typeof matchPredicate === "function") {
      return matchPredicate(columns);
    } else {
      return matchPredicate;
    }
  })();

  const { expression, values } = compileExpressions(
    [matchExpression],
    existingJoin.joinValues
  );

  return {
    join: [existingJoin.join, joinString, table.tableName, "ON", expression]
      .filter(s => s.length > 0)
      .join(" "),
    joinValues: values
  };
};

const flatMap = <T, U>(
  values: T[],
  callbackFn: (value: T, index: number, array: T[]) => U[]
): U[] => values.map(callbackFn).reduce((acc, item) => acc.concat(item), []);
