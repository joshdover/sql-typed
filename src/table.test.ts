import { table } from "./table";
import { column } from "./column";
import { TableAttributes, ColumnType, primaryKey } from "./types";

describe("table", () => {
  it("has the columns specified", () => {
    interface User extends TableAttributes {
      id: primaryKey;
      email: string;
    }

    const t = table<User>("users", {
      id: column({ type: ColumnType.PrimaryKey }),
      email: column({ type: ColumnType.String })
    });

    expect(t.tableName).toEqual("users");
  });
});
