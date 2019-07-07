import { TableAttributes, ColumnType, Transaction, primaryKey } from "./types";
import { createTable } from "./table";
import { createPool } from "./pool";

describe("TypedSQL", () => {
  interface User extends TableAttributes {
    id: primaryKey;
    name: string;
  }
  const userTable = createTable<User>("users", {
    id: { type: ColumnType.PrimaryKey },
    name: { type: ColumnType.String }
  });

  interface Article extends TableAttributes {
    id: primaryKey;
    userId: number;
    title: string;
  }
  const articleTable = createTable<Article>("articles", {
    id: { type: ColumnType.PrimaryKey },
    userId: { type: ColumnType.Number },
    title: { type: ColumnType.String }
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
        id serial,
        name varchar(256) not null
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles(
        id serial,
        userId bigint not null,
        title varchar(256) not null
      );
    `);
    client.release();
  });

  afterAll(async () => {
    const client = await pool.connect();
    await client.query(`
      DROP TABLE IF EXISTS users;
    `);
    await client.query(`
      DROP TABLE IF EXISTS articles;
    `);
    client.release();
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
    "can insert data with primary keys",
    withTransaction(async transaction => {
      const user = { name: "John" };

      const [insertedUser] = await userTable
        .insert()
        .values([user])
        .execute(transaction);
      // Postgres assigns an id
      expect(insertedUser.id).toBeGreaterThan(0);
      expect(insertedUser.name).toEqual("John");

      const [queriedUser] = await userTable
        .select()
        .where(userTable.columns.id.eqls(1))
        .execute(transaction);
      expect(queriedUser.id).toEqual(insertedUser.id);
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

  it(
    "can count data",
    withTransaction(async transaction => {
      await userTable
        .insert()
        .values([{ name: "John" }, { name: "Sarah" }])
        .execute(transaction);

      const count = await userTable
        .select()
        .where(({ name }) => name.eqls("John"))
        .count()
        .execute(transaction);
      expect(count).toEqual(1);
    })
  );

  it(
    "can join tables",
    withTransaction(async transaction => {
      const [john] = await userTable
        .insert()
        .values([{ name: "John" }])
        .execute(transaction);
      const [article1, article2] = await articleTable
        .insert()
        .values([
          { userId: john.id, title: "How to write SQL" },
          { userId: john.id, title: "How to get better at TypeScript" }
        ])
        .execute(transaction);

      const [joinedRow1, joinedRow2] = await articleTable
        .select()
        .join(userTable, ([a, u]) => a.userId.eqls(u.id))
        .execute(transaction);

      const [foundArticle1, foundUser1] = joinedRow1;
      expect(foundArticle1).toEqual(article1);
      expect(foundUser1).toEqual(john);

      const [foundArticle2, foundUser2] = joinedRow2;
      expect(foundArticle2).toEqual(article2);
      expect(foundUser2).toEqual(john);
    })
  );
});
