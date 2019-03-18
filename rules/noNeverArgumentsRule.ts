// tslint:disable no-implicit-dependencies
import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.TypedRule {
  public static FAILURE_STRING = "passing never to functions is forbidden";

  public applyWithProgram(
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): Lint.RuleFailure[] {
    return this.applyWithFunction(
      sourceFile,
      getWalk(program.getTypeChecker())
    );
  }
}

function getWalk(checker: ts.TypeChecker) {
  return function walk(ctx: Lint.WalkContext<any>): void {
    const { sourceFile } = ctx;
    ts.forEachChild(sourceFile, function cb(node): void {
      if (ts.isCallExpression(node)) {
        node.arguments.forEach(arg => {
          const type = checker.getTypeAtLocation(arg);
          if (type.flags === ts.TypeFlags.Never) {
            ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
          }
        });
      }

      ts.forEachChild(node, cb);
    });
  };
}
