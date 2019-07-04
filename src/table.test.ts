import { createTable } from "./table";
import { TableAttributes, ColumnType, primaryKey } from "./types";

describe("table", () => {
  it("has the columns specified", () => {
    interface User extends TableAttributes {
      id: primaryKey;
      email: string;
    }

    const t = createTable<User>("users", {
      id: { type: ColumnType.PrimaryKey },
      email: { type: ColumnType.String }
    });

    expect(t.tableName).toEqual("users");
  });
});
