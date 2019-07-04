import { createTable } from "./table";
import { TableAttributes, ColumnType, primaryKey } from "./types";

describe("insert compilation", () => {
  interface User extends TableAttributes {
    id: primaryKey;
    name: string;
    nickname: string | null;
  }
  const t = createTable<User>("users", {
    id: { type: ColumnType.PrimaryKey },
    name: { type: ColumnType.String },
    nickname: { type: ColumnType.String, nullable: true }
  });

  it("allows not defining primary keys", () => {
    expect(
      t
        .insert()
        .values([{ name: "Josh" }])
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "INSERT INTO users(name) VALUES ($1) RETURNING *",
  "values": Array [
    "Josh",
  ],
}
`);
  });

  it("allows defining primary keys", () => {
    expect(
      t
        .insert()
        .values([{ id: 1, name: "Josh" }])
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "INSERT INTO users(id, name) VALUES ($1, $2) RETURNING *",
  "values": Array [
    1,
    "Josh",
  ],
}
`);
  });

  it("compiles a multi insert", () => {
    expect(
      t
        .insert()
        .values([{ id: 1, name: "Josh" }, { id: 2, name: "Reina" }])
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "INSERT INTO users(id, name) VALUES ($1, $2), ($3, $4) RETURNING *",
  "values": Array [
    1,
    "Josh",
    2,
    "Reina",
  ],
}
`);
  });

  it("supports nullable fields", () => {
    expect(
      t
        .insert()
        .values([
          { id: 1, name: "Josh" },
          { id: 2, name: "Mia", nickname: "Click clack" }
        ])
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "INSERT INTO users(id, name, nickname) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING *",
  "values": Array [
    1,
    "Josh",
    null,
    2,
    "Mia",
    "Click clack",
  ],
}
`);
  });
});
