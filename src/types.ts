import {
  Pool as PGPool,
  PoolClient as PGPoolClient,
  PoolConfig as PGPoolConfig,
  QueryConfig
} from "pg";

export type PoolConfig = PGPoolConfig;

export interface Pool {
  connect: PGPool['connect'],
  transaction<T>(cb: (transaction: Transaction) => Promise<T>): Promise<T | void>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query: PGPoolClient["query"];
  nested<T>(cb: (transaction: Transaction) => Promise<T>): Promise<T>;
}

export type TableAttribute = string | number;
export type TableAttributes = { [columnName: string]: TableAttribute };

export interface Expression {
  and(condition: Expression): ComposedExpression;
  or(condition: Expression): ComposedExpression;
  not: NotExpression;
}

export interface NotExpression extends Expression {
  isNot: boolean;
  expression: Expression;
}

export interface ComposedExpression extends Expression {
  left: Expression;
  right: Expression;
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

export interface ColumnExpression<T extends TableAttribute> extends Expression {
  column: Column<T>;
  op: ColumnOp;
}

export interface ComparisonExpression<T extends TableAttribute>
  extends ColumnExpression<T> {
  value: T;
}

export enum ColumnType {
  String,
  Number
}

export interface ColumnConfig<T extends TableAttribute> {
  readonly type: ColumnType;
  readonly nullable?: boolean;
}

export interface Column<T extends TableAttribute> {
  config: ColumnConfig<T>;
  eqls(value: T): ComparisonExpression<T>;
  isNull(): ColumnExpression<T>;
  table: Table<any>;
}

export interface StringColumn extends Column<string> {
  like(string: string): ComparisonExpression<string>;
}

export interface NumberColumn extends Column<number> {
  lt(number: number): ComparisonExpression<number>;
  lte(number: number): ComparisonExpression<number>;
  gt(number: number): ComparisonExpression<number>;
  gte(number: number): ComparisonExpression<number>;
}

type TypedColumn<T extends TableAttribute> =
  T extends string ? StringColumn :
  T extends number ? NumberColumn
  : Column<T>;

export type Columns<T extends TableAttributes> = {
  readonly [P in keyof T]: TypedColumn<T[P]>
};

export interface Table<T extends TableAttributes> {
  readonly tableName: string;
  readonly columns: Columns<T>;
  select: SelectFunc<T>;
  insert: InsertFunc<T>;
}

interface SelectFunc<T extends TableAttributes> {
  (): Query<T, Columns<T>>;
  <C extends TableAttributes>(columns: Columns<C>): Query<C, Columns<C>>;
}

interface InsertFunc<T extends TableAttributes> {
  (obj: T[]): Insert<T[]>;
  (obj: T): Insert<T>;
}

export interface Insert<T> {
  compile(): CompiledQuery;
  execute(transaction: Transaction): Promise<T>;
}

export type CompiledQuery = QueryConfig;

export interface Query<T extends TableAttributes, C extends Columns<T>> {
  where(condition?: Expression): Query<T, C>;
  count(transaction: Transaction): Promise<number>;
  groupBy: GroupByFunc;
  compile(): CompiledQuery;
  execute(transaction: Transaction): Promise<T[]>;
}

interface GroupByFunc {
  // TODO: what's the return type??
  <C extends TableAttributes>(columns: Columns<C>): Query<any, any>;
}
