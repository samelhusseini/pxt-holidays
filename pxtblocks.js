var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
///<reference path='../localtypings/pxtblockly.d.ts'/>
/// <reference path="../built/pxtlib.d.ts" />
///////////////////////////////////////////////////////////////////////////////
//                A compiler from Blocky to TouchDevelop                     //
///////////////////////////////////////////////////////////////////////////////
var B = Blockly;
var iface;
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        function workerOpAsync(op, arg) {
            return pxt.worker.getWorker(pxt.webConfig.workerjs).opAsync(op, arg);
        }
        blocks.workerOpAsync = workerOpAsync;
        var placeholders = {};
        var MAX_COMMENT_LINE_LENGTH = 50;
        ///////////////////////////////////////////////////////////////////////////////
        // Miscellaneous utility functions
        ///////////////////////////////////////////////////////////////////////////////
        // Mutate [a1] in place and append to it the elements from [a2].
        function append(a1, a2) {
            a1.push.apply(a1, a2);
        }
        // A few wrappers for basic Block operations that throw errors when compilation
        // is not possible. (The outer code catches these and highlights the relevant
        // block.)
        // Internal error (in our code). Compilation shouldn't proceed.
        function assert(x) {
            if (!x)
                throw new Error("Assertion failure");
        }
        function throwBlockError(msg, block) {
            var e = new Error(msg);
            e.block = block;
            throw e;
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Types
        //
        // We slap a very simple type system on top of Blockly. This is needed to ensure
        // we generate valid TouchDevelop code (otherwise compilation from TD to C++
        // would not work).
        ///////////////////////////////////////////////////////////////////////////////
        // There are several layers of abstraction for the type system.
        // - Block are annotated with a string return type, and a string type for their
        //   input blocks (see blocks-custom.js). We use that as the reference semantics
        //   for the blocks.
        // - In this "type system", we use the enum Type. Using an enum rules out more
        //   mistakes.
        // - When emitting code, we target the "TouchDevelop types".
        //
        // Type inference / checking is done as follows. First, we try to assign a type
        // to all variables. We do this by examining all variable assignments and
        // figuring out the type from the right-hand side. There's a fixpoint computation
        // (see [mkEnv]). Then, we propagate down the expected type when doing code
        // generation; when generating code for a variable dereference, if the expected
        // type doesn't match the inferred type, it's an error. If the type was
        // undetermined as of yet, the type of the variable becomes the expected type.
        var Point = /** @class */ (function () {
            function Point(link, type, parentType, childType) {
                this.link = link;
                this.type = type;
                this.parentType = parentType;
                this.childType = childType;
            }
            return Point;
        }());
        blocks.Point = Point;
        function find(p) {
            if (p.link)
                return find(p.link);
            return p;
        }
        function union(p1, p2) {
            var _p1 = find(p1);
            var _p2 = find(p2);
            assert(_p1.link == null && _p2.link == null);
            if (_p1 == _p2)
                return;
            if (_p1.childType && _p2.childType) {
                var ct = _p1.childType;
                _p1.childType = null;
                union(ct, _p2.childType);
            }
            else if (_p1.childType && !_p2.childType) {
                _p2.childType = _p1.childType;
            }
            if (_p1.parentType && _p2.parentType) {
                var pt = _p1.parentType;
                _p1.parentType = null;
                union(pt, _p2.parentType);
            }
            else if (_p1.parentType && !_p2.parentType) {
                _p2.parentType = _p1.parentType;
            }
            var t = unify(_p1.type, _p2.type);
            p1.link = _p2;
            _p1.link = _p2;
            p1.type = null;
            p2.type = t;
        }
        // Ground types.
        function mkPoint(t) {
            return new Point(null, t);
        }
        var pNumber = mkPoint("number");
        var pBoolean = mkPoint("boolean");
        var pString = mkPoint("string");
        var pUnit = mkPoint("void");
        function ground(t) {
            if (!t)
                return mkPoint(t);
            switch (t.toLowerCase()) {
                case "number": return pNumber;
                case "boolean": return pBoolean;
                case "string": return pString;
                case "void": return pUnit;
                default:
                    // Unification variable.
                    return mkPoint(t);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Type inference
        //
        // Expressions are now directly compiled as a tree. This requires knowing, for
        // each property ref, the right value for its [parent] property.
        ///////////////////////////////////////////////////////////////////////////////
        // Infers the expected type of an expression by looking at the untranslated
        // block and figuring out, from the look of it, what type of expression it
        // holds.
        function returnType(e, b) {
            assert(b != null);
            if (b.type == "placeholder" || b.type === pxtc.TS_OUTPUT_TYPE)
                return find(b.p);
            if (b.type == "variables_get")
                return find(lookup(e, escapeVarName(b.getFieldValue("VAR"), e)).type);
            if (!b.outputConnection) {
                return ground(pUnit.type);
            }
            var check = b.outputConnection.check_ && b.outputConnection.check_.length ? b.outputConnection.check_[0] : "T";
            if (check === "Array") {
                // The only block that hits this case should be lists_create_with, so we
                // can safely infer the type from the first input that has a return type
                var tp = void 0;
                if (b.inputList && b.inputList.length) {
                    for (var _i = 0, _a = b.inputList; _i < _a.length; _i++) {
                        var input = _a[_i];
                        if (input.connection && input.connection.targetBlock()) {
                            var t = find(returnType(e, input.connection.targetBlock()));
                            if (t) {
                                if (t.parentType) {
                                    return t.parentType;
                                }
                                tp = ground(t.type + "[]");
                                genericLink(tp, t);
                                break;
                            }
                        }
                    }
                }
                return tp || ground("Array");
            }
            else if (check === "T") {
                var func_1 = e.stdCallTable[b.type];
                var isArrayGet = b.type === "lists_index_get";
                if (isArrayGet || func_1 && func_1.args.length) {
                    var parentInput = void 0;
                    if (isArrayGet) {
                        parentInput = b.inputList.filter(function (i) { return i.name === "LIST"; })[0];
                    }
                    else {
                        parentInput = b.inputList.filter(function (i) { return i.name === func_1.args[0].field; })[0];
                    }
                    if (parentInput.connection && parentInput.connection.targetBlock()) {
                        var parentType = returnType(e, parentInput.connection.targetBlock());
                        if (parentType.childType) {
                            return parentType.childType;
                        }
                        var p = isArrayType(parentType.type) ? mkPoint(parentType.type.substr(-2)) : mkPoint(null);
                        genericLink(parentType, p);
                        return p;
                    }
                }
                return mkPoint(null);
            }
            return ground(check);
        }
        // Basic type unification routine; easy, because there's no structural types.
        // FIXME: Generics are not supported
        function unify(t1, t2) {
            if (t1 == null || t1 === "Array" && isArrayType(t2))
                return t2;
            else if (t2 == null || t2 === "Array" && isArrayType(t1))
                return t1;
            else if (t1 == t2)
                return t1;
            else
                throw new Error("cannot mix " + t1 + " with " + t2);
        }
        function isArrayType(type) {
            return type && type.indexOf("[]") !== -1;
        }
        function mkPlaceholderBlock(e, parent, type) {
            // XXX define a proper placeholder block type
            return {
                type: "placeholder",
                p: mkPoint(type || null),
                workspace: e.workspace,
                parentBlock_: parent
            };
        }
        function attachPlaceholderIf(e, b, n, type) {
            // Ugly hack to keep track of the type we want there.
            var target = b.getInputTargetBlock(n);
            if (!target) {
                if (!placeholders[b.id]) {
                    placeholders[b.id] = {};
                }
                if (!placeholders[b.id][n]) {
                    placeholders[b.id][n] = mkPlaceholderBlock(e, b, type);
                }
            }
            else if (target.type === pxtc.TS_OUTPUT_TYPE && !(target.p)) {
                target.p = mkPoint(null);
            }
        }
        function getInputTargetBlock(b, n) {
            var res = b.getInputTargetBlock(n);
            if (!res) {
                return placeholders[b.id] && placeholders[b.id][n];
            }
            else {
                return res;
            }
        }
        function removeAllPlaceholders() {
            placeholders = {};
        }
        // Unify the *return* type of the parameter [n] of block [b] with point [p].
        function unionParam(e, b, n, p) {
            try {
                attachPlaceholderIf(e, b, n);
                union(returnType(e, getInputTargetBlock(b, n)), p);
            }
            catch (e) {
                throwBlockError("The parameter " + n + " of this block is of the wrong type. More precisely: " + e, b);
            }
        }
        function infer(e, w) {
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    try {
                        switch (b.type) {
                            case "math_op2":
                                unionParam(e, b, "x", ground(pNumber.type));
                                unionParam(e, b, "y", ground(pNumber.type));
                                break;
                            case "math_op3":
                                unionParam(e, b, "x", ground(pNumber.type));
                                break;
                            case "math_arithmetic":
                            case "logic_compare":
                                switch (b.getFieldValue("OP")) {
                                    case "ADD":
                                    case "MINUS":
                                    case "MULTIPLY":
                                    case "DIVIDE":
                                    case "LT":
                                    case "LTE":
                                    case "GT":
                                    case "GTE":
                                    case "POWER":
                                        unionParam(e, b, "A", ground(pNumber.type));
                                        unionParam(e, b, "B", ground(pNumber.type));
                                        break;
                                    case "AND":
                                    case "OR":
                                        attachPlaceholderIf(e, b, "A", pBoolean.type);
                                        attachPlaceholderIf(e, b, "B", pBoolean.type);
                                        break;
                                    case "EQ":
                                    case "NEQ":
                                        attachPlaceholderIf(e, b, "A");
                                        attachPlaceholderIf(e, b, "B");
                                        var p1_1 = returnType(e, getInputTargetBlock(b, "A"));
                                        var p2 = returnType(e, getInputTargetBlock(b, "B"));
                                        try {
                                            union(p1_1, p2);
                                        }
                                        catch (e) {
                                            throwBlockError("Comparing objects of different types", b);
                                        }
                                        var t = find(p1_1).type;
                                        if (t != pString.type && t != pBoolean.type && t != pNumber.type && t != null)
                                            throwBlockError("I can only compare strings, booleans and numbers", b);
                                        break;
                                }
                                break;
                            case "logic_operation":
                                attachPlaceholderIf(e, b, "A", pBoolean.type);
                                attachPlaceholderIf(e, b, "B", pBoolean.type);
                                break;
                            case "logic_negate":
                                attachPlaceholderIf(e, b, "BOOL", pBoolean.type);
                                break;
                            case "controls_if":
                                for (var i = 0; i <= b.elseifCount_; ++i)
                                    attachPlaceholderIf(e, b, "IF" + i, pBoolean.type);
                                break;
                            case "controls_simple_for":
                                unionParam(e, b, "TO", ground(pNumber.type));
                                break;
                            case "controls_for_of":
                                unionParam(e, b, "LIST", ground("Array"));
                                var listTp = returnType(e, getInputTargetBlock(b, "LIST"));
                                var elementTp = lookup(e, escapeVarName(b.getFieldValue("VAR"), e)).type;
                                genericLink(listTp, elementTp);
                                break;
                            case "variables_set":
                            case "variables_change":
                                var x = escapeVarName(b.getFieldValue("VAR"), e);
                                var p1 = lookup(e, x).type;
                                attachPlaceholderIf(e, b, "VALUE");
                                var rhs = getInputTargetBlock(b, "VALUE");
                                if (rhs) {
                                    var tr = returnType(e, rhs);
                                    try {
                                        union(p1, tr);
                                    }
                                    catch (e) {
                                        throwBlockError("Assigning a value of the wrong type to variable " + x, b);
                                    }
                                }
                                break;
                            case "controls_repeat_ext":
                                unionParam(e, b, "TIMES", ground(pNumber.type));
                                break;
                            case "device_while":
                                attachPlaceholderIf(e, b, "COND", pBoolean.type);
                                break;
                            case "lists_index_get":
                                unionParam(e, b, "LIST", ground("Array"));
                                unionParam(e, b, "INDEX", ground(pNumber.type));
                                var listType = returnType(e, getInputTargetBlock(b, "LIST"));
                                var ret = returnType(e, b);
                                genericLink(listType, ret);
                                break;
                            case "lists_index_set":
                                unionParam(e, b, "LIST", ground("Array"));
                                attachPlaceholderIf(e, b, "VALUE");
                                handleGenericType(b, "LIST");
                                unionParam(e, b, "INDEX", ground(pNumber.type));
                                break;
                            case pxtc.PAUSE_UNTIL_TYPE:
                                unionParam(e, b, "PREDICATE", pBoolean);
                                break;
                            default:
                                if (b.type in e.stdCallTable) {
                                    var call_1 = e.stdCallTable[b.type];
                                    call_1.args.forEach(function (p, i) {
                                        var isInstance = call_1.isExtensionMethod && i === 0;
                                        if (p.field && !b.getFieldValue(p.field)) {
                                            var i_1 = b.inputList.filter(function (i) { return i.name == p.field; })[0];
                                            if (i_1.connection && i_1.connection.check_) {
                                                if (isInstance && connectionCheck(i_1) === "Array") {
                                                    var gen = handleGenericType(b, p.field);
                                                    if (gen) {
                                                        return;
                                                    }
                                                }
                                                // All of our injected blocks have single output checks, but the builtin
                                                // blockly ones like string.length and array.length might have multiple
                                                for (var j = 0; j < i_1.connection.check_.length; j++) {
                                                    try {
                                                        var t = i_1.connection.check_[j];
                                                        unionParam(e, b, p.field, ground(t));
                                                        break;
                                                    }
                                                    catch (e) {
                                                        // Ignore type checking errors in the blocks...
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                        }
                    }
                    catch (err) {
                        var be = err.block || b;
                        be.setWarningText(err + "");
                        e.errors.push(be);
                    }
                });
            // Last pass: if some variable has no type (because it was never used or
            // assigned to), just unify it with int...
            e.bindings.forEach(function (b) {
                if (getConcreteType(b.type).type == null)
                    union(b.type, ground(pNumber.type));
            });
            function connectionCheck(i) {
                return i.name ? i.connection && i.connection.check_ && i.connection.check_.length ? i.connection.check_[0] : "T" : undefined;
            }
            function handleGenericType(b, name) {
                var genericArgs = b.inputList.filter(function (input) { return connectionCheck(input) === "T"; });
                if (genericArgs.length) {
                    var gen = getInputTargetBlock(b, genericArgs[0].name);
                    if (gen) {
                        var arg = returnType(e, gen);
                        var arrayType = arg.type ? ground(returnType(e, gen).type + "[]") : ground(null);
                        genericLink(arrayType, arg);
                        unionParam(e, b, name, arrayType);
                        return true;
                    }
                }
                return false;
            }
        }
        function genericLink(parent, child) {
            var p = find(parent);
            var c = find(child);
            if (p.childType) {
                union(p.childType, c);
            }
            else {
                p.childType = c;
            }
            if (c.parentType) {
                union(c.parentType, p);
            }
            else {
                c.parentType = p;
            }
        }
        function getConcreteType(point, found) {
            if (found === void 0) { found = []; }
            var t = find(point);
            if (found.indexOf(t) === -1) {
                found.push(t);
                if (!t.type || t.type === "Array") {
                    if (t.parentType) {
                        var parent_1 = getConcreteType(t.parentType, found);
                        if (parent_1.type && parent_1.type !== "Array") {
                            t.type = parent_1.type.substr(0, parent_1.type.length - 2);
                            return t;
                        }
                    }
                    if (t.childType) {
                        var child = getConcreteType(t.childType, found);
                        if (child.type) {
                            t.type = child.type + "[]";
                            return t;
                        }
                    }
                }
            }
            return t;
        }
        ///////////////////////////////////////////////////////////////////////////////
        // Expressions
        //
        // Expressions are now directly compiled as a tree. This requires knowing, for
        // each property ref, the right value for its [parent] property.
        ///////////////////////////////////////////////////////////////////////////////
        function extractNumber(b) {
            var v = b.getFieldValue(b.type === "math_number_minmax" ? "SLIDER" : "NUM");
            var parsed = parseFloat(v);
            checkNumber(parsed, b);
            return parsed;
        }
        function checkNumber(n, b) {
            if (n === Infinity || isNaN(n)) {
                throwBlockError(lf("Number entered is either too large or too small"), b);
            }
        }
        function extractTsExpression(e, b, comments) {
            return blocks.mkText(b.getFieldValue("EXPRESSION").trim());
        }
        function compileNumber(e, b, comments) {
            return blocks.H.mkNumberLiteral(extractNumber(b));
        }
        var opToTok = {
            // POWER gets a special treatment because there's no operator for it in
            // TouchDevelop
            "ADD": "+",
            "MINUS": "-",
            "MULTIPLY": "*",
            "DIVIDE": "/",
            "LT": "<",
            "LTE": "<=",
            "GT": ">",
            "GTE": ">=",
            "AND": "&&",
            "OR": "||",
            "EQ": "==",
            "NEQ": "!=",
        };
        function compileArithmetic(e, b, comments) {
            var bOp = b.getFieldValue("OP");
            var left = getInputTargetBlock(b, "A");
            var right = getInputTargetBlock(b, "B");
            var args = [compileExpression(e, left, comments), compileExpression(e, right, comments)];
            var t = returnType(e, left).type;
            if (t == pString.type) {
                if (bOp == "EQ")
                    return blocks.H.mkSimpleCall("==", args);
                else if (bOp == "NEQ")
                    return blocks.H.mkSimpleCall("!=", args);
            }
            else if (t == pBoolean.type)
                return blocks.H.mkSimpleCall(opToTok[bOp], args);
            // Compilation of math operators.
            if (bOp == "POWER")
                return blocks.H.mathCall("pow", args);
            else {
                assert(bOp in opToTok);
                return blocks.H.mkSimpleCall(opToTok[bOp], args);
            }
        }
        function compileModulo(e, b, comments) {
            var left = getInputTargetBlock(b, "DIVIDEND");
            var right = getInputTargetBlock(b, "DIVISOR");
            var args = [compileExpression(e, left, comments), compileExpression(e, right, comments)];
            return blocks.H.mkSimpleCall("%", args);
        }
        function compileMathOp2(e, b, comments) {
            var op = b.getFieldValue("op");
            var x = compileExpression(e, getInputTargetBlock(b, "x"), comments);
            var y = compileExpression(e, getInputTargetBlock(b, "y"), comments);
            return blocks.H.mathCall(op, [x, y]);
        }
        function compileMathOp3(e, b, comments) {
            var x = compileExpression(e, getInputTargetBlock(b, "x"), comments);
            return blocks.H.mathCall("abs", [x]);
        }
        function compileText(e, b, comments) {
            return blocks.H.mkStringLiteral(b.getFieldValue("TEXT"));
        }
        function compileTextJoin(e, b, comments) {
            var last;
            var i = 0;
            while (true) {
                var val = getInputTargetBlock(b, "ADD" + i);
                i++;
                if (!val) {
                    if (i < b.inputList.length) {
                        continue;
                    }
                    else {
                        break;
                    }
                }
                var compiled = compileExpression(e, val, comments);
                if (!last) {
                    if (val.type.indexOf("text") === 0) {
                        last = compiled;
                    }
                    else {
                        // If we don't start with a string, then the TS won't match
                        // the implied semantics of the blocks
                        last = blocks.H.mkSimpleCall("+", [blocks.H.mkStringLiteral(""), compiled]);
                    }
                }
                else {
                    last = blocks.H.mkSimpleCall("+", [last, compiled]);
                }
            }
            if (!last) {
                return blocks.H.mkStringLiteral("");
            }
            return last;
        }
        function compileBoolean(e, b, comments) {
            return blocks.H.mkBooleanLiteral(b.getFieldValue("BOOL") == "TRUE");
        }
        function compileNot(e, b, comments) {
            var expr = compileExpression(e, getInputTargetBlock(b, "BOOL"), comments);
            return blocks.mkPrefix("!", [blocks.H.mkParenthesizedExpression(expr)]);
        }
        function compileCreateList(e, b, comments) {
            // collect argument
            var args = b.inputList.map(function (input) { return input.connection && input.connection.targetBlock() ? compileExpression(e, input.connection.targetBlock(), comments) : undefined; })
                .filter(function (e) { return !!e; });
            return blocks.H.mkArrayLiteral(args);
        }
        function compileListGet(e, b, comments) {
            var listBlock = getInputTargetBlock(b, "LIST");
            var listExpr = compileExpression(e, listBlock, comments);
            var index = compileExpression(e, getInputTargetBlock(b, "INDEX"), comments);
            var res = blocks.mkGroup([listExpr, blocks.mkText("["), index, blocks.mkText("]")]);
            return res;
        }
        function compileListSet(e, b, comments) {
            var listBlock = getInputTargetBlock(b, "LIST");
            var listExpr = compileExpression(e, listBlock, comments);
            var index = compileExpression(e, getInputTargetBlock(b, "INDEX"), comments);
            var value = compileExpression(e, getInputTargetBlock(b, "VALUE"), comments);
            var res = blocks.mkGroup([listExpr, blocks.mkText("["), index, blocks.mkText("] = "), value]);
            return listBlock.type === "lists_create_with" ? prefixWithSemicolon(res) : res;
        }
        function compileProcedure(e, b, comments) {
            var name = escapeVarName(b.getFieldValue("NAME"), e, true);
            var stmts = getInputTargetBlock(b, "STACK");
            return [
                blocks.mkText("function " + name + "() "),
                compileStatements(e, stmts)
            ];
        }
        function compileProcedureCall(e, b, comments) {
            var name = escapeVarName(b.getFieldValue("NAME"), e, true);
            return blocks.mkStmt(blocks.mkText(name + "()"));
        }
        function defaultValueForType(t) {
            if (t.type == null) {
                union(t, ground(pNumber.type));
                t = find(t);
            }
            if (isArrayType(t.type)) {
                return blocks.mkText("[]");
            }
            switch (t.type) {
                case "boolean":
                    return blocks.H.mkBooleanLiteral(false);
                case "number":
                    return blocks.H.mkNumberLiteral(0);
                case "string":
                    return blocks.H.mkStringLiteral("");
                default:
                    return blocks.mkText("null");
            }
        }
        // [t] is the expected type; we assume that we never null block children
        // (because placeholder blocks have been inserted by the type-checking phase
        // whenever a block was actually missing).
        function compileExpression(e, b, comments) {
            assert(b != null);
            e.stats[b.type] = (e.stats[b.type] || 0) + 1;
            maybeAddComment(b, comments);
            var expr;
            if (b.disabled || b.type == "placeholder") {
                var ret = find(returnType(e, b));
                if (ret.type === "Array") {
                    // FIXME: Can't use default type here because TS complains about
                    // the array having an implicit any type. However, forcing this
                    // to be a number array may cause type issues. Also, potential semicolon
                    // issues if we ever have a block where the array is not the first argument...
                    var isExpression = b.parentBlock_.type === "lists_index_get";
                    if (!isExpression) {
                        var call = e.stdCallTable[b.parentBlock_.type];
                        isExpression = call && call.isExpression;
                    }
                    var arrayNode = blocks.mkText("[0]");
                    expr = isExpression ? arrayNode : prefixWithSemicolon(arrayNode);
                }
                else {
                    expr = defaultValueForType(returnType(e, b));
                }
            }
            else
                switch (b.type) {
                    case "math_number":
                        expr = compileNumber(e, b, comments);
                        break;
                    case "math_number_minmax":
                        expr = compileNumber(e, b, comments);
                        break;
                    case "math_op2":
                        expr = compileMathOp2(e, b, comments);
                        break;
                    case "math_op3":
                        expr = compileMathOp3(e, b, comments);
                        break;
                    case "math_arithmetic":
                    case "logic_compare":
                    case "logic_operation":
                        expr = compileArithmetic(e, b, comments);
                        break;
                    case "math_modulo":
                        expr = compileModulo(e, b, comments);
                        break;
                    case "logic_boolean":
                        expr = compileBoolean(e, b, comments);
                        break;
                    case "logic_negate":
                        expr = compileNot(e, b, comments);
                        break;
                    case "variables_get":
                        expr = compileVariableGet(e, b);
                        break;
                    case "text":
                        expr = compileText(e, b, comments);
                        break;
                    case "text_join":
                        expr = compileTextJoin(e, b, comments);
                        break;
                    case "lists_create_with":
                        expr = compileCreateList(e, b, comments);
                        break;
                    case "lists_index_get":
                        expr = compileListGet(e, b, comments);
                        break;
                    case "lists_index_set":
                        expr = compileListSet(e, b, comments);
                        break;
                    case pxtc.TS_OUTPUT_TYPE:
                        expr = extractTsExpression(e, b, comments);
                        break;
                    default:
                        var call = e.stdCallTable[b.type];
                        if (call) {
                            if (call.imageLiteral)
                                expr = compileImage(e, b, call.imageLiteral, call.namespace, call.f, call.args.map(function (ar) { return compileArgument(e, b, ar, comments); }));
                            else
                                expr = compileStdCall(e, b, call, comments);
                        }
                        else {
                            pxt.reportError("blocks", "unabled compile expression", { "details": b.type });
                            expr = defaultValueForType(returnType(e, b));
                        }
                        break;
                }
            expr.id = b.id;
            return expr;
        }
        blocks.compileExpression = compileExpression;
        var VarUsage;
        (function (VarUsage) {
            VarUsage[VarUsage["Unknown"] = 0] = "Unknown";
            VarUsage[VarUsage["Read"] = 1] = "Read";
            VarUsage[VarUsage["Assign"] = 2] = "Assign";
        })(VarUsage = blocks.VarUsage || (blocks.VarUsage = {}));
        function isCompiledAsLocalVariable(b) {
            return b.declaredInLocalScope && !b.mustBeGlobal;
        }
        function extend(e, x, t) {
            assert(lookup(e, x) == null);
            return {
                workspace: e.workspace,
                bindings: [{ name: x, type: ground(t), declaredInLocalScope: 0 }].concat(e.bindings),
                stdCallTable: e.stdCallTable,
                errors: e.errors,
                renames: e.renames,
                stats: e.stats
            };
        }
        function lookup(e, n) {
            for (var i = 0; i < e.bindings.length; ++i)
                if (e.bindings[i].name == n)
                    return e.bindings[i];
            return null;
        }
        function fresh(e, s) {
            var i = 0;
            var unique = s;
            while (lookup(e, unique) != null)
                unique = s + i++;
            return unique;
        }
        function emptyEnv(w) {
            return {
                workspace: w,
                bindings: [],
                stdCallTable: {},
                errors: [],
                renames: {
                    oldToNew: {},
                    takenNames: {},
                    oldToNewFunctions: {}
                },
                stats: {}
            };
        }
        ;
        ///////////////////////////////////////////////////////////////////////////////
        // Statements
        ///////////////////////////////////////////////////////////////////////////////
        function compileControlsIf(e, b, comments) {
            var stmts = [];
            // Notice the <= (if there's no else-if, we still compile the primary if).
            for (var i = 0; i <= b.elseifCount_; ++i) {
                var cond = compileExpression(e, getInputTargetBlock(b, "IF" + i), comments);
                var thenBranch = compileStatements(e, getInputTargetBlock(b, "DO" + i));
                var startNode = blocks.mkText("if (");
                if (i > 0) {
                    startNode = blocks.mkText("else if (");
                    startNode.glueToBlock = blocks.GlueMode.WithSpace;
                }
                append(stmts, [
                    startNode,
                    cond,
                    blocks.mkText(")"),
                    thenBranch
                ]);
            }
            if (b.elseCount_) {
                var elseNode = blocks.mkText("else");
                elseNode.glueToBlock = blocks.GlueMode.WithSpace;
                append(stmts, [
                    elseNode,
                    compileStatements(e, getInputTargetBlock(b, "ELSE"))
                ]);
            }
            return stmts;
        }
        function compileControlsFor(e, b, comments) {
            var bVar = escapeVarName(b.getFieldValue("VAR"), e);
            var bTo = getInputTargetBlock(b, "TO");
            var bDo = getInputTargetBlock(b, "DO");
            var bBy = getInputTargetBlock(b, "BY");
            var bFrom = getInputTargetBlock(b, "FROM");
            var incOne = !bBy || (bBy.type.match(/^math_number/) && extractNumber(bBy) == 1);
            var binding = lookup(e, bVar);
            assert(binding.declaredInLocalScope > 0);
            return [
                blocks.mkText("for (let " + bVar + " = "),
                bFrom ? compileExpression(e, bFrom, comments) : blocks.mkText("0"),
                blocks.mkText("; "),
                blocks.mkInfix(blocks.mkText(bVar), "<=", compileExpression(e, bTo, comments)),
                blocks.mkText("; "),
                incOne ? blocks.mkText(bVar + "++") : blocks.mkInfix(blocks.mkText(bVar), "+=", compileExpression(e, bBy, comments)),
                blocks.mkText(")"),
                compileStatements(e, bDo)
            ];
        }
        function compileControlsRepeat(e, b, comments) {
            var bound = compileExpression(e, getInputTargetBlock(b, "TIMES"), comments);
            var body = compileStatements(e, getInputTargetBlock(b, "DO"));
            var valid = function (x) { return !lookup(e, x); };
            var name = "i";
            for (var i = 0; !valid(name); i++)
                name = "i" + i;
            return [
                blocks.mkText("for (let " + name + " = 0; "),
                blocks.mkInfix(blocks.mkText(name), "<", bound),
                blocks.mkText("; " + name + "++)"),
                body
            ];
        }
        function compileWhile(e, b, comments) {
            var cond = compileExpression(e, getInputTargetBlock(b, "COND"), comments);
            var body = compileStatements(e, getInputTargetBlock(b, "DO"));
            return [
                blocks.mkText("while ("),
                cond,
                blocks.mkText(")"),
                body
            ];
        }
        function compileControlsForOf(e, b, comments) {
            var bVar = escapeVarName(b.getFieldValue("VAR"), e);
            var bOf = getInputTargetBlock(b, "LIST");
            var bDo = getInputTargetBlock(b, "DO");
            var binding = lookup(e, bVar);
            assert(binding.declaredInLocalScope > 0);
            return [
                blocks.mkText("for (let " + bVar + " of "),
                compileExpression(e, bOf, comments),
                blocks.mkText(")"),
                compileStatements(e, bDo)
            ];
        }
        function compileForever(e, b) {
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            return mkCallWithCallback(e, "basic", "forever", [], body);
        }
        // convert to javascript friendly name
        function escapeVarName(name, e, isFunction) {
            if (isFunction === void 0) { isFunction = false; }
            if (!name)
                return '_';
            if (isFunction) {
                if (e.renames.oldToNewFunctions[name]) {
                    return e.renames.oldToNewFunctions[name];
                }
            }
            else if (e.renames.oldToNew[name]) {
                return e.renames.oldToNew[name];
            }
            var n = ts.pxtc.escapeIdentifier(name);
            if (e.renames.takenNames[n]) {
                var i = 2;
                while (e.renames.takenNames[n + i]) {
                    i++;
                }
                n += i;
            }
            if (isFunction) {
                e.renames.oldToNewFunctions[name] = n;
            }
            else {
                e.renames.oldToNew[name] = n;
            }
            e.renames.takenNames[n] = true;
            return n;
        }
        blocks.escapeVarName = escapeVarName;
        function compileVariableGet(e, b) {
            var name = escapeVarName(b.getFieldValue("VAR"), e);
            var binding = lookup(e, name);
            if (!binding.assigned)
                binding.assigned = VarUsage.Read;
            assert(binding != null && binding.type != null);
            return blocks.mkText(name);
        }
        function compileSet(e, b, comments) {
            var bVar = escapeVarName(b.getFieldValue("VAR"), e);
            var bExpr = getInputTargetBlock(b, "VALUE");
            var binding = lookup(e, bVar);
            var isDef = false;
            if (!binding.assigned)
                if (b.getSurroundParent()) {
                    // need to define this variable in the top-scope
                    binding.assigned = VarUsage.Read;
                }
                else {
                    binding.assigned = VarUsage.Assign;
                    isDef = true;
                }
            var expr = compileExpression(e, bExpr, comments);
            return blocks.mkStmt(blocks.mkText(isDef ? "let " : ""), blocks.mkText(bVar + " = "), expr);
        }
        function compileChange(e, b, comments) {
            var bVar = escapeVarName(b.getFieldValue("VAR"), e);
            var bExpr = getInputTargetBlock(b, "VALUE");
            var binding = lookup(e, bVar);
            if (!binding.assigned)
                binding.assigned = VarUsage.Read;
            var expr = compileExpression(e, bExpr, comments);
            var ref = blocks.mkText(bVar);
            return blocks.mkStmt(blocks.mkInfix(ref, "+=", expr));
        }
        function eventArgs(call) {
            return call.args.map(function (ar) { return ar.field; }).filter(function (ar) { return !!ar; });
        }
        function compileCall(e, b, comments) {
            var call = e.stdCallTable[b.type];
            if (call.imageLiteral)
                return blocks.mkStmt(compileImage(e, b, call.imageLiteral, call.namespace, call.f, call.args.map(function (ar) { return compileArgument(e, b, ar, comments); })));
            else if (call.hasHandler)
                return compileEvent(e, b, call, eventArgs(call), call.namespace, comments);
            else
                return blocks.mkStmt(compileStdCall(e, b, call, comments));
        }
        function compileArgument(e, b, p, comments, beginningOfStatement) {
            if (beginningOfStatement === void 0) { beginningOfStatement = false; }
            var lit = p.literal;
            if (lit)
                return lit instanceof String ? blocks.H.mkStringLiteral(lit) : blocks.H.mkNumberLiteral(lit);
            var f = b.getFieldValue(p.field);
            if (f != null) {
                if (b.getField(p.field) instanceof pxtblockly.FieldTextInput) {
                    return blocks.H.mkStringLiteral(f);
                }
                return blocks.mkText(f);
            }
            else {
                attachPlaceholderIf(e, b, p.field);
                var target = getInputTargetBlock(b, p.field);
                if (beginningOfStatement && target.type === "lists_create_with") {
                    // We have to be careful of array literals at the beginning of a statement
                    // because they can cause errors (i.e. they get parsed as an index). Add a
                    // semicolon to the previous statement just in case.
                    // FIXME: No need to do this if the previous statement was a code block
                    return prefixWithSemicolon(compileExpression(e, target, comments));
                }
                return compileExpression(e, target, comments);
            }
        }
        function compileStdCall(e, b, func, comments) {
            var args;
            if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks.MutatorTypes.RestParameterMutator) {
                args = b.mutation.compileMutation(e, comments).children;
            }
            else {
                args = func.args.map(function (p, i) { return compileArgument(e, b, p, comments, func.isExtensionMethod && i === 0 && !func.isExpression); });
            }
            var externalInputs = !b.getInputsInline();
            if (func.isIdentity)
                return args[0];
            else if (func.property) {
                return blocks.H.mkPropertyAccess(func.f, args[0]);
            }
            else if (func.isExtensionMethod) {
                if (func.attrs.defaultInstance) {
                    var instance = void 0;
                    if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks.MutatorTypes.DefaultInstanceMutator) {
                        instance = b.mutation.compileMutation(e, comments);
                    }
                    if (instance) {
                        args.unshift(instance);
                    }
                    else {
                        args.unshift(blocks.mkText(func.attrs.defaultInstance));
                    }
                }
                return blocks.H.extensionCall(func.f, args, externalInputs);
            }
            else if (func.namespace) {
                return blocks.H.namespaceCall(func.namespace, func.f, args, externalInputs);
            }
            else {
                return blocks.H.stdCall(func.f, args, externalInputs);
            }
        }
        function compileStdBlock(e, b, f, comments) {
            return blocks.mkStmt(compileStdCall(e, b, f, comments));
        }
        function mkCallWithCallback(e, n, f, args, body, argumentDeclaration, isExtension) {
            if (isExtension === void 0) { isExtension = false; }
            body.noFinalNewline = true;
            var callback;
            if (argumentDeclaration) {
                callback = blocks.mkGroup([argumentDeclaration, body]);
            }
            else {
                callback = blocks.mkGroup([blocks.mkText("function ()"), body]);
            }
            if (isExtension)
                return blocks.mkStmt(blocks.H.extensionCall(f, args.concat([callback]), false));
            else if (n)
                return blocks.mkStmt(blocks.H.namespaceCall(n, f, args.concat([callback]), false));
            else
                return blocks.mkStmt(blocks.H.mkCall(f, args.concat([callback]), false));
        }
        function compileArg(e, b, arg, comments) {
            // b.getFieldValue may be string, numbers
            var argb = getInputTargetBlock(b, arg);
            if (argb)
                return compileExpression(e, argb, comments);
            if (b.getField(arg) instanceof pxtblockly.FieldTextInput)
                return blocks.H.mkStringLiteral(b.getFieldValue(arg));
            return blocks.mkText(b.getFieldValue(arg));
        }
        function compileStartEvent(e, b) {
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            if (pxt.appTarget.compile && pxt.appTarget.compile.onStartText && body && body.children) {
                body.children.unshift(blocks.mkStmt(blocks.mkText("// " + pxtc.ON_START_COMMENT + "\n")));
            }
            return body;
        }
        function compileEvent(e, b, stdfun, args, ns, comments) {
            var compiledArgs = args.map(function (arg) { return compileArg(e, b, arg, comments); });
            var bBody = getInputTargetBlock(b, "HANDLER");
            var body = compileStatements(e, bBody);
            if (pxt.appTarget.compile && pxt.appTarget.compile.emptyEventHandlerComments && body.children.length === 0) {
                body.children.unshift(blocks.mkStmt(blocks.mkText("// " + pxtc.HANDLER_COMMENT)));
            }
            var argumentDeclaration;
            if (isMutatingBlock(b) && b.mutation.getMutationType() === blocks.MutatorTypes.ObjectDestructuringMutator) {
                argumentDeclaration = b.mutation.compileMutation(e, comments);
            }
            else if (stdfun.handlerArgs.length) {
                var handlerArgs = []; // = stdfun.handlerArgs.map(arg => escapeVarName(b.getFieldValue("HANDLER_" + arg.name), e));
                for (var i = 0; i < stdfun.handlerArgs.length; i++) {
                    var arg = stdfun.handlerArgs[i];
                    var varName = b.getFieldValue("HANDLER_" + arg.name);
                    if (varName !== null) {
                        handlerArgs.push(escapeVarName(varName, e));
                    }
                    else {
                        break;
                    }
                }
                argumentDeclaration = blocks.mkText("function (" + handlerArgs.join(", ") + ")");
            }
            return mkCallWithCallback(e, ns, stdfun.f, compiledArgs, body, argumentDeclaration, stdfun.isExtensionMethod);
        }
        function isMutatingBlock(b) {
            return !!b.mutation;
        }
        function compileImage(e, b, frames, n, f, args) {
            args = args === undefined ? [] : args;
            var state = "\n";
            var rows = 5;
            var columns = frames * 5;
            for (var i = 0; i < rows; ++i) {
                for (var j = 0; j < columns; ++j) {
                    if (j > 0)
                        state += ' ';
                    state += /TRUE/.test(b.getFieldValue("LED" + j + i)) ? "#" : ".";
                }
                state += '\n';
            }
            var lit = blocks.H.mkStringLiteral(state);
            lit.canIndentInside = true;
            return blocks.H.namespaceCall(n, f, [lit].concat(args), false);
        }
        function compileStatementBlock(e, b) {
            var r;
            var comments = [];
            e.stats[b.type] = (e.stats[b.type] || 0) + 1;
            maybeAddComment(b, comments);
            switch (b.type) {
                case 'controls_if':
                    r = compileControlsIf(e, b, comments);
                    break;
                case 'controls_for':
                case 'controls_simple_for':
                    r = compileControlsFor(e, b, comments);
                    break;
                case 'controls_for_of':
                    r = compileControlsForOf(e, b, comments);
                    break;
                case 'variables_set':
                    r = [compileSet(e, b, comments)];
                    break;
                case 'variables_change':
                    r = [compileChange(e, b, comments)];
                    break;
                case 'controls_repeat_ext':
                    r = compileControlsRepeat(e, b, comments);
                    break;
                case 'device_while':
                    r = compileWhile(e, b, comments);
                    break;
                case 'procedures_defnoreturn':
                    r = compileProcedure(e, b, comments);
                    break;
                case 'procedures_callnoreturn':
                    r = [compileProcedureCall(e, b, comments)];
                    break;
                case ts.pxtc.ON_START_TYPE:
                    r = compileStartEvent(e, b).children;
                    break;
                case pxtc.TS_STATEMENT_TYPE:
                    r = compileTypescriptBlock(e, b);
                    break;
                case pxtc.PAUSE_UNTIL_TYPE:
                    r = compilePauseUntilBlock(e, b, comments);
                    break;
                default:
                    var call = e.stdCallTable[b.type];
                    if (call)
                        r = [compileCall(e, b, comments)];
                    else
                        r = [blocks.mkStmt(compileExpression(e, b, comments))];
                    break;
            }
            var l = r[r.length - 1];
            if (l)
                l.id = b.id;
            if (comments.length) {
                addCommentNodes(comments, r);
            }
            r.forEach(function (l) {
                if (l.type === blocks.NT.Block || l.type === blocks.NT.Prefix && pxt.Util.startsWith(l.op, "//")) {
                    l.id = b.id;
                }
            });
            return r;
        }
        function compileStatements(e, b) {
            var stmts = [];
            while (b) {
                if (!b.disabled)
                    append(stmts, compileStatementBlock(e, b));
                b = b.getNextBlock();
            }
            return blocks.mkBlock(stmts);
        }
        function compileTypescriptBlock(e, b) {
            var res = [];
            var i = 0;
            while (true) {
                var value = b.getFieldValue("LINE" + i);
                i++;
                if (value !== null) {
                    res.push(blocks.mkText(value + "\n"));
                    var declaredVars = b.declaredVariables;
                    if (declaredVars) {
                        var varNames = declaredVars.split(",");
                        varNames.forEach(function (n) {
                            var existing = lookup(e, n);
                            if (existing) {
                                existing.assigned = VarUsage.Assign;
                                existing.mustBeGlobal = false;
                            }
                            else {
                                e.bindings.push({
                                    name: n,
                                    type: mkPoint(null),
                                    assigned: VarUsage.Assign,
                                    declaredInLocalScope: 1,
                                    mustBeGlobal: false
                                });
                            }
                        });
                    }
                }
                else {
                    break;
                }
            }
            return res;
        }
        function prefixWithSemicolon(n) {
            var emptyStatement = blocks.mkStmt(blocks.mkText(";"));
            emptyStatement.glueToBlock = blocks.GlueMode.NoSpace;
            return blocks.mkGroup([emptyStatement, n]);
        }
        function compilePauseUntilBlock(e, b, comments) {
            var options = pxt.appTarget.runtime && pxt.appTarget.runtime.pauseUntilBlock;
            pxt.Util.assert(!!options, "target has block enabled");
            var ns = options.namespace;
            var name = options.callName || "pauseUntil";
            var arg = compileArg(e, b, "PREDICATE", comments);
            var lambda = [blocks.mkGroup([blocks.mkText("() => "), arg])];
            if (ns) {
                return [blocks.mkStmt(blocks.H.namespaceCall(ns, name, lambda, false))];
            }
            else {
                return [blocks.mkStmt(blocks.H.mkCall(name, lambda, false, false))];
            }
        }
        // This function creates an empty environment where type inference has NOT yet
        // been performed.
        // - All variables have been assigned an initial [Point] in the union-find.
        // - Variables have been marked to indicate if they are compatible with the
        //   TouchDevelop for-loop model.
        function mkEnv(w, blockInfo, skipVariables) {
            // The to-be-returned environment.
            var e = emptyEnv(w);
            // append functions in stdcalltable
            if (blockInfo) {
                // Enums are not enclosed in namespaces, so add them to the taken names
                // to avoid collision
                Object.keys(blockInfo.apis.byQName).forEach(function (name) {
                    var info = blockInfo.apis.byQName[name];
                    if (info.kind === pxtc.SymbolKind.Enum) {
                        e.renames.takenNames[info.qName] = true;
                    }
                });
                blockInfo.blocks
                    .forEach(function (fn) {
                    if (e.stdCallTable[fn.attributes.blockId]) {
                        pxt.reportError("blocks", "function already defined", { "details": fn.attributes.blockId });
                        return;
                    }
                    e.renames.takenNames[fn.namespace] = true;
                    var _a = pxt.blocks.parameterNames(fn), attrNames = _a.attrNames, handlerArgs = _a.handlerArgs;
                    var instance = fn.kind == pxtc.SymbolKind.Method || fn.kind == pxtc.SymbolKind.Property;
                    var args = (fn.parameters || []).map(function (p) {
                        if (attrNames[p.name] && attrNames[p.name].name)
                            return { field: attrNames[p.name].name };
                        else
                            return null;
                    }).filter(function (a) { return !!a; });
                    if (instance && !fn.attributes.defaultInstance) {
                        args.unshift({
                            field: attrNames["this"].name
                        });
                    }
                    e.stdCallTable[fn.attributes.blockId] = {
                        namespace: fn.namespace,
                        f: fn.name,
                        args: args,
                        attrs: fn.attributes,
                        handlerArgs: handlerArgs,
                        isExtensionMethod: instance,
                        isExpression: fn.retType && fn.retType !== "void",
                        imageLiteral: fn.attributes.imageLiteral,
                        hasHandler: !!handlerArgs.length || fn.parameters && fn.parameters.some(function (p) { return (p.type == "() => void" || !!p.properties); }),
                        property: !fn.parameters,
                        isIdentity: fn.attributes.shim == "TD_ID"
                    };
                });
            }
            if (skipVariables)
                return e;
            var variableIsScoped = function (b, name) {
                if (!b)
                    return false;
                else if ((b.type == "controls_for" || b.type == "controls_simple_for" || b.type == "controls_for_of")
                    && escapeVarName(b.getFieldValue("VAR"), e) == name)
                    return true;
                else if (isMutatingBlock(b) && b.mutation.isDeclaredByMutation(name))
                    return true;
                var stdFunc = e.stdCallTable[b.type];
                if (stdFunc && stdFunc.handlerArgs.length) {
                    var foundIt_1 = false;
                    stdFunc.handlerArgs.forEach(function (arg) {
                        if (foundIt_1)
                            return;
                        var varName = b.getFieldValue("HANDLER_" + arg.name);
                        if (varName != null && escapeVarName(varName, e) === name) {
                            foundIt_1 = true;
                        }
                    });
                    if (foundIt_1) {
                        return true;
                    }
                }
                return variableIsScoped(b.getSurroundParent(), name);
            };
            function trackLocalDeclaration(name, type) {
                // It's ok for two loops to share the same variable.
                if (lookup(e, name) == null)
                    e = extend(e, name, type);
                lookup(e, name).declaredInLocalScope++;
                // If multiple loops share the same
                // variable, that means there's potential race conditions in concurrent
                // code, so faithfully compile this as a global variable.
                if (lookup(e, name).declaredInLocalScope > 1)
                    lookup(e, name).mustBeGlobal = true;
            }
            // collect local variables.
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    if (b.type == "controls_for" || b.type == "controls_simple_for" || b.type == "controls_for_of") {
                        var x = escapeVarName(b.getFieldValue("VAR"), e);
                        if (b.type == "controls_for_of") {
                            trackLocalDeclaration(x, null);
                        }
                        else {
                            trackLocalDeclaration(x, pNumber.type);
                        }
                    }
                    else if (isMutatingBlock(b)) {
                        var declarations = b.mutation.getDeclaredVariables();
                        if (declarations) {
                            for (var varName in declarations) {
                                trackLocalDeclaration(escapeVarName(varName, e), declarations[varName]);
                            }
                        }
                    }
                    var stdFunc = e.stdCallTable[b.type];
                    if (stdFunc && stdFunc.handlerArgs.length) {
                        stdFunc.handlerArgs.forEach(function (arg) {
                            var varName = b.getFieldValue("HANDLER_" + arg.name);
                            if (varName != null) {
                                trackLocalDeclaration(escapeVarName(varName, e), arg.type);
                            }
                        });
                    }
                });
            // determine for-loop compatibility: for each get or
            // set block, 1) make sure that the variable is bound, then 2) mark the variable if needed.
            if (w)
                w.getAllBlocks().filter(function (b) { return !b.disabled; }).forEach(function (b) {
                    if (b.type == "variables_get" || b.type == "variables_set" || b.type == "variables_change") {
                        var x = escapeVarName(b.getFieldValue("VAR"), e);
                        if (lookup(e, x) == null)
                            e = extend(e, x, null);
                        var binding = lookup(e, x);
                        if (binding.declaredInLocalScope && !variableIsScoped(b, x))
                            // loop index is read outside the loop.
                            binding.mustBeGlobal = true;
                    }
                });
            return e;
        }
        blocks.mkEnv = mkEnv;
        function compileBlockAsync(b, blockInfo) {
            var w = b.workspace;
            var e = mkEnv(w, blockInfo);
            infer(e, w);
            var compiled = compileStatementBlock(e, b);
            removeAllPlaceholders();
            return tdASTtoTS(e, compiled);
        }
        blocks.compileBlockAsync = compileBlockAsync;
        function eventWeight(b, e) {
            if (b.type === ts.pxtc.ON_START_TYPE) {
                return 0;
            }
            var api = e.stdCallTable[b.type];
            if (api && api.attrs.afterOnStart) {
                return 1;
            }
            else {
                return -1;
            }
        }
        function compileWorkspace(e, w, blockInfo) {
            try {
                infer(e, w);
                var stmtsMain_1 = [];
                // all compiled top level blocks are events
                var topblocks = w.getTopBlocks(true).sort(function (a, b) {
                    return eventWeight(a, e) - eventWeight(b, e);
                });
                updateDisabledBlocks(e, w.getAllBlocks(), topblocks);
                topblocks.forEach(function (b) {
                    if (b.type == ts.pxtc.ON_START_TYPE)
                        append(stmtsMain_1, compileStartEvent(e, b).children);
                    else {
                        var compiled = compileStatements(e, b);
                        if (compiled.type == blocks.NT.Block)
                            append(stmtsMain_1, compiled.children);
                        else
                            stmtsMain_1.push(compiled);
                    }
                });
                // All variables in this script are compiled as locals within main unless loop or previsouly assigned
                var stmtsVariables = e.bindings.filter(function (b) { return !isCompiledAsLocalVariable(b) && b.assigned != VarUsage.Assign; })
                    .map(function (b) {
                    var t = getConcreteType(b.type);
                    var defl;
                    if (t.type === "Array") {
                        defl = blocks.mkText("[]");
                    }
                    else {
                        defl = defaultValueForType(t);
                    }
                    var tp = "";
                    if (defl.op == "null" || defl.op == "[]") {
                        var tpname = t.type;
                        // If the type is "Array" or null[] it means that we failed to narrow the type of array.
                        // Best we can do is just default to number[]
                        if (tpname === "Array" || tpname === "null[]") {
                            tpname = "number[]";
                        }
                        var tpinfo = blockInfo.apis.byQName[tpname];
                        if (tpinfo && tpinfo.attributes.autoCreate)
                            defl = blocks.mkText(tpinfo.attributes.autoCreate + "()");
                        else
                            tp = ": " + tpname;
                    }
                    return blocks.mkStmt(blocks.mkText("let " + b.name + tp + " = "), defl);
                });
                return stmtsVariables.concat(stmtsMain_1);
            }
            catch (err) {
                var be = err.block;
                if (be) {
                    be.setWarningText(err + "");
                    e.errors.push(be);
                }
                else {
                    throw err;
                }
            }
            finally {
                removeAllPlaceholders();
            }
            return []; // unreachable
        }
        function callKey(e, b) {
            if (b.type == ts.pxtc.ON_START_TYPE)
                return JSON.stringify({ name: ts.pxtc.ON_START_TYPE });
            var call = e.stdCallTable[b.type];
            if (call) {
                // detect if same event is registered already
                var compiledArgs = eventArgs(call).map(function (arg) { return compileArg(e, b, arg, []); });
                var key = JSON.stringify({ name: call.f, ns: call.namespace, compiledArgs: compiledArgs })
                    .replace(/"id"\s*:\s*"[^"]+"/g, ''); // remove blockly ids
                return key;
            }
            return undefined;
        }
        blocks.callKey = callKey;
        function updateDisabledBlocks(e, allBlocks, topBlocks) {
            var disableOrphans = pxt.appTarget.appTheme.disableOrphans || true;
            // unset disabled
            allBlocks.forEach(function (b) { return b.setDisabled(false); });
            // update top blocks
            var events = {};
            function flagDuplicate(key, block) {
                var otherEvent = events[key];
                if (otherEvent) {
                    // another block is already registered
                    block.setDisabled(true);
                }
                else {
                    block.setDisabled(false);
                    events[key] = block;
                }
            }
            topBlocks.forEach(function (b) {
                var call = e.stdCallTable[b.type];
                // multiple calls allowed
                if (b.type == ts.pxtc.ON_START_TYPE)
                    flagDuplicate(ts.pxtc.ON_START_TYPE, b);
                else if (b.type === "procedures_defnoreturn" || call && call.attrs.blockAllowMultiple && !call.attrs.handlerStatement)
                    return;
                else if (call && call.hasHandler && !call.attrs.handlerStatement) {
                    // compute key that identifies event call
                    // detect if same event is registered already
                    var key = callKey(e, b);
                    flagDuplicate(key, b);
                }
                else {
                    // all non-events are disabled
                    var t = b;
                    while (t) {
                        if (disableOrphans)
                            t.setDisabled(true);
                        t = t.getNextBlock();
                    }
                }
            });
        }
        function findBlockId(sourceMap, loc) {
            if (!loc)
                return undefined;
            var bestChunk;
            var bestChunkLength;
            for (var i = 0; i < sourceMap.length; ++i) {
                var chunk = sourceMap[i];
                if (chunk.start <= loc.start && chunk.end > loc.start + loc.length && (!bestChunk || bestChunkLength > chunk.end - chunk.start)) {
                    bestChunk = chunk;
                    bestChunkLength = chunk.end - chunk.start;
                }
            }
            if (bestChunk) {
                return bestChunk.id;
            }
            return undefined;
        }
        blocks.findBlockId = findBlockId;
        function compileAsync(b, blockInfo) {
            var e = mkEnv(b, blockInfo);
            var nodes = compileWorkspace(e, b, blockInfo);
            var result = tdASTtoTS(e, nodes);
            return result;
        }
        blocks.compileAsync = compileAsync;
        function tdASTtoTS(env, app) {
            var res = blocks.flattenNode(app);
            // Note: the result of format is not used!
            return workerOpAsync("format", { format: { input: res.output, pos: 1 } }).then(function () {
                return {
                    source: res.output,
                    sourceMap: res.sourceMap,
                    stats: env.stats
                };
            });
        }
        function maybeAddComment(b, comments) {
            if (b.comment) {
                if ((typeof b.comment) === "string") {
                    comments.push(b.comment);
                }
                else {
                    comments.push(b.comment.getText());
                }
            }
        }
        function addCommentNodes(comments, r) {
            var commentNodes = [];
            var paragraphs = [];
            for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
                var comment = comments_1[_i];
                for (var _a = 0, _b = comment.split("\n"); _a < _b.length; _a++) {
                    var paragraph = _b[_a];
                    paragraphs.push(paragraph);
                }
            }
            for (var i = 0; i < paragraphs.length; i++) {
                // Wrap paragraph lines
                var words = paragraphs[i].split(/\s/);
                var currentLine = void 0;
                for (var _c = 0, words_1 = words; _c < words_1.length; _c++) {
                    var word = words_1[_c];
                    if (!currentLine) {
                        currentLine = word;
                    }
                    else if (currentLine.length + word.length > MAX_COMMENT_LINE_LENGTH) {
                        commentNodes.push(blocks.mkText("// " + currentLine));
                        commentNodes.push(blocks.mkNewLine());
                        currentLine = word;
                    }
                    else {
                        currentLine += " " + word;
                    }
                }
                if (currentLine) {
                    commentNodes.push(blocks.mkText("// " + currentLine));
                    commentNodes.push(blocks.mkNewLine());
                }
                // The decompiler expects an empty comment line between paragraphs
                if (i !== paragraphs.length - 1) {
                    commentNodes.push(blocks.mkText("//"));
                    commentNodes.push(blocks.mkNewLine());
                }
            }
            for (var _d = 0, _e = commentNodes.reverse(); _d < _e.length; _d++) {
                var commentNode = _e[_d];
                r.unshift(commentNode);
            }
        }
        function endsWith(text, suffix) {
            if (text.length < suffix.length) {
                return false;
            }
            return text.substr(text.length - suffix.length) === suffix;
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var registeredFieldEditors = {};
        function initFieldEditors() {
            // Initialize PXT custom editors
            var noteValidator = function (text) {
                if (text === null) {
                    return null;
                }
                text = String(text);
                var n = parseFloat(text || '0');
                if (isNaN(n) || n < 0) {
                    // Invalid number.
                    return null;
                }
                // Get the value in range.
                return String(Math.round(Number(text)));
            };
            registerFieldEditor('text', pxtblockly.FieldTextInput);
            registerFieldEditor('note', pxtblockly.FieldNote, noteValidator);
            registerFieldEditor('gridpicker', pxtblockly.FieldGridPicker);
            registerFieldEditor('textdropdown', pxtblockly.FieldTextDropdown);
            registerFieldEditor('numberdropdown', pxtblockly.FieldNumberDropdown);
            registerFieldEditor('imagedropdown', pxtblockly.FieldImageDropdown);
            registerFieldEditor('colorwheel', pxtblockly.FieldColorWheel);
            registerFieldEditor('toggle', pxtblockly.FieldToggle);
            registerFieldEditor('toggleonoff', pxtblockly.FieldToggleOnOff);
            registerFieldEditor('toggleyesno', pxtblockly.FieldToggleYesNo);
            registerFieldEditor('colornumber', pxtblockly.FieldColorNumber);
            registerFieldEditor('colorpicker', pxtblockly.FieldColorPicker);
        }
        blocks.initFieldEditors = initFieldEditors;
        function registerFieldEditor(selector, field, validator) {
            if (registeredFieldEditors[selector] == undefined) {
                registeredFieldEditors[selector] = {
                    field: field,
                    validator: validator
                };
            }
        }
        blocks.registerFieldEditor = registerFieldEditor;
        function createFieldEditor(selector, text, params) {
            if (registeredFieldEditors[selector] == undefined) {
                console.error("Field editor " + selector + " not registered");
                return null;
            }
            var customField = registeredFieldEditors[selector];
            var instance = new customField.field(text, params, customField.validator);
            return instance;
        }
        blocks.createFieldEditor = createFieldEditor;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
///<reference path='../localtypings/pxtblockly.d.ts'/>
/// <reference path="../built/pxtlib.d.ts" />
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_1) {
        function saveWorkspaceXml(ws) {
            var xml = Blockly.Xml.workspaceToDom(ws);
            var text = Blockly.Xml.domToPrettyText(xml);
            return text;
        }
        blocks_1.saveWorkspaceXml = saveWorkspaceXml;
        function getDirectChildren(parent, tag) {
            var res = [];
            for (var i = 0; i < parent.childNodes.length; i++) {
                var n = parent.childNodes.item(i);
                if (n.tagName === tag) {
                    res.push(n);
                }
            }
            return res;
        }
        blocks_1.getDirectChildren = getDirectChildren;
        function getBlocksWithType(parent, type) {
            return getChildrenWithAttr(parent, "block", "type", type);
        }
        blocks_1.getBlocksWithType = getBlocksWithType;
        function getChildrenWithAttr(parent, tag, attr, value) {
            return pxt.Util.toArray(parent.getElementsByTagName(tag)).filter(function (b) { return b.getAttribute(attr) === value; });
        }
        blocks_1.getChildrenWithAttr = getChildrenWithAttr;
        function getFirstChildWithAttr(parent, tag, attr, value) {
            var res = getChildrenWithAttr(parent, tag, attr, value);
            return res.length ? res[0] : undefined;
        }
        blocks_1.getFirstChildWithAttr = getFirstChildWithAttr;
        /**
         * Loads the xml into a off-screen workspace (not suitable for size computations)
         */
        function loadWorkspaceXml(xml, skipReport) {
            if (skipReport === void 0) { skipReport = false; }
            var workspace = new Blockly.Workspace();
            try {
                var dom = Blockly.Xml.textToDom(xml);
                Blockly.Xml.domToWorkspace(dom, workspace);
                return workspace;
            }
            catch (e) {
                if (!skipReport)
                    pxt.reportException(e);
                return null;
            }
        }
        blocks_1.loadWorkspaceXml = loadWorkspaceXml;
        function patchFloatingBlocks(dom, info) {
            var onstarts = getBlocksWithType(dom, ts.pxtc.ON_START_TYPE);
            var onstart = onstarts.length ? onstarts[0] : undefined;
            if (onstart) {
                onstart.removeAttribute("deletable");
                return;
            }
            var newnodes = [];
            var blocks = {};
            info.blocks.forEach(function (b) { return blocks[b.attributes.blockId] = b; });
            // walk top level blocks
            var node = dom.firstElementChild;
            var insertNode = undefined;
            while (node) {
                var nextNode = node.nextElementSibling;
                // does this block is disable or have s nested statement block?
                var nodeType = node.getAttribute("type");
                if (!node.getAttribute("disabled") && !node.getElementsByTagName("statement").length
                    && (pxt.blocks.buildinBlockStatements[nodeType] ||
                        (blocks[nodeType] && blocks[nodeType].retType == "void" && !blocks_1.hasArrowFunction(blocks[nodeType])))) {
                    // old block, needs to be wrapped in onstart
                    if (!insertNode) {
                        insertNode = dom.ownerDocument.createElement("statement");
                        insertNode.setAttribute("name", "HANDLER");
                        if (!onstart) {
                            onstart = dom.ownerDocument.createElement("block");
                            onstart.setAttribute("type", ts.pxtc.ON_START_TYPE);
                            newnodes.push(onstart);
                        }
                        onstart.appendChild(insertNode);
                        insertNode.appendChild(node);
                        node.removeAttribute("x");
                        node.removeAttribute("y");
                        insertNode = node;
                    }
                    else {
                        // event, add nested statement
                        var next = dom.ownerDocument.createElement("next");
                        next.appendChild(node);
                        insertNode.appendChild(next);
                        node.removeAttribute("x");
                        node.removeAttribute("y");
                        insertNode = node;
                    }
                }
                node = nextNode;
            }
            newnodes.forEach(function (n) { return dom.appendChild(n); });
        }
        function importXml(xml, info, skipReport) {
            if (skipReport === void 0) { skipReport = false; }
            try {
                var parser = new DOMParser();
                var doc_1 = parser.parseFromString(xml, "application/xml");
                if (pxt.appTarget.compile) {
                    var upgrades = pxt.appTarget.compile.upgrades || [];
                    // patch block types
                    upgrades.filter(function (up) { return up.type == "blockId"; })
                        .forEach(function (up) { return Object.keys(up.map).forEach(function (type) {
                        getBlocksWithType(doc_1, type)
                            .forEach(function (blockNode) {
                            blockNode.setAttribute("type", up.map[type]);
                            pxt.debug("patched block " + type + " -> " + up.map[type]);
                        });
                    }); });
                    // patch block value
                    upgrades.filter(function (up) { return up.type == "blockValue"; })
                        .forEach(function (up) { return Object.keys(up.map).forEach(function (k) {
                        var m = k.split('.');
                        var type = m[0];
                        var name = m[1];
                        getBlocksWithType(doc_1, type)
                            .reduce(function (prev, current) { return prev.concat(getDirectChildren(current, "value")); }, [])
                            .forEach(function (blockNode) {
                            blockNode.setAttribute("name", up.map[k]);
                            pxt.debug("patched block value " + k + " -> " + up.map[k]);
                        });
                    }); });
                }
                // build upgrade map
                var enums = {};
                for (var k in info.apis.byQName) {
                    var api = info.apis.byQName[k];
                    if (api.kind == pxtc.SymbolKind.EnumMember)
                        enums[api.namespace + '.' + (api.attributes.blockImportId || api.attributes.block || api.attributes.blockId || api.name)]
                            = api.namespace + '.' + api.name;
                }
                // walk through blocks and patch enums
                var blocks_2 = doc_1.getElementsByTagName("block");
                for (var i = 0; i < blocks_2.length; ++i)
                    patchBlock(info, enums, blocks_2[i]);
                // patch floating blocks
                var shouldPatchFloatingBlocks = pxt.appTarget.appTheme.patchFloatingBlocks || true;
                if (shouldPatchFloatingBlocks)
                    patchFloatingBlocks(doc_1.documentElement, info);
                // serialize and return
                return new XMLSerializer().serializeToString(doc_1);
            }
            catch (e) {
                if (!skipReport)
                    pxt.reportException(e);
                return xml;
            }
        }
        blocks_1.importXml = importXml;
        function patchBlock(info, enums, block) {
            var type = block.getAttribute("type");
            var b = Blockly.Blocks[type];
            var symbol = blocks_1.blockSymbol(type);
            if (!symbol || !b)
                return;
            var params = blocks_1.parameterNames(symbol).attrNames;
            symbol.parameters.forEach(function (p, i) {
                var ptype = info.apis.byQName[p.type];
                if (ptype && ptype.kind == pxtc.SymbolKind.Enum) {
                    var field = getFirstChildWithAttr(block, "field", "name", params[p.name].name);
                    if (field) {
                        var en = enums[ptype.name + '.' + field.textContent];
                        if (en)
                            field.textContent = en;
                    }
                    /*
    <block type="device_button_event" x="92" y="77">
        <field name="NAME">Button.AB</field>
      </block>
                      */
                }
            });
        }
        /**
         * Convert blockly hue to rgb
         */
        function convertColour(colour) {
            var hue = parseInt(colour);
            if (!isNaN(hue)) {
                return Blockly.hueToRgb(hue);
            }
            return colour;
        }
        blocks_1.convertColour = convertColour;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_3) {
        var layout;
        (function (layout) {
            function patchBlocksFromOldWorkspace(blockInfo, oldWs, newXml) {
                var newWs = pxt.blocks.loadWorkspaceXml(newXml, true);
                // position blocks
                alignBlocks(blockInfo, oldWs, newWs);
                // inject disabled blocks
                return injectDisabledBlocks(oldWs, newWs);
            }
            layout.patchBlocksFromOldWorkspace = patchBlocksFromOldWorkspace;
            function injectDisabledBlocks(oldWs, newWs) {
                var oldDom = Blockly.Xml.workspaceToDom(oldWs);
                var newDom = Blockly.Xml.workspaceToDom(newWs);
                pxt.Util.toArray(oldDom.childNodes)
                    .filter(function (n) { return n.nodeType == Node.ELEMENT_NODE && n.localName == "block" && n.getAttribute("disabled") == "true"; })
                    .forEach(function (n) { return newDom.appendChild(newDom.ownerDocument.importNode(n, true)); });
                var updatedXml = Blockly.Xml.domToPrettyText(newDom);
                return updatedXml;
            }
            function alignBlocks(blockInfo, oldWs, newWs) {
                var env;
                var newBlocks; // support for multiple events with similar name
                oldWs.getTopBlocks(false).filter(function (ob) { return !ob.disabled; })
                    .forEach(function (ob) {
                    var otp = ob.xy_;
                    if (otp && otp.x != 0 && otp.y != 0) {
                        if (!env) {
                            env = pxt.blocks.mkEnv(oldWs, blockInfo, true);
                            newBlocks = {};
                            newWs.getTopBlocks(false).forEach(function (b) {
                                var nkey = pxt.blocks.callKey(env, b);
                                var nbs = newBlocks[nkey] || [];
                                nbs.push(b);
                                newBlocks[nkey] = nbs;
                            });
                        }
                        var oldKey = pxt.blocks.callKey(env, ob);
                        var newBlock = (newBlocks[oldKey] || []).shift();
                        if (newBlock)
                            newBlock.xy_ = otp.clone();
                    }
                });
            }
            function verticalAlign(ws, emPixels) {
                var blocks = ws.getTopBlocks(true);
                var y = 0;
                blocks.forEach(function (block) {
                    block.moveBy(0, y);
                    y += block.getHeightWidth().height;
                    y += emPixels; //buffer
                });
            }
            layout.verticalAlign = verticalAlign;
            ;
            function flow(ws, opts) {
                if (opts) {
                    if (opts.useViewWidth) {
                        var metrics = ws.getMetrics();
                        // Only use the width if in portrait, otherwise the blocks are too spread out
                        if (metrics.viewHeight > metrics.viewWidth) {
                            flowBlocks(ws.getTopBlocks(true), undefined, metrics.viewWidth);
                            return;
                        }
                    }
                    flowBlocks(ws.getTopBlocks(true), opts.ratio);
                }
                else {
                    flowBlocks(ws.getTopBlocks(true));
                }
            }
            layout.flow = flow;
            function screenshotEnabled() {
                return !pxt.BrowserUtils.isIE()
                    && !pxt.BrowserUtils.isUwpEdge(); // TODO figure out why screenshots are not working in UWP; disable for now
            }
            layout.screenshotEnabled = screenshotEnabled;
            function screenshotAsync(ws) {
                return toPngAsync(ws);
            }
            layout.screenshotAsync = screenshotAsync;
            function toPngAsync(ws) {
                return toSvgAsync(ws)
                    .then(function (sg) {
                    if (!sg)
                        return Promise.resolve(undefined);
                    return toPngAsyncInternal(sg.width, sg.height, 4, sg.xml);
                });
            }
            layout.toPngAsync = toPngAsync;
            function svgToPngAsync(svg, x, y, width, height, pixelDensity) {
                return blocklyToSvgAsync(svg, x, y, width, height)
                    .then(function (sg) {
                    if (!sg)
                        return Promise.resolve(undefined);
                    return toPngAsyncInternal(sg.width, sg.height, pixelDensity, sg.xml);
                });
            }
            layout.svgToPngAsync = svgToPngAsync;
            function toPngAsyncInternal(width, height, pixelDensity, data) {
                return new Promise(function (resolve, reject) {
                    var cvs = document.createElement("canvas");
                    var ctx = cvs.getContext("2d");
                    var img = new Image;
                    cvs.width = width * pixelDensity;
                    cvs.height = height * pixelDensity;
                    img.onload = function () {
                        ctx.drawImage(img, 0, 0, width, height, 0, 0, cvs.width, cvs.height);
                        var canvasdata = cvs.toDataURL("image/png");
                        resolve(canvasdata);
                    };
                    img.onerror = function (ev) {
                        pxt.reportError("blocks", "blocks screenshot failed");
                        resolve(undefined);
                    };
                    img.src = data;
                });
            }
            var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
            function toSvgAsync(ws) {
                if (!ws)
                    return Promise.resolve(undefined);
                var bbox = document.getElementsByClassName("blocklyBlockCanvas")[0].getBBox();
                var sg = ws.svgBlockCanvas_.cloneNode(true);
                return blocklyToSvgAsync(sg, bbox.x, bbox.y, bbox.width, bbox.height);
            }
            layout.toSvgAsync = toSvgAsync;
            function blocklyToSvgAsync(sg, x, y, width, height) {
                if (!sg.childNodes[0])
                    return Promise.resolve(undefined);
                sg.removeAttribute("width");
                sg.removeAttribute("height");
                sg.removeAttribute("transform");
                var xmlString = new XMLSerializer().serializeToString(sg);
                xmlString = xmlString.replace('&nbsp;', '&#160;'); // Replace &nbsp; with &#160; as a workaround for having nbsp missing from SVG xml 
                var xsg = new DOMParser().parseFromString("<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"" + XLINK_NAMESPACE + "\" width=\"" + width + "\" height=\"" + height + "\" viewBox=\"" + x + " " + y + " " + width + " " + height + "\">\n            " + xmlString + "\n            </svg>", "image/svg+xml");
                var cssLink = xsg.createElementNS("http://www.w3.org/1999/xhtml", "style");
                var customCssHref = document.getElementById("blocklycss").href;
                return pxt.BrowserUtils.loadAjaxAsync(customCssHref)
                    .then(function (customCss) {
                    var blocklySvg = pxt.Util.toArray(document.head.querySelectorAll("style"))
                        .filter(function (el) { return /\.blocklySvg/.test(el.innerText); })[0];
                    // CSS may contain <, > which need to be stored in CDATA section
                    cssLink.appendChild(xsg.createCDATASection((blocklySvg ? blocklySvg.innerText : "") + '\n\n' + customCss + '\n\n'));
                    xsg.documentElement.insertBefore(cssLink, xsg.documentElement.firstElementChild);
                    return expandImagesAsync(xsg)
                        .then(function () {
                        return { width: width, height: height, svg: new XMLSerializer().serializeToString(xsg), xml: documentToSvg(xsg) };
                    });
                });
            }
            layout.blocklyToSvgAsync = blocklyToSvgAsync;
            function documentToSvg(xsg) {
                var xml = new XMLSerializer().serializeToString(xsg);
                var data = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
                return data;
            }
            layout.documentToSvg = documentToSvg;
            var imageXLinkCache;
            function expandImagesAsync(xsg) {
                if (!imageXLinkCache)
                    imageXLinkCache = {};
                var images = xsg.getElementsByTagName("image");
                var p = pxt.Util.toArray(images)
                    .filter(function (image) { return !/^data:/.test(image.getAttributeNS(XLINK_NAMESPACE, "href")); })
                    .map(function (image) {
                    var href = image.getAttributeNS(XLINK_NAMESPACE, "href");
                    var dataUri = imageXLinkCache[href];
                    return (dataUri ? Promise.resolve(imageXLinkCache[href])
                        : pxt.BrowserUtils.loadImageAsync(image.getAttributeNS(XLINK_NAMESPACE, "href"))
                            .then(function (img) {
                            var cvs = document.createElement("canvas");
                            var ctx = cvs.getContext("2d");
                            cvs.width = img.width;
                            cvs.height = img.height;
                            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, cvs.width, cvs.height);
                            imageXLinkCache[href] = dataUri = cvs.toDataURL("image/png");
                            return dataUri;
                        }).catch(function (e) {
                            // ignore load error
                            pxt.debug("svg render: failed to load " + href);
                        }))
                        .then(function (href) { image.setAttributeNS(XLINK_NAMESPACE, "href", href); });
                });
                return Promise.all(p).then(function () { });
            }
            function flowBlocks(blocks, ratio, maxWidth) {
                if (ratio === void 0) { ratio = 1.62; }
                var gap = 16;
                var marginx = 20;
                var marginy = 20;
                var maxx;
                if (maxWidth > marginx) {
                    maxx = maxWidth - marginx;
                }
                else {
                    // compute total block surface and infer width
                    var surface = 0;
                    for (var _i = 0, blocks_4 = blocks; _i < blocks_4.length; _i++) {
                        var block = blocks_4[_i];
                        var s = block.getHeightWidth();
                        surface += s.width * s.height;
                    }
                    maxx = Math.sqrt(surface) * ratio;
                }
                var insertx = marginx;
                var inserty = marginy;
                var endy = 0;
                for (var _a = 0, blocks_5 = blocks; _a < blocks_5.length; _a++) {
                    var block = blocks_5[_a];
                    var r = block.getBoundingRectangle();
                    var s = block.getHeightWidth();
                    // move block to insertion point
                    block.moveBy(insertx - r.topLeft.x, inserty - r.topLeft.y);
                    insertx += s.width + gap;
                    endy = Math.max(endy, inserty + s.height + gap);
                    if (insertx > maxx) {
                        insertx = marginx;
                        inserty = endy;
                    }
                }
            }
        })(layout = blocks_3.layout || (blocks_3.layout = {}));
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/blockly.d.ts" />
/// <reference path="../built/pxtlib.d.ts" />
var Util = pxt.Util;
var lf = Util.lf;
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_6) {
        blocks_6.blockColors = {
            loops: '#107c10',
            logic: '#006970',
            math: '#712672',
            images: '#5C2D91',
            variables: '#A80000',
            functions: '#005a9e',
            text: '#996600',
            arrays: '#A94400',
            advanced: '#3c3c3c'
        };
        var CategoryMode;
        (function (CategoryMode) {
            CategoryMode[CategoryMode["All"] = 0] = "All";
            CategoryMode[CategoryMode["None"] = 1] = "None";
            CategoryMode[CategoryMode["Basic"] = 2] = "Basic";
        })(CategoryMode = blocks_6.CategoryMode || (blocks_6.CategoryMode = {}));
        var typeDefaults = {
            "string": {
                field: "TEXT",
                block: "text",
                defaultValue: ""
            },
            "number": {
                field: "NUM",
                block: "math_number",
                defaultValue: "0"
            },
            "boolean": {
                field: "BOOL",
                block: "logic_boolean",
                defaultValue: "false"
            },
            "Array": {
                field: "VAR",
                block: "variables_get",
                defaultValue: "list"
            }
        };
        function advancedTitle() { return pxt.Util.lf("{id:category}Advanced"); }
        blocks_6.advancedTitle = advancedTitle;
        function addPackageTitle() { return pxt.Util.lf("{id:category}Extensions"); }
        blocks_6.addPackageTitle = addPackageTitle;
        // Matches arrays and tuple types
        var arrayTypeRegex = /^(?:Array<.+>)|(?:.+\[\])|(?:\[.+\])$/;
        var usedBlocks = {};
        var updateUsedBlocks = false;
        // list of built-in blocks, should be touched.
        var builtinBlocks = {};
        Object.keys(Blockly.Blocks)
            .forEach(function (k) { return builtinBlocks[k] = { block: Blockly.Blocks[k] }; });
        blocks_6.buildinBlockStatements = {
            "controls_if": true,
            "controls_for": true,
            "controls_simple_for": true,
            "controls_repeat_ext": true,
            "variables_set": true,
            "variables_change": true,
            "device_while": true
        };
        var cachedBlocks = {};
        var searchElementCache = {};
        function blockSymbol(type) {
            var b = cachedBlocks[type];
            return b ? b.fn : undefined;
        }
        blocks_6.blockSymbol = blockSymbol;
        function createShadowValue(name, type, v, shadowType) {
            if (v && v.slice(0, 1) == "\"")
                v = JSON.parse(v);
            if (type == "number" && shadowType == "value") {
                var field = document.createElement("field");
                field.setAttribute("name", name);
                field.appendChild(document.createTextNode("0"));
                return field;
            }
            var isVariable = shadowType == "variables_get";
            var value = document.createElement("value");
            value.setAttribute("name", name);
            var shadow = document.createElement(isVariable ? "block" : "shadow");
            value.appendChild(shadow);
            var typeInfo = typeDefaults[type];
            shadow.setAttribute("type", shadowType || typeInfo && typeInfo.block || type);
            shadow.setAttribute("colour", Blockly.Colours.textField);
            if (typeInfo) {
                var field = document.createElement("field");
                shadow.appendChild(field);
                var fieldName = void 0;
                switch (shadowType) {
                    case "variables_get":
                        fieldName = "VAR";
                        break;
                    case "math_number_minmax":
                        fieldName = "SLIDER";
                        break;
                    default:
                        fieldName = typeInfo.field;
                        break;
                }
                field.setAttribute("name", fieldName);
                var value_1;
                if (type == "boolean") {
                    value_1 = document.createTextNode((v || typeInfo.defaultValue).toUpperCase());
                }
                else {
                    value_1 = document.createTextNode(v || typeInfo.defaultValue);
                }
                field.appendChild(value_1);
            }
            else if (isVariable && v) {
                var field = document.createElement("field");
                shadow.appendChild(field);
                field.setAttribute("name", "VAR");
                field.textContent = v;
            }
            return value;
        }
        function createToolboxBlock(info, fn, params) {
            //
            // toolbox update
            //
            var attrNames = params.attrNames, handlerArgs = params.handlerArgs;
            var block = document.createElement("block");
            block.setAttribute("type", fn.attributes.blockId);
            if (fn.attributes.blockGap)
                block.setAttribute("gap", fn.attributes.blockGap);
            else if (pxt.appTarget.appTheme && pxt.appTarget.appTheme.defaultBlockGap)
                block.setAttribute("gap", pxt.appTarget.appTheme.defaultBlockGap.toString());
            if ((fn.kind == pxtc.SymbolKind.Method || fn.kind == pxtc.SymbolKind.Property)
                && attrNames["this"]) {
                var attr = attrNames["this"];
                block.appendChild(createShadowValue(attr.name, attr.type, attr.shadowValue || attr.name, attr.shadowType || "variables_get"));
            }
            if (fn.parameters) {
                fn.parameters.filter(function (pr) { return !!attrNames[pr.name].name &&
                    (/^(string|number|boolean)$/.test(attrNames[pr.name].type)
                        || !!attrNames[pr.name].shadowType
                        || !!attrNames[pr.name].shadowValue); })
                    .forEach(function (pr) {
                    var attr = attrNames[pr.name];
                    var shadowValue;
                    var container;
                    if (pr.options && pr.options['min'] && pr.options['max']) {
                        shadowValue = createShadowValue(attr.name, attr.type, attr.shadowValue, 'math_number_minmax');
                        container = document.createElement('mutation');
                        container.setAttribute('min', pr.options['min'].value);
                        container.setAttribute('max', pr.options['max'].value);
                        container.setAttribute('label', pr.name.charAt(0).toUpperCase() + pr.name.slice(1));
                        if (pr.options['fieldEditorOptions']) {
                            if (pr.options['fieldEditorOptions'].value['step'])
                                container.setAttribute('step', pr.options['fieldEditorOptions'].value['step']);
                            if (pr.options['fieldEditorOptions'].value['color'])
                                container.setAttribute('color', pr.options['fieldEditorOptions'].value['color']);
                        }
                    }
                    else {
                        shadowValue = createShadowValue(attr.name, attr.type, attr.shadowValue, attr.shadowType);
                    }
                    if (pr.options && pr.options['fieldEditorOptions']) {
                        if (!container)
                            container = document.createElement('mutation');
                        container.setAttribute("customfield", JSON.stringify(pr.options['fieldEditorOptions'].value));
                    }
                    if (shadowValue && container)
                        shadowValue.firstChild.appendChild(container);
                    block.appendChild(shadowValue);
                });
                handlerArgs.forEach(function (arg) {
                    var field = document.createElement("field");
                    field.setAttribute("name", "HANDLER_" + arg.name);
                    field.textContent = arg.name;
                    block.appendChild(field);
                });
            }
            searchElementCache[fn.attributes.blockId] = block.cloneNode(true);
            return block;
        }
        function createCategoryElement(name, nameid, weight, colour, iconClass) {
            var result = document.createElement("category");
            result.setAttribute("name", name);
            result.setAttribute("nameid", nameid.toLowerCase());
            result.setAttribute("weight", weight.toString());
            if (colour) {
                result.setAttribute("colour", colour);
            }
            if (iconClass) {
                result.setAttribute("iconclass", iconClass);
                result.setAttribute("expandedclass", iconClass);
            }
            return result;
        }
        function injectToolbox(tb, info, fn, block, showCategories, pnames) {
            if (showCategories === void 0) { showCategories = CategoryMode.Basic; }
            // identity function are just a trick to get an enum drop down in the block
            // while allowing the parameter to be a number
            if (fn.attributes.blockHidden)
                return;
            if (!fn.attributes.deprecated) {
                var ns = (fn.attributes.blockNamespace || fn.namespace).split('.')[0];
                var nsn = info.apis.byQName[ns];
                var isAdvanced = nsn && nsn.attributes.advanced;
                if (nsn)
                    ns = nsn.attributes.block || ns;
                var catName = ts.pxtc.blocksCategory(fn);
                if (nsn && nsn.name)
                    catName = pxt.Util.capitalize(nsn.name);
                var category_1 = categoryElement(tb, catName);
                if (showCategories === CategoryMode.All || showCategories == CategoryMode.Basic && !isAdvanced) {
                    if (!category_1) {
                        var categories = getChildCategories(tb);
                        var parentCategoryList = tb;
                        pxt.debug('toolbox: adding category ' + ns);
                        var nsWeight = (nsn ? nsn.attributes.weight : 50) || 50;
                        var locCatName = pxt.Util.capitalize((nsn ? nsn.attributes.block : "") || catName);
                        category_1 = createCategoryElement(locCatName, catName, nsWeight);
                        if (nsn && nsn.attributes.color) {
                            category_1.setAttribute("colour", nsn.attributes.color);
                        }
                        else if (getNamespaceColor(ns)) {
                            category_1.setAttribute("colour", getNamespaceColor(ns));
                        }
                        if (nsn && nsn.attributes.icon) {
                            var nsnIconClassName = ("blocklyTreeIcon" + nsn.name.toLowerCase()).replace(/\s/g, '');
                            appendToolboxIconCss(nsnIconClassName, nsn.attributes.icon);
                            category_1.setAttribute("iconclass", nsnIconClassName);
                            category_1.setAttribute("expandedclass", nsnIconClassName);
                            category_1.setAttribute("web-icon", nsn.attributes.icon);
                        }
                        else {
                            category_1.setAttribute("iconclass", "blocklyTreeIconDefault");
                            category_1.setAttribute("expandedclass", "blocklyTreeIconDefault");
                            category_1.setAttribute("web-icon", "\uf12e");
                        }
                        if (nsn && nsn.attributes.groups) {
                            category_1.setAttribute("groups", nsn.attributes.groups.join(', '));
                        }
                        if (nsn && nsn.attributes.labelLineWidth) {
                            category_1.setAttribute("labellinewidth", nsn.attributes.labelLineWidth);
                        }
                        insertTopLevelCategory(category_1, tb, nsWeight, isAdvanced);
                    }
                    if (fn.attributes.advanced) {
                        category_1 = getOrAddSubcategoryByWeight(category_1, lf("More"), "More", 1, category_1.getAttribute("colour"), 'blocklyTreeIconmore');
                    }
                    else if (fn.attributes.subcategory) {
                        var sub = fn.attributes.subcategory;
                        var all = nsn.attributes.subcategories;
                        if (all && all.indexOf(sub) !== -1) {
                            // Respect the weights given by the package
                            var weight = 10000 - all.indexOf(sub);
                            category_1 = getOrAddSubcategoryByWeight(category_1, sub, sub, weight, category_1.getAttribute("colour"), 'blocklyTreeIconmore');
                        }
                        else {
                            // If no weight is specified, insert alphabetically after the weighted subcategories but above "More"
                            category_1 = getOrAddSubcategoryByName(category_1, sub, sub, category_1.getAttribute("colour"), 'blocklyTreeIconmore');
                        }
                        if (nsn && nsn.attributes.groups) {
                            category_1.setAttribute("groups", nsn.attributes.groups.join(', '));
                        }
                    }
                }
                if (showCategories === CategoryMode.Basic && isAdvanced) {
                    var type = block.getAttribute("type");
                    usedBlocks[type] = true;
                }
                if (fn.attributes.optionalVariableArgs && fn.attributes.toolboxVariableArgs) {
                    var handlerArgs_1 = pnames.handlerArgs;
                    var mutationValues = fn.attributes.toolboxVariableArgs.split(";")
                        .map(function (v) { return parseInt(v); })
                        .filter(function (v) { return v <= handlerArgs_1.length && v >= 0; });
                    mutationValues.forEach(function (v) {
                        var mutatedBlock = block.cloneNode(true);
                        var mutation = document.createElement("mutation");
                        mutation.setAttribute("numargs", v.toString());
                        for (var i = 0; i < v; i++) {
                            mutation.setAttribute("arg" + i, handlerArgs_1[i].name);
                        }
                        mutatedBlock.appendChild(mutation);
                        if (showCategories !== CategoryMode.None) {
                            insertBlock(mutatedBlock, category_1, fn.attributes.weight);
                        }
                        else {
                            tb.appendChild(mutatedBlock);
                        }
                    });
                }
                else if (fn.attributes.mutateDefaults) {
                    var mutationValues = fn.attributes.mutateDefaults.split(";");
                    mutationValues.forEach(function (mutation) {
                        var mutatedBlock = block.cloneNode(true);
                        blocks_6.mutateToolboxBlock(mutatedBlock, fn.attributes.mutate, mutation);
                        if (showCategories !== CategoryMode.None) {
                            insertBlock(mutatedBlock, category_1, fn.attributes.weight);
                        }
                        else {
                            tb.appendChild(mutatedBlock);
                        }
                    });
                }
                else {
                    if (showCategories !== CategoryMode.None && !(showCategories === CategoryMode.Basic && isAdvanced)) {
                        insertBlock(block, category_1, fn.attributes.weight, fn.attributes.group);
                        injectToolboxIconCss();
                    }
                    else if (showCategories === CategoryMode.None) {
                        tb.appendChild(block);
                    }
                }
            }
        }
        function insertBlock(bl, cat, weight, group) {
            var isBuiltin = !!blocks_6.blockColors[cat.getAttribute("nameid")];
            if (group) {
                bl.setAttribute("group", group);
            }
            if (isBuiltin && weight > 50) {
                bl.setAttribute("loaded", "true");
                var first = void 0;
                for (var i = 0; i < cat.childNodes.length; i++) {
                    var n = cat.childNodes.item(i);
                    if (n.tagName === "block" && !n.getAttribute("loaded")) {
                        first = n;
                        break;
                    }
                }
                if (first) {
                    cat.insertBefore(bl, first);
                }
                else {
                    cat.appendChild(bl);
                }
            }
            else {
                cat.appendChild(bl);
            }
        }
        var toolboxStyle;
        var toolboxStyleBuffer = '';
        function appendToolboxIconCss(className, i) {
            if (toolboxStyleBuffer.indexOf(className) > -1)
                return;
            if (i.length === 1) {
                var icon = pxt.Util.unicodeToChar(i);
                toolboxStyleBuffer += "\n                .blocklyTreeIcon." + className + "::before {\n                    content: \"" + icon + "\";\n                }\n            ";
            }
            else {
                toolboxStyleBuffer += "\n                .blocklyTreeIcon." + className + " {\n                    background-image: url(\"" + pxt.Util.pathJoin(pxt.webConfig.commitCdnUrl, encodeURI(i)) + "\")!important;\n                    width: 30px;\n                    height: 100%;\n                    background-size: 20px !important;\n                    background-repeat: no-repeat !important;\n                    background-position: 50% 50% !important;\n                }\n            ";
            }
        }
        blocks_6.appendToolboxIconCss = appendToolboxIconCss;
        function injectToolboxIconCss() {
            if (!toolboxStyle) {
                toolboxStyle = document.createElement('style');
                toolboxStyle.id = "blocklyToolboxIcons";
                toolboxStyle.type = 'text/css';
                var head = document.head || document.getElementsByTagName('head')[0];
                head.appendChild(toolboxStyle);
            }
            if (toolboxStyle.sheet) {
                toolboxStyle.textContent = toolboxStyleBuffer + namespaceStyleBuffer;
            }
            else {
                toolboxStyle.appendChild(document.createTextNode(toolboxStyleBuffer + namespaceStyleBuffer));
            }
        }
        blocks_6.injectToolboxIconCss = injectToolboxIconCss;
        var namespaceStyleBuffer = '';
        function appendNamespaceCss(namespace, color) {
            var ns = namespace.toLowerCase();
            color = color || '#dddddd'; // Default toolbox color
            if (namespaceStyleBuffer.indexOf(ns) > -1)
                return;
            namespaceStyleBuffer += "\n            span.docs." + ns + " {\n                background-color: " + color + " !important;\n                border-color: " + Blockly.PXTUtils.fadeColour(color, 0.2, true) + " !important;\n            }\n        ";
        }
        blocks_6.appendNamespaceCss = appendNamespaceCss;
        function getChildCategories(parent) {
            var elements = parent.getElementsByTagName("category");
            var result = [];
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].parentNode === parent) {
                    result.push(elements[i]);
                }
            }
            return result;
        }
        function insertTopLevelCategory(category, tb, nsWeight, isAdvanced) {
            var categories = getChildCategories(tb);
            if (isAdvanced) {
                category.setAttribute("advanced", "true");
            }
            // Insert the category based on weight
            var ci = 0;
            for (ci = 0; ci < categories.length; ++ci) {
                var cat = categories[ci];
                var catAdvanced = cat.hasAttribute("advanced") && cat.getAttribute("advanced") !== "false";
                // Advanced categories always come last
                if (isAdvanced) {
                    if (!catAdvanced) {
                        continue;
                    }
                }
                else if (catAdvanced) {
                    tb.insertBefore(category, cat);
                    break;
                }
                if (parseInt(cat.getAttribute("weight") || "50") < nsWeight) {
                    tb.insertBefore(category, cat);
                    break;
                }
            }
            if (ci == categories.length)
                tb.appendChild(category);
        }
        function getOrAddSubcategoryByWeight(parent, name, nameid, weight, colour, iconClass) {
            var existing = blocks_6.getFirstChildWithAttr(parent, "category", "nameid", nameid.toLowerCase());
            if (existing) {
                return existing;
            }
            var newCategory = createCategoryElement(name, nameid, weight, colour, iconClass);
            var siblings = parent.getElementsByTagName("category");
            var ci = 0;
            for (ci = 0; ci < siblings.length; ++ci) {
                var cat = siblings[ci];
                if (parseInt(cat.getAttribute("weight") || "50") < weight) {
                    parent.insertBefore(newCategory, cat);
                    break;
                }
            }
            if (ci == siblings.length)
                parent.appendChild(newCategory);
            return newCategory;
        }
        function getOrAddSubcategoryByName(parent, name, nameid, colour, iconClass) {
            var existing = blocks_6.getFirstChildWithAttr(parent, "category", "nameid", nameid.toLowerCase());
            if (existing) {
                return existing;
            }
            var newCategory = createCategoryElement(name, nameid, 100, colour, iconClass);
            var siblings = parent.getElementsByTagName("category");
            var filtered = [];
            var ci = 0;
            var inserted = false;
            var last = undefined;
            for (ci = 0; ci < siblings.length; ++ci) {
                var cat = siblings[ci];
                var sibWeight = parseInt(cat.getAttribute("weight") || "50");
                if (sibWeight >= 1000) {
                    continue;
                }
                else if (sibWeight === 1) {
                    last = cat;
                    break;
                }
                filtered.push(cat);
                if (!inserted && cat.getAttribute("name").localeCompare(name) >= 0) {
                    parent.insertBefore(newCategory, cat);
                    filtered.splice(filtered.length - 1, 0, newCategory);
                    inserted = true;
                }
            }
            if (!inserted) {
                filtered.push(newCategory);
                if (last) {
                    parent.insertBefore(newCategory, last);
                }
                else {
                    parent.appendChild(newCategory);
                }
            }
            filtered.forEach(function (e, i) {
                e.setAttribute("weight", (200 - i).toString());
            });
            return newCategory;
        }
        function injectBlockDefinition(info, fn, params, blockXml) {
            var id = fn.attributes.blockId;
            if (builtinBlocks[id]) {
                pxt.reportError("blocks", 'trying to override builtin block', { "details": id });
                return false;
            }
            var hash = JSON.stringify(fn);
            if (cachedBlocks[id] && cachedBlocks[id].hash == hash) {
                return true;
            }
            if (Blockly.Blocks[fn.attributes.blockId]) {
                console.error("duplicate block definition: " + id);
                return false;
            }
            var cachedBlock = {
                hash: hash,
                fn: fn,
                block: {
                    codeCard: mkCard(fn, blockXml),
                    init: function () { initBlock(this, info, fn, params); }
                }
            };
            cachedBlocks[id] = cachedBlock;
            Blockly.Blocks[id] = cachedBlock.block;
            return true;
        }
        function initField(i, ni, fn, ns, pre, right, type, nsinfo) {
            if (pre && pre.indexOf('`') > -1) {
                // parse and create icon fields for every inline icon
                var regex = /([^`]+|(`([^`]+)`))/gi;
                var match = void 0;
                while (match = regex.exec(pre)) {
                    var img = void 0;
                    if (match[3] && (img = iconToFieldImage(match[3]))) {
                        i.appendField(img);
                    }
                    else {
                        i.appendField(match[1]);
                    }
                }
            }
            else if (pre)
                i.appendField(pre);
            if (right)
                i.setAlign(Blockly.ALIGN_LEFT);
            // Ignore generic types
            if (type && type != "T") {
                if (arrayTypeRegex.test(type)) {
                    // All array types get the same check regardless of their subtype
                    i.setCheck("Array");
                }
                else {
                    i.setCheck(type);
                }
            }
            return i;
        }
        function cleanOuterHTML(el) {
            // remove IE11 junk
            return el.outerHTML.replace(/^<\?[^>]*>/, '');
        }
        function mkCard(fn, blockXml) {
            return {
                name: fn.namespace + '.' + fn.name,
                shortName: fn.name,
                description: fn.attributes.jsDoc,
                url: fn.attributes.help ? 'reference/' + fn.attributes.help.replace(/^\//, '') : undefined,
                blocksXml: "<xml xmlns=\"http://www.w3.org/1999/xhtml\">" + cleanOuterHTML(blockXml) + "</xml>",
            };
        }
        function isSubtype(apis, specific, general) {
            if (specific == general)
                return true;
            var inf = apis.byQName[specific];
            if (inf && inf.extendsTypes)
                return inf.extendsTypes.indexOf(general) >= 0;
            return false;
        }
        function initBlock(block, info, fn, params) {
            var _this = this;
            var attrNames = params.attrNames, handlerArgs = params.handlerArgs;
            var ns = (fn.attributes.blockNamespace || fn.namespace).split('.')[0];
            var instance = fn.kind == pxtc.SymbolKind.Method || fn.kind == pxtc.SymbolKind.Property;
            var nsinfo = info.apis.byQName[ns];
            var color = fn.attributes.color
                || (nsinfo ? nsinfo.attributes.color : undefined)
                || getNamespaceColor(ns.toLowerCase())
                || 255;
            if (fn.attributes.help)
                block.setHelpUrl("/reference/" + fn.attributes.help.replace(/^\//, ''));
            else if (fn.pkg && !pxt.appTarget.bundledpkgs[fn.pkg]) {
                var anchor = fn.qName.toLowerCase().split('.');
                if (anchor[0] == fn.pkg)
                    anchor.shift();
                block.setHelpUrl("/pkg/" + fn.pkg + "#" + encodeURIComponent(anchor.join('-')));
            }
            block.setTooltip(fn.attributes.jsDoc);
            block.setColour(color, fn.attributes.colorSecondary, fn.attributes.colorTertiary);
            var blockShape = Blockly.OUTPUT_SHAPE_ROUND;
            if (fn.retType == "boolean")
                blockShape = Blockly.OUTPUT_SHAPE_HEXAGONAL;
            block.setOutputShape(blockShape);
            if (fn.attributes.undeletable)
                block.setDeletable(false);
            blocks_6.parseFields(fn.attributes.block).map(function (field) {
                var i;
                if (!field.p) {
                    i = initField(block.appendDummyInput(), field.ni, fn, nsinfo, field.n);
                }
                else {
                    // find argument
                    var pre = field.pre;
                    var p_1 = field.p;
                    var n = Object.keys(attrNames).filter(function (k) { return attrNames[k].name == p_1; })[0];
                    if (!n) {
                        console.error("block " + fn.attributes.blockId + ": unkown parameter " + p_1);
                        return;
                    }
                    var pr_1 = attrNames[n];
                    var typeInfo_1 = pxt.U.lookup(info.apis.byQName, pr_1.type);
                    var isEnum_1 = typeInfo_1 && typeInfo_1.kind == pxtc.SymbolKind.Enum;
                    var isFixed = typeInfo_1 && !!typeInfo_1.attributes.fixedInstances && !pr_1.shadowType;
                    var customField = (fn.attributes.paramFieldEditor && fn.attributes.paramFieldEditor[p_1]);
                    var fieldLabel = pr_1.name.charAt(0).toUpperCase() + pr_1.name.slice(1);
                    var fieldType = pr_1.type;
                    if (isEnum_1 || isFixed) {
                        var syms = pxt.Util.values(info.apis.byQName)
                            .filter(function (e) {
                            return isEnum_1 ? e.namespace == pr_1.type
                                : (e.kind == pxtc.SymbolKind.Variable
                                    && e.attributes.fixedInstance
                                    && isSubtype(info.apis, e.retType, typeInfo_1.qName));
                        });
                        if (syms.length == 0) {
                            console.error("no instances of " + typeInfo_1.qName + " found");
                        }
                        var dd = syms.map(function (v) {
                            var k = v.attributes.block || v.attributes.blockId || v.name;
                            return [
                                v.attributes.iconURL || v.attributes.blockImage ? {
                                    src: v.attributes.iconURL || pxt.Util.pathJoin(pxt.webConfig.commitCdnUrl, "blocks/" + v.namespace.toLowerCase() + "/" + v.name.toLowerCase() + ".png"),
                                    alt: k,
                                    width: 36,
                                    height: 36,
                                    value: v.name
                                } : k,
                                v.namespace + "." + v.name
                            ];
                        });
                        i = initField(block.appendDummyInput(), field.ni, fn, nsinfo, pre, true);
                        // if a value is provided, move it first
                        if (pr_1.shadowValue) {
                            var shadowValueIndex_1 = -1;
                            dd.some(function (v, i) {
                                if (v[1] === pr_1.shadowValue) {
                                    shadowValueIndex_1 = i;
                                    return true;
                                }
                                return false;
                            });
                            if (shadowValueIndex_1 > -1) {
                                var shadowValue = dd.splice(shadowValueIndex_1, 1)[0];
                                dd.unshift(shadowValue);
                            }
                        }
                        if (customField) {
                            var defl = fn.attributes.paramDefl[pr_1.name] || "";
                            var options_1 = {
                                data: dd,
                                colour: color,
                                label: fieldLabel,
                                type: fieldType
                            };
                            pxt.Util.jsonMergeFrom(options_1, fn.attributes.paramFieldEditorOptions && fn.attributes.paramFieldEditorOptions[pr_1.name] || {});
                            i.appendField(blocks_6.createFieldEditor(customField, defl, options_1), attrNames[n].name);
                        }
                        else
                            i.appendField(new Blockly.FieldDropdown(dd), attrNames[n].name);
                    }
                    else if (customField) {
                        i = initField(block.appendDummyInput(), field.ni, fn, nsinfo, pre, true);
                        var defl = fn.attributes.paramDefl[pr_1.name] || "";
                        var options_2 = {
                            colour: color,
                            label: fieldLabel,
                            type: fieldType
                        };
                        pxt.Util.jsonMergeFrom(options_2, fn.attributes.paramFieldEditorOptions && fn.attributes.paramFieldEditorOptions[pr_1.name] || {});
                        i.appendField(blocks_6.createFieldEditor(customField, defl, options_2), attrNames[n].name);
                    }
                    else if (instance && n == "this") {
                        if (!fn.attributes.defaultInstance) {
                            i = initField(block.appendValueInput(p_1), field.ni, fn, nsinfo, pre, true, pr_1.type);
                        }
                    }
                    else if (pr_1.type == "number") {
                        if (pr_1.shadowType && pr_1.shadowType == "value") {
                            i = block.appendDummyInput();
                            if (pre)
                                i.appendField(pre);
                            i.appendField(new Blockly.FieldTextInput("0", Blockly.FieldTextInput.numberValidator), p_1);
                        }
                        else
                            i = initField(block.appendValueInput(p_1), field.ni, fn, nsinfo, pre, true, "Number");
                    }
                    else if (pr_1.type == "boolean") {
                        i = initField(block.appendValueInput(p_1), field.ni, fn, nsinfo, pre, true, "Boolean");
                    }
                    else if (pr_1.type == "string") {
                        i = initField(block.appendValueInput(p_1), field.ni, fn, nsinfo, pre, true, "String");
                    }
                    else {
                        i = initField(block.appendValueInput(p_1), field.ni, fn, nsinfo, pre, true, pr_1.type);
                    }
                }
            });
            var hasHandler = false;
            if (handlerArgs.length) {
                hasHandler = true;
                if (fn.attributes.optionalVariableArgs) {
                    initVariableArgsBlock(block, handlerArgs);
                }
                else {
                    var i_2 = block.appendDummyInput();
                    handlerArgs.forEach(function (arg) {
                        i_2.appendField(new Blockly.FieldVariable(arg.name), "HANDLER_" + arg.name);
                    });
                }
            }
            if (fn.attributes.mutate) {
                blocks_6.addMutation(block, fn, fn.attributes.mutate);
            }
            else if (fn.attributes.defaultInstance) {
                blocks_6.addMutation(block, fn, blocks_6.MutatorTypes.DefaultInstanceMutator);
            }
            var oldMutationToDom = block.mutationToDom;
            var oldDomToMutation = block.domToMutation;
            block.mutationToDom = function () {
                var retVal = oldMutationToDom ? oldMutationToDom.call(_this) : document.createElement('mutation');
                block.inputList.forEach(function (input) {
                    input.fieldRow.forEach(function (fieldRow) {
                        if (fieldRow.isFieldCustom_ && fieldRow.saveOptions) {
                            var getOptions = fieldRow.saveOptions();
                            retVal.setAttribute("customfield", JSON.stringify(getOptions));
                        }
                    });
                });
                return retVal;
            };
            block.domToMutation = function (mutation) {
                if (oldDomToMutation)
                    oldDomToMutation.call(_this, mutation);
                block.inputList.forEach(function (input) {
                    input.fieldRow.forEach(function (fieldRow) {
                        if (fieldRow.isFieldCustom_ && fieldRow.restoreOptions) {
                            var options_3 = JSON.parse(mutation.getAttribute("customfield"));
                            fieldRow.restoreOptions(options_3);
                        }
                    });
                });
            };
            if (fn.attributes.imageLiteral) {
                for (var r = 0; r < 5; ++r) {
                    var ri = block.appendDummyInput();
                    for (var c = 0; c < fn.attributes.imageLiteral * 5; ++c) {
                        if (c > 0 && c % 5 == 0)
                            ri.appendField("  ");
                        else if (c > 0)
                            ri.appendField(" ");
                        ri.appendField(new Blockly.FieldCheckbox("FALSE"), "LED" + c + r);
                    }
                }
            }
            if (fn.attributes.inlineInputMode === "external") {
                block.setInputsInline(false);
            }
            else if (fn.attributes.inlineInputMode === "inline") {
                block.setInputsInline(true);
            }
            else {
                block.setInputsInline(fn.parameters.length < 4 && !fn.attributes.imageLiteral);
            }
            var body = fn.parameters ? fn.parameters.filter(function (pr) { return pr.type == "() => void"; })[0] : undefined;
            if (body || hasHandler) {
                block.appendStatementInput("HANDLER")
                    .setCheck("null");
                block.setInputsInline(true);
            }
            switch (fn.retType) {
                case "number":
                    block.setOutput(true, "Number");
                    break;
                case "string":
                    block.setOutput(true, "String");
                    break;
                case "boolean":
                    block.setOutput(true, "Boolean");
                    break;
                case "void": break; // do nothing
                //TODO
                default:
                    if (arrayTypeRegex.test(fn.retType)) {
                        block.setOutput(true, "Array");
                    }
                    else {
                        block.setOutput(true, fn.retType !== "T" ? fn.retType : undefined);
                    }
            }
            // hook up/down if return value is void
            var hasHandlers = hasArrowFunction(fn);
            block.setPreviousStatement(!(hasHandlers && !fn.attributes.handlerStatement) && fn.retType == "void");
            block.setNextStatement(!(hasHandlers && !fn.attributes.handlerStatement) && fn.retType == "void");
            block.setTooltip(fn.attributes.jsDoc);
        }
        function hasArrowFunction(fn) {
            var r = fn.parameters
                ? fn.parameters.filter(function (pr) { return /^\([^\)]*\)\s*=>/.test(pr.type); })[0]
                : undefined;
            return !!r;
        }
        blocks_6.hasArrowFunction = hasArrowFunction;
        function removeCategory(tb, name) {
            var e = categoryElement(tb, name);
            if (e && e.parentNode)
                e.parentNode.removeChild(e);
        }
        function initVariableArgsBlock(b, handlerArgs) {
            pxt.U.assert(!b.domToMutation);
            pxt.U.assert(!b.mutationToDom);
            var currentlyVisible = 0;
            var actuallyVisible = 0;
            var i = b.appendDummyInput();
            var updateShape = function () {
                if (currentlyVisible === actuallyVisible) {
                    return;
                }
                if (currentlyVisible > actuallyVisible) {
                    var diff = currentlyVisible - actuallyVisible;
                    for (var j = 0; j < diff; j++) {
                        var arg = handlerArgs[actuallyVisible + j];
                        i.insertFieldAt(i.fieldRow.length - 1, new Blockly.FieldVariable(arg.name), "HANDLER_" + arg.name);
                    }
                }
                else {
                    var diff = actuallyVisible - currentlyVisible;
                    for (var j = 0; j < diff; j++) {
                        var arg = handlerArgs[actuallyVisible - j - 1];
                        i.removeField("HANDLER_" + arg.name);
                    }
                }
                if (currentlyVisible >= handlerArgs.length) {
                    i.removeField("_HANDLER_ADD");
                }
                else if (actuallyVisible >= handlerArgs.length) {
                    addPlusButton();
                }
                actuallyVisible = currentlyVisible;
            };
            Blockly.Extensions.apply('inline-svgs', b, false);
            addPlusButton();
            b.domToMutation = function (element) {
                var numArgs = parseInt(element.getAttribute("numargs"));
                currentlyVisible = Math.min(isNaN(numArgs) ? 0 : numArgs, handlerArgs.length);
                updateShape();
                for (var j = 0; j < currentlyVisible; j++) {
                    var varName = element.getAttribute("arg" + j);
                    b.setFieldValue(varName, "HANDLER_" + handlerArgs[j].name);
                }
            };
            b.mutationToDom = function () {
                var mut = document.createElement("mutation");
                mut.setAttribute("numArgs", currentlyVisible.toString());
                for (var j = 0; j < currentlyVisible; j++) {
                    var varName = b.getFieldValue("HANDLER_" + handlerArgs[j].name);
                    mut.setAttribute("arg" + j, varName);
                }
                return mut;
            };
            function addPlusButton() {
                i.appendField(new Blockly.FieldImage(b.ADD_IMAGE_DATAURI, 24, 24, false, lf("Add argument"), function () {
                    currentlyVisible = Math.min(currentlyVisible + 1, handlerArgs.length);
                    updateShape();
                }), "_HANDLER_ADD");
            }
        }
        var FilterState;
        (function (FilterState) {
            FilterState[FilterState["Hidden"] = 0] = "Hidden";
            FilterState[FilterState["Visible"] = 1] = "Visible";
            FilterState[FilterState["Disabled"] = 2] = "Disabled";
        })(FilterState = blocks_6.FilterState || (blocks_6.FilterState = {}));
        function createToolbox(blockInfo, toolbox, showCategories, filters, extensions) {
            if (showCategories === void 0) { showCategories = CategoryMode.Basic; }
            init();
            // create new toolbox and update block definitions
            var tb = toolbox ? toolbox.cloneNode(true) : undefined;
            blockInfo.blocks.sort(function (f1, f2) {
                var ns1 = blockInfo.apis.byQName[f1.attributes.blockNamespace || f1.namespace.split('.')[0]];
                var ns2 = blockInfo.apis.byQName[f2.attributes.blockNamespace || f2.namespace.split('.')[0]];
                if (ns1 && !ns2)
                    return -1;
                if (ns2 && !ns1)
                    return 1;
                var c = 0;
                if (ns1 && ns2) {
                    c = (ns2.attributes.weight || 50) - (ns1.attributes.weight || 50);
                    if (c != 0)
                        return c;
                }
                c = (f2.attributes.weight || 50) - (f1.attributes.weight || 50);
                return c;
            });
            searchElementCache = {};
            usedBlocks = {};
            var currentBlocks = {};
            var showAdvanced = false;
            var dbg = pxt.options.debug;
            // create new toolbox and update block definitions
            blockInfo.blocks
                .filter(function (fn) { return !tb || !blocks_6.getFirstChildWithAttr(tb, "block", "type", fn.attributes.blockId); })
                .forEach(function (fn) {
                if (fn.attributes.blockBuiltin) {
                    pxt.Util.assert(!!builtinBlocks[fn.attributes.blockId]);
                    builtinBlocks[fn.attributes.blockId].symbol = fn;
                }
                else {
                    var pnames = blocks_6.parameterNames(fn);
                    var block = createToolboxBlock(blockInfo, fn, pnames);
                    if (injectBlockDefinition(blockInfo, fn, pnames, block)) {
                        if (tb && (!fn.attributes.debug || dbg))
                            injectToolbox(tb, blockInfo, fn, block, showCategories, pnames);
                        currentBlocks[fn.attributes.blockId] = 1;
                        if (!showAdvanced && !fn.attributes.blockHidden && !fn.attributes.deprecated) {
                            var ns = (fn.attributes.blockNamespace || fn.namespace).split('.')[0];
                            var nsn = blockInfo.apis.byQName[ns];
                            showAdvanced = showAdvanced || (nsn && nsn.attributes.advanced);
                        }
                    }
                }
            });
            // remove unused blocks
            Object
                .keys(cachedBlocks).filter(function (k) { return !currentBlocks[k]; })
                .forEach(function (k) { return removeBlock(cachedBlocks[k].fn); });
            // add extra blocks
            if (tb && pxt.appTarget.runtime) {
                var extraBlocks = pxt.appTarget.runtime.extraBlocks || [];
                extraBlocks.push({
                    namespace: pxt.appTarget.runtime.onStartNamespace || "loops",
                    weight: pxt.appTarget.runtime.onStartWeight || 10,
                    type: ts.pxtc.ON_START_TYPE
                });
                extraBlocks.forEach(function (eb) {
                    var el = document.createElement("block");
                    el.setAttribute("type", eb.type);
                    el.setAttribute("weight", (eb.weight || 50).toString());
                    if (eb.gap)
                        el.setAttribute("gap", eb.gap.toString());
                    if (eb.fields) {
                        for (var f in eb.fields) {
                            var fe = document.createElement("field");
                            fe.setAttribute("name", f);
                            fe.appendChild(document.createTextNode(eb.fields[f]));
                            el.appendChild(fe);
                        }
                    }
                    if (showCategories !== CategoryMode.None) {
                        var cat = categoryElement(tb, eb.namespace);
                        if (cat) {
                            insertBlock(el, cat, eb.weight);
                        }
                        else {
                            console.error("trying to add block " + eb.type + " to unknown category " + eb.namespace);
                        }
                    }
                    else {
                        tb.appendChild(el);
                    }
                });
            }
            // Add extension categories
            if (tb && extensions && extensions.length > 0) {
                // Add extensions buttons
                extensions.forEach(function (config) {
                    var name = config.name;
                    var color = config.extension.color || '#7f8c8d';
                    var label = config.extension.label ? pxt.Util.rlf(config.extension.label) : pxt.Util.lf("Editor");
                    var button = goog.dom.createDom('button');
                    button.setAttribute('text', label);
                    button.setAttribute('callbackkey', "EXT" + name + "_BUTTON");
                    var namespace = config.extension.namespace || name;
                    var isAdvanced = config.extension.advanced || false;
                    var insertButtonAtTop = function (button, cat) {
                        var first;
                        for (var i = 0; i < cat.childNodes.length; i++) {
                            var n = cat.childNodes.item(i);
                            if (n.tagName === "block") {
                                first = n;
                                break;
                            }
                        }
                        if (first) {
                            cat.insertBefore(button, first);
                        }
                        else {
                            cat.appendChild(button);
                        }
                    };
                    if (showCategories !== CategoryMode.None) {
                        if (showCategories === CategoryMode.All || showCategories == CategoryMode.Basic && !isAdvanced) {
                            var cat = categoryElement(tb, namespace);
                            if (cat) {
                                insertButtonAtTop(button, cat);
                            }
                            else {
                                // Create a new category
                                var cat_1 = createCategoryElement(pxt.Util.rlf("{id:category}" + name), name, 55, color, 'blocklyTreeIconextensions');
                                insertTopLevelCategory(cat_1, tb, 55, false);
                                insertButtonAtTop(button, cat_1);
                            }
                        }
                    }
                    else {
                        tb.appendChild(button);
                    }
                });
            }
            if (tb && showCategories !== CategoryMode.None) {
                // remove unused categories
                var config = pxt.appTarget.runtime || {};
                initBuiltinCategoryXml("Math", !config.mathBlocks);
                initBuiltinCategoryXml("Variables", !config.variablesBlocks);
                initBuiltinCategoryXml("Logic", !config.logicBlocks);
                initBuiltinCategoryXml("Loops", !config.loopsBlocks);
                initBuiltinCategoryXml("Text", !config.textBlocks);
                initBuiltinCategoryXml("Arrays", !config.listsBlocks);
                initBuiltinCategoryXml("Functions", !config.functionBlocks);
                if (!config.listsBlocks && config.loopsBlocks) {
                    var cat = categoryElement(tb, "Loops");
                    if (cat) {
                        cat.removeChild(blocks_6.getFirstChildWithAttr(cat, "block", "type", "controls_for_of"));
                    }
                }
                // Inject optional builtin blocks into categories
                if (pxt.appTarget.runtime) {
                    var rt = pxt.appTarget.runtime;
                    maybeInsertBuiltinBlock(tb, mkPredicateBlock(pxtc.PAUSE_UNTIL_TYPE), rt.pauseUntilBlock);
                }
                // Load localized names for default categories
                var cats = tb.getElementsByTagName('category');
                for (var i = 0; i < cats.length; i++) {
                    cats[i].setAttribute('name', pxt.Util.rlf("{id:category}" + cats[i].getAttribute('name'), []));
                    // Append Namespace CSS
                    appendNamespaceCss(cats[i].getAttribute('name'), cats[i].getAttribute('colour'));
                }
                // update category colors and add heading
                var topCats = blocks_6.getDirectChildren(tb, "category");
                for (var i = 0; i < topCats.length; i++) {
                    var nsColor = getNamespaceColor(topCats[i].getAttribute('nameid'));
                    if (nsColor && nsColor != "") {
                        topCats[i].setAttribute('colour', nsColor);
                        // Update subcategory colours
                        var subCats = getChildCategories(topCats[i]);
                        for (var j = 0; j < subCats.length; j++) {
                            subCats[j].setAttribute('colour', nsColor);
                        }
                    }
                    if (!pxt.appTarget.appTheme.hideFlyoutHeadings) {
                        // Add the Heading label
                        var headingLabel = goog.dom.createDom('label');
                        headingLabel.setAttribute('text', topCats[i].getAttribute('name'));
                        headingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
                        headingLabel.setAttribute('web-icon-color', topCats[i].getAttribute('colour'));
                        var icon = topCats[i].getAttribute('web-icon');
                        var iconClass = topCats[i].getAttribute('web-icon-class');
                        if (icon) {
                            if (icon.length === 1) {
                                headingLabel.setAttribute('web-icon', icon);
                                if (iconClass)
                                    headingLabel.setAttribute('web-icon-class', iconClass);
                            }
                            else {
                                toolboxStyleBuffer += "\n                                .blocklyFlyoutLabelIcon.blocklyFlyoutIcon" + topCats[i].getAttribute('name') + " {\n                                    display: inline-block !important;\n                                    background-image: url(\"" + pxt.Util.pathJoin(pxt.webConfig.commitCdnUrl, encodeURI(icon)) + "\")!important;\n                                    width: 1em;\n                                    height: 1em;\n                                    background-size: 1em!important;\n                                }\n                            ";
                                injectToolboxIconCss();
                                headingLabel.setAttribute('web-icon-class', "blocklyFlyoutIcon" + topCats[i].getAttribute('name'));
                            }
                        }
                        topCats[i].insertBefore(headingLabel, topCats[i].firstChild);
                        // Add subcategory labels
                        var subCats = getChildCategories(topCats[i]);
                        for (var j = 0; j < subCats.length; j++) {
                            var subHeadingLabel = goog.dom.createDom('label');
                            subHeadingLabel.setAttribute('text', topCats[i].getAttribute('name') + " > " + subCats[j].getAttribute('name'));
                            subHeadingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
                            subHeadingLabel.setAttribute('web-icon-color', topCats[i].getAttribute('colour'));
                            subCats[j].insertBefore(subHeadingLabel, subCats[j].firstChild);
                            if (icon) {
                                if (icon.length == 1) {
                                    subHeadingLabel.setAttribute('web-icon', icon);
                                    if (iconClass)
                                        subHeadingLabel.setAttribute('web-icon-class', iconClass);
                                }
                                else {
                                    subHeadingLabel.setAttribute('web-icon-class', "blocklyFlyoutIcon" + topCats[i].getAttribute('name'));
                                }
                            }
                        }
                    }
                }
            }
            // Do not remove this comment.
            // These are used for category names.
            // lf("{id:category}Loops")
            // lf("{id:category}Logic")
            // lf("{id:category}Variables")
            // lf("{id:category}Math")
            // lf("{id:category}Advanced")
            // lf("{id:category}Functions")
            // lf("{id:category}Arrays")
            // lf("{id:category}Text")
            // lf("{id:category}Search")
            // lf("{id:category}More\u2026")
            // update shadow types
            if (tb) {
                $(tb).find('shadow:empty').each(function (i, shadow) {
                    var type = shadow.getAttribute('type');
                    var b = $(tb).find("block[type=\"" + type + "\"]")[0];
                    if (b)
                        shadow.innerHTML = b.innerHTML;
                });
            }
            // Add the "Advanced" category
            if (showAdvanced && tb && showCategories !== CategoryMode.None) {
                var cat = createCategoryElement(advancedTitle(), "Advanced", 1, getNamespaceColor('advanced'), showCategories === CategoryMode.Basic ? 'blocklyTreeIconadvancedcollapsed' : 'blocklyTreeIconadvancedexpanded');
                insertTopLevelCategory(document.createElement("sep"), tb, 1.5, false);
                insertTopLevelCategory(cat, tb, 1, false);
            }
            if (tb && (!showAdvanced || showCategories === CategoryMode.All) && pxt.appTarget.cloud && pxt.appTarget.cloud.packages) {
                if (!showAdvanced) {
                    insertTopLevelCategory(document.createElement("sep"), tb, 1.5, false);
                }
                // Add the "Add package" category
                getOrAddSubcategoryByWeight(tb, addPackageTitle(), "Extensions", 1, "#717171", 'blocklyTreeIconaddpackage');
            }
            if (tb) {
                var blocks_7 = tb.getElementsByTagName("block");
                for (var i = 0; i < blocks_7.length; i++) {
                    usedBlocks[blocks_7.item(i).getAttribute("type")] = true;
                }
                updateUsedBlocks = true;
            }
            // Filter the blocks
            if (tb && filters) {
                function filterBlocks(blocks, defaultState) {
                    var hasChild = false;
                    for (var bi = 0; bi < blocks.length; ++bi) {
                        var blk = blocks.item(bi);
                        var type = blk.getAttribute("type");
                        var blockState = filters.blocks && filters.blocks[type] != undefined ? filters.blocks[type] : (defaultState != undefined ? defaultState : filters.defaultState);
                        switch (blockState) {
                            case FilterState.Hidden:
                                blk.parentNode.removeChild(blk);
                                --bi;
                                break;
                            case FilterState.Disabled:
                                blk.setAttribute("disabled", "true");
                                break;
                            case FilterState.Visible:
                                hasChild = true;
                                break;
                        }
                    }
                    return hasChild;
                }
                if (showCategories !== CategoryMode.None) {
                    // Go through namespaces and keep the ones with an override
                    var categories = tb.getElementsByTagName("category");
                    for (var ci = 0; ci < categories.length; ++ci) {
                        var cat = categories.item(ci);
                        var catName = cat.getAttribute("nameid");
                        if (catName === "more" || catName === "advanced") {
                            continue;
                        }
                        // The variables category is special and won't have any children so we
                        // need to check manually
                        if (catName === "variables" && (!filters.blocks ||
                            filters.blocks["variables_set"] ||
                            filters.blocks["variables_get"] ||
                            filters.blocks["variables_change"]) &&
                            (!filters.namespaces || filters.namespaces["variables"] !== FilterState.Disabled)) {
                            continue;
                        }
                        var categoryState = filters.namespaces && filters.namespaces[catName] != undefined ? filters.namespaces[catName] : filters.defaultState;
                        var blocks_8 = cat.getElementsByTagName("block");
                        var hasVisibleChildren = (catName == "variables" && filters.blocks)
                            ? filters.blocks["variables_get"] || filters.blocks["variables_set"]
                            : filterBlocks(blocks_8, categoryState);
                        switch (categoryState) {
                            case FilterState.Disabled:
                                if (!hasVisibleChildren) {
                                    cat.setAttribute("disabled", "true");
                                    // disable sub categories
                                    var subcategories = cat.getElementsByTagName("category");
                                    for (var si = 0; si < subcategories.length; ++si) {
                                        subcategories.item(si).setAttribute("disabled", "true");
                                    }
                                }
                                break;
                            case FilterState.Visible:
                            case FilterState.Hidden:
                                if (!hasVisibleChildren) {
                                    cat.parentNode.removeChild(cat);
                                    --ci;
                                }
                                break;
                        }
                    }
                    // If advanced has no children, remove the category
                    for (var ci = 0; ci < categories.length; ++ci) {
                        var cat = categories.item(ci);
                        var catName = cat.getAttribute("nameid");
                        if (catName == "advanced" && cat.childNodes.length == 0) {
                            cat.parentNode.removeChild(cat);
                            --ci;
                            // Remove separator
                            var sep = tb.getElementsByTagName("sep")[0];
                            sep.parentNode.removeChild(sep);
                        }
                        else {
                            continue;
                        }
                    }
                }
                else {
                    var blocks_9 = tb.getElementsByTagName("block");
                    filterBlocks(blocks_9);
                }
                if (showCategories !== CategoryMode.None) {
                    // Go through all categories, hide the ones that have no blocks inside
                    var categories = tb.getElementsByTagName("category");
                    for (var ci = 0; ci < categories.length; ++ci) {
                        var cat = categories.item(ci);
                        var catName = cat.getAttribute("nameid");
                        // Don't do this for special blockly categories
                        if (catName == "variables" || catName == "functions" || catName == "advanced")
                            continue;
                        var blockCount = cat.getElementsByTagName("block");
                        if (blockCount.length == 0) {
                            if (cat.parentNode)
                                cat.parentNode.removeChild(cat);
                        }
                    }
                }
            }
            // Rearrange blocks in the flyout and add group labels
            if (tb) {
                var categories = tb.getElementsByTagName("category");
                var _loop_1 = function (ci) {
                    var cat = categories.item(ci);
                    var catName = cat.getAttribute("nameid");
                    if (catName === "advanced")
                        return "continue";
                    var blocks_10 = blocks_6.getDirectChildren(cat, "block");
                    var groups = cat.getAttribute("groups");
                    var labelLineWidth = cat.getAttribute("labellinewidth");
                    var blockGroups = {};
                    var sortedGroups = [];
                    if (groups)
                        sortedGroups = groups.split(', ');
                    // Organize the blocks into the different groups
                    for (var bi = 0; bi < blocks_10.length; ++bi) {
                        var blk = blocks_10[bi];
                        var group = blk.getAttribute("group") || 'other';
                        if (!blockGroups[group])
                            blockGroups[group] = [];
                        blockGroups[group].push(blk);
                    }
                    if (Object.keys(blockGroups).length > 1) {
                        // Add any missing groups to the sorted groups list
                        Object.keys(blockGroups).sort().forEach(function (group) {
                            if (sortedGroups.indexOf(group) == -1) {
                                sortedGroups.push(group);
                            }
                        });
                        // Add the blocks to the xmlList
                        var xmlList_1 = [];
                        for (var bg = 0; bg < sortedGroups.length; ++bg) {
                            var group = sortedGroups[bg];
                            // Check if there are any blocks in that group
                            if (!blockGroups[group] || !blockGroups[group].length)
                                continue;
                            // Add the group label
                            if (group != 'other') {
                                var groupLabel = goog.dom.createDom('label');
                                groupLabel.setAttribute('text', pxt.Util.rlf("{id:group}" + group));
                                groupLabel.setAttribute('web-class', 'blocklyFlyoutGroup');
                                groupLabel.setAttribute('web-line', '1.5');
                                if (labelLineWidth)
                                    groupLabel.setAttribute('web-line-width', labelLineWidth);
                                xmlList_1.push(groupLabel);
                            }
                            // Add the blocks in that group
                            if (blockGroups[group])
                                blockGroups[group].forEach(function (groupedBlock) {
                                    cat.removeChild(groupedBlock);
                                    xmlList_1.push(groupedBlock);
                                });
                        }
                        // Add the blocks back into the category
                        xmlList_1.forEach(function (arrangedBlock) {
                            cat.appendChild(arrangedBlock);
                        });
                    }
                };
                for (var ci = 0; ci < categories.length; ++ci) {
                    _loop_1(ci);
                }
            }
            return tb;
            function initBuiltinCategoryXml(name, remove) {
                if (remove) {
                    removeCategory(tb, name);
                    return;
                }
                var cat = categoryElement(tb, name);
                if (cat) {
                    var attr = cat.getAttribute("advanced");
                    if (attr && attr !== "false") {
                        showAdvanced = true;
                        // Record all block usages in case this category doesn't show up
                        // in the toolbox (i.e. advanced is collapsed)
                        var blockElements = cat.getElementsByTagName("block");
                        for (var i = 0; i < blockElements.length; i++) {
                            var b = blockElements.item(i);
                            usedBlocks[b.getAttribute("type")] = true;
                        }
                        if (showCategories === CategoryMode.Basic) {
                            removeCategory(tb, name);
                        }
                    }
                }
            }
        }
        blocks_6.createToolbox = createToolbox;
        function maybeInsertBuiltinBlock(toolbox, block, options) {
            if (!options || !options.category)
                return;
            var cat = categoryElement(toolbox, options.category || "Loops");
            if (!cat)
                return;
            var weight = options.weight == null ? 0 : options.weight;
            insertBlock(block, cat, weight, options.group);
        }
        function initBlocks(blockInfo, toolbox, showCategories, filters, extensions) {
            if (showCategories === void 0) { showCategories = CategoryMode.Basic; }
            init();
            initTooltip(blockInfo);
            initJresIcons(blockInfo);
            var tb = createToolbox(blockInfo, toolbox, showCategories, filters, extensions);
            // add trash icon to toolbox
            if (!document.getElementById("blocklyTrashIcon")) {
                var trashDiv = document.createElement('div');
                trashDiv.id = "blocklyTrashIcon";
                trashDiv.style.opacity = '0';
                trashDiv.style.display = 'none';
                var trashIcon = document.createElement('i');
                trashIcon.className = 'trash icon';
                trashDiv.appendChild(trashIcon);
                var injectionDiv = document.getElementsByClassName('injectionDiv')[0];
                if (injectionDiv)
                    injectionDiv.appendChild(trashDiv);
            }
            return tb;
        }
        blocks_6.initBlocks = initBlocks;
        function initSearch(workspace, tb, tbAll, searchAsync, updateToolbox) {
            var blocklySearchInputField = document.getElementById('blocklySearchInputField');
            var blocklySearchInput = document.getElementById('blocklySearchInput');
            var blocklyHiddenSearchLabel = document.getElementById('blocklySearchLabel');
            var origClassName = 'ui fluid icon input';
            if (!blocklySearchInput) {
                var blocklySearchArea = document.createElement('div');
                blocklySearchArea.id = 'blocklySearchArea';
                blocklySearchInput = document.createElement('div');
                blocklySearchInput.id = 'blocklySearchInput';
                blocklySearchInput.className = origClassName;
                blocklySearchInput.setAttribute("role", "search");
                blocklySearchInputField = document.createElement('input');
                blocklySearchInputField.type = 'text';
                blocklySearchInputField.placeholder = lf("Search...");
                blocklySearchInputField.id = 'blocklySearchInputField';
                blocklySearchInputField.className = 'blocklySearchInputField';
                // Append to dom
                var blocklySearchInputIcon = document.createElement('i');
                blocklySearchInputIcon.className = 'search icon';
                blocklySearchInputIcon.setAttribute("role", "presentation");
                blocklySearchInputIcon.setAttribute("aria-hidden", "true");
                blocklyHiddenSearchLabel = document.createElement('div');
                blocklyHiddenSearchLabel.className = 'accessible-hidden';
                blocklyHiddenSearchLabel.id = 'blocklySearchLabel';
                blocklyHiddenSearchLabel.setAttribute('aria-live', "polite");
                blocklySearchInput.appendChild(blocklySearchInputField);
                blocklySearchInput.appendChild(blocklySearchInputIcon);
                blocklySearchInput.appendChild(blocklyHiddenSearchLabel);
                blocklySearchArea.appendChild(blocklySearchInput);
                var toolboxDiv = document.getElementsByClassName('blocklyToolboxDiv')[0];
                if (toolboxDiv)
                    toolboxDiv.insertBefore(blocklySearchArea, toolboxDiv.firstChild);
            }
            var hasSearchFlyout = function () {
                return document.getElementsByClassName('blocklyTreeIconsearch').length > 0;
            };
            var showSearchFlyout = function () {
                var tree = workspace.toolbox_.tree_;
                // Show the search flyout
                tree.setSelectedItem(tree.getChildren()[0]);
            };
            pxt.blocks.cachedSearchTb = tb;
            pxt.blocks.cachedSearchTbAll = tbAll;
            var previousSearchTerm = '';
            var searchChangeHandler = pxt.Util.debounce(function () {
                var searchField = document.getElementById('blocklySearchInputField');
                var searchFor = searchField.value.toLowerCase();
                var blocklyHiddenSearchLabel = document.getElementById('blocklySearchLabel');
                blocklyHiddenSearchLabel.textContent = "";
                if (searchFor != '') {
                    blocklySearchInput.className += ' loading';
                    previousSearchTerm = searchFor;
                    pxt.tickEvent("blocks.search");
                    var searchTb_1 = pxt.blocks.cachedSearchTb ? pxt.blocks.cachedSearchTb.cloneNode(true) : undefined;
                    var catName = 'Search';
                    var category_2 = categoryElement(searchTb_1, catName);
                    if (!category_2) {
                        var categories = getChildCategories(searchTb_1);
                        var parentCategoryList = searchTb_1;
                        var nsWeight = 101; // Show search category on top
                        category_2 = createCategoryElement(lf("{id:category}Search"), catName, nsWeight);
                        category_2.setAttribute("colour", '#000');
                        category_2.setAttribute("iconclass", 'blocklyTreeIconsearch');
                        category_2.setAttribute("expandedclass", 'blocklyTreeIconsearch');
                        // Insert the category based on weight
                        var ci = 0;
                        for (ci = 0; ci < categories.length; ++ci) {
                            var cat = categories[ci];
                            if (parseInt(cat.getAttribute("weight") || "50") < nsWeight) {
                                parentCategoryList.insertBefore(category_2, cat);
                                break;
                            }
                        }
                        if (ci == categories.length)
                            parentCategoryList.appendChild(category_2);
                    }
                    searchAsync({ term: searchFor, subset: updateUsedBlocks ? usedBlocks : undefined }).then(function (blocks) {
                        pxt.log("searching for: " + searchFor);
                        updateUsedBlocks = false;
                        if (!blocks)
                            return;
                        if (blocks.length == 0) {
                            blocklyHiddenSearchLabel.textContent = lf("No search results...");
                        }
                        else {
                            blocklyHiddenSearchLabel.textContent = lf("{0} result matching '{1}'", blocks.length, blocklySearchInputField.value.toLowerCase());
                        }
                        if (blocks.length == 0) {
                            var label = goog.dom.createDom('label');
                            label.setAttribute('text', lf("No search results..."));
                            category_2.appendChild(label);
                            return;
                        }
                        blocks.forEach(function (info) {
                            if (pxt.blocks.cachedSearchTbAll) {
                                var type = info.id;
                                var block = searchElementCache[type];
                                if (!block) {
                                    // Catches built-in blocks that aren't loaded dynamically
                                    var existing = blocks_6.getFirstChildWithAttr(pxt.blocks.cachedSearchTbAll, "block", "type", type);
                                    if (existing) {
                                        block = (searchElementCache[type] = existing.cloneNode(true));
                                    }
                                }
                                if (block) {
                                    category_2.appendChild(block);
                                }
                            }
                        });
                    }).finally(function () {
                        if (tb) {
                            updateToolbox(searchTb_1);
                            blocklySearchInput.className = origClassName;
                            showSearchFlyout();
                        }
                    });
                }
                else if (previousSearchTerm != '') {
                    // Clearing search
                    updateToolbox(pxt.blocks.cachedSearchTb);
                    blocklySearchInput.className = origClassName;
                }
                // Search
            }, 300, false);
            blocklySearchInputField.oninput = searchChangeHandler;
            blocklySearchInputField.onfocus = function () {
                blocklySearchInputField.select();
                var searchFor = blocklySearchInputField.value.toLowerCase();
                if (searchFor != '') {
                    if (hasSearchFlyout())
                        showSearchFlyout();
                    else {
                        previousSearchTerm = '';
                        searchChangeHandler();
                    }
                }
            };
            if (pxt.BrowserUtils.isTouchEnabled()) {
                blocklySearchInputField.ontouchstart = function () {
                    blocklySearchInputField.focus();
                };
            }
            // Override Blockly's toolbox keydown method to intercept characters typed and move the focus to the search input
            Blockly.Toolbox.TreeNode.prototype.onKeyDown = function (e) {
                var keyCode = e.which || e.keyCode;
                var characterKey = (keyCode > 64 && keyCode < 91); // Letter keys
                var spaceEnterKey = keyCode == 32 || keyCode == 13; // Spacebar or Enter keys
                var ctrlCmdKey = (e.ctrlKey || e.metaKey); // Ctrl / Cmd keys
                if (characterKey && !ctrlCmdKey) {
                    var searchField = document.getElementById('blocklySearchInputField');
                    var char = String.fromCharCode(keyCode);
                    searchField.focus();
                    searchField.value = searchField.value + char;
                    return true;
                }
                else {
                    if (this.getTree() && this.getTree().toolbox_.horizontalLayout_) {
                        var map = {};
                        var next = goog.events.KeyCodes.DOWN;
                        var prev = goog.events.KeyCodes.UP;
                        map[goog.events.KeyCodes.RIGHT] = this.rightToLeft_ ? prev : next;
                        map[goog.events.KeyCodes.LEFT] = this.rightToLeft_ ? next : prev;
                        map[goog.events.KeyCodes.UP] = goog.events.KeyCodes.LEFT;
                        map[goog.events.KeyCodes.DOWN] = goog.events.KeyCodes.RIGHT;
                        var newKeyCode = map[e.keyCode];
                        e.keyCode = newKeyCode || e.keyCode;
                    }
                    return Blockly.Toolbox.TreeNode.superClass_.onKeyDown.call(this, e);
                }
            };
        }
        blocks_6.initSearch = initSearch;
        function removeSearch() {
            var blocklySearchArea = document.getElementById('blocklySearchArea');
            if (blocklySearchArea) {
                blocklySearchArea.parentNode.removeChild(blocklySearchArea);
            }
        }
        blocks_6.removeSearch = removeSearch;
        function categoryElement(tb, nameid) {
            return tb ? blocks_6.getFirstChildWithAttr(tb, "category", "nameid", nameid.toLowerCase()) : undefined;
        }
        function cleanBlocks() {
            pxt.debug('removing all custom blocks');
            for (var b in cachedBlocks)
                removeBlock(cachedBlocks[b].fn);
        }
        blocks_6.cleanBlocks = cleanBlocks;
        function removeBlock(fn) {
            delete Blockly.Blocks[fn.attributes.blockId];
            delete cachedBlocks[fn.attributes.blockId];
        }
        var blocklyInitialized = false;
        function init() {
            if (blocklyInitialized)
                return;
            blocklyInitialized = true;
            goog.provide('Blockly.Blocks.device');
            goog.require('Blockly.Blocks');
            if (window.PointerEvent) {
                document.body.style.touchAction = 'none';
            }
            Blockly.FieldCheckbox.CHECK_CHAR = '■';
            Blockly.BlockSvg.START_HAT = !!pxt.appTarget.appTheme.blockHats;
            blocks_6.initFieldEditors();
            initContextMenu();
            initOnStart();
            initMath();
            initVariables();
            initFunctions();
            initLists();
            initLoops();
            initLogic();
            initText();
            initDrag();
        }
        function setBuiltinHelpInfo(block, id) {
            var info = pxt.blocks.getBlockDefinition(id);
            setHelpResources(block, id, info.name, info.tooltip, info.url, getNamespaceColor(info.category));
        }
        function installBuiltinHelpInfo(id) {
            var info = pxt.blocks.getBlockDefinition(id);
            installHelpResources(id, info.name, info.tooltip, info.url, getNamespaceColor(info.category));
        }
        function setHelpResources(block, id, name, tooltip, url, colour, colourSecondary, colourTertiary, undeletable) {
            if (tooltip && (typeof tooltip === "string" || typeof tooltip === "function"))
                block.setTooltip(tooltip);
            if (url)
                block.setHelpUrl(url);
            if (colour)
                block.setColour(colour, colourSecondary, colourTertiary);
            if (undeletable)
                block.setDeletable(false);
            var tb = document.getElementById('blocklyToolboxDefinition');
            var xml = tb ? blocks_6.getFirstChildWithAttr(tb, "block", "type", id) : undefined;
            block.codeCard = {
                header: name,
                name: name,
                software: 1,
                description: goog.isFunction(tooltip) ? tooltip(block) : tooltip,
                blocksXml: xml ? ("<xml xmlns=\"http://www.w3.org/1999/xhtml\">" + (cleanOuterHTML(xml) || "<block type=\"" + id + "\"></block>") + "</xml>") : undefined,
                url: url
            };
        }
        function installHelpResources(id, name, tooltip, url, colour, colourSecondary, colourTertiary) {
            var block = Blockly.Blocks[id];
            var old = block.init;
            if (!old)
                return;
            block.init = function () {
                old.call(this);
                var block = this;
                setHelpResources(this, id, name, tooltip, url, colour, colourSecondary, colourTertiary);
            };
        }
        function initLists() {
            var msg = Blockly.Msg;
            // lists_create_with
            var listsCreateWithId = "lists_create_with";
            var listsCreateWithDef = pxt.blocks.getBlockDefinition(listsCreateWithId);
            msg.LISTS_CREATE_EMPTY_TITLE = listsCreateWithDef.block["LISTS_CREATE_EMPTY_TITLE"];
            msg.LISTS_CREATE_WITH_INPUT_WITH = listsCreateWithDef.block["LISTS_CREATE_WITH_INPUT_WITH"];
            msg.LISTS_CREATE_WITH_CONTAINER_TITLE_ADD = listsCreateWithDef.block["LISTS_CREATE_WITH_CONTAINER_TITLE_ADD"];
            msg.LISTS_CREATE_WITH_ITEM_TITLE = listsCreateWithDef.block["LISTS_CREATE_WITH_ITEM_TITLE"];
            installBuiltinHelpInfo(listsCreateWithId);
            // lists_length
            var listsLengthId = "lists_length";
            var listsLengthDef = pxt.blocks.getBlockDefinition(listsLengthId);
            msg.LISTS_LENGTH_TITLE = listsLengthDef.block["LISTS_LENGTH_TITLE"];
            // We have to override this block definition because the builtin block
            // allows both Strings and Arrays in its input check and that confuses
            // our Blockly compiler
            var block = Blockly.Blocks[listsLengthId];
            block.init = function () {
                this.jsonInit({
                    "message0": msg.LISTS_LENGTH_TITLE,
                    "args0": [
                        {
                            "type": "input_value",
                            "name": "VALUE",
                            "check": ['Array']
                        }
                    ],
                    "output": 'Number'
                });
            };
            installBuiltinHelpInfo(listsLengthId);
        }
        function initLoops() {
            var msg = Blockly.Msg;
            // controls_repeat_ext
            var controlsRepeatExtId = "controls_repeat_ext";
            var controlsRepeatExtDef = pxt.blocks.getBlockDefinition(controlsRepeatExtId);
            msg.CONTROLS_REPEAT_TITLE = controlsRepeatExtDef.block["CONTROLS_REPEAT_TITLE"];
            msg.CONTROLS_REPEAT_INPUT_DO = controlsRepeatExtDef.block["CONTROLS_REPEAT_INPUT_DO"];
            installBuiltinHelpInfo(controlsRepeatExtId);
            // device_while
            var deviceWhileId = "device_while";
            var deviceWhileDef = pxt.blocks.getBlockDefinition(deviceWhileId);
            Blockly.Blocks[deviceWhileId] = {
                init: function () {
                    this.jsonInit({
                        "message0": deviceWhileDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "COND",
                                "check": "Boolean"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": getNamespaceColor('loops')
                    });
                    this.appendStatementInput("DO")
                        .appendField(deviceWhileDef.block["appendField"]);
                    setBuiltinHelpInfo(this, deviceWhileId);
                }
            };
            // controls_simple_for
            var controlsSimpleForId = "controls_simple_for";
            var controlsSimpleForDef = pxt.blocks.getBlockDefinition(controlsSimpleForId);
            Blockly.Blocks[controlsSimpleForId] = {
                /**
                 * Block for 'for' loop.
                 * @this Blockly.Block
                 */
                init: function () {
                    this.jsonInit({
                        "message0": controlsSimpleForDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": controlsSimpleForDef.block["variable"]
                                // Please note that most multilingual characters
                                // cannot be used as variable name at this point.
                                // Translate or decide the default variable name
                                // with care.
                            },
                            {
                                "type": "input_value",
                                "name": "TO",
                                "check": "Number"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": getNamespaceColor('loops'),
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(controlsSimpleForDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, controlsSimpleForId, controlsSimpleForDef.name, function () {
                        return pxt.U.rlf(controlsSimpleForDef.tooltip, thisBlock.getFieldValue('VAR'));
                    }, controlsSimpleForDef.url, String(getNamespaceColor('loops')));
                },
                /**
                 * Return all variables referenced by this block.
                 * @return {!Array.<string>} List of variable names.
                 * @this Blockly.Block
                 */
                getVars: function () {
                    return [this.getFieldValue('VAR')];
                },
                /**
                 * Notification that a variable is renaming.
                 * If the name matches one of this block's variables, rename it.
                 * @param {string} oldName Previous name of variable.
                 * @param {string} newName Renamed variable.
                 * @this Blockly.Block
                 */
                renameVar: function (oldName, newName) {
                    if (Blockly.Names.equals(oldName, this.getFieldValue('VAR'))) {
                        this.setFieldValue(newName, 'VAR');
                    }
                },
                /**
                 * Add menu option to create getter block for loop variable.
                 * @param {!Array} options List of menu options to add to.
                 * @this Blockly.Block
                 */
                customContextMenu: function (options) {
                    if (!this.isCollapsed()) {
                        var option = { enabled: true };
                        var name_1 = this.getFieldValue('VAR');
                        option.text = lf("Create 'get {0}'", name_1);
                        var xmlField = goog.dom.createDom('field', null, name_1);
                        xmlField.setAttribute('name', 'VAR');
                        var xmlBlock = goog.dom.createDom('block', null, xmlField);
                        xmlBlock.setAttribute('type', 'variables_get');
                        option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
                        options.push(option);
                    }
                }
            };
        }
        blocks_6.onShowContextMenu = undefined;
        /**
         * The following patch to blockly is to add the Trash icon on top of the toolbox,
         * the trash icon should only show when a user drags a block that is already in the workspace.
         */
        function initDrag() {
            var calculateDistance = function (elemBounds, mouseX) {
                return Math.abs(mouseX - (elemBounds.left + (elemBounds.width / 2)));
            };
            /**
             * Execute a step of block dragging, based on the given event.  Update the
             * display accordingly.
             * @param {!Event} e The most recent move event.
             * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
             *     moved from the position at the start of the drag, in pixel units.
             * @package
             */
            var blockDrag = Blockly.BlockDragger.prototype.dragBlock;
            Blockly.BlockDragger.prototype.dragBlock = function (e, currentDragDeltaXY) {
                var blocklyToolboxDiv = document.getElementsByClassName('blocklyToolboxDiv')[0];
                var blocklyTreeRoot = document.getElementsByClassName('blocklyTreeRoot')[0];
                var trashIcon = document.getElementById("blocklyTrashIcon");
                if (blocklyTreeRoot && trashIcon) {
                    var distance = calculateDistance(blocklyTreeRoot.getBoundingClientRect(), e.clientX);
                    if (distance < 200) {
                        var opacity = distance / 200;
                        trashIcon.style.opacity = "" + (1 - opacity);
                        trashIcon.style.display = 'block';
                        blocklyTreeRoot.style.opacity = "" + opacity;
                        if (distance < 50) {
                            blocklyToolboxDiv.classList.add('blocklyToolboxDeleting');
                        }
                    }
                    else {
                        trashIcon.style.display = 'none';
                        blocklyTreeRoot.style.opacity = '1';
                        blocklyToolboxDiv.classList.remove('blocklyToolboxDeleting');
                    }
                }
                return blockDrag.call(this, e, currentDragDeltaXY);
            };
            /**
             * Finish dragging the workspace and put everything back where it belongs.
             * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
             *     moved from the position at the start of the drag, in pixel coordinates.
             * @package
             */
            var blockEndDrag = Blockly.BlockDragger.prototype.endBlockDrag;
            Blockly.BlockDragger.prototype.endBlockDrag = function (e, currentDragDeltaXY) {
                blockEndDrag.call(this, e, currentDragDeltaXY);
                var blocklyToolboxDiv = document.getElementsByClassName('blocklyToolboxDiv')[0];
                var blocklyTreeRoot = document.getElementsByClassName('blocklyTreeRoot')[0];
                var trashIcon = document.getElementById("blocklyTrashIcon");
                if (trashIcon && blocklyTreeRoot) {
                    trashIcon.style.display = 'none';
                    blocklyTreeRoot.style.opacity = '1';
                    blocklyToolboxDiv.classList.remove('blocklyToolboxDeleting');
                }
            };
        }
        function initContextMenu() {
            // Translate the context menu for blocks.
            var msg = Blockly.Msg;
            msg.DUPLICATE_BLOCK = lf("{id:block}Duplicate");
            msg.REMOVE_COMMENT = lf("Remove Comment");
            msg.ADD_COMMENT = lf("Add Comment");
            msg.EXTERNAL_INPUTS = lf("External Inputs");
            msg.INLINE_INPUTS = lf("Inline Inputs");
            msg.EXPAND_BLOCK = lf("Expand Block");
            msg.COLLAPSE_BLOCK = lf("Collapse Block");
            msg.ENABLE_BLOCK = lf("Enable Block");
            msg.DISABLE_BLOCK = lf("Disable Block");
            msg.DELETE_BLOCK = lf("Delete Block");
            msg.DELETE_X_BLOCKS = lf("Delete All Blocks");
            msg.HELP = lf("Help");
            // inject hook to handle openings docs
            Blockly.BlockSvg.prototype.showHelp_ = function () {
                var url = goog.isFunction(this.helpUrl) ? this.helpUrl() : this.helpUrl;
                if (url)
                    (pxt.blocks.openHelpUrl || window.open)(url);
            };
            /**
             * Show the context menu for the workspace.
             * @param {!Event} e Mouse event.
             * @private
             */
            Blockly.WorkspaceSvg.prototype.showContextMenu_ = function (e) {
                var _this = this;
                if (this.options.readOnly || this.isFlyout) {
                    return;
                }
                var menuOptions = [];
                var topBlocks = this.getTopBlocks(true);
                var eventGroup = Blockly.utils.genUid();
                // Add a little animation to collapsing and expanding.
                var DELAY = 10;
                if (this.options.collapse) {
                    var hasCollapsedBlocks = false;
                    var hasExpandedBlocks = false;
                    for (var i = 0; i < topBlocks.length; i++) {
                        var block = topBlocks[i];
                        while (block) {
                            if (block.isCollapsed()) {
                                hasCollapsedBlocks = true;
                            }
                            else {
                                hasExpandedBlocks = true;
                            }
                            block = block.getNextBlock();
                        }
                    }
                    /**
                     * Option to collapse or expand top blocks.
                     * @param {boolean} shouldCollapse Whether a block should collapse.
                     * @private
                     */
                    var toggleOption_1 = function (shouldCollapse) {
                        var ms = 0;
                        for (var i = 0; i < topBlocks.length; i++) {
                            var block = topBlocks[i];
                            while (block) {
                                setTimeout(block.setCollapsed.bind(block, shouldCollapse), ms);
                                block = block.getNextBlock();
                                ms += DELAY;
                            }
                        }
                    };
                    // Option to collapse top blocks.
                    var collapseOption = { enabled: hasExpandedBlocks };
                    collapseOption.text = lf("Collapse Block");
                    collapseOption.callback = function () {
                        pxt.tickEvent("blocks.context.collapse");
                        toggleOption_1(true);
                    };
                    menuOptions.push(collapseOption);
                    // Option to expand top blocks.
                    var expandOption = { enabled: hasCollapsedBlocks };
                    expandOption.text = lf("Expand Block");
                    expandOption.callback = function () {
                        pxt.tickEvent("blocks.context.expand");
                        toggleOption_1(false);
                    };
                    menuOptions.push(expandOption);
                }
                // Option to delete all blocks.
                // Count the number of blocks that are deletable.
                var deleteList = [];
                function addDeletableBlocks(block) {
                    if (block.isDeletable()) {
                        deleteList = deleteList.concat(block.getDescendants());
                    }
                    else {
                        var children = block.getChildren();
                        for (var i = 0; i < children.length; i++) {
                            addDeletableBlocks(children[i]);
                        }
                    }
                }
                for (var i = 0; i < topBlocks.length; i++) {
                    addDeletableBlocks(topBlocks[i]);
                }
                function deleteNext() {
                    Blockly.Events.setGroup(eventGroup);
                    var block = deleteList.shift();
                    if (block) {
                        if (block.workspace) {
                            block.dispose(false, true);
                            setTimeout(deleteNext, DELAY);
                        }
                        else {
                            deleteNext();
                        }
                    }
                    Blockly.Events.setGroup(false);
                }
                var deleteOption = {
                    text: deleteList.length == 1 ? lf("Delete Block") :
                        lf("Delete All Blocks", deleteList.length),
                    enabled: deleteList.length > 0,
                    callback: function () {
                        pxt.tickEvent("blocks.context.delete");
                        if (deleteList.length < 2 ||
                            window.confirm(lf("Delete all {0} blocks?", deleteList.length))) {
                            deleteNext();
                        }
                    }
                };
                menuOptions.push(deleteOption);
                var formatCodeOption = {
                    text: lf("Format Code"),
                    enabled: true,
                    callback: function () {
                        pxt.tickEvent("blocks.context.format");
                        pxt.blocks.layout.flow(_this, { useViewWidth: true });
                    }
                };
                menuOptions.push(formatCodeOption);
                if (pxt.blocks.layout.screenshotEnabled()) {
                    var screenshotOption = {
                        text: lf("Download Screenshot"),
                        enabled: topBlocks.length > 0,
                        callback: function () {
                            pxt.tickEvent("blocks.context.screenshot");
                            pxt.blocks.layout.screenshotAsync(_this)
                                .done(function (uri) {
                                if (pxt.BrowserUtils.isSafari())
                                    uri = uri.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
                                pxt.BrowserUtils.browserDownloadDataUri(uri, (pxt.appTarget.nickname || pxt.appTarget.id) + "-" + lf("screenshot") + ".png");
                            });
                        }
                    };
                    menuOptions.push(screenshotOption);
                }
                // custom options...
                if (blocks_6.onShowContextMenu)
                    blocks_6.onShowContextMenu(this, menuOptions);
                Blockly.ContextMenu.show(e, menuOptions, this.RTL);
            };
            // We override Blockly's category mouse event handler so that only one
            // category can be expanded at a time. Also prevent categories from toggling
            // once openend.
            Blockly.Toolbox.TreeNode.prototype.onClick_ = function (a) {
                // Expand icon.
                var that = this;
                if (!that.isSelected()) {
                    // Collapse the currently selected node and its parent nodes
                    collapseSubcategories(that.getTree().getSelectedItem(), that);
                }
                if (that.hasChildren() && that.isUserCollapsible_) {
                    if (that.isSelected()) {
                        collapseSubcategories(that.getTree().getSelectedItem(), that);
                        that.getTree().setSelectedItem(null);
                    }
                    else {
                        that.setExpanded(true);
                        that.select();
                    }
                }
                else if (that.isSelected()) {
                    that.getTree().setSelectedItem(null);
                }
                else {
                    that.select();
                }
                that.updateRow();
            };
            // We also must override this handler to handle the case where no category is selected (e.g. clicking outside the toolbox)
            var oldSetSelectedItem = Blockly.Toolbox.TreeControl.prototype.setSelectedItem;
            var editor = this;
            Blockly.Toolbox.TreeControl.prototype.setSelectedItem = function (a) {
                var that = this;
                var toolbox = that.toolbox_;
                if (a == that.selectedItem_ || a == toolbox.tree_) {
                    return;
                }
                var oldSelectedItem = that.selectedItem_;
                oldSetSelectedItem.call(that, a);
                if (a === null) {
                    collapseSubcategories(oldSelectedItem);
                }
            };
            // TODO: look into porting this code over to pxt-blockly
            // Fix highlighting bug in edge
            Blockly.Flyout.prototype.addBlockListeners_ = function (root, block, rect) {
                this.listeners_.push(Blockly.bindEventWithChecks_(root, 'mousedown', null, this.blockMouseDown_(block)));
                this.listeners_.push(Blockly.bindEventWithChecks_(rect, 'mousedown', null, this.blockMouseDown_(block)));
                this.listeners_.push(Blockly.bindEvent_(root, 'mouseover', block, block.addSelect));
                this.listeners_.push(Blockly.bindEvent_(root, 'mouseout', block, block.removeSelect));
                this.listeners_.push(Blockly.bindEvent_(rect, 'mouseover', block, block.addSelect));
                this.listeners_.push(Blockly.bindEvent_(rect, 'mouseout', block, block.removeSelect));
                var that = this;
                function select() {
                    if (that._selectedItem && that._selectedItem.svgGroup_) {
                        that._selectedItem.removeSelect();
                    }
                    that._selectedItem = block;
                    that._selectedItem.addSelect();
                }
            };
        }
        function collapseSubcategories(cat, child) {
            while (cat) {
                if (cat.isUserCollapsible_ && cat.getTree() && cat != child && (!child || !isChild(child, cat))) {
                    cat.setExpanded(false);
                    cat.updateRow();
                }
                cat = cat.getParent();
            }
        }
        function isChild(child, parent) {
            var myParent = child.getParent();
            if (myParent) {
                return myParent === parent || isChild(myParent, parent);
            }
            return false;
        }
        function initOnStart() {
            // on_start
            var onStartDef = pxt.blocks.getBlockDefinition(ts.pxtc.ON_START_TYPE);
            Blockly.Blocks[ts.pxtc.ON_START_TYPE] = {
                init: function () {
                    this.jsonInit({
                        "message0": onStartDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_dummy"
                            },
                            {
                                "type": "input_statement",
                                "name": "HANDLER"
                            }
                        ],
                        "colour": (pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartColor : '') || getNamespaceColor('loops')
                    });
                    setHelpResources(this, ts.pxtc.ON_START_TYPE, onStartDef.name, onStartDef.tooltip, onStartDef.url, String((pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartColor : '') || getNamespaceColor('loops')), undefined, undefined, pxt.appTarget.runtime ? pxt.appTarget.runtime.onStartUnDeletable : false);
                }
            };
            Blockly.Blocks[pxtc.TS_STATEMENT_TYPE] = {
                init: function () {
                    var _this = this;
                    var that = this;
                    that.setColour("#717171");
                    that.setPreviousStatement(true);
                    that.setNextStatement(true);
                    that.setInputsInline(false);
                    this.domToMutation = function (element) {
                        var n = parseInt(element.getAttribute("numlines"));
                        _this.declaredVariables = element.getAttribute("declaredvars");
                        for (var i = 0; i < n; i++) {
                            var line = element.getAttribute("line" + i);
                            that.appendDummyInput().appendField(line, "LINE" + i);
                        }
                    };
                    this.mutationToDom = function () {
                        var mutation = document.createElement("mutation");
                        var i = 0;
                        while (true) {
                            var val = that.getFieldValue("LINE" + i);
                            if (val === null) {
                                break;
                            }
                            mutation.setAttribute("line" + i, val);
                            i++;
                        }
                        mutation.setAttribute("numlines", i.toString());
                        if (_this.declaredVariables) {
                            mutation.setAttribute("declaredvars", _this.declaredVariables);
                        }
                        return mutation;
                    };
                    that.setEditable(false);
                    setHelpResources(this, pxtc.TS_STATEMENT_TYPE, lf("JavaScript statement"), lf("A JavaScript statement that could not be converted to blocks"), '/blocks/javascript-blocks', '#717171');
                }
            };
            Blockly.Blocks[pxtc.TS_OUTPUT_TYPE] = {
                init: function () {
                    var that = this;
                    that.setColour("#717171");
                    that.setPreviousStatement(false);
                    that.setNextStatement(false);
                    that.setOutput(true);
                    that.setEditable(false);
                    that.appendDummyInput().appendField(new pxtblockly.FieldTsExpression(""), "EXPRESSION");
                    setHelpResources(that, pxtc.TS_OUTPUT_TYPE, lf("JavaScript expression"), lf("A JavaScript expression that could not be converted to blocks"), '/blocks/javascript-blocks', "#717171");
                }
            };
            if (pxt.appTarget.runtime && pxt.appTarget.runtime.pauseUntilBlock) {
                var blockOptions_1 = pxt.appTarget.runtime.pauseUntilBlock;
                var blockDef_1 = pxt.blocks.getBlockDefinition(ts.pxtc.PAUSE_UNTIL_TYPE);
                Blockly.Blocks[pxtc.PAUSE_UNTIL_TYPE] = {
                    init: function () {
                        var color = blockOptions_1.color || getNamespaceColor('loops');
                        this.jsonInit({
                            "message0": blockDef_1.block["message0"],
                            "args0": [
                                {
                                    "type": "input_value",
                                    "name": "PREDICATE",
                                    "check": "Boolean"
                                }
                            ],
                            "inputsInline": true,
                            "previousStatement": null,
                            "nextStatement": null,
                            "colour": color
                        });
                        setHelpResources(this, ts.pxtc.PAUSE_UNTIL_TYPE, blockDef_1.name, blockDef_1.tooltip, blockDef_1.url, color, undefined /*colourSecondary*/, undefined /*colourTertiary*/, false /*undeletable*/);
                    }
                };
            }
            // controls_for_of
            var controlsForOfId = "controls_for_of";
            var controlsForOfDef = pxt.blocks.getBlockDefinition(controlsForOfId);
            Blockly.Blocks[controlsForOfId] = {
                init: function () {
                    this.jsonInit({
                        "message0": controlsForOfDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": controlsForOfDef.block["variable"]
                                // Please note that most multilingual characters
                                // cannot be used as variable name at this point.
                                // Translate or decide the default variable name
                                // with care.
                            },
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": blocks_6.blockColors['loops'],
                        "inputsInline": true
                    });
                    this.appendStatementInput('DO')
                        .appendField(controlsForOfDef.block["appendField"]);
                    var thisBlock = this;
                    setHelpResources(this, controlsForOfId, controlsForOfDef.name, function () {
                        return pxt.U.rlf(controlsForOfDef.tooltip, thisBlock.getFieldValue('VAR'));
                    }, controlsForOfDef.url, String(getNamespaceColor('loops')));
                }
            };
            // lists_index_get
            var listsIndexGetId = "lists_index_get";
            var listsIndexGetDef = pxt.blocks.getBlockDefinition(listsIndexGetId);
            Blockly.Blocks["lists_index_get"] = {
                init: function () {
                    this.jsonInit({
                        "message0": listsIndexGetDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            },
                            {
                                "type": "input_value",
                                "name": "INDEX",
                                "check": "Number"
                            }
                        ],
                        "colour": blocks_6.blockColors['arrays'],
                        "inputsInline": true
                    });
                    this.setPreviousStatement(false);
                    this.setNextStatement(false);
                    this.setOutput(true);
                    setBuiltinHelpInfo(this, listsIndexGetId);
                }
            };
            // lists_index_set
            var listsIndexSetId = "lists_index_set";
            var listsIndexSetDef = pxt.blocks.getBlockDefinition(listsIndexSetId);
            Blockly.Blocks[listsIndexSetId] = {
                init: function () {
                    this.jsonInit({
                        "message0": listsIndexSetDef.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "LIST",
                                "check": "Array"
                            },
                            {
                                "type": "input_value",
                                "name": "INDEX",
                                "check": "Number"
                            },
                            {
                                "type": "input_value",
                                "name": "VALUE",
                                "check": null
                            }
                        ],
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": blocks_6.blockColors['arrays'],
                        "inputsInline": true
                    });
                    setBuiltinHelpInfo(this, listsIndexSetId);
                }
            };
        }
        function initMath() {
            // math_op2
            var mathOp2Id = "math_op2";
            var mathOp2Def = pxt.blocks.getBlockDefinition(mathOp2Id);
            var mathOp2Tooltips = mathOp2Def.tooltip;
            Blockly.Blocks[mathOp2Id] = {
                init: function () {
                    this.jsonInit({
                        "message0": lf("%1 of %2 and %3"),
                        "args0": [
                            {
                                "type": "field_dropdown",
                                "name": "op",
                                "options": [
                                    [lf("{id:op}min"), "min"],
                                    [lf("{id:op}max"), "max"]
                                ]
                            },
                            {
                                "type": "input_value",
                                "name": "x",
                                "check": "Number"
                            },
                            {
                                "type": "input_value",
                                "name": "y",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "output": "Number",
                        "colour": getNamespaceColor('math')
                    });
                    var thisBlock = this;
                    setHelpResources(this, mathOp2Id, mathOp2Def.name, function (block) {
                        return mathOp2Tooltips[block.getFieldValue('op')];
                    }, mathOp2Def.url, getNamespaceColor(mathOp2Def.category));
                }
            };
            // math_op3
            var mathOp3Id = "math_op3";
            var mathOp3Def = pxt.blocks.getBlockDefinition(mathOp3Id);
            Blockly.Blocks[mathOp3Id] = {
                init: function () {
                    this.jsonInit({
                        "message0": mathOp3Def.block["message0"],
                        "args0": [
                            {
                                "type": "input_value",
                                "name": "x",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "output": "Number",
                        "colour": getNamespaceColor('math')
                    });
                    setBuiltinHelpInfo(this, mathOp3Id);
                }
            };
            // builtin math_number
            //XXX Integer validation needed.
            var mInfo = pxt.blocks.getBlockDefinition("math_number");
            installHelpResources('math_number', mInfo.name, (pxt.appTarget.compile && pxt.appTarget.compile.floatingPoint) ? lf("a decimal number") : lf("an integer number"), mInfo.url, Blockly.Colours.textField, Blockly.Colours.textField, Blockly.Colours.textField);
            // builtin math_number_minmax
            //XXX Integer validation needed.
            var mMInfo = pxt.blocks.getBlockDefinition("math_number_minmax");
            installHelpResources('math_number_minmax', mMInfo.name, (pxt.appTarget.compile && pxt.appTarget.compile.floatingPoint) ? lf("a decimal number") : lf("an integer number"), mMInfo.url, Blockly.Colours.textField, Blockly.Colours.textField, Blockly.Colours.textField);
            // builtin math_arithmetic
            var msg = Blockly.Msg;
            var mathArithmeticId = "math_arithmetic";
            var mathArithmeticDef = pxt.blocks.getBlockDefinition(mathArithmeticId);
            var mathArithmeticTooltips = mathArithmeticDef.tooltip;
            msg.MATH_ADDITION_SYMBOL = mathArithmeticDef.block["MATH_ADDITION_SYMBOL"];
            msg.MATH_SUBTRACTION_SYMBOL = mathArithmeticDef.block["MATH_SUBTRACTION_SYMBOL"];
            msg.MATH_MULTIPLICATION_SYMBOL = mathArithmeticDef.block["MATH_MULTIPLICATION_SYMBOL"];
            msg.MATH_DIVISION_SYMBOL = mathArithmeticDef.block["MATH_DIVISION_SYMBOL"];
            msg.MATH_POWER_SYMBOL = mathArithmeticDef.block["MATH_POWER_SYMBOL"];
            installHelpResources(mathArithmeticId, mathArithmeticDef.name, function (block) {
                return mathArithmeticTooltips[block.getFieldValue('OP')];
            }, mathArithmeticDef.url, getNamespaceColor(mathArithmeticDef.category));
            // builtin math_modulo
            var mathModuloId = "math_modulo";
            var mathModuloDef = pxt.blocks.getBlockDefinition(mathModuloId);
            msg.MATH_MODULO_TITLE = mathModuloDef.block["MATH_MODULO_TITLE"];
            installBuiltinHelpInfo(mathModuloId);
        }
        function getNamespaceColor(ns) {
            if (pxt.appTarget.appTheme.blockColors && pxt.appTarget.appTheme.blockColors[ns])
                return pxt.appTarget.appTheme.blockColors[ns];
            if (blocks_6.blockColors[ns])
                return blocks_6.blockColors[ns];
            return "";
        }
        blocks_6.getNamespaceColor = getNamespaceColor;
        function initFlyouts(workspace) {
            workspace.registerToolboxCategoryCallback(Blockly.VARIABLE_CATEGORY_NAME, Blockly.Variables.flyoutCategory);
            workspace.registerToolboxCategoryCallback(Blockly.PROCEDURE_CATEGORY_NAME, Blockly.Procedures.flyoutCategory);
        }
        blocks_6.initFlyouts = initFlyouts;
        function initExtensions(workspace, extensions, callBack) {
            extensions.forEach(function (config) {
                var name = config.name;
                workspace.registerButtonCallback("EXT" + name + "_BUTTON", function (button) {
                    callBack(name);
                });
            });
        }
        blocks_6.initExtensions = initExtensions;
        function initVariables() {
            var varname = lf("{id:var}item");
            Blockly.Variables.flyoutCategory = function (workspace) {
                var xmlList = [];
                if (!pxt.appTarget.appTheme.hideFlyoutHeadings) {
                    // Add the Heading label
                    var headingLabel = goog.dom.createDom('label');
                    headingLabel.setAttribute('text', lf("Variables"));
                    headingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
                    headingLabel.setAttribute('web-icon', '\uf039');
                    headingLabel.setAttribute('web-icon-color', getNamespaceColor('variables'));
                    xmlList.push(headingLabel);
                }
                var button = goog.dom.createDom('button');
                button.setAttribute('text', lf("Make a Variable"));
                button.setAttribute('callbackkey', 'CREATE_VARIABLE');
                workspace.registerButtonCallback('CREATE_VARIABLE', function (button) {
                    Blockly.Variables.createVariable(button.getTargetWorkspace());
                });
                xmlList.push(button);
                var blockList = Blockly.Variables.flyoutCategoryBlocks(workspace);
                xmlList = xmlList.concat(blockList);
                return xmlList;
            };
            Blockly.Variables.flyoutCategoryBlocks = function (workspace) {
                var variableModelList = workspace.getVariablesOfType('');
                variableModelList.sort(Blockly.VariableModel.compareByName);
                // In addition to the user's variables, we also want to display the default
                // variable name at the top.  We also don't want this duplicated if the
                // user has created a variable of the same name.
                for (var i = 0, tempVar = void 0; tempVar = variableModelList[i]; i++) {
                    if (tempVar.name == varname) {
                        variableModelList.splice(i, 1);
                        break;
                    }
                }
                var defaultVar = new Blockly.VariableModel(workspace, varname);
                variableModelList.unshift(defaultVar);
                var xmlList = [];
                if (variableModelList.length > 0) {
                    // variables getters first
                    for (var i = 0, variable = void 0; variable = variableModelList[i]; i++) {
                        if (Blockly.Blocks['variables_get']) {
                            var blockText = '<xml>' +
                                '<block type="variables_get" gap="8">' +
                                Blockly.Variables.generateVariableFieldXml_(variable) +
                                '</block>' +
                                '</xml>';
                            var block = Blockly.Xml.textToDom(blockText).firstChild;
                            xmlList.push(block);
                        }
                    }
                    xmlList[xmlList.length - 1].setAttribute('gap', '24');
                    var firstVariable = variableModelList[0];
                    if (Blockly.Blocks['variables_set']) {
                        var gap = Blockly.Blocks['variables_change'] ? 8 : 24;
                        var blockText = '<xml>' +
                            '<block type="variables_set" gap="' + gap + '">' +
                            Blockly.Variables.generateVariableFieldXml_(firstVariable) +
                            '</block>' +
                            '</xml>';
                        var block = Blockly.Xml.textToDom(blockText).firstChild;
                        {
                            var value = goog.dom.createDom('value');
                            value.setAttribute('name', 'VALUE');
                            var shadow = goog.dom.createDom('shadow');
                            shadow.setAttribute("type", "math_number");
                            value.appendChild(shadow);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NUM');
                            field.appendChild(document.createTextNode("0"));
                            shadow.appendChild(field);
                            block.appendChild(value);
                        }
                        xmlList.push(block);
                    }
                    if (Blockly.Blocks['variables_change']) {
                        var gap = Blockly.Blocks['variables_get'] ? 20 : 8;
                        var blockText = '<xml>' +
                            '<block type="variables_change" gap="' + gap + '">' +
                            Blockly.Variables.generateVariableFieldXml_(firstVariable) +
                            '<value name="DELTA">' +
                            '<shadow type="math_number">' +
                            '<field name="NUM">1</field>' +
                            '</shadow>' +
                            '</value>' +
                            '</block>' +
                            '</xml>';
                        var block = Blockly.Xml.textToDom(blockText).firstChild;
                        {
                            var value = goog.dom.createDom('value');
                            value.setAttribute('name', 'VALUE');
                            var shadow = goog.dom.createDom('shadow');
                            shadow.setAttribute("type", "math_number");
                            value.appendChild(shadow);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NUM');
                            field.appendChild(document.createTextNode("1"));
                            shadow.appendChild(field);
                            block.appendChild(value);
                        }
                        xmlList.push(block);
                    }
                }
                return xmlList;
            };
            // builtin variables_get
            var msg = Blockly.Msg;
            var variablesGetId = "variables_get";
            var variablesGetDef = pxt.blocks.getBlockDefinition(variablesGetId);
            msg.VARIABLES_GET_CREATE_SET = variablesGetDef.block["VARIABLES_GET_CREATE_SET"];
            installBuiltinHelpInfo(variablesGetId);
            // Dropdown menu of variables_get
            msg.RENAME_VARIABLE = lf("Rename variable...");
            msg.DELETE_VARIABLE = lf("Delete the \"%1\" variable");
            msg.DELETE_VARIABLE_CONFIRMATION = lf("Delete %1 uses of the \"%2\" variable?");
            // builtin variables_set
            var variablesSetId = "variables_set";
            var variablesSetDef = pxt.blocks.getBlockDefinition(variablesSetId);
            msg.VARIABLES_SET = variablesSetDef.block["VARIABLES_SET"];
            msg.VARIABLES_DEFAULT_NAME = varname;
            msg.VARIABLES_SET_CREATE_GET = lf("Create 'get %1'");
            installBuiltinHelpInfo(variablesSetId);
            // pxt variables_change
            var variablesChangeId = "variables_change";
            var variablesChangeDef = pxt.blocks.getBlockDefinition(variablesChangeId);
            Blockly.Blocks[variablesChangeId] = {
                init: function () {
                    this.jsonInit({
                        "message0": variablesChangeDef.block["message0"],
                        "args0": [
                            {
                                "type": "field_variable",
                                "name": "VAR",
                                "variable": varname
                            },
                            {
                                "type": "input_value",
                                "name": "VALUE",
                                "check": "Number"
                            }
                        ],
                        "inputsInline": true,
                        "previousStatement": null,
                        "nextStatement": null,
                        "colour": getNamespaceColor('variables')
                    });
                    setBuiltinHelpInfo(this, variablesChangeId);
                }
            };
            // New variable dialog
            msg.NEW_VARIABLE_TITLE = lf("New variable name:");
        }
        function initFunctions() {
            var msg = Blockly.Msg;
            // builtin procedures_defnoreturn
            var proceduresDefId = "procedures_defnoreturn";
            var proceduresDef = pxt.blocks.getBlockDefinition(proceduresDefId);
            msg.PROCEDURES_DEFNORETURN_TITLE = proceduresDef.block["PROCEDURES_DEFNORETURN_TITLE"];
            msg.PROCEDURE_ALREADY_EXISTS = proceduresDef.block["PROCEDURE_ALREADY_EXISTS"];
            Blockly.Blocks['procedures_defnoreturn'].init = function () {
                var nameField = new Blockly.FieldTextInput('', Blockly.Procedures.rename);
                //nameField.setSpellcheck(false); //TODO
                this.appendDummyInput()
                    .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE)
                    .appendField(nameField, 'NAME')
                    .appendField('', 'PARAMS');
                this.setColour(getNamespaceColor('functions'));
                this.arguments_ = [];
                this.setStartHat(true);
                this.setStatements_(true);
                this.statementConnection_ = null;
            };
            installBuiltinHelpInfo(proceduresDefId);
            // builtin procedures_defnoreturn
            var proceduresCallId = "procedures_callnoreturn";
            var proceduresCallDef = pxt.blocks.getBlockDefinition(proceduresCallId);
            msg.PROCEDURES_CALLRETURN_TOOLTIP = proceduresDef.tooltip;
            Blockly.Blocks['procedures_callnoreturn'] = {
                init: function () {
                    var nameField = new pxtblockly.FieldProcedure('');
                    nameField.setSourceBlock(this);
                    this.appendDummyInput('TOPROW')
                        .appendField(proceduresCallDef.block['PROCEDURES_CALLNORETURN_TITLE'])
                        .appendField(nameField, 'NAME');
                    this.setPreviousStatement(true);
                    this.setNextStatement(true);
                    this.setColour(getNamespaceColor('functions'));
                    this.arguments_ = [];
                    this.quarkConnections_ = {};
                    this.quarkIds_ = null;
                },
                /**
                 * Returns the name of the procedure this block calls.
                 * @return {string} Procedure name.
                 * @this Blockly.Block
                 */
                getProcedureCall: function () {
                    // The NAME field is guaranteed to exist, null will never be returned.
                    return /** @type {string} */ (this.getFieldValue('NAME'));
                },
                /**
                 * Notification that a procedure is renaming.
                 * If the name matches this block's procedure, rename it.
                 * @param {string} oldName Previous name of procedure.
                 * @param {string} newName Renamed procedure.
                 * @this Blockly.Block
                 */
                renameProcedure: function (oldName, newName) {
                    if (Blockly.Names.equals(oldName, this.getProcedureCall())) {
                        this.setFieldValue(newName, 'NAME');
                    }
                },
                /**
                 * Procedure calls cannot exist without the corresponding procedure
                 * definition.  Enforce this link whenever an event is fired.
                 * @param {!Blockly.Events.Abstract} event Change event.
                 * @this Blockly.Block
                 */
                onchange: function (event) {
                    if (!this.workspace || this.workspace.isFlyout || this.isInsertionMarker()) {
                        // Block is deleted or is in a flyout or insertion marker.
                        return;
                    }
                    if (event.type == Blockly.Events.CREATE &&
                        event.ids.indexOf(this.id) != -1) {
                        // Look for the case where a procedure call was created (usually through
                        // paste) and there is no matching definition.  In this case, create
                        // an empty definition block with the correct signature.
                        var name_2 = this.getProcedureCall();
                        var def = Blockly.Procedures.getDefinition(name_2, this.workspace);
                        if (def && (def.type != this.defType_ ||
                            JSON.stringify(def.arguments_) != JSON.stringify(this.arguments_))) {
                            // The signatures don't match.
                            def = null;
                        }
                        if (!def) {
                            Blockly.Events.setGroup(event.group);
                            /**
                             * Create matching definition block.
                             * <xml>
                             *   <block type="procedures_defreturn" x="10" y="20">
                             *     <field name="NAME">test</field>
                             *   </block>
                             * </xml>
                             */
                            var xml = goog.dom.createDom('xml');
                            var block = goog.dom.createDom('block');
                            block.setAttribute('type', this.defType_);
                            var xy = this.getRelativeToSurfaceXY();
                            var x = xy.x + Blockly.SNAP_RADIUS * (this.RTL ? -1 : 1);
                            var y = xy.y + Blockly.SNAP_RADIUS * 2;
                            block.setAttribute('x', x);
                            block.setAttribute('y', y);
                            var field = goog.dom.createDom('field');
                            field.setAttribute('name', 'NAME');
                            field.appendChild(document.createTextNode(this.getProcedureCall()));
                            block.appendChild(field);
                            xml.appendChild(block);
                            Blockly.Xml.domToWorkspace(xml, this.workspace);
                            Blockly.Events.setGroup(false);
                        }
                    }
                    else if (event.type == Blockly.Events.DELETE) {
                        // Look for the case where a procedure definition has been deleted,
                        // leaving this block (a procedure call) orphaned.  In this case, delete
                        // the orphan.
                        var name_3 = this.getProcedureCall();
                        var def = Blockly.Procedures.getDefinition(name_3, this.workspace);
                        if (!def) {
                            Blockly.Events.setGroup(event.group);
                            this.dispose(true, false);
                            Blockly.Events.setGroup(false);
                        }
                    }
                },
                mutationToDom: function () {
                    var mutationElement = document.createElement("mutation");
                    mutationElement.setAttribute("name", this.getProcedureCall());
                    return mutationElement;
                },
                domToMutation: function (element) {
                    var name = element.getAttribute("name");
                    this.renameProcedure(this.getProcedureCall(), name);
                },
                /**
                 * Add menu option to find the definition block for this call.
                 * @param {!Array} options List of menu options to add to.
                 * @this Blockly.Block
                 */
                customContextMenu: function (options) {
                    var option = { enabled: true };
                    option.text = Blockly.Msg.PROCEDURES_HIGHLIGHT_DEF;
                    var name = this.getProcedureCall();
                    var workspace = this.workspace;
                    option.callback = function () {
                        var def = Blockly.Procedures.getDefinition(name, workspace);
                        def && def.select();
                    };
                    options.push(option);
                },
                defType_: 'procedures_defnoreturn'
            };
            installBuiltinHelpInfo(proceduresCallId);
            Blockly.Procedures.flyoutCategory = function (workspace) {
                var xmlList = [];
                if (!pxt.appTarget.appTheme.hideFlyoutHeadings) {
                    // Add the Heading label
                    var headingLabel = goog.dom.createDom('label');
                    headingLabel.setAttribute('text', lf("Functions"));
                    headingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
                    headingLabel.setAttribute('web-icon', '\uf109');
                    headingLabel.setAttribute('web-icon-class', 'blocklyFlyoutIconfunctions');
                    headingLabel.setAttribute('web-icon-color', getNamespaceColor('functions'));
                    xmlList.push(headingLabel);
                }
                var newFunction = lf("Make a Function");
                var newFunctionTitle = lf("New function name:");
                // Add the "Make a function" button
                var button = goog.dom.createDom('button');
                button.setAttribute('text', newFunction);
                button.setAttribute('callbackkey', 'CREATE_FUNCTION');
                var createFunction = function (name) {
                    /**
                     * Create matching definition block.
                     * <xml>
                     *   <block type="procedures_defreturn" x="10" y="20">
                     *     <field name="NAME">test</field>
                     *   </block>
                     * </xml>
                     */
                    var topBlock = workspace.getTopBlocks(true)[0];
                    var x = 0, y = 0;
                    if (topBlock) {
                        var xy = topBlock.getRelativeToSurfaceXY();
                        x = xy.x + Blockly.SNAP_RADIUS * (topBlock.RTL ? -1 : 1);
                        y = xy.y + Blockly.SNAP_RADIUS * 2;
                    }
                    var xml = goog.dom.createDom('xml');
                    var block = goog.dom.createDom('block');
                    block.setAttribute('type', 'procedures_defnoreturn');
                    block.setAttribute('x', String(x));
                    block.setAttribute('y', String(y));
                    var field = goog.dom.createDom('field');
                    field.setAttribute('name', 'NAME');
                    field.appendChild(document.createTextNode(name));
                    block.appendChild(field);
                    xml.appendChild(block);
                    var newBlockIds = Blockly.Xml.domToWorkspace(xml, workspace);
                    // Close flyout and highlight block
                    workspace.toolbox_.clearSelection();
                    var newBlock = workspace.getBlockById(newBlockIds[0]);
                    newBlock.select();
                };
                workspace.registerButtonCallback('CREATE_FUNCTION', function (button) {
                    var promptAndCheckWithAlert = function (defaultName) {
                        Blockly.prompt(newFunctionTitle, defaultName, function (newFunc) {
                            // Merge runs of whitespace.  Strip leading and trailing whitespace.
                            // Beyond this, all names are legal.
                            if (newFunc) {
                                newFunc = newFunc.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
                                if (newFunc == newFunction) {
                                    // Ok, not ALL names are legal...
                                    newFunc = null;
                                }
                            }
                            if (newFunc) {
                                if (workspace.getVariable(newFunc)) {
                                    Blockly.alert(Blockly.Msg.VARIABLE_ALREADY_EXISTS.replace('%1', newFunc.toLowerCase()), function () {
                                        promptAndCheckWithAlert(newFunc); // Recurse
                                    });
                                }
                                else if (!Blockly.Procedures.isLegalName_(newFunc, workspace)) {
                                    Blockly.alert(Blockly.Msg.PROCEDURE_ALREADY_EXISTS.replace('%1', newFunc.toLowerCase()), function () {
                                        promptAndCheckWithAlert(newFunc); // Recurse
                                    });
                                }
                                else {
                                    createFunction(newFunc);
                                }
                            }
                        });
                    };
                    promptAndCheckWithAlert('doSomething');
                });
                xmlList.push(button);
                function populateProcedures(procedureList, templateName) {
                    for (var i = 0; i < procedureList.length; i++) {
                        var name_4 = procedureList[i][0];
                        var args = procedureList[i][1];
                        // <block type="procedures_callnoreturn" gap="16">
                        //   <field name="NAME">name</field>
                        // </block>
                        var block = goog.dom.createDom('block');
                        block.setAttribute('type', templateName);
                        block.setAttribute('gap', '16');
                        block.setAttribute('colour', getNamespaceColor('functions'));
                        var field = goog.dom.createDom('field', null, name_4);
                        field.setAttribute('name', 'NAME');
                        block.appendChild(field);
                        xmlList.push(block);
                    }
                }
                var tuple = Blockly.Procedures.allProcedures(workspace);
                populateProcedures(tuple[0], 'procedures_callnoreturn');
                return xmlList;
            };
        }
        function initLogic() {
            var msg = Blockly.Msg;
            // builtin controls_if
            var controlsIfId = "controls_if";
            var controlsIfDef = pxt.blocks.getBlockDefinition(controlsIfId);
            var controlsIfTooltips = controlsIfDef.tooltip;
            msg.CONTROLS_IF_MSG_IF = controlsIfDef.block["CONTROLS_IF_MSG_IF"];
            msg.CONTROLS_IF_MSG_THEN = controlsIfDef.block["CONTROLS_IF_MSG_THEN"];
            msg.CONTROLS_IF_MSG_ELSE = controlsIfDef.block["CONTROLS_IF_MSG_ELSE"];
            msg.CONTROLS_IF_MSG_ELSEIF = controlsIfDef.block["CONTROLS_IF_MSG_ELSEIF"];
            msg.CONTROLS_IF_TOOLTIP_1 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_1"];
            msg.CONTROLS_IF_TOOLTIP_2 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_2"];
            msg.CONTROLS_IF_TOOLTIP_3 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_3"];
            msg.CONTROLS_IF_TOOLTIP_4 = controlsIfTooltips["CONTROLS_IF_TOOLTIP_4"];
            installBuiltinHelpInfo(controlsIfId);
            // builtin logic_compare
            var logicCompareId = "logic_compare";
            var logicCompareDef = pxt.blocks.getBlockDefinition(logicCompareId);
            var logicCompareTooltips = logicCompareDef.tooltip;
            msg.LOGIC_COMPARE_TOOLTIP_EQ = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_EQ"];
            msg.LOGIC_COMPARE_TOOLTIP_NEQ = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_NEQ"];
            msg.LOGIC_COMPARE_TOOLTIP_LT = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_LT"];
            msg.LOGIC_COMPARE_TOOLTIP_LTE = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_LTE"];
            msg.LOGIC_COMPARE_TOOLTIP_GT = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_GT"];
            msg.LOGIC_COMPARE_TOOLTIP_GTE = logicCompareTooltips["LOGIC_COMPARE_TOOLTIP_GTE"];
            installBuiltinHelpInfo(logicCompareId);
            // builtin logic_operation
            var logicOperationId = "logic_operation";
            var logicOperationDef = pxt.blocks.getBlockDefinition(logicOperationId);
            var logicOperationTooltips = logicOperationDef.tooltip;
            msg.LOGIC_OPERATION_AND = logicOperationDef.block["LOGIC_OPERATION_AND"];
            msg.LOGIC_OPERATION_OR = logicOperationDef.block["LOGIC_OPERATION_OR"];
            msg.LOGIC_OPERATION_TOOLTIP_AND = logicOperationTooltips["LOGIC_OPERATION_TOOLTIP_AND"];
            msg.LOGIC_OPERATION_TOOLTIP_OR = logicOperationTooltips["LOGIC_OPERATION_TOOLTIP_OR"];
            installBuiltinHelpInfo(logicOperationId);
            // builtin logic_negate
            var logicNegateId = "logic_negate";
            var logicNegateDef = pxt.blocks.getBlockDefinition(logicNegateId);
            msg.LOGIC_NEGATE_TITLE = logicNegateDef.block["LOGIC_NEGATE_TITLE"];
            installBuiltinHelpInfo(logicNegateId);
            // builtin logic_boolean
            var logicBooleanId = "logic_boolean";
            var logicBooleanDef = pxt.blocks.getBlockDefinition(logicBooleanId);
            msg.LOGIC_BOOLEAN_TRUE = logicBooleanDef.block["LOGIC_BOOLEAN_TRUE"];
            msg.LOGIC_BOOLEAN_FALSE = logicBooleanDef.block["LOGIC_BOOLEAN_FALSE"];
            installBuiltinHelpInfo(logicBooleanId);
        }
        function initText() {
            // builtin text
            var textInfo = pxt.blocks.getBlockDefinition('text');
            installHelpResources('text', textInfo.name, textInfo.tooltip, textInfo.url, Blockly.Colours.textField, Blockly.Colours.textField, Blockly.Colours.textField);
            // builtin text_length
            var msg = Blockly.Msg;
            var textLengthId = "text_length";
            var textLengthDef = pxt.blocks.getBlockDefinition(textLengthId);
            msg.TEXT_LENGTH_TITLE = textLengthDef.block["TEXT_LENGTH_TITLE"];
            // We have to override this block definition because the builtin block
            // allows both Strings and Arrays in its input check and that confuses
            // our Blockly compiler
            var block = Blockly.Blocks[textLengthId];
            block.init = function () {
                this.jsonInit({
                    "message0": msg.TEXT_LENGTH_TITLE,
                    "args0": [
                        {
                            "type": "input_value",
                            "name": "VALUE",
                            "check": ['String']
                        }
                    ],
                    "output": 'Number'
                });
            };
            installBuiltinHelpInfo(textLengthId);
            // builtin text_join
            var textJoinId = "text_join";
            var textJoinDef = pxt.blocks.getBlockDefinition(textJoinId);
            msg.TEXT_JOIN_TITLE_CREATEWITH = textJoinDef.block["TEXT_JOIN_TITLE_CREATEWITH"];
            installBuiltinHelpInfo(textJoinId);
        }
        function initTooltip(blockInfo) {
            var renderTip = function (el) {
                if (el.disabled)
                    return lf("This block is disabled and will not run. Attach this block to an event to enable it.");
                var tip = el.tooltip;
                while (goog.isFunction(tip)) {
                    tip = tip(el);
                }
                return tip;
            };
            // TODO: update this when pulling new blockly
            /**
             * Create the tooltip and show it.
             * @private
             */
            Blockly.Tooltip.show_ = function () {
                Blockly.Tooltip.poisonedElement_ = Blockly.Tooltip.element_;
                if (!Blockly.Tooltip.DIV) {
                    return;
                }
                // Erase all existing text.
                goog.dom.removeChildren(/** @type {!Element} */ (Blockly.Tooltip.DIV));
                // Get the new text.
                var card = Blockly.Tooltip.element_.codeCard;
                function render() {
                    var rtl = Blockly.Tooltip.element_.RTL;
                    var windowSize = goog.dom.getViewportSize();
                    // Display the tooltip.
                    Blockly.Tooltip.DIV.style.direction = rtl ? 'rtl' : 'ltr';
                    Blockly.Tooltip.DIV.style.display = 'block';
                    Blockly.Tooltip.visible = true;
                    // Move the tooltip to just below the cursor.
                    var anchorX = Blockly.Tooltip.lastX_;
                    if (rtl) {
                        anchorX -= Blockly.Tooltip.OFFSET_X + Blockly.Tooltip.DIV.offsetWidth;
                    }
                    else {
                        anchorX += Blockly.Tooltip.OFFSET_X;
                    }
                    var anchorY = Blockly.Tooltip.lastY_ + Blockly.Tooltip.OFFSET_Y;
                    if (anchorY + Blockly.Tooltip.DIV.offsetHeight >
                        windowSize.height + window.scrollY) {
                        // Falling off the bottom of the screen; shift the tooltip up.
                        anchorY -= Blockly.Tooltip.DIV.offsetHeight + 2 * Blockly.Tooltip.OFFSET_Y;
                    }
                    if (rtl) {
                        // Prevent falling off left edge in RTL mode.
                        anchorX = Math.max(Blockly.Tooltip.MARGINS - window.scrollX, anchorX);
                    }
                    else {
                        if (anchorX + Blockly.Tooltip.DIV.offsetWidth >
                            windowSize.width + window.scrollX - 2 * Blockly.Tooltip.MARGINS) {
                            // Falling off the right edge of the screen;
                            // clamp the tooltip on the edge.
                            anchorX = windowSize.width - Blockly.Tooltip.DIV.offsetWidth -
                                2 * Blockly.Tooltip.MARGINS;
                        }
                    }
                    Blockly.Tooltip.DIV.style.top = anchorY + 'px';
                    Blockly.Tooltip.DIV.style.left = anchorX + 'px';
                }
                if (card) {
                    var cardEl = pxt.docs.codeCard.render({
                        header: renderTip(Blockly.Tooltip.element_)
                    });
                    Blockly.Tooltip.DIV.appendChild(cardEl);
                    render();
                }
                else {
                    var tip = renderTip(Blockly.Tooltip.element_);
                    tip = Blockly.utils.wrap(tip, Blockly.Tooltip.LIMIT);
                    // Create new text, line by line.
                    var lines = tip.split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var div = document.createElement('div');
                        div.appendChild(document.createTextNode(lines[i]));
                        Blockly.Tooltip.DIV.appendChild(div);
                    }
                    render();
                }
            };
        }
        /**
         * <block type="pxt_wait_until">
         *     <value name="PREDICATE">
         *          <shadow type="logic_boolean">
         *              <field name="BOOL">TRUE</field>
         *          </shadow>
         *     </value>
         * </block>
         */
        function mkPredicateBlock(type) {
            var block = document.createElement("block");
            block.setAttribute("type", type);
            var value = document.createElement("value");
            value.setAttribute("name", "PREDICATE");
            block.appendChild(value);
            var shadow = document.createElement("shadow");
            shadow.setAttribute("type", "logic_boolean");
            value.appendChild(shadow);
            var field = document.createElement("field");
            field.setAttribute("name", "BOOL");
            field.textContent = "TRUE";
            shadow.appendChild(field);
            return block;
        }
        var jresIconCache = {};
        function iconToFieldImage(id) {
            var url = jresIconCache[id];
            if (!url) {
                pxt.log("missing jres icon " + id);
                return undefined;
            }
            return new Blockly.FieldImage(url, 40, 40, pxt.Util.isUserLanguageRtl(), '');
        }
        function initJresIcons(blockInfo) {
            jresIconCache = {}; // clear previous cache
            var jres = blockInfo.apis.jres;
            if (!jres)
                return;
            Object.keys(jres).forEach(function (jresId) {
                var jresObject = jres[jresId];
                if (jresObject && jresObject.icon)
                    jresIconCache[jresId] = jresObject.icon;
            });
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var MutatorTypes;
        (function (MutatorTypes) {
            MutatorTypes.ObjectDestructuringMutator = "objectdestructuring";
            MutatorTypes.RestParameterMutator = "restparameter";
            MutatorTypes.DefaultInstanceMutator = "defaultinstance";
        })(MutatorTypes = blocks.MutatorTypes || (blocks.MutatorTypes = {}));
        function addMutation(b, info, mutationType) {
            var m;
            switch (mutationType) {
                case MutatorTypes.ObjectDestructuringMutator:
                    if (!info.parameters || info.parameters.length < 1) {
                        console.error("Destructuring mutations require at least one parameter");
                    }
                    else {
                        var found = false;
                        for (var _i = 0, _a = info.parameters; _i < _a.length; _i++) {
                            var param = _a[_i];
                            if (param.type.indexOf("=>") !== -1) {
                                if (!param.properties || param.properties.length === 0) {
                                    console.error("Destructuring mutations only supported for functions with an event parameter that has multiple properties");
                                    return;
                                }
                                found = true;
                            }
                        }
                        if (!found) {
                            console.error("Destructuring mutations must have an event parameter");
                            return;
                        }
                    }
                    m = new DestructuringMutator(b, info);
                    break;
                case MutatorTypes.RestParameterMutator:
                    m = new ArrayMutator(b, info);
                    break;
                case MutatorTypes.DefaultInstanceMutator:
                    m = new DefaultInstanceMutator(b, info);
                    break;
                default:
                    console.warn("Ignoring unknown mutation type: " + mutationType);
                    return;
            }
            b.mutationToDom = m.mutationToDom.bind(m);
            b.domToMutation = m.domToMutation.bind(m);
            b.compose = m.compose.bind(m);
            b.decompose = m.decompose.bind(m);
            b.mutation = m;
        }
        blocks.addMutation = addMutation;
        function mutateToolboxBlock(block, mutationType, mutation) {
            var mutationElement = document.createElement("mutation");
            switch (mutationType) {
                case MutatorTypes.ObjectDestructuringMutator:
                    mutationElement.setAttribute(DestructuringMutator.propertiesAttributeName, mutation);
                    break;
                case MutatorTypes.RestParameterMutator:
                    mutationElement.setAttribute(ArrayMutator.countAttributeName, mutation);
                    break;
                case MutatorTypes.DefaultInstanceMutator:
                    mutationElement.setAttribute(DefaultInstanceMutator.attributeName, mutation);
                default:
                    console.warn("Ignoring unknown mutation type: " + mutationType);
                    return;
            }
            block.appendChild(mutationElement);
        }
        blocks.mutateToolboxBlock = mutateToolboxBlock;
        var MutatorHelper = /** @class */ (function () {
            function MutatorHelper(b, info) {
                this.info = info;
                this.block = b;
                this.topBlockType = this.block.type + "_mutator";
                var subBlocks = this.getSubBlockNames();
                this.initializeMutatorTopBlock();
                this.initializeMutatorSubBlocks(subBlocks);
                var mutatorToolboxTypes = subBlocks.map(function (s) { return s.type; });
                this.block.setMutator(new Blockly.Mutator(mutatorToolboxTypes));
            }
            // Should be set to modify a block after a mutator dialog is updated
            MutatorHelper.prototype.compose = function (topBlock) {
                var allBlocks = topBlock.getDescendants().map(function (subBlock) {
                    return {
                        type: subBlock.type,
                        name: subBlock.inputList[0].name
                    };
                });
                // Toss the top block
                allBlocks.shift();
                this.updateBlock(allBlocks);
            };
            // Should be set to initialize the workspace inside a mutator dialog and return the top block
            MutatorHelper.prototype.decompose = function (workspace) {
                // Initialize flyout workspace's top block and add sub-blocks based on visible parameters
                var topBlock = workspace.newBlock(this.topBlockType);
                topBlock.initSvg();
                var _loop_2 = function (input) {
                    if (input.name === MutatorHelper.mutatorStatmentInput) {
                        var currentConnection_1 = input.connection;
                        this_1.getVisibleBlockTypes().forEach(function (sub) {
                            var subBlock = workspace.newBlock(sub);
                            subBlock.initSvg();
                            currentConnection_1.connect(subBlock.previousConnection);
                            currentConnection_1 = subBlock.nextConnection;
                        });
                        return "break";
                    }
                };
                var this_1 = this;
                for (var _i = 0, _a = topBlock.inputList; _i < _a.length; _i++) {
                    var input = _a[_i];
                    var state_1 = _loop_2(input);
                    if (state_1 === "break")
                        break;
                }
                return topBlock;
            };
            MutatorHelper.prototype.compileMutation = function (e, comments) {
                return undefined;
            };
            MutatorHelper.prototype.getDeclaredVariables = function () {
                return undefined;
            };
            MutatorHelper.prototype.isDeclaredByMutation = function (varName) {
                return false;
            };
            MutatorHelper.prototype.initializeMutatorSubBlock = function (sub, parameter, colour) {
                sub.appendDummyInput(parameter)
                    .appendField(parameter);
                sub.setColour(colour);
                sub.setNextStatement(true);
                sub.setPreviousStatement(true);
            };
            MutatorHelper.prototype.initializeMutatorTopBlock = function () {
                var topBlockTitle = this.info.attributes.mutateText;
                var colour = this.block.getColour();
                Blockly.Blocks[this.topBlockType] = Blockly.Blocks[this.topBlockType] || {
                    init: function () {
                        var top = this;
                        top.appendDummyInput()
                            .appendField(topBlockTitle);
                        top.setColour(colour);
                        top.appendStatementInput(MutatorHelper.mutatorStatmentInput);
                    }
                };
            };
            MutatorHelper.prototype.initializeMutatorSubBlocks = function (subBlocks) {
                var colour = this.block.getColour();
                var initializer = this.initializeMutatorSubBlock.bind(this);
                subBlocks.forEach(function (blockName) {
                    Blockly.Blocks[blockName.type] = Blockly.Blocks[blockName.type] || {
                        init: function () { initializer(this, blockName.name, colour); }
                    };
                });
            };
            MutatorHelper.mutatorStatmentInput = "PROPERTIES";
            MutatorHelper.mutatedVariableInputName = "properties";
            return MutatorHelper;
        }());
        var DestructuringMutator = /** @class */ (function (_super) {
            __extends(DestructuringMutator, _super);
            function DestructuringMutator(b, info) {
                var _this = _super.call(this, b, info) || this;
                _this.currentlyVisible = [];
                _this.parameterRenames = {};
                _this.prefix = _this.info.attributes.mutatePrefix;
                _this.block.appendDummyInput(MutatorHelper.mutatedVariableInputName);
                _this.block.appendStatementInput("HANDLER")
                    .setCheck("null");
                return _this;
            }
            DestructuringMutator.prototype.getMutationType = function () {
                return MutatorTypes.ObjectDestructuringMutator;
            };
            DestructuringMutator.prototype.compileMutation = function (e, comments) {
                var _this = this;
                if (!this.info.attributes.mutatePropertyEnum && !this.parameters.length) {
                    return undefined;
                }
                var declarationString = this.parameters.map(function (param) {
                    var declaredName = _this.block.getFieldValue(param);
                    var escapedParam = blocks.escapeVarName(param, e);
                    if (declaredName !== param) {
                        _this.parameterRenames[param] = declaredName;
                        return param + ": " + blocks.escapeVarName(declaredName, e);
                    }
                    return escapedParam;
                }).join(", ");
                var functionString = "function ({ " + declarationString + " })";
                if (this.info.attributes.mutatePropertyEnum) {
                    return blocks.mkText(" [" + this.parameters.map(function (p) { return _this.info.attributes.mutatePropertyEnum + "." + p; }).join(", ") + "]," + functionString);
                }
                else {
                    return blocks.mkText(functionString);
                }
            };
            DestructuringMutator.prototype.getDeclaredVariables = function () {
                var _this = this;
                var result = {};
                this.parameters.forEach(function (param) {
                    result[_this.block.getFieldValue(param)] = _this.parameterTypes[param];
                });
                return result;
            };
            DestructuringMutator.prototype.isDeclaredByMutation = function (varName) {
                var _this = this;
                return this.parameters.some(function (param) { return _this.block.getFieldValue(param) === varName; });
            };
            DestructuringMutator.prototype.mutationToDom = function () {
                var _this = this;
                // Save the parameters that are currently visible to the DOM along with their names
                var mutation = document.createElement("mutation");
                var attr = this.parameters.map(function (param) {
                    var varName = _this.block.getFieldValue(param);
                    if (varName !== param) {
                        _this.parameterRenames[param] = pxt.Util.htmlEscape(varName);
                    }
                    return pxt.Util.htmlEscape(param);
                }).join(",");
                mutation.setAttribute(DestructuringMutator.propertiesAttributeName, attr);
                for (var parameter in this.parameterRenames) {
                    if (parameter === this.parameterRenames[parameter]) {
                        delete this.parameterRenames[parameter];
                    }
                }
                mutation.setAttribute(DestructuringMutator.renameAttributeName, JSON.stringify(this.parameterRenames));
                return mutation;
            };
            DestructuringMutator.prototype.domToMutation = function (xmlElement) {
                var _this = this;
                // Restore visible parameters based on saved DOM
                var savedParameters = xmlElement.getAttribute(DestructuringMutator.propertiesAttributeName);
                if (savedParameters) {
                    var split = savedParameters.split(",");
                    var properties_1 = [];
                    if (this.paramIndex === undefined) {
                        this.paramIndex = this.getParameterIndex();
                    }
                    split.forEach(function (saved) {
                        // Parse the old way of storing renames to maintain backwards compatibility
                        var parts = saved.split(":");
                        if (_this.info.parameters[_this.paramIndex].properties.some(function (p) { return p.name === parts[0]; })) {
                            properties_1.push({
                                property: parts[0],
                                newName: parts[1]
                            });
                        }
                    });
                    this.parameterRenames = undefined;
                    if (xmlElement.hasAttribute(DestructuringMutator.renameAttributeName)) {
                        try {
                            this.parameterRenames = JSON.parse(xmlElement.getAttribute(DestructuringMutator.renameAttributeName));
                        }
                        catch (e) {
                            console.warn("Ignoring invalid rename map in saved block mutation");
                        }
                    }
                    this.parameterRenames = this.parameterRenames || {};
                    // Create the fields for each property with default variable names
                    this.parameters = [];
                    properties_1.forEach(function (prop) {
                        _this.parameters.push(prop.property);
                        if (prop.newName && prop.newName !== prop.property) {
                            _this.parameterRenames[prop.property] === prop.newName;
                        }
                    });
                    this.updateVisibleProperties();
                    // Override any names that the user has changed
                    properties_1.filter(function (p) { return !!p.newName; }).forEach(function (p) { return _this.block.setFieldValue(p.newName, p.property); });
                }
            };
            DestructuringMutator.prototype.updateBlock = function (subBlocks) {
                var _this = this;
                this.parameters = [];
                // Ignore duplicate blocks
                subBlocks.forEach(function (p) {
                    if (_this.parameters.indexOf(p.name) === -1) {
                        _this.parameters.push(p.name);
                    }
                });
                this.updateVisibleProperties();
            };
            DestructuringMutator.prototype.getSubBlockNames = function () {
                var _this = this;
                this.parameters = [];
                this.parameterTypes = {};
                if (this.paramIndex === undefined) {
                    this.paramIndex = this.getParameterIndex();
                }
                return this.info.parameters[this.paramIndex].properties.map(function (property) {
                    // Used when compiling the destructured arguments
                    _this.parameterTypes[property.name] = property.type;
                    return {
                        type: _this.propertyId(property.name),
                        name: property.name
                    };
                });
            };
            DestructuringMutator.prototype.getVisibleBlockTypes = function () {
                var _this = this;
                return this.currentlyVisible.map(function (p) { return _this.propertyId(p); });
            };
            DestructuringMutator.prototype.updateVisibleProperties = function () {
                var _this = this;
                if (pxt.Util.listsEqual(this.currentlyVisible, this.parameters)) {
                    return;
                }
                var dummyInput = this.block.inputList.filter(function (i) { return i.name === MutatorHelper.mutatedVariableInputName; })[0];
                if (this.prefix && this.currentlyVisible.length === 0) {
                    dummyInput.appendField(this.prefix, DestructuringMutator.prefixLabel);
                }
                this.currentlyVisible.forEach(function (param) {
                    if (_this.parameters.indexOf(param) === -1) {
                        var name_5 = _this.block.getFieldValue(param);
                        // Persist renames
                        if (name_5 !== param) {
                            _this.parameterRenames[param] = name_5;
                        }
                        dummyInput.removeField(param);
                    }
                });
                this.parameters.forEach(function (param) {
                    if (_this.currentlyVisible.indexOf(param) === -1) {
                        var fieldValue = _this.parameterRenames[param] || param;
                        dummyInput.appendField(new Blockly.FieldVariable(fieldValue), param);
                    }
                });
                if (this.prefix && this.parameters.length === 0) {
                    dummyInput.removeField(DestructuringMutator.prefixLabel);
                }
                this.currentlyVisible = this.parameters;
            };
            DestructuringMutator.prototype.propertyId = function (property) {
                return this.block.type + "_" + property;
            };
            DestructuringMutator.prototype.getParameterIndex = function () {
                for (var i = 0; i < this.info.parameters.length; i++) {
                    if (this.info.parameters[i].type.indexOf("=>") !== -1) {
                        return i;
                    }
                }
                return undefined;
            };
            DestructuringMutator.propertiesAttributeName = "callbackproperties";
            DestructuringMutator.renameAttributeName = "renamemap";
            // Avoid clashes by starting labels with a number
            DestructuringMutator.prefixLabel = "0prefix_label_";
            return DestructuringMutator;
        }(MutatorHelper));
        var ArrayMutator = /** @class */ (function (_super) {
            __extends(ArrayMutator, _super);
            function ArrayMutator() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.count = 0;
                return _this;
            }
            ArrayMutator.prototype.getMutationType = function () {
                return MutatorTypes.RestParameterMutator;
            };
            ArrayMutator.prototype.compileMutation = function (e, comments) {
                var values = [];
                this.forEachInput(function (block) { return values.push(blocks.compileExpression(e, block, comments)); });
                return blocks.mkGroup(values);
            };
            ArrayMutator.prototype.mutationToDom = function () {
                var mutation = document.createElement("mutation");
                mutation.setAttribute(ArrayMutator.countAttributeName, this.count.toString());
                return mutation;
            };
            ArrayMutator.prototype.domToMutation = function (xmlElement) {
                var attribute = xmlElement.getAttribute(ArrayMutator.countAttributeName);
                if (attribute) {
                    try {
                        this.count = parseInt(attribute);
                    }
                    catch (e) {
                        return;
                    }
                    for (var i = 0; i < this.count; i++) {
                        this.addNumberField(false, i);
                    }
                }
            };
            ArrayMutator.prototype.updateBlock = function (subBlocks) {
                if (subBlocks) {
                    var diff = Math.abs(this.count - subBlocks.length);
                    if (this.count < subBlocks.length) {
                        for (var i = 0; i < diff; i++)
                            this.addNumberField(true, this.count);
                    }
                    else if (this.count > subBlocks.length) {
                        for (var i = 0; i < diff; i++)
                            this.removeNumberField();
                    }
                }
            };
            ArrayMutator.prototype.getSubBlockNames = function () {
                return [{
                        name: "Value",
                        type: ArrayMutator.entryTypeName
                    }];
            };
            ArrayMutator.prototype.getVisibleBlockTypes = function () {
                var result = [];
                this.forEachInput(function () { return result.push(ArrayMutator.entryTypeName); });
                return result;
            };
            ArrayMutator.prototype.addNumberField = function (isNewField, index) {
                var input = this.block.appendValueInput(ArrayMutator.valueInputPrefix + index).setCheck("Number");
                if (isNewField) {
                    var valueBlock = this.block.workspace.newBlock("math_number");
                    valueBlock.initSvg();
                    valueBlock.setShadow(true);
                    input.connection.connect(valueBlock.outputConnection);
                    this.block.workspace.render();
                    this.count++;
                }
            };
            ArrayMutator.prototype.removeNumberField = function () {
                if (this.count > 0) {
                    this.block.removeInput(ArrayMutator.valueInputPrefix + (this.count - 1));
                }
                this.count--;
            };
            ArrayMutator.prototype.forEachInput = function (cb) {
                for (var i = 0; i < this.count; i++) {
                    cb(this.block.getInputTargetBlock(ArrayMutator.valueInputPrefix + i), i);
                }
            };
            ArrayMutator.countAttributeName = "count";
            ArrayMutator.entryTypeName = "entry";
            ArrayMutator.valueInputPrefix = "value_input_";
            return ArrayMutator;
        }(MutatorHelper));
        var DefaultInstanceMutator = /** @class */ (function (_super) {
            __extends(DefaultInstanceMutator, _super);
            function DefaultInstanceMutator() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.showing = false;
                return _this;
            }
            DefaultInstanceMutator.prototype.getMutationType = function () {
                return MutatorTypes.DefaultInstanceMutator;
            };
            DefaultInstanceMutator.prototype.compileMutation = function (e, comments) {
                if (this.showing) {
                    var target = this.block.getInputTargetBlock(DefaultInstanceMutator.instanceInputName);
                    if (target) {
                        return blocks.compileExpression(e, target, comments);
                    }
                }
                return undefined;
            };
            DefaultInstanceMutator.prototype.mutationToDom = function () {
                var mutation = document.createElement("mutation");
                mutation.setAttribute(DefaultInstanceMutator.attributeName, this.showing ? "true" : "false");
                return mutation;
            };
            DefaultInstanceMutator.prototype.domToMutation = function (xmlElement) {
                var attribute = xmlElement.getAttribute(DefaultInstanceMutator.attributeName);
                if (attribute) {
                    this.updateShape(attribute === "true");
                }
                else {
                    this.updateShape(false);
                }
            };
            DefaultInstanceMutator.prototype.updateBlock = function (subBlocks) {
                this.updateShape(!!(subBlocks && subBlocks.length));
            };
            DefaultInstanceMutator.prototype.getSubBlockNames = function () {
                return [{
                        name: "Instance",
                        type: DefaultInstanceMutator.instanceSubBlockType
                    }];
            };
            DefaultInstanceMutator.prototype.getVisibleBlockTypes = function () {
                var result = [];
                if (this.showing) {
                    result.push(DefaultInstanceMutator.instanceSubBlockType);
                }
                return result;
            };
            DefaultInstanceMutator.prototype.updateShape = function (show) {
                if (this.showing !== show) {
                    if (show && !this.block.getInputTargetBlock(DefaultInstanceMutator.instanceInputName)) {
                        this.block.appendValueInput(DefaultInstanceMutator.instanceInputName);
                    }
                    else {
                        this.block.removeInput(DefaultInstanceMutator.instanceInputName);
                    }
                    this.showing = show;
                }
            };
            DefaultInstanceMutator.attributeName = "showing";
            DefaultInstanceMutator.instanceInputName = "__instance__";
            DefaultInstanceMutator.instanceSubBlockType = "instance";
            return DefaultInstanceMutator;
        }(MutatorHelper));
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtblockly.d.ts" />
/// <reference path="../built/pxtlib.d.ts" />
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks_11) {
        var workspace;
        var blocklyDiv;
        function align(ws, emPixels) {
            var blocks = ws.getTopBlocks(true);
            var y = 0;
            blocks.forEach(function (block) {
                block.moveBy(0, y);
                y += block.getHeightWidth().height;
                y += emPixels; //buffer
            });
        }
        var BlockLayout;
        (function (BlockLayout) {
            BlockLayout[BlockLayout["Align"] = 1] = "Align";
            // Shuffle deprecated
            BlockLayout[BlockLayout["Clean"] = 3] = "Clean";
            BlockLayout[BlockLayout["Flow"] = 4] = "Flow";
        })(BlockLayout = blocks_11.BlockLayout || (blocks_11.BlockLayout = {}));
        function render(blocksXml, options) {
            if (options === void 0) { options = { emPixels: 14, layout: BlockLayout.Flow }; }
            if (!workspace) {
                blocklyDiv = document.createElement("div");
                blocklyDiv.style.position = "absolute";
                blocklyDiv.style.top = "0";
                blocklyDiv.style.left = "0";
                blocklyDiv.style.width = "1px";
                blocklyDiv.style.height = "1px";
                document.body.appendChild(blocklyDiv);
                workspace = Blockly.inject(blocklyDiv, {
                    scrollbars: false,
                    readOnly: true,
                    sound: false,
                    media: pxt.webConfig.commitCdnUrl + "blockly/media/",
                    rtl: pxt.Util.isUserLanguageRtl()
                });
            }
            workspace.clear();
            try {
                var text = blocksXml || "<xml xmlns=\"http://www.w3.org/1999/xhtml\"></xml>";
                var xml = Blockly.Xml.textToDom(text);
                Blockly.Xml.domToWorkspace(xml, workspace);
                switch (options.layout) {
                    case BlockLayout.Align:
                        pxt.blocks.layout.verticalAlign(workspace, options.emPixels);
                        break;
                    case BlockLayout.Flow:
                        pxt.blocks.layout.flow(workspace, { ratio: options.aspectRatio, useViewWidth: options.useViewWidth });
                        break;
                    case BlockLayout.Clean:
                        if (workspace.cleanUp_)
                            workspace.cleanUp_();
                        break;
                }
                var metrics = workspace.getMetrics();
                var svg = $(blocklyDiv).find('svg').clone(true, true);
                svg.removeClass("blocklySvg").addClass('blocklyPreview');
                svg.find('.blocklyBlockCanvas,.blocklyBubbleCanvas')
                    .attr('transform', "translate(" + -metrics.contentLeft + ", " + -metrics.contentTop + ") scale(1)");
                svg.find('.blocklyMainBackground').remove();
                svg[0].setAttribute('viewBox', "0 0 " + metrics.contentWidth + " " + metrics.contentHeight);
                svg.removeAttr('width');
                svg.removeAttr('height');
                if (options.emPixels) {
                    svg[0].style.width = (metrics.contentWidth / options.emPixels) + 'em';
                    svg[0].style.height = (metrics.contentHeight / options.emPixels) + 'em';
                }
                return svg[0];
            }
            catch (e) {
                pxt.reportException(e);
                return undefined;
            }
        }
        blocks_11.render = render;
        function blocksMetrics(ws) {
            var blocks = ws.getTopBlocks(false);
            if (!blocks.length)
                return { width: 0, height: 0 };
            var m = undefined;
            blocks.forEach(function (b) {
                var r = b.getBoundingRectangle();
                if (!m)
                    m = { l: r.topLeft.x, r: r.bottomRight.x, t: r.topLeft.y, b: r.bottomRight.y };
                else {
                    m.l = Math.min(m.l, r.topLeft.x);
                    m.r = Math.max(m.r, r.bottomRight.y);
                    m.t = Math.min(m.t, r.topLeft.y);
                    m.b = Math.min(m.b, r.bottomRight.y);
                }
            });
            return {
                width: m.r - m.l,
                height: m.b - m.t
            };
        }
        blocks_11.blocksMetrics = blocksMetrics;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var docs;
    (function (docs) {
        var codeCard;
        (function (codeCard) {
            var repeat = pxt.Util.repeatMap;
            function render(card, options) {
                if (options === void 0) { options = {}; }
                var repeat = pxt.Util.repeatMap;
                var color = card.color || "";
                if (!color) {
                    if (card.hardware && !card.software)
                        color = 'black';
                    else if (card.software && !card.hardware)
                        color = 'teal';
                }
                var url = card.url ? /^[^:]+:\/\//.test(card.url) ? card.url : ('/' + card.url.replace(/^\.?\/?/, ''))
                    : undefined;
                var link = !!url;
                var div = function (parent, cls, tag, text) {
                    if (tag === void 0) { tag = "div"; }
                    if (text === void 0) { text = ''; }
                    var d = document.createElement(tag);
                    if (cls)
                        d.className = cls;
                    if (parent)
                        parent.appendChild(d);
                    if (text)
                        d.appendChild(document.createTextNode(text + ''));
                    return d;
                };
                var a = function (parent, href, text, cls) {
                    var d = document.createElement('a');
                    d.className = cls;
                    d.href = href;
                    d.appendChild(document.createTextNode(text));
                    d.target = '_blank';
                    parent.appendChild(d);
                    return d;
                };
                var r = div(null, 'ui card ' + (card.color || '') + (link ? ' link' : ''), link ? "a" : "div");
                r.setAttribute("role", "option");
                r.setAttribute("aria-selected", "true");
                if (url)
                    r.href = url;
                if (!options.hideHeader && (card.header || card.blocks || card.javascript || card.hardware || card.software || card.any)) {
                    var h = div(r, "ui content " + (card.responsive ? " tall desktop only" : ""));
                    var hr_1 = div(h, "right floated meta");
                    if (card.any)
                        div(hr_1, "ui grey circular label tiny", "i", card.any > 0 ? card.any : "");
                    repeat(card.blocks, function (k) { return div(hr_1, "puzzle orange icon", "i"); });
                    repeat(card.javascript, function (k) { return div(hr_1, "align left blue icon", "i"); });
                    repeat(card.hardware, function (k) { return div(hr_1, "certificate black icon", "i"); });
                    repeat(card.software, function (k) { return div(hr_1, "square teal icon", "i"); });
                    if (card.header)
                        div(h, 'description', 'span', card.header);
                }
                var name = (options.shortName ? card.shortName : '') || card.name;
                var img = div(r, "ui image" + (card.responsive ? " tall landscape only" : ""));
                if (card.label) {
                    var lbl = document.createElement("label");
                    lbl.className = "ui " + (card.labelClass ? card.labelClass : "orange right ribbon") + " label";
                    lbl.textContent = card.label;
                    img.appendChild(lbl);
                }
                if (card.blocksXml) {
                    var svg = pxt.blocks.render(card.blocksXml);
                    if (!svg) {
                        console.error("failed to render blocks");
                        pxt.debug(card.blocksXml);
                    }
                    else {
                        var holder = div(img, '');
                        holder.setAttribute('style', 'width:100%; min-height:10em');
                        holder.appendChild(svg);
                    }
                }
                if (card.typeScript) {
                    var pre = document.createElement("pre");
                    pre.appendChild(document.createTextNode(card.typeScript));
                    img.appendChild(pre);
                }
                if (card.imageUrl) {
                    var imageWrapper = document.createElement("div");
                    imageWrapper.className = "ui imagewrapper";
                    var image = document.createElement("img");
                    image.className = "ui cardimage";
                    image.src = card.imageUrl;
                    image.alt = name;
                    image.setAttribute("role", "presentation");
                    imageWrapper.appendChild(image);
                    img.appendChild(imageWrapper);
                }
                if (card.youTubeId) {
                    var screenshot = document.createElement("img");
                    screenshot.className = "ui image";
                    screenshot.src = "https://img.youtube.com/vi/" + card.youTubeId + "/maxresdefault.jpg";
                    img.appendChild(screenshot);
                }
                if (card.cardType == "file") {
                    var file = div(r, "ui fileimage");
                    img.appendChild(file);
                }
                if (name || card.description) {
                    var ct = div(r, "ui content");
                    if (name) {
                        r.setAttribute("aria-label", name);
                        if (url && !link)
                            a(ct, url, name, 'header');
                        else
                            div(ct, 'header', 'div', name);
                    }
                    if (card.description) {
                        var descr = div(ct, 'ui description');
                        descr.appendChild(document.createTextNode(card.description.split('.')[0] + '.'));
                    }
                }
                if (card.time) {
                    var meta = div(r, "meta");
                    if (card.time) {
                        var m = div(meta, "date", "span");
                        m.appendChild(document.createTextNode(pxt.Util.timeSince(card.time)));
                    }
                }
                if (card.extracontent) {
                    var extracontent = div(r, "extra content", "div");
                    extracontent.appendChild(document.createTextNode(card.extracontent));
                }
                return r;
            }
            codeCard.render = render;
        })(codeCard = docs.codeCard || (docs.codeCard = {}));
    })(docs = pxt.docs || (pxt.docs = {}));
})(pxt || (pxt = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldColorWheel = /** @class */ (function (_super) {
        __extends(FieldColorWheel, _super);
        /**
         * Class for a color wheel field.
         * @param {number|string} value The initial content of the field.
         * @param {Function=} opt_validator An optional function that is called
         *     to validate any constraints on what the user entered.  Takes the new
         *     text as an argument and returns either the accepted text, a replacement
         *     text, or null to abort the change.
         * @extends {Blockly.FieldNumber}
         * @constructor
         */
        function FieldColorWheel(value_, params, opt_validator) {
            var _this = _super.call(this, String(value_), '0', '255', null, '10', 'Color', opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.params = params;
            if (_this.params['min'])
                _this.min_ = parseFloat(_this.params['min']);
            if (_this.params['max'])
                _this.max_ = parseFloat(_this.params['max']);
            if (_this.params['label'])
                _this.labelText_ = _this.params['label'];
            if (_this.params['channel'])
                _this.channel_ = _this.params['channel'];
            return _this;
        }
        /**
         * Set the gradient CSS properties for the given node and channel
         * @param {Node} node - The DOM node the gradient will be set on.
         * @private
         */
        FieldColorWheel.prototype.setBackground_ = function (node) {
            var gradient = this.createColourStops_().join(',');
            goog.style.setStyle(node, 'background', '-moz-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-webkit-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-o-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', '-ms-linear-gradient(left, ' + gradient + ')');
            goog.style.setStyle(node, 'background', 'linear-gradient(left, ' + gradient + ')');
            if (this.params['sliderWidth'])
                goog.style.setStyle(node, 'width', this.params['sliderWidth'] + "px");
        };
        ;
        FieldColorWheel.prototype.setReadout_ = function (readout, value) {
            var hexValue = this.colorWheel(parseInt(value), this.channel_);
            readout.innerHTML = "<span class=\"blocklyColorReadout\" style=\"background-color: " + hexValue + ";\"></span>";
        };
        FieldColorWheel.prototype.createColourStops_ = function () {
            var stops = [];
            for (var n = 0; n <= 255; n += 20) {
                stops.push(this.colorWheel(n, this.channel_));
            }
            return stops;
        };
        ;
        FieldColorWheel.prototype.colorWheel = function (wheelPos, channel) {
            if (channel == "hsvfast") {
                return this.hsvFast(wheelPos, 255, 255);
            }
            else {
                wheelPos = 255 - wheelPos;
                if (wheelPos < 85) {
                    return this.hex(wheelPos * 3, 255, 255 - wheelPos * 3);
                }
                if (wheelPos < 170) {
                    wheelPos -= 85;
                    return this.hex(255, 255 - wheelPos * 3, wheelPos * 3);
                }
                wheelPos -= 170;
                return this.hex(255 - wheelPos * 3, wheelPos * 3, 255);
            }
        };
        FieldColorWheel.prototype.hsvFast = function (hue, sat, val) {
            var h = (hue % 255) >> 0;
            if (h < 0)
                h += 255;
            // scale down to 0..192
            h = (h * 192 / 255) >> 0;
            //reference: based on FastLED's hsv2rgb rainbow algorithm [https://github.com/FastLED/FastLED](MIT)
            var invsat = 255 - sat;
            var brightness_floor = ((val * invsat) / 255) >> 0;
            var color_amplitude = val - brightness_floor;
            var section = (h / 0x40) >> 0; // [0..2]
            var offset = (h % 0x40) >> 0; // [0..63]
            var rampup = offset;
            var rampdown = (0x40 - 1) - offset;
            var rampup_amp_adj = ((rampup * color_amplitude) / (255 / 4)) >> 0;
            var rampdown_amp_adj = ((rampdown * color_amplitude) / (255 / 4)) >> 0;
            var rampup_adj_with_floor = (rampup_amp_adj + brightness_floor);
            var rampdown_adj_with_floor = (rampdown_amp_adj + brightness_floor);
            var r;
            var g;
            var b;
            if (section) {
                if (section == 1) {
                    // section 1: 0x40..0x7F
                    r = brightness_floor;
                    g = rampdown_adj_with_floor;
                    b = rampup_adj_with_floor;
                }
                else {
                    // section 2; 0x80..0xBF
                    r = rampup_adj_with_floor;
                    g = brightness_floor;
                    b = rampdown_adj_with_floor;
                }
            }
            else {
                // section 0: 0x00..0x3F
                r = rampdown_adj_with_floor;
                g = rampup_adj_with_floor;
                b = brightness_floor;
            }
            return this.hex(r, g, b);
        };
        FieldColorWheel.prototype.hex = function (red, green, blue) {
            return "#" + this.componentToHex(red & 0xFF) + this.componentToHex(green & 0xFF) + this.componentToHex(blue & 0xFF);
        };
        FieldColorWheel.prototype.componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };
        return FieldColorWheel;
    }(Blockly.FieldSlider));
    pxtblockly.FieldColorWheel = FieldColorWheel;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldColorNumber = /** @class */ (function (_super) {
        __extends(FieldColorNumber, _super);
        function FieldColorNumber(text, params, opt_validator) {
            var _this = _super.call(this, text, opt_validator) || this;
            _this.isFieldCustom_ = true;
            if (params.colours)
                _this.setColours(JSON.parse(params.colours));
            if (params.columns)
                _this.setColumns(parseInt(params.columns));
            if (params.className)
                _this.className_ = params.className;
            return _this;
        }
        /**
         * Return the current colour.
         * @param {boolean} opt_asHex optional field if the returned value should be a hex
         * @return {string} Current colour in '#rrggbb' format.
         */
        FieldColorNumber.prototype.getValue = function (opt_asHex) {
            if (!opt_asHex && this.colour_.indexOf('#') > -1) {
                return "0x" + this.colour_.replace(/^#/, '');
            }
            return this.colour_;
        };
        /**
         * Set the colour.
         * @param {string} colour The new colour in '#rrggbb' format.
         */
        FieldColorNumber.prototype.setValue = function (colour) {
            if (colour.indexOf('0x') > -1) {
                colour = "#" + colour.substr(2);
            }
            if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
                this.colour_ != colour) {
                Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.colour_, colour));
            }
            this.colour_ = colour;
            if (this.sourceBlock_) {
                this.sourceBlock_.setColour(colour, colour, colour);
            }
        };
        FieldColorNumber.prototype.showEditor_ = function () {
            _super.prototype.showEditor_.call(this);
            if (this.className_ && this.colorPicker_)
                Blockly.utils.addClass((this.colorPicker_.getElement()), this.className_);
        };
        return FieldColorNumber;
    }(Blockly.FieldColour));
    pxtblockly.FieldColorNumber = FieldColorNumber;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldColorPicker = /** @class */ (function (_super) {
        __extends(FieldColorPicker, _super);
        function FieldColorPicker(text, params, opt_validator) {
            var _this = _super.call(this, text, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldColorPicker.prototype.getValue = function () {
            return "\"" + this.colour_ + "\"";
        };
        return FieldColorPicker;
    }(Blockly.FieldColourSlider));
    pxtblockly.FieldColorPicker = FieldColorPicker;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldGridPicker = /** @class */ (function (_super) {
        __extends(FieldGridPicker, _super);
        function FieldGridPicker(text, options, validator) {
            var _this = _super.call(this, options.data) || this;
            _this.isFieldCustom_ = true;
            _this.tooltips_ = [];
            _this.columns_ = parseInt(options.columns) || 4;
            _this.maxRows_ = parseInt(options.maxRows) || 0;
            _this.width_ = parseInt(options.width) || 400;
            _this.backgroundColour_ = pxtblockly.parseColour(options.colour);
            _this.itemColour_ = options.itemColour || "rgba(255, 255, 255, 0.6)";
            _this.borderColour_ = Blockly.PXTUtils.fadeColour(_this.backgroundColour_, 0.4, false);
            var tooltipCfg = {
                xOffset: parseInt(options.tooltipsXOffset) || 15,
                yOffset: parseInt(options.tooltipsYOffset) || -10
            };
            _this.tooltipConfig_ = tooltipCfg;
            _this.hasSearchBar_ = !!options.hasSearchBar || false;
            _this.hideRect_ = !!options.hideRect || false;
            return _this;
        }
        /**
         * When disposing the grid picker, make sure the tooltips are disposed too.
         * @public
         */
        FieldGridPicker.prototype.dispose = function () {
            _super.prototype.dispose.call(this);
            this.disposeTooltips();
        };
        /**
         * Create blocklyGridPickerRows and add them to table container
         * @param options
         * @param tableContainer
         */
        FieldGridPicker.prototype.populateTableContainer = function (options, tableContainer) {
            this.disposeTooltips();
            tableContainer.removeChildren(true);
            if (options.length == 0) {
                this.firstItem_ = undefined;
            }
            for (var i = 0; i < options.length / this.columns_; i++) {
                var row = this.createRow(i, options);
                tableContainer.addChild(row, true);
            }
            var tableContainerDom = tableContainer.getElement();
            if (tableContainerDom) {
                var menuItemsDom = tableContainerDom.childNodes;
                for (var i = 0; i < menuItemsDom.length; ++i) {
                    var elem = menuItemsDom[i];
                    elem.className = "blocklyGridPickerRow";
                }
            }
        };
        /**
         * Add the tooltips and style the items
         * @param options
         * @param tableContainer
         */
        FieldGridPicker.prototype.createTooltips = function (options, tableContainer) {
            var _this = this;
            var needToFloatLeft = (options.length < this.columns_);
            var tableContainerDom = tableContainer.getElement();
            var menuItemsDom = tableContainerDom.getElementsByClassName('goog-menuitem');
            var largestTextItem = -1;
            var _loop_3 = function (i) {
                var elem = menuItemsDom[i];
                elem.style.borderColor = this_2.backgroundColour_;
                elem.style.backgroundColor = this_2.itemColour_;
                if (needToFloatLeft) {
                    elem.className += " floatLeft";
                }
                var tooltipText = options[i][0].alt;
                if (tooltipText) {
                    var tooltip_1 = new goog.ui.Tooltip(elem, tooltipText);
                    var onShowOld_1 = tooltip_1.onShow;
                    var isRTL = this_2.sourceBlock_.RTL;
                    var xOffset_1 = (isRTL ? -this_2.tooltipConfig_.xOffset : this_2.tooltipConfig_.xOffset);
                    tooltip_1.onShow = function () {
                        onShowOld_1.call(tooltip_1);
                        var newPos = new goog.positioning.ClientPosition(tooltip_1.cursorPosition.x + xOffset_1, tooltip_1.cursorPosition.y + _this.tooltipConfig_.yOffset);
                        tooltip_1.setPosition(newPos);
                    };
                    tooltip_1.setShowDelayMs(0);
                    tooltip_1.className = 'goog-tooltip blocklyGridPickerTooltip';
                    elem.addEventListener('mousemove', function (e) {
                        var newPos = new goog.positioning.ClientPosition(e.clientX + xOffset_1, e.clientY + _this.tooltipConfig_.yOffset);
                        tooltip_1.setPosition(newPos);
                    });
                    this_2.tooltips_.push(tooltip_1);
                }
                else {
                    var elemWidth = goog.style.getSize(elem).width;
                    if (elemWidth > largestTextItem) {
                        largestTextItem = elemWidth;
                    }
                }
            };
            var this_2 = this;
            for (var i = 0; i < menuItemsDom.length; ++i) {
                _loop_3(i);
            }
            // Resize text items so they have a uniform width
            if (largestTextItem > -1) {
                for (var i = 0; i < menuItemsDom.length; ++i) {
                    var elem = menuItemsDom[i];
                    goog.style.setWidth(elem, largestTextItem);
                }
            }
        };
        /**
         * Whether or not to show a box around the dropdown menu.
         * @return {boolean} True if we should show a box (rect) around the dropdown menu. Otherwise false.
         * @private
         */
        FieldGridPicker.prototype.shouldShowRect_ = function () {
            return !this.hideRect_ ? !this.sourceBlock_.isShadow() : false;
        };
        /**
         * Selects menu item and closes gridpicker
         * @param item = the item to select
         */
        FieldGridPicker.prototype.selectItem = function (item) {
            if (this.menu_) {
                this.onItemSelected(this.menu_, item);
                this.close();
            }
        };
        /**
         * Closes the gridpicker.
         */
        FieldGridPicker.prototype.close = function () {
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.Events.setGroup(false);
            this.disposeTooltips();
        };
        /**
         * Getter method
         */
        FieldGridPicker.prototype.getFirstItem = function () {
            return this.firstItem_;
        };
        /**
         * Highlight first item in menu, de-select and de-highlight all others
         */
        FieldGridPicker.prototype.highlightFirstItem = function (tableContainerDom) {
            var menuItemsDom = tableContainerDom.childNodes;
            if (menuItemsDom.length && menuItemsDom[0].childNodes) {
                for (var row = 0; row < menuItemsDom.length; ++row) {
                    var rowLength = menuItemsDom[row].childNodes.length;
                    for (var col = 0; col < rowLength; ++col) {
                        var menuItem = menuItemsDom[row].childNodes[col];
                        menuItem.classList.remove("goog-menuitem-highlight");
                        menuItem.classList.remove("goog-option-selected");
                    }
                }
                var firstItem = menuItemsDom[0].childNodes[0];
                firstItem.className += " goog-menuitem-highlight";
            }
        };
        /**
         * Scroll menu to item that equals current value of gridpicker
         */
        FieldGridPicker.prototype.highlightAndScrollSelected = function (tableContainer, scrollContainerDom) {
            var tableContainerDom = tableContainer.getElement();
            var rowCount = tableContainer.getChildCount();
            var selectedItemDom;
            for (var row = 0; row < rowCount; ++row) {
                for (var col = 0; col < this.columns_; ++col) {
                    var val = tableContainer.getChildAt(row).getChildAt(col).getValue();
                    if (this.value_ === val) {
                        selectedItemDom = tableContainerDom.children[row].children[col];
                        break;
                    }
                }
                if (selectedItemDom) {
                    goog.style.scrollIntoContainerView(selectedItemDom, scrollContainerDom, true);
                    break;
                }
            }
        };
        /**
         * Create a dropdown menu under the text.
         * @private
         */
        FieldGridPicker.prototype.showEditor_ = function () {
            var _this = this;
            Blockly.WidgetDiv.show(this, this.sourceBlock_.RTL, null);
            this.disposeTooltips();
            var options = this.getOptions();
            // Container for the menu rows
            var tableContainer = new goog.ui.Control();
            //const tableContainer = this.getTableContainer(options);
            this.populateTableContainer(options, tableContainer);
            // Container used to limit the height of the tableContainer, because the tableContainer uses
            // display: table, which ignores height and maxHeight
            var scrollContainer = new goog.ui.Control();
            // Needed to correctly style borders and padding around the scrollContainer, because the padding around the
            // scrollContainer is part of the scrollable area and will not be correctly shown at the top and bottom
            // when scrolling
            var paddingContainer = new goog.ui.Control();
            // Record windowSize and scrollOffset before adding menu.
            var windowSize = goog.dom.getViewportSize();
            var scrollOffset = goog.style.getViewportPageOffset(document);
            var xy = this.getAbsoluteXY_();
            var borderBBox = this.getScaledBBox_();
            var div = Blockly.WidgetDiv.DIV;
            scrollContainer.addChild(tableContainer, true);
            paddingContainer.addChild(scrollContainer, true);
            paddingContainer.render(div);
            var paddingContainerDom = paddingContainer.getElement();
            var scrollContainerDom = scrollContainer.getElement();
            var tableContainerDom = tableContainer.getElement();
            // Search bar
            if (this.hasSearchBar_) {
                var searchBarDiv = document.createElement("div");
                searchBarDiv.setAttribute("class", "ui fluid icon input");
                var searchIcon = document.createElement("i");
                searchIcon.setAttribute("class", "search icon");
                var searchBar_1 = document.createElement("input");
                searchBar_1.setAttribute("type", "search");
                searchBar_1.setAttribute("id", "search-bar");
                searchBar_1.setAttribute("class", "blocklyGridPickerSearchBar");
                searchBar_1.setAttribute("placeholder", pxt.Util.lf("Search"));
                searchBar_1.addEventListener("click", function () {
                    searchBar_1.focus();
                    searchBar_1.setSelectionRange(0, searchBar_1.value.length);
                });
                searchBar_1.addEventListener("keyup", Util.debounce(function () {
                    var text = searchBar_1.value;
                    var re = new RegExp(text, "i");
                    var filteredOptions = options.filter(function (block) {
                        var alt = block[0].alt; // Human-readable text or image.
                        var value = block[1]; // Language-neutral value.
                        return alt ? re.test(alt) : re.test(value);
                    });
                    _this.populateTableContainer.bind(_this)(filteredOptions, tableContainer);
                    _this.createTooltips(filteredOptions, tableContainer);
                    if (text) {
                        _this.highlightFirstItem(tableContainerDom);
                    }
                    else {
                        _this.highlightAndScrollSelected(tableContainer, scrollContainerDom);
                    }
                }, 300, false));
                searchBar_1.addEventListener("keyup", function (e) {
                    if (e.keyCode == 13) {
                        var text = searchBar_1.value;
                        var firstItem = _this.getFirstItem();
                        if (text && firstItem) {
                            _this.selectItem(firstItem);
                        }
                    }
                });
                searchBarDiv.appendChild(searchBar_1);
                searchBarDiv.appendChild(searchIcon);
                paddingContainerDom.insertBefore(searchBarDiv, paddingContainerDom.childNodes[0]);
                searchBar_1.focus();
            }
            paddingContainerDom.style.border = "solid 1px " + this.borderColour_;
            tableContainerDom.style.backgroundColor = this.backgroundColour_;
            scrollContainerDom.style.backgroundColor = this.backgroundColour_;
            paddingContainerDom.style.backgroundColor = this.backgroundColour_;
            tableContainerDom.className = 'blocklyGridPickerMenu';
            scrollContainerDom.className = 'blocklyGridPickerScroller';
            paddingContainerDom.className = 'blocklyGridPickerPadder';
            this.createTooltips(options, tableContainer);
            // Resize the grid picker if width > screen width
            if (this.width_ > windowSize.width) {
                this.width_ = windowSize.width;
            }
            tableContainerDom.style.width = this.width_ + 'px';
            // Record current container sizes after adding menu.
            var paddingContainerSize = goog.style.getSize(paddingContainerDom);
            var scrollContainerSize = goog.style.getSize(scrollContainerDom);
            // Recalculate dimensions for the total content, not only box.
            scrollContainerSize.height = scrollContainerDom.scrollHeight;
            scrollContainerSize.width = scrollContainerDom.scrollWidth;
            paddingContainerSize.height = paddingContainerDom.scrollHeight;
            paddingContainerSize.width = paddingContainerDom.scrollWidth;
            // Limit scroll container's height if a row limit was specified
            if (this.maxRows_ > 0) {
                var firstRowDom = tableContainerDom.children[0];
                var rowSize = goog.style.getSize(firstRowDom);
                // Compute maxHeight using maxRows + 0.3 to partially show next row, to hint at scrolling
                var maxHeight = rowSize.height * (this.maxRows_ + 0.3);
                // If the current height is greater than the computed max height, limit the height of the scroll
                // container and increase its width to accomodate the scrollbar
                if (scrollContainerSize.height > maxHeight) {
                    scrollContainerDom.style.overflowY = "auto";
                    goog.style.setHeight(scrollContainerDom, maxHeight);
                    // Calculate total border, margin and padding width
                    var scrollPaddings = goog.style.getPaddingBox(scrollContainerDom);
                    var scrollPaddingWidth = scrollPaddings.left + scrollPaddings.right;
                    var scrollMargins = goog.style.getMarginBox(scrollContainerDom);
                    var scrollMarginWidth = scrollMargins.left + scrollMargins.right;
                    var scrollBorders = goog.style.getBorderBox(scrollContainerDom);
                    var scrollBorderWidth = scrollBorders.left + scrollBorders.right;
                    var totalExtraWidth = scrollPaddingWidth + scrollMarginWidth + scrollBorderWidth;
                    // Increase scroll container's width by the width of the scrollbar, so that we don't have horizontal scrolling
                    var scrollbarWidth = scrollContainerDom.offsetWidth - scrollContainerDom.clientWidth - totalExtraWidth;
                    goog.style.setWidth(scrollContainerDom, scrollContainerSize.width + scrollbarWidth);
                    // Refresh the padding container's dimensions
                    paddingContainerSize.height = paddingContainerDom.scrollHeight;
                    paddingContainerSize.width = paddingContainerDom.scrollWidth;
                    // Scroll the currently selected item into view
                    this.highlightAndScrollSelected(tableContainer, scrollContainerDom);
                }
            }
            // Position the menu.
            // Flip menu vertically if off the bottom.
            var borderBBoxHeight = borderBBox.bottom - xy.y;
            var borderBBoxWidth = borderBBox.right - xy.x;
            if (xy.y + paddingContainerSize.height + borderBBoxHeight >=
                windowSize.height + scrollOffset.y) {
                xy.y -= paddingContainerSize.height + 2;
            }
            else {
                xy.y += borderBBoxHeight;
            }
            if (this.sourceBlock_.RTL) {
                xy.x -= paddingContainerSize.width / 2;
                // Don't go offscreen left.
                if (xy.x < scrollOffset.x) {
                    xy.x = scrollOffset.x;
                }
            }
            else {
                xy.x += borderBBoxWidth / 2 - paddingContainerSize.width / 2;
                // Don't go offscreen right.
                if (xy.x > windowSize.width + scrollOffset.x - paddingContainerSize.width) {
                    xy.x = windowSize.width + scrollOffset.x - paddingContainerSize.width;
                }
            }
            Blockly.WidgetDiv.position(xy.x, xy.y, windowSize, scrollOffset, this.sourceBlock_.RTL);
            tableContainerDom.focus();
        };
        FieldGridPicker.prototype.createRow = function (row, options) {
            var _this = this;
            var columns = this.columns_;
            var menu = new goog.ui.Menu();
            menu.setRightToLeft(this.sourceBlock_.RTL);
            for (var i = (columns * row); i < Math.min((columns * row) + columns, options.length); i++) {
                var content = options[i][0]; // Human-readable text or image.
                var value = options[i][1]; // Language-neutral value.
                if (typeof content == 'object') {
                    // An image, not text.
                    var image = new Image(content['width'], content['height']);
                    image.src = content['src'];
                    image.alt = content['alt'] || '';
                    content = image;
                }
                var menuItem = new goog.ui.MenuItem(content);
                menuItem.setRightToLeft(this.sourceBlock_.RTL);
                menuItem.setValue(value);
                menuItem.setCheckable(true);
                menuItem.setChecked(value == this.value_);
                menu.addChild(menuItem, true);
                if (i == 0) {
                    this.firstItem_ = menuItem;
                }
            }
            // Listen for mouse/keyboard events.
            goog.events.listen(menu, goog.ui.Component.EventType.ACTION, function (e) {
                var menuItem = e.target;
                if (menuItem) {
                    _this.selectItem.bind(_this)(menuItem);
                }
            });
            this.menu_ = menu;
            return menu;
        };
        /**
         * Disposes the tooltip DOM elements.
         * @private
         */
        FieldGridPicker.prototype.disposeTooltips = function () {
            if (this.tooltips_ && this.tooltips_.length) {
                this.tooltips_.forEach(function (t) { return t.dispose(); });
                this.tooltips_ = [];
            }
        };
        /**
         * Sets the text in this field.  Trigger a rerender of the source block.
         * @param {?string} text New text.
         */
        FieldGridPicker.prototype.setText = function (text) {
            if (text === null || text === this.text_) {
                // No change if null.
                return;
            }
            this.text_ = text;
            this.updateTextNode_();
            if (this.imageJson_ && this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyHidden');
                this.imageElement_.parentNode.appendChild(this.arrow_);
            }
            else if (this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyDropdownText');
                this.textElement_.parentNode.appendChild(this.arrow_);
            }
            if (this.sourceBlock_ && this.sourceBlock_.rendered) {
                this.sourceBlock_.render();
                this.sourceBlock_.bumpNeighbours_();
            }
        };
        ;
        /**
         * Updates the width of the field. This calls getCachedWidth which won't cache
         * the approximated width on IE/Edge when `getComputedTextLength` fails. Once
         * it eventually does succeed, the result will be cached.
         **/
        FieldGridPicker.prototype.updateWidth = function () {
            var width;
            if (this.imageJson_) {
                width = this.imageJson_.width + 5;
                this.arrowY_ = this.imageJson_.height / 2;
            }
            else {
                // Calculate width of field
                width = Blockly.Field.getCachedWidth(this.textElement_);
            }
            // Add padding to left and right of text.
            if (this.EDITABLE) {
                width += Blockly.BlockSvg.EDITABLE_FIELD_PADDING;
            }
            // Adjust width for drop-down arrows.
            this.arrowWidth_ = 0;
            if (this.positionArrow) {
                this.arrowWidth_ = this.positionArrow(width);
                width += this.arrowWidth_;
            }
            // Add padding to any drawn box.
            if (this.box_) {
                width += 2 * Blockly.BlockSvg.BOX_FIELD_PADDING;
            }
            // Set width of the field.
            this.size_.width = width;
        };
        ;
        /**
         * Update the text node of this field to display the current text.
         * @private
         */
        FieldGridPicker.prototype.updateTextNode_ = function () {
            if (!this.textElement_ && !this.imageElement_) {
                // Not rendered yet.
                return;
            }
            var text = this.text_;
            if (text.length > this.maxDisplayLength) {
                // Truncate displayed string and add an ellipsis ('...').
                text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
                // Add special class for sizing font when truncated
                this.textElement_.setAttribute('class', 'blocklyText blocklyTextTruncated');
            }
            else {
                this.textElement_.setAttribute('class', 'blocklyText');
            }
            // Empty the text element.
            goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
            goog.dom.removeNode(this.imageElement_);
            this.imageElement_ = null;
            if (this.imageJson_) {
                // Image option is selected.
                this.imageElement_ = Blockly.utils.createSvgElement('image', {
                    'y': 5, 'x': 8, 'height': this.imageJson_.height + 'px',
                    'width': this.imageJson_.width + 'px', cursor: 'pointer'
                });
                this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.imageJson_.src);
                this.size_.height = Number(this.imageJson_.height) + 10;
                if (this.sourceBlock_.RTL)
                    this.imageElement_.setAttribute('transform', 'translate(' + this.arrowWidth_ + ', 0)');
                this.textElement_.parentNode.appendChild(this.imageElement_);
            }
            else {
                // Replace whitespace with non-breaking spaces so the text doesn't collapse.
                text = text.replace(/\s/g, Blockly.Field.NBSP);
                if (this.sourceBlock_.RTL && text) {
                    // The SVG is LTR, force text to be RTL.
                    text += '\u200F';
                }
                if (!text) {
                    // Prevent the field from disappearing if empty.
                    text = Blockly.Field.NBSP;
                }
                var textNode = document.createTextNode(text);
                this.textElement_.appendChild(textNode);
            }
            // Cached width is obsolete.  Clear it.
            this.size_.width = 0;
        };
        ;
        return FieldGridPicker;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldGridPicker = FieldGridPicker;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldImageDropdown = /** @class */ (function (_super) {
        __extends(FieldImageDropdown, _super);
        function FieldImageDropdown(text, options, validator) {
            var _this = _super.call(this, options.data) || this;
            _this.isFieldCustom_ = true;
            /**
             * Callback for when a button is clicked inside the drop-down.
             * Should be bound to the FieldIconMenu.
             * @param {Event} e DOM event for the click/touch
             * @private
             */
            _this.buttonClick_ = function (e) {
                var value = e.target.getAttribute('data-value');
                this.setValue(value);
                this.setText(value);
                Blockly.DropDownDiv.hide();
            };
            /**
             * Callback for when the drop-down is hidden.
             */
            _this.onHide_ = function () {
                Blockly.DropDownDiv.content_.removeAttribute('role');
                Blockly.DropDownDiv.content_.removeAttribute('aria-haspopup');
                Blockly.DropDownDiv.content_.removeAttribute('aria-activedescendant');
            };
            _this.columns_ = parseInt(options.columns);
            _this.maxRows_ = parseInt(options.maxRows) || 0;
            _this.width_ = parseInt(options.width) || 300;
            _this.backgroundColour_ = pxtblockly.parseColour(options.colour);
            _this.itemColour_ = options.itemColour || "rgba(255, 255, 255, 0.6)";
            _this.borderColour_ = Blockly.PXTUtils.fadeColour(_this.backgroundColour_, 0.4, false);
            return _this;
        }
        /**
         * Create a dropdown menu under the text.
         * @private
         */
        FieldImageDropdown.prototype.showEditor_ = function () {
            // If there is an existing drop-down we own, this is a request to hide the drop-down.
            if (Blockly.DropDownDiv.hideIfOwner(this)) {
                return;
            }
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            // Populate the drop-down with the icons for this field.
            var dropdownDiv = Blockly.DropDownDiv.getContentDiv();
            var contentDiv = document.createElement('div');
            // Accessibility properties
            contentDiv.setAttribute('role', 'menu');
            contentDiv.setAttribute('aria-haspopup', 'true');
            var options = this.getOptions();
            for (var i = 0, option = void 0; option = options[i]; i++) {
                var content = options[i][0]; // Human-readable text or image.
                var value = options[i][1]; // Language-neutral value.
                // Icons with the type property placeholder take up space but don't have any functionality
                // Use for special-case layouts
                if (content.type == 'placeholder') {
                    var placeholder = document.createElement('span');
                    placeholder.setAttribute('class', 'blocklyDropDownPlaceholder');
                    placeholder.style.width = content.width + 'px';
                    placeholder.style.height = content.height + 'px';
                    contentDiv.appendChild(placeholder);
                    continue;
                }
                var button = document.createElement('button');
                button.setAttribute('id', ':' + i); // For aria-activedescendant
                button.setAttribute('role', 'menuitem');
                button.setAttribute('class', 'blocklyDropDownButton');
                button.title = content.alt;
                if (this.columns_) {
                    button.style.width = ((this.width_ / this.columns_) - 8) + 'px';
                    button.style.height = ((this.width_ / this.columns_) - 8) + 'px';
                }
                else {
                    button.style.width = content.width + 'px';
                    button.style.height = content.height + 'px';
                }
                var backgroundColor = this.backgroundColour_;
                if (value == this.getValue()) {
                    // This icon is selected, show it in a different colour
                    backgroundColor = this.sourceBlock_.getColourTertiary();
                    button.setAttribute('aria-selected', 'true');
                }
                button.style.backgroundColor = backgroundColor;
                button.style.borderColor = this.borderColour_;
                Blockly.bindEvent_(button, 'click', this, this.buttonClick_);
                Blockly.bindEvent_(button, 'mouseup', this, this.buttonClick_);
                // These are applied manually instead of using the :hover pseudoclass
                // because Android has a bad long press "helper" menu and green highlight
                // that we must prevent with ontouchstart preventDefault
                Blockly.bindEvent_(button, 'mousedown', button, function (e) {
                    this.setAttribute('class', 'blocklyDropDownButton blocklyDropDownButtonHover');
                    e.preventDefault();
                });
                Blockly.bindEvent_(button, 'mouseover', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton blocklyDropDownButtonHover');
                    contentDiv.setAttribute('aria-activedescendant', this.id);
                });
                Blockly.bindEvent_(button, 'mouseout', button, function () {
                    this.setAttribute('class', 'blocklyDropDownButton');
                    contentDiv.removeAttribute('aria-activedescendant');
                });
                var buttonImg = document.createElement('img');
                buttonImg.src = content.src;
                //buttonImg.alt = icon.alt;
                // Upon click/touch, we will be able to get the clicked element as e.target
                // Store a data attribute on all possible click targets so we can match it to the icon.
                button.setAttribute('data-value', value);
                buttonImg.setAttribute('data-value', value);
                button.appendChild(buttonImg);
                contentDiv.appendChild(button);
            }
            contentDiv.style.width = this.width_ + 'px';
            dropdownDiv.appendChild(contentDiv);
            Blockly.DropDownDiv.setColour(this.backgroundColour_, this.borderColour_);
            var scale = this.sourceBlock_.workspace.scale;
            // Offset for icon-type horizontal blocks.
            var secondaryYOffset = (-(Blockly.BlockSvg.MIN_BLOCK_Y * scale) - (Blockly.BlockSvg.FIELD_Y_OFFSET * scale));
            var renderedPrimary = Blockly.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_, this.onHide_.bind(this), secondaryYOffset);
        };
        /**
         * Sets the text in this field.  Trigger a rerender of the source block.
         * @param {?string} text New text.
         */
        FieldImageDropdown.prototype.setText = function (text) {
            if (text === null || text === this.text_) {
                // No change if null.
                return;
            }
            this.text_ = text;
            this.updateTextNode_();
            if (this.imageJson_ && this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyHidden');
                this.imageElement_.parentNode.appendChild(this.arrow_);
            }
            else if (this.textElement_) {
                // Update class for dropdown text.
                // This class is reset every time updateTextNode_ is called.
                this.textElement_.setAttribute('class', this.textElement_.getAttribute('class') + ' blocklyDropdownText');
                this.textElement_.parentNode.appendChild(this.arrow_);
            }
            if (this.sourceBlock_ && this.sourceBlock_.rendered) {
                this.sourceBlock_.render();
                this.sourceBlock_.bumpNeighbours_();
            }
        };
        ;
        /**
         * Updates the width of the field. This calls getCachedWidth which won't cache
         * the approximated width on IE/Edge when `getComputedTextLength` fails. Once
         * it eventually does succeed, the result will be cached.
         **/
        FieldImageDropdown.prototype.updateWidth = function () {
            // Calculate width of field
            var width = this.imageJson_.width + 5;
            // Add padding to left and right of text.
            if (this.EDITABLE) {
                width += Blockly.BlockSvg.EDITABLE_FIELD_PADDING;
            }
            this.arrowY_ = this.imageJson_.height / 2;
            // Adjust width for drop-down arrows.
            this.arrowWidth_ = 0;
            if (this.positionArrow) {
                this.arrowWidth_ = this.positionArrow(width);
                width += this.arrowWidth_;
            }
            // Add padding to any drawn box.
            if (this.box_) {
                width += 2 * Blockly.BlockSvg.BOX_FIELD_PADDING;
            }
            // Set width of the field.
            this.size_.width = width;
        };
        ;
        /**
         * Update the text node of this field to display the current text.
         * @private
         */
        FieldImageDropdown.prototype.updateTextNode_ = function () {
            if (!this.textElement_ && !this.imageElement_) {
                // Not rendered yet.
                return;
            }
            var text = this.text_;
            if (text.length > this.maxDisplayLength) {
                // Truncate displayed string and add an ellipsis ('...').
                text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
                // Add special class for sizing font when truncated
                this.textElement_.setAttribute('class', 'blocklyText blocklyTextTruncated');
            }
            else {
                this.textElement_.setAttribute('class', 'blocklyText');
            }
            // Empty the text element.
            goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
            goog.dom.removeNode(this.imageElement_);
            this.imageElement_ = null;
            if (this.imageJson_) {
                // Image option is selected.
                this.imageElement_ = Blockly.utils.createSvgElement('image', { 'y': 5, 'x': 8, 'height': this.imageJson_.height + 'px',
                    'width': this.imageJson_.width + 'px' });
                this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', this.imageJson_.src);
                this.size_.height = Number(this.imageJson_.height) + 10;
                this.textElement_.parentNode.appendChild(this.imageElement_);
            }
            else {
                // Replace whitespace with non-breaking spaces so the text doesn't collapse.
                text = text.replace(/\s/g, Blockly.Field.NBSP);
                if (this.sourceBlock_.RTL && text) {
                    // The SVG is LTR, force text to be RTL.
                    text += '\u200F';
                }
                if (!text) {
                    // Prevent the field from disappearing if empty.
                    text = Blockly.Field.NBSP;
                }
                var textNode = document.createTextNode(text);
                this.textElement_.appendChild(textNode);
            }
            // Cached width is obsolete.  Clear it.
            this.size_.width = 0;
        };
        ;
        return FieldImageDropdown;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldImageDropdown = FieldImageDropdown;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var Note;
    (function (Note) {
        Note[Note["C"] = 262] = "C";
        Note[Note["CSharp"] = 277] = "CSharp";
        Note[Note["D"] = 294] = "D";
        Note[Note["Eb"] = 311] = "Eb";
        Note[Note["E"] = 330] = "E";
        Note[Note["F"] = 349] = "F";
        Note[Note["FSharp"] = 370] = "FSharp";
        Note[Note["G"] = 392] = "G";
        Note[Note["GSharp"] = 415] = "GSharp";
        Note[Note["A"] = 440] = "A";
        Note[Note["Bb"] = 466] = "Bb";
        Note[Note["B"] = 494] = "B";
        Note[Note["C3"] = 131] = "C3";
        Note[Note["CSharp3"] = 139] = "CSharp3";
        Note[Note["D3"] = 147] = "D3";
        Note[Note["Eb3"] = 156] = "Eb3";
        Note[Note["E3"] = 165] = "E3";
        Note[Note["F3"] = 175] = "F3";
        Note[Note["FSharp3"] = 185] = "FSharp3";
        Note[Note["G3"] = 196] = "G3";
        Note[Note["GSharp3"] = 208] = "GSharp3";
        Note[Note["A3"] = 220] = "A3";
        Note[Note["Bb3"] = 233] = "Bb3";
        Note[Note["B3"] = 247] = "B3";
        Note[Note["C4"] = 262] = "C4";
        Note[Note["CSharp4"] = 277] = "CSharp4";
        Note[Note["D4"] = 294] = "D4";
        Note[Note["Eb4"] = 311] = "Eb4";
        Note[Note["E4"] = 330] = "E4";
        Note[Note["F4"] = 349] = "F4";
        Note[Note["FSharp4"] = 370] = "FSharp4";
        Note[Note["G4"] = 392] = "G4";
        Note[Note["GSharp4"] = 415] = "GSharp4";
        Note[Note["A4"] = 440] = "A4";
        Note[Note["Bb4"] = 466] = "Bb4";
        Note[Note["B4"] = 494] = "B4";
        Note[Note["C5"] = 523] = "C5";
        Note[Note["CSharp5"] = 555] = "CSharp5";
        Note[Note["D5"] = 587] = "D5";
        Note[Note["Eb5"] = 622] = "Eb5";
        Note[Note["E5"] = 659] = "E5";
        Note[Note["F5"] = 698] = "F5";
        Note[Note["FSharp5"] = 740] = "FSharp5";
        Note[Note["G5"] = 784] = "G5";
        Note[Note["GSharp5"] = 831] = "GSharp5";
        Note[Note["A5"] = 880] = "A5";
        Note[Note["Bb5"] = 932] = "Bb5";
        Note[Note["B5"] = 988] = "B5";
        Note[Note["C6"] = 1047] = "C6";
        Note[Note["CSharp6"] = 1109] = "CSharp6";
        Note[Note["D6"] = 1175] = "D6";
        Note[Note["Eb6"] = 1245] = "Eb6";
        Note[Note["E6"] = 1319] = "E6";
        Note[Note["F6"] = 1397] = "F6";
        Note[Note["FSharp6"] = 1480] = "FSharp6";
        Note[Note["G6"] = 1568] = "G6";
        Note[Note["GSharp6"] = 1568] = "GSharp6";
        Note[Note["A6"] = 1760] = "A6";
        Note[Note["Bb6"] = 1865] = "Bb6";
        Note[Note["B6"] = 1976] = "B6";
        Note[Note["C7"] = 2093] = "C7";
    })(Note || (Note = {}));
    var Notes = {
        28: { name: "C", prefixedName: "Low C", freq: 131 },
        29: { name: "C#", prefixedName: "Low C#", freq: 139 },
        30: { name: "D", prefixedName: "Low D", freq: 147 },
        31: { name: "D#", prefixedName: "Low D#", freq: 156 },
        32: { name: "E", prefixedName: "Low E", freq: 165 },
        33: { name: "F", prefixedName: "Low F", freq: 175 },
        34: { name: "F#", prefixedName: "Low F#", freq: 185 },
        35: { name: "G", prefixedName: "Low G", freq: 196 },
        36: { name: "G#", prefixedName: "Low G#", freq: 208 },
        37: { name: "A", prefixedName: "Low A", freq: 220 },
        38: { name: "A#", prefixedName: "Low A#", freq: 233 },
        39: { name: "B", prefixedName: "Low B", freq: 247 },
        40: { name: "C", prefixedName: "Middle C", freq: 262 },
        41: { name: "C#", prefixedName: "Middle C#", freq: 277 },
        42: { name: "D", prefixedName: "Middle D", freq: 294 },
        43: { name: "D#", prefixedName: "Middle D#", freq: 311 },
        44: { name: "E", prefixedName: "Middle E", freq: 330 },
        45: { name: "F", prefixedName: "Middle F", freq: 349 },
        46: { name: "F#", prefixedName: "Middle F#", freq: 370 },
        47: { name: "G", prefixedName: "Middle G", freq: 392 },
        48: { name: "G#", prefixedName: "Middle G#", freq: 415 },
        49: { name: "A", prefixedName: "Middle A", freq: 440 },
        50: { name: "A#", prefixedName: "Middle A#", freq: 466 },
        51: { name: "B", prefixedName: "Middle B", freq: 494 },
        52: { name: "C", prefixedName: "Tenor C", altPrefixedName: "High C", freq: 523 },
        53: { name: "C#", prefixedName: "Tenor C#", altPrefixedName: "High C#", freq: 554 },
        54: { name: "D", prefixedName: "Tenor D", altPrefixedName: "High D", freq: 587 },
        55: { name: "D#", prefixedName: "Tenor D#", altPrefixedName: "High D#", freq: 622 },
        56: { name: "E", prefixedName: "Tenor E", altPrefixedName: "High E", freq: 659 },
        57: { name: "F", prefixedName: "Tenor F", altPrefixedName: "High F", freq: 698 },
        58: { name: "F#", prefixedName: "Tenor F#", altPrefixedName: "High F#", freq: 740 },
        59: { name: "G", prefixedName: "Tenor G", altPrefixedName: "High G", freq: 784 },
        60: { name: "G#", prefixedName: "Tenor G#", altPrefixedName: "High G#", freq: 831 },
        61: { name: "A", prefixedName: "Tenor A", altPrefixedName: "High A", freq: 880 },
        62: { name: "A#", prefixedName: "Tenor A#", altPrefixedName: "High A#", freq: 932 },
        63: { name: "B", prefixedName: "Tenor B", altPrefixedName: "High B", freq: 988 },
        64: { name: "C", prefixedName: "High C", freq: 1046 },
        65: { name: "C#", prefixedName: "High C#", freq: 1109 },
        66: { name: "D", prefixedName: "High D", freq: 1175 },
        67: { name: "D#", prefixedName: "High D#", freq: 1245 },
        68: { name: "E", prefixedName: "High E", freq: 1319 },
        69: { name: "F", prefixedName: "High F", freq: 1397 },
        70: { name: "F#", prefixedName: "High F#", freq: 1478 },
        71: { name: "G", prefixedName: "High G", freq: 1568 },
        72: { name: "G#", prefixedName: "High G#", freq: 1661 },
        73: { name: "A", prefixedName: "High A", freq: 1760 },
        74: { name: "A#", prefixedName: "High A#", freq: 1865 },
        75: { name: "B", prefixedName: "High B", freq: 1976 }
    };
    var regex = /^Note\.(.+)$/;
    //  Class for a note input field.
    var FieldNote = /** @class */ (function (_super) {
        __extends(FieldNote, _super);
        function FieldNote(text, params, validator) {
            var _this = _super.call(this, text) || this;
            _this.isFieldCustom_ = true;
            /**
             * default number of piano keys
             * @type {number}
             * @private
             */
            _this.nKeys_ = 36;
            _this.minNote_ = 28;
            _this.maxNote_ = 63;
            /**
             * Absolute error for note frequency identification (Hz)
             * @type {number}
             */
            _this.eps = 2;
            /**
             * array of notes frequency
             * @type {Array.<number>}
             * @private
             */
            _this.noteFreq_ = [];
            /**
             * array of notes names
             * @type {Array.<string>}
             * @private
             */
            _this.noteName_ = [];
            FieldNote.superClass_.constructor.call(_this, text, validator);
            _this.note_ = text;
            if (params.editorColour) {
                _this.colour_ = pxtblockly.parseColour(params.editorColour);
                _this.colourBorder_ = goog.color.rgbArrayToHex(goog.color.darken(goog.color.hexToRgb(_this.colour_), 0.2));
            }
            var minNote = parseInt(params.minNote) || _this.minNote_;
            var maxNote = parseInt(params.maxNote) || _this.maxNote_;
            if (minNote >= 28 && maxNote <= 76 && maxNote > minNote) {
                _this.minNote_ = minNote;
                _this.maxNote_ = maxNote;
                _this.nKeys_ = _this.maxNote_ - _this.minNote_ + 1;
            }
            return _this;
        }
        /**
         * Ensure that only a non negative number may be entered.
         * @param {string} text The user's text.
         * @return {?string} A string representing a valid positive number, or null if invalid.
         */
        FieldNote.prototype.classValidator = function (text) {
            if (text === null) {
                return null;
            }
            text = String(text);
            var n = parseFloat(text || "0");
            if (isNaN(n) || n < 0) {
                // Invalid number.
                return null;
            }
            // Get the value in range.
            return String(n);
        };
        /**
         * Install this field on a block.
         */
        FieldNote.prototype.init = function () {
            FieldNote.superClass_.init.call(this);
            this.noteFreq_.length = 0;
            this.noteName_.length = 0;
            var thisField = this;
            //  Create arrays of name/frequency of the notes
            createNotesArray();
            this.setValue(this.callValidator(this.getValue()));
            /**
             * create Array of notes name and frequencies
             * @private
             */
            function createNotesArray() {
                for (var i = thisField.minNote_; i <= thisField.maxNote_; i++) {
                    var name_6 = Notes[i].prefixedName;
                    // special case: one octave
                    if (thisField.nKeys_ < 13) {
                        name_6 = Notes[i].name;
                    }
                    else if (thisField.minNote_ >= 28 && thisField.maxNote_ <= 63) {
                        name_6 = Notes[i].altPrefixedName || name_6;
                    }
                    thisField.noteName_.push(name_6);
                    thisField.noteFreq_.push(Notes[i].freq);
                }
                // Do not remove this comment.
                // lf("C")
                // lf("C#")
                // lf("D")
                // lf("D#")
                // lf("E")
                // lf("F")
                // lf("F#")
                // lf("G")
                // lf("G#")
                // lf("A")
                // lf("A#")
                // lf("B")
                // lf("Deep C")
                // lf("Deep C#")
                // lf("Deep D")
                // lf("Deep D#")
                // lf("Deep E")
                // lf("Deep F")
                // lf("Deep F#")
                // lf("Deep G")
                // lf("Deep G#")
                // lf("Deep A")
                // lf("Deep A#")
                // lf("Deep B")
                // lf("Low C")
                // lf("Low C#")
                // lf("Low D")
                // lf("Low D#")
                // lf("Low E")
                // lf("Low F")
                // lf("Low F#")
                // lf("Low G")
                // lf("Low G#")
                // lf("Low A")
                // lf("Low A#")
                // lf("Low B")
                // lf("Middle C")
                // lf("Middle C#")
                // lf("Middle D")
                // lf("Middle D#")
                // lf("Middle E")
                // lf("Middle F")
                // lf("Middle F#")
                // lf("Middle G")
                // lf("Middle G#")
                // lf("Middle A")
                // lf("Middle A#")
                // lf("Middle B")
                // lf("Tenor C")
                // lf("Tenor C#")
                // lf("Tenor D")
                // lf("Tenor D#")
                // lf("Tenor E")
                // lf("Tenor F")
                // lf("Tenor F#")
                // lf("Tenor G")
                // lf("Tenor G#")
                // lf("Tenor A")
                // lf("Tenor A#")
                // lf("Tenor B")
                // lf("High C")
                // lf("High C#")
                // lf("High D")
                // lf("High D#")
                // lf("High E")
                // lf("High F")
                // lf("High F#")
                // lf("High G")
                // lf("High G#")
                // lf("High A")
                // lf("High A#")
                // lf("High B")
            }
        };
        /**
         * Return the current note frequency.
         * @return {string} Current note in string format.
         */
        FieldNote.prototype.getValue = function () {
            return this.note_;
        };
        /**
         * Set the note.
         * @param {string} note The new note in string format.
         */
        FieldNote.prototype.setValue = function (note) {
            // accommodate note strings like "Note.GSharp5" as well as numbers
            var match = regex.exec(note);
            var noteName = (match && match.length > 1) ? match[1] : null;
            note = Note[noteName] ? Note[noteName] : String(parseFloat(note || "0"));
            if (isNaN(Number(note)) || Number(note) < 0)
                return;
            if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
                this.note_ != note) {
                Blockly.Events.fire(new Blockly.Events.Change(this.sourceBlock_, "field", this.name, String(this.note_), String(note)));
            }
            this.note_ = this.callValidator(note);
            this.setText(this.getNoteName_());
        };
        /**
         * Get the text from this field.  Used when the block is collapsed.
         * @return {string} Current text.
         */
        FieldNote.prototype.getText = function () {
            if (Math.floor(Number(this.note_)) == Number(this.note_))
                return Number(this.note_).toFixed(0);
            return Number(this.note_).toFixed(2);
        };
        /**
         * Set the text in this field and NOT fire a change event.
         * @param {*} newText New text.
         */
        FieldNote.prototype.setText = function (newText) {
            if (newText === null) {
                // No change if null.
                return;
            }
            newText = String(newText);
            if (!isNaN(Number(newText)))
                newText = this.getNoteName_();
            if (newText === this.text_) {
                // No change.
                return;
            }
            Blockly.Field.prototype.setText.call(this, newText);
        };
        /**
        * get the note name to be displayed in the field
        * @return {string} note name
        * @private
        */
        FieldNote.prototype.getNoteName_ = function () {
            var note = this.getValue();
            var text = note.toString();
            for (var i = 0; i < this.nKeys_; i++) {
                if (Math.abs(this.noteFreq_[i] - Number(note)) < this.eps)
                    return this.noteName_[i];
            }
            if (!isNaN(Number(note)))
                text += " Hz";
            return text;
        };
        /**
         * Set a custom number of keys for this field.
         * @param {number} nkeys Number of keys for this block,
         *     or 26 to use default.
         * @return {!Blockly.FieldNote} Returns itself (for method chaining).
         */
        FieldNote.prototype.setNumberOfKeys = function (size) {
            this.nKeys_ = size;
            return this;
        };
        FieldNote.prototype.onHtmlInputChange_ = function (e) {
            _super.prototype.onHtmlInputChange_.call(this, e);
            Blockly.DropDownDiv.hideWithoutAnimation();
        };
        /**
         * Create a piano under the note field.
         */
        FieldNote.prototype.showEditor_ = function (opt_quietInput) {
            if (!this.colour_) {
                this.colour_ = (this.sourceBlock_.isShadow()) ?
                    this.sourceBlock_.parentBlock_.getColour() : this.sourceBlock_.getColour();
                this.colourBorder_ = (this.sourceBlock_.isShadow()) ?
                    this.sourceBlock_.parentBlock_.getColourTertiary() : this.sourceBlock_.getColourTertiary();
            }
            // If there is an existing drop-down someone else owns, hide it immediately and clear it.
            Blockly.DropDownDiv.hideWithoutAnimation();
            Blockly.DropDownDiv.clearContent();
            var contentDiv = Blockly.DropDownDiv.getContentDiv();
            //  change Note name to number frequency
            Blockly.FieldNumber.prototype.setText.call(this, this.getText());
            FieldNote.superClass_.showEditor_.call(this, true);
            var pianoWidth;
            var pianoHeight;
            var keyWidth = 22;
            var keyHeight = 90;
            var labelHeight = 24;
            var prevNextHeight = 20;
            var whiteKeyCounter = 0;
            var selectedKeyColor = "yellowgreen";
            var soundingKeys = 0;
            var thisField = this;
            //  Record windowSize and scrollOffset before adding the piano.
            var windowSize = goog.dom.getViewportSize();
            var pagination = false;
            var mobile = false;
            var editorWidth = windowSize.width;
            var piano = [];
            //  initializate
            pianoWidth = keyWidth * (this.nKeys_ - (this.nKeys_ / 12 * 5));
            pianoHeight = keyHeight + labelHeight;
            //  Create the piano using Closure (CustomButton).
            for (var i = 0; i < this.nKeys_; i++) {
                piano.push(new goog.ui.CustomButton());
            }
            if (editorWidth < pianoWidth) {
                pagination = true;
                pianoWidth = 7 * keyWidth;
                pianoHeight = keyHeight + labelHeight + prevNextHeight;
            }
            //  Check if Mobile, pagination -> true
            var quietInput = opt_quietInput || false;
            if (!quietInput && (goog.userAgent.MOBILE || goog.userAgent.ANDROID)) {
                pagination = true;
                mobile = true;
                keyWidth = keyWidth * 2;
                keyHeight = keyHeight * 2;
                pianoWidth = 7 * keyWidth;
                labelHeight = labelHeight * 1.2;
                prevNextHeight = prevNextHeight * 2;
                pianoHeight = keyHeight + labelHeight + prevNextHeight;
            }
            //  create piano div
            var pianoDiv = goog.dom.createDom("div", {});
            pianoDiv.className = "blocklyPianoDiv";
            contentDiv.appendChild(pianoDiv);
            var scrollOffset = goog.style.getViewportPageOffset(document);
            var xy = this.getAbsoluteXY_();
            var borderBBox = this.getScaledBBox_();
            var leftPosition = 0; //-(<HTMLElement>document.getElementsByClassName("blocklyDropdownDiv")[0]).offsetLeft;   //+ ((windowSize.width - this.pianoWidth_) / 2);
            var topPosition = 0; //(keyHeight + labelHeight + prevNextHeight);
            //  save all changes in the same group of events
            Blockly.Events.setGroup(true);
            //  render piano keys
            var octaveCounter = 0;
            var currentSelectedKey = null;
            var previousColor;
            for (var i = 0; i < this.nKeys_; i++) {
                if (i > 0 && i % 12 == 0)
                    octaveCounter++;
                var key = piano[i];
                //  What color is i key
                var bgColor = (isWhite(i)) ? "white" : "black";
                var width = getKeyWidth(i);
                var height = getKeyHeight(i);
                var position_1 = getPosition(i);
                //  modify original position in pagination
                if (pagination && i >= 12)
                    position_1 -= 7 * octaveCounter * keyWidth;
                var style = getKeyStyle(bgColor, width, height, position_1 + leftPosition, topPosition, isWhite(i) ? 1000 : 1001, isWhite(i) ? this.colour_ : "black", mobile);
                key.setContent(style);
                key.setId(this.noteName_[i]);
                key.render(pianoDiv);
                var script = key.getContent();
                script.setAttribute("tag", this.noteFreq_[i].toString());
                //  highlight current selected key
                if (Math.abs(this.noteFreq_[i] - Number(this.getValue())) < this.eps) {
                    previousColor = script.style.backgroundColor;
                    script.style.backgroundColor = selectedKeyColor;
                    currentSelectedKey = key;
                }
                //  Listener when a new key is selected
                if (!mobile) {
                    goog.events.listen(key.getElement(), goog.events.EventType.MOUSEDOWN, soundKey, false, key);
                }
                else {
                    /**  Listener when a new key is selected in MOBILE
                     *   It is necessary to use TOUCHSTART event to allow passive event listeners
                     *   to avoid preventDefault() call that blocks listener
                     */
                    goog.events.listen(key.getElement(), goog.events.EventType.TOUCHSTART, soundKey, false, key);
                }
                //  Listener when the mouse is over a key
                goog.events.listen(key.getElement(), goog.events.EventType.MOUSEOVER, function () {
                    var script = showNoteLabel.getContent();
                    script.textContent = this.getId();
                }, false, key);
                //  increment white key counter
                if (isWhite(i))
                    whiteKeyCounter++;
                // set octaves different from first octave invisible
                if (pagination && i > 11)
                    key.setVisible(false);
            }
            //  render note label
            var showNoteLabel = new goog.ui.CustomButton();
            var showNoteStyle = getShowNoteStyle(topPosition, leftPosition, mobile);
            showNoteLabel.setContent(showNoteStyle);
            showNoteLabel.render(pianoDiv);
            var scriptLabel = showNoteLabel.getContent();
            scriptLabel.textContent = "-";
            // create next and previous CustomButtons for pagination
            var prevButton = new goog.ui.CustomButton();
            var nextButton = new goog.ui.CustomButton();
            var prevButtonStyle = getNextPrevStyle(topPosition, leftPosition, true, mobile);
            var nextButtonStyle = getNextPrevStyle(topPosition, leftPosition, false, mobile);
            if (pagination) {
                scriptLabel.textContent = "Octave #1";
                //  render previous button
                var script = void 0;
                prevButton.setContent(prevButtonStyle);
                prevButton.render(pianoDiv);
                script = prevButton.getContent();
                //  left arrow - previous button
                script.textContent = "<";
                //  render next button
                nextButton.setContent(nextButtonStyle);
                nextButton.render(pianoDiv);
                script = nextButton.getContent();
                //  right arrow - next button
                script.textContent = ">";
                var Npages_1 = this.nKeys_ / 12;
                var currentPage_1 = 0;
                goog.events.listen(prevButton.getElement(), goog.events.EventType.MOUSEDOWN, function () {
                    if (currentPage_1 == 0) {
                        scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                        return;
                    }
                    var curFirstKey = currentPage_1 * 12;
                    var newFirstKey = currentPage_1 * 12 - 12;
                    //  hide current octave
                    for (var i = 0; i < 12; i++)
                        piano[i + curFirstKey].setVisible(false);
                    //  show new octave
                    for (var i = 0; i < 12; i++)
                        piano[i + newFirstKey].setVisible(true);
                    currentPage_1--;
                    scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                }, false, prevButton);
                goog.events.listen(nextButton.getElement(), goog.events.EventType.MOUSEDOWN, function () {
                    if (currentPage_1 == Npages_1 - 1) {
                        scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                        return;
                    }
                    var curFirstKey = currentPage_1 * 12;
                    var newFirstKey = currentPage_1 * 12 + 12;
                    //  hide current octave
                    for (var i = 0; i < 12; i++)
                        piano[i + curFirstKey].setVisible(false);
                    //  show new octave
                    for (var i = 0; i < 12; i++)
                        piano[i + newFirstKey].setVisible(true);
                    currentPage_1++;
                    scriptLabel.textContent = "Octave #" + (currentPage_1 + 1);
                }, false, nextButton);
            }
            // create the key sound
            function soundKey() {
                var cnt = ++soundingKeys;
                var freq = this.getContent().getAttribute("tag");
                var script;
                if (currentSelectedKey != null) {
                    script = currentSelectedKey.getContent();
                    script.style.backgroundColor = previousColor;
                }
                script = this.getContent();
                if (currentSelectedKey !== this) {
                    previousColor = script.style.backgroundColor;
                    thisField.setValue(thisField.callValidator(freq));
                    thisField.setText(thisField.callValidator(freq));
                }
                currentSelectedKey = this;
                script.style.backgroundColor = selectedKeyColor;
                Blockly.FieldTextInput.htmlInput_.value = thisField.getText();
                pxtblockly.AudioContextManager.tone(freq);
                setTimeout(function () {
                    // compare current sound counter with listener sound counter (avoid async problems)
                    if (soundingKeys == cnt)
                        pxtblockly.AudioContextManager.stop();
                }, 300);
                FieldNote.superClass_.dispose.call(this);
            }
            /** get width of blockly editor space
             * @return {number} width of the blockly editor workspace
             * @private
             */
            function getEditorWidth() {
                var windowSize = goog.dom.getViewportSize();
                return windowSize.width;
            }
            /** get height of blockly editor space
             * @return {number} Height of the blockly editor workspace
             * @private
             */
            function getEditorHeight() {
                var editorHeight = document.getElementById("blocklyDiv").offsetHeight;
                return editorHeight;
            }
            /**
             * create a DOM to assing a style to the button (piano Key)
             * @param {string} bgColor color of the key background
             * @param {number} width width of the key
             * @param {number} heigth heigth of the key
             * @param {number} leftPosition horizontal position of the key
             * @param {number} topPosition vertical position of the key
             * @param {number} z_index z-index of the key
             * @param {string} keyBorderColour border color of the key
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getKeyStyle(bgColor, width, height, leftPosition, topPosition, z_index, keyBorderColour, isMobile) {
                var div = goog.dom.createDom("div", {
                    "style": "background-color: " + bgColor
                        + "; width: " + width
                        + "px; height: " + height
                        + "px; left: " + leftPosition
                        + "px; top: " + topPosition
                        + "px; z-index: " + z_index
                        + ";   border-color: " + keyBorderColour
                        + ";"
                });
                div.className = "blocklyNote";
                return div;
            }
            /**
             * create a DOM to assing a style to the note label
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getShowNoteStyle(topPosition, leftPosition, isMobile) {
                topPosition += keyHeight;
                if (isMobile)
                    topPosition += prevNextHeight;
                var div = goog.dom.createDom("div", {
                    "style": "top: " + topPosition
                        + "px; left: " + leftPosition
                        + "px; background-color: " + thisField.colour_
                        + "; width: " + pianoWidth
                        + "px; border-color: " + thisField.colour_
                        + ";" + (isMobile ? " font-size: " + (labelHeight - 10) + "px; height: " + labelHeight + "px;" : "")
                });
                div.className = "blocklyNoteLabel";
                return div;
            }
            /**
             * create a DOM to assing a style to the previous and next buttons
             * @param {number} topPosition vertical position of the label
             * @param {number} leftPosition horizontal position of the label
             * @param {boolean} isPrev true if is previous button, false otherwise
             * @param {boolean} isMobile true if the device is a mobile
             * @return {goog.dom} DOM with the new css style.
             * @private
             */
            function getNextPrevStyle(topPosition, leftPosition, isPrev, isMobile) {
                //  x position of the prev/next button
                var xPosition = (isPrev ? 0 : (pianoWidth / 2)) + leftPosition;
                //  y position of the prev/next button
                var yPosition = (keyHeight + labelHeight + topPosition);
                if (isMobile)
                    yPosition = keyHeight + topPosition;
                var div = goog.dom.createDom("div", {
                    "style": "top: " + yPosition
                        + "px; left: " + xPosition
                        + "px; "
                        + ";" + (isMobile ? "height: " + prevNextHeight + "px; font-size:" + (prevNextHeight - 10) + "px;" : "")
                        + "width: " + Math.ceil(pianoWidth / 2) + "px;"
                        + "background-color: " + thisField.colour_
                        + ";" + (isPrev ? "border-left-color: " : "border-right-color: ") + thisField.colour_
                        + ";" + (!isMobile ? "border-bottom-color: " + thisField.colour_ : "")
                        + ";"
                });
                div.className = "blocklyNotePrevNext";
                return div;
            }
            /**
             * @param {number} idx index of the key
             * @return {boolean} true if key_idx is white
             * @private
             */
            function isWhite(idx) {
                var octavePosition = idx % 12;
                if (octavePosition == 1 || octavePosition == 3 || octavePosition == 6 ||
                    octavePosition == 8 || octavePosition == 10)
                    return false;
                return true;
            }
            /**
             * get width of the piano key
             * @param {number} idx index of the key
             * @return {number} width of the key
             * @private
             */
            function getKeyWidth(idx) {
                if (isWhite(idx))
                    return keyWidth;
                return keyWidth / 2;
            }
            /**
             * get height of the piano key
             * @param {number} idx index of the key
             * @return {number} height of the key
             * @private
             */
            function getKeyHeight(idx) {
                if (isWhite(idx))
                    return keyHeight;
                return keyHeight / 2;
            }
            /**
             * get the position of the key in the piano
             * @param {number} idx index of the key
             * @return {number} position of the key
             */
            function getPosition(idx) {
                var pos = (whiteKeyCounter * keyWidth);
                if (isWhite(idx))
                    return pos;
                return pos - (keyWidth / 4);
            }
            pianoDiv.style.width = pianoWidth + "px";
            pianoDiv.style.height = (pianoHeight + 1) + "px";
            Blockly.DropDownDiv.setColour(this.colour_, this.colourBorder_);
            // Calculate positioning based on the field position.
            var scale = this.sourceBlock_.workspace.scale;
            var bBox = { width: this.size_.width, height: this.size_.height };
            bBox.width *= scale;
            bBox.height *= scale;
            var position = this.fieldGroup_.getBoundingClientRect();
            var primaryX = position.left + bBox.width / 2;
            var primaryY = position.top + bBox.height;
            var secondaryX = primaryX;
            var secondaryY = position.top;
            // Set bounds to workspace; show the drop-down.
            Blockly.DropDownDiv.setBoundsElement(this.sourceBlock_.workspace.getParentSvg().parentNode);
            Blockly.DropDownDiv.show(this, primaryX, primaryY, secondaryX, secondaryY, this.onHide.bind(this));
        };
        /**
         * Callback for when the drop-down is hidden.
         */
        FieldNote.prototype.onHide = function () {
        };
        ;
        /**
         * Close the note picker if this input is being deleted.
         */
        FieldNote.prototype.dispose = function () {
            Blockly.DropDownDiv.hideIfOwner(this);
            Blockly.FieldTextInput.superClass_.dispose.call(this);
        };
        return FieldNote;
    }(Blockly.FieldNumber));
    pxtblockly.FieldNote = FieldNote;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldNumberDropdown = /** @class */ (function (_super) {
        __extends(FieldNumberDropdown, _super);
        function FieldNumberDropdown(value, options, opt_validator) {
            var _this = _super.call(this, value, options.data, options.min, options.max, options.precision, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldNumberDropdown.prototype.getOptions = function () {
            var newOptions;
            if (this.menuGenerator_) {
                newOptions = JSON.parse(this.menuGenerator_).map(function (x) {
                    return (typeof x == 'object') ? x : [String(x), String(x)];
                });
            }
            return newOptions;
        };
        return FieldNumberDropdown;
    }(Blockly.FieldNumberDropdown));
    pxtblockly.FieldNumberDropdown = FieldNumberDropdown;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldProcedure = /** @class */ (function (_super) {
        __extends(FieldProcedure, _super);
        function FieldProcedure(funcname, opt_validator) {
            var _this = _super.call(this, null, opt_validator) || this;
            _this.setValue(funcname || '');
            return _this;
        }
        FieldProcedure.prototype.getOptions = function () {
            return this.dropdownCreate();
        };
        ;
        FieldProcedure.prototype.init = function () {
            if (this.fieldGroup_) {
                // Dropdown has already been initialized once.
                return;
            }
            _super.prototype.init.call(this);
        };
        ;
        FieldProcedure.prototype.setSourceBlock = function (block) {
            goog.asserts.assert(!block.isShadow(), 'Procedure fields are not allowed to exist on shadow blocks.');
            _super.prototype.setSourceBlock.call(this, block);
        };
        ;
        FieldProcedure.prototype.getValue = function () {
            return this.getText();
        };
        ;
        FieldProcedure.prototype.setValue = function (newValue) {
            if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                Blockly.Events.fire(new Blockly.Events.Change(this.sourceBlock_, 'field', this.name, this.value_, newValue));
            }
            this.value_ = newValue;
            this.setText(newValue);
        };
        ;
        /**
         * Return a sorted list of variable names for procedure dropdown menus.
         * Include a special option at the end for creating a new function name.
         * @return {!Array.<string>} Array of procedure names.
         * @this {pxtblockly.FieldProcedure}
         */
        FieldProcedure.prototype.dropdownCreate = function () {
            var functionList = [];
            if (this.sourceBlock_ && this.sourceBlock_.workspace) {
                var blocks = this.sourceBlock_.workspace.getAllBlocks();
                // Iterate through every block and check the name.
                for (var i = 0; i < blocks.length; i++) {
                    if (blocks[i].getProcedureDef) {
                        var procName = blocks[i].getProcedureDef();
                        functionList.push(procName[0]);
                    }
                }
            }
            // Ensure that the currently selected variable is an option.
            var name = this.getText();
            if (name && functionList.indexOf(name) == -1) {
                functionList.push(name);
            }
            functionList.sort(goog.string.caseInsensitiveCompare);
            if (!functionList.length) {
                // Add temporary list item so the dropdown doesn't break
                functionList.push("Temp");
            }
            // Variables are not language-specific, use the name as both the user-facing
            // text and the internal representation.
            var options = [];
            for (var i = 0; i < functionList.length; i++) {
                options[i] = [functionList[i], functionList[i]];
            }
            return options;
        };
        FieldProcedure.prototype.onItemSelected = function (menu, menuItem) {
            var itemText = menuItem.getValue();
            if (this.sourceBlock_) {
                // Call any validation function, and allow it to override.
                itemText = this.callValidator(itemText);
            }
            if (itemText !== null) {
                this.setValue(itemText);
            }
        };
        return FieldProcedure;
    }(Blockly.FieldDropdown));
    pxtblockly.FieldProcedure = FieldProcedure;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTextDropdown = /** @class */ (function (_super) {
        __extends(FieldTextDropdown, _super);
        function FieldTextDropdown(text, options, opt_validator) {
            var _this = _super.call(this, text, options.values, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        return FieldTextDropdown;
    }(Blockly.FieldTextDropdown));
    pxtblockly.FieldTextDropdown = FieldTextDropdown;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/pxtblockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTextInput = /** @class */ (function (_super) {
        __extends(FieldTextInput, _super);
        function FieldTextInput(value, options, opt_validator) {
            var _this = _super.call(this, value, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        return FieldTextInput;
    }(Blockly.FieldTextInput));
    pxtblockly.FieldTextInput = FieldTextInput;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggle = /** @class */ (function (_super) {
        __extends(FieldToggle, _super);
        function FieldToggle(state, params, opt_validator) {
            var _this = _super.call(this, state, opt_validator) || this;
            _this.isFieldCustom_ = true;
            _this.CURSOR = 'pointer';
            _this.params = params;
            _this.setValue(state);
            _this.addArgType('toggle');
            _this.type_ = params.type;
            return _this;
        }
        FieldToggle.prototype.init = function () {
            if (this.fieldGroup_) {
                // Field has already been initialized once.
                return;
            }
            // Build the DOM.
            this.fieldGroup_ = Blockly.utils.createSvgElement('g', {}, null);
            if (!this.visible_) {
                this.fieldGroup_.style.display = 'none';
            }
            // Add an attribute to cassify the type of field.
            if (this.getArgTypes() !== null) {
                if (this.sourceBlock_.isShadow()) {
                    this.sourceBlock_.svgGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
                else {
                    // Fields without a shadow wrapper, like square dropdowns.
                    this.fieldGroup_.setAttribute('data-argument-type', this.getArgTypes());
                }
            }
            // If not in a shadow block, and has more than one input, draw a box.
            if (!this.sourceBlock_.isShadow()
                && (this.sourceBlock_.inputList && this.sourceBlock_.inputList.length > 1)) {
                this.box_ = Blockly.utils.createSvgElement('rect', {
                    'rx': Blockly.BlockSvg.CORNER_RADIUS,
                    'ry': Blockly.BlockSvg.CORNER_RADIUS,
                    'x': 0,
                    'y': 0,
                    'width': this.size_.width,
                    'height': this.size_.height,
                    'fill': Blockly.Colours.textField,
                    'stroke': this.sourceBlock_.getColourTertiary()
                });
                this.fieldGroup_.insertBefore(this.box_, this.textElement_);
            }
            // Adjust X to be flipped for RTL. Position is relative to horizontal start of source block.
            var size = this.getSize();
            this.checkElement_ = Blockly.utils.createSvgElement('g', {
                'class': "blocklyToggle " + (this.state_ ? 'blocklyToggleOn' : 'blocklyToggleOff'),
                'transform': "translate(8, " + size.height / 2 + ")",
            }, this.fieldGroup_);
            switch (this.getOutputShape()) {
                case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('polygon', {
                        'class': 'blocklyToggleRect',
                        'points': '-7,-14 -21,0 -7,14 7,14 21,0 7,-14',
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
                case Blockly.OUTPUT_SHAPE_ROUND:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('rect', {
                        'class': 'blocklyToggleCircle',
                        'x': -6, 'y': -14, 'height': 28,
                        'width': 28, 'rx': 14, 'ry': 14,
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
                case Blockly.OUTPUT_SHAPE_SQUARE:
                    this.toggleThumb_ = Blockly.utils.createSvgElement('rect', {
                        'class': 'blocklyToggleRect',
                        'x': -6, 'y': -14, 'height': 28,
                        'width': 28, 'rx': 3, 'ry': 3,
                        'cursor': 'pointer'
                    }, this.checkElement_);
                    break;
            }
            var fieldX = (this.sourceBlock_.RTL) ? -size.width / 2 : size.width / 2;
            /** @type {!Element} */
            this.textElement_ = Blockly.utils.createSvgElement('text', {
                'class': 'blocklyText',
                'x': fieldX,
                'dy': '0.6ex',
                'y': size.height / 2
            }, this.fieldGroup_);
            this.updateEditable();
            this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);
            this.switchToggle(this.state_);
            this.setValue(this.getValue());
            // Force a render.
            this.render_();
            this.size_.width = 0;
            this.mouseDownWrapper_ =
                Blockly.bindEventWithChecks_(this.getClickTarget_(), 'mousedown', this, this.onMouseDown_);
        };
        FieldToggle.prototype.getDisplayText_ = function () {
            return this.state_ ? this.getTrueText() : this.getFalseText();
        };
        FieldToggle.prototype.getTrueText = function () {
            return lf("True");
        };
        FieldToggle.prototype.getFalseText = function () {
            return lf("False");
        };
        FieldToggle.prototype.updateWidth = function () {
            var innerWidth = this.getInnerWidth();
            var halfInnerWidth = innerWidth / 2;
            switch (this.getOutputShape()) {
                case Blockly.OUTPUT_SHAPE_ROUND:
                    this.size_.width = this.getInnerWidth() * 2 - 7;
                    break;
                case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                    this.size_.width = this.getInnerWidth() * 2 + 8 - Math.floor(this.getInnerWidth() / 2);
                    break;
                case Blockly.OUTPUT_SHAPE_SQUARE:
                    this.size_.width = 9 + this.getInnerWidth() * 2;
                    break;
            }
            this.arrowWidth_ = 0;
        };
        FieldToggle.prototype.getInnerWidth = function () {
            return this.getMaxLength() * 10;
        };
        FieldToggle.prototype.getMaxLength = function () {
            return Math.max(this.getTrueText().length, this.getFalseText().length);
        };
        FieldToggle.prototype.getOutputShape = function () {
            return this.sourceBlock_.isShadow() ? this.sourceBlock_.getOutputShape() : Blockly.OUTPUT_SHAPE_SQUARE;
        };
        /**
         * Return 'TRUE' if the toggle is ON, 'FALSE' otherwise.
         * @return {string} Current state.
         */
        FieldToggle.prototype.getValue = function () {
            return this.toVal(this.state_);
        };
        ;
        /**
         * Set the checkbox to be checked if newBool is 'TRUE' or true,
         * unchecks otherwise.
         * @param {string|boolean} newBool New state.
         */
        FieldToggle.prototype.setValue = function (newBool) {
            var newState = this.fromVal(newBool);
            if (this.state_ !== newState) {
                if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
                    Blockly.Events.fire(new Blockly.Events.BlockChange(this.sourceBlock_, 'field', this.name, this.state_, newState));
                }
                this.state_ = newState;
                this.switchToggle(this.state_);
                this.setText(this.getDisplayText_());
            }
        };
        FieldToggle.prototype.switchToggle = function (newState) {
            if (this.checkElement_) {
                this.updateWidth();
                var size = this.getSize();
                var innerWidth_1 = this.getInnerWidth();
                if (newState) {
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOn');
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOff');
                }
                else {
                    pxtblockly.svg.removeClass(this.checkElement_, 'blocklyToggleOn');
                    pxtblockly.svg.addClass(this.checkElement_, 'blocklyToggleOff');
                }
                var outputShape = this.getOutputShape();
                var width = 0, halfWidth = 0;
                var leftPadding = 0, rightPadding = 0;
                switch (outputShape) {
                    case Blockly.OUTPUT_SHAPE_HEXAGONAL:
                        width = innerWidth_1;
                        halfWidth = width / 2;
                        var quarterWidth = halfWidth / 2;
                        // TODO: the left padding calculation is a hack, we should calculate left padding based on width (generic case)
                        leftPadding = this.getMaxLength() > 3 ? -4 : 1;
                        rightPadding = -quarterWidth;
                        var topLeftPoint = -quarterWidth;
                        var bottomRightPoint = quarterWidth;
                        this.toggleThumb_.setAttribute('points', topLeftPoint + ",-14 " + (topLeftPoint - 14) + ",0 " + topLeftPoint + ",14 " + bottomRightPoint + ",14 " + (bottomRightPoint + 14) + ",0 " + bottomRightPoint + ",-14");
                        break;
                    case Blockly.OUTPUT_SHAPE_ROUND:
                    case Blockly.OUTPUT_SHAPE_SQUARE:
                        width = 5 + innerWidth_1;
                        halfWidth = width / 2;
                        this.toggleThumb_.setAttribute('width', width);
                        this.toggleThumb_.setAttribute('x', "-" + halfWidth);
                        leftPadding = rightPadding = outputShape == Blockly.OUTPUT_SHAPE_SQUARE ? 2 : -6;
                        break;
                }
                this.checkElement_.setAttribute('transform', "translate(" + (newState ? rightPadding + innerWidth_1 + halfWidth : halfWidth + leftPadding) + ", " + size.height / 2 + ")");
            }
        };
        FieldToggle.prototype.updateTextNode_ = function () {
            _super.prototype.updateTextNode_.call(this);
            if (this.textElement_)
                pxtblockly.svg.addClass(this.textElement_, 'blocklyToggleText');
        };
        FieldToggle.prototype.render_ = function () {
            if (this.visible_ && this.textElement_) {
                // Replace the text.
                goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));
                var textNode = document.createTextNode(this.getDisplayText_());
                this.textElement_.appendChild(textNode);
                pxtblockly.svg.addClass(this.textElement_, 'blocklyToggleText');
                this.updateWidth();
                // Update text centering, based on newly calculated width.
                var halfWidth = this.size_.width / 2;
                var centerTextX = this.state_ ? halfWidth + halfWidth / 2 : halfWidth / 2;
                // Apply new text element x position.
                var width = Blockly.Field.getCachedWidth(this.textElement_);
                var newX = centerTextX - width / 2;
                this.textElement_.setAttribute('x', "" + newX);
            }
            // Update any drawn box to the correct width and height.
            if (this.box_) {
                this.box_.setAttribute('width', "" + this.size_.width);
                this.box_.setAttribute('height', "" + this.size_.height);
            }
        };
        /**
         * Toggle the state of the toggle.
         * @private
         */
        FieldToggle.prototype.showEditor_ = function () {
            var newState = !this.state_;
            /*
            if (this.sourceBlock_) {
              // Call any validation function, and allow it to override.
              newState = this.callValidator(newState);
            }*/
            if (newState !== null) {
                this.setValue(this.toVal(newState));
            }
        };
        FieldToggle.prototype.toVal = function (newState) {
            if (this.type_ == "number")
                return String(newState ? '1' : '0');
            else
                return String(newState ? 'true' : 'false');
        };
        FieldToggle.prototype.fromVal = function (val) {
            if (typeof val == "string") {
                if (val == "1" || val.toUpperCase() == "TRUE")
                    return true;
                return false;
            }
            return !!val;
        };
        return FieldToggle;
    }(Blockly.FieldNumber));
    pxtblockly.FieldToggle = FieldToggle;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleOnOff = /** @class */ (function (_super) {
        __extends(FieldToggleOnOff, _super);
        function FieldToggleOnOff(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleOnOff.prototype.getTrueText = function () {
            return lf("ON");
        };
        FieldToggleOnOff.prototype.getFalseText = function () {
            return lf("OFF");
        };
        return FieldToggleOnOff;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleOnOff = FieldToggleOnOff;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
/// <reference path="./field_toggle.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldToggleYesNo = /** @class */ (function (_super) {
        __extends(FieldToggleYesNo, _super);
        function FieldToggleYesNo(state, params, opt_validator) {
            var _this = _super.call(this, state, params, opt_validator) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        FieldToggleYesNo.prototype.getTrueText = function () {
            return lf("Yes");
        };
        FieldToggleYesNo.prototype.getFalseText = function () {
            return lf("No");
        };
        return FieldToggleYesNo;
    }(pxtblockly.FieldToggle));
    pxtblockly.FieldToggleYesNo = FieldToggleYesNo;
})(pxtblockly || (pxtblockly = {}));
/// <reference path="../../localtypings/blockly.d.ts" />
var pxtblockly;
(function (pxtblockly) {
    var FieldTsExpression = /** @class */ (function (_super) {
        __extends(FieldTsExpression, _super);
        function FieldTsExpression() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.isFieldCustom_ = true;
            return _this;
        }
        /**
         * Same as parent, but adds a different class to text when disabled
         */
        FieldTsExpression.prototype.updateEditable = function () {
            var group = this.fieldGroup_;
            if (!this.EDITABLE || !group) {
                return;
            }
            if (this.sourceBlock_.isEditable()) {
                Blockly.utils.addClass(group, 'blocklyEditableText');
                Blockly.utils.removeClass(group, 'blocklyGreyExpressionBlockText');
                this.fieldGroup_.style.cursor = this.CURSOR;
            }
            else {
                Blockly.utils.addClass(group, 'blocklyGreyExpressionBlockText');
                Blockly.utils.removeClass(group, 'blocklyEditableText');
                this.fieldGroup_.style.cursor = '';
            }
        };
        return FieldTsExpression;
    }(Blockly.FieldTextInput));
    pxtblockly.FieldTsExpression = FieldTsExpression;
})(pxtblockly || (pxtblockly = {}));
var pxtblockly;
(function (pxtblockly) {
    var svg;
    (function (svg) {
        function hasClass(el, cls) {
            if (el.classList)
                return el.classList.contains(cls);
            else
                return el.className.baseVal.indexOf(cls) > -1;
        }
        svg.hasClass = hasClass;
        function addClass(el, cls) {
            if (el.classList)
                el.classList.add(cls);
            else if (el.className.baseVal.indexOf(cls) < 0)
                el.className.baseVal += ' ' + cls;
        }
        svg.addClass = addClass;
        function removeClass(el, cls) {
            if (el.classList)
                el.classList.remove(cls);
            else
                el.className.baseVal = el.className.baseVal.replace(cls, '').replace(/\s{2,}/, ' ');
        }
        svg.removeClass = removeClass;
    })(svg = pxtblockly.svg || (pxtblockly.svg = {}));
    function parseColour(colour) {
        var hue = Number(colour);
        if (!isNaN(hue)) {
            return Blockly.hueToRgb(hue);
        }
        else if (goog.isString(colour) && colour.match(/^#[0-9a-fA-F]{6}$/)) {
            return colour;
        }
        else {
            return '#000';
        }
    }
    pxtblockly.parseColour = parseColour;
    var AudioContextManager;
    (function (AudioContextManager) {
        var _frequency = 0;
        var _context; // AudioContext
        var _vco; // OscillatorNode;
        var _mute = false; //mute audio
        function context() {
            if (!_context)
                _context = freshContext();
            return _context;
        }
        function freshContext() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (window.AudioContext) {
                try {
                    // this call my crash.
                    // SyntaxError: audio resources unavailable for AudioContext construction
                    return new window.AudioContext();
                }
                catch (e) { }
            }
            return undefined;
        }
        function mute(mute) {
            if (!_context)
                return;
            _mute = mute;
            stop();
        }
        AudioContextManager.mute = mute;
        function stop() {
            if (!_context)
                return;
            _vco.disconnect();
            _frequency = 0;
        }
        AudioContextManager.stop = stop;
        function frequency() {
            return _frequency;
        }
        AudioContextManager.frequency = frequency;
        function tone(frequency) {
            if (_mute)
                return;
            if (frequency <= 0)
                return;
            _frequency = frequency;
            var ctx = context();
            if (!ctx)
                return;
            try {
                if (_vco) {
                    _vco.disconnect();
                    _vco = undefined;
                }
                _vco = ctx.createOscillator();
                _vco.frequency.value = frequency;
                _vco.type = 'triangle';
                _vco.connect(ctx.destination);
                _vco.start(0);
            }
            catch (e) {
                _vco = undefined;
                return;
            }
        }
        AudioContextManager.tone = tone;
    })(AudioContextManager = pxtblockly.AudioContextManager || (pxtblockly.AudioContextManager = {}));
})(pxtblockly || (pxtblockly = {}));
