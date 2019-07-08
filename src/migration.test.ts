import { createTable } from "./table";
import { TableAttributes, ColumnType, primaryKey } from "./types";

describe("migration compilation", () => {
  interface User extends TableAttributes {
    id: primaryKey;
    firstName: string;
    lastName: string;
    nickname: string | null;
    age: number;
  }
  const t = createTable<User>("users", {
    id: { type: ColumnType.PrimaryKey },
    firstName: { type: ColumnType.String },
    lastName: { type: ColumnType.String, databaseType: "text" },
    nickname: { type: ColumnType.String, nullable: true },
    age: { type: ColumnType.Number, options: "DEFAULT 0" }
  });

  it("compiles a create", () => {
    expect(
      t
        .migrate()
        .create()
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "CREATE TABLE users \\"users\\".\\"id\\" serial, \\"users\\".\\"firstname\\" varchar(256), \\"users\\".\\"lastname\\" text, \\"users\\".\\"nickname\\" varchar(256) NOT NULL, \\"users\\".\\"age\\" bigint DEFAULT 0",
}
`);
  });

  it("compiles an update", () => {
    expect(
      t
        .migrate()
        .update([{ columnName: "firstName", dataType: "varchar(256)" }])
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "ALTER TABLE users ADD COLUMN \\"users\\".\\"id\\" serial, ADD COLUMN \\"users\\".\\"lastname\\" text, ADD COLUMN \\"users\\".\\"nickname\\" varchar(256) NOT NULL, ADD COLUMN \\"users\\".\\"age\\" bigint DEFAULT 0",
}
`);
  });
});
