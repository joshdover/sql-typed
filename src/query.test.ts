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
  const t = createTable<User>("users", {
    id: { type: ColumnType.Number },
    name: { type: ColumnType.String }
  });

  const expectCompiledQuery = (
    expression?:
      | BooleanExpression
      | ((columns: Columns<User>) => BooleanExpression)
  ) =>
    expect(
      t
        .select()
        .where(expression)
        .compile()
    );

  it("compiles a count predicate query", () => {
    expect(
      t
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
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users",
  "values": Array [],
}
`);
  });

  it("compiles a single predicate query", () =>
    expectCompiledQuery(t.columns.name.eqls("Josh")).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"name\\" = $1",
  "values": Array [
    "Josh",
  ],
}
`));

  it("compiles an and query", () =>
    expectCompiledQuery(t.columns.name.eqls("Josh").and(t.columns.id.eqls(4)))
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE (\\"users\\".\\"name\\" = $1) AND (\\"users\\".\\"id\\" = $2)",
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
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE (\\"users\\".\\"name\\" = $1) AND (\\"users\\".\\"id\\" = $2)",
  "values": Array [
    "Josh",
    4,
  ],
}
`));

  it("compiles is not null query", () =>
    expectCompiledQuery(t.columns.name.isNull().not).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"name\\" IS NOT NULL",
  "values": Array [],
}
`));

  it("compiles a like query", () =>
    expectCompiledQuery(t.columns.name.like("Josh%")).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"name\\" LIKE $1",
  "values": Array [
    "Josh%",
  ],
}
`));

  it("compiles a not like query", () =>
    expectCompiledQuery(t.columns.name.like("Josh%").not)
      .toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"name\\" NOT LIKE $1",
  "values": Array [
    "Josh%",
  ],
}
`));

  it("compiles > query", () =>
    expectCompiledQuery(t.columns.id.gt(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"id\\" > $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles ! > query", () =>
    expectCompiledQuery(t.columns.id.gt(2).not).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE !(\\"users\\".\\"id\\" > $1)",
  "values": Array [
    2,
  ],
}
`));

  it("compiles >= query", () =>
    expectCompiledQuery(t.columns.id.gte(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"id\\" >= $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles < query", () =>
    expectCompiledQuery(t.columns.id.lt(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"id\\" < $1",
  "values": Array [
    2,
  ],
}
`));

  it("compiles <= query", () =>
    expectCompiledQuery(t.columns.id.lte(2)).toMatchInlineSnapshot(`
Object {
  "text": "SELECT \\"users\\".\\"id\\", \\"users\\".\\"name\\" FROM users WHERE \\"users\\".\\"id\\" <= $1",
  "values": Array [
    2,
  ],
}
`));
});
