import { TableAttributes, ColumnType } from "./types";
import { table } from "./table";
import { column } from "./column";

describe("update compilation", () => {
  interface User extends TableAttributes {
    id: number;
    name: string;
  }
  const t = table<User>("users", {
    id: column({ type: ColumnType.Number }),
    name: column({ type: ColumnType.String }),
    optionalLastName: column({ type: ColumnType.String, nullable: true })
  });

  it("compiles a set update", () => {
    expect(
      t
        .update()
        .set({ name: "Josh" })
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "UPDATE users SET name = $1  RETURNING *",
  "values": Array [
    "Josh",
  ],
}
`);
  });

  it("compiles a multi set update", () => {
    expect(
      t
        .update()
        .set({ id: 1, name: "Reina" })
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "UPDATE users SET id = $1, name = $2  RETURNING *",
  "values": Array [
    1,
    "Reina",
  ],
}
`);
  });

  it("compiles a multi set with where expressions", () => {
    expect(
      t
        .update()
        .set({ name: "Mia " })
        .where(t.columns.id.eqls(1))
        .compile()
    ).toMatchInlineSnapshot(`
Object {
  "text": "UPDATE users SET name = $1 WHERE id = $2 RETURNING *",
  "values": Array [
    "Mia ",
    1,
  ],
}
`);
  });
});
