import {
  Pool as PGPool,
  PoolClient as PGPoolClient,
  PoolConfig as PGPoolConfig,
  QueryConfig
} from "pg";

export type PoolConfig = PGPoolConfig;

export interface Pool {
  connect: PGPool["connect"];
  transaction<T>(
    cb: (transaction: Transaction) => Promise<T>
  ): Promise<T | void>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query: PGPoolClient["query"];
  nested<T>(cb: (transaction: Transaction) => Promise<T>): Promise<T>;
}

export type primaryKey = number;
export type TableAttribute = string | number | primaryKey | null;
export interface TableAttributes {
  [columnName: string]: TableAttribute;
}

export interface BooleanExpression {
  and(expression: BooleanExpression): OperatorExpression;
  or(expression: BooleanExpression): OperatorExpression;
  not: NotExpression;
}

export interface NotExpression extends BooleanExpression {
  isNot: boolean;
  expression: BooleanExpression;
}

export interface OperatorExpression extends BooleanExpression {
  left: BooleanExpression;
  right: BooleanExpression;
  op: ComposedOp;
}

export enum ComposedOp {
  And,
  Or
}

export enum ColumnOp {
  Equals,
  IsNull,
  Like,
  GreaterThan,
  GreaterThanOrEqual,
  LessThan,
  LessThanOrEqual
}

export interface ColumnExpression<T extends TableAttribute>
  extends BooleanExpression {
  column: Column<T>;
  op: ColumnOp;
}

export interface ComparisonExpression<T extends TableAttribute>
  extends ColumnExpression<T> {
  value: T;
}

export enum ColumnType {
  String = 0,
  Number = 1,
  PrimaryKey = 2
}

export interface ColumnConfig<T extends TableAttribute> {
  readonly type: ColumnType;
  readonly nullable?: boolean;
  readonly options?: string;
  readonly databaseType?: string;
}

export type ColumnConfigs<T extends TableAttributes> = {
  [P in keyof T]: ColumnConfig<T[P]>;
};

export interface Column<T extends TableAttribute> {
  config: ColumnConfig<T>;
  eqls(value: T | Column<T>): ComparisonExpression<T>;
  isNull(): ColumnExpression<T>;
  table: Table<any>;
}

export interface StringColumn extends Column<string> {
  like(string: string | Column<string>): ComparisonExpression<string>;
}

export interface NumberColumn extends Column<number> {
  lt(number: number | Column<number>): ComparisonExpression<number>;
  lte(number: number | Column<number>): ComparisonExpression<number>;
  gt(number: number | Column<number>): ComparisonExpression<number>;
  gte(number: number | Column<number>): ComparisonExpression<number>;
}

export type PrimaryKeyColumn = NumberColumn;

type TypedColumn<T extends TableAttribute> = T extends string
  ? StringColumn
  : T extends primaryKey
  ? PrimaryKeyColumn
  : T extends number
  ? NumberColumn
  : Column<T>;

export type Columns<T extends TableAttributes> = {
  readonly [P in keyof T]: TypedColumn<T[P]>;
};

export type ColumnsValues<T extends TableAttributes> = {
  readonly [P in keyof T]?: T[P];
};

export interface Table<T extends TableAttributes> {
  readonly tableName: string;
  readonly columns: Columns<T>;
  readonly columnConfigs: ColumnConfigs<T>;
  select: SelectFunc<T>;
  insert(): Insert<T>;
  update(): Update<T>;
  migrate(): MigrationFactory;
  definition(transaction: Transaction): Promise<TableDefinition>;
}

interface SelectFunc<T extends TableAttributes> {
  (): TableQuery<T>;
  <C extends TableAttributes>(columns: Columns<C>): TableQuery<C>;
}

type NonPrimaryKeys<T extends TableAttributes> = {
  [P in keyof T]: T[P] extends primaryKey ? never : P;
}[keyof T];
export type WithoutPrimaryKeys<T extends TableAttributes> = Pick<
  T,
  NonPrimaryKeys<T>
>;

export interface Insert<T extends TableAttributes> {
  values(objs: (T | WithoutPrimaryKeys<T>)[]): InsertValues<T>;
  from(query: TableQuery<T>): InsertFromQuery<T>;
}

export type InsertValues<T extends TableAttributes> = ExecutableQuery<T[]>;

export type InsertFromQuery<T extends TableAttributes> = ExecutableQuery<T[]>;

export interface Update<T extends TableAttributes>
  extends ExecutableQuery<T[]> {
  // TODO: support expressions in addition to static values.
  set<C extends keyof T>(valuesOrColumn: ColumnsValues<T>): Update<T>;
  where(expression: BooleanExpression): Update<T>;
}

export type CompiledQuery = QueryConfig;

export type Predicate<T> =
  | BooleanExpression
  | ((columns: T) => BooleanExpression);

export interface TableQuery<T extends TableAttributes>
  extends ExecutableQuery<T[]> {
  where(predicate?: Predicate<Columns<T>>): TableQuery<T>;
  count(): ExecutableQuery<number>;
  join<TRight extends TableAttributes>(
    table: Table<TRight>,
    matchPredicate: Predicate<[Columns<T>, Columns<TRight>]>,
    joinType?: JoinType
  ): DoubleTableQuery<T, TRight>;
}

export enum JoinType {
  Inner = 0,
  Left = 1
}

export interface DoubleTableQuery<
  TLeft extends TableAttributes,
  TRight extends TableAttributes
> extends ExecutableQuery<Array<[TLeft, TRight]>> {
  count(): ExecutableQuery<number>;
  where(
    predicate?: Predicate<[Columns<TLeft>, Columns<TRight>]>
  ): DoubleTableQuery<TLeft, TRight>;

  /**
   * Joins an additional table.
   *
   * @remarks
   * This method loses some type information.
   */
  join<TNextRight extends TableAttributes>(
    table: Table<TNextRight>,
    matchPredicate: Predicate<Array<Columns<any>>>,
    joinType?: JoinType
  ): MultiTableQuery;
}

export interface MultiTableQuery extends ExecutableQuery<TableAttributes[][]> {
  count(): ExecutableQuery<number>;
  where(predicate?: Predicate<Array<Columns<any>>>): MultiTableQuery;
  join(
    table: Table<any>,
    matchPredicate: Predicate<Array<Columns<any>>>,
    joinType?: JoinType
  ): MultiTableQuery;
}

export interface ExecutableQuery<T> {
  compile(): CompiledQuery;
  execute(transaction: Transaction): Promise<T>;
}

export type TableDefinition = { columnName: string; dataType: string }[];

export type Migration = ExecutableQuery<void>;

export interface MigrationFactory {
  create(): Migration;
  update(currentSchema: TableDefinition): Migration;
}
