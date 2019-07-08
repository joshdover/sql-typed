# SQLTyped

[![CircleCI](https://circleci.com/gh/joshdover/sql-typed.svg?style=svg)](https://circleci.com/gh/joshdover/sql-typed)

SQLTyped is a simple, typesafe SQL DSL implementation in TypeScript that aims to provide a natural
SQL interface for TypeScript applications. Goals of SQLTyped:
- **No magic.** SQLTyped is not an ORM, you need to know SQL to use SQLTyped.
- **No performance surprises.** The DSL looks like SQL and compiles down to predictable queries.
- **Best-in-class type safety.** The DSL should avoid as many invalid queries as possible.
- **As few dependencies as possible.** As of now, SQLTyped only depends on the `pg` module for querying PostgreSQL.

```
npm install sql-typed
```

SQLTyped is in active development and the API is not guaranteed to be stable.

## Basic Example

```typescript
import { createPool, createTable, TableAttributes, ColumnType } from 'sql-typed';

interface User extends TableAttributes {
  id: number;
  name: string;
}

// Type safe columns are created from the table definition.
const userTable = createTable<User>("users", {
  id: { type: ColumnType.PrimaryKey },
  name: { type: ColumnType.String },
  age: { type: ColumnType.Number, nullable: true }
});

const pool = createPool({
  host: 'localhost',
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

pool.transaction(async transaction => {
  // Create a user
  const [insertedUser] = await userTable
    .insert()
    .values([{ name: 'Josh' }])
    .execute(transaction);

  // Simple query
  const usersNamedJosh = await userTable
    .select()
    .where(userTable.columns.name.eql('Josh'))
    .execute(transaction);
  
  // Complex queries
  const millennialsNamedMia = await userTable
    .select()
    // Multiple `where` is equivalent to `and` chaining for conjunction logic
    .where(
      userTable.columns.name.like('Mia%')
    ).where(
      userTable.columns.age.gte(25).and(userTable.columns.age.lte(35))
    ).execute(
      transaction
    );

  // Count queries
  const countOver50 = await userTable
    // `where` also accepts a function to build predicates
    .where(({ age }) => age.gte(50))
    .count()
    .execute(transaction);
});
```

## Developing

To run tests:

```
docker run --rm -d -p 5432:5432 postgres
npm test
```

## Type Safety

There are some cases where TypeScript's type system cannot express a needed type (or I haven't figured out how). Known
cases:

- **Joins with 3 or more tables.** While joining two tables preserves type information, querying across 3 or more does
  not. Example:
  ```ts
  const rows = await articleTable
  .select()
  /**
   * This is typesafe. The args to the predication function are table-specific
   * and the return type of the query is table-specific.
   */
  .join(userTable, ([a, u]) => a.userId.eqls(u.id), JoinType.Left)
  /**
   * Adding a 3rd table drops down to very wide vague types. This could be
   * solved if TypesScript supported variadic types parameters.
   */
  .join(
    commentTable,
    ([a, _u, c]) => a.id.eqls(c.articleId),
    JoinType.Left
  )
  .execute(transaction);
  ```
