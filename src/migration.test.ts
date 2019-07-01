import { table } from "./table";
import { column } from "./column";
import { TableAttributes, ColumnType, primaryKey } from "./types";

describe("migration compilation", () => {
  interface User extends TableAttributes {
    id: primaryKey;
    firstName: string;
    lastName: string;
    nickname: string | null;
    age: number;
  }
  const t = table<User>("users", {
    id: column({ type: ColumnType.PrimaryKey }),
    firstName: column({ type: ColumnType.String }),
    lastName: column({ type: ColumnType.String, databaseType: "text" }),
    nickname: column({ type: ColumnType.String, nullable: true }),
    age: column({ type: ColumnType.Number, options: "DEFAULT 0" })
  });

  it("compiles a create", () => {
    expect(t.migrate().compile()).toMatchInlineSnapshot(`
Object {
  "text": "CREATE TABLE users (
  id serial, firstName varchar(256), lastName text, nickname varchar(256) NOT NULL, age bigint DEFAULT 0
)",
}
`);
  });
});
