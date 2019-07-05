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
  [P in keyof T]: ColumnConfig<T[P]>
};

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

export type PrimaryKeyColumn = NumberColumn;

type TypedColumn<T extends TableAttribute> = T extends string
  ? StringColumn
  : T extends primaryKey
  ? PrimaryKeyColumn
  : T extends number
  ? NumberColumn
  : Column<T>;

export type Columns<T extends TableAttributes> = {
  readonly [P in keyof T]: TypedColumn<T[P]>
};

export type ColumnsValues<T extends TableAttributes> = {
  readonly [P in keyof T]?: T[P]
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
  (): Query<T, Columns<T>>;
  <C extends TableAttributes>(columns: Columns<C>): Query<C, Columns<C>>;
}

type NonPrimaryKeys<T extends TableAttributes> = {
  [P in keyof T]: T[P] extends primaryKey ? never : P
}[keyof T];
export type WithoutPrimaryKeys<T extends TableAttributes> = Pick<
  T,
  NonPrimaryKeys<T>
>;

export interface Insert<T extends TableAttributes> {
  values(objs: Array<T | WithoutPrimaryKeys<T>>): InsertValues<T>;
  from(query: Query<T, Columns<T>>): InsertFromQuery<T>;
}

export type InsertValues<T extends TableAttributes> = ExecutableQuery<T[]>;

export type InsertFromQuery<T extends TableAttributes> = ExecutableQuery<T[]>;

export interface Update<T extends TableAttributes>
  extends ExecutableQuery<T[]> {
  // TODO: support expressions in addition to static values.
  set<C extends keyof T>(valuesOrColumn: ColumnsValues<T>): Update<T>;
  where(expression: Expression): Update<T>;
}

export type CompiledQuery = QueryConfig;

export interface Query<T extends TableAttributes, C extends Columns<T>>
  extends ExecutableQuery<T[]> {
  where(condition?: Expression | ((columns: Columns<T>) => Expression)): Query<T, C>;
  count(transaction: Transaction): Promise<number>;
  groupBy: GroupByFunc;
}

export interface ExecutableQuery<T> {
  compile(): CompiledQuery;
  execute(transaction: Transaction): Promise<T>;
}

// select column_name, data_type, character_maximum_length
// from INFORMATION_SCHEMA.COLUMNS where table_name = '<name of table>';

export type TableDefinition = Array<{ columnName: string; dataType: string }>;

export type Migration = ExecutableQuery<void>;

export interface MigrationFactory {
  create(): Migration;
  update(currentSchema: TableDefinition): Migration;
}

interface GroupByFunc {
  // TODO: what's the return type??
  <C extends TableAttributes>(columns: Columns<C>): Query<any, any>;
}
