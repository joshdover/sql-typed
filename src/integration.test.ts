import {
  TableAttributes,
  ColumnType,
  Transaction,
  primaryKey,
  JoinType
} from "./types";
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

  interface Comment extends TableAttributes {
    id: number;
    userId: number;
    articleId: number;
    body: string;
  }
  const commentTable = createTable<Comment>("comments", {
    id: { type: ColumnType.PrimaryKey },
    userId: { type: ColumnType.Number },
    articleId: { type: ColumnType.Number },
    body: { type: ColumnType.String, databaseType: "text" }
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments(
        id serial,
        userId bigint not null,
        articleId bigint not null,
        body text not null
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

  it(
    "can join multiple tables",
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

      const [comment1, comment2] = await commentTable
        .insert()
        .values([
          {
            articleId: article1.id,
            userId: john.id,
            body: "This SQL article is great!"
          },
          {
            articleId: article2.id,
            userId: john.id,
            body: "Thanks for teaching TypeScript!"
          }
        ])
        .execute(transaction);

      const rows = await articleTable
        .select()
        .join(userTable, ([a, u]) => a.userId.eqls(u.id), JoinType.Left)
        .join(
          commentTable,
          ([a, _u, c]) => a.id.eqls(c.articleId),
          JoinType.Left
        )
        .execute(transaction);

      expect(rows[0]).toEqual([article1, john, comment1]);
      expect(rows[1]).toEqual([article2, john, comment2]);
    })
  );
});
