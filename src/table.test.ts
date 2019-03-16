import { table } from "./table";
import { column } from "./column";
import { TableAttributes, ColumnType } from "./types";

describe("table", () => {
  it("has the columns specified", () => {
    interface User extends TableAttributes {
      id: number;
      email: string;
    }

    const t = table<User>("users", {
      id: column({ type: ColumnType.Number }),
      email: column({ type: ColumnType.String })
    });

    expect(t.tableName).toEqual("users");
  });
});
