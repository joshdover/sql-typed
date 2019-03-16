# TypedSQL

This repo is a work in progress.

TypedSQL is a simple, typesafe SQL DSL implementation in TypeScript that aims to provide a natural
SQL interface for TypeScript applications. Goals of TypedSQL:
- **No magic.** TypedSQL is not an ORM, you need to know SQL to use TypedSQL.
- **No performance surprises.** The DSL looks like SQL and compiles down to predictable queries.
- **Full type safety.** The DSL should never allow invalid queries.
- **As few dependencies as possible.** As of now, TypedSQL only depends on the `pg` module for querying PostgreSQL.

## Basic Example

```typescript
import { createPool, table, column, TableAttributes, ColumnType } from 'typed-sql';

interface User extends TableAttributes {
  id: number;
  name: string;
}
const userTable = table<User>("users", {
  id: column({ type: ColumnType.Number }),
  name: column({ type: ColumnType.String }),
  age: column({ type: ColumnType.Number })
});

const pool = createPool({
  host: 'localhost',
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

pool.transaction(async transaction => {
  // Create a user
  const insertedUser = await userTable.insert(user).execute({ id: 1, name: 'Josh' });

  // Simple query
  const usersNamedJosh = await userTable
    .select()
    .where(userTable.columns.name.eql('Josh'))
    .execute(transaction);
  
  // Complex queries
  const millennialsNamedMia = await userTable
    .select()
    // Use `where` calls or `and` chaining for conjunction logic
    .where(
      userTable.columns.name.like('Mia%')
    ).where(
      userTable.columns.age.gte(25).and(userTable.columns.age.lte(35))
    ).execute(
      transaction
    );
});
```

## Developing

To run integration tests:

```
docker run --rm -p 5432:5432 postgres
jest
```
