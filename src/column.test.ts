import { StringColumnImpl, NumberColumnImpl } from "./column";
import { ColumnType } from "./types";

expect.addSnapshotSerializer({
  test(val) {
    if (typeof val !== "object") {
      return false;
    }
    const desc = Object.getOwnPropertyDescriptor(val, "not");
    return Boolean(desc && desc.get);
  },
  print(val, serialize) {
    Object.defineProperty(val, "not", { value: "[getter]" });
    return serialize(val);
  }
});

describe("NumberColumnImpl", () => {
  it("implements eqls", () => {
    const c = new NumberColumnImpl({ type: ColumnType.Number }, {} as any);
    expect(c.eqls(2)).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "not": "[getter]",
  "op": 0,
  "or": [Function],
  "value": 2,
}
`);
    expect(c.eqls(2).not).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "expression": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 0,
    "or": [Function],
    "value": 2,
  },
  "isNot": true,
  "not": "[getter]",
  "or": [Function],
}
`);
    expect(c.eqls(2).and(c.eqls(3))).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "left": Object {
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "op": 0,
    "value": 2,
  },
  "not": "[getter]",
  "op": 0,
  "or": [Function],
  "right": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 0,
    "or": [Function],
    "value": 3,
  },
  "value": 2,
}
`);
    expect(c.eqls(2).or(c.eqls(3))).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "left": Object {
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "op": 0,
    "value": 2,
  },
  "not": "[getter]",
  "op": 1,
  "or": [Function],
  "right": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 0,
    "or": [Function],
    "value": 3,
  },
  "value": 2,
}
`);
  });

  it("implements isNull", () => {
    const c = new NumberColumnImpl({ type: ColumnType.Number }, {} as any);
    expect(c.isNull()).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "not": "[getter]",
  "op": 1,
  "or": [Function],
  "value": undefined,
}
`);
    expect(c.isNull().not).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "expression": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 1,
    "or": [Function],
    "value": undefined,
  },
  "isNot": true,
  "not": "[getter]",
  "or": [Function],
}
`);
    expect(c.isNull().and(c.isNull())).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "left": Object {
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "op": 1,
    "value": undefined,
  },
  "not": "[getter]",
  "op": 0,
  "or": [Function],
  "right": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 1,
    "or": [Function],
    "value": undefined,
  },
  "value": undefined,
}
`);
    expect(c.isNull().or(c.isNull())).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "left": Object {
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "op": 1,
    "value": undefined,
  },
  "not": "[getter]",
  "op": 1,
  "or": [Function],
  "right": Object {
    "and": [Function],
    "column": NumberColumnImpl {
      "comparisonExpression": [Function],
      "config": Object {
        "type": 1,
      },
      "eqls": [Function],
      "gt": [Function],
      "gte": [Function],
      "isNull": [Function],
      "lt": [Function],
      "lte": [Function],
      "table": Object {},
    },
    "not": "[getter]",
    "op": 1,
    "or": [Function],
    "value": undefined,
  },
  "value": undefined,
}
`);
  });

  it("implements greaterThan", () => {
    const c = new NumberColumnImpl({ type: ColumnType.Number }, {} as any);
    expect(c.gt(2)).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": NumberColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 1,
    },
    "eqls": [Function],
    "gt": [Function],
    "gte": [Function],
    "isNull": [Function],
    "lt": [Function],
    "lte": [Function],
    "table": Object {},
  },
  "not": "[getter]",
  "op": 3,
  "or": [Function],
  "value": 2,
}
`);
  });
});

describe("StringColumn", () => {
  it("implements like", () => {
    const c = new StringColumnImpl({ type: ColumnType.String }, {} as any);

    expect(c.like("Josh%")).toMatchInlineSnapshot(`
Object {
  "and": [Function],
  "column": StringColumnImpl {
    "comparisonExpression": [Function],
    "config": Object {
      "type": 0,
    },
    "eqls": [Function],
    "isNull": [Function],
    "like": [Function],
    "table": Object {},
  },
  "not": "[getter]",
  "op": 2,
  "or": [Function],
  "value": "Josh%",
}
`);
  });
});
