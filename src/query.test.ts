import { createTable } from "./table";
import {
  TableAttributes,
  ColumnType,
  BooleanExpression,
  Columns
} from "./types";

describe("query compilation", () => {
  interface User extends TableAttributes {
    id: number;
    name: string;
  }
  const userTable = createTable<User>("users", {
    id: { type: ColumnType.Number },
    name: { type: ColumnType.String }
  });

  const expectCompiledQuery = (
    expression?:
      | BooleanExpression
      | ((columns: Columns<User>) => BooleanExpression)
  ) =>
    expect(
      userTable
        .select()
        .where(expression)
        .compile()
    );

  it("compiles a count predicate query", () => {
    expect(
      userTable
        .select()
        .where(({ name }) => name.eqls("Josh"))
        .count()
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "SELECT count(*) FROM users WHERE \\"users\\".\\"name\\" = $1",
  "values": Array [
    "Josh",
  ],
}
`);
  });

  it("compiles a predicate-less query", () => {
    expectCompiledQuery().toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users",
  "values": Array [],
}
`);
  });

  it("compiles a single predicate query", () =>
    expectCompiledQuery(userTable.columns.name.eqls("Josh"))
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"name\\" = $1",
  "values": Array [
    "Josh",
  ],
}
`));

  it("compiles an and query", () =>
    expectCompiledQuery(
      userTable.columns.name.eqls("Josh").and(userTable.columns.id.eqls(4))
    ).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE (\\"users\\".\\"name\\" = $1) AND (\\"users\\".\\"id\\" = $2)",
  "values": Array [
    "Josh",
    4,
  ],
}
`));

  it("compiles an and query with callback", () =>
    expectCompiledQuery(({ name, id }) => name.eqls("Josh").and(id.eqls(4)))
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE (\\"users\\".\\"name\\" = $1) AND (\\"users\\".\\"id\\" = $2)",
  "values": Array [
    "Josh",
    4,
  ],
}
`));

  it("compiles is not null query", () =>
    expectCompiledQuery(userTable.columns.name.isNull().not)
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"name\\" IS NOT NULL",
  "values": Array [],
}
`));

  it("compiles a like query", () =>
    expectCompiledQuery(userTable.columns.name.like("Josh%"))
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"name\\" LIKE $1",
  "values": Array [
    "Josh%",
  ],
}
`));

  it("compiles a not like query", () =>
    expectCompiledQuery(userTable.columns.name.like("Josh%").not)
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"name\\" NOT LIKE $1",
  "values": Array [
    "Josh%",
  ],
}
`));

  it("compiles > query", () =>
    expectCompiledQuery(userTable.columns.id.gt(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"id\\" > $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles ! > query", () =>
    expectCompiledQuery(userTable.columns.id.gt(2).not).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE !(\\"users\\".\\"id\\" > $1)",
  "values": Array [
    2,
  ],
}
`));

  it("compiles >= query", () =>
    expectCompiledQuery(userTable.columns.id.gte(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"id\\" >= $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles < query", () =>
    expectCompiledQuery(userTable.columns.id.lt(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"id\\" < $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles <= query", () =>
    expectCompiledQuery(userTable.columns.id.lte(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\" FROM users WHERE \\"users\\".\\"id\\" <= $1",
  "values": Array [
    2,
  ],
}
`));

  describe("join queries", () => {
    interface Article extends TableAttributes {
      id: number;
      title: string;
      userId: number;
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
      body: { type: ColumnType.String }
    });

    it("compiles a multi join", () =>
      expect(
        articleTable
          .select()
          .join(
            userTable,
            articleTable.columns.userId.eqls(userTable.columns.id)
          )
          .join(
            commentTable,
            commentTable.columns.articleId
              .eqls(articleTable.columns.id)
              .and(commentTable.columns.userId.eqls(userTable.columns.id))
          )
          .compile()
      ).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"articles\\".\\"id\\" as \\"articles_id\\", \\"articles\\".\\"userid\\" as \\"articles_userid\\", \\"articles\\".\\"title\\" as \\"articles_title\\", \\"users\\".\\"id\\" as \\"users_id\\", \\"users\\".\\"name\\" as \\"users_name\\", \\"comments\\".\\"id\\" as \\"comments_id\\", \\"comments\\".\\"userid\\" as \\"comments_userid\\", \\"comments\\".\\"articleid\\" as \\"comments_articleid\\", \\"comments\\".\\"body\\" as \\"comments_body\\" FROM articles INNER JOIN users ON \\"articles\\".\\"userid\\" = \\"users\\".\\"id\\" INNER JOIN comments ON (\\"comments\\".\\"articleid\\" = \\"articles\\".\\"id\\") AND (\\"comments\\".\\"userid\\" = \\"users\\".\\"id\\")",
  "values": Array [],
}
`));
  });
});
