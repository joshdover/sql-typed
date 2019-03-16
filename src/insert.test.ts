import { table } from "./table";
import { column } from "./column";
import { TableAttributes, ColumnType } from "./types";

describe("insert compilation", () => {
  interface User extends TableAttributes {
    id: number;
    name: string;
  }
  const t = table<User>("users", {
    id: column({ type: ColumnType.Number }),
    name: column({ type: ColumnType.String })
  });

  it("compiles a single insert", () => {
    expect(t.insert({ id: 1, name: "Josh" }).compile()).toMatchInlineSnapshot(`
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
      t.insert([{ id: 1, name: "Josh" }, { id: 2, name: "Reina" }]).compile()
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
});
