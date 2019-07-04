import { TableAttributes, ColumnType } from "./types";
import { createTable } from "./table";

describe("update compilation", () => {
  interface User extends TableAttributes {
    id: number;
    name: string;
  }
  const t = createTable<User>("users", {
    id: { type: ColumnType.Number },
    name: { type: ColumnType.String },
    optionalLastName: { type: ColumnType.String, nullable: true }
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
