"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
// tslint:disable no-implicit-dependencies
var Lint = require("tslint");
var ts = require("typescript");
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.applyWithProgram = function (sourceFile, program) {
        return this.applyWithFunction(sourceFile, getWalk(program.getTypeChecker()));
    };
    Rule.FAILURE_STRING = "passing never to functions is forbidden";
    return Rule;
}(Lint.Rules.TypedRule));
exports.Rule = Rule;
function getWalk(checker) {
    return function walk(ctx) {
        var sourceFile = ctx.sourceFile;
        ts.forEachChild(sourceFile, function cb(node) {
            if (ts.isCallExpression(node)) {
                node.arguments.forEach(function (arg) {
                    var type = checker.getTypeAtLocation(arg);
                    if (type.flags === ts.TypeFlags.Never) {
                        ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
                    }
                });
            }
            ts.forEachChild(node, cb);
        });
    };
}
