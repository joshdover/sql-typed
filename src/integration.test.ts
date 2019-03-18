import { TableAttributes, ColumnType, Transaction } from "./types";
import { table } from "./table";
import { column } from "./column";
import { createPool } from "./pool";

describe("TypedSQL", () => {
  interface User extends TableAttributes {
    id: number;
    name: string;
  }
  const userTable = table<User>("users", {
    id: column({ type: ColumnType.Number }),
    name: column({ type: ColumnType.String })
  });

  const pool = createPool({
    host: "localhost",
    user: "postgres",
    password: "postgres",
    database: "postgres"
  });

  // Create tables
  beforeAll(async () => {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users(
        id int primary key,
        name varchar(256) not null
      );
    `);
    return client.release();
  });

  /**
   * The simplest of test harnesses that rolls back any changes to the database.
   * @param testFunc
   */
  const withTransaction = (
    testFunc: (transaction: Transaction) => Promise<any>
  ) => async () => {
    await pool.transaction(async transaction => {
      await transaction.nested(testFunc);

      // Undo any changes by the test
      await transaction.rollback();
    });
  };

  it(
    "can insert data",
    withTransaction(async transaction => {
      const user = { id: 1, name: "Josh" };

      const [insertedUser] = await userTable
        .insert()
        .values([user])
        .execute(transaction);
      expect(insertedUser).toEqual(user);

      const [queriedUser] = await userTable
        .select()
        .where(userTable.columns.id.eqls(1))
        .execute(transaction);
      expect(queriedUser).toEqual(user);
    })
  );

  it(
    "can update data",
    withTransaction(async transaction => {
      const user = { id: 1, name: "Josh" };

      await userTable
        .insert()
        .values([user])
        .execute(transaction);
      const [updatedUser] = await userTable
        .update()
        .set({ name: "Dover" })
        .execute(transaction);
      expect(updatedUser).toEqual({ id: 1, name: "Dover" });

      const [queriedUser] = await userTable
        .select()
        .where(userTable.columns.id.eqls(1))
        .execute(transaction);
      expect(queriedUser).toEqual({ id: 1, name: "Dover" });
    })
  );
});
