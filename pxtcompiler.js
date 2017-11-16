var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path='../built/pxtlib.d.ts' />
var pxt;
(function (pxt) {
    function simshim(prog) {
        var SK = ts.SyntaxKind;
        var checker = prog.getTypeChecker();
        var mainWr = pxt.cpp.nsWriter("declare namespace");
        var currNs = "";
        for (var _i = 0, _a = prog.getSourceFiles(); _i < _a.length; _i++) {
            var src = _a[_i];
            if (!pxt.U.startsWith(src.fileName, "sim/"))
                continue;
            for (var _b = 0, _c = src.statements; _b < _c.length; _b++) {
                var stmt = _c[_b];
                var mod = stmt;
                if (stmt.kind == SK.ModuleDeclaration && mod.name.text == "pxsim") {
                    doStmt(mod.body);
                }
            }
        }
        var res = {};
        res[pxt.appTarget.corepkg] = mainWr.finish();
        return res;
        function typeOf(node) {
            var r;
            if (ts.isExpression(node))
                r = checker.getContextualType(node);
            if (!r)
                r = checker.getTypeAtLocation(node);
            return r;
        }
        /*
        let doSymbol = (sym: ts.Symbol) => {
            if (sym.getFlags() & ts.SymbolFlags.HasExports) {
                typechecker.getExportsOfModule(sym).forEach(doSymbol)
            }
            decls[pxtc.getFullName(typechecker, sym)] = sym
        }
        */
        function emitModuleDeclaration(mod) {
            var prevNs = currNs;
            if (currNs)
                currNs += ".";
            currNs += mod.name.text;
            doStmt(mod.body);
            currNs = prevNs;
        }
        function mapType(tp) {
            var fn = checker.typeToString(tp, null, ts.TypeFormatFlags.UseFullyQualifiedType);
            switch (fn) {
                case "pxsim.RefAction": return "() => void";
                default:
                    return fn.replace(/^pxsim\./, "");
            }
        }
        function promiseElementType(tp) {
            if ((tp.flags & ts.TypeFlags.Reference) && tp.symbol.name == "Promise") {
                return tp.typeArguments[0];
            }
            return null;
        }
        function emitClassDeclaration(cl) {
            var cmts = getExportComments(cl);
            if (!cmts)
                return;
            mainWr.setNs(currNs);
            mainWr.write(cmts);
            var prevNs = currNs;
            if (currNs)
                currNs += ".";
            currNs += cl.name.text;
            mainWr.write("declare class " + cl.name.text + " {");
            mainWr.incrIndent();
            for (var _i = 0, _a = cl.members; _i < _a.length; _i++) {
                var mem = _a[_i];
                switch (mem.kind) {
                    case SK.MethodDeclaration:
                        emitFunctionDeclaration(mem);
                        break;
                    case SK.PropertyDeclaration:
                        emitPropertyDeclaration(mem);
                        break;
                    case SK.Constructor:
                        emitConstructorDeclaration(mem);
                        break;
                    default:
                        break;
                }
            }
            currNs = prevNs;
            mainWr.decrIndent();
            mainWr.write("}");
        }
        function getExportComments(n) {
            var cmts = pxtc.getComments(n);
            if (!/^\s*\/\/%/m.test(cmts))
                return null;
            return cmts;
        }
        function emitPropertyDeclaration(fn) {
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var nm = fn.name.getText();
            var attrs = "//% shim=." + nm;
            var tp = checker.getTypeAtLocation(fn);
            mainWr.write(cmts);
            mainWr.write(attrs);
            mainWr.write("public " + nm + ": " + mapType(tp) + ";");
            mainWr.write("");
        }
        function emitConstructorDeclaration(fn) {
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var tp = checker.getTypeAtLocation(fn);
            var args = fn.parameters.map(function (p) { return p.name.getText() + ": " + mapType(typeOf(p)); });
            mainWr.write(cmts);
            mainWr.write("//% shim=\"new " + currNs + "\"");
            mainWr.write("constructor(" + args.join(", ") + ");");
            mainWr.write("");
        }
        function emitFunctionDeclaration(fn) {
            var cmts = getExportComments(fn);
            if (!cmts)
                return;
            var fnname = fn.name.getText();
            var isMethod = fn.kind == SK.MethodDeclaration;
            var attrs = "//% shim=" + (isMethod ? "." + fnname : currNs + "::" + fnname);
            var sig = checker.getSignatureFromDeclaration(fn);
            var rettp = checker.getReturnTypeOfSignature(sig);
            var asyncName = /Async$/.test(fnname);
            var prom = promiseElementType(rettp);
            if (prom) {
                attrs += " promise";
                rettp = prom;
                if (!asyncName)
                    pxt.U.userError(currNs + "::" + fnname + " should be called " + fnname + "Async");
            }
            else if (asyncName) {
                pxt.U.userError(currNs + "::" + fnname + " doesn't return a promise");
            }
            var args = fn.parameters.map(function (p) { return ("" + p.name.getText() + (p.questionToken ? "?" : "") + ": " + mapType(typeOf(p))); });
            var localname = fnname.replace(/Async$/, "");
            var defkw = isMethod ? "public" : "function";
            if (!isMethod)
                mainWr.setNs(currNs);
            mainWr.write(cmts);
            mainWr.write(attrs);
            mainWr.write(defkw + " " + localname + "(" + args.join(", ") + "): " + mapType(rettp) + ";");
            mainWr.write("");
        }
        function doStmt(stmt) {
            switch (stmt.kind) {
                case SK.ModuleDeclaration:
                    return emitModuleDeclaration(stmt);
                case SK.ModuleBlock:
                    return stmt.statements.forEach(doStmt);
                case SK.FunctionDeclaration:
                    return emitFunctionDeclaration(stmt);
                case SK.ClassDeclaration:
                    return emitClassDeclaration(stmt);
            }
            //console.log("SKIP", pxtc.stringKind(stmt))
            //let mod = stmt as ts.ModuleDeclaration
            //if (mod.name) console.log(mod.name.text)
            /*
            if (mod.name) {
                let sym = typechecker.getSymbolAtLocation(mod.name)
                if (sym) doSymbol(sym)
            }
            */
        }
    }
    pxt.simshim = simshim;
})(pxt || (pxt = {}));
/* Docs:
    *
    * Atmel AVR 8-bit Instruction Set Manual
    *  http://www.atmel.com/Images/Atmel-0856-AVR-Instruction-Set-Manual.pdf
    *
    * Common part for Arduino and Circuit Playground
    * http://www.atmel.com/Images/Atmel-7766-8-bit-AVR-ATmega16U4-32U4_Datasheet.pdf
    *
    */
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var avr;
        (function (avr) {
            var AVRProcessor = (function (_super) {
                __extends(AVRProcessor, _super);
                function AVRProcessor() {
                    var _this = this;
                    _super.call(this);
                    // TODO: use $lbl whenever we need an address
                    // Registers
                    // $Rd - bits 8:7:6:5:4 (r0)
                    // $Rr - bits 9:3:2:1:0 (r1)
                    this.addEnc("$r0", "R0-31", function (v) { return _this.inrange(31, v, v << 4); });
                    this.addEnc("$r1", "R0-31", function (v) { return _this.inrange(31, v, (v & 15) | ((v & 16) << 5)); });
                    this.addEnc("$r2", "R0-4", function (v) {
                        var r = _this.inseq([24, 26, 28, 30], v);
                        return r == null ? null : r << 4;
                    });
                    this.addEnc("$r3", "R0-16-31", function (v) { return _this.inminmax(16, 31, v, (v - 16) << 4); });
                    this.addEnc("$r4", "R0-7", function (v) { return _this.inrange(7, v, v << 4); });
                    this.addEnc("$r6", "R0-31", function (v) { return _this.inrange(31, v, (v << 4) | (v & 15) | ((v & 16) << 5)); });
                    this.addEnc("$r7", "R0-31", function (v) { return _this.inrange(31, v, v << 3); });
                    this.addEnc("$r8", "Reven", function (v) { return v & 0x1 ? null : (v >> 1) << 4; });
                    this.addEnc("$r9", "Reven", function (v) { return v & 0x1 ? null : (v >> 1); });
                    this.addEnc("$r10", "R0-16-23", function (v) { return _this.inminmax(16, 23, v, (v - 16) << 4); });
                    this.addEnc("$r11", "R0-16-23", function (v) { return _this.inminmax(16, 23, v, v - 16); });
                    this.addEnc("$r12", "R0-16-31", function (v) { return _this.inminmax(16, 31, v, v - 16); });
                    // Immediates:
                    this.addEnc("$i0", "#0-63", function (v) { return _this.inrange(63, v, (v & 0x0f) | (v & 0x30) << 2); });
                    this.addEnc("$i1", "#0-255", function (v) { return _this.inrange(255, v, (v & 0x0f) | (v & 0xf0) << 4); });
                    this.addEnc("$i2", "#0-127", function (v) { return _this.inrange(127, v, v << 3); });
                    this.addEnc("$i3", "#0-255", function (v) { return _this.inrange(255, v, (~v & 0x0f) | (~v & 0xf0) << 4); });
                    this.addEnc("$i4", "#0-15", function (v) { return _this.inrange(15, v, v << 4); });
                    this.addEnc("$i5", "#0-63", function (v) { return _this.inrange(63, v, (v & 0x0f) | (v & 0x30) << 5); });
                    this.addEnc("$i6", "#0-127", function (v) { return _this.inrange(127, v, (v & 0x0f) | (v & 0x70) << 4); });
                    this.addEnc("$i7", "#0-4095", function (v) { return _this.inrange(4095, v, v); });
                    this.addEnc("$i8", "#0-63", function (v) { return _this.inrange(63, v, v & 0x7 | (v & 0x18) << 7) | (v & 0x20) << 7; });
                    this.addEnc("$i9", "#0-7", function (v) { return _this.inrange(7, v, v); });
                    // labels
                    // this.addEnc("$la", "LABEL", v => this.inrange(255, v >> 1, v >> 1)).isWordAligned = true;
                    this.addEnc("$la", "LABEL", function (v) { return _this.inrange(65535, v, v); });
                    this.addEnc("$lb", "LABEL", function (v) { return _this.inrangeSigned(127, v >> 1, v >> 1) << 3; });
                    this.addEnc("$lc", "LABEL", function (v) { return _this.inrange(65535, v >> 1, v >> 1); });
                    this.addEnc("$ld", "LABEL", function (v) { return _this.inrangeSigned(2047, v >> 1, v >> 1); });
                    this.addInst("adc   $r0, $r1", 0x1C00, 0xfC00);
                    this.addInst("add   $r0, $r1", 0x0C00, 0xfC00);
                    // adiw deviates from broken syntax in PDF
                    this.addInst("adiw  $r2, $i0", 0x9600, 0xff00);
                    this.addInst("and   $r0, $r1", 0x2000, 0xfC00);
                    this.addInst("andi  $r3, $i1", 0x7000, 0xf000);
                    this.addInst("asr   $r0", 0x9405, 0xfe0f);
                    this.addInst("bclr  $r4", 0x9488, 0xff8f);
                    this.addInst("bld   $r0, $i9", 0xf800, 0xfe08);
                    this.addInst("brbc  $i9, $lb", 0xf400, 0xfc00);
                    this.addInst("brbs  $i9, $lb", 0xf000, 0xfc00);
                    this.addInst("brcc  $lb", 0xf400, 0xfc07);
                    this.addInst("brcs  $lb", 0xf000, 0xfc07);
                    this.addInst("break", 0x9598, 0xffff);
                    this.addInst("breq  $lb", 0xf001, 0xfc07);
                    this.addInst("brge  $lb", 0xf404, 0xfc07);
                    this.addInst("brhc  $lb", 0xf405, 0xfc07);
                    this.addInst("brhs  $lb", 0xf005, 0xfc07);
                    this.addInst("brid  $lb", 0xf407, 0xfc07);
                    this.addInst("brie  $lb", 0xf007, 0xfc07);
                    // conflict with brbs?
                    this.addInst("brlo  $lb", 0xf000, 0xfc07);
                    this.addInst("brlt  $lb", 0xf004, 0xfc07);
                    this.addInst("brmi  $lb", 0xf002, 0xfc07);
                    this.addInst("brne  $lb", 0xf401, 0xfc07);
                    this.addInst("brpl  $lb", 0xf402, 0xfc07);
                    // error in doc? - this has same opcode as brcc
                    this.addInst("brsh  $lb", 0xf400, 0xfc07);
                    this.addInst("brtc  $lb", 0xf406, 0xfc07);
                    this.addInst("brts  $lb", 0xf006, 0xfc07);
                    this.addInst("brvc  $lb", 0xf403, 0xfc07);
                    this.addInst("brvs  $lb", 0xf003, 0xfc07);
                    this.addInst("bset  $r4", 0x9408, 0xff8f);
                    this.addInst("bst   $r0, $i9", 0xfa00, 0xfe08);
                    // call - 32 bit - special handling
                    this.addInst("call  $lc", 0x940e, 0xffff, true);
                    this.addInst("cbi   $r7, $i9", 0x9800, 0xff00);
                    this.addInst("cbr   $r3, $i3", 0x7000, 0xf000);
                    this.addInst("clc", 0x9488, 0xffff);
                    this.addInst("clh", 0x94d8, 0xffff);
                    this.addInst("cli", 0x94f8, 0xffff);
                    this.addInst("cln", 0x94a8, 0xffff);
                    this.addInst("clr $r6", 0x2400, 0xfc00);
                    this.addInst("cls", 0x94c8, 0xffff);
                    this.addInst("clt", 0x94e8, 0xffff);
                    this.addInst("clv", 0x94b8, 0xffff);
                    this.addInst("clz", 0x9498, 0xffff);
                    this.addInst("com   $r0", 0x9400, 0xfe0f);
                    this.addInst("cp    $r0, $r1", 0x1400, 0xfC00);
                    this.addInst("cpc   $r0, $r1", 0x0400, 0xfC00);
                    this.addInst("cpi   $r3, $i1", 0x3000, 0xf000);
                    this.addInst("cpse  $r0, $r1", 0x1000, 0xfC00);
                    this.addInst("dec   $r0", 0x940a, 0xfe0f);
                    this.addInst("des   $i4", 0x940b, 0xff0f);
                    this.addInst("eicall", 0x9519, 0xffff);
                    this.addInst("eijmp", 0x9419, 0xffff);
                    this.addInst("elpm", 0x95d8, 0xffff);
                    this.addInst("elpm  $r0, Z0", 0x9006, 0xfe0f);
                    this.addInst("elpm  $r0, Z+0", 0x9007, 0xfe0f);
                    this.addInst("eor   $r0, $r1", 0x2400, 0xfC00);
                    this.addInst("fmul   $r10, $r11", 0x0308, 0xff88);
                    this.addInst("fmuls  $r10, $r11", 0x0380, 0xff88);
                    this.addInst("fmulsu $r10, $r11", 0x0388, 0xff88);
                    this.addInst("icall", 0x9509, 0xffff);
                    this.addInst("ijmp", 0x9409, 0xffff);
                    this.addInst("in    $r0, $i5", 0xb000, 0xf800);
                    this.addInst("inc   $r0", 0x9403, 0xfe0f);
                    // jmp - 32 bit - special handling
                    this.addInst("jmp  $lc", 0x940c, 0xffff, true);
                    this.addInst("lac   Z, $r0", 0x9206, 0xfe0f);
                    this.addInst("las   Z, $r0", 0x9205, 0xfe0f);
                    this.addInst("lat   Z, $r0", 0x9207, 0xfe0f);
                    this.addInst("ld    $r0, X", 0x900c, 0xfe0f);
                    this.addInst("ld    $r0, X+", 0x900d, 0xfe0f);
                    this.addInst("ld    $r0, -X", 0x900e, 0xfe0f);
                    this.addInst("ld    $r0, Y", 0x8008, 0xfe0f);
                    this.addInst("ld    $r0, Y+", 0x9009, 0xfe0f);
                    this.addInst("ld    $r0, -Y", 0x900a, 0xfe0f);
                    this.addInst("ldd   $r0, Y, $i8", 0x8008, 0xd208);
                    this.addInst("ld    $r0, Z", 0x8000, 0xfe0f);
                    this.addInst("ld    $r0, Z+", 0x9001, 0xfe0f);
                    this.addInst("ld    $r0, -Z", 0x9002, 0xfe0f);
                    this.addInst("ldd   $r0, Z, $i8", 0x8000, 0xd208);
                    this.addInst("ldi   $r3, $i1", 0xe000, 0xf000);
                    // lds - 32 bit (special handling required)
                    this.addInst("lds   $r0, $la", 0x9000, 0xfe0f, true);
                    this.addInst("lds   $r3, $i6", 0xa000, 0xf800);
                    this.addInst("lpm", 0x95a8, 0xffff);
                    this.addInst("lpm   $r0, Z", 0x9004, 0xfe0f);
                    this.addInst("lpm   $r0, Z+", 0x9005, 0xfe0f);
                    this.addInst("lsl   $r6", 0x0c00, 0xfc00);
                    this.addInst("lsr   $r0", 0x9406, 0xfe0f);
                    this.addInst("mov   $r0, $r1", 0x2C00, 0xfC00);
                    this.addInst("movw  $r8, $r9", 0x0100, 0xff00);
                    this.addInst("mul   $r0, $r1", 0x9c00, 0xfC00);
                    this.addInst("muls  $r3, $r12", 0x0200, 0xff00);
                    this.addInst("mulsu $r10, $r11", 0x0300, 0xff88);
                    this.addInst("neg $r0", 0x9401, 0xfe0f);
                    this.addInst("nop", 0x0000, 0xffff);
                    this.addInst("or    $r0, $r1", 0x2800, 0xfC00);
                    this.addInst("ori   $r3, $i1", 0x6000, 0xf000);
                    this.addInst("out   $i5, $r0", 0xb800, 0xf800);
                    this.addInst("pop $r0", 0x900f, 0xfe0f);
                    this.addInst("push $r0", 0x920f, 0xfe0f);
                    this.addInst("rcall $ld", 0xd000, 0xf000);
                    this.addInst("ret", 0x9508, 0xffff);
                    this.addInst("reti", 0x9518, 0xffff);
                    this.addInst("rjmp $ld", 0xc000, 0xf000);
                    this.addInst("rol $r6", 0x1c00, 0xfc00);
                    this.addInst("ror $r0", 0x9407, 0xfe0f);
                    this.addInst("sbc   $r0, $r1", 0x0800, 0xfC00);
                    this.addInst("sbci  $r3, $i1", 0x4000, 0xf000);
                    this.addInst("sbi   $r7, $i9", 0x9a00, 0xff00);
                    this.addInst("sbic  $r7, $i9", 0x9900, 0xff00);
                    this.addInst("sbis  $r7, $i9", 0x9b00, 0xff00);
                    this.addInst("sbiw  $r2, $i0", 0x9700, 0xff00);
                    this.addInst("sbr   $r3, $i1", 0x6000, 0xf000);
                    this.addInst("sbrc  $r0, $i9", 0xfc00, 0xfe08);
                    this.addInst("sbrs  $r0, $i9", 0xfe00, 0xfe08);
                    this.addInst("sec", 0x9408, 0xffff);
                    this.addInst("seh", 0x9458, 0xffff);
                    this.addInst("sei", 0x9478, 0xffff);
                    this.addInst("sen", 0x9428, 0xffff);
                    this.addInst("sec", 0x9408, 0xffff);
                    this.addInst("ser $r3", 0xef0f, 0xff0f);
                    this.addInst("ses", 0x9448, 0xffff);
                    this.addInst("set", 0x9468, 0xffff);
                    this.addInst("sev", 0x9438, 0xffff);
                    this.addInst("sez", 0x9418, 0xffff);
                    this.addInst("sleep", 0x9588, 0xffff);
                    this.addInst("spm", 0x95e8, 0xffff);
                    this.addInst("st    X, $r0", 0x920c, 0xfe0f);
                    this.addInst("st    X+, $r0", 0x920d, 0xfe0f);
                    this.addInst("st    -X, $r0", 0x920e, 0xfe0f);
                    this.addInst("st    Y, $r0", 0x8208, 0xfe0f);
                    this.addInst("st    Y+, $r0", 0x9209, 0xfe0f);
                    this.addInst("st    -Y, $r0", 0x920a, 0xfe0f);
                    this.addInst("std   Y, $i8, $r0", 0x8208, 0xd208);
                    this.addInst("st    Z, $r0", 0x8200, 0xfe0f);
                    this.addInst("st    Z+, $r0", 0x9201, 0xfe0f);
                    this.addInst("st    -Z, $r0", 0x9202, 0xfe0f);
                    this.addInst("std   Z, $i8, $r0", 0x8200, 0xd208);
                    // sts - 32-bit (special handing required)
                    this.addInst("sts   $la, $r0", 0x9200, 0xfe0f, true);
                    this.addInst("sts   $i6, $r3", 0xa800, 0xf800);
                    this.addInst("sub   $r0, $r1", 0x1800, 0xfC00);
                    this.addInst("subi  $r3, $i1", 0x5000, 0xf000);
                    this.addInst("swap  $r0", 0x9402, 0xfe0f);
                    this.addInst("tst   $r6", 0x2000, 0xfc00);
                    this.addInst("wdr", 0x95a8, 0xffff);
                    this.addInst("xch   Z, $r0", 0x9204, 0xfe0F);
                }
                AVRProcessor.prototype.wordSize = function () {
                    return 2;
                };
                // return offset+1 because stack points to next available slot
                AVRProcessor.prototype.computeStackOffset = function (kind, offset) {
                    if (kind == "args")
                        return offset + 2; // the return pointer is stored on the stack, skip it to get to args
                    return offset + 1;
                };
                AVRProcessor.prototype.is32bit = function (i) {
                    return i.is32bit;
                };
                // - the call and jmp instructions have both 16-bit and 22-bit varieties
                // - lds and sts are both 16-bit
                // for now, we only support only 16-bit
                AVRProcessor.prototype.emit32 = function (op, v, actual) {
                    // TODO: optimize call/jmp by rcall/rjmp
                    var off = v >> 1;
                    pxtc.assert(off != null, "off null");
                    if ((off | 0) != off ||
                        // 16-bit only for now (so, can address 128k)
                        !(-128 * 512 <= off && off <= 128 * 512))
                        return pxtc.assembler.emitErr("jump out of range", actual);
                    // note that off is already in instructions, not bytes
                    var imm = off & 0xffff;
                    return {
                        opcode: op,
                        opcode2: imm,
                        stack: 0,
                        numArgs: [v],
                        labelName: actual
                    };
                };
                AVRProcessor.prototype.registerNo = function (actual) {
                    if (!actual)
                        return null;
                    actual = actual.toLowerCase();
                    var m = /^r(\d+)$/.exec(actual);
                    if (m) {
                        var r = parseInt(m[1], 10);
                        if (0 <= r && r < 32)
                            return r;
                    }
                    return null;
                };
                AVRProcessor.prototype.postProcessRelAddress = function (f, v) {
                    return v + f.baseOffset;
                };
                // absolute addresses come in divide by two
                AVRProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    return v << 1;
                };
                AVRProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    // lookup absolute, relative, dependeing
                    var l = f.lookupLabel(s);
                    if (l == null)
                        return null;
                    if (i.is32bit)
                        // absolute address
                        return l;
                    // relative address
                    return l - (f.pc() + 2);
                };
                AVRProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    /*
                    let ld = this.encoders["$ld"]
                    let lnop = ln.getOp()
        
                    // replace 32-bit with 16-bit when branch distance is within bounds
                    if ((lnop == "call" || lnop == "jmp") && ln.numArgs[0] != null) {
                        let offset = ln.numArgs[0] - (this.file.baseOffset + ln.location + 2) >> 1
                        if (ld.encode(offset)) {
                            // RULE: call/jmp .somewhere -> rcall/rjmp .somewhere (if fits)
                            if (lnop == "call")
                            ln.update((lnop == "call" ? "rcall " : "rjmp ") + ln.words[1])
                        }
                    }
                    */
                };
                AVRProcessor.prototype.toFnPtr = function (v, baseOff) {
                    return v >> 1;
                };
                AVRProcessor.prototype.testAssembler = function () {
                    pxtc.assembler.expect(this, "2411       eor	r1, r1 \n" +
                        "be1f       out	0x3f, r1 \n" +
                        "efcf       ldi	r28, 0xFF \n" +
                        "e0da       ldi	r29, 0x0A \n" +
                        "bfde       out	0x3e, r29 \n" +
                        "bfcd      	out	0x3d, r28 \n");
                    pxtc.assembler.expect(this, "0c00      lsl     r0\n" +
                        "920f      push    r0\n" +
                        "e604      ldi     r16, #100        ; 0x64\n" +
                        "903f      pop     r3\n");
                    pxtc.assembler.expect(this, "1412      cp      r1, r2\n" +
                        "f409      brne    l6\n" +
                        "c001      rjmp    l8\n" +
                        "0e01  l6: add     r0, r17\n" +
                        "0000  l8: nop     \n");
                };
                return AVRProcessor;
            }(pxtc.assembler.AbstractProcessor));
            avr.AVRProcessor = AVRProcessor;
        })(avr = pxtc.avr || (pxtc.avr = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.decodeBase64 = function (s) { return atob(s); };
        function asmStringLiteral(s) {
            var r = "\"";
            for (var i = 0; i < s.length; ++i) {
                // TODO generate warning when seeing high character ?
                var c = s.charCodeAt(i) & 0xff;
                var cc = String.fromCharCode(c);
                if (cc == "\\" || cc == "\"")
                    r += "\\" + cc;
                else if (cc == "\n")
                    r += "\\n";
                else if (c <= 0xf)
                    r += "\\x0" + c.toString(16);
                else if (c < 32 || c > 127)
                    r += "\\x" + c.toString(16);
                else
                    r += cc;
            }
            return r + "\"";
        }
        pxtc.asmStringLiteral = asmStringLiteral;
        // this class defines the interface between the IR
        // and a particular assembler (Thumb, AVR). Thus,
        // the registers mentioned below are VIRTUAL registers
        // required by the IR-machine, rather than PHYSICAL registers
        // at the assembly level.
        // that said, the assumptions below about registers are based on
        // ARM, so a mapping will be needed for other processors
        // Assumptions:
        // - registers can hold a pointer (data or code)
        // - special registers include: sp
        // - fixed registers are r0, r1, r2, r3, r5, r6 
        //   - r0 is the current value (from expression evaluation)
        //   - registers for runtime calls (r0, r1,r2,r3)
        //   - r5 is for captured locals in lambda
        //   - r6 for global{}
        // - for calls to user functions, all arguments passed on stack
        var AssemblerSnippets = (function () {
            function AssemblerSnippets() {
            }
            AssemblerSnippets.prototype.hasCommonalize = function () { return false; };
            AssemblerSnippets.prototype.nop = function () { return "TBD(nop)"; };
            AssemblerSnippets.prototype.reg_gets_imm = function (reg, imm) { return "TBD(reg_gets_imm)"; };
            // Registers are stored on the stack in numerical order 
            AssemblerSnippets.prototype.proc_setup = function (numlocals, main) { return "TBD(proc_setup)"; };
            AssemblerSnippets.prototype.push_fixed = function (reg) { return "TBD(push_fixed)"; };
            AssemblerSnippets.prototype.push_local = function (reg) { return "TBD(push_local)"; };
            AssemblerSnippets.prototype.push_locals = function (n) { return "TBD(push_locals)"; };
            AssemblerSnippets.prototype.pop_fixed = function (reg) { return "TBD(pop_fixed)"; };
            AssemblerSnippets.prototype.pop_locals = function (n) { return "TBD(pop_locals)"; };
            AssemblerSnippets.prototype.proc_return = function () { return "TBD(proc_return)"; };
            AssemblerSnippets.prototype.debugger_stmt = function (lbl) { return ""; };
            AssemblerSnippets.prototype.debugger_bkpt = function (lbl) { return ""; };
            AssemblerSnippets.prototype.debugger_proc = function (lbl) { return ""; };
            AssemblerSnippets.prototype.unconditional_branch = function (lbl) { return "TBD(unconditional_branch)"; };
            AssemblerSnippets.prototype.beq = function (lbl) { return "TBD(beq)"; };
            AssemblerSnippets.prototype.bne = function (lbl) { return "TBD(bne)"; };
            AssemblerSnippets.prototype.cmp = function (reg1, reg) { return "TBD(cmp)"; };
            AssemblerSnippets.prototype.cmp_zero = function (reg1) { return "TBD(cmp_zero)"; };
            AssemblerSnippets.prototype.arithmetic = function () { return ""; };
            // load_reg_src_off is load/store indirect
            // word? - does offset represent an index that must be multiplied by word size?
            // inf?  - control over size of referenced data
            // str?  - true=Store/false=Load
            // src - can range over
            AssemblerSnippets.prototype.load_reg_src_off = function (reg, src, off, word, store, inf) {
                return "TBD(load_reg_src_off)";
            };
            AssemblerSnippets.prototype.rt_call = function (name, r0, r1) { return "TBD(rt_call)"; };
            AssemblerSnippets.prototype.call_lbl = function (lbl) { return "TBD(call_lbl)"; };
            AssemblerSnippets.prototype.call_reg = function (reg) { return "TBD(call_reg)"; };
            AssemblerSnippets.prototype.vcall = function (mapMethod, isSet, vtableShift) {
                return "TBD(vcall)";
            };
            AssemblerSnippets.prototype.prologue_vtable = function (arg_index, vtableShift) {
                return "TBD(prologue_vtable";
            };
            AssemblerSnippets.prototype.helper_prologue = function () { return "TBD(lambda_prologue)"; };
            AssemblerSnippets.prototype.helper_epilogue = function () { return "TBD(lambda_epilogue)"; };
            AssemblerSnippets.prototype.load_ptr = function (lbl, reg) { return "TBD(load_ptr)"; };
            AssemblerSnippets.prototype.load_ptr_full = function (lbl, reg) { return "TBD(load_ptr_full)"; };
            AssemblerSnippets.prototype.emit_int = function (v, reg) { return "TBD(emit_int)"; };
            AssemblerSnippets.prototype.string_literal = function (lbl, s) {
                return "\n.balign 4\n" + lbl + "meta: .short 0xffff, " + (pxtc.target.taggedInts ? pxt.REF_TAG_STRING + "," : "") + " " + s.length + "\n" + lbl + ": .string " + asmStringLiteral(s) + "\n";
            };
            AssemblerSnippets.prototype.hex_literal = function (lbl, data) {
                return "\n.balign 4\n" + lbl + ": .short 0xffff, " + (pxtc.target.taggedInts ? pxt.REF_TAG_BUFFER + "," : "") + " " + (data.length >> 1) + "\n        .hex " + data + (data.length % 4 == 0 ? "" : "00") + "\n";
            };
            AssemblerSnippets.prototype.method_call = function (procid, topExpr) {
                return "";
            };
            return AssemblerSnippets;
        }());
        pxtc.AssemblerSnippets = AssemblerSnippets;
        // helper for emit_int
        function numBytes(n) {
            var v = 0;
            for (var q = n; q > 0; q >>>= 8) {
                v++;
            }
            return v || 1;
        }
        pxtc.numBytes = numBytes;
        var ProctoAssembler = (function () {
            function ProctoAssembler(t, bin, proc) {
                var _this = this;
                this.resText = "";
                this.exprStack = [];
                this.calls = [];
                this.proc = null;
                this.baseStackSize = 0; // real stack size is this + exprStack.length
                this.write = function (s) { _this.resText += pxtc.asmline(s); };
                this.t = t;
                this.bin = bin;
                this.proc = proc;
                this.work();
            }
            ProctoAssembler.prototype.stackSize = function () {
                return this.baseStackSize + this.exprStack.length;
            };
            ProctoAssembler.prototype.stackAlignmentNeeded = function (offset) {
                if (offset === void 0) { offset = 0; }
                if (!pxtc.target.stackAlign)
                    return 0;
                var npush = pxtc.target.stackAlign - ((this.stackSize() + offset) & (pxtc.target.stackAlign - 1));
                if (npush == pxtc.target.stackAlign)
                    return 0;
                else
                    return npush;
            };
            ProctoAssembler.prototype.alignStack = function (offset) {
                if (offset === void 0) { offset = 0; }
                var npush = this.stackAlignmentNeeded(offset);
                if (!npush)
                    return "";
                this.write(this.t.push_locals(npush));
                return this.t.pop_locals(npush);
            };
            ProctoAssembler.prototype.getAssembly = function () {
                return this.resText;
            };
            ProctoAssembler.prototype.work = function () {
                var _this = this;
                this.write("\n;\n; Function " + this.proc.getName() + "\n;\n");
                if (this.proc.args.length <= 3)
                    this.emitLambdaWrapper(this.proc.isRoot);
                var baseLabel = this.proc.label();
                var bkptLabel = baseLabel + "_bkpt";
                var locLabel = baseLabel + "_locals";
                var endLabel = baseLabel + "_end";
                this.write(".section code");
                this.write("\n" + baseLabel + ":\n    @stackmark func\n    @stackmark args\n");
                // create a new function for later use by hex file generation
                this.proc.fillDebugInfo = function (th) {
                    var labels = th.getLabels();
                    _this.proc.debugInfo = {
                        locals: (_this.proc.seqNo == 1 ? _this.bin.globals : _this.proc.locals).map(function (l) { return l.getDebugInfo(); }),
                        args: _this.proc.args.map(function (l) { return l.getDebugInfo(); }),
                        name: _this.proc.getName(),
                        codeStartLoc: pxtc.U.lookup(labels, locLabel),
                        codeEndLoc: pxtc.U.lookup(labels, endLabel),
                        bkptLoc: pxtc.U.lookup(labels, bkptLabel),
                        localsMark: pxtc.U.lookup(th.stackAtLabel, locLabel),
                        idx: _this.proc.seqNo,
                        calls: _this.calls
                    };
                    for (var _i = 0, _a = _this.calls; _i < _a.length; _i++) {
                        var ci = _a[_i];
                        ci.addr = pxtc.U.lookup(labels, ci.callLabel);
                        ci.stack = pxtc.U.lookup(th.stackAtLabel, ci.callLabel);
                        ci.callLabel = undefined; // don't waste space
                    }
                    for (var i = 0; i < _this.proc.body.length; ++i) {
                        var bi = _this.proc.body[i].breakpointInfo;
                        if (bi) {
                            var off = pxtc.U.lookup(th.stackAtLabel, "__brkp_" + bi.id);
                            if (off !== _this.proc.debugInfo.localsMark) {
                                console.log(bi);
                                console.log(th.stackAtLabel);
                                pxtc.U.oops("offset doesn't match: " + off + " != " + _this.proc.debugInfo.localsMark);
                            }
                        }
                    }
                };
                if (this.bin.options.breakpoints) {
                    this.write(this.t.debugger_proc(bkptLabel));
                }
                this.baseStackSize = 1; // push {lr}
                var numlocals = this.proc.locals.length;
                this.write(this.t.proc_setup(numlocals));
                this.baseStackSize += numlocals;
                this.write("@stackmark locals");
                this.write(locLabel + ":");
                //console.log(proc.toString())
                this.proc.resolve();
                //console.log("OPT", proc.toString())
                for (var i = 0; i < this.proc.body.length; ++i) {
                    var s = this.proc.body[i];
                    // console.log("STMT", s.toString())
                    switch (s.stmtKind) {
                        case pxtc.ir.SK.Expr:
                            this.emitExpr(s.expr);
                            break;
                        case pxtc.ir.SK.StackEmpty:
                            if (this.exprStack.length > 0) {
                                for (var _i = 0, _a = this.proc.body.slice(i - 4, i + 1); _i < _a.length; _i++) {
                                    var stmt = _a[_i];
                                    console.log("PREVSTMT " + stmt.toString().trim());
                                }
                                for (var _b = 0, _c = this.exprStack; _b < _c.length; _b++) {
                                    var e = _c[_b];
                                    console.log("EXPRSTACK " + e.currUses + "/" + e.totalUses + " E: " + e.toString());
                                }
                                pxtc.oops("stack should be empty");
                            }
                            this.write("@stackempty locals");
                            break;
                        case pxtc.ir.SK.Jmp:
                            this.emitJmp(s);
                            break;
                        case pxtc.ir.SK.Label:
                            this.write(s.lblName + ":");
                            break;
                        case pxtc.ir.SK.Breakpoint:
                            if (this.bin.options.breakpoints) {
                                var lbl = "__brkp_" + s.breakpointInfo.id;
                                if (s.breakpointInfo.isDebuggerStmt) {
                                    this.write(this.t.debugger_stmt(lbl));
                                }
                                else {
                                    this.write(this.t.debugger_bkpt(lbl));
                                }
                            }
                            break;
                        default: pxtc.oops();
                    }
                }
                pxtc.assert(0 <= numlocals && numlocals < 127);
                if (numlocals > 0)
                    this.write(this.t.pop_locals(numlocals));
                this.write(endLabel + ":");
                this.write(this.t.proc_return());
                this.write("@stackempty func");
                this.write("@stackempty args");
            };
            ProctoAssembler.prototype.mkLbl = function (root) {
                var l = root + this.bin.lblNo++;
                if (l[0] != "_")
                    l = "." + l;
                return l;
            };
            ProctoAssembler.prototype.terminate = function (expr) {
                pxtc.assert(expr.exprKind == pxtc.ir.EK.SharedRef);
                var arg = expr.args[0];
                if (arg.currUses == arg.totalUses)
                    return;
                var numEntries = 0;
                while (numEntries < this.exprStack.length) {
                    var ee = this.exprStack[numEntries];
                    if (ee != arg && ee.currUses != ee.totalUses)
                        break;
                    numEntries++;
                }
                pxtc.assert(numEntries > 0);
                this.write("@dummystack " + numEntries);
                this.write(this.t.pop_locals(numEntries));
            };
            ProctoAssembler.prototype.emitJmp = function (jmp) {
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        this.emitExpr(jmp.expr);
                    if (jmp.terminateExpr)
                        this.terminate(jmp.terminateExpr);
                    this.write(this.t.unconditional_branch(jmp.lblName) + " ; with expression");
                }
                else {
                    var lbl = this.mkLbl("jmpz");
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfJmpValEq) {
                        this.emitExprInto(jmp.expr, "r1");
                        this.write(this.t.cmp("r0", "r1"));
                    }
                    else {
                        this.emitExpr(jmp.expr);
                        // TODO: remove ARM-specific code
                        if (jmp.expr.exprKind == pxtc.ir.EK.RuntimeCall && jmp.expr.data === "thumb::subs") {
                        }
                        else {
                            this.write(this.t.cmp_zero("r0"));
                        }
                    }
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        this.write(this.t.beq(lbl)); // this is to *skip* the following 'b' instruction; beq itself has a very short range
                    }
                    else {
                        // IfZero or IfJmpValEq
                        this.write(this.t.bne(lbl));
                    }
                    if (jmp.terminateExpr)
                        this.terminate(jmp.terminateExpr);
                    this.write(this.t.unconditional_branch(jmp.lblName));
                    this.write(lbl + ":");
                }
            };
            ProctoAssembler.prototype.clearStack = function () {
                var numEntries = 0;
                while (this.exprStack.length > 0 && this.exprStack[0].currUses == this.exprStack[0].totalUses) {
                    numEntries++;
                    this.exprStack.shift();
                }
                if (numEntries)
                    this.write(this.t.pop_locals(numEntries));
            };
            ProctoAssembler.prototype.withRef = function (name, isRef) {
                return name + (isRef ? "Ref" : "");
            };
            ProctoAssembler.prototype.emitExprInto = function (e, reg) {
                switch (e.exprKind) {
                    case pxtc.ir.EK.NumberLiteral:
                        if (e.data === true)
                            this.write(this.t.emit_int(1, reg));
                        else if (e.data === false)
                            this.write(this.t.emit_int(0, reg));
                        else if (e.data === null)
                            this.write(this.t.emit_int(0, reg));
                        else if (typeof e.data == "number")
                            this.write(this.t.emit_int(e.data, reg));
                        else
                            pxtc.oops();
                        break;
                    case pxtc.ir.EK.PointerLiteral:
                        if (e.args)
                            this.write(this.t.load_ptr_full(e.data, reg));
                        else
                            this.write(this.t.load_ptr(e.data, reg));
                        break;
                    case pxtc.ir.EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = this.exprStack.indexOf(arg);
                        pxtc.U.assert(idx >= 0);
                        if (idx == 0 && arg.totalUses == arg.currUses) {
                            this.write(this.t.pop_fixed([reg]) + (" ; tmpref @" + this.exprStack.length));
                            this.exprStack.shift();
                            this.clearStack();
                        }
                        else {
                            var idx0 = idx.toString() + ":" + this.exprStack.length;
                            this.write(this.t.load_reg_src_off(reg, "sp", idx0, true) + (" ; tmpref @" + (this.exprStack.length - idx)));
                        }
                        break;
                    case pxtc.ir.EK.CellRef:
                        var cell = e.data;
                        if (cell.isGlobal()) {
                            var inf = this.bitSizeInfo(cell.bitSize);
                            var off = "#" + cell.index;
                            if (inf.needsSignExt || cell.index >= inf.immLimit) {
                                this.write(this.t.emit_int(cell.index, reg));
                                off = reg;
                            }
                            this.write(this.t.load_reg_src_off(reg, "r6", off, false, false, inf));
                        }
                        else {
                            var _a = this.cellref(cell), src = _a[0], imm = _a[1], idx_1 = _a[2];
                            this.write(this.t.load_reg_src_off(reg, src, imm, idx_1));
                        }
                        break;
                    default: pxtc.oops();
                }
            };
            ProctoAssembler.prototype.bitSizeInfo = function (b) {
                var inf = {
                    size: pxtc.sizeOfBitSize(b),
                    immLimit: 128
                };
                if (inf.size == 1) {
                    inf.immLimit = 32;
                }
                else if (inf.size == 2) {
                    inf.immLimit = 64;
                }
                if (b == 1 /* Int8 */ || b == 3 /* Int16 */) {
                    inf.needsSignExt = true;
                }
                return inf;
            };
            // result in R0
            ProctoAssembler.prototype.emitExpr = function (e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                var _this = this;
                switch (e.exprKind) {
                    case pxtc.ir.EK.JmpValue:
                        this.write("; jmp value (already in r0)");
                        break;
                    case pxtc.ir.EK.Nop:
                        // this is there because we need different addresses for breakpoints
                        this.write(this.t.nop());
                        break;
                    case pxtc.ir.EK.Incr:
                        this.emitExpr(e.args[0]);
                        this.emitCallRaw("pxt::incr");
                        break;
                    case pxtc.ir.EK.Decr:
                        this.emitExpr(e.args[0]);
                        this.emitCallRaw("pxt::decr");
                        break;
                    case pxtc.ir.EK.FieldAccess:
                        var info = e.data;
                        // it does the decr itself, no mask
                        return this.emitExpr(pxtc.ir.rtcall(this.withRef("pxtrt::ldfld", info.isRef), [e.args[0], pxtc.ir.numlit(info.idx)]));
                    case pxtc.ir.EK.Store:
                        return this.emitStore(e.args[0], e.args[1]);
                    case pxtc.ir.EK.RuntimeCall:
                        return this.emitRtCall(e);
                    case pxtc.ir.EK.ProcCall:
                        return this.emitProcCall(e);
                    case pxtc.ir.EK.SharedDef:
                        return this.emitSharedDef(e);
                    case pxtc.ir.EK.Sequence:
                        e.args.forEach(function (e) { return _this.emitExpr(e); });
                        return this.clearStack();
                    default:
                        return this.emitExprInto(e, "r0");
                }
            };
            ProctoAssembler.prototype.emitSharedDef = function (e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                if (arg.totalUses == 1)
                    return this.emitExpr(arg);
                else {
                    this.emitExpr(arg);
                    this.exprStack.unshift(arg);
                    this.write(this.t.push_local("r0") + "; tmpstore @" + this.exprStack.length);
                }
            };
            ProctoAssembler.prototype.emitSharedTerminate = function (e) {
                this.emitExpr(e);
                var arg = e.data;
                // ??? missing ???
            };
            ProctoAssembler.prototype.emitRtCall = function (topExpr) {
                var _this = this;
                var info = pxtc.ir.flattenArgs(topExpr);
                info.precomp.forEach(function (e) { return _this.emitExpr(e); });
                info.flattened.forEach(function (a, i) {
                    pxtc.U.assert(i <= 3);
                    _this.emitExprInto(a, "r" + i);
                });
                this.clearStack();
                var name = topExpr.data;
                //console.log("RT",name,topExpr.isAsync)
                if (name == "langsupp::ignore")
                    return;
                if (pxtc.U.startsWith(name, "thumb::")) {
                    this.write(this.t.rt_call(name.slice(7), "r0", "r1"));
                }
                else {
                    this.alignedCall(name);
                }
            };
            ProctoAssembler.prototype.alignedCall = function (name, cmt) {
                if (cmt === void 0) { cmt = ""; }
                var unalign = this.alignStack();
                this.write(this.t.call_lbl(name) + cmt);
                this.write(unalign);
            };
            ProctoAssembler.prototype.emitHelper = function (asm) {
                if (!this.bin.codeHelpers[asm]) {
                    var len = Object.keys(this.bin.codeHelpers).length;
                    this.bin.codeHelpers[asm] = "_hlp_" + len;
                }
                this.write(this.t.call_lbl(this.bin.codeHelpers[asm]));
            };
            ProctoAssembler.prototype.emitProcCall = function (topExpr) {
                var _this = this;
                var stackBottom = 0;
                var needsRePush = false;
                //console.log("PROCCALL", topExpr.toString())
                var argStmts = topExpr.args.map(function (a, i) {
                    _this.emitExpr(a);
                    _this.write(_this.t.push_local("r0") + " ; proc-arg");
                    a.totalUses = 1;
                    a.currUses = 0;
                    _this.exprStack.unshift(a);
                    if (i == 0)
                        stackBottom = _this.exprStack.length;
                    if (_this.exprStack.length - stackBottom != i)
                        needsRePush = true;
                    return a;
                });
                if (this.stackAlignmentNeeded())
                    needsRePush = true;
                if (needsRePush) {
                    var interAlign = this.stackAlignmentNeeded(argStmts.length);
                    if (interAlign) {
                        this.write(this.t.push_locals(interAlign));
                        for (var i = 0; i < interAlign; ++i) {
                            var dummy = pxtc.ir.numlit(0);
                            dummy.totalUses = 1;
                            dummy.currUses = 1;
                            this.exprStack.unshift(dummy);
                        }
                    }
                    for (var _i = 0, argStmts_1 = argStmts; _i < argStmts_1.length; _i++) {
                        var a = argStmts_1[_i];
                        var idx = this.exprStack.indexOf(a);
                        pxtc.assert(idx >= 0);
                        this.write(this.t.load_reg_src_off("r0", "sp", idx.toString(), true) + " ; repush");
                        this.write(this.t.push_local("r0") + " ; repush");
                        this.exprStack.unshift(a);
                    }
                }
                var lbl = this.mkLbl("_proccall");
                var procid = topExpr.data;
                var procIdx = -1;
                if (procid.virtualIndex != null || procid.ifaceIndex != null) {
                    var custom = this.t.method_call(procid, topExpr);
                    if (custom) {
                        this.write(custom);
                        this.write(lbl + ":");
                    }
                    else if (procid.mapMethod) {
                        var isSet = /Set/.test(procid.mapMethod);
                        pxtc.assert(isSet == (topExpr.args.length == 2));
                        pxtc.assert(!isSet == (topExpr.args.length == 1));
                        this.write(this.t.emit_int(procid.mapIdx, "r1"));
                        if (isSet)
                            this.write(this.t.emit_int(procid.ifaceIndex, "r2"));
                        this.emitHelper(this.t.vcall(procid.mapMethod, isSet, pxtc.vtableShift));
                        this.write(lbl + ":");
                    }
                    else {
                        this.write(this.t.prologue_vtable(topExpr.args.length - 1, pxtc.vtableShift));
                        var effIdx = procid.virtualIndex + 4;
                        if (procid.ifaceIndex != null) {
                            this.write(this.t.load_reg_src_off("r0", "r0", "#4") + " ; iface table");
                            effIdx = procid.ifaceIndex;
                        }
                        if (effIdx <= 31) {
                            this.write(this.t.load_reg_src_off("r0", "r0", effIdx.toString(), true) + " ; ld-method");
                        }
                        else {
                            this.write(this.t.emit_int(effIdx * 4, "r1"));
                            this.write(this.t.load_reg_src_off("r0", "r0", "r1") + " ; ld-method");
                        }
                        this.write(this.t.call_reg("r0"));
                        this.write(lbl + ":");
                    }
                }
                else {
                    var proc = procid.proc;
                    procIdx = proc.seqNo;
                    this.write(this.t.call_lbl(proc.label()));
                    this.write(lbl + ":");
                }
                this.calls.push({
                    procIndex: procIdx,
                    stack: 0,
                    addr: 0,
                    callLabel: lbl,
                });
                for (var _a = 0, argStmts_2 = argStmts; _a < argStmts_2.length; _a++) {
                    var a = argStmts_2[_a];
                    a.currUses = 1;
                }
                this.clearStack();
            };
            ProctoAssembler.prototype.emitStore = function (trg, src) {
                switch (trg.exprKind) {
                    case pxtc.ir.EK.CellRef:
                        var cell = trg.data;
                        this.emitExpr(src);
                        if (cell.isGlobal()) {
                            var inf = this.bitSizeInfo(cell.bitSize);
                            var off = "#" + cell.index;
                            if (cell.index >= inf.immLimit) {
                                this.write(this.t.emit_int(cell.index, "r1"));
                                off = "r1";
                            }
                            this.write(this.t.load_reg_src_off("r0", "r6", off, false, true, inf));
                        }
                        else {
                            var _a = this.cellref(cell), reg = _a[0], imm = _a[1], off = _a[2];
                            this.write(this.t.load_reg_src_off("r0", reg, imm, off, true));
                        }
                        break;
                    case pxtc.ir.EK.FieldAccess:
                        var info = trg.data;
                        // it does the decr itself, no mask
                        this.emitExpr(pxtc.ir.rtcall(this.withRef("pxtrt::stfld", info.isRef), [trg.args[0], pxtc.ir.numlit(info.idx), src]));
                        break;
                    default: pxtc.oops();
                }
            };
            ProctoAssembler.prototype.cellref = function (cell) {
                if (cell.isGlobal()) {
                    throw pxtc.oops();
                }
                else if (cell.iscap) {
                    pxtc.assert(0 <= cell.index && cell.index < 32);
                    return ["r5", cell.index.toString(), true];
                }
                else if (cell.isarg) {
                    var idx = this.proc.args.length - cell.index - 1;
                    return ["sp", "args@" + idx.toString() + ":" + this.baseStackSize, false];
                }
                else {
                    return ["sp", "locals@" + cell.index, false];
                }
            };
            ProctoAssembler.prototype.emitLambdaWrapper = function (isMain) {
                var _this = this;
                var node = this.proc.action;
                this.write("");
                this.write(".section code");
                if (pxtc.isAVR()) {
                    this.write(this.proc.label() + "_Lit:");
                }
                else {
                    if (isMain)
                        this.write(this.t.unconditional_branch(".themain"));
                    this.write(".balign 4");
                    this.write(this.proc.label() + "_Lit:");
                    this.write(".short 0xffff, " + pxt.REF_TAG_ACTION + "   ; action literal");
                    if (isMain)
                        this.write(".themain:");
                }
                this.write("@stackmark litfunc");
                var parms = this.proc.args.map(function (a) { return a.def; });
                this.write(this.t.proc_setup(0, true));
                if (this.t.hasCommonalize())
                    this.write(this.t.push_fixed(["r5", "r6", "r7"]));
                else
                    this.write(this.t.push_fixed(["r5", "r6"]));
                this.baseStackSize = 4; // above
                var numpop = parms.length;
                var alignment = this.stackAlignmentNeeded(parms.length);
                if (alignment) {
                    this.write(this.t.push_locals(alignment));
                    numpop += alignment;
                }
                parms.forEach(function (_, i) {
                    if (i >= 3)
                        pxtc.U.userError(pxtc.U.lf("only up to three parameters supported in lambdas"));
                    _this.write(_this.t.push_local("r" + (i + 1)));
                });
                var asm = this.t.helper_prologue();
                this.proc.args.forEach(function (p, i) {
                    if (p.isRef()) {
                        var _a = _this.cellref(p), reg = _a[0], off = _a[1], idx = _a[2];
                        asm += _this.t.load_reg_src_off("r0", reg, off, idx) + "\n";
                        asm += _this.t.call_lbl("pxt::incr") + "\n";
                    }
                });
                asm += this.t.helper_epilogue();
                this.emitHelper(asm); // using shared helper saves about 3% of binary size
                this.write(this.t.call_lbl(this.proc.label()));
                if (numpop)
                    this.write(this.t.pop_locals(numpop));
                if (this.t.hasCommonalize())
                    this.write(this.t.pop_fixed(["r6", "r5", "r7"]));
                else
                    this.write(this.t.pop_fixed(["r6", "r5"]));
                this.write(this.t.proc_return());
                this.write("@stackempty litfunc");
            };
            ProctoAssembler.prototype.emitCallRaw = function (name) {
                var inf = pxtc.hex.lookupFunc(name);
                pxtc.assert(!!inf, "unimplemented raw function: " + name);
                this.alignedCall(name);
            };
            return ProctoAssembler;
        }());
        pxtc.ProctoAssembler = ProctoAssembler;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// Make sure backbase.ts is loaded before us, otherwise 'extends AssemblerSnippets' fails at runtime
/// <reference path="backbase.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        // AVR:
        // - 32 8-bit registers (R0 - R31), with mapping to data addresses 0x0000 - 0x001F
        //   - X-register R26 (low), R27 (high)
        //   - Y-register R28 (low), R29 (high), Frame Pointer (FP)
        //   - Z-register R30 (low), R31 (high), use for indirect addressing
        // - 64 I/0 registers ($00-$3F), with mapping to data addresses 0x0020 - 0x005F
        // - 160 Ext I/O registers (0x0060-0x00FF)
        // - Internal SRAM 0x100-
        // - SP: special register in I/O space (0x3D, 0x3E)
        // - instructions that use SP
        //   - PUSH Rr (dec SP by 1) 
        //   - CALL, ICALL, RCALL (dec by 2 - 16 bit code pointer)
        //   - POP Rd (inc SP by 1)
        //   - RET, RETI (inc by 2 - 16 bit code pointer)
        // - in AVR, 0x0060 is lowest address for the stack
        // - stack grows from high (RAMEND) to low (top of stack)
        // Text below from http://gcc.gnu.org/wiki/avr-gcc 
        // R0 is used as scratch register that need not to be restored after its usage. 
        // R1 always contains zero.
        /*
         * Call-Used Registers
         *
         * R18–R27, R30, R31. These GPRs are call clobbered.
         * An ordinary function may use them without restoring the contents.
         */
        /*
         * Call-Saved Registers
         *
         * R2–R17, (R28, R29) FP
         * The remaining GPRs are call-saved, i.e. a function that uses such a registers must restore its original content.
         * This applies even if the register is used to pass a function argument.
         * R1 The zero-register is implicity call-saved (implicit because R1 is a fixed register).
         */
        /*
         * Frame layout
         *
         * Y-register (R28-R29) is frame pointer
         *
         * Pseudos that don't get a hard register will be put into a stack slot and loaded / stored as needed.
         * The stack grows downwards.
         * Stack pointer and frame pointer are not aligned, i.e. 1-byte aligned.
         * After the function prologue, the frame pointer will point one byte below the stack frame,
         * i.e. Y+1 points to the bottom of the stack frame.
         */
        /*
         * Calling convention
         *
         * - An argument is passed either completely in registers or completely in memory.
         * - To find the register where a function argument is passed, follow this procedure:
         *   0. X = 26
         *   1. If the argument SIZE is an odd number of bytes, round up SIZE to the next even number.
         *   2. X = X -SIZE
         *   3. If the new X is at least 8 and the size of the object is non-zero,
         *      then the low-byte of the argument is passed in RX. Subsequent bytes of the argument
         *      are passed in the subsequent registers, i.e. in increasing register numbers.
         *   4. If X < 8 or the SIZE = 0, the argument will be passed in memory.
         *   5. If the current argument is passed in memory, stop the procedure: All subsequent arguments will also be passed in memory.
         *   6. If there are arguments left, goto 1. and proceed with the next argument.
         *
         * - Return values with a size of 1 byte up to and including a size of 8 bytes will be returned in registers.
         * - Return values whose size is outside that range will be returned in memory.
         * - If the return value of a function is returned in registers, the same registers are used as if
         *   the value was the first parameter of a non-varargs function.
         * For example, an 8-bit value is returned in R24 and an 32-bit value is returned R22...R25.
         */
        // for now, everything is 16-bit (word)
        var AVRSnippets = (function (_super) {
            __extends(AVRSnippets, _super);
            function AVRSnippets() {
                _super.apply(this, arguments);
                // mapping from virtual registers to AVR registers
                this.rmap_lo = {
                    "r0": "r24",
                    "r1": "r22",
                    "r2": "r20",
                    "r3": "r18",
                    "r5": "r4",
                    "r6": "r2"
                };
                this.rmap_hi = {
                    "r0": "r25",
                    "r1": "r23",
                    "r2": "r21",
                    "r3": "r19",
                    "r5": "r5",
                    "r6": "r3"
                };
                this.inst_lo = {
                    "adds": "add",
                    "subs": "sub",
                    "ands": "and",
                    "orrs": "or",
                    "eors": "eor",
                    "muls": "Number_::",
                    "lsls": "Number_::",
                    "asrs": "Number_::",
                    "lsrs": "Number_::" // case SK.GreaterThanGreaterThanGreaterThanToken
                };
                this.inst_hi = {
                    "adds": "adc",
                    "subs": "sbc",
                    "ands": "and",
                    "orrs": "or",
                    "eors": "eor"
                };
            }
            AVRSnippets.prototype.nop = function () { return "nop"; };
            AVRSnippets.prototype.reg_gets_imm = function (reg, imm) {
                var imm_lo = imm & 0xff;
                var imm_hi = (imm & 0xff00) >> 8;
                return "\n    ldi " + this.rmap_lo[reg] + ", #" + imm_lo + "\n    ldi " + this.rmap_hi[reg] + ", #" + imm_hi;
            };
            AVRSnippets.prototype.push_fixed = function (regs) {
                var _this = this;
                var res = "";
                regs.forEach(function (r) {
                    res = res + ("\npush " + _this.rmap_hi[r] + "\npush " + _this.rmap_lo[r]);
                });
                res += "\n    @dummystack " + regs.length;
                return res;
            };
            AVRSnippets.prototype.pop_fixed = function (regs) {
                var _this = this;
                var res = "";
                regs.forEach(function (r) {
                    res = res + ("\npop " + _this.rmap_lo[r] + "\npop " + _this.rmap_hi[r]);
                });
                res += "\n    @dummystack -" + regs.length;
                return res;
            };
            AVRSnippets.prototype.proc_setup = function (numlocals, main) {
                var r = main ? "clr r1" : "";
                r += "\n    push r29\n    push r28";
                for (var i = 0; i < numlocals; ++i)
                    r += "\n    push r1\n    push r1";
                // setup frame pointer        
                r += "\n    @dummystack " + (numlocals + 1) + "\n    in r28, 0x3d\n    in r29, 0x3e\n    subi r28, #5\n    sbci r29, #0";
                return r;
            };
            AVRSnippets.prototype.proc_return = function () {
                // pop frame pointer and return
                return "\n    pop r28\n    pop r29\n    @dummystack -1\n    ret";
            };
            AVRSnippets.prototype.debugger_hook = function (lbl) { return "eor r1, r1"; };
            AVRSnippets.prototype.debugger_bkpt = function (lbl) { return "eor r1, r1"; };
            AVRSnippets.prototype.breakpoint = function () { return "eor r1, r1"; };
            AVRSnippets.prototype.push_local = function (reg) {
                return "\n    push " + this.rmap_hi[reg] + "\n    push " + this.rmap_lo[reg] + "\n    @dummystack 1";
            };
            AVRSnippets.prototype.push_locals = function (n) {
                return "no stack alignment on AVR";
            };
            AVRSnippets.prototype.pop_locals = function (n) {
                if (n * 2 <= 5) {
                    return pxtc.Util.range(n * 2).map(function (k) { return "pop r0"; }).join("\n    ") + ("\n    @dummystack -" + n);
                }
                var n0 = n;
                var r = "\n    in\tr30, 0x3d\n    in\tr31, 0x3e\n";
                while (n > 0) {
                    // adiw maxes out at #63
                    var k = Math.min(n, 31);
                    r += "    adiw\tr30, #2*" + k + "\n";
                    n -= k;
                }
                r += "\n    out\t0x3d, r30\n    out\t0x3e, r31\n    @dummystack -" + n0;
                return r;
            };
            AVRSnippets.prototype.unconditional_branch = function (lbl) { return "jmp " + lbl; };
            AVRSnippets.prototype.beq = function (lbl) { return "breq " + lbl; };
            AVRSnippets.prototype.bne = function (lbl) { return "brne " + lbl; };
            AVRSnippets.prototype.cmp = function (reg1, reg2) {
                var reg1_lo = this.rmap_lo[reg1];
                var reg1_hi = this.rmap_hi[reg1];
                var reg2_lo = this.rmap_lo[reg2];
                var reg2_hi = this.rmap_hi[reg2];
                return "\n    cp " + reg1_lo + ", " + reg2_lo + "\n    cpc " + reg1_hi + ", " + reg2_hi;
            };
            AVRSnippets.prototype.cmp_zero = function (reg) {
                return "\n    cp " + this.rmap_lo[reg] + ", r1\n    cpc " + this.rmap_hi[reg] + ", r1";
            };
            // load_reg_src_off is load/store indirect
            // word? - does offset represent an index that must be multiplied by word size?
            // inf?  - control over size of referenced data
            // str?  - true=Store/false=Load
            AVRSnippets.prototype.load_reg_src_off = function (reg, src, off, word, store, inf) {
                var tgt_reg = "";
                var prelude = "";
                var _this = this;
                function maybe_spill_it(new_off) {
                    pxtc.assert(!isNaN(new_off));
                    if (0 <= new_off && new_off <= 62) {
                        off = new_off.toString();
                    }
                    else {
                        if (tgt_reg == "Y") {
                            prelude += "\n    movw r30, r28\n";
                        }
                        prelude += "\n    ; += " + new_off;
                        // we don't have a scratch register to store the constant...
                        while (new_off > 0) {
                            var k = Math.min(new_off, 63);
                            prelude += "\n    adiw r30, #" + k;
                            new_off -= k;
                        }
                        off = "0";
                        tgt_reg = "Z";
                    }
                }
                var mm = /^(\d+):(\d+)/.exec(off);
                if (mm) {
                    var ridx = parseInt(mm[1]);
                    var height = parseInt(mm[2]);
                    var idx = height - ridx;
                    if (idx <= 3) {
                        off = "locals@-" + idx;
                        word = false;
                    }
                }
                // different possibilities for src: r0, r5, sp, r6
                // any indirection we want to do using Y+C, Z+C (recall Y=FP)
                if (src != "sp") {
                    prelude = "\n    movw r30, " + this.rmap_lo[src];
                    tgt_reg = "Z";
                }
                else {
                    tgt_reg = "Y"; // Y -> FP = r29
                }
                // different possibilities for off
                if (word || off[0] == "#") {
                    var new_off = 0;
                    if (word) {
                        // word true implies off is an integer
                        new_off = 2 * parseInt(off);
                    }
                    else {
                        // word false means we have #integer
                        new_off = parseInt(off.slice(1));
                    }
                    pxtc.assert(!isNaN(new_off), "off=" + off + "/" + word);
                    if (src == "sp") {
                        new_off += 1; // SP points 1 word ahead
                        prelude += "\n    in  r30, 0x3d\n    in  r31, 0x3e";
                        tgt_reg = "Z";
                    }
                    maybe_spill_it(new_off);
                }
                else if (off[0] == "r") {
                    if (tgt_reg == "Y") {
                        prelude += "\n    movw r30, r28";
                    }
                    prelude += "\n    add r30, " + this.rmap_lo[off] + "\n    adc r31, " + this.rmap_hi[off];
                    off = "0";
                }
                else {
                    pxtc.assert(tgt_reg == "Y");
                    var new_off = -100000;
                    var m = /^args@(\d+):(\d+)$/.exec(off);
                    if (m) {
                        var argIdx = parseInt(m[1]);
                        var baseStack = parseInt(m[2]) + 1; // we have one more word on top of what ARM has
                        new_off = 2 * (argIdx + baseStack);
                    }
                    m = /^locals@([\-\d]+)$/.exec(off);
                    if (m) {
                        var localIdx = parseInt(m[1]);
                        new_off = 2 * localIdx;
                    }
                    prelude += "\n; " + off;
                    new_off += 6; // FP points 3 words ahead of locals
                    pxtc.assert(new_off >= 0);
                    maybe_spill_it(new_off);
                }
                if (inf && inf.size == 1) {
                    if (store) {
                        return "\n    " + prelude + "\n    std " + tgt_reg + ", " + off + ", " + this.rmap_lo[reg];
                    }
                    else {
                        if (inf.needsSignExt)
                            return "\n    " + prelude + "\n    ldd " + this.rmap_lo[reg] + ", " + tgt_reg + ", " + off + "\n    clr " + this.rmap_hi[reg] + "\n    sbrc " + this.rmap_lo[reg] + ", 7\n    com " + this.rmap_hi[reg];
                        else
                            return "\n    " + prelude + "\n    ldd " + this.rmap_lo[reg] + ", " + tgt_reg + ", " + off + "\n    clr " + this.rmap_hi[reg] + "\n    ";
                    }
                }
                if (store) {
                    return "\n    " + prelude + "\n    std " + tgt_reg + ", " + off + ", " + this.rmap_lo[reg] + "\n    std " + tgt_reg + ", " + off + "+1, " + this.rmap_hi[reg];
                }
                else {
                    return "\n    " + prelude + "\n    ldd " + this.rmap_lo[reg] + ", " + tgt_reg + ", " + off + "\n    ldd " + this.rmap_hi[reg] + ", " + tgt_reg + ", " + off + "+1";
                }
            };
            AVRSnippets.prototype.rt_call = function (name, r0, r1) {
                pxtc.assert(r0 == "r0" && r1 == "r1");
                if (this.inst_lo[name] == "Number_::") {
                    return this.call_lbl("Number_::" + name);
                }
                else {
                    return "\n    " + this.inst_lo[name] + " r24, r22\n    " + this.inst_hi[name] + " r25, r23";
                }
            };
            AVRSnippets.prototype.call_lbl = function (lbl) { return "call " + lbl; };
            AVRSnippets.prototype.call_reg = function (reg) {
                return "\n    movw r30, " + this.rmap_lo[reg] + "\n    icall";
            };
            // no virtuals for now
            AVRSnippets.prototype.vcall = function (mapMethod, isSet, vtableShift) { pxtc.assert(false); return ""; };
            AVRSnippets.prototype.prologue_vtable = function (arg_index, vtableShift) { pxtc.assert(false); return ""; };
            AVRSnippets.prototype.method_call = function (procid, topExpr) {
                var res = this.load_reg_src_off("r0", "sp", "#" + 2 * (topExpr.args.length - 1)) + "\n";
                var isIface = false;
                var methodIdx = 0;
                if (procid.mapMethod) {
                    var isSet = /Set/.test(procid.mapMethod);
                    isIface = true;
                    methodIdx = isSet ? procid.ifaceIndex : procid.mapIdx;
                }
                else {
                    methodIdx = procid.virtualIndex + 2;
                    if (procid.ifaceIndex != null) {
                        isIface = true;
                        methodIdx = procid.ifaceIndex;
                    }
                }
                res += this.emit_int(methodIdx, "r1") + "\n";
                res += this.call_lbl("pxtrt::fetchMethod" + (isIface ? "Iface" : "")) + "\n";
                res += this.call_reg("r0") + "\n";
                return res;
            };
            AVRSnippets.prototype.helper_prologue = function () {
                return "\n    @stackmark args\n    movw r4, r24"; // store captured vars pointer
            };
            AVRSnippets.prototype.helper_epilogue = function () {
                return "\n    call pxtrt::getGlobalsPtr\n    movw r2, r24\n    ret\n    @stackempty args";
            };
            AVRSnippets.prototype.load_ptr = function (lbl, reg) {
                pxtc.assert(!!lbl);
                return "\n    ldi " + this.rmap_lo[reg] + ", " + lbl + "@lo\n    ldi " + this.rmap_hi[reg] + ", " + lbl + "@hi";
            };
            AVRSnippets.prototype.emit_int = function (v, reg) {
                return this.reg_gets_imm(reg, v);
            };
            AVRSnippets.prototype.string_literal = function (lbl, s) {
                return "\n.balign 2\n" + lbl + "meta: .short " + s.length + "\n" + lbl + ": .string " + pxtc.asmStringLiteral(s) + "\n";
            };
            AVRSnippets.prototype.hex_literal = function (lbl, data) {
                return "\n.balign 2\n" + lbl + ": .short " + (data.length >> 1) + "\n        .hex " + data + (data.length % 4 == 0 ? "" : "00") + "\n";
            };
            return AVRSnippets;
        }(pxtc.AssemblerSnippets));
        pxtc.AVRSnippets = AVRSnippets;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        // TODO consider that taggedInts is going to be false!
        var csOpMap = {
            "numops::toBoolDecr": "numops::toBool",
            "pxtrt::ldfldRef": "pxtrt::ldfld",
            "pxtrt::stfldRef": "pxtrt::stfld",
            "pxtrt::ldlocRef": "pxtrt::ldloc",
            "pxtrt::stlocRef": "pxtrt::stloc",
            "pxtrt::mklocRef": "pxtrt::mkloc",
            "pxtrt::mapSetRef": "pxtrt::mapSet",
            "pxtrt::mapGetRef": "pxtrt::mapGet",
        };
        function shimToCs(shimName) {
            shimName = shimName.replace(/::/g, ".");
            //if (shimName.slice(0, 4) == "pxt.")
            //    shimName = "pxtcore." + shimName.slice(4)
            return "PXT." + shimName;
        }
        function qs(s) {
            return JSON.stringify(s);
        }
        function vtableToCS(info) {
            var s = ("static readonly VTable " + info.id + "_VT = new VTable(" + qs(pxtc.getName(info.decl)) + ", ") +
                ("  " + info.refmask.length + ", new FnPtr[] {\n");
            for (var _i = 0, _a = info.vtable; _i < _a.length; _i++) {
                var m = _a[_i];
                s += "    " + m.label() + ",\n";
            }
            s += "  },\n";
            s += "  new FnPtr[] {\n";
            var i = 0;
            for (var _b = 0, _c = info.itable; _b < _c.length; _b++) {
                var m = _c[_b];
                s += "    " + (m ? m.label() : "null") + ",  // " + (info.itableInfo[i] || ".") + "\n";
                i++;
            }
            s += "});\n";
            return s;
        }
        function csEmit(bin, opts) {
            var jssource = opts.hexinfo.hex[0];
            jssource += "\n// User code starts\n\n#pragma warning disable CS0164, CS1998, CS0219, CS0414, CS0162\n\nnamespace PXT {\npublic static class UserCode {\n";
            bin.globals.forEach(function (g) {
                jssource += "static object " + ("g_" + g.uniqueName()) + ";\n";
            });
            bin.procs.forEach(function (p) {
                jssource += "\n" + irToCS(bin, p) + "\n";
            });
            bin.usedClassInfos.forEach(function (info) {
                jssource += vtableToCS(info);
            });
            //if (bin.res.breakpoints)
            //    jssource += `\nsetupDebugger(${bin.res.breakpoints.length})\n`
            pxtc.U.iterMap(bin.hexlits, function (k, v) {
                jssource += "static readonly Buffer " + v + " = PXT.BufferMethods.createBufferFromHex(\"" + k + "\");\n";
            });
            jssource += "\n} } // end UserCode\n";
            bin.writeFile(pxtc.BINARY_CS, jssource);
        }
        pxtc.csEmit = csEmit;
        function irToCS(bin, proc) {
            var resText = "";
            var writeRaw = function (s) { resText += s + "\n"; };
            var write = function (s) { resText += "    " + s + "\n"; };
            var EK = pxtc.ir.EK;
            var maxStack = 0;
            var ctxTp = proc.label() + "_CTX";
            //console.log(proc.toString())
            proc.resolve();
            //console.log("OPT", proc.toString())
            if (bin.procs[0] == proc) {
                writeRaw("\n\npublic static void Main() { " + proc.label() + "(new CTX(0), null).GetAwaiter().GetResult(); }\n");
            }
            var storeArgs = proc.args.map(function (l, i) {
                return ("    " + locref(l) + " = " + i + " >= args.Length ? TValue.Undefined : args[" + i + "];\n");
            })
                .join("");
            writeRaw("\nstatic Action<Task, object> " + proc.label() + "_delegate;\nstatic Task " + proc.label() + "(CTX parent, object[] args) {\n    var s = new " + ctxTp + "(parent);\n    if (" + proc.label() + "_delegate == null) {\n        " + proc.label() + "_delegate = " + proc.label() + "_task;\n    }\n" + storeArgs + "\n    " + proc.label() + "_task(null, s);\n    return s.completion.Task;\n}\n\nstatic void " + proc.label() + "_task(Task prevTask, object s_) {\n    var s = (" + ctxTp + ")s_;\n    var r0 = TValue.Undefined;\n    var step = s.pc;\n    s.pc = -1;\n\n    while (true) {\n    switch (step) {\n    case 0:\n");
            var exprStack = [];
            var currCallArgsIdx = 0;
            var maxCallArgsIdx = -1;
            var lblIdx = 0;
            var asyncContinuations = [];
            for (var _i = 0, _a = proc.body; _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.stmtKind == pxtc.ir.SK.Label)
                    s.lblId = ++lblIdx;
            }
            for (var _b = 0, _c = proc.body; _b < _c.length; _b++) {
                var s = _c[_b];
                switch (s.stmtKind) {
                    case pxtc.ir.SK.Expr:
                        emitExpr(s.expr);
                        break;
                    case pxtc.ir.SK.StackEmpty:
                        for (var _d = 0, exprStack_1 = exprStack; _d < exprStack_1.length; _d++) {
                            var e = exprStack_1[_d];
                            if (e.totalUses !== e.currUses)
                                pxtc.oops();
                        }
                        exprStack = [];
                        break;
                    case pxtc.ir.SK.Jmp:
                        emitJmp(s);
                        break;
                    case pxtc.ir.SK.Label:
                        write("goto case " + s.lblId + ";");
                        writeRaw("case " + s.lblId + ":");
                        break;
                    case pxtc.ir.SK.Breakpoint:
                        emitBreakpoint(s);
                        break;
                    default: pxtc.oops();
                }
            }
            write("s.Leave(r0);");
            write("return;");
            writeRaw("  default: PXT.Util.check(false, \"invalid pc: \" + step); return;\n} } }");
            var info = pxtc.nodeLocationInfo(proc.action);
            info.functionName = proc.getName();
            writeRaw("// " + proc.label() + ".info = " + JSON.stringify(info));
            writeRaw("\nclass " + ctxTp + " : CTX {\n    public " + ctxTp + "(CTX parent) : base(parent) {}");
            for (var _e = 0, _f = proc.locals.concat(proc.args); _e < _f.length; _e++) {
                var o = _f[_e];
                write("public object " + o.uniqueName() + ";");
            }
            for (var i = 0; i < maxStack; ++i)
                write("public object tmp_" + i + ";");
            for (var i = 0; i < maxCallArgsIdx; ++i)
                write("public object[] callArgs_" + i + ";");
            writeRaw("}\n");
            return resText;
            function emitBreakpoint(s) {
                var id = s.breakpointInfo.id;
                var lbl;
                write("s.lastBrkId = " + id + ";");
                if (bin.options.trace) {
                    lbl = ++lblIdx;
                    write("s.Trace(" + id + ", " + lbl + ", " + proc.label() + "_info);");
                }
                else {
                    if (!bin.options.breakpoints)
                        return;
                    lbl = ++lblIdx;
                    var brkCall = "s.Breakpoint(" + lbl + ", " + id + ", r0);";
                    if (s.breakpointInfo.isDebuggerStmt)
                        write(brkCall);
                    else
                        write("if ((breakAlways && s.IsBreakFrame()) || breakpoints[" + id + "]) " + brkCall);
                }
                writeRaw("case " + lbl + ": // BRK");
            }
            function locref(cell) {
                if (cell.isGlobal())
                    return "g_" + cell.uniqueName();
                else if (cell.iscap)
                    return "s.mycaps[" + cell.index + "]";
                return "s." + cell.uniqueName();
            }
            function emitJmp(jmp) {
                var trg = "goto case " + jmp.lbl.lblId + ";";
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write(trg);
                }
                else if (jmp.jmpMode == pxtc.ir.JmpMode.IfJmpValEq) {
                    write("if (r0.Eq(" + emitExprInto(jmp.expr) + ")) " + trg);
                }
                else {
                    emitExpr(jmp.expr);
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        write("if (numops.toBool(r0)) " + trg);
                    }
                    else {
                        write("if (!numops.toBool(r0)) " + trg);
                    }
                }
            }
            function withRef(name, isRef) {
                return name + (isRef ? "Ref" : "");
            }
            function emitExprInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        if (e.data === true)
                            return "TValue.True";
                        else if (e.data === false)
                            return "TValue.False";
                        else if (e.data === null)
                            return "TValue.Null";
                        else if (e.data === undefined)
                            return "TValue.Undefined";
                        else if (typeof e.data == "number")
                            return "(double)(" + e.data + ")";
                        else
                            throw pxtc.oops("invalid data: " + typeof e.data);
                    case EK.PointerLiteral:
                        return e.jsInfo;
                    case EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = exprStack.indexOf(arg);
                        pxtc.U.assert(idx >= 0);
                        return "s.tmp_" + idx;
                    case EK.CellRef:
                        var cell = e.data;
                        return locref(cell);
                    default: throw pxtc.oops();
                }
            }
            // result in R0
            function emitExpr(e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                switch (e.exprKind) {
                    case EK.JmpValue:
                        write("// jmp value (already in r0)");
                        break;
                    case EK.Nop:
                        write("// nop");
                        break;
                    case EK.Incr:
                    case EK.Decr:
                        emitExpr(e.args[0]);
                        break;
                    case EK.FieldAccess:
                        var info_1 = e.data;
                        if (info_1.shimName) {
                            emitExpr(e.args[0]);
                            write("r0 = r0" + info_1.shimName + ";");
                            return;
                        }
                        // it does the decr itself, no mask
                        return emitExpr(pxtc.ir.rtcall(withRef("pxtrt::ldfld", info_1.isRef), [e.args[0], pxtc.ir.numlit(info_1.idx)]));
                    case EK.Store:
                        return emitStore(e.args[0], e.args[1]);
                    case EK.RuntimeCall:
                        return emitRtCall(e);
                    case EK.ProcCall:
                        return emitProcCall(e);
                    case EK.SharedDef:
                        return emitSharedDef(e);
                    case EK.Sequence:
                        return e.args.forEach(emitExpr);
                    default:
                        write("r0 = " + emitExprInto(e) + ";");
                }
            }
            function emitSharedDef(e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                if (arg.totalUses == 1)
                    return emitExpr(arg);
                else {
                    emitExpr(arg);
                    var idx = exprStack.length;
                    exprStack.push(arg);
                    maxStack = Math.max(maxStack, exprStack.length);
                    write("s.tmp_" + idx + " = r0;");
                }
            }
            function emitRtCall(topExpr) {
                var info = pxtc.ir.flattenArgs(topExpr);
                info.precomp.forEach(emitExpr);
                var name = topExpr.data;
                name = pxtc.U.lookup(csOpMap, name) || name;
                var args = info.flattened.map(emitExprInto);
                if (name == "langsupp::ignore")
                    return;
                var isAsync = topExpr.callingConvention != pxtc.ir.CallingConvention.Plain;
                var inf = pxtc.hex.lookupFunc(name);
                var fmt = inf ? inf.argsFmt : "";
                if (!inf)
                    pxt.log("warning, missing //%: " + name);
                var retTp = "object";
                var addCTX = false;
                if (fmt) {
                    var fmts_1 = fmt.split(';').filter(function (s) { return !!s; });
                    if (fmts_1[0] == "async") {
                        isAsync = true;
                        fmts_1.shift();
                    }
                    retTp = fmts_1.shift();
                    if (fmts_1[0] == "CTX") {
                        addCTX = true;
                        fmts_1.shift();
                    }
                    args = args.map(function (a, i) {
                        var f = fmts_1[i];
                        if (f[0] == '#') {
                            f = f.slice(1);
                            var d = info.flattened[i].data;
                            if (info.flattened[i].exprKind == EK.NumberLiteral &&
                                typeof d == "number") {
                                if (f == "double" || f == "float")
                                    return d.toString();
                                if ((d | 0) == d) {
                                    if (f == "int" || (f == "uint" && d >= 0))
                                        return d.toString();
                                }
                            }
                            a = "numops.toDouble(" + a + ")";
                        }
                        if (f != "object") {
                            a = "((" + f + ")(" + a + "))";
                        }
                        return a;
                    });
                }
                if (addCTX)
                    args.unshift("s");
                //pxt.debug("name: " + name + " fmt: " + fmt)
                var text = "";
                if (name[0] == ".")
                    text = "" + args[0] + name + "(" + args.slice(1).join(", ") + ")";
                else if (pxtc.U.startsWith(name, "new "))
                    text = "new " + shimToCs(name.slice(4)) + "(" + args.join(", ") + ")";
                else
                    text = shimToCs(name) + "(" + args.join(", ") + ")";
                if (isAsync) {
                    var loc = ++lblIdx;
                    asyncContinuations.push(loc);
                    write("s.pc = " + loc + ";");
                    write(text + ".ContinueWith(" + proc.label() + "_delegate, (object)s);");
                    write("return;");
                    writeRaw("  case " + loc + ":\n");
                    if (retTp == "void")
                        text = "/* void */";
                    else
                        text = "((Task<" + retTp + ">)prevTask).Result";
                }
                if (retTp[0] == '#')
                    text = "(double)(" + text + ")";
                if (retTp == "void")
                    write(text + ";");
                else
                    write("r0 = " + text + ";");
            }
            function emitProcCall(topExpr) {
                var calledProcId = topExpr.data;
                var calledProc = calledProcId.proc;
                var lblId = ++lblIdx;
                var argsArray = "s.callArgs_" + currCallArgsIdx;
                write(argsArray + " = new object[" + topExpr.args.length + "];");
                if (++currCallArgsIdx > maxCallArgsIdx)
                    maxCallArgsIdx = currCallArgsIdx;
                //console.log("PROCCALL", topExpr.toString())
                topExpr.args.forEach(function (a, i) {
                    emitExpr(a);
                    write(argsArray + "[" + i + "] = r0;");
                });
                write("s.pc = " + lblId + ";");
                var callIt = "(s, " + argsArray + ").ContinueWith(" + proc.label() + "_delegate, s)";
                if (calledProcId.ifaceIndex != null) {
                    if (calledProcId.mapMethod) {
                        write("if (" + argsArray + "[0] is PXT.RefMap) {");
                        var args = topExpr.args.map(function (a, i) { return (argsArray + "[" + i + "]"); });
                        args[0] = "(PXT.RefMap)" + args[0];
                        args.splice(1, 0, calledProcId.mapIdx.toString());
                        write("  s.retval = " + shimToCs(calledProcId.mapMethod).replace("Ref", "") + "(" + args.join(", ") + ");");
                        write("  goto case " + lblId + ";");
                        write("} else {");
                    }
                    write("PXT.pxtrt.getVT(" + argsArray + "[0]).iface[" + calledProcId.ifaceIndex + "]" + callIt + ";");
                    if (calledProcId.mapMethod) {
                        write("}");
                    }
                }
                else if (calledProcId.virtualIndex != null) {
                    pxtc.assert(calledProcId.virtualIndex >= 0);
                    write("PXT.pxtrt.getVT(" + argsArray + "[0]).methods[" + calledProcId.virtualIndex + "]" + callIt + ";");
                }
                else {
                    write("" + calledProc.label() + callIt + ";");
                }
                write("return;");
                writeRaw("  case " + lblId + ":");
                write("r0 = s.retval;");
                currCallArgsIdx--;
            }
            function bitSizeConverter(b) {
                switch (b) {
                    case 0 /* None */: return "";
                    case 1 /* Int8 */: return "PXT.pxtrt.toInt8";
                    case 3 /* Int16 */: return "PXT.pxtrt.toInt16";
                    case 5 /* Int32 */: return "PXT.pxtrt.toInt32";
                    case 2 /* UInt8 */: return "PXT.pxtrt.toUInt8";
                    case 4 /* UInt16 */: return "PXT.pxtrt.toUInt16";
                    case 6 /* UInt32 */: return "PXT.pxtrt.toUInt32";
                    default: throw pxtc.oops();
                }
            }
            function emitStore(trg, src) {
                switch (trg.exprKind) {
                    case EK.CellRef:
                        var cell = trg.data;
                        emitExpr(src);
                        var conv = bitSizeConverter(cell.bitSize);
                        if (conv)
                            write(locref(cell) + " = " + conv + "(PXT.numops.toDouble(r0));");
                        else
                            write(locref(cell) + " = r0;");
                        break;
                    case EK.FieldAccess:
                        var info_2 = trg.data;
                        // it does the decr itself, no mask
                        emitExpr(pxtc.ir.rtcall(withRef("pxtrt::stfld", info_2.isRef), [trg.args[0], pxtc.ir.numlit(info_2.idx), src]));
                        break;
                    default: pxtc.oops();
                }
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var jsOpMap = {
            "numops::adds": "+",
            "numops::subs": "-",
            "numops::div": "/",
            "numops::mod": "%",
            "numops::muls": "*",
            "numops::ands": "&",
            "numops::orrs": "|",
            "numops::eors": "^",
            "numops::lsls": "<<",
            "numops::asrs": ">>",
            "numops::lsrs": ">>>",
            "numops::le": "<=",
            "numops::lt": "<",
            "numops::lt_bool": "<",
            "numops::ge": ">=",
            "numops::gt": ">",
            "numops::eq": "==",
            "pxt::eq_bool": "==",
            "pxt::eqq_bool": "===",
            "numops::eqq": "===",
            "numops::neqq": "!==",
            "numops::neq": "!=",
            "langsupp::ptreq": "==",
            "langsupp::ptreqq": "===",
            "langsupp::ptrneqq": "!==",
            "langsupp::ptrneq": "!=",
        };
        function isBuiltinSimOp(name) {
            return !!pxtc.U.lookup(jsOpMap, name.replace(/\./g, "::"));
        }
        pxtc.isBuiltinSimOp = isBuiltinSimOp;
        function shimToJs(shimName) {
            shimName = shimName.replace(/::/g, ".");
            if (shimName.slice(0, 4) == "pxt.")
                shimName = "pxtcore." + shimName.slice(4);
            if (pxtc.target.shortPointers)
                shimName = shimName.replace(/^thumb\./, "avr.");
            return "pxsim." + shimName;
        }
        pxtc.shimToJs = shimToJs;
        function vtableToJs(info) {
            var s = ("var " + info.id + "_VT = {\n") +
                ("  name: " + JSON.stringify(pxtc.getName(info.decl)) + ",\n") +
                ("  refmask: " + JSON.stringify(info.refmask) + ",\n") +
                "  methods: [\n";
            for (var _i = 0, _a = info.vtable; _i < _a.length; _i++) {
                var m = _a[_i];
                s += "    " + m.label() + ",\n";
            }
            s += "  ],\n";
            s += "  iface: [\n";
            var i = 0;
            for (var _b = 0, _c = info.itable; _b < _c.length; _b++) {
                var m = _c[_b];
                s += "    " + (m ? m.label() : "null") + ",  // " + (info.itableInfo[i] || ".") + "\n";
                i++;
            }
            s += "  ],\n";
            s += "};\n";
            return s;
        }
        function jsEmit(bin) {
            var jssource = "";
            if (!bin.target.jsRefCounting)
                jssource += "pxsim.noRefCounting();\n";
            if (bin.target.floatingPoint)
                jssource += "pxsim.enableFloatingPoint();\n";
            var cfg = {};
            var cfgKey = {};
            for (var _i = 0, _a = bin.res.configData || []; _i < _a.length; _i++) {
                var ce = _a[_i];
                cfg[ce.key + ""] = ce.value;
                cfgKey[ce.name] = ce.key;
            }
            jssource += "pxsim.setConfigData(" +
                JSON.stringify(cfg, null, 1) + ", " +
                JSON.stringify(cfgKey, null, 1) + ");\n";
            bin.procs.forEach(function (p) {
                jssource += "\n" + irToJS(bin, p) + "\n";
            });
            bin.usedClassInfos.forEach(function (info) {
                jssource += vtableToJs(info);
            });
            if (bin.res.breakpoints)
                jssource += "\nsetupDebugger(" + bin.res.breakpoints.length + ")\n";
            pxtc.U.iterMap(bin.hexlits, function (k, v) {
                jssource += "var " + v + " = pxsim.BufferMethods.createBufferFromHex(\"" + k + "\")\n";
            });
            bin.writeFile(pxtc.BINARY_JS, jssource);
        }
        pxtc.jsEmit = jsEmit;
        function irToJS(bin, proc) {
            var resText = "";
            var writeRaw = function (s) { resText += s + "\n"; };
            var write = function (s) { resText += "    " + s + "\n"; };
            var EK = pxtc.ir.EK;
            var refCounting = !!bin.target.jsRefCounting;
            writeRaw("\nvar " + proc.label() + " " + (bin.procs[0] == proc ? "= entryPoint" : "") + " = function (s) {\nvar r0 = s.r0, step = s.pc;\ns.pc = -1;\nwhile (true) {\nif (yieldSteps-- < 0 && maybeYield(s, step, r0)) return null;\nswitch (step) {\n  case 0:\n");
            //console.log(proc.toString())
            proc.resolve();
            //console.log("OPT", proc.toString())
            proc.locals.forEach(function (l) {
                write(locref(l) + " = " + (pxtc.target.floatingPoint ? "undefined" : "0") + ";");
            });
            if (proc.args.length) {
                write("if (s.lambdaArgs) {");
                proc.args.forEach(function (l, i) {
                    write("  " + locref(l) + " = " + (l.isRef() ? "pxtrt.incr" : "") + "(s.lambdaArgs[" + i + "]);");
                });
                write("  s.lambdaArgs = null;");
                write("}");
            }
            var exprStack = [];
            var lblIdx = 0;
            var asyncContinuations = [];
            for (var _i = 0, _a = proc.body; _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.stmtKind == pxtc.ir.SK.Label)
                    s.lblId = ++lblIdx;
            }
            for (var _b = 0, _c = proc.body; _b < _c.length; _b++) {
                var s = _c[_b];
                switch (s.stmtKind) {
                    case pxtc.ir.SK.Expr:
                        emitExpr(s.expr);
                        break;
                    case pxtc.ir.SK.StackEmpty:
                        for (var _d = 0, exprStack_2 = exprStack; _d < exprStack_2.length; _d++) {
                            var e = exprStack_2[_d];
                            if (e.totalUses !== e.currUses)
                                pxtc.oops();
                        }
                        exprStack = [];
                        break;
                    case pxtc.ir.SK.Jmp:
                        emitJmp(s);
                        break;
                    case pxtc.ir.SK.Label:
                        writeRaw("  case " + s.lblId + ":");
                        break;
                    case pxtc.ir.SK.Breakpoint:
                        emitBreakpoint(s);
                        break;
                    default: pxtc.oops();
                }
            }
            write("return leave(s, r0)");
            writeRaw("  default: oops()");
            writeRaw("} } }");
            var info = pxtc.nodeLocationInfo(proc.action);
            info.functionName = proc.getName();
            writeRaw(proc.label() + ".info = " + JSON.stringify(info));
            if (proc.isRoot)
                writeRaw(proc.label() + ".continuations = [ " + asyncContinuations.join(",") + " ]");
            return resText;
            function emitBreakpoint(s) {
                var id = s.breakpointInfo.id;
                var lbl;
                write("s.lastBrkId = " + id + ";");
                if (bin.options.trace) {
                    lbl = ++lblIdx;
                    write("return trace(" + id + ", s, " + lbl + ", " + proc.label() + ".info);");
                }
                else {
                    if (!bin.options.breakpoints)
                        return;
                    lbl = ++lblIdx;
                    var brkCall = "return breakpoint(s, " + lbl + ", " + id + ", r0);";
                    if (s.breakpointInfo.isDebuggerStmt)
                        write(brkCall);
                    else
                        write("if ((breakAlways && isBreakFrame(s)) || breakpoints[" + id + "]) " + brkCall);
                }
                writeRaw("  case " + lbl + ":");
            }
            function locref(cell) {
                if (cell.isGlobal())
                    return "globals." + cell.uniqueName();
                else if (cell.iscap)
                    return "s.caps[" + cell.index + "]";
                return "s." + cell.uniqueName();
            }
            function emitJmp(jmp) {
                var trg = "{ step = " + jmp.lbl.lblId + "; continue; }";
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write(trg);
                }
                else if (jmp.jmpMode == pxtc.ir.JmpMode.IfJmpValEq) {
                    write("if (r0 == (" + emitExprInto(jmp.expr) + ")) " + trg);
                }
                else {
                    emitExpr(jmp.expr);
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        write("if (r0) " + trg);
                    }
                    else {
                        write("if (!r0) " + trg);
                    }
                }
            }
            function withRef(name, isRef) {
                return name + (isRef ? "Ref" : "");
            }
            function emitExprInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        if (e.data === true)
                            return "true";
                        else if (e.data === false)
                            return "false";
                        else if (e.data === null)
                            return "null";
                        else if (e.data === undefined)
                            return "undefined";
                        else if (typeof e.data == "number")
                            return e.data + "";
                        else
                            throw pxtc.oops("invalid data: " + typeof e.data);
                    case EK.PointerLiteral:
                        return e.jsInfo;
                    case EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = exprStack.indexOf(arg);
                        pxtc.U.assert(idx >= 0);
                        return "s.tmp_" + idx;
                    case EK.CellRef:
                        var cell = e.data;
                        return locref(cell);
                    default: throw pxtc.oops();
                }
            }
            // result in R0
            function emitExpr(e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                switch (e.exprKind) {
                    case EK.JmpValue:
                        write("// jmp value (already in r0)");
                        break;
                    case EK.Nop:
                        write("// nop");
                        break;
                    case EK.Incr:
                        emitExpr(e.args[0]);
                        if (refCounting)
                            write("pxtrt.incr(r0);");
                        break;
                    case EK.Decr:
                        emitExpr(e.args[0]);
                        if (refCounting)
                            write("pxtrt.decr(r0);");
                        break;
                    case EK.FieldAccess:
                        var info_3 = e.data;
                        if (info_3.shimName) {
                            pxtc.assert(!refCounting);
                            emitExpr(e.args[0]);
                            write("r0 = r0" + info_3.shimName + ";");
                            return;
                        }
                        // it does the decr itself, no mask
                        return emitExpr(pxtc.ir.rtcall(withRef("pxtrt::ldfld", info_3.isRef), [e.args[0], pxtc.ir.numlit(info_3.idx)]));
                    case EK.Store:
                        return emitStore(e.args[0], e.args[1]);
                    case EK.RuntimeCall:
                        return emitRtCall(e);
                    case EK.ProcCall:
                        return emitProcCall(e);
                    case EK.SharedDef:
                        return emitSharedDef(e);
                    case EK.Sequence:
                        return e.args.forEach(emitExpr);
                    default:
                        write("r0 = " + emitExprInto(e) + ";");
                }
            }
            function emitSharedDef(e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                if (arg.totalUses == 1)
                    return emitExpr(arg);
                else {
                    emitExpr(arg);
                    var idx = exprStack.length;
                    exprStack.push(arg);
                    write("s.tmp_" + idx + " = r0;");
                }
            }
            function emitRtCall(topExpr) {
                var info = pxtc.ir.flattenArgs(topExpr);
                info.precomp.forEach(emitExpr);
                var name = topExpr.data;
                var args = info.flattened.map(emitExprInto);
                var text = "";
                if (name[0] == ".")
                    text = "" + args[0] + name + "(" + args.slice(1).join(", ") + ")";
                else if (pxtc.U.startsWith(name, "new "))
                    text = "new " + shimToJs(name.slice(4)) + "(" + args.join(", ") + ")";
                else if (args.length == 2 && bin.target.floatingPoint && pxtc.U.lookup(jsOpMap, name))
                    text = "(" + args[0] + " " + pxtc.U.lookup(jsOpMap, name) + " " + args[1] + ")";
                else
                    text = shimToJs(name) + "(" + args.join(", ") + ")";
                if (topExpr.callingConvention == pxtc.ir.CallingConvention.Plain) {
                    write("r0 = " + text + ";");
                }
                else {
                    var loc = ++lblIdx;
                    asyncContinuations.push(loc);
                    if (topExpr.callingConvention == pxtc.ir.CallingConvention.Promise) {
                        write("(function(cb) { " + text + ".done(cb) })(buildResume(s, " + loc + "));");
                    }
                    else {
                        write("setupResume(s, " + loc + ");");
                        write(text + ";");
                    }
                    write("checkResumeConsumed();");
                    write("return;");
                    writeRaw("  case " + loc + ":");
                    write("r0 = s.retval;");
                }
            }
            function emitProcCall(topExpr) {
                var frameExpr = pxtc.ir.rtcall("<frame>", []);
                frameExpr.totalUses = 1;
                frameExpr.currUses = 0;
                var frameIdx = exprStack.length;
                exprStack.push(frameExpr);
                var procid = topExpr.data;
                var proc = procid.proc;
                var frameRef = "s.tmp_" + frameIdx;
                var lblId = ++lblIdx;
                write(frameRef + " = { fn: " + (proc ? proc.label() : null) + ", parent: s };");
                //console.log("PROCCALL", topExpr.toString())
                topExpr.args.forEach(function (a, i) {
                    emitExpr(a);
                    write(frameRef + ".arg" + i + " = r0;");
                });
                write("s.pc = " + lblId + ";");
                if (procid.ifaceIndex != null) {
                    if (procid.mapMethod) {
                        write("if (" + frameRef + ".arg0.vtable === 42) {");
                        var args = topExpr.args.map(function (a, i) { return (frameRef + ".arg" + i); });
                        args.splice(1, 0, procid.mapIdx.toString());
                        write("  s.retval = " + shimToJs(procid.mapMethod) + "(" + args.join(", ") + ");");
                        write("  " + frameRef + ".fn = doNothing;");
                        write("} else {");
                    }
                    write("pxsim.check(typeof " + frameRef + ".arg0  != \"number\", \"Can't access property of null/undefined.\")");
                    write(frameRef + ".fn = " + frameRef + ".arg0.vtable.iface[" + procid.ifaceIndex + "];");
                    if (procid.mapMethod) {
                        write("}");
                    }
                }
                else if (procid.virtualIndex != null) {
                    pxtc.assert(procid.virtualIndex >= 0);
                    write("pxsim.check(typeof " + frameRef + ".arg0  != \"number\", \"Can't access property of null/undefined.\")");
                    write(frameRef + ".fn = " + frameRef + ".arg0.vtable.methods[" + procid.virtualIndex + "];");
                }
                write("return actionCall(" + frameRef + ")");
                writeRaw("  case " + lblId + ":");
                write("r0 = s.retval;");
                frameExpr.currUses = 1;
            }
            function bitSizeConverter(b) {
                switch (b) {
                    case 0 /* None */: return "";
                    case 1 /* Int8 */: return "pxsim.pxtrt.toInt8";
                    case 3 /* Int16 */: return "pxsim.pxtrt.toInt16";
                    case 5 /* Int32 */: return "pxsim.pxtrt.toInt32";
                    case 2 /* UInt8 */: return "pxsim.pxtrt.toUInt8";
                    case 4 /* UInt16 */: return "pxsim.pxtrt.toUInt16";
                    case 6 /* UInt32 */: return "pxsim.pxtrt.toUInt32";
                    default: throw pxtc.oops();
                }
            }
            function emitStore(trg, src) {
                switch (trg.exprKind) {
                    case EK.CellRef:
                        var cell = trg.data;
                        emitExpr(src);
                        write(locref(cell) + " = " + bitSizeConverter(cell.bitSize) + "(r0);");
                        break;
                    case EK.FieldAccess:
                        var info_4 = trg.data;
                        // it does the decr itself, no mask
                        emitExpr(pxtc.ir.rtcall(withRef("pxtrt::stfld", info_4.isRef), [trg.args[0], pxtc.ir.numlit(info_4.idx), src]));
                        break;
                    default: pxtc.oops();
                }
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// Make sure backbase.ts is loaded before us, otherwise 'extends AssemblerSnippets' fails at runtime
/// <reference path="backbase.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var inlineArithmetic = {
            "numops::adds": "_numops_adds",
            "numops::subs": "_numops_subs",
            "numops::orrs": "_numops_orrs",
            "numops::ands": "_numops_ands",
            "pxt::toInt": "_numops_toInt",
            "pxt::fromInt": "_numops_fromInt",
        };
        // snippets for ARM Thumb assembly
        var ThumbSnippets = (function (_super) {
            __extends(ThumbSnippets, _super);
            function ThumbSnippets() {
                _super.apply(this, arguments);
            }
            ThumbSnippets.prototype.hasCommonalize = function () { return true; };
            ThumbSnippets.prototype.stackAligned = function () {
                return pxtc.target.stackAlign && pxtc.target.stackAlign > 1;
            };
            ThumbSnippets.prototype.pushLR = function () {
                if (this.stackAligned())
                    return "push {lr, r3}  ; r3 for align";
                else
                    return "push {lr}";
            };
            ThumbSnippets.prototype.popPC = function () {
                if (this.stackAligned())
                    return "pop {pc, r3}  ; r3 for align";
                else
                    return "pop {pc}";
            };
            ThumbSnippets.prototype.nop = function () { return "nop"; };
            ThumbSnippets.prototype.reg_gets_imm = function (reg, imm) {
                return "movs " + reg + ", #" + imm;
            };
            ThumbSnippets.prototype.push_fixed = function (regs) { return "push {" + regs.join(", ") + "}"; };
            ThumbSnippets.prototype.pop_fixed = function (regs) { return "pop {" + regs.join(", ") + "}"; };
            ThumbSnippets.prototype.proc_setup = function (numlocals, main) {
                var r = "push {lr}\n";
                if (numlocals > 0) {
                    r += "    movs r0, #0\n";
                    for (var i = 0; i < numlocals; ++i)
                        r += "    push {r0} ;loc\n";
                }
                return r;
            };
            ThumbSnippets.prototype.proc_return = function () { return "pop {pc}"; };
            ThumbSnippets.prototype.debugger_stmt = function (lbl) {
                return "\n    @stackempty locals\n    ldr r0, [r6, #0] ; debugger\n    subs r0, r0, #4  ; debugger\n" + lbl + ":\n    ldr r0, [r0, #0] ; debugger\n";
            };
            ThumbSnippets.prototype.debugger_bkpt = function (lbl) {
                return "\n    @stackempty locals\n    ldr r0, [r6, #0] ; brk\n" + lbl + ":\n    ldr r0, [r0, #0] ; brk\n";
            };
            ThumbSnippets.prototype.debugger_proc = function (lbl) {
                return "\n    ldr r0, [r6, #0]  ; brk-entry\n    ldr r0, [r0, #4]  ; brk-entry\n" + lbl + ":";
            };
            ThumbSnippets.prototype.push_local = function (reg) { return "push {" + reg + "}"; };
            ThumbSnippets.prototype.push_locals = function (n) { return "sub sp, #4*" + n + " ; push locals " + n + " (align)"; };
            ThumbSnippets.prototype.pop_locals = function (n) { return "add sp, #4*" + n + " ; pop locals " + n; };
            ThumbSnippets.prototype.unconditional_branch = function (lbl) { return "bb " + lbl; };
            ThumbSnippets.prototype.beq = function (lbl) { return "beq " + lbl; };
            ThumbSnippets.prototype.bne = function (lbl) { return "bne " + lbl; };
            ThumbSnippets.prototype.cmp = function (reg1, reg2) { return "cmp " + reg1 + ", " + reg2; };
            ThumbSnippets.prototype.cmp_zero = function (reg1) { return "cmp " + reg1 + ", #0"; };
            ThumbSnippets.prototype.load_reg_src_off = function (reg, src, off, word, store, inf) {
                off = off.replace(/:\d+$/, "");
                if (word) {
                    off = "#4*" + off;
                }
                var str = "str";
                var ldr = "ldr";
                if (inf) {
                    if (inf.immLimit == 32)
                        str = "strb";
                    else if (inf.immLimit == 64)
                        str = "strh";
                    if (inf.needsSignExt)
                        ldr = str.replace("str", "ldrs");
                    else
                        ldr = str.replace("str", "ldr");
                }
                if (store)
                    return str + " " + reg + ", [" + src + ", " + off + "]";
                else
                    return ldr + " " + reg + ", [" + src + ", " + off + "]";
            };
            ThumbSnippets.prototype.rt_call = function (name, r0, r1) {
                return name + " " + r0 + ", " + r1;
            };
            ThumbSnippets.prototype.call_lbl = function (lbl) {
                if (pxtc.target.taggedInts && !pxtc.target.boxDebug) {
                    var o = pxtc.U.lookup(inlineArithmetic, lbl);
                    if (o)
                        lbl = o;
                }
                return "bl " + lbl;
            };
            ThumbSnippets.prototype.call_reg = function (reg) {
                return "blx " + reg;
            };
            // NOTE: 43 (in cmp instruction below) is magic number to distinguish
            // NOTE: Map from RefRecord
            ThumbSnippets.prototype.vcall = function (mapMethod, isSet, vtableShift) {
                return "\n    ldr r0, [sp, #" + (isSet ? 4 : 0) + "] ; ld-this\n    ldrh r3, [r0, #2] ; ld-vtable\n    lsls r3, r3, #" + vtableShift + "\n    ldr r3, [r3, #4] ; iface table\n    cmp r3, #43\n    beq .objlit\n.nonlit:\n    lsls r1, " + (isSet ? "r2" : "r1") + ", #2\n    ldr r0, [r3, r1] ; ld-method\n    bx r0\n.objlit:\n    " + (isSet ? "ldr r2, [sp, #0]" : "") + "\n    " + this.pushLR() + "\n    bl " + mapMethod + "\n    " + this.popPC() + "\n";
            };
            ThumbSnippets.prototype.prologue_vtable = function (arg_top_index, vtableShift) {
                return "\n    ldr r0, [sp, #4*" + arg_top_index + "]  ; ld-this\n    ldrh r0, [r0, #2] ; ld-vtable\n    lsls r0, r0, #" + vtableShift + "\n    ";
            };
            ThumbSnippets.prototype.helper_prologue = function () {
                return "\n    @stackmark args\n    " + this.pushLR() + "\n    mov r5, r0\n";
            };
            ThumbSnippets.prototype.helper_epilogue = function () {
                return "\n    bl pxtrt::getGlobalsPtr\n    mov r6, r0\n    " + this.popPC() + "\n    @stackempty args\n";
            };
            ThumbSnippets.prototype.load_ptr_full = function (lbl, reg) {
                pxtc.assert(!!lbl);
                return "\n    ldlit " + reg + ", " + lbl + "\n";
            };
            ThumbSnippets.prototype.load_ptr = function (lbl, reg) {
                pxtc.assert(!!lbl);
                return "\n    movs " + reg + ", " + lbl + "@hi  ; ldptr\n    lsls " + reg + ", " + reg + ", #8\n    adds " + reg + ", " + lbl + "@lo\n";
            };
            ThumbSnippets.prototype.arithmetic = function () {
                var r = "";
                if (!pxtc.target.taggedInts || pxtc.target.boxDebug) {
                    return r;
                }
                for (var _i = 0, _a = ["adds", "subs", "ands", "orrs", "eors"]; _i < _a.length; _i++) {
                    var op = _a[_i];
                    r +=
                        "\n_numops_" + op + ":\n    @scope _numops_" + op + "\n    lsls r2, r0, #31\n    beq .boxed\n    lsls r2, r1, #31\n    beq .boxed\n";
                    if (op == "adds" || op == "subs")
                        r += "\n    subs r2, r1, #1\n    " + op + " r2, r0, r2\n    bvs .boxed\n    movs r0, r2\n    blx lr\n";
                    else {
                        r += "    " + op + " r0, r1\n";
                        if (op == "eors")
                            r += "    adds r0, r0, #1\n";
                        r += "    blx lr\n";
                    }
                    r += "\n.boxed:\n    " + this.pushLR() + "\n    bl numops::" + op + "\n    " + this.popPC() + "\n";
                }
                r += "\n@scope _numops_toInt\n_numops_toInt:\n    asrs r0, r0, #1\n    bcc .over\n    blx lr\n.over:\n    " + this.pushLR() + "\n    lsls r0, r0, #1\n    bl pxt::toInt\n    " + this.popPC() + "\n\n_numops_fromInt:\n    lsls r2, r0, #1\n    asrs r1, r2, #1\n    cmp r0, r1\n    bne .over2\n    adds r0, r2, #1\n    blx lr\n.over2:\n    " + this.pushLR() + "\n    bl pxt::fromInt\n    " + this.popPC() + "\n";
                return r;
            };
            ThumbSnippets.prototype.emit_int = function (v, reg) {
                var movWritten = false;
                function writeMov(v) {
                    pxtc.assert(0 <= v && v <= 255);
                    var result = "";
                    if (movWritten) {
                        if (v)
                            result = "adds " + reg + ", #" + v + "\n";
                    }
                    else
                        result = "movs " + reg + ", #" + v + "\n";
                    movWritten = true;
                    return result;
                }
                function shift(v) {
                    if (v === void 0) { v = 8; }
                    return "lsls " + reg + ", " + reg + ", #" + v + "\n";
                }
                pxtc.assert(v != null);
                var n = Math.floor(v);
                var isNeg = false;
                if (n < 0) {
                    isNeg = true;
                    n = -n;
                }
                // compute number of lower-order 0s and shift that amount
                var numShift = 0;
                if (n > 0xff) {
                    var shifted = n;
                    while ((shifted & 1) == 0) {
                        shifted >>>= 1;
                        numShift++;
                    }
                    if (pxtc.numBytes(shifted) < pxtc.numBytes(n)) {
                        n = shifted;
                    }
                    else {
                        numShift = 0;
                    }
                }
                var result = "";
                switch (pxtc.numBytes(n)) {
                    case 4:
                        result += writeMov((n >>> 24) & 0xff);
                        result += shift();
                    case 3:
                        result += writeMov((n >>> 16) & 0xff);
                        result += shift();
                    case 2:
                        result += writeMov((n >>> 8) & 0xff);
                        result += shift();
                    case 1:
                        result += writeMov(n & 0xff);
                        break;
                    default:
                        pxtc.oops();
                }
                if (numShift)
                    result += shift(numShift);
                if (isNeg) {
                    result += "negs " + reg + ", " + reg + "\n";
                }
                if (result.split("\n").length > 3 + 1) {
                    // more than 3 instructions? replace with LDR at PC-relative address
                    return "ldlit " + reg + ", " + Math.floor(v) + "\n";
                }
                return result;
            };
            return ThumbSnippets;
        }(pxtc.AssemblerSnippets));
        pxtc.ThumbSnippets = ThumbSnippets;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var vmSpecOpcodes = {
            "Number_::eq": "eq",
            "Number_::adds": "add",
            "Number_::subs": "sub",
        };
        var vmCallMap = {};
        function shimToVM(shimName) {
            return shimName;
        }
        function qs(s) {
            return JSON.stringify(s);
        }
        function vtableToVM(info) {
            return pxtc.vtableToAsm(info);
        }
        function vmEmit(bin, opts) {
            var vmsource = "; VM start\n" + pxtc.hex.hexPrelude() + "        \n    .hex 708E3B92C615A841C49866C975EE5197 ; magic number\n    .hex " + pxtc.hex.hexTemplateHash() + " ; hex template hash\n    .hex 0000000000000000 ; @SRCHASH@\n    .short " + bin.globalsWords + "   ; num. globals\n    .short 0 ; patched with number of words resulting from assembly\n    .word 0 ; reserved\n    .word 0 ; reserved\n    .word 0 ; reserved\n";
            var snip = new pxtc.AVRSnippets();
            bin.procs.forEach(function (p) {
                vmsource += "\n" + irToVM(bin, p) + "\n";
            });
            bin.usedClassInfos.forEach(function (info) {
                vmsource += vtableToVM(info);
            });
            pxtc.U.iterMap(bin.hexlits, function (k, v) {
                vmsource += snip.hex_literal(v, k);
            });
            pxtc.U.iterMap(bin.strings, function (k, v) {
                vmsource += snip.string_literal(v, k);
            });
            vmsource += "\n; The end.\n";
            bin.writeFile(pxtc.BINARY_ASM, vmsource);
            var res = pxtc.assemble(opts.target, bin, vmsource);
            if (res.src)
                bin.writeFile(pxtc.BINARY_ASM, res.src);
            /*
            let pc = res.thumbFile.peepCounts
            let keys = Object.keys(pc)
            keys.sort((a, b) => pc[b] - pc[a])
            for (let k of keys.slice(0, 50)) {
                console.log(`${k}  ${pc[k]}`)
            }
            */
            if (res.buf) {
                var newBuf = [];
                for (var i = 0; i < res.buf.length; i += 2)
                    newBuf.push(res.buf[i] | (res.buf[i + 1] << 8));
                var myhex = btoa(pxtc.hex.patchHex(bin, newBuf, false, true)[0]);
                bin.writeFile(pxt.outputName(pxtc.target), myhex);
            }
        }
        pxtc.vmEmit = vmEmit;
        function irToVM(bin, proc) {
            var resText = "";
            var writeRaw = function (s) { resText += s + "\n"; };
            var write = function (s) { resText += "    " + s + "\n"; };
            var EK = pxtc.ir.EK;
            var wordSize = 2;
            var alltmps = [];
            var currTmps = [];
            var final = false;
            var numBrk = 0;
            var numLoc = 0;
            //console.log(proc.toString())
            proc.resolve();
            // console.log("OPT", proc.toString())
            emitAll();
            bin.numStmts = numBrk;
            resText = "";
            for (var _i = 0, alltmps_1 = alltmps; _i < alltmps_1.length; _i++) {
                var t = alltmps_1[_i];
                t.currUses = 0;
            }
            final = true;
            emitAll();
            return resText;
            function emitAll() {
                writeRaw(";\n; Proc: " + proc.getName() + "\n;");
                write(".section code");
                if (bin.procs[0] == proc) {
                    writeRaw("; main");
                }
                writeRaw(proc.label() + ":");
                writeRaw(proc.label() + "_Lit:");
                numLoc = proc.locals.length + currTmps.length;
                if (numLoc == 0)
                    write("locals0");
                else
                    write("locals " + numLoc * wordSize + " ; incl. " + currTmps.length + " tmps");
                for (var _i = 0, _a = proc.body; _i < _a.length; _i++) {
                    var s = _a[_i];
                    switch (s.stmtKind) {
                        case pxtc.ir.SK.Expr:
                            emitExpr(s.expr);
                            break;
                        case pxtc.ir.SK.StackEmpty:
                            clearStack();
                            for (var _b = 0, currTmps_1 = currTmps; _b < currTmps_1.length; _b++) {
                                var e = currTmps_1[_b];
                                if (e) {
                                    pxtc.oops("uses: " + e.currUses + "/" + e.totalUses + " " + e.toString());
                                }
                            }
                            break;
                        case pxtc.ir.SK.Jmp:
                            emitJmp(s);
                            break;
                        case pxtc.ir.SK.Label:
                            writeRaw(s.lblName + ":");
                            break;
                        case pxtc.ir.SK.Breakpoint:
                            numBrk++;
                            break;
                        default: pxtc.oops();
                    }
                }
                var retArg = (numLoc * wordSize) | (proc.args.length << 8);
                write("ret 0x" + retArg.toString(16));
            }
            function emitJmp(jmp) {
                var trg = jmp.lbl.lblName;
                if (jmp.jmpMode == pxtc.ir.JmpMode.Always) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write("jmp " + trg);
                }
                else if (jmp.jmpMode == pxtc.ir.JmpMode.IfLambda) {
                    if (jmp.expr)
                        emitExpr(jmp.expr);
                    write("retlmb " + numLoc * wordSize);
                }
                else if (jmp.jmpMode == pxtc.ir.JmpMode.IfJmpValEq) {
                    write("push");
                    emitExpr(jmp.expr);
                    write("eq");
                    write("jmpnz " + trg);
                }
                else {
                    emitExpr(jmp.expr);
                    if (jmp.jmpMode == pxtc.ir.JmpMode.IfNotZero) {
                        write("jmpnz " + trg);
                    }
                    else if (jmp.jmpMode == pxtc.ir.JmpMode.IfZero) {
                        write("jmpz " + trg);
                    }
                    else {
                        pxtc.oops();
                    }
                }
            }
            function withRef(name, isRef) {
                return name + (isRef ? "Ref" : "");
            }
            function cellref(cell) {
                if (cell.isGlobal())
                    return ("glb " + cell.index);
                else if (cell.iscap)
                    return ("cap " + (cell.index * wordSize));
                else if (cell.isarg) {
                    var idx = proc.args.length - cell.index - 1;
                    pxtc.assert(idx >= 0, "arg#" + idx);
                    return ("tmp " + (numLoc + 2 + idx) * wordSize);
                }
                else {
                    var idx = cell.index + currTmps.length;
                    //console.log(proc.locals.length, currTmps.length, cell.index)
                    pxtc.assert(!final || idx < numLoc, "cell#" + idx);
                    pxtc.assert(idx >= 0, "cell#" + idx);
                    return ("tmp " + idx * wordSize);
                }
            }
            function emitExprInto(e) {
                switch (e.exprKind) {
                    case EK.NumberLiteral:
                        if (e.data === 0)
                            write("ldzero");
                        else if (e.data === 1)
                            write("ldone");
                        else
                            write("ldconst " + (e.data & 0xffff));
                        return;
                    case EK.PointerLiteral:
                        write("ldconst " + e.data);
                        return;
                    case EK.SharedRef:
                        var arg = e.args[0];
                        pxtc.U.assert(!!arg.currUses); // not first use
                        pxtc.U.assert(arg.currUses < arg.totalUses);
                        arg.currUses++;
                        var idx = currTmps.indexOf(arg);
                        if (idx < 0) {
                            console.log(currTmps, arg);
                            pxtc.assert(false);
                        }
                        write("ldtmp " + idx * wordSize);
                        clearStack();
                        return;
                    case EK.CellRef:
                        write("ld" + cellref(e.data));
                        var cell = e.data;
                        if (cell.isGlobal()) {
                            if (cell.bitSize == 1 /* Int8 */) {
                                write("sgnext");
                            }
                            else if (cell.bitSize == 2 /* UInt8 */) {
                                write("clrhi");
                            }
                        }
                        return;
                    default: throw pxtc.oops();
                }
            }
            // result in R0
            function emitExpr(e) {
                //console.log(`EMITEXPR ${e.sharingInfo()} E: ${e.toString()}`)
                switch (e.exprKind) {
                    case EK.JmpValue:
                        write("; jmp value (already in r0)");
                        break;
                    case EK.Nop:
                        write("; nop");
                        break;
                    case EK.Incr:
                        emitExpr(e.args[0]);
                        write("incr");
                        break;
                    case EK.Decr:
                        emitExpr(e.args[0]);
                        write("decr");
                        break;
                    case EK.FieldAccess:
                        var info = e.data;
                        // it does the decr itself, no mask
                        return emitExpr(pxtc.ir.rtcall(withRef("pxtrt::ldfld", info.isRef), [e.args[0], pxtc.ir.numlit(info.idx)]));
                    case EK.Store:
                        return emitStore(e.args[0], e.args[1]);
                    case EK.RuntimeCall:
                        return emitRtCall(e);
                    case EK.ProcCall:
                        return emitProcCall(e);
                    case EK.SharedDef:
                        return emitSharedDef(e);
                    case EK.Sequence:
                        return e.args.forEach(emitExpr);
                    default:
                        return emitExprInto(e);
                }
            }
            function emitSharedDef(e) {
                var arg = e.args[0];
                pxtc.U.assert(arg.totalUses >= 1);
                pxtc.U.assert(arg.currUses === 0);
                arg.currUses = 1;
                alltmps.push(arg);
                if (arg.totalUses == 1)
                    return emitExpr(arg);
                else {
                    emitExpr(arg);
                    var idx = -1;
                    for (var i = 0; i < currTmps.length; ++i)
                        if (currTmps[i] == null) {
                            idx = i;
                            break;
                        }
                    if (idx < 0) {
                        if (final) {
                            console.log(arg, currTmps);
                            pxtc.assert(false, "missed tmp");
                        }
                        idx = currTmps.length;
                        currTmps.push(arg);
                    }
                    else {
                        currTmps[idx] = arg;
                    }
                    write("sttmp " + idx * wordSize);
                }
            }
            function emitRtCall(topExpr) {
                var name = topExpr.data;
                var m = /^(.*)\^(\d+)$/.exec(name);
                var mask = 0;
                if (m) {
                    name = m[1];
                    mask = parseInt(m[2]);
                }
                name = pxtc.U.lookup(vmCallMap, name) || name;
                pxtc.assert(mask <= 0xf);
                var info = pxtc.ir.flattenArgs(topExpr);
                pxtc.assert(info.precomp.length == 0);
                //info.precomp.forEach(emitExpr)
                clearStack();
                if (name == "pxt::stringLiteral" &&
                    info.flattened.length == 1 &&
                    info.flattened[0].exprKind == EK.PointerLiteral) {
                    write("stringlit " + info.flattened[0].data);
                    return;
                }
                pxtc.assert(info.flattened.length <= 4);
                var maskStr = "0x" + (mask + info.flattened.length * 16).toString(16);
                name = name.replace(/^thumb::/, "Number_::");
                var spec = pxtc.U.lookup(vmSpecOpcodes, name);
                if (mask)
                    spec = null;
                for (var i = 0; i < info.flattened.length; ++i) {
                    emitExpr(info.flattened[i]);
                    if (i < info.flattened.length - 1)
                        write("push");
                }
                //let inf = hex.lookupFunc(name)
                if (spec)
                    write(spec);
                else
                    write("call " + maskStr + ", " + name);
            }
            function clearStack() {
                for (var i = 0; i < currTmps.length; ++i) {
                    var e = currTmps[i];
                    if (e && e.currUses == e.totalUses) {
                        if (!final)
                            alltmps.push(e);
                        currTmps[i] = null;
                    }
                }
            }
            function emitProcCall(topExpr) {
                var calledProcId = topExpr.data;
                var calledProc = calledProcId.proc;
                for (var _i = 0, _a = topExpr.args; _i < _a.length; _i++) {
                    var e = _a[_i];
                    emitExpr(e);
                    write("push");
                }
                var methIdx = -1;
                var fetchAddr = "";
                if (calledProcId.ifaceIndex != null) {
                    methIdx = calledProcId.ifaceIndex;
                    fetchAddr = "pxtrt::fetchMethodIface";
                }
                else if (calledProcId.virtualIndex != null) {
                    methIdx = calledProcId.virtualIndex + 2;
                    fetchAddr = "pxtrt::fetchMethod";
                }
                if (fetchAddr) {
                    write("ldstack " + (topExpr.args.length * wordSize - 1));
                    write("push");
                    write("ldconst " + methIdx);
                    write("call 0x20, " + fetchAddr);
                    write("callind");
                }
                else {
                    write("callproc " + calledProc.label());
                }
            }
            function emitStore(trg, src) {
                switch (trg.exprKind) {
                    case EK.CellRef:
                        emitExpr(src);
                        var cell = trg.data;
                        var instr = "st" + cellref(cell);
                        if (cell.isGlobal() &&
                            (cell.bitSize == 1 /* Int8 */ || cell.bitSize == 2 /* UInt8 */)) {
                            instr = instr.replace("stglb", "stglb1");
                        }
                        write(instr);
                        break;
                    case EK.FieldAccess:
                        var info = trg.data;
                        // it does the decr itself, no mask
                        emitExpr(pxtc.ir.rtcall(withRef("pxtrt::stfld", info.isRef), [trg.args[0], pxtc.ir.numlit(info.idx), src]));
                        break;
                    default: pxtc.oops();
                }
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var decompiler;
        (function (decompiler) {
            decompiler.FILE_TOO_LARGE_CODE = 9266;
            var SK = ts.SyntaxKind;
            /**
             * Max number of blocks before we bail out of decompilation
             */
            var MAX_BLOCKS = 1000;
            var lowerCaseAlphabetStartCode = 97;
            var lowerCaseAlphabetEndCode = 122;
            var validStringRegex = /^[^\f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/;
            var numberType = "math_number";
            var stringType = "text";
            var booleanType = "logic_boolean";
            var ops = {
                "+": { type: "math_arithmetic", op: "ADD" },
                "-": { type: "math_arithmetic", op: "MINUS" },
                "/": { type: "math_arithmetic", op: "DIVIDE" },
                "*": { type: "math_arithmetic", op: "MULTIPLY" },
                "%": { type: "math_modulo", leftName: "DIVIDEND", rightName: "DIVISOR" },
                "<": { type: "logic_compare", op: "LT" },
                "<=": { type: "logic_compare", op: "LTE" },
                ">": { type: "logic_compare", op: "GT" },
                ">=": { type: "logic_compare", op: "GTE" },
                "==": { type: "logic_compare", op: "EQ" },
                "===": { type: "logic_compare", op: "EQ" },
                "!=": { type: "logic_compare", op: "NEQ" },
                "!==": { type: "logic_compare", op: "NEQ" },
                "&&": { type: "logic_operation", op: "AND" },
                "||": { type: "logic_operation", op: "OR" },
            };
            /*
             * Matches a single line comment and extracts the text.
             * Breakdown:
             *     ^\s*     - matches leading whitespace
             *      \/\/s*  - matches double slash
             *      (.*)    - matches rest of the comment
             */
            var singleLineCommentRegex = /^\s*\/\/\s*(.*)$/;
            /*
             * Matches one line of a multi-line comment and extracts the text.
             * Breakdown:
             *      ^\s*                                        - matches leading whitespace
             *      (?:\/\*\*?)                                 - matches beginning of a multi-line comment (/* or /**)
             *      (?:\*)                                      - matches a single asterisk that might begin a line in the body of the comment
             *      (?:(?:(?:\/\*\*?)|(?:\*))(?!\/))            - combines the previous two regexes but does not match either if followed by a slash
             *      ^\s*(?:(?:(?:\/\*\*?)|(?:\*))(?!\/))?\s*    - matches all possible beginnings of a multi-line comment line (/*, /**, *, or just whitespace)
             *      (.*?)                                       - matches the text of the comment line
             *      (?:\*?\*\/)?$                               - matches the end of the multiline comment (one or two asterisks and a slash) or the end of a line within the comment
             */
            var multiLineCommentRegex = /^\s*(?:(?:(?:\/\*\*?)|(?:\*))(?!\/))?\s*(.*?)(?:\*?\*\/)?$/;
            var builtinBlocks = {
                "Math.abs": { blockId: "math_op3", block: "absolute of %x" },
                "Math.min": { blockId: "math_op2", block: "of %x|and %y" },
                "Math.max": { blockId: "math_op2", block: "of %x|and %y" }
            };
            var RenameMap = (function () {
                function RenameMap(renames) {
                    this.renames = renames;
                    this.renames.sort(function (a, b) { return a.span.start - b.span.start; });
                }
                RenameMap.prototype.getRenamesInSpan = function (start, end) {
                    var res = [];
                    for (var _i = 0, _a = this.renames; _i < _a.length; _i++) {
                        var rename = _a[_i];
                        if (rename.span.start > end) {
                            break;
                        }
                        else if (rename.span.start >= start) {
                            res.push(rename);
                        }
                    }
                    return res;
                };
                RenameMap.prototype.getRenameForPosition = function (position) {
                    for (var _i = 0, _a = this.renames; _i < _a.length; _i++) {
                        var rename = _a[_i];
                        if (rename.span.start > position) {
                            return undefined;
                        }
                        else if (rename.span.start === position) {
                            return rename;
                        }
                    }
                    return undefined;
                };
                return RenameMap;
            }());
            decompiler.RenameMap = RenameMap;
            var LSHost = (function () {
                function LSHost(p) {
                    this.p = p;
                }
                LSHost.prototype.getCompilationSettings = function () {
                    var opts = this.p.getCompilerOptions();
                    opts.noLib = true;
                    return opts;
                };
                LSHost.prototype.getNewLine = function () { return "\n"; };
                LSHost.prototype.getScriptFileNames = function () {
                    return this.p.getSourceFiles().map(function (f) { return f.fileName; });
                };
                LSHost.prototype.getScriptVersion = function (fileName) {
                    return "0";
                };
                LSHost.prototype.getScriptSnapshot = function (fileName) {
                    var f = this.p.getSourceFile(fileName);
                    return {
                        getLength: function () { return f.getFullText().length; },
                        getText: function () { return f.getFullText(); },
                        getChangeRange: function () { return undefined; }
                    };
                };
                LSHost.prototype.getCurrentDirectory = function () { return "."; };
                LSHost.prototype.getDefaultLibFileName = function (options) { return null; };
                LSHost.prototype.useCaseSensitiveFileNames = function () { return true; };
                return LSHost;
            }());
            /**
             * Uses the language service to ensure that there are no duplicate variable
             * names in the given file. All variables in Blockly are global, so this is
             * necessary to prevent local variables from colliding.
             */
            function buildRenameMap(p, s) {
                var service = ts.createLanguageService(new LSHost(p));
                var allRenames = [];
                collectNameCollisions();
                if (allRenames.length) {
                    return new RenameMap(allRenames);
                }
                return undefined;
                function collectNameCollisions() {
                    var takenNames = {};
                    checkChildren(s);
                    function checkChildren(n) {
                        ts.forEachChild(n, function (child) {
                            if (child.kind === SK.VariableDeclaration && child.name.kind === SK.Identifier) {
                                var name_1 = child.name.getText();
                                if (takenNames[name_1]) {
                                    var newName_1 = getNewName(name_1);
                                    var renames = service.findRenameLocations(s.fileName, child.name.pos + 1, false, false);
                                    if (renames) {
                                        renames.forEach(function (r) {
                                            allRenames.push({
                                                name: newName_1,
                                                diff: newName_1.length - name_1.length,
                                                span: r.textSpan
                                            });
                                        });
                                    }
                                }
                                else {
                                    takenNames[name_1] = true;
                                }
                            }
                            checkChildren(child);
                        });
                    }
                    function getNewName(name) {
                        // If the variable is a single lower case letter, try and rename it to a different letter (i.e. i -> j)
                        if (name.length === 1) {
                            var charCode = name.charCodeAt(0);
                            if (charCode >= lowerCaseAlphabetStartCode && charCode <= lowerCaseAlphabetEndCode) {
                                var offset = charCode - lowerCaseAlphabetStartCode;
                                for (var i = 1; i < 26; i++) {
                                    var newChar = String.fromCharCode(lowerCaseAlphabetStartCode + ((offset + i) % 26));
                                    if (!takenNames[newChar]) {
                                        takenNames[newChar] = true;
                                        return newChar;
                                    }
                                }
                            }
                        }
                        // For all other names, add a number to the end. Start at 2 because it probably makes more sense for kids
                        for (var i = 2;; i++) {
                            var toTest = name + i;
                            if (!takenNames[toTest]) {
                                takenNames[toTest] = true;
                                return toTest;
                            }
                        }
                    }
                }
            }
            decompiler.buildRenameMap = buildRenameMap;
            var ReferenceType;
            (function (ReferenceType) {
                // Variable is never referenced
                ReferenceType[ReferenceType["None"] = 0] = "None";
                // Variable is only referenced in "non-grey" blocks
                ReferenceType[ReferenceType["InBlocksOnly"] = 1] = "InBlocksOnly";
                // Variable is referenced at least once inside "grey" blocks
                ReferenceType[ReferenceType["InTextBlocks"] = 2] = "InTextBlocks";
            })(ReferenceType || (ReferenceType = {}));
            function decompileToBlocks(blocksInfo, file, options, renameMap) {
                var emittedBlocks = 0;
                var stmts = file.statements;
                var result = {
                    blocksInfo: blocksInfo,
                    outfiles: {}, diagnostics: [], success: true, times: {}
                };
                var env = {
                    blocks: blocksInfo,
                    declaredFunctions: {}
                };
                var fileText = file.getFullText();
                var output = "";
                var varUsages = {};
                var autoDeclarations = [];
                ts.forEachChild(file, function (topLevelNode) {
                    if (topLevelNode.kind === SK.FunctionDeclaration && !checkStatement(topLevelNode, env, false, true)) {
                        env.declaredFunctions[getVariableName(topLevelNode.name)] = true;
                    }
                });
                var n;
                try {
                    n = codeBlock(stmts, undefined, true);
                }
                catch (e) {
                    if (e.programTooLarge) {
                        result.success = false;
                        result.diagnostics = pxtc.patchUpDiagnostics([{
                                file: file,
                                start: file.getFullStart(),
                                length: file.getFullWidth(),
                                messageText: e.message,
                                category: ts.DiagnosticCategory.Error,
                                code: decompiler.FILE_TOO_LARGE_CODE
                            }]);
                    }
                    else {
                        throw e;
                    }
                }
                if (n) {
                    emitStatementNode(n);
                }
                result.outfiles[file.fileName.replace(/(\.blocks)?\.\w*$/i, '') + '.blocks'] = "<xml xmlns=\"http://www.w3.org/1999/xhtml\">\n" + output + "</xml>";
                return result;
                function write(s, suffix) {
                    if (suffix === void 0) { suffix = "\n"; }
                    output += s + suffix;
                }
                function error(n, msg) {
                    var messageText = msg || "Language feature \"" + n.getFullText().trim() + "\"\" not supported in blocks";
                    var diags = pxtc.patchUpDiagnostics([{
                            file: file,
                            start: n.getFullStart(),
                            length: n.getFullWidth(),
                            messageText: messageText,
                            category: ts.DiagnosticCategory.Error,
                            code: 1001
                        }]);
                    pxt.debug("decompilation error: " + messageText);
                    pxtc.U.pushRange(result.diagnostics, diags);
                    result.success = false;
                }
                function countBlock() {
                    emittedBlocks++;
                    if (emittedBlocks > MAX_BLOCKS) {
                        var e = new Error(pxtc.Util.lf("Could not decompile because the script is too large"));
                        e.programTooLarge = true;
                        throw e;
                    }
                }
                function mkStmt(type) {
                    countBlock();
                    return {
                        kind: "statement",
                        type: type
                    };
                }
                function mkExpr(type) {
                    countBlock();
                    return {
                        kind: "expr",
                        type: type
                    };
                }
                function mkValue(name, value, shadowType) {
                    if (shadowType && value.kind === "expr" && value.type !== shadowType) {
                        // Count the shadow block that will be emitted
                        countBlock();
                    }
                    return { kind: "value", name: name, value: value, shadowType: shadowType };
                }
                function isEventExpression(expr) {
                    if (expr.expression.kind == SK.CallExpression) {
                        var call = expr.expression;
                        var callInfo = call.callInfo;
                        if (!callInfo) {
                            error(expr);
                            return false;
                        }
                        return callInfo.attrs.blockId && !callInfo.attrs.handlerStatement && !callInfo.isExpression && hasArrowFunction(callInfo);
                    }
                    return false;
                }
                function isOutputExpression(expr) {
                    switch (expr.kind) {
                        case SK.BinaryExpression:
                            return !/[=<>]/.test(expr.operatorToken.getText());
                        case SK.PrefixUnaryExpression: {
                            var op = expr.operator;
                            return op != SK.PlusPlusToken && op != SK.MinusMinusToken;
                        }
                        case SK.PostfixUnaryExpression: {
                            var op = expr.operator;
                            return op != SK.PlusPlusToken && op != SK.MinusMinusToken;
                        }
                        case SK.CallExpression:
                            var callInfo = expr.callInfo;
                            if (!callInfo) {
                                error(expr);
                            }
                            return callInfo.isExpression;
                        case SK.ParenthesizedExpression:
                        case SK.NumericLiteral:
                        case SK.StringLiteral:
                        case SK.NoSubstitutionTemplateLiteral:
                        case SK.TrueKeyword:
                        case SK.FalseKeyword:
                        case SK.NullKeyword:
                            return true;
                        default: return false;
                    }
                }
                function emitStatementNode(n) {
                    if (!n) {
                        return;
                    }
                    openBlockTag(n.type);
                    emitBlockNodeCore(n);
                    if (n.handlers) {
                        n.handlers.forEach(emitHandler);
                    }
                    if (n.next) {
                        write("<next>");
                        emitStatementNode(n.next);
                        write("</next>");
                    }
                    if (n.comment !== undefined) {
                        write("<comment pinned=\"false\">" + pxtc.U.htmlEscape(n.comment) + "</comment>");
                    }
                    closeBlockTag();
                }
                function emitBlockNodeCore(n) {
                    if (n.mutation) {
                        write("<mutation ", "");
                        for (var key in n.mutation) {
                            write(key + "=\"" + n.mutation[key] + "\" ", "");
                        }
                        write("/>");
                    }
                    if (n.fields) {
                        n.fields.forEach(emitFieldNode);
                    }
                    if (n.inputs) {
                        n.inputs.forEach(emitValueNode);
                    }
                }
                function emitValueNode(n) {
                    write("<value name=\"" + n.name + "\">");
                    var emitShadowOnly = false;
                    if (n.value.kind === "expr") {
                        var value = n.value;
                        emitShadowOnly = value.type === n.shadowType;
                        if (!emitShadowOnly) {
                            switch (value.type) {
                                case "math_number":
                                case "logic_boolean":
                                case "text":
                                    emitShadowOnly = !n.shadowType;
                                    break;
                            }
                        }
                    }
                    if (emitShadowOnly) {
                        emitOutputNode(n.value, true);
                    }
                    else {
                        // Emit a shadow block to appear if the given input is removed
                        if (n.shadowType !== undefined) {
                            switch (n.shadowType) {
                                case numberType:
                                    write("<shadow type=\"math_number\"><field name=\"NUM\">0</field></shadow>");
                                    break;
                                case booleanType:
                                    write("<shadow type=\"logic_boolean\"><field name=\"BOOL\">TRUE</field></shadow>");
                                    break;
                                case stringType:
                                    write("<shadow type=\"text\"><field name=\"TEXT\"></field></shadow>");
                                    break;
                                default:
                                    write("<shadow type=\"" + n.shadowType + "\"/>");
                            }
                        }
                        emitOutputNode(n.value);
                    }
                    write("</value>");
                }
                function emitFieldNode(n) {
                    write("<field name=\"" + pxtc.U.htmlEscape(n.name) + "\">" + pxtc.U.htmlEscape(n.value.toString()) + "</field>");
                }
                function emitHandler(h) {
                    write("<statement name=\"" + pxtc.U.htmlEscape(h.name) + "\">");
                    emitStatementNode(h.statement);
                    write("</statement>");
                }
                function emitOutputNode(n, shadow) {
                    if (shadow === void 0) { shadow = false; }
                    if (n.kind === "text") {
                        var node = n;
                        write(node.value);
                    }
                    else {
                        var node = n;
                        var tag = shadow || node.isShadow ? "shadow" : "block";
                        write("<" + tag + " type=\"" + pxtc.U.htmlEscape(node.type) + "\">");
                        emitBlockNodeCore(node);
                        write("</" + tag + ">");
                    }
                }
                function openBlockTag(type) {
                    write("<block type=\"" + pxtc.U.htmlEscape(type) + "\">");
                }
                function closeBlockTag() {
                    write("</block>");
                }
                function getOutputBlock(n) {
                    if (checkExpression(n, env)) {
                        return getTypeScriptExpressionBlock(n);
                    }
                    else {
                        switch (n.kind) {
                            case SK.ExpressionStatement:
                                return getOutputBlock(n.expression);
                            case SK.ParenthesizedExpression:
                                return getOutputBlock(n.expression);
                            case SK.Identifier:
                                return getIdentifier(n);
                            case SK.StringLiteral:
                            case SK.FirstTemplateToken:
                            case SK.NoSubstitutionTemplateLiteral:
                                return getStringLiteral(n.text);
                            case SK.NumericLiteral:
                                return getNumericLiteral(n.text);
                            case SK.TrueKeyword:
                                return getBooleanLiteral(true);
                            case SK.FalseKeyword:
                                return getBooleanLiteral(false);
                            case SK.BinaryExpression:
                                return getBinaryExpression(n);
                            case SK.PrefixUnaryExpression:
                                return getPrefixUnaryExpression(n);
                            case SK.PropertyAccessExpression:
                                return getPropertyAccessExpression(n);
                            case SK.ArrayLiteralExpression:
                                return getArrayLiteralExpression(n);
                            case SK.ElementAccessExpression:
                                return getElementAccessExpression(n);
                            case SK.CallExpression:
                                return getStatementBlock(n, undefined, undefined, true);
                            default:
                                error(n, pxtc.Util.lf("Unsupported syntax kind for output expression block: {0}", SK[n.kind]));
                                break;
                        }
                        return undefined;
                    }
                }
                function applyRenamesInRange(text, start, end) {
                    if (renameMap) {
                        var renames = renameMap.getRenamesInSpan(start, end);
                        if (renames.length) {
                            var offset_1 = 0;
                            renames.forEach(function (rename) {
                                var sIndex = rename.span.start + offset_1 - start;
                                var eIndex = sIndex + rename.span.length;
                                offset_1 += rename.diff;
                                text = text.slice(0, sIndex) + rename.name + text.slice(eIndex);
                            });
                        }
                    }
                    return text;
                }
                function getTypeScriptExpressionBlock(n) {
                    var text = applyRenamesInRange(n.getFullText(), n.getFullStart(), n.getEnd()).trim();
                    trackVariableUsagesInText(n);
                    return getFieldBlock(pxtc.TS_OUTPUT_TYPE, "EXPRESSION", text);
                }
                function getBinaryExpression(n) {
                    var op = n.operatorToken.getText();
                    var npp = ops[op];
                    // Could be string concatenation
                    if (isTextJoin(n)) {
                        var args = [];
                        collectTextJoinArgs(n, args);
                        var result_1 = mkExpr("text_join");
                        result_1.mutation = {
                            "items": args.length.toString()
                        };
                        result_1.inputs = [];
                        for (var i = 0; i < args.length; i++) {
                            result_1.inputs.push(getValue("ADD" + i, args[i], stringType));
                        }
                        return result_1;
                    }
                    var result = mkExpr(npp.type);
                    result.fields = [];
                    result.inputs = [];
                    if (npp.op) {
                        result.fields.push(getField("OP", npp.op));
                    }
                    var shadowType = (op === "&&" || op === "||") ? booleanType : numberType;
                    result.inputs.push(getValue(npp.leftName || "A", n.left, shadowType));
                    result.inputs.push(getValue(npp.rightName || "B", n.right, shadowType));
                    return result;
                    function isTextJoin(n) {
                        if (n.kind === SK.BinaryExpression) {
                            var b = n;
                            if (b.operatorToken.getText() === "+") {
                                var info = n.exprInfo;
                                return !!info;
                            }
                        }
                        return false;
                    }
                    function collectTextJoinArgs(n, result) {
                        if (isTextJoin(n)) {
                            collectTextJoinArgs(n.left, result);
                            collectTextJoinArgs(n.right, result);
                        }
                        else {
                            result.push(n);
                        }
                    }
                }
                function getValue(name, contents, shadowType) {
                    var value;
                    if (typeof contents === "number") {
                        value = getNumericLiteral(contents.toString());
                    }
                    else if (typeof contents === "boolean") {
                        value = getBooleanLiteral(contents);
                    }
                    else if (typeof contents === "string") {
                        value = getStringLiteral(contents);
                    }
                    else {
                        value = getOutputBlock(contents);
                    }
                    return mkValue(name, value, shadowType);
                }
                function getIdentifier(identifier) {
                    var name = getVariableName(identifier);
                    trackVariableUsage(name, ReferenceType.InBlocksOnly);
                    return getFieldBlock("variables_get", "VAR", name);
                }
                function getNumericLiteral(value) {
                    return getFieldBlock("math_number", "NUM", value);
                }
                function getStringLiteral(value) {
                    return getFieldBlock("text", "TEXT", value);
                }
                function getBooleanLiteral(value) {
                    return getFieldBlock("logic_boolean", "BOOL", value ? "TRUE" : "FALSE");
                }
                function getFieldBlock(type, fieldName, value, isShadow) {
                    var r = mkExpr(type);
                    r.fields = [getField(fieldName, value)];
                    r.isShadow = isShadow;
                    return r;
                }
                function getField(name, value) {
                    return {
                        kind: "field",
                        name: name,
                        value: value,
                    };
                }
                // TODO: Add a real negation block
                function negateNumericNode(node) {
                    var r = mkExpr("math_arithmetic");
                    r.inputs = [
                        getValue("A", 0, numberType),
                        getValue("B", node, numberType)
                    ];
                    r.fields = [getField("OP", "MINUS")];
                    return r;
                }
                function getPrefixUnaryExpression(node) {
                    switch (node.operator) {
                        case SK.ExclamationToken:
                            var r = mkExpr("logic_negate");
                            r.inputs = [getValue("BOOL", node.operand, booleanType)];
                            return r;
                        case SK.PlusToken:
                            return getOutputBlock(node.operand);
                        case SK.MinusToken:
                            if (node.operand.kind == SK.NumericLiteral) {
                                return getNumericLiteral("-" + node.operand.text);
                            }
                            else {
                                return negateNumericNode(node.operand);
                            }
                        default:
                            error(node);
                            break;
                    }
                    return undefined;
                }
                function getPropertyAccessExpression(n) {
                    var callInfo = n.callInfo;
                    if (!callInfo) {
                        error(n);
                        return;
                    }
                    if (callInfo.attrs.blockId === "lists_length" || callInfo.attrs.blockId === "text_length") {
                        var r = mkExpr(pxtc.U.htmlEscape(callInfo.attrs.blockId));
                        r.inputs = [getValue("VALUE", n.expression)];
                        return r;
                    }
                    var value = pxtc.U.htmlEscape(callInfo.attrs.blockId || callInfo.qName);
                    var parent = getParent(n)[0];
                    var parentCallInfo = parent && parent.callInfo;
                    if (callInfo.attrs.blockIdentity && !(parentCallInfo && parentCallInfo.qName === callInfo.attrs.blockIdentity)) {
                        if (callInfo.attrs.enumval && parentCallInfo && parentCallInfo.attrs.useEnumVal) {
                            value = callInfo.attrs.enumval;
                        }
                        var idfn = blocksInfo.apis.byQName[callInfo.attrs.blockIdentity];
                        var f = /%([a-zA-Z0-9_]+)/.exec(idfn.attributes.block);
                        var r = mkExpr(pxtc.U.htmlEscape(idfn.attributes.blockId));
                        r.fields = [{
                                kind: "field",
                                name: pxtc.U.htmlEscape(f[1]),
                                value: value
                            }];
                        return r;
                    }
                    else {
                        return {
                            kind: "text",
                            value: value
                        };
                    }
                }
                function getArrayLiteralExpression(n) {
                    var r = mkExpr("lists_create_with");
                    r.inputs = n.elements.map(function (e, i) { return getValue("ADD" + i, e); });
                    r.mutation = {
                        "items": n.elements.length.toString()
                    };
                    return r;
                }
                function getElementAccessExpression(n) {
                    var r = mkExpr("lists_index_get");
                    r.inputs = [getValue("LIST", n.expression), getValue("INDEX", n.argumentExpression, numberType)];
                    return r;
                }
                function getStatementBlock(n, next, parent, asExpression, topLevel) {
                    if (asExpression === void 0) { asExpression = false; }
                    if (topLevel === void 0) { topLevel = false; }
                    var node = n;
                    var stmt;
                    if (checkStatement(node, env, asExpression, topLevel)) {
                        stmt = getTypeScriptStatementBlock(node);
                    }
                    else {
                        switch (node.kind) {
                            case SK.Block:
                                return codeBlock(node.statements, next);
                            case SK.ExpressionStatement:
                                return getStatementBlock(node.expression, next, parent || node, asExpression, topLevel);
                            case SK.VariableStatement:
                                return codeBlock(node.declarationList.declarations, next, false, parent || node);
                            case SK.FunctionExpression:
                            case SK.ArrowFunction:
                                return getArrowFunctionStatement(node, next);
                            case SK.BinaryExpression:
                                stmt = getBinaryExpressionStatement(node);
                                break;
                            case SK.PostfixUnaryExpression:
                            case SK.PrefixUnaryExpression:
                                stmt = getIncrementStatement(node);
                                break;
                            case SK.VariableDeclaration:
                                var decl = node;
                                if (isAutoDeclaration(decl)) {
                                    // Don't emit null or automatic initializers;
                                    // They are implicit within the blocks. But do track them in case they
                                    // never get used in the blocks (and thus won't be emitted again)
                                    trackAutoDeclaration(decl);
                                    return getNext();
                                }
                                stmt = getVariableDeclarationStatement(node);
                                break;
                            case SK.WhileStatement:
                                stmt = getWhileStatement(node);
                                break;
                            case SK.IfStatement:
                                stmt = getIfStatement(node);
                                break;
                            case SK.ForStatement:
                                stmt = getForStatement(node);
                                break;
                            case SK.ForOfStatement:
                                stmt = getForOfStatement(node);
                                break;
                            case SK.FunctionDeclaration:
                                stmt = getFunctionDeclaration(node);
                                break;
                            case SK.CallExpression:
                                stmt = getCallStatement(node, asExpression);
                                break;
                            default:
                                if (next) {
                                    error(node, pxtc.Util.lf("Unsupported statement in block: {0}", SK[node.kind]));
                                }
                                else {
                                    error(node, pxtc.Util.lf("Statement kind unsupported in blocks: {0}", SK[node.kind]));
                                }
                                return;
                        }
                    }
                    if (stmt) {
                        stmt.next = getNext();
                        if (stmt.next) {
                            stmt.next.prev = stmt;
                        }
                    }
                    var commentRanges = ts.getLeadingCommentRangesOfNode(parent || node, file);
                    if (commentRanges) {
                        var commentText = getCommentText(commentRanges);
                        if (commentText && stmt) {
                            stmt.comment = commentText;
                        }
                        else {
                        }
                    }
                    return stmt;
                    function getNext() {
                        if (next && next.length) {
                            return getStatementBlock(next.shift(), next, undefined, false, topLevel);
                        }
                        return undefined;
                    }
                }
                function getTypeScriptStatementBlock(node, prefix) {
                    var r = mkStmt(pxtc.TS_STATEMENT_TYPE);
                    r.mutation = {};
                    trackVariableUsagesInText(node);
                    var text = node.getText();
                    var start = node.getStart();
                    var end = node.getEnd();
                    text = applyRenamesInRange(text, start, end);
                    if (prefix) {
                        text = prefix + text;
                    }
                    var declaredVariables = [];
                    if (node.kind === SK.VariableStatement) {
                        for (var _i = 0, _a = node.declarationList.declarations; _i < _a.length; _i++) {
                            var declaration = _a[_i];
                            declaredVariables.push(getVariableName(declaration.name));
                        }
                    }
                    else if (node.kind === SK.VariableDeclaration) {
                        declaredVariables.push(getVariableName(node.name));
                    }
                    if (declaredVariables.length) {
                        r.mutation["declaredvars"] = declaredVariables.join(",");
                    }
                    var parts = text.split("\n");
                    r.mutation["numlines"] = parts.length.toString();
                    parts.forEach(function (p, i) {
                        r.mutation[("line" + i)] = pxtc.U.htmlEscape(p);
                    });
                    return r;
                }
                function getImageLiteralStatement(node, info) {
                    var arg = node.arguments[0];
                    if (arg.kind != SK.StringLiteral && arg.kind != SK.NoSubstitutionTemplateLiteral) {
                        error(node);
                        return;
                    }
                    var res = mkStmt(info.attrs.blockId);
                    res.fields = [];
                    var leds = (arg.text || '').replace(/\s+/g, '');
                    var nc = info.attrs.imageLiteral * 5;
                    if (nc * 5 != leds.length) {
                        error(node, pxtc.Util.lf("Invalid image pattern"));
                        return;
                    }
                    for (var r = 0; r < 5; ++r) {
                        for (var c = 0; c < nc; ++c) {
                            res.fields.push(getField("LED" + c + r, /[#*1]/.test(leds[r * nc + c]) ? "TRUE" : "FALSE"));
                        }
                    }
                    return res;
                }
                function getBinaryExpressionStatement(n) {
                    var name = n.left.text;
                    switch (n.operatorToken.kind) {
                        case SK.EqualsToken:
                            if (n.left.kind === SK.Identifier) {
                                return getVariableSetOrChangeBlock(n.left, n.right);
                            }
                            else {
                                return getArraySetBlock(n.left, n.right);
                            }
                        case SK.PlusEqualsToken:
                            return getVariableSetOrChangeBlock(n.left, n.right, true);
                        case SK.MinusEqualsToken:
                            var r = mkStmt("variables_change");
                            countBlock();
                            r.inputs = [mkValue("VALUE", negateNumericNode(n.right), numberType)];
                            r.fields = [getField("VAR", getVariableName(n.left))];
                            return r;
                        default:
                            error(n, pxtc.Util.lf("Unsupported operator token in statement {0}", SK[n.operatorToken.kind]));
                            return;
                    }
                }
                function getWhileStatement(n) {
                    var r = mkStmt("device_while");
                    r.inputs = [getValue("COND", n.expression, booleanType)];
                    r.handlers = [{ name: "DO", statement: getStatementBlock(n.statement) }];
                    return r;
                }
                function getIfStatement(n) {
                    var flatif = flattenIfStatement(n);
                    var r = mkStmt("controls_if");
                    r.mutation = {
                        "elseif": (flatif.ifStatements.length - 1).toString(),
                        "else": flatif.elseStatement ? "1" : "0"
                    };
                    r.inputs = [];
                    r.handlers = [];
                    flatif.ifStatements.forEach(function (stmt, i) {
                        r.inputs.push(getValue("IF" + i, stmt.expression, booleanType));
                        r.handlers.push({ name: "DO" + i, statement: getStatementBlock(stmt.thenStatement) });
                    });
                    if (flatif.elseStatement) {
                        r.handlers.push({ name: "ELSE", statement: getStatementBlock(flatif.elseStatement) });
                    }
                    return r;
                }
                function getForStatement(n) {
                    var initializer = n.initializer;
                    var indexVar = initializer.declarations[0].name.text;
                    var condition = n.condition;
                    var renamed = getVariableName(initializer.declarations[0].name);
                    var r;
                    if (condition.operatorToken.kind === SK.LessThanToken && !checkForVariableUsages(n.statement)) {
                        r = mkStmt("controls_repeat_ext");
                        r.fields = [];
                        r.inputs = [getValue("TIMES", condition.right, numberType)];
                        r.handlers = [];
                    }
                    else {
                        r = mkStmt("controls_simple_for");
                        r.fields = [getField("VAR", renamed)];
                        r.inputs = [];
                        r.handlers = [];
                        if (condition.operatorToken.kind === SK.LessThanToken) {
                            var ex = mkExpr("math_arithmetic");
                            ex.fields = [getField("OP", "MINUS")];
                            ex.inputs = [
                                getValue("A", condition.right, numberType),
                                getValue("B", 1, numberType)
                            ];
                            countBlock();
                            r.inputs.push(mkValue("TO", ex, numberType));
                        }
                        else if (condition.operatorToken.kind === SK.LessThanEqualsToken) {
                            r.inputs.push(getValue("TO", condition.right, numberType));
                        }
                    }
                    r.handlers.push({ name: "DO", statement: getStatementBlock(n.statement) });
                    return r;
                    function checkForVariableUsages(node) {
                        if (node.kind === SK.Identifier && getVariableName(node) === renamed) {
                            return true;
                        }
                        return ts.forEachChild(node, checkForVariableUsages);
                    }
                }
                function getForOfStatement(n) {
                    var initializer = n.initializer;
                    var indexVar = initializer.declarations[0].name.text;
                    var renamed = getVariableName(initializer.declarations[0].name);
                    var r = mkStmt("controls_for_of");
                    r.inputs = [getValue("LIST", n.expression)];
                    r.fields = [getField("VAR", renamed)];
                    r.handlers = [{ name: "DO", statement: getStatementBlock(n.statement) }];
                    return r;
                }
                function getVariableSetOrChangeBlock(name, value, changed, overrideName) {
                    if (changed === void 0) { changed = false; }
                    if (overrideName === void 0) { overrideName = false; }
                    var renamed = getVariableName(name);
                    trackVariableUsage(renamed, ReferenceType.InBlocksOnly);
                    // We always do a number shadow even if the variable is not of type number
                    var r = mkStmt(changed ? "variables_change" : "variables_set");
                    r.inputs = [getValue("VALUE", value, numberType)];
                    r.fields = [getField("VAR", renamed)];
                    return r;
                }
                function getArraySetBlock(left, right) {
                    var r = mkStmt("lists_index_set");
                    r.inputs = [
                        getValue("LIST", left.expression),
                        getValue("INDEX", left.argumentExpression, numberType),
                        getValue("VALUE", right)
                    ];
                    return r;
                }
                function getVariableDeclarationStatement(n) {
                    if (addVariableDeclaration(n)) {
                        return getVariableSetOrChangeBlock(n.name, n.initializer);
                    }
                    return undefined;
                }
                function getIncrementStatement(node) {
                    var isPlusPlus = node.operator === SK.PlusPlusToken;
                    if (!isPlusPlus && node.operator !== SK.MinusMinusToken) {
                        error(node);
                        return;
                    }
                    return getVariableSetOrChangeBlock(node.operand, isPlusPlus ? 1 : -1, true);
                }
                function getFunctionDeclaration(n) {
                    var name = getVariableName(n.name);
                    var statements = getStatementBlock(n.body);
                    var r = mkStmt("procedures_defnoreturn");
                    r.fields = [getField("NAME", name)];
                    r.handlers = [{ name: "STACK", statement: statements }];
                    return r;
                }
                function getCallStatement(node, asExpression) {
                    var info = node.callInfo;
                    if (!info.attrs.blockId || !info.attrs.block) {
                        var builtin = builtinBlocks[info.qName];
                        if (!builtin) {
                            var name_2 = getVariableName(node.expression);
                            if (env.declaredFunctions[name_2]) {
                                var r_1 = mkStmt("procedures_callnoreturn");
                                r_1.mutation = { "name": name_2 };
                                return r_1;
                            }
                            else {
                                return getTypeScriptStatementBlock(node);
                            }
                        }
                        info.attrs.block = builtin.block;
                        info.attrs.blockId = builtin.blockId;
                    }
                    if (info.attrs.imageLiteral) {
                        return getImageLiteralStatement(node, info);
                    }
                    if (ts.isFunctionLike(info.decl)) {
                    }
                    var paramInfo = getParameterInfo(info, blocksInfo);
                    var r = {
                        kind: asExpression ? "expr" : "statement",
                        type: info.attrs.blockId
                    };
                    if (info.qName == "Math.max") {
                        (r.fields || (r.fields = [])).push({
                            kind: "field",
                            name: "op",
                            value: "max"
                        });
                    }
                    info.args.forEach(function (e, i) {
                        e = unwrapNode(e);
                        if (i === 0 && info.attrs.defaultInstance) {
                            if (e.getText() === info.attrs.defaultInstance) {
                                return;
                            }
                            else {
                                r.mutation = { "showing": "true" };
                            }
                        }
                        if (info.attrs.mutatePropertyEnum && i === info.args.length - 2) {
                            // Implicit in the blocks
                            return;
                        }
                        switch (e.kind) {
                            case SK.FunctionExpression:
                            case SK.ArrowFunction:
                                var m = getDestructuringMutation(e);
                                if (m) {
                                    r.mutation = m;
                                }
                                else {
                                    var arrow = e;
                                    if (arrow.parameters.length) {
                                        if (info.attrs.optionalVariableArgs) {
                                            r.mutation = {
                                                "numargs": arrow.parameters.length.toString()
                                            };
                                            arrow.parameters.forEach(function (parameter, i) {
                                                r.mutation["arg" + i] = parameter.name.text;
                                            });
                                        }
                                        else {
                                            var sym = blocksInfo.blocksById[info.attrs.blockId];
                                            var paramDesc_1 = sym.parameters[i];
                                            arrow.parameters.forEach(function (parameter, i) {
                                                var arg = paramDesc_1.handlerParameters[i];
                                                (r.fields || (r.fields = [])).push(getField("HANDLER_" + arg.name, parameter.name.text));
                                            });
                                        }
                                    }
                                }
                                (r.handlers || (r.handlers = [])).push({ name: "HANDLER", statement: getStatementBlock(e) });
                                break;
                            case SK.PropertyAccessExpression:
                                var callInfo = e.callInfo;
                                var shadow = callInfo && !!callInfo.attrs.blockIdentity;
                                var aName = pxtc.U.htmlEscape(paramInfo[i].name);
                                if (shadow && callInfo.attrs.blockIdentity !== info.qName) {
                                    (r.inputs || (r.inputs = [])).push(getValue(aName, e, paramInfo[i].type));
                                }
                                else {
                                    var expr = getOutputBlock(e);
                                    if (expr.kind === "text") {
                                        (r.fields || (r.fields = [])).push(getField(aName, expr.value));
                                    }
                                    else {
                                        if (paramInfo[i].type && expr.type !== paramInfo[i].type) {
                                            countBlock();
                                        }
                                        (r.inputs || (r.inputs = [])).push(mkValue(aName, expr, paramInfo[i].type));
                                    }
                                }
                                break;
                            default:
                                var v = void 0;
                                var vName = pxtc.U.htmlEscape(paramInfo[i].name);
                                var defaultV = true;
                                if (info.qName == "Math.random") {
                                    v = mkValue(vName, getMathRandomArgumentExpresion(e), numberType);
                                    defaultV = false;
                                }
                                else if (isLiteralNode(e)) {
                                    var param = paramInfo[i];
                                    var fieldText = param.paramFieldEditor == 'text' ? e.text : e.getText();
                                    if (param.decompileLiterals) {
                                        var fieldBlock = getFieldBlock(param.type, param.fieldName, fieldText, true);
                                        if (param.paramShadowOptions) {
                                            fieldBlock.mutation = { "customfield": pxtc.Util.htmlEscape(JSON.stringify(param.paramShadowOptions)) };
                                        }
                                        v = mkValue(vName, fieldBlock, param.type);
                                        defaultV = false;
                                    }
                                    else if (param.paramFieldEditorOptions && param.paramFieldEditorOptions['onParentBlock']) {
                                        (r.fields || (r.fields = [])).push(getField(vName, fieldText));
                                        return;
                                    }
                                }
                                if (defaultV) {
                                    v = getValue(vName, e, paramInfo[i].type);
                                }
                                (r.inputs || (r.inputs = [])).push(v);
                                break;
                        }
                    });
                    return r;
                }
                // function openCallExpressionBlockWithRestParameter(call: ts.CallExpression, info: pxtc.CallInfo) {
                //     openBlockTag(info.attrs.blockId);
                //     write(`<mutation count="${info.args.length}" />`)
                //     info.args.forEach((expression, index) => {
                //         emitValue("value_input_" + index, expression, numberType);
                //     });
                // }
                function getDestructuringMutation(callback) {
                    var bindings = getObjectBindingProperties(callback);
                    if (bindings) {
                        return {
                            "callbackproperties": bindings[0].join(","),
                            "renamemap": pxtc.Util.htmlEscape(JSON.stringify(bindings[1]))
                        };
                    }
                    return undefined;
                }
                function getMathRandomArgumentExpresion(e) {
                    switch (e.kind) {
                        case SK.NumericLiteral:
                            var n_1 = e;
                            return getNumericLiteral((parseInt(n_1.text) - 1).toString());
                        case SK.BinaryExpression:
                            var op = e;
                            if (op.operatorToken.kind == SK.PlusToken && op.right.text == "1") {
                                countBlock();
                                return getOutputBlock(op.left);
                            }
                        default:
                            //This will definitely lead to an error, but the above are the only two cases generated by blocks
                            return getOutputBlock(e);
                    }
                }
                function getArrowFunctionStatement(n, next) {
                    return getStatementBlock(n.body, next);
                }
                function flattenIfStatement(n) {
                    var r = {
                        ifStatements: [{
                                expression: n.expression,
                                thenStatement: n.thenStatement
                            }],
                        elseStatement: n.elseStatement
                    };
                    if (n.elseStatement && n.elseStatement.kind == SK.IfStatement) {
                        var flat = flattenIfStatement(n.elseStatement);
                        r.ifStatements = r.ifStatements.concat(flat.ifStatements);
                        r.elseStatement = flat.elseStatement;
                    }
                    return r;
                }
                function codeBlock(statements, next, topLevel, parent) {
                    if (topLevel === void 0) { topLevel = false; }
                    var eventStatements = [];
                    var blockStatements = next || [];
                    // Go over the statements in reverse so that we can insert the nodes into the existing list if there is one
                    statements.reverse().forEach(function (statement) {
                        if ((statement.kind === SK.FunctionDeclaration ||
                            (statement.kind == SK.ExpressionStatement && isEventExpression(statement))) &&
                            !checkStatement(statement, env, false, topLevel)) {
                            eventStatements.unshift(statement);
                        }
                        else {
                            blockStatements.unshift(statement);
                        }
                    });
                    eventStatements.map(function (n) { return getStatementBlock(n, undefined, undefined, false, topLevel); }).forEach(emitStatementNode);
                    var emitOnStart = topLevel && !options.snippetMode;
                    if (blockStatements.length) {
                        // wrap statement in "on start" if top level
                        var stmt = getStatementBlock(blockStatements.shift(), blockStatements, parent, false, topLevel);
                        if (emitOnStart) {
                            // Preserve any variable edeclarations that were never used
                            var current_1 = stmt;
                            autoDeclarations.forEach(function (_a) {
                                var name = _a[0], node = _a[1];
                                if (varUsages[name] === ReferenceType.InBlocksOnly) {
                                    return;
                                }
                                var e = node.initializer;
                                var v;
                                if (varUsages[name] === ReferenceType.InTextBlocks) {
                                    // If a variable is referenced inside a "grey" block, we need
                                    // to be conservative because our type inference might not work
                                    // on the round trip
                                    v = getTypeScriptStatementBlock(node, "let ");
                                }
                                else {
                                    v = getVariableSetOrChangeBlock(node.name, node.initializer, false, true);
                                }
                                v.next = current_1;
                                current_1 = v;
                            });
                            if (current_1) {
                                var r = mkStmt(ts.pxtc.ON_START_TYPE);
                                r.handlers = [{
                                        name: "HANDLER",
                                        statement: current_1
                                    }];
                                return r;
                            }
                            else {
                                maybeEmitEmptyOnStart();
                            }
                        }
                        return stmt;
                    }
                    else if (emitOnStart) {
                        maybeEmitEmptyOnStart();
                    }
                    return undefined;
                }
                function maybeEmitEmptyOnStart() {
                    if (options.alwaysEmitOnStart) {
                        write("<block type=\"" + ts.pxtc.ON_START_TYPE + "\"></block>");
                    }
                }
                function trackVariableUsage(name, type) {
                    if (varUsages[name] !== ReferenceType.InTextBlocks) {
                        varUsages[name] = type;
                    }
                }
                function trackVariableUsagesInText(node) {
                    ts.forEachChild(node, function (n) {
                        if (n.kind === SK.Identifier) {
                            trackVariableUsage(getVariableName(n), ReferenceType.InTextBlocks);
                        }
                        trackVariableUsagesInText(n);
                    });
                }
                /**
                 * Takes a series of comment ranges and converts them into string suitable for a
                 * comment block in blockly. All comments above a statement will be included,
                 * regardless of single vs multi line and whitespace. Paragraphs are delineated
                 * by empty lines between comments (a commented empty line, not an empty line
                 * between two separate comment blocks)
                 */
                function getCommentText(commentRanges) {
                    var text = "";
                    var currentLine = "";
                    for (var _i = 0, commentRanges_1 = commentRanges; _i < commentRanges_1.length; _i++) {
                        var commentRange = commentRanges_1[_i];
                        var commentText = fileText.substr(commentRange.pos, commentRange.end - commentRange.pos);
                        if (commentRange.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
                            appendMatch(commentText, singleLineCommentRegex);
                        }
                        else {
                            var lines = commentText.split("\n");
                            for (var _a = 0, lines_1 = lines; _a < lines_1.length; _a++) {
                                var line = lines_1[_a];
                                appendMatch(line, multiLineCommentRegex);
                            }
                        }
                    }
                    text += currentLine;
                    return text.trim();
                    function appendMatch(line, regex) {
                        var match = regex.exec(line);
                        if (match) {
                            var matched = match[1].trim();
                            if (matched === pxtc.ON_START_COMMENT || matched === pxtc.HANDLER_COMMENT) {
                                return;
                            }
                            if (matched) {
                                currentLine += currentLine ? " " + matched : matched;
                            }
                            else {
                                text += currentLine + "\n";
                                currentLine = "";
                            }
                        }
                    }
                }
                function trackAutoDeclaration(n) {
                    autoDeclarations.push([getVariableName(n.name), n]);
                }
                function addVariableDeclaration(node) {
                    if (node.name.kind !== SK.Identifier) {
                        error(node, pxtc.Util.lf("Variable declarations may not use binding patterns"));
                        return false;
                    }
                    else if (!node.initializer) {
                        error(node, pxtc.Util.lf("Variable declarations must have an initializer"));
                        return false;
                    }
                    return true;
                }
                function getVariableName(name) {
                    if (renameMap) {
                        var rename = renameMap.getRenameForPosition(name.getStart());
                        if (rename) {
                            return rename.name;
                        }
                    }
                    return name.text;
                }
            }
            decompiler.decompileToBlocks = decompileToBlocks;
            function checkStatement(node, env, asExpression, topLevel) {
                if (asExpression === void 0) { asExpression = false; }
                if (topLevel === void 0) { topLevel = false; }
                switch (node.kind) {
                    case SK.WhileStatement:
                    case SK.IfStatement:
                    case SK.Block:
                        return undefined;
                    case SK.ExpressionStatement:
                        return checkStatement(node.expression, env, asExpression, topLevel);
                    case SK.VariableStatement:
                        return checkVariableStatement(node, env);
                    case SK.CallExpression:
                        return checkCall(node, env, asExpression, topLevel);
                    case SK.VariableDeclaration:
                        return checkVariableDeclaration(node, env);
                    case SK.PostfixUnaryExpression:
                    case SK.PrefixUnaryExpression:
                        return checkIncrementorExpression(node);
                    case SK.FunctionExpression:
                    case SK.ArrowFunction:
                        return checkArrowFunction(node);
                    case SK.BinaryExpression:
                        return checkBinaryExpression(node, env);
                    case SK.ForStatement:
                        return checkForStatement(node);
                    case SK.ForOfStatement:
                        return checkForOfStatement(node);
                    case SK.FunctionDeclaration:
                        return checkFunctionDeclaration(node, topLevel);
                }
                return pxtc.Util.lf("Unsupported statement in block: {0}", SK[node.kind]);
                function checkForStatement(n) {
                    if (!n.initializer || !n.incrementor || !n.condition) {
                        return pxtc.Util.lf("for loops must have an initializer, incrementor, and condition");
                    }
                    if (n.initializer.kind !== SK.VariableDeclarationList) {
                        return pxtc.Util.lf("only variable declarations are permitted in for loop initializers");
                    }
                    var initializer = n.initializer;
                    if (!initializer.declarations) {
                        return pxtc.Util.lf("for loop with out-of-scope variables not supported");
                    }
                    if (initializer.declarations.length != 1) {
                        return pxtc.Util.lf("for loop with multiple variables not supported");
                    }
                    var assignment = initializer.declarations[0];
                    if (assignment.initializer.kind !== SK.NumericLiteral || assignment.initializer.text !== "0") {
                        return pxtc.Util.lf("for loop initializers must be initialized to 0");
                    }
                    var indexVar = assignment.name.text;
                    if (!incrementorIsValid(indexVar)) {
                        return pxtc.Util.lf("for loop incrementors may only increment the variable declared in the initializer");
                    }
                    if (n.condition.kind !== SK.BinaryExpression) {
                        return pxtc.Util.lf("for loop conditionals must be binary comparison operations");
                    }
                    var condition = n.condition;
                    if (condition.left.kind !== SK.Identifier || condition.left.text !== indexVar) {
                        return pxtc.Util.lf("left side of for loop conditional must be the variable declared in the initializer");
                    }
                    if (condition.operatorToken.kind !== SK.LessThanToken && condition.operatorToken.kind !== SK.LessThanEqualsToken) {
                        return pxtc.Util.lf("for loop conditional operator must be either < or <=");
                    }
                    return undefined;
                    function incrementorIsValid(varName) {
                        if (n.incrementor.kind === SK.PostfixUnaryExpression || n.incrementor.kind === SK.PrefixUnaryExpression) {
                            var incrementor = n.incrementor;
                            if (incrementor.operator === SK.PlusPlusToken && incrementor.operand.kind === SK.Identifier) {
                                return incrementor.operand.text === varName;
                            }
                        }
                        return false;
                    }
                }
                function checkForOfStatement(n) {
                    if (n.initializer.kind !== SK.VariableDeclarationList) {
                        return pxtc.Util.lf("only variable declarations are permitted in for of loop initializers");
                    }
                    // VariableDeclarationList in ForOfStatements are guranteed to have one declaration
                    return undefined;
                }
                function checkBinaryExpression(n, env) {
                    if (n.left.kind !== SK.Identifier && n.left.kind !== SK.ElementAccessExpression) {
                        return pxtc.Util.lf("Only variable names may be assigned to");
                    }
                    if (n.left.kind === SK.ElementAccessExpression) {
                        if (n.operatorToken.kind !== SK.EqualsToken) {
                            return pxtc.Util.lf("Element access expressions may only be assigned to using the equals operator");
                        }
                    }
                    else {
                        switch (n.operatorToken.kind) {
                            case SK.EqualsToken:
                                return checkExpression(n.right, env);
                            case SK.PlusEqualsToken:
                            case SK.MinusEqualsToken:
                                return undefined;
                            default:
                                return pxtc.Util.lf("Unsupported operator token in statement {0}", SK[n.operatorToken.kind]);
                        }
                    }
                    return undefined;
                }
                function checkArrowFunction(n) {
                    var fail = false;
                    if (n.parameters.length) {
                        var parent_1 = getParent(n)[0];
                        if (parent_1 && parent_1.callInfo) {
                            var callInfo = parent_1.callInfo;
                            if (callInfo.attrs.mutate === "objectdestructuring") {
                                fail = n.parameters[0].name.kind !== SK.ObjectBindingPattern;
                            }
                            else {
                                fail = n.parameters.some(function (param) { return param.name.kind !== SK.Identifier; });
                            }
                        }
                    }
                    if (fail) {
                        return pxtc.Util.lf("Unsupported parameters in error function");
                    }
                    return undefined;
                }
                function checkIncrementorExpression(n) {
                    if (n.operand.kind != SK.Identifier) {
                        return pxtc.Util.lf("-- and ++ may only be used on an identifier");
                    }
                    if (n.operator !== SK.PlusPlusToken && n.operator !== SK.MinusMinusToken) {
                        return pxtc.Util.lf("Only ++ and -- supported as prefix or postfix unary operators in a statement");
                    }
                    return undefined;
                }
                function checkVariableDeclaration(n, env) {
                    var check;
                    if (n.name.kind !== SK.Identifier) {
                        check = pxtc.Util.lf("Variable declarations may not use binding patterns");
                    }
                    else if (!n.initializer) {
                        check = pxtc.Util.lf("Variable declarations must have an initializer");
                    }
                    else if (!isAutoDeclaration(n)) {
                        check = checkExpression(n.initializer, env);
                    }
                    return check;
                }
                function checkVariableStatement(n, env) {
                    for (var _i = 0, _a = n.declarationList.declarations; _i < _a.length; _i++) {
                        var declaration = _a[_i];
                        var res = checkVariableDeclaration(declaration, env);
                        if (res) {
                            return res;
                        }
                    }
                    return undefined;
                }
                function checkCall(n, env, asExpression, topLevel) {
                    if (asExpression === void 0) { asExpression = false; }
                    if (topLevel === void 0) { topLevel = false; }
                    var info = n.callInfo;
                    if (!info) {
                        return pxtc.Util.lf("Function call not supported in the blocks");
                    }
                    if (!asExpression && info.isExpression) {
                        return pxtc.Util.lf("No output expressions as statements");
                    }
                    var hasCallback = hasArrowFunction(info);
                    if (hasCallback && !info.attrs.handlerStatement && !topLevel) {
                        return pxtc.Util.lf("Events must be top level");
                    }
                    if (!info.attrs.blockId || !info.attrs.block) {
                        var builtin = builtinBlocks[info.qName];
                        if (!builtin) {
                            if (n.arguments.length === 0 && n.expression.kind === SK.Identifier) {
                                if (!env.declaredFunctions[n.expression.text]) {
                                    return pxtc.Util.lf("Call statements must have a valid declared function");
                                }
                                else {
                                    return undefined;
                                }
                            }
                            return pxtc.Util.lf("Function call not supported in the blocks");
                        }
                        info.attrs.block = builtin.block;
                        info.attrs.blockId = builtin.blockId;
                    }
                    var params = getParameterInfo(info, env.blocks);
                    var argumentDifference = info.args.length - params.length;
                    if (info.attrs.imageLiteral) {
                        if (argumentDifference > 1) {
                            return pxtc.Util.lf("Function call has more arguments than are supported by its block");
                        }
                        var arg = n.arguments[0];
                        if (arg.kind != SK.StringLiteral && arg.kind != SK.NoSubstitutionTemplateLiteral) {
                            return pxtc.Util.lf("Only string literals supported for image literals");
                        }
                        var leds = (arg.text || '').replace(/\s+/g, '');
                        var nc = info.attrs.imageLiteral * 5;
                        if (nc * 5 != leds.length) {
                            return pxtc.Util.lf("Invalid image pattern");
                        }
                        return undefined;
                    }
                    if (argumentDifference > 0 && !checkForDestructuringMutation()) {
                        if (argumentDifference > 1 || !hasCallback) {
                            return pxtc.Util.lf("Function call has more arguments than are supported by its block");
                        }
                    }
                    var api = env.blocks.apis.byQName[info.qName];
                    if (api && api.parameters && api.parameters.length) {
                        var fail_1;
                        var instance_1 = api.kind == pxtc.SymbolKind.Method || api.kind == pxtc.SymbolKind.Property;
                        info.args.forEach(function (e, i) {
                            e = unwrapNode(e);
                            if (instance_1 && i === 0) {
                                return;
                            }
                            var paramInfo = api.parameters[instance_1 ? i - 1 : i];
                            if (paramInfo.isEnum) {
                                if (e.kind === SK.PropertyAccessExpression) {
                                    var enumName = e.expression;
                                    if (enumName.kind === SK.Identifier && enumName.text === paramInfo.type) {
                                        return;
                                    }
                                }
                                fail_1 = pxtc.Util.lf("Enum arguments may only be literal property access expressions");
                                return;
                            }
                            else if (isLiteralNode(e)) {
                                var inf = params[i];
                                if (inf.paramFieldEditor && (!inf.paramFieldEditorOptions || !inf.paramFieldEditorOptions["decompileLiterals"])) {
                                    fail_1 = pxtc.Util.lf("Field editor does not support literal arguments");
                                }
                            }
                            else if (e.kind === SK.ArrowFunction) {
                                var ar = e;
                                if (ar.parameters.length) {
                                    if (info.attrs.mutate === "objectdestructuring") {
                                        var param = unwrapNode(ar.parameters[0]);
                                        if (param.kind === SK.Parameter && param.name.kind !== SK.ObjectBindingPattern) {
                                            fail_1 = pxtc.Util.lf("Object destructuring mutation callbacks can only have destructuring patters as arguments");
                                        }
                                    }
                                    else {
                                        ar.parameters.forEach(function (param) {
                                            if (param.name.kind !== SK.Identifier) {
                                                fail_1 = pxtc.Util.lf("Only identifiers allowed as function arguments");
                                            }
                                        });
                                    }
                                }
                            }
                            else if (env.blocks.apis.byQName[paramInfo.type]) {
                                var typeInfo = env.blocks.apis.byQName[paramInfo.type];
                                if (typeInfo.attributes.fixedInstances) {
                                    var callInfo = e.callInfo;
                                    if (callInfo && callInfo.attrs.fixedInstance) {
                                        return undefined;
                                    }
                                    fail_1 = pxtc.Util.lf("Arguments of a fixed instance type must be a reference to a fixed instance declaration");
                                }
                            }
                        });
                        if (fail_1) {
                            return fail_1;
                        }
                    }
                    if (api) {
                        var ns = env.blocks.apis.byQName[api.namespace];
                        if (ns && ns.attributes.fixedInstances && info.args.length) {
                            var callInfo = info.args[0].callInfo;
                            if (!callInfo || !callInfo.attrs.fixedInstance) {
                                return pxtc.Util.lf("Fixed instance APIs can only be called directly from the fixed instance");
                            }
                        }
                    }
                    return undefined;
                    function checkForDestructuringMutation() {
                        // If the mutatePropertyEnum is set, the array literal and the destructured
                        // properties must have matching names
                        if (info.attrs.mutatePropertyEnum && argumentDifference === 2 && info.args.length >= 2) {
                            var arrayArg = info.args[info.args.length - 2];
                            var callbackArg = info.args[info.args.length - 1];
                            if (arrayArg.kind === SK.ArrayLiteralExpression && isFunctionExpression(callbackArg)) {
                                var propNames_1 = [];
                                // Make sure that all elements in the array literal are enum values
                                var allLiterals = !arrayArg.elements.some(function (e) {
                                    if (e.kind === SK.PropertyAccessExpression && e.expression.kind === SK.Identifier) {
                                        propNames_1.push(e.name.text);
                                        return e.expression.text !== info.attrs.mutatePropertyEnum;
                                    }
                                    return true;
                                });
                                if (allLiterals) {
                                    // Also need to check that the array literal's values and the destructured values match
                                    var bindings = getObjectBindingProperties(callbackArg);
                                    if (bindings) {
                                        var names_1 = bindings[0];
                                        return names_1.length === propNames_1.length && !propNames_1.some(function (p) { return names_1.indexOf(p) === -1; });
                                    }
                                }
                            }
                        }
                        return false;
                    }
                }
                function checkFunctionDeclaration(n, topLevel) {
                    if (!topLevel) {
                        return pxtc.Util.lf("Function declarations must be top level");
                    }
                    if (n.parameters.length > 0) {
                        return pxtc.Util.lf("Functions with parameters not supported in blocks");
                    }
                    var fail = false;
                    ts.forEachReturnStatement(n.body, function (stmt) {
                        if (stmt.expression) {
                            fail = true;
                        }
                    });
                    if (fail) {
                        return pxtc.Util.lf("Function with return value not supported in blocks");
                    }
                    return undefined;
                }
            }
            function isAutoDeclaration(decl) {
                if (decl.initializer) {
                    if (decl.initializer.kind === ts.SyntaxKind.NullKeyword || decl.initializer.kind === ts.SyntaxKind.FalseKeyword || isDefaultArray(decl.initializer)) {
                        return true;
                    }
                    else if (ts.isStringOrNumericLiteral(decl.initializer.kind)) {
                        var text = decl.initializer.getText();
                        return text === "0" || isEmptyString(text);
                    }
                    else {
                        var callInfo = decl.initializer.callInfo;
                        if (callInfo && callInfo.isAutoCreate)
                            return true;
                    }
                }
                return false;
            }
            function isDefaultArray(e) {
                return e.kind === SK.ArrayLiteralExpression && e.elements.length === 0;
            }
            function getCallInfo(checker, node, apiInfo) {
                var symb = checker.getSymbolAtLocation(node);
                if (symb) {
                    var qName = checker.getFullyQualifiedName(symb);
                    if (qName) {
                        return apiInfo.byQName[qName];
                    }
                }
                return undefined;
            }
            function getObjectBindingProperties(callback) {
                if (callback.parameters.length === 1 && callback.parameters[0].name.kind === SK.ObjectBindingPattern) {
                    var elements = callback.parameters[0].name.elements;
                    var renames_1 = {};
                    var properties = elements.map(function (e) {
                        if (checkName(e.propertyName) && checkName(e.name)) {
                            var name_3 = e.name.text;
                            if (e.propertyName) {
                                var propName = e.propertyName.text;
                                renames_1[propName] = name_3;
                                return propName;
                            }
                            return name_3;
                        }
                        else {
                            return "";
                        }
                    });
                    return [properties, renames_1];
                }
                return undefined;
                function checkName(name) {
                    if (name && name.kind !== SK.Identifier) {
                        // error(name, Util.lf("Only identifiers may be used for variable names in object destructuring patterns"));
                        return false;
                    }
                    return true;
                }
            }
            function checkExpression(n, env) {
                switch (n.kind) {
                    case SK.NumericLiteral:
                    case SK.TrueKeyword:
                    case SK.FalseKeyword:
                    case SK.ExpressionStatement:
                    case SK.ArrayLiteralExpression:
                    case SK.ElementAccessExpression:
                        return undefined;
                    case SK.ParenthesizedExpression:
                        return checkExpression(n.expression, env);
                    case SK.StringLiteral:
                    case SK.FirstTemplateToken:
                    case SK.NoSubstitutionTemplateLiteral:
                        return checkStringLiteral(n);
                    case SK.Identifier:
                        return isUndefined(n) ? pxtc.Util.lf("Undefined is not supported in blocks") : undefined;
                    case SK.BinaryExpression:
                        var op1 = n.operatorToken.getText();
                        return ops[op1] ? undefined : pxtc.Util.lf("Could not find operator {0}", op1);
                    case SK.PrefixUnaryExpression:
                        var op2 = n.operator;
                        return op2 === SK.MinusToken || op2 === SK.PlusToken || op2 === SK.ExclamationToken ?
                            undefined : pxtc.Util.lf("Unsupported prefix unary operator{0}", op2);
                    case SK.PropertyAccessExpression:
                        return checkPropertyAccessExpression(n);
                    case SK.CallExpression:
                        return checkStatement(n, env, true);
                }
                return pxtc.Util.lf("Unsupported syntax kind for output expression block: {0}", SK[n.kind]);
                function checkStringLiteral(n) {
                    var literal = n.text;
                    return validStringRegex.test(literal) ? undefined : pxtc.Util.lf("Only whitespace character allowed in string literals is space");
                }
                function checkPropertyAccessExpression(n) {
                    var callInfo = n.callInfo;
                    if (callInfo) {
                        if (callInfo.attrs.blockIdentity || callInfo.attrs.blockId === "lists_length" || callInfo.attrs.blockId === "text_length") {
                            return undefined;
                        }
                        else if (callInfo.decl.kind === SK.EnumMember) {
                            var _a = getParent(n), parent_2 = _a[0], child_1 = _a[1];
                            var fail_2 = true;
                            if (parent_2) {
                                var parentInfo = parent_2.callInfo;
                                if (parentInfo && parentInfo.args) {
                                    var api_1 = env.blocks.apis.byQName[parentInfo.qName];
                                    var instance_2 = api_1.kind == pxtc.SymbolKind.Method || api_1.kind == pxtc.SymbolKind.Property;
                                    if (api_1) {
                                        parentInfo.args.forEach(function (arg, i) {
                                            if (arg === child_1) {
                                                var paramInfo = api_1.parameters[instance_2 ? i - 1 : i];
                                                if (paramInfo.isEnum) {
                                                    fail_2 = false;
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                            if (fail_2) {
                                return pxtc.Util.lf("Enum value without a corresponding block");
                            }
                            else {
                                return undefined;
                            }
                        }
                        else if (callInfo.attrs.fixedInstance && n.parent) {
                            // Check if this is a fixedInstance with a method being called on it
                            if (n.parent.parent && n.parent.kind === SK.PropertyAccessExpression && n.parent.parent.kind === SK.CallExpression) {
                                var call = n.parent.parent;
                                if (call.expression === n.parent) {
                                    return undefined;
                                }
                            }
                            else if (n.parent.kind === SK.CallExpression && n.parent.expression !== n) {
                                return undefined;
                            }
                        }
                    }
                    return pxtc.Util.lf("No call info found");
                }
            }
            function getParent(node) {
                if (!node.parent) {
                    return [undefined, node];
                }
                else if (node.parent.kind === SK.ParenthesizedExpression) {
                    return getParent(node.parent);
                }
                else {
                    return [node.parent, node];
                }
            }
            function unwrapNode(node) {
                while (node.kind === SK.ParenthesizedExpression) {
                    node = node.expression;
                }
                return node;
            }
            function isEmptyString(a) {
                return a === "\"\"" || a === "''" || a === "``";
            }
            function isUndefined(node) {
                return node && node.kind === SK.Identifier && node.text === "undefined";
            }
            function hasArrowFunction(info) {
                var parameters = info.decl.parameters;
                return info.args.some(function (arg, index) { return arg && isFunctionExpression(arg); });
            }
            function isLiteralNode(node) {
                if (!node) {
                    return false;
                }
                switch (node.kind) {
                    case SK.ParenthesizedExpression:
                        return isLiteralNode(node.expression);
                    case SK.NumericLiteral:
                    case SK.StringLiteral:
                    case SK.NoSubstitutionTemplateLiteral:
                    case SK.TrueKeyword:
                    case SK.FalseKeyword:
                        return true;
                    case SK.PrefixUnaryExpression:
                        var expression = node;
                        return (expression.operator === SK.PlusToken || expression.operator === SK.MinusToken) && isLiteralNode(expression.operand);
                    default:
                        return false;
                }
            }
            function getParameterInfo(info, blocksInfo) {
                var argNames = [];
                info.attrs.block.replace(/%(\w+)(?:=(\w+))?/g, function (f, n, v) {
                    argNames.push([n, v]);
                    return "";
                });
                if (info.attrs.defaultInstance) {
                    argNames.unshift(["__instance__", undefined]);
                }
                return argNames.map(function (_a) {
                    var name = _a[0], type = _a[1];
                    var res = { name: name, type: type };
                    if (name && type) {
                        var shadowBlock = blocksInfo.blocksById[type];
                        if (shadowBlock) {
                            var fieldName_1 = '';
                            shadowBlock.attributes.block.replace(/%(\w+)/g, function (f, n) {
                                fieldName_1 = n;
                                return "";
                            });
                            res.fieldName = fieldName_1;
                            var shadowA = shadowBlock.attributes;
                            if (shadowA && shadowA.paramFieldEditor && shadowA.paramFieldEditor[fieldName_1]) {
                                if (info.attrs.paramShadowOptions && info.attrs.paramShadowOptions[name]) {
                                    res.paramShadowOptions = info.attrs.paramShadowOptions[name];
                                }
                                res.decompileLiterals = !!(shadowA.paramFieldEditorOptions && shadowA.paramFieldEditorOptions[fieldName_1] && shadowA.paramFieldEditorOptions[fieldName_1]["decompileLiterals"]);
                            }
                        }
                    }
                    if (info.attrs.paramFieldEditorOptions) {
                        res.paramFieldEditorOptions = info.attrs.paramFieldEditorOptions[name];
                    }
                    if (info.attrs.paramFieldEditor) {
                        res.paramFieldEditor = info.attrs.paramFieldEditor[name];
                    }
                    return res;
                });
            }
            function isFunctionExpression(node) {
                return node.kind === SK.ArrowFunction || node.kind === SK.FunctionExpression;
            }
        })(decompiler = pxtc.decompiler || (pxtc.decompiler = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/* Docs:
 *
 * Thumb 16-bit Instruction Set Quick Reference Card
 *   http://infocenter.arm.com/help/topic/com.arm.doc.qrc0006e/QRC0006_UAL16.pdf
 *
 * ARMv6-M Architecture Reference Manual (bit encoding of instructions)
 *   http://ecee.colorado.edu/ecen3000/labs/lab3/files/DDI0419C_arm_architecture_v6m_reference_manual.pdf
 *
 * The ARM-THUMB Procedure Call Standard
 *   http://www.cs.cornell.edu/courses/cs414/2001fa/armcallconvention.pdf
 *
 * Cortex-M0 Technical Reference Manual: 3.3. Instruction set summary (cycle counts)
 *   http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.ddi0432c/CHDCICDF.html  // M0
 *   http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.ddi0484c/CHDCICDF.html  // M0+
 */
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var thumb;
        (function (thumb) {
            var ThumbProcessor = (function (_super) {
                __extends(ThumbProcessor, _super);
                function ThumbProcessor() {
                    var _this = this;
                    _super.call(this);
                    // Registers
                    // $r0 - bits 2:1:0
                    // $r1 - bits 5:4:3
                    // $r2 - bits 7:2:1:0
                    // $r3 - bits 6:5:4:3
                    // $r4 - bits 8:7:6
                    // $r5 - bits 10:9:8
                    this.addEnc("$r0", "R0-7", function (v) { return _this.inrange(7, v, v); });
                    this.addEnc("$r1", "R0-7", function (v) { return _this.inrange(7, v, v << 3); });
                    this.addEnc("$r2", "R0-15", function (v) { return _this.inrange(15, v, (v & 7) | ((v & 8) << 4)); });
                    this.addEnc("$r3", "R0-15", function (v) { return _this.inrange(15, v, v << 3); });
                    this.addEnc("$r4", "R0-7", function (v) { return _this.inrange(7, v, v << 6); });
                    this.addEnc("$r5", "R0-7", function (v) { return _this.inrange(7, v, v << 8); });
                    // this for setting both $r0 and $r1 (two argument adds and subs)
                    this.addEnc("$r01", "R0-7", function (v) { return _this.inrange(7, v, (v | v << 3)); });
                    // Immdiates:
                    // $i0 - bits 7-0
                    // $i1 - bits 7-0 * 4
                    // $i2 - bits 6-0 * 4
                    // $i3 - bits 8-6
                    // $i4 - bits 10-6
                    // $i5 - bits 10-6 * 4
                    // $i6 - bits 10-6, 0 is 32
                    // $i7 - bits 10-6 * 2
                    this.addEnc("$i0", "#0-255", function (v) { return _this.inrange(255, v, v); });
                    this.addEnc("$i1", "#0-1020", function (v) { return _this.inrange(255, v / 4, v >> 2); });
                    this.addEnc("$i2", "#0-510", function (v) { return _this.inrange(127, v / 4, v >> 2); });
                    this.addEnc("$i3", "#0-7", function (v) { return _this.inrange(7, v, v << 6); });
                    this.addEnc("$i4", "#0-31", function (v) { return _this.inrange(31, v, v << 6); });
                    this.addEnc("$i5", "#0-124", function (v) { return _this.inrange(31, v / 4, (v >> 2) << 6); });
                    this.addEnc("$i6", "#1-32", function (v) { return v == 0 ? null : v == 32 ? 0 : _this.inrange(31, v, v << 6); });
                    this.addEnc("$i7", "#0-62", function (v) { return _this.inrange(31, v / 2, (v >> 1) << 6); });
                    this.addEnc("$i32", "#0-2^32", function (v) { return 1; });
                    this.addEnc("$rl0", "{R0-7,...}", function (v) { return _this.inrange(255, v, v); });
                    this.addEnc("$rl1", "{LR,R0-7,...}", function (v) { return (v & 0x4000) ? _this.inrange(255, (v & ~0x4000), 0x100 | (v & 0xff)) : _this.inrange(255, v, v); });
                    this.addEnc("$rl2", "{PC,R0-7,...}", function (v) { return (v & 0x8000) ? _this.inrange(255, (v & ~0x8000), 0x100 | (v & 0xff)) : _this.inrange(255, v, v); });
                    this.addEnc("$la", "LABEL", function (v) { return _this.inrange(255, v / 4, v >> 2); }).isWordAligned = true;
                    this.addEnc("$lb", "LABEL", function (v) { return _this.inrangeSigned(127, v / 2, v >> 1); });
                    this.addEnc("$lb11", "LABEL", function (v) { return _this.inrangeSigned(1023, v / 2, v >> 1); });
                    //this.addInst("nop",                   0xbf00, 0xffff);  // we use mov r8,r8 as gcc
                    this.addInst("adcs  $r0, $r1", 0x4140, 0xffc0);
                    this.addInst("add   $r2, $r3", 0x4400, 0xff00);
                    this.addInst("add   $r5, pc, $i1", 0xa000, 0xf800);
                    this.addInst("add   $r5, sp, $i1", 0xa800, 0xf800);
                    this.addInst("add   sp, $i2", 0xb000, 0xff80).canBeShared = true;
                    this.addInst("adds  $r0, $r1, $i3", 0x1c00, 0xfe00);
                    this.addInst("adds  $r0, $r1, $r4", 0x1800, 0xfe00);
                    this.addInst("adds  $r01, $r4", 0x1800, 0xfe00);
                    this.addInst("adds  $r5, $i0", 0x3000, 0xf800);
                    this.addInst("adr   $r5, $la", 0xa000, 0xf800);
                    this.addInst("ands  $r0, $r1", 0x4000, 0xffc0);
                    this.addInst("asrs  $r0, $r1", 0x4100, 0xffc0);
                    this.addInst("asrs  $r0, $r1, $i6", 0x1000, 0xf800);
                    this.addInst("bics  $r0, $r1", 0x4380, 0xffc0);
                    this.addInst("bkpt  $i0", 0xbe00, 0xff00);
                    this.addInst("blx   $r3", 0x4780, 0xff87);
                    this.addInst("bx    $r3", 0x4700, 0xff80);
                    this.addInst("cmn   $r0, $r1", 0x42c0, 0xffc0);
                    this.addInst("cmp   $r0, $r1", 0x4280, 0xffc0);
                    this.addInst("cmp   $r2, $r3", 0x4500, 0xff00);
                    this.addInst("cmp   $r5, $i0", 0x2800, 0xf800);
                    this.addInst("eors  $r0, $r1", 0x4040, 0xffc0);
                    this.addInst("ldmia $r5!, $rl0", 0xc800, 0xf800);
                    this.addInst("ldmia $r5, $rl0", 0xc800, 0xf800);
                    this.addInst("ldr   $r0, [$r1, $i5]", 0x6800, 0xf800); // this is used for debugger breakpoint - cannot be shared
                    this.addInst("ldr   $r0, [$r1, $r4]", 0x5800, 0xfe00);
                    this.addInst("ldr   $r5, [pc, $i1]", 0x4800, 0xf800);
                    this.addInst("ldr   $r5, $la", 0x4800, 0xf800);
                    this.addInst("ldr   $r5, [sp, $i1]", 0x9800, 0xf800).canBeShared = true;
                    this.addInst("ldrb  $r0, [$r1, $i4]", 0x7800, 0xf800);
                    this.addInst("ldrb  $r0, [$r1, $r4]", 0x5c00, 0xfe00);
                    this.addInst("ldrh  $r0, [$r1, $i7]", 0x8800, 0xf800);
                    this.addInst("ldrh  $r0, [$r1, $r4]", 0x5a00, 0xfe00);
                    this.addInst("ldrsb $r0, [$r1, $r4]", 0x5600, 0xfe00);
                    this.addInst("ldrsh $r0, [$r1, $r4]", 0x5e00, 0xfe00);
                    this.addInst("lsls  $r0, $r1", 0x4080, 0xffc0);
                    this.addInst("lsls  $r0, $r1, $i4", 0x0000, 0xf800);
                    this.addInst("lsrs  $r0, $r1", 0x40c0, 0xffc0);
                    this.addInst("lsrs  $r0, $r1, $i6", 0x0800, 0xf800);
                    //this.addInst("mov   $r0, $r1", 0x4600, 0xffc0);
                    this.addInst("mov   $r2, $r3", 0x4600, 0xff00);
                    this.addInst("movs  $r0, $r1", 0x0000, 0xffc0);
                    this.addInst("movs  $r5, $i0", 0x2000, 0xf800);
                    this.addInst("muls  $r0, $r1", 0x4340, 0xffc0);
                    this.addInst("mvns  $r0, $r1", 0x43c0, 0xffc0);
                    this.addInst("negs  $r0, $r1", 0x4240, 0xffc0);
                    this.addInst("nop", 0x46c0, 0xffff); // mov r8, r8
                    this.addInst("orrs  $r0, $r1", 0x4300, 0xffc0);
                    this.addInst("pop   $rl2", 0xbc00, 0xfe00);
                    this.addInst("push  $rl1", 0xb400, 0xfe00);
                    this.addInst("rev   $r0, $r1", 0xba00, 0xffc0);
                    this.addInst("rev16 $r0, $r1", 0xba40, 0xffc0);
                    this.addInst("revsh $r0, $r1", 0xbac0, 0xffc0);
                    this.addInst("rors  $r0, $r1", 0x41c0, 0xffc0);
                    this.addInst("sbcs  $r0, $r1", 0x4180, 0xffc0);
                    this.addInst("sev", 0xbf40, 0xffff);
                    this.addInst("stmia $r5!, $rl0", 0xc000, 0xf800);
                    this.addInst("str   $r0, [$r1, $i5]", 0x6000, 0xf800).canBeShared = true;
                    this.addInst("str   $r0, [$r1, $r4]", 0x5000, 0xfe00);
                    this.addInst("str   $r5, [sp, $i1]", 0x9000, 0xf800).canBeShared = true;
                    this.addInst("strb  $r0, [$r1, $i4]", 0x7000, 0xf800);
                    this.addInst("strb  $r0, [$r1, $r4]", 0x5400, 0xfe00);
                    this.addInst("strh  $r0, [$r1, $i7]", 0x8000, 0xf800);
                    this.addInst("strh  $r0, [$r1, $r4]", 0x5200, 0xfe00);
                    this.addInst("sub   sp, $i2", 0xb080, 0xff80);
                    this.addInst("subs  $r0, $r1, $i3", 0x1e00, 0xfe00);
                    this.addInst("subs  $r0, $r1, $r4", 0x1a00, 0xfe00);
                    this.addInst("subs  $r01, $r4", 0x1a00, 0xfe00);
                    this.addInst("subs  $r5, $i0", 0x3800, 0xf800);
                    this.addInst("svc   $i0", 0xdf00, 0xff00);
                    this.addInst("sxtb  $r0, $r1", 0xb240, 0xffc0);
                    this.addInst("sxth  $r0, $r1", 0xb200, 0xffc0);
                    this.addInst("tst   $r0, $r1", 0x4200, 0xffc0);
                    this.addInst("udf   $i0", 0xde00, 0xff00);
                    this.addInst("uxtb  $r0, $r1", 0xb2c0, 0xffc0);
                    this.addInst("uxth  $r0, $r1", 0xb280, 0xffc0);
                    this.addInst("wfe", 0xbf20, 0xffff);
                    this.addInst("wfi", 0xbf30, 0xffff);
                    this.addInst("yield", 0xbf10, 0xffff);
                    this.addInst("cpsid i", 0xb672, 0xffff);
                    this.addInst("cpsie i", 0xb662, 0xffff);
                    this.addInst("beq   $lb", 0xd000, 0xff00);
                    this.addInst("bne   $lb", 0xd100, 0xff00);
                    this.addInst("bcs   $lb", 0xd200, 0xff00);
                    this.addInst("bcc   $lb", 0xd300, 0xff00);
                    this.addInst("bmi   $lb", 0xd400, 0xff00);
                    this.addInst("bpl   $lb", 0xd500, 0xff00);
                    this.addInst("bvs   $lb", 0xd600, 0xff00);
                    this.addInst("bvc   $lb", 0xd700, 0xff00);
                    this.addInst("bhi   $lb", 0xd800, 0xff00);
                    this.addInst("bls   $lb", 0xd900, 0xff00);
                    this.addInst("bge   $lb", 0xda00, 0xff00);
                    this.addInst("blt   $lb", 0xdb00, 0xff00);
                    this.addInst("bgt   $lb", 0xdc00, 0xff00);
                    this.addInst("ble   $lb", 0xdd00, 0xff00);
                    this.addInst("bhs   $lb", 0xd200, 0xff00); // cs
                    this.addInst("blo   $lb", 0xd300, 0xff00); // cc
                    this.addInst("b     $lb11", 0xe000, 0xf800);
                    this.addInst("bal   $lb11", 0xe000, 0xf800);
                    // handled specially - 32 bit instruction
                    this.addInst("bl    $lb", 0xf000, 0xf800, true);
                    // this is normally emitted as 'b' but will be emitted as 'bl' if needed
                    this.addInst("bb    $lb", 0xe000, 0xf800, true);
                    // this will emit as PC-relative LDR or ADDS
                    this.addInst("ldlit   $r5, $i32", 0x4800, 0xf800);
                }
                ThumbProcessor.prototype.toFnPtr = function (v, baseOff) {
                    return (v + baseOff) | 1;
                };
                ThumbProcessor.prototype.wordSize = function () {
                    return 4;
                };
                ThumbProcessor.prototype.is32bit = function (i) {
                    return i.name == "bl" || i.name == "bb";
                };
                ThumbProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    v = v & 0xfffffffe;
                    v -= f.baseOffset;
                    return v;
                };
                ThumbProcessor.prototype.emit32 = function (v0, v, actual) {
                    if (v % 2)
                        return pxtc.assembler.emitErr("uneven BL?", actual);
                    var off = v / 2;
                    pxtc.assert(off != null);
                    // Range is +-4M (i.e., 2M instructions)
                    if ((off | 0) != off ||
                        !(-2 * 1024 * 1024 < off && off < 2 * 1024 * 1024))
                        return pxtc.assembler.emitErr("jump out of range", actual);
                    // note that off is already in instructions, not bytes
                    var imm11 = off & 0x7ff;
                    var imm10 = (off >> 11) & 0x3ff;
                    return {
                        opcode: (off & 0xf0000000) ? (0xf400 | imm10) : (0xf000 | imm10),
                        opcode2: (0xf800 | imm11),
                        stack: 0,
                        numArgs: [v],
                        labelName: actual
                    };
                };
                ThumbProcessor.prototype.commonalize = function (file) {
                    // this is a heuristic - we could allow more instructions
                    // to be shared, but it seems to result in less sharing
                    var canBeShared = function (l) {
                        if (l.type == "empty")
                            return true;
                        if (l.type == "instruction") {
                            var inst = l.instruction;
                            if (inst && inst.canBeShared)
                                return true;
                            switch (l.words[0]) {
                                case "pop":
                                case "push":
                                    if (l.numArgs[0] & ~0xf)
                                        return false; // we only allow r0-r3
                                    return true;
                                case "bl":
                                    switch (l.words[1]) {
                                        case "pxt::incr":
                                        case "pxt::decr":
                                        case "pxt::fromInt":
                                            return true;
                                        default:
                                            return false;
                                    }
                                default:
                                    return false;
                            }
                        }
                        return false;
                    };
                    var frag = [];
                    var frags = {};
                    var lastLine = -1;
                    for (var i = 0; i < file.lines.length; ++i) {
                        var l = file.lines[i];
                        //console.log(i, l.text)
                        if (l.type == "empty")
                            continue;
                        if (canBeShared(l)) {
                            frag.push(l);
                        }
                        else {
                            if (l.words[0] == "_js_end")
                                lastLine = i;
                            if (frag.length > 2) {
                                var key = "";
                                for (var _i = 0, frag_1 = frag; _i < frag_1.length; _i++) {
                                    var ll = frag_1[_i];
                                    if (ll.type == "empty")
                                        continue;
                                    pxtc.assert(!!ll.instruction);
                                    pxtc.assert(!!ll.opcode);
                                    if (key)
                                        key += ",";
                                    if (ll.words[0] == "bl") {
                                        key += "BL " + ll.words[1];
                                    }
                                    else {
                                        key += ll.opcode;
                                    }
                                }
                                if (frags[key])
                                    frags[key].push(frag);
                                else
                                    frags[key] = [frag];
                            }
                            frag = [];
                        }
                    }
                    if (lastLine < 0)
                        return; // testing?
                    for (var _a = 0, _b = Object.keys(frags); _a < _b.length; _a++) {
                        var k = _b[_a];
                        var f = frags[k];
                        if (f.length == 1) {
                            if (f[0].length > 3) {
                                //console.log(k)
                                var kleft = k.split(",");
                                var kright = kleft.slice();
                                var left = f[0].slice();
                                var right = f[0].slice();
                                var res = null;
                                var reskey = "";
                                while (left.length >= 3) {
                                    kleft.pop();
                                    left.pop();
                                    right.shift();
                                    kright.shift();
                                    reskey = kleft.join(",");
                                    var other = frags[reskey];
                                    if (other && other.length) {
                                        res = left;
                                        break;
                                    }
                                    reskey = kright.join(",");
                                    other = frags[reskey];
                                    if (other && other.length) {
                                        res = right;
                                        break;
                                    }
                                }
                                if (res) {
                                    frags[k] = [];
                                    frags[reskey].push(res);
                                }
                            }
                        }
                    }
                    var addLines = [];
                    var seq = 0;
                    for (var _c = 0, _d = Object.keys(frags); _c < _d.length; _c++) {
                        var k = _d[_c];
                        var f = frags[k];
                        if (f.length <= 1)
                            continue;
                        if (addLines.length == 0) {
                            file.buildLine("; shared assembly fragments", addLines);
                            file.buildLine("@nostackcheck", addLines);
                            file.buildLine("_frag_start:", addLines);
                        }
                        var hasBL = k.indexOf("BL") >= 0;
                        var lbl = "_frag_" + ++seq;
                        file.buildLine("; num.uses: " + f.length, addLines);
                        file.buildLine(lbl + ":", addLines);
                        if (hasBL)
                            file.buildLine("mov r7, lr", addLines);
                        var stack = 0;
                        for (var _e = 0, _f = f[0]; _e < _f.length; _e++) {
                            var l = _f[_e];
                            var tx = l.text.replace(/;.*/, "");
                            if (/@\d/.test(tx))
                                tx = ".short " + l.opcode + " ; " + tx;
                            file.buildLine(tx, addLines);
                            stack += l.stack;
                        }
                        file.buildLine(hasBL ? "bx r7" : "bx lr", addLines);
                        for (var _g = 0, f_1 = f; _g < f_1.length; _g++) {
                            var frag_2 = f_1[_g];
                            frag_2[0].update("bl " + lbl);
                            frag_2[1].update("@dummystack " + stack);
                            for (var ii = 2; ii < frag_2.length; ++ii)
                                frag_2[ii].update("");
                        }
                    }
                    if (addLines.length > 0) {
                        file.lines = file.lines.slice(0, lastLine).concat(addLines).concat(file.lines.slice(lastLine));
                    }
                };
                ThumbProcessor.prototype.expandLdlit = function (f) {
                    var nextGoodSpot;
                    var needsJumpOver = false;
                    var outlines = [];
                    var values = {};
                    var seq = 1;
                    for (var i = 0; i < f.lines.length; ++i) {
                        var line = f.lines[i];
                        outlines.push(line);
                        if (line.type == "instruction" && line.instruction && line.instruction.name == "ldlit") {
                            if (!nextGoodSpot) {
                                var limit = line.location + 900; // leave some space - real limit is 1020
                                var j = i + 1;
                                for (; j < f.lines.length; ++j) {
                                    if (f.lines[j].location > limit)
                                        break;
                                    var op = f.lines[j].getOp();
                                    if (op == "b" || op == "bb" || (op == "pop" && f.lines[j].words[2] == "pc"))
                                        nextGoodSpot = f.lines[j];
                                }
                                if (nextGoodSpot) {
                                    needsJumpOver = false;
                                }
                                else {
                                    needsJumpOver = true;
                                    while (--j > i) {
                                        if (f.lines[j].type == "instruction") {
                                            nextGoodSpot = f.lines[j];
                                            break;
                                        }
                                    }
                                }
                            }
                            var reg = line.words[1];
                            var v = line.words[3];
                            var lbl = pxtc.U.lookup(values, v);
                            if (!lbl) {
                                lbl = "_ldlit_" + ++seq;
                                values[v] = lbl;
                            }
                            line.update("ldr " + reg + ", " + lbl);
                        }
                        if (line === nextGoodSpot) {
                            nextGoodSpot = null;
                            var txtLines = [];
                            var jmplbl = "_jmpwords_" + ++seq;
                            if (needsJumpOver)
                                txtLines.push("bb " + jmplbl);
                            txtLines.push(".balign 4");
                            for (var _i = 0, _a = Object.keys(values); _i < _a.length; _i++) {
                                var v = _a[_i];
                                var lbl = values[v];
                                txtLines.push(lbl + ": .word " + v);
                            }
                            if (needsJumpOver)
                                txtLines.push(jmplbl + ":");
                            for (var _b = 0, txtLines_1 = txtLines; _b < txtLines_1.length; _b++) {
                                var t = txtLines_1[_b];
                                f.buildLine(t, outlines);
                                var ll = outlines[outlines.length - 1];
                                ll.scope = line.scope;
                                ll.lineNo = line.lineNo;
                            }
                            values = {};
                        }
                    }
                    f.lines = outlines;
                };
                ThumbProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    var l = f.lookupLabel(s);
                    if (l == null)
                        return null;
                    var pc = f.location() + 4;
                    if (wordAligned)
                        pc = pc & 0xfffffffc;
                    return l - pc;
                };
                ThumbProcessor.prototype.isPop = function (opcode) {
                    return opcode == 0xbc00;
                };
                ThumbProcessor.prototype.isPush = function (opcode) {
                    return opcode == 0xb400;
                };
                ThumbProcessor.prototype.isAddSP = function (opcode) {
                    return opcode == 0xb000;
                };
                ThumbProcessor.prototype.isSubSP = function (opcode) {
                    return opcode == 0xb080;
                };
                ThumbProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    var lb11 = this.encoders["$lb11"];
                    var lb = this.encoders["$lb"];
                    var lnop = ln.getOp();
                    var isSkipBranch = false;
                    if (lnop == "bne" || lnop == "beq") {
                        if (lnNext.getOp() == "b" && ln.numArgs[0] == 0)
                            isSkipBranch = true;
                        if (lnNext.getOp() == "bb" && ln.numArgs[0] == 2)
                            isSkipBranch = true;
                    }
                    if (lnop == "bb" && lb11.encode(ln.numArgs[0]) != null) {
                        // RULE: bb .somewhere -> b .somewhere (if fits)
                        ln.update("b " + ln.words[1]);
                    }
                    else if (lnop == "b" && ln.numArgs[0] == -2) {
                        // RULE: b .somewhere; .somewhere: -> .somewhere:
                        ln.update("");
                    }
                    else if (lnop == "bne" && isSkipBranch && lb.encode(lnNext.numArgs[0]) != null) {
                        // RULE: bne .next; b .somewhere; .next: -> beq .somewhere
                        ln.update("beq " + lnNext.words[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "beq" && isSkipBranch && lb.encode(lnNext.numArgs[0]) != null) {
                        // RULE: beq .next; b .somewhere; .next: -> bne .somewhere
                        ln.update("bne " + lnNext.words[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "push" && lnNext.getOp() == "pop" && ln.numArgs[0] == lnNext.numArgs[0]) {
                        // RULE: push {X}; pop {X} -> nothing
                        pxtc.assert(ln.numArgs[0] > 0);
                        ln.update("");
                        lnNext.update("");
                    }
                    else if (lnop == "push" && lnNext.getOp() == "pop" &&
                        ln.words.length == 4 &&
                        lnNext.words.length == 4) {
                        // RULE: push {rX}; pop {rY} -> mov rY, rX
                        pxtc.assert(ln.words[1] == "{");
                        ln.update("mov " + lnNext.words[2] + ", " + ln.words[2]);
                        lnNext.update("");
                    }
                    else if (lnNext2 && ln.getOpExt() == "movs $r5, $i0" && lnNext.getOpExt() == "mov $r0, $r1" &&
                        ln.numArgs[0] == lnNext.numArgs[1] &&
                        clobbersReg(lnNext2, ln.numArgs[0])) {
                        // RULE: movs rX, #V; mov rY, rX; clobber rX -> movs rY, #V
                        ln.update("movs r" + lnNext.numArgs[0] + ", #" + ln.numArgs[1]);
                        lnNext.update("");
                    }
                    else if (lnop == "pop" && singleReg(ln) >= 0 && lnNext.getOp() == "push" &&
                        singleReg(ln) == singleReg(lnNext)) {
                        // RULE: pop {rX}; push {rX} -> ldr rX, [sp, #0]
                        ln.update("ldr r" + singleReg(ln) + ", [sp, #0]");
                        lnNext.update("");
                    }
                    else if (lnNext2 && lnop == "push" && singleReg(ln) >= 0 && preservesReg(lnNext, singleReg(ln)) &&
                        lnNext2.getOp() == "pop" && singleReg(ln) == singleReg(lnNext2)) {
                        // RULE: push {rX}; movs rY, #V; pop {rX} -> movs rY, #V (when X != Y)
                        ln.update("");
                        lnNext2.update("");
                    }
                };
                ThumbProcessor.prototype.registerNo = function (actual) {
                    if (!actual)
                        return null;
                    actual = actual.toLowerCase();
                    switch (actual) {
                        case "pc":
                            actual = "r15";
                            break;
                        case "lr":
                            actual = "r14";
                            break;
                        case "sp":
                            actual = "r13";
                            break;
                    }
                    var m = /^r(\d+)$/.exec(actual);
                    if (m) {
                        var r = parseInt(m[1], 10);
                        if (0 <= r && r < 16)
                            return r;
                    }
                    return null;
                };
                ThumbProcessor.prototype.testAssembler = function () {
                    pxtc.assembler.expectError(this, "lsl r0, r0, #8");
                    pxtc.assembler.expectError(this, "push {pc,lr}");
                    pxtc.assembler.expectError(this, "push {r17}");
                    pxtc.assembler.expectError(this, "mov r0, r1 foo");
                    pxtc.assembler.expectError(this, "movs r14, #100");
                    pxtc.assembler.expectError(this, "push {r0");
                    pxtc.assembler.expectError(this, "push lr,r0}");
                    pxtc.assembler.expectError(this, "pop {lr,r0}");
                    pxtc.assembler.expectError(this, "b #+11");
                    pxtc.assembler.expectError(this, "b #+102400");
                    pxtc.assembler.expectError(this, "bne undefined_label");
                    pxtc.assembler.expectError(this, ".foobar");
                    pxtc.assembler.expect(this, "0200      lsls    r0, r0, #8\n" +
                        "b500      push    {lr}\n" +
                        "2064      movs    r0, #100        ; 0x64\n" +
                        "b401      push    {r0}\n" +
                        "bc08      pop     {r3}\n" +
                        "b501      push    {r0, lr}\n" +
                        "bd20      pop {r5, pc}\n" +
                        "bc01      pop {r0}\n" +
                        "4770      bx      lr\n" +
                        "0000      .balign 4\n" +
                        "e6c0      .word   -72000\n" +
                        "fffe\n");
                    pxtc.assembler.expect(this, "4291      cmp     r1, r2\n" +
                        "d100      bne     l6\n" +
                        "e000      b       l8\n" +
                        "1840  l6: adds    r0, r0, r1\n" +
                        "4718  l8: bx      r3\n");
                    pxtc.assembler.expect(this, "          @stackmark base\n" +
                        "b403      push    {r0, r1}\n" +
                        "          @stackmark locals\n" +
                        "9801      ldr     r0, [sp, locals@1]\n" +
                        "b401      push    {r0}\n" +
                        "9802      ldr     r0, [sp, locals@1]\n" +
                        "bc01      pop     {r0}\n" +
                        "          @stackempty locals\n" +
                        "9901      ldr     r1, [sp, locals@1]\n" +
                        "9102      str     r1, [sp, base@0]\n" +
                        "          @stackempty locals\n" +
                        "b002      add     sp, #8\n" +
                        "          @stackempty base\n");
                    pxtc.assembler.expect(this, "b090      sub sp, #4*16\n" +
                        "b010      add sp, #4*16\n");
                    pxtc.assembler.expect(this, "6261      .string \"abc\"\n" +
                        "0063      \n");
                    pxtc.assembler.expect(this, "6261      .string \"abcde\"\n" +
                        "6463      \n" +
                        "0065      \n");
                    pxtc.assembler.expect(this, "3042      adds r0, 0x42\n" +
                        "1c0d      adds r5, r1, #0\n" +
                        "d100      bne #0\n" +
                        "2800      cmp r0, #0\n" +
                        "6b28      ldr r0, [r5, #48]\n" +
                        "0200      lsls r0, r0, #8\n" +
                        "2063      movs r0, 0x63\n" +
                        "4240      negs r0, r0\n" +
                        "46c0      nop\n" +
                        "b500      push {lr}\n" +
                        "b401      push {r0}\n" +
                        "b402      push {r1}\n" +
                        "b404      push {r2}\n" +
                        "b408      push {r3}\n" +
                        "b520      push {r5, lr}\n" +
                        "bd00      pop {pc}\n" +
                        "bc01      pop {r0}\n" +
                        "bc02      pop {r1}\n" +
                        "bc04      pop {r2}\n" +
                        "bc08      pop {r3}\n" +
                        "bd20      pop {r5, pc}\n" +
                        "9003      str r0, [sp, #4*3]\n");
                };
                return ThumbProcessor;
            }(pxtc.assembler.AbstractProcessor));
            thumb.ThumbProcessor = ThumbProcessor;
            // if true then instruction doesn't write r<n> and doesn't read/write memory
            function preservesReg(ln, n) {
                if (ln.getOpExt() == "movs $r5, $i0" && ln.numArgs[0] != n)
                    return true;
                return false;
            }
            function clobbersReg(ln, n) {
                // TODO add some more
                if (ln.getOp() == "pop" && ln.numArgs[0] & (1 << n))
                    return true;
                return false;
            }
            function singleReg(ln) {
                pxtc.assert(ln.getOp() == "push" || ln.getOp() == "pop");
                var k = 0;
                var ret = -1;
                var v = ln.numArgs[0];
                while (v > 0) {
                    if (v & 1) {
                        if (ret == -1)
                            ret = k;
                        else
                            ret = -2;
                    }
                    v >>= 1;
                    k++;
                }
                if (ret >= 0)
                    return ret;
                else
                    return -1;
            }
        })(thumb = pxtc.thumb || (pxtc.thumb = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var ir;
        (function (ir) {
            var U = pxtc.Util;
            var assert = U.assert;
            (function (EK) {
                EK[EK["None"] = 0] = "None";
                EK[EK["NumberLiteral"] = 1] = "NumberLiteral";
                EK[EK["PointerLiteral"] = 2] = "PointerLiteral";
                EK[EK["RuntimeCall"] = 3] = "RuntimeCall";
                EK[EK["ProcCall"] = 4] = "ProcCall";
                EK[EK["SharedRef"] = 5] = "SharedRef";
                EK[EK["SharedDef"] = 6] = "SharedDef";
                EK[EK["FieldAccess"] = 7] = "FieldAccess";
                EK[EK["Store"] = 8] = "Store";
                EK[EK["CellRef"] = 9] = "CellRef";
                EK[EK["Incr"] = 10] = "Incr";
                EK[EK["Decr"] = 11] = "Decr";
                EK[EK["Sequence"] = 12] = "Sequence";
                EK[EK["JmpValue"] = 13] = "JmpValue";
                EK[EK["Nop"] = 14] = "Nop";
            })(ir.EK || (ir.EK = {}));
            var EK = ir.EK;
            var currExprId = 0;
            var Node = (function () {
                function Node() {
                }
                Node.prototype.isExpr = function () { return false; };
                Node.prototype.isStmt = function () { return false; };
                Node.prototype.getId = function () {
                    if (!this._id)
                        this._id = ++currExprId;
                    return this._id;
                };
                return Node;
            }());
            ir.Node = Node;
            var Expr = (function (_super) {
                __extends(Expr, _super);
                function Expr(exprKind, args, data) {
                    _super.call(this);
                    this.exprKind = exprKind;
                    this.args = args;
                    this.data = data;
                    this.callingConvention = ir.CallingConvention.Plain;
                }
                Expr.clone = function (e) {
                    var copy = new Expr(e.exprKind, e.args.slice(0), e.data);
                    if (e.jsInfo)
                        copy.jsInfo = e.jsInfo;
                    if (e.totalUses) {
                        copy.totalUses = e.totalUses;
                        copy.currUses = e.currUses;
                    }
                    copy.callingConvention = e.callingConvention;
                    return copy;
                };
                Expr.prototype.isExpr = function () { return true; };
                Expr.prototype.isPure = function () {
                    return this.isStateless() || this.exprKind == EK.CellRef;
                };
                Expr.prototype.isStateless = function () {
                    switch (this.exprKind) {
                        case EK.NumberLiteral:
                        case EK.PointerLiteral:
                        case EK.SharedRef:
                            return true;
                        default: return false;
                    }
                };
                Expr.prototype.sharingInfo = function () {
                    var arg0 = this;
                    if (this.exprKind == EK.SharedRef || this.exprKind == EK.SharedDef) {
                        arg0 = this.args[0];
                        if (!arg0)
                            arg0 = { currUses: "", totalUses: "" };
                    }
                    return arg0.currUses + "/" + arg0.totalUses;
                };
                Expr.prototype.toString = function () {
                    return nodeToString(this);
                };
                Expr.prototype.canUpdateCells = function () {
                    switch (this.exprKind) {
                        case EK.NumberLiteral:
                        case EK.PointerLiteral:
                        case EK.CellRef:
                        case EK.JmpValue:
                        case EK.SharedRef:
                        case EK.Nop:
                            return false;
                        case EK.SharedDef:
                        case EK.Incr:
                        case EK.Decr:
                        case EK.FieldAccess:
                            return this.args[0].canUpdateCells();
                        case EK.RuntimeCall:
                        case EK.ProcCall:
                        case EK.Sequence:
                            return true;
                        case EK.Store:
                            return true;
                        default: throw pxtc.oops();
                    }
                };
                return Expr;
            }(Node));
            ir.Expr = Expr;
            (function (SK) {
                SK[SK["None"] = 0] = "None";
                SK[SK["Expr"] = 1] = "Expr";
                SK[SK["Label"] = 2] = "Label";
                SK[SK["Jmp"] = 3] = "Jmp";
                SK[SK["StackEmpty"] = 4] = "StackEmpty";
                SK[SK["Breakpoint"] = 5] = "Breakpoint";
            })(ir.SK || (ir.SK = {}));
            var SK = ir.SK;
            (function (JmpMode) {
                JmpMode[JmpMode["Always"] = 1] = "Always";
                JmpMode[JmpMode["IfZero"] = 2] = "IfZero";
                JmpMode[JmpMode["IfNotZero"] = 3] = "IfNotZero";
                JmpMode[JmpMode["IfJmpValEq"] = 4] = "IfJmpValEq";
                JmpMode[JmpMode["IfLambda"] = 5] = "IfLambda";
            })(ir.JmpMode || (ir.JmpMode = {}));
            var JmpMode = ir.JmpMode;
            var Stmt = (function (_super) {
                __extends(Stmt, _super);
                function Stmt(stmtKind, expr) {
                    _super.call(this);
                    this.stmtKind = stmtKind;
                    this.expr = expr;
                }
                Stmt.prototype.isStmt = function () { return true; };
                Stmt.prototype.toString = function () {
                    return nodeToString(this);
                };
                return Stmt;
            }(Node));
            ir.Stmt = Stmt;
            function nodeToString(n) {
                return str(n);
                function str(n) {
                    if (n.isExpr()) {
                        var e = n;
                        var a0 = e.args ? e.args[0] : null;
                        switch (e.exprKind) {
                            case EK.NumberLiteral:
                                return e.data + "";
                            case EK.PointerLiteral:
                                return e.data + "";
                            case EK.CellRef:
                                return e.data.toString();
                            case EK.JmpValue:
                                return "JMPVALUE";
                            case EK.Nop:
                                return "NOP";
                            case EK.SharedRef:
                                return "SHARED_REF(#" + a0.getId() + ")";
                            case EK.SharedDef:
                                return "SHARED_DEF(#" + a0.getId() + ": " + str(a0) + ")";
                            case EK.Incr:
                                return "INCR(" + str(a0) + ")";
                            case EK.Decr:
                                return "DECR(" + str(a0) + ")";
                            case EK.FieldAccess:
                                return str(a0) + "." + e.data.name;
                            case EK.RuntimeCall:
                                return e.data + "(" + e.args.map(str).join(", ") + ")";
                            case EK.ProcCall:
                                var procid = e.data;
                                var name_4 = "";
                                if (procid.ifaceIndex != null)
                                    name_4 = "IFACE@" + procid.ifaceIndex;
                                else if (procid.virtualIndex != null)
                                    name_4 = "VTABLE@" + procid.virtualIndex;
                                else
                                    name_4 = pxtc.getDeclName(procid.proc.action);
                                return name_4 + "(" + e.args.map(str).join(", ") + ")";
                            case EK.Sequence:
                                return "(" + e.args.map(str).join("; ") + ")";
                            case EK.Store:
                                return "{ " + str(e.args[0]) + " := " + str(e.args[1]) + " }";
                            default: throw pxtc.oops();
                        }
                    }
                    else {
                        var stmt_1 = n;
                        var inner = stmt_1.expr ? str(stmt_1.expr) : "{null}";
                        switch (stmt_1.stmtKind) {
                            case ir.SK.Expr:
                                return "    " + inner + "\n";
                            case ir.SK.Jmp:
                                var fin = "goto " + stmt_1.lblName + "\n";
                                switch (stmt_1.jmpMode) {
                                    case JmpMode.Always:
                                        if (stmt_1.expr)
                                            return "    { JMPVALUE := " + inner + " } " + fin;
                                        else
                                            return "    " + fin;
                                    case JmpMode.IfZero:
                                        return "    if (! " + inner + ") " + fin;
                                    case JmpMode.IfNotZero:
                                        return "    if (" + inner + ") " + fin;
                                    case JmpMode.IfJmpValEq:
                                        return "    if (r0 == " + inner + ") " + fin;
                                    case JmpMode.IfLambda:
                                        return "    if (LAMBDA) return " + inner;
                                    default: throw pxtc.oops();
                                }
                            case ir.SK.StackEmpty:
                                return "    ;\n";
                            case ir.SK.Breakpoint:
                                return "    // brk " + (stmt_1.breakpointInfo.id) + "\n";
                            case ir.SK.Label:
                                return stmt_1.lblName + ":\n";
                            default: throw pxtc.oops();
                        }
                    }
                }
            }
            var Cell = (function () {
                function Cell(index, def, info) {
                    this.index = index;
                    this.def = def;
                    this.info = info;
                    this.isarg = false;
                    this.iscap = false;
                    this._isRef = false;
                    this._isLocal = false;
                    this._isGlobal = false;
                    this._debugType = "?";
                    this.bitSize = 0 /* None */;
                    if (def && info) {
                        pxtc.setCellProps(this);
                    }
                }
                Cell.prototype.getName = function () {
                    return pxtc.getDeclName(this.def);
                };
                Cell.prototype.getDebugInfo = function () {
                    return {
                        name: this.getName(),
                        type: this._debugType,
                        index: this.index,
                    };
                };
                Cell.prototype.toString = function () {
                    var n = "";
                    if (this.def)
                        n += this.getName() || "?";
                    if (this.isarg)
                        n = "ARG " + n;
                    if (this.isRef())
                        n = "REF " + n;
                    //if (this.isByRefLocal()) n = "BYREF " + n
                    return "[" + n + "]";
                };
                Cell.prototype.uniqueName = function () {
                    if (this.isarg)
                        return "arg" + this.index; // have to keep names stable for inheritance
                    return this.getName().replace(/[^\w]/g, "_") + "___" + pxtc.getNodeId(this.def);
                };
                Cell.prototype.refSuffix = function () {
                    if (this.isRef())
                        return "Ref";
                    else
                        return "";
                };
                Cell.prototype.isRef = function () { return this._isRef; };
                Cell.prototype.isLocal = function () { return this._isLocal; };
                Cell.prototype.isGlobal = function () { return this._isGlobal; };
                Cell.prototype.loadCore = function () {
                    return op(EK.CellRef, null, this);
                };
                Cell.prototype.load = function () {
                    var r = this.loadCore();
                    if (pxtc.target.taggedInts && this.bitSize != 0 /* None */) {
                        if (this.bitSize == 6 /* UInt32 */)
                            return rtcall("pxt::fromUInt", [r]);
                        return rtcall("pxt::fromInt", [r]);
                    }
                    if (this.isByRefLocal())
                        return rtcall("pxtrt::ldloc" + this.refSuffix(), [r]);
                    if (this.refCountingHandledHere())
                        return op(EK.Incr, [r]);
                    return r;
                };
                Cell.prototype.refCountingHandledHere = function () {
                    return this.isRef() && !this.isByRefLocal();
                };
                Cell.prototype.isByRefLocal = function () {
                    return this.isLocal() && this.info.captured && this.info.written;
                };
                Cell.prototype.storeDirect = function (src) {
                    return op(EK.Store, [this.loadCore(), src]);
                };
                Cell.prototype.storeByRef = function (src) {
                    if (this.isByRefLocal()) {
                        return rtcall("pxtrt::stloc" + this.refSuffix(), [this.loadCore(), src]);
                    }
                    else {
                        if (pxtc.target.taggedInts && this.bitSize != 0 /* None */) {
                            src = shared(src);
                            var cnv = this.bitSize == 6 /* UInt32 */ ? "pxt::toUInt" : "pxt::toInt";
                            var iv = shared(rtcall(cnv, [src]));
                            return op(EK.Sequence, [
                                iv,
                                op(EK.Decr, [src]),
                                this.storeDirect(iv)
                            ]);
                        }
                        if (this.refCountingHandledHere()) {
                            var tmp = shared(src);
                            return op(EK.Sequence, [
                                tmp,
                                op(EK.Decr, [this.loadCore()]),
                                this.storeDirect(tmp)
                            ]);
                        }
                        else {
                            return this.storeDirect(src);
                        }
                    }
                };
                Object.defineProperty(Cell.prototype, "isTemporary", {
                    get: function () {
                        return false;
                    },
                    enumerable: true,
                    configurable: true
                });
                return Cell;
            }());
            ir.Cell = Cell;
            //Cells that represent variables that are generated by the compiler as temporaries
            //The user cannot access these cells from JS or blocks
            var UnnamedCell = (function (_super) {
                __extends(UnnamedCell, _super);
                function UnnamedCell(index, owningProc) {
                    _super.call(this, index, null, null);
                    this.index = index;
                    this.owningProc = owningProc;
                    this.uid = UnnamedCell.unnamedCellCounter++;
                }
                UnnamedCell.prototype.getName = function () {
                    return "unnamed" + this.uid;
                };
                UnnamedCell.prototype.uniqueName = function () {
                    return this.getName() + "___U" + this.index;
                };
                UnnamedCell.prototype.isByRefLocal = function () {
                    return false;
                };
                Object.defineProperty(UnnamedCell.prototype, "isTemporary", {
                    get: function () {
                        return true;
                    },
                    enumerable: true,
                    configurable: true
                });
                UnnamedCell.unnamedCellCounter = 0;
                return UnnamedCell;
            }(Cell));
            ir.UnnamedCell = UnnamedCell;
            function noRefCount(e) {
                switch (e.exprKind) {
                    case ir.EK.Sequence:
                        return noRefCount(e.args[e.args.length - 1]);
                    case ir.EK.NumberLiteral:
                        return true;
                    case ir.EK.RuntimeCall:
                        switch (e.data) {
                            case "String_::mkEmpty":
                            case "pxt::ptrOfLiteral":
                                return true;
                            default:
                                return false;
                        }
                    case ir.EK.SharedDef:
                    case ir.EK.SharedRef:
                        return noRefCount(e.args[0]);
                    default:
                        return false;
                }
            }
            var Procedure = (function (_super) {
                __extends(Procedure, _super);
                function Procedure() {
                    _super.apply(this, arguments);
                    this.numArgs = 0;
                    this.isRoot = false;
                    this.locals = [];
                    this.captured = [];
                    this.args = [];
                    this.body = [];
                    this.lblNo = 0;
                }
                Procedure.prototype.reset = function () {
                    this.body = [];
                    this.lblNo = 0;
                    this.locals = [];
                    this.captured = [];
                    this.args = [];
                };
                Procedure.prototype.label = function () {
                    return pxtc.getFunctionLabel(this.action, this.bindings);
                };
                Procedure.prototype.matches = function (id) {
                    if (this.action == id.action) {
                        U.assert(this.bindings.length == id.bindings.length, "this.bindings.length == id.bindings.length");
                        for (var i = 0; i < this.bindings.length; ++i)
                            if (this.bindings[i].isRef != id.bindings[i].isRef)
                                return false;
                        return true;
                    }
                    return false;
                };
                Procedure.prototype.toString = function () {
                    return "\nPROC " + pxtc.getDeclName(this.action) + "\n" + this.body.map(function (s) { return s.toString(); }).join("") + "\n";
                };
                Procedure.prototype.emit = function (stmt) {
                    this.body.push(stmt);
                };
                Procedure.prototype.emitExpr = function (expr) {
                    this.emit(stmt(SK.Expr, expr));
                };
                Procedure.prototype.mkLabel = function (name) {
                    var lbl = stmt(SK.Label, null);
                    lbl.lblName = "." + name + "_" + this.lblNo++ + "_" + this.seqNo;
                    lbl.lbl = lbl;
                    return lbl;
                };
                Procedure.prototype.emitLbl = function (lbl) {
                    this.emit(lbl);
                };
                Procedure.prototype.emitLblDirect = function (lblName) {
                    var lbl = stmt(SK.Label, null);
                    lbl.lblName = lblName;
                    lbl.lbl = lbl;
                    this.emit(lbl);
                };
                Procedure.prototype.getName = function () {
                    var text = this.action && this.action.name ? this.action.name.text : null;
                    return text || "inline";
                };
                Procedure.prototype.mkLocal = function (def, info) {
                    var l = new Cell(this.locals.length, def, info);
                    this.locals.push(l);
                    return l;
                };
                Procedure.prototype.mkLocalUnnamed = function (isRef) {
                    if (isRef === void 0) { isRef = false; }
                    var uc = new UnnamedCell(this.locals.length, this);
                    uc._isRef = isRef;
                    this.locals.push(uc);
                    return uc;
                };
                Procedure.prototype.localIndex = function (l, noargs) {
                    if (noargs === void 0) { noargs = false; }
                    return this.captured.filter(function (n) { return n.def == l; })[0] ||
                        this.locals.filter(function (n) { return n.def == l; })[0] ||
                        (noargs ? null : this.args.filter(function (n) { return n.def == l; })[0]);
                };
                Procedure.prototype.stackEmpty = function () {
                    this.emit(stmt(SK.StackEmpty, null));
                };
                Procedure.prototype.emitClrIfRef = function (p) {
                    assert(!p.isGlobal() && !p.iscap, "!p.isGlobal() && !p.iscap");
                    if (p.isRef() || p.isByRefLocal()) {
                        this.emitExpr(op(EK.Decr, [p.loadCore()]));
                    }
                };
                Procedure.prototype.emitClrs = function (finlbl, retval) {
                    var _this = this;
                    if (this.isRoot)
                        return;
                    this.locals.forEach(function (p) { return _this.emitClrIfRef(p); });
                    if (pxtc.isStackMachine() && this.args.some(function (p) { return p.isRef() || p.isByRefLocal(); }))
                        this.emitJmp(finlbl, retval, ir.JmpMode.IfLambda);
                    this.args.forEach(function (p) { return _this.emitClrIfRef(p); });
                };
                Procedure.prototype.emitJmpZ = function (trg, expr) {
                    this.emitJmp(trg, expr, JmpMode.IfZero);
                };
                Procedure.prototype.emitJmp = function (trg, expr, mode, terminate) {
                    if (mode === void 0) { mode = JmpMode.Always; }
                    if (terminate === void 0) { terminate = null; }
                    var jmp = stmt(SK.Jmp, expr);
                    jmp.jmpMode = mode;
                    if (terminate && terminate.exprKind == EK.NumberLiteral)
                        terminate = null;
                    jmp.terminateExpr = terminate;
                    if (typeof trg == "string")
                        jmp.lblName = trg;
                    else {
                        jmp.lbl = trg;
                        jmp.lblName = jmp.lbl.lblName;
                    }
                    this.emit(jmp);
                };
                Procedure.prototype.resolve = function () {
                    var iterargs = function (e, f) {
                        if (e.args)
                            for (var i = 0; i < e.args.length; ++i)
                                e.args[i] = f(e.args[i]);
                    };
                    var refdef = function (e) {
                        switch (e.exprKind) {
                            case EK.SharedDef: throw U.oops();
                            case EK.SharedRef:
                                var arg = e.args[0];
                                if (!arg.totalUses) {
                                    arg.totalUses = -1;
                                    arg.currUses = 0;
                                    var e2 = Expr.clone(e);
                                    e2.exprKind = EK.SharedDef;
                                    e2.args[0] = refdef(e2.args[0]);
                                    return e2;
                                }
                                else {
                                    arg.totalUses--;
                                    return e;
                                }
                        }
                        iterargs(e, refdef);
                        return e;
                    };
                    var opt = function (e) {
                        if (e.exprKind == EK.SharedRef)
                            return e;
                        iterargs(e, opt);
                        if ((e.exprKind == EK.Decr || e.exprKind == EK.Incr) && noRefCount(e.args[0])) {
                            return e.args[0];
                        }
                        switch (e.exprKind) {
                            case EK.Decr:
                                if (e.args[0].exprKind == EK.Incr)
                                    return e.args[0].args[0];
                                break;
                            case EK.Sequence:
                                e.args = e.args.filter(function (a, i) { return i == e.args.length - 1 || !a.isPure(); });
                                break;
                        }
                        return e;
                    };
                    var cntuses = function (e) {
                        switch (e.exprKind) {
                            case EK.SharedDef:
                                var arg = e.args[0];
                                //console.log(arg)
                                U.assert(arg.totalUses < 0, "arg.totalUses < 0");
                                U.assert(arg.currUses === 0, "arg.currUses === 0");
                                if (arg.totalUses == -1)
                                    return cntuses(arg);
                                else
                                    arg.totalUses = 1;
                                break;
                            case EK.SharedRef:
                                U.assert(e.args[0].totalUses > 0, "e.args[0].totalUses > 0");
                                e.args[0].totalUses++;
                                return e;
                        }
                        iterargs(e, cntuses);
                        return e;
                    };
                    this.body = this.body.filter(function (s) {
                        if (s.expr) {
                            //console.log("OPT", s.expr.toString())
                            s.expr = opt(refdef(s.expr));
                            //console.log("INTO", s.expr.toString())
                            if (s.stmtKind == ir.SK.Expr && s.expr.isPure())
                                return false;
                        }
                        return true;
                    });
                    var lbls = U.toDictionary(this.body.filter(function (s) { return s.stmtKind == ir.SK.Label; }), function (s) { return s.lblName; });
                    for (var i = 0; i < this.body.length; ++i)
                        this.body[i].stmtNo = i;
                    for (var _i = 0, _a = this.body; _i < _a.length; _i++) {
                        var s = _a[_i];
                        if (s.expr) {
                            //console.log("CNT", s.expr.toString())
                            s.expr = cntuses(s.expr);
                        }
                        switch (s.stmtKind) {
                            case ir.SK.Expr:
                                break;
                            case ir.SK.Jmp:
                                s.lbl = U.lookup(lbls, s.lblName);
                                if (!s.lbl)
                                    pxtc.oops("missing label: " + s.lblName);
                                s.lbl.lblNumUses++;
                                break;
                            case ir.SK.StackEmpty:
                            case ir.SK.Label:
                            case ir.SK.Breakpoint:
                                break;
                            default: pxtc.oops();
                        }
                    }
                    var allBrkp = [];
                    for (var _b = 0, _c = this.body; _b < _c.length; _b++) {
                        var s = _c[_b];
                        if (s.stmtKind == ir.SK.Breakpoint) {
                            allBrkp[s.breakpointInfo.id] = s.breakpointInfo;
                        }
                    }
                    var debugSucc = false;
                    if (debugSucc) {
                        var s = "BRKP: " + this.getName() + ":\n";
                        for (var i = 0; i < allBrkp.length; ++i) {
                            var b = allBrkp[i];
                            if (!b)
                                continue;
                            s += (b.line + 1) + ": ";
                            var n = allBrkp[i + 1];
                            s += "\n";
                        }
                        console.log(s);
                    }
                };
                return Procedure;
            }(Node));
            ir.Procedure = Procedure;
            function iterExpr(e, f) {
                f(e);
                if (e.args)
                    for (var _i = 0, _a = e.args; _i < _a.length; _i++) {
                        var a = _a[_i];
                        iterExpr(a, f);
                    }
            }
            ir.iterExpr = iterExpr;
            function stmt(kind, expr) {
                return new Stmt(kind, expr);
            }
            ir.stmt = stmt;
            function op(kind, args, data) {
                return new Expr(kind, args, data);
            }
            ir.op = op;
            function numlit(v) {
                return op(EK.NumberLiteral, null, v);
            }
            ir.numlit = numlit;
            function shared(expr) {
                switch (expr.exprKind) {
                    case EK.NumberLiteral:
                    case EK.SharedRef:
                        return expr;
                }
                return op(EK.SharedRef, [expr]);
            }
            ir.shared = shared;
            function ptrlit(lbl, jsInfo, full) {
                if (full === void 0) { full = false; }
                var r = op(EK.PointerLiteral, null, lbl);
                r.jsInfo = jsInfo;
                if (full) {
                    if (pxtc.target.isNative && pxtc.isAVR())
                        // this works for string and hex literals
                        return rtcall("pxt::stringLiteral", [r]);
                    else
                        r.args = [];
                }
                return r;
            }
            ir.ptrlit = ptrlit;
            function rtcall(name, args) {
                return op(EK.RuntimeCall, args, name);
            }
            ir.rtcall = rtcall;
            function rtcallMask(name, mask, callingConv, args) {
                var decrs = [];
                if (pxtc.isStackMachine())
                    name += "^" + mask;
                else
                    args = args.map(function (a, i) {
                        if (mask & (1 << i)) {
                            a = shared(a);
                            decrs.push(op(EK.Decr, [a]));
                            return a;
                        }
                        else
                            return a;
                    });
                var r = op(EK.RuntimeCall, args, name);
                r.callingConvention = callingConv;
                if (decrs.length > 0) {
                    r = shared(r);
                    decrs.unshift(r);
                    decrs.push(r);
                    r = op(EK.Sequence, decrs);
                }
                return r;
            }
            ir.rtcallMask = rtcallMask;
            function flattenArgs(topExpr) {
                var didStateUpdate = false;
                var complexArgs = [];
                for (var _i = 0, _a = U.reversed(topExpr.args); _i < _a.length; _i++) {
                    var a = _a[_i];
                    if (a.isStateless())
                        continue;
                    if (a.exprKind == EK.CellRef && !didStateUpdate)
                        continue;
                    if (a.canUpdateCells())
                        didStateUpdate = true;
                    complexArgs.push(a);
                }
                complexArgs.reverse();
                if (pxtc.isStackMachine())
                    complexArgs = [];
                var precomp = [];
                var flattened = topExpr.args.map(function (a) {
                    var idx = complexArgs.indexOf(a);
                    if (idx >= 0) {
                        var sharedRef = a;
                        var sharedDef = a;
                        if (a.exprKind == EK.SharedDef) {
                            a.args[0].totalUses++;
                            sharedRef = ir.op(EK.SharedRef, [a.args[0]]);
                        }
                        else {
                            sharedRef = ir.op(EK.SharedRef, [a]);
                            sharedDef = ir.op(EK.SharedDef, [a]);
                            a.totalUses = 2;
                            a.currUses = 0;
                        }
                        precomp.push(sharedDef);
                        return sharedRef;
                    }
                    else
                        return a;
                });
                return { precomp: precomp, flattened: flattened };
            }
            ir.flattenArgs = flattenArgs;
        })(ir = pxtc.ir || (pxtc.ir = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../localtypings/pxtarget.d.ts"/>
/// <reference path="../../localtypings/pxtpackage.d.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        // in tagged mode,
        // * the lowest bit set means 31 bit signed integer
        // * the lowest bit clear, and second lowest set means special constant
        // "undefined" is represented by 0
        function taggedSpecialValue(n) { return (n << 2) | 2; }
        pxtc.taggedUndefined = 0;
        pxtc.taggedNull = taggedSpecialValue(1);
        pxtc.taggedFalse = taggedSpecialValue(2);
        pxtc.taggedTrue = taggedSpecialValue(16);
        function fitsTaggedInt(vn) {
            if (pxtc.target.boxDebug)
                return false;
            return (vn | 0) == vn && -1073741824 <= vn && vn <= 1073741823;
        }
        pxtc.thumbArithmeticInstr = {
            "adds": true,
            "subs": true,
            "muls": true,
            "ands": true,
            "orrs": true,
            "eors": true,
            "lsls": true,
            "asrs": true,
            "lsrs": true,
        };
        pxtc.numberArithmeticInstr = {
            "div": true,
            "mod": true,
            "le": true,
            "lt": true,
            "ge": true,
            "gt": true,
            "eq": true,
            "neq": true,
        };
        var EK = pxtc.ir.EK;
        pxtc.SK = ts.SyntaxKind;
        pxtc.numReservedGlobals = 1;
        var lastNodeId = 0;
        var currNodeWave = 1;
        function getNodeId(n) {
            var nn = n;
            if (nn.pxtNodeWave !== currNodeWave) {
                nn.pxtNodeId = ++lastNodeId;
                nn.pxtNodeWave = currNodeWave;
            }
            return nn.pxtNodeId;
        }
        pxtc.getNodeId = getNodeId;
        function stringKind(n) {
            if (!n)
                return "<null>";
            return ts.SyntaxKind[n.kind];
        }
        pxtc.stringKind = stringKind;
        function inspect(n) {
            console.log(stringKind(n));
        }
        // next free error 9272
        function userError(code, msg, secondary) {
            if (secondary === void 0) { secondary = false; }
            var e = new Error(msg);
            e.ksEmitterUserError = true;
            e.ksErrorCode = code;
            if (secondary && inCatchErrors) {
                if (!lastSecondaryError) {
                    lastSecondaryError = msg;
                    lastSecondaryErrorCode = code;
                }
                return e;
            }
            throw e;
        }
        function noRefCounting() {
            return pxtc.target.nativeType == pxtc.NATIVE_TYPE_CS || (!pxtc.target.jsRefCounting && !pxtc.target.isNative);
        }
        function isStackMachine() {
            return pxtc.target.isNative && pxtc.target.nativeType == pxtc.NATIVE_TYPE_AVRVM;
        }
        pxtc.isStackMachine = isStackMachine;
        function isAVR() {
            return pxtc.target.isNative && (pxtc.target.nativeType == pxtc.NATIVE_TYPE_AVRVM || pxtc.target.nativeType == pxtc.NATIVE_TYPE_AVR);
        }
        pxtc.isAVR = isAVR;
        function isRefType(t) {
            checkType(t);
            if (noRefCounting())
                return false;
            if (t.flags & ts.TypeFlags.ThisType)
                return true;
            if (t.flags & ts.TypeFlags.Null)
                return false;
            if (t.flags & ts.TypeFlags.Undefined)
                return false;
            if (t.flags & ts.TypeFlags.TypeParameter) {
                var b = lookupTypeParameter(t);
                if (b)
                    return b.isRef;
                pxtc.U.oops("unbound type parameter: " + checker.typeToString(t));
            }
            if (t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.Boolean))
                return pxtc.target.taggedInts ? true : false;
            var sym = t.getSymbol();
            if (sym) {
                var decl = sym.valueDeclaration || sym.declarations[0];
                if (decl) {
                    var attrs = parseComments(decl);
                    if (attrs.noRefCounting)
                        return false;
                }
            }
            return true;
        }
        function isSyntheticThis(def) {
            if (def.isThisParameter)
                return true;
            else
                return false;
        }
        function isRefDecl(def) {
            if (isSyntheticThis(def))
                return true;
            //let tp = checker.getDeclaredTypeOfSymbol(def.symbol)
            var tp = typeOf(def);
            return isRefType(tp);
        }
        // everything in numops:: operates on and returns tagged ints
        // everything else (except as indicated with CommentAttrs), operates and returns regular ints
        function fromInt(e) {
            if (!pxtc.target.taggedInts)
                return e;
            return pxtc.ir.rtcall("pxt::fromInt", [e]);
        }
        function fromBool(e) {
            if (!pxtc.target.taggedInts)
                return e;
            return pxtc.ir.rtcall("pxt::fromBool", [e]);
        }
        function fromFloat(e) {
            if (!pxtc.target.taggedInts)
                return e;
            return pxtc.ir.rtcall("pxt::fromFloat", [e]);
        }
        function fromDouble(e) {
            if (!pxtc.target.taggedInts)
                return e;
            return pxtc.ir.rtcall("pxt::fromDouble", [e]);
        }
        function getBitSize(decl) {
            if (!decl || !decl.type)
                return 0 /* None */;
            if (!(typeOf(decl).flags & ts.TypeFlags.Number))
                return 0 /* None */;
            if (decl.type.kind != pxtc.SK.TypeReference)
                return 0 /* None */;
            switch (decl.type.typeName.getText()) {
                case "int8": return 1 /* Int8 */;
                case "int16": return 3 /* Int16 */;
                case "int32": return 5 /* Int32 */;
                case "uint8": return 2 /* UInt8 */;
                case "uint16": return 4 /* UInt16 */;
                case "uint32": return 6 /* UInt32 */;
                default: return 0 /* None */;
            }
        }
        function sizeOfBitSize(b) {
            switch (b) {
                case 0 /* None */: return pxtc.target.shortPointers ? 2 : 4;
                case 1 /* Int8 */: return 1;
                case 3 /* Int16 */: return 2;
                case 5 /* Int32 */: return 4;
                case 2 /* UInt8 */: return 1;
                case 4 /* UInt16 */: return 2;
                case 6 /* UInt32 */: return 4;
                default: throw pxtc.oops();
            }
        }
        pxtc.sizeOfBitSize = sizeOfBitSize;
        function isBitSizeSigned(b) {
            switch (b) {
                case 1 /* Int8 */:
                case 3 /* Int16 */:
                case 5 /* Int32 */:
                    return true;
                case 2 /* UInt8 */:
                case 4 /* UInt16 */:
                case 6 /* UInt32 */:
                    return false;
                default: throw pxtc.oops();
            }
        }
        pxtc.isBitSizeSigned = isBitSizeSigned;
        function setCellProps(l) {
            l._isRef = isRefDecl(l.def);
            l._isLocal = isLocalVar(l.def) || isParameter(l.def);
            l._isGlobal = isGlobalVar(l.def);
            if (!isSyntheticThis(l.def)) {
                var tp = typeOf(l.def);
                if (tp.flags & ts.TypeFlags.Void) {
                    pxtc.oops("void-typed variable, " + l.toString());
                }
                l.bitSize = getBitSize(l.def);
                if (l.bitSize != 0 /* None */) {
                    l._debugType = (isBitSizeSigned(l.bitSize) ? "int" : "uint") + (8 * sizeOfBitSize(l.bitSize));
                }
                else if (tp.flags & ts.TypeFlags.String) {
                    l._debugType = "string";
                }
                else if (tp.flags & ts.TypeFlags.NumberLike) {
                    l._debugType = "number";
                }
            }
            if (l.isLocal() && l.bitSize != 0 /* None */) {
                l.bitSize = 0 /* None */;
                userError(9256, lf("bit sizes are not supported for locals and parameters"));
            }
        }
        pxtc.setCellProps = setCellProps;
        function isStringLiteral(node) {
            switch (node.kind) {
                case pxtc.SK.TemplateHead:
                case pxtc.SK.TemplateMiddle:
                case pxtc.SK.TemplateTail:
                case pxtc.SK.StringLiteral:
                case pxtc.SK.NoSubstitutionTemplateLiteral:
                    return true;
                default: return false;
            }
        }
        function isEmptyStringLiteral(e) {
            return isStringLiteral(e) && e.text == "";
        }
        function isStatic(node) {
            return node.modifiers && node.modifiers.some(function (m) { return m.kind == pxtc.SK.StaticKeyword; });
        }
        function classFunctionPref(node) {
            if (!node)
                return null;
            switch (node.kind) {
                case pxtc.SK.MethodDeclaration: return "";
                case pxtc.SK.Constructor: return "new/";
                case pxtc.SK.GetAccessor: return "get/";
                case pxtc.SK.SetAccessor: return "set/";
                default:
                    return null;
            }
        }
        function classFunctionKey(node) {
            return classFunctionPref(node) + getName(node);
        }
        function isClassFunction(node) {
            return classFunctionPref(node) != null;
        }
        function getEnclosingMethod(node) {
            if (!node)
                return null;
            if (isClassFunction(node))
                return node;
            return getEnclosingMethod(node.parent);
        }
        function isInAnyWayGeneric(node) {
            return isGenericFunction(node) || hasGenericParent(node);
        }
        function hasGenericParent(node) {
            var par = getEnclosingFunction(node);
            if (par)
                return isGenericFunction(par) || hasGenericParent(par);
            return false;
        }
        function getEnclosingFunction(node0) {
            var node = node0;
            while (true) {
                node = node.parent;
                if (!node)
                    userError(9229, lf("cannot determine parent of {0}", stringKind(node0)));
                switch (node.kind) {
                    case pxtc.SK.MethodDeclaration:
                    case pxtc.SK.Constructor:
                    case pxtc.SK.GetAccessor:
                    case pxtc.SK.SetAccessor:
                    case pxtc.SK.FunctionDeclaration:
                    case pxtc.SK.ArrowFunction:
                    case pxtc.SK.FunctionExpression:
                        return node;
                    case pxtc.SK.SourceFile:
                        return null;
                }
            }
        }
        function isGlobalVar(d) {
            if (!d)
                return false;
            return (d.kind == pxtc.SK.VariableDeclaration && !getEnclosingFunction(d)) ||
                (d.kind == pxtc.SK.PropertyDeclaration && isStatic(d));
        }
        function isLocalVar(d) {
            return d.kind == pxtc.SK.VariableDeclaration && !isGlobalVar(d);
        }
        function isParameter(d) {
            return d.kind == pxtc.SK.Parameter;
        }
        function isTopLevelFunctionDecl(decl) {
            return (decl.kind == pxtc.SK.FunctionDeclaration && !getEnclosingFunction(decl)) ||
                isClassFunction(decl);
        }
        function isSideEffectfulInitializer(init) {
            if (!init)
                return false;
            if (isStringLiteral(init))
                return false;
            switch (init.kind) {
                case pxtc.SK.NullKeyword:
                case pxtc.SK.NumericLiteral:
                case pxtc.SK.TrueKeyword:
                case pxtc.SK.FalseKeyword:
                    return false;
                case pxtc.SK.ArrayLiteralExpression:
                    return init.elements.some(isSideEffectfulInitializer);
                default:
                    return true;
            }
        }
        var lf = pxtc.assembler.lf;
        var checker;
        var lastSecondaryError;
        var lastSecondaryErrorCode = 0;
        var inCatchErrors = 0;
        var typeBindings = [];
        function getComments(node) {
            if (node.kind == pxtc.SK.VariableDeclaration)
                node = node.parent.parent; // we need variable stmt
            var cmtCore = function (node) {
                var src = ts.getSourceFileOfNode(node);
                var doc = ts.getLeadingCommentRangesOfNodeFromText(node, src.text);
                if (!doc)
                    return "";
                var cmt = doc.map(function (r) { return src.text.slice(r.pos, r.end); }).join("\n");
                return cmt;
            };
            if (node.symbol && node.symbol.declarations.length > 1) {
                return node.symbol.declarations.map(cmtCore).join("\n");
            }
            else {
                return cmtCore(node);
            }
        }
        pxtc.getComments = getComments;
        function parseCommentsOnSymbol(symbol) {
            var cmts = "";
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var decl = _a[_i];
                cmts += getComments(decl);
            }
            return pxtc.parseCommentString(cmts);
        }
        pxtc.parseCommentsOnSymbol = parseCommentsOnSymbol;
        function parseComments(node0) {
            if (!node0 || node0.isBogusFunction)
                return pxtc.parseCommentString("");
            var node = node0;
            var cached = node.pxtCommentAttrs;
            if (cached)
                return cached;
            var res = pxtc.parseCommentString(getComments(node));
            res._name = getName(node);
            if (node0.kind == pxtc.SK.FunctionDeclaration && res.block === "true" && !res.blockId) {
                var fn = node0;
                if (fn.symbol.parent) {
                    res.blockId = fn.symbol.parent.name + "_" + getDeclName(fn);
                    res.block = "" + pxtc.U.uncapitalize(node.symbol.name) + (fn.parameters.length ? '|' + fn.parameters
                        .filter(function (p) { return !p.questionToken; })
                        .map(function (p) { return (pxtc.U.uncapitalize(p.name.text) + " %" + p.name.text); }).join('|') : '');
                }
            }
            node.pxtCommentAttrs = res;
            return res;
        }
        pxtc.parseComments = parseComments;
        function getName(node) {
            if (!node.name || node.name.kind != pxtc.SK.Identifier)
                return "???";
            return node.name.text;
        }
        pxtc.getName = getName;
        function genericRoot(t) {
            if (t.flags & ts.TypeFlags.Reference) {
                var r = t;
                if (r.typeArguments && r.typeArguments.length)
                    return r.target;
            }
            return null;
        }
        function isArrayType(t) {
            return (t.flags & ts.TypeFlags.Reference) && t.symbol.name == "Array";
        }
        function isInterfaceType(t) {
            return !!(t.flags & ts.TypeFlags.Interface) || !!(t.flags & ts.TypeFlags.Anonymous);
        }
        function isClassType(t) {
            // check if we like the class?
            return !!(t.flags & ts.TypeFlags.Class) || !!(t.flags & ts.TypeFlags.ThisType);
        }
        function isObjectLiteral(t) {
            return t.symbol && (t.symbol.flags & (ts.SymbolFlags.ObjectLiteral | ts.SymbolFlags.TypeLiteral)) !== 0;
        }
        function isStructureType(t) {
            return (isFunctionType(t) == null) && (isClassType(t) || isInterfaceType(t) || isObjectLiteral(t));
        }
        function castableToStructureType(t) {
            return isStructureType(t) || (t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined));
        }
        function isPossiblyGenericClassType(t) {
            var g = genericRoot(t);
            if (g)
                return isClassType(g);
            return isClassType(t);
        }
        function arrayElementType(t) {
            if (isArrayType(t))
                return checkType(t.typeArguments[0]);
            return null;
        }
        function isFunctionType(t) {
            // if an object type represents a function (via 1 signature) then it
            // can't have any other properties or constructor signatures
            if (t.getApparentProperties().length > 0 || t.getConstructSignatures().length > 0)
                return null;
            var sigs = checker.getSignaturesOfType(t, ts.SignatureKind.Call);
            if (sigs && sigs.length == 1)
                return sigs[0];
            // TODO: error message for overloaded function signatures?
            return null;
        }
        function lookupTypeParameter(t) {
            if (!(t.flags & ts.TypeFlags.TypeParameter))
                return null;
            for (var i = typeBindings.length - 1; i >= 0; --i)
                if (typeBindings[i].tp == t)
                    return typeBindings[i];
            return null;
        }
        function isBuiltinType(t) {
            var ok = ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.Enum;
            return t.flags & ok;
        }
        function checkType(t) {
            var ok = ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.Boolean |
                ts.TypeFlags.Void | ts.TypeFlags.Enum | ts.TypeFlags.Null | ts.TypeFlags.Undefined;
            if ((t.flags & ok) == 0) {
                if (isArrayType(t))
                    return t;
                if (isClassType(t))
                    return t;
                if (isInterfaceType(t))
                    return t;
                if (isFunctionType(t))
                    return t;
                if (lookupTypeParameter(t))
                    return t;
                var g = genericRoot(t);
                if (g) {
                    checkType(g);
                    t.typeArguments.forEach(checkType);
                    return t;
                }
                userError(9201, lf("unsupported type: {0} 0x{1}", checker.typeToString(t), t.flags.toString(16)), true);
            }
            return t;
        }
        function typeOf(node) {
            var r;
            if (node.typeOverride)
                return node.typeOverride;
            if (ts.isExpression(node))
                r = checker.getContextualType(node);
            if (!r) {
                try {
                    r = checker.getTypeAtLocation(node);
                }
                catch (e) {
                    userError(9203, lf("Unknown type for expression"));
                }
            }
            if (!r)
                return r;
            return checkType(r);
        }
        // does src inherit from tgt via heritage clauses?
        function inheritsFrom(src, tgt) {
            if (src == tgt)
                return true;
            if (src.heritageClauses)
                for (var _i = 0, _a = src.heritageClauses; _i < _a.length; _i++) {
                    var h = _a[_i];
                    switch (h.token) {
                        case pxtc.SK.ExtendsKeyword:
                            var tp = typeOf(h.types[0]);
                            if (isClassType(tp)) {
                                var parent_3 = tp.symbol.valueDeclaration;
                                return inheritsFrom(parent_3, tgt);
                            }
                    }
                }
            return false;
        }
        function checkInterfaceDeclaration(decl, classes) {
            for (var cl in classes) {
                if (classes[cl].decl.symbol == decl.symbol) {
                    userError(9261, lf("Interface with same name as a class not supported"));
                }
            }
            if (decl.heritageClauses)
                for (var _i = 0, _a = decl.heritageClauses; _i < _a.length; _i++) {
                    var h = _a[_i];
                    switch (h.token) {
                        case pxtc.SK.ExtendsKeyword:
                            var tp = typeOf(h.types[0]);
                            if (isClassType(tp)) {
                                userError(9262, lf("Extending a class by an interface not supported."));
                            }
                    }
                }
        }
        function typeCheckSubtoSup(sub, sup) {
            // get the direct types
            var supTypeLoc = sup.kind ? checker.getTypeAtLocation(sup) : sup;
            var subTypeLoc = sub.kind ? checker.getTypeAtLocation(sub) : sub;
            // get the contextual types, if possible
            var supType = ts.isExpression(sup) ? checker.getContextualType(sup) : supTypeLoc;
            if (!supType)
                supType = supTypeLoc;
            var subType = ts.isExpression(sub) ? checker.getContextualType(sub) : subTypeLoc;
            if (!subType)
                subType = subTypeLoc;
            if (!supType || !subType)
                return;
            // src may get its type from trg via context, in which case
            // we want to use the direct type of src
            if (supType == subType && subType != subTypeLoc)
                subType = subTypeLoc;
            occursCheck = [];
            var _a = checkSubtype(subType, supType), ok = _a[0], message = _a[1];
            if (!ok) {
                userError(9263, lf(message));
            }
        }
        var occursCheck = [];
        var cachedSubtypeQueries = {};
        function insertSubtype(key, val) {
            cachedSubtypeQueries[key] = val;
            occursCheck.pop();
            return val;
        }
        // this function works assuming that the program has passed the
        // TypeScript type checker. We are going to simply rule out some
        // cases that pass the TS checker. We only compare type
        // pairs that the TS checker compared.
        // we are checking that subType is a subtype of supType, so that
        // an assignment of the form trg <- src is safe, where supType is the
        // type of trg and subType is the type of src
        function checkSubtype(subType, superType) {
            function checkMembers() {
                var superProps = checker.getPropertiesOfType(superType);
                var subProps = checker.getPropertiesOfType(subType);
                var _a = [true, ""], ret = _a[0], msg = _a[1];
                superProps.forEach(function (superProp) {
                    var superPropDecl = superProp.valueDeclaration;
                    var find = subProps.filter(function (sp) { return sp.name == superProp.name; });
                    if (find.length == 1) {
                        var subPropDecl = find[0].valueDeclaration;
                        // TODO: record the property on which we have a mismatch
                        var _a = checkSubtype(checker.getTypeAtLocation(subPropDecl), checker.getTypeAtLocation(superPropDecl)), retSub = _a[0], msgSub = _a[1];
                        if (ret && !retSub)
                            _b = [retSub, msgSub], ret = _b[0], msg = _b[1];
                    }
                    else if (find.length == 0) {
                        if (!(superProp.flags & ts.SymbolFlags.Optional)) {
                            // we have a cast to an interface with more properties (unsound)
                            _c = [false, "Property " + superProp.name + " not present in " + subType.getSymbol().name], ret = _c[0], msg = _c[1];
                        }
                        else {
                        }
                    }
                    var _b, _c;
                });
                return insertSubtype(key, [ret, msg]);
            }
            var subId = subType.id;
            var superId = superType.id;
            var key = subId + "," + superId;
            if (cachedSubtypeQueries[key])
                return cachedSubtypeQueries[key];
            // check to see if query already on the stack
            if (occursCheck.indexOf(key) != -1)
                return [true, ""];
            occursCheck.push(key);
            // we don't allow Any!
            if (superType.flags & ts.TypeFlags.Any)
                return insertSubtype(key, [false, "Unsupported type: any."]);
            // outlaw all things that can't be cast to class/interface
            if (isStructureType(superType) && !castableToStructureType(subType)) {
                return insertSubtype(key, [false, "Cast to class/interface not supported."]);
            }
            if (isClassType(superType)) {
                if (isClassType(subType)) {
                    var superDecl = superType.symbol.valueDeclaration;
                    var subDecl = subType.symbol.valueDeclaration;
                    // only allow upcast (sub -> ... -> sup) in inheritance chain
                    if (!inheritsFrom(subDecl, superDecl)) {
                        if (inheritsFrom(superDecl, subDecl))
                            return insertSubtype(key, [false, "Downcasts not supported."]);
                        else
                            return insertSubtype(key, [false, "Classes " + subDecl.name.getText() + " and " + superDecl.name.getText() + " are not related by inheritance."]);
                    }
                    // need to also check subtyping on members
                    return checkMembers();
                }
                else {
                    if (!(subType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))) {
                        return insertSubtype(key, [false, "Cast to class not supported."]);
                    }
                }
            }
            else if (isFunctionType(superType)) {
                // implement standard function subtyping (no bivariance)
                var superFun = isFunctionType(superType);
                if (isFunctionType(subType)) {
                    var subFun = isFunctionType(subType);
                    pxtc.U.assert(superFun.parameters.length >= subFun.parameters.length, "sup should have at least params of sub");
                    var _a = [true, ""], ret = _a[0], msg = _a[1];
                    for (var i = 0; i < subFun.parameters.length; i++) {
                        var superParamType = checker.getTypeAtLocation(superFun.parameters[i].valueDeclaration);
                        var subParamType = checker.getTypeAtLocation(subFun.parameters[i].valueDeclaration);
                        // Check parameter types (contra-variant)
                        var _b = checkSubtype(superParamType, subParamType), retSub_1 = _b[0], msgSub_1 = _b[1];
                        if (ret && !retSub_1)
                            _c = [retSub_1, msgSub_1], ret = _c[0], msg = _c[1];
                    }
                    // check return type (co-variant)
                    var superRetType = superFun.getReturnType();
                    var subRetType = superFun.getReturnType();
                    var _d = checkSubtype(subRetType, superRetType), retSub = _d[0], msgSub = _d[1];
                    if (ret && !retSub)
                        _e = [retSub, msgSub], ret = _e[0], msg = _e[1];
                    return insertSubtype(key, [ret, msg]);
                }
            }
            else if (isInterfaceType(superType)) {
                if (isStructureType(subType)) {
                    return checkMembers();
                }
            }
            else if (isArrayType(superType)) {
                if (isArrayType(subType)) {
                    var superElemType = arrayElementType(superType);
                    var subElemType = arrayElementType(subType);
                    return checkSubtype(subElemType, superElemType);
                }
            }
            else if (lookupTypeParameter(superType)) {
            }
            return insertSubtype(key, [true, ""]);
            var _c, _e;
        }
        function isGenericFunction(fun) {
            return getTypeParameters(fun).length > 0;
        }
        function getTypeParameters(fun) {
            // TODO add check for methods of generic classes
            if (fun.typeParameters && fun.typeParameters.length)
                return fun.typeParameters;
            if (isClassFunction(fun) || fun.kind == pxtc.SK.MethodSignature) {
                if (fun.parent.kind == pxtc.SK.ClassDeclaration || fun.parent.kind == pxtc.SK.InterfaceDeclaration) {
                    var tp = fun.parent.typeParameters;
                    return tp || [];
                }
            }
            return [];
        }
        function funcHasReturn(fun) {
            var sig = checker.getSignatureFromDeclaration(fun);
            var rettp = checker.getReturnTypeOfSignature(sig);
            return !(rettp.flags & ts.TypeFlags.Void);
        }
        function getDeclName(node) {
            var text = node && node.name ? node.name.text : null;
            if (!text && node.kind == pxtc.SK.Constructor)
                text = "constructor";
            if (node && node.parent && node.parent.kind == pxtc.SK.ClassDeclaration)
                text = node.parent.name.text + "." + text;
            text = text || "inline";
            return text;
        }
        pxtc.getDeclName = getDeclName;
        function getTypeBindings(t) {
            var g = genericRoot(t);
            if (!g)
                return [];
            return getTypeBindingsCore(g.typeParameters, t.typeArguments);
        }
        function getTypeBindingsCore(typeParameters, args) {
            pxtc.U.assert(typeParameters.length == args.length, "typeParameters.length == args.length");
            return typeParameters.map(function (tp, i) { return ({ tp: tp, isRef: isRefType(args[i]) }); });
        }
        function getEnclosingTypeBindings(func) {
            var bindings = [];
            addEnclosingTypeBindings(bindings, func);
            return bindings;
        }
        function addEnclosingTypeBindings(bindings, func) {
            if (!func)
                return;
            for (var outer = getEnclosingFunction(func); outer; outer = getEnclosingFunction(outer)) {
                var _loop_1 = function(tp) {
                    var res = checker.getTypeAtLocation(tp);
                    var binding = typeBindings.filter(function (b) { return b.tp == res; })[0];
                    if (!binding) {
                        pxtc.U.oops("cannot find binding for: " + checker.typeToString(res));
                    }
                    bindings.push(binding);
                };
                for (var _i = 0, _a = getTypeParameters(outer); _i < _a.length; _i++) {
                    var tp = _a[_i];
                    _loop_1(tp);
                }
            }
        }
        function refMask(types) {
            if (!types || !types.length)
                return "";
            return "_" + types.map(function (t) { return t.isRef ? "R" : "P"; }).join("");
        }
        function getFunctionLabel(node, bindings) {
            var text = getDeclName(node);
            return text.replace(/[^\w]+/g, "_") + "__P" + getNodeId(node) + refMask(bindings);
        }
        pxtc.getFunctionLabel = getFunctionLabel;
        function mkBogusMethod(info, name) {
            var rootFunction = {
                kind: pxtc.SK.MethodDeclaration,
                parameters: [],
                name: {
                    kind: pxtc.SK.Identifier,
                    text: name,
                    pos: 0,
                    end: 0
                },
                body: {
                    kind: pxtc.SK.Block,
                    statements: []
                },
                parent: info.decl,
                pos: 0,
                end: 0,
                isBogusFunction: true,
            };
            return rootFunction;
        }
        function compileBinary(program, host, opts, res) {
            pxtc.target = opts.target;
            var diagnostics = ts.createDiagnosticCollection();
            checker = program.getTypeChecker();
            var classInfos = {};
            var usedDecls = {};
            var usedWorkList = [];
            var variableStatus = {};
            var functionInfo = {};
            var irCachesToClear = [];
            var ifaceMembers = {};
            var nextIfaceMemberId = 0;
            var autoCreateFunctions = {};
            var configEntries = {};
            var currJres = null;
            cachedSubtypeQueries = {};
            lastNodeId = 0;
            currNodeWave++;
            if (opts.target.isNative) {
                if (!opts.hexinfo) {
                    // we may have not been able to compile or download the hex file
                    return {
                        diagnostics: [{
                                file: program.getSourceFiles()[0],
                                start: 0,
                                length: 0,
                                category: pxtc.DiagnosticCategory.Error,
                                code: 9043,
                                messageText: lf("The hex file is not available, please connect to internet and try again.")
                            }],
                        emitSkipped: true
                    };
                }
                pxtc.hex.setupFor(opts.target, opts.extinfo || pxtc.emptyExtInfo(), opts.hexinfo);
                pxtc.hex.setupInlineAssembly(opts);
            }
            var bin = new Binary();
            var proc;
            bin.res = res;
            bin.options = opts;
            bin.target = opts.target;
            function reset() {
                bin.reset();
                proc = null;
                res.breakpoints = [{
                        id: 0,
                        isDebuggerStmt: false,
                        fileName: "bogus",
                        start: 0,
                        length: 0,
                        line: 0,
                        column: 0,
                    }];
            }
            if (opts.computeUsedSymbols) {
                res.usedSymbols = {};
                res.usedArguments = {};
            }
            var allStmts = opts.forceEmit && res.diagnostics.length > 0
                ? [] // TODO: panic
                : pxtc.Util.concat(program.getSourceFiles().map(function (f) { return f.statements; }));
            var src = program.getSourceFiles()[0];
            var rootFunction = {
                kind: pxtc.SK.FunctionDeclaration,
                parameters: [],
                name: {
                    text: "<main>",
                    pos: 0,
                    end: 0
                },
                body: {
                    kind: pxtc.SK.Block,
                    statements: allStmts
                },
                parent: src,
                pos: 0,
                end: 0,
                isRootFunction: true,
                isBogusFunction: true
            };
            markUsed(rootFunction);
            usedWorkList = [];
            reset();
            emit(rootFunction);
            layOutGlobals();
            pruneMethodsAndRecompute();
            emitVTables();
            if (diagnostics.getModificationCount() == 0) {
                reset();
                bin.finalPass = true;
                emit(rootFunction);
                res.configData = [];
                for (var _i = 0, _a = Object.keys(configEntries); _i < _a.length; _i++) {
                    var k = _a[_i];
                    if (configEntries["!" + k])
                        continue;
                    res.configData.push({
                        name: k.replace(/^\!/, ""),
                        key: configEntries[k].key,
                        value: configEntries[k].value
                    });
                }
                catchErrors(rootFunction, finalEmit);
            }
            return {
                diagnostics: diagnostics.getDiagnostics(),
                emitSkipped: !!opts.noEmit
            };
            function error(node, code, msg, arg0, arg1, arg2) {
                diagnostics.add(ts.createDiagnosticForNode(node, {
                    code: code,
                    message: msg,
                    key: msg.replace(/^[a-zA-Z]+/g, "_"),
                    category: pxtc.DiagnosticCategory.Error,
                }, arg0, arg1, arg2));
            }
            function unhandled(n, info, code) {
                if (code === void 0) { code = 9202; }
                // If we have info then we may as well present that instead
                if (info) {
                    return userError(code, info);
                }
                if (!n) {
                    userError(code, lf("Sorry, this language feature is not supported"));
                }
                var syntax = stringKind(n);
                var maybeSupportInFuture = false;
                var alternative = null;
                switch (n.kind) {
                    case ts.SyntaxKind.ForInStatement:
                        syntax = lf("for in loops");
                        break;
                    case ts.SyntaxKind.ForOfStatement:
                        syntax = lf("for of loops");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.PropertyAccessExpression:
                        syntax = lf("property access");
                        break;
                    case ts.SyntaxKind.DeleteExpression:
                        syntax = lf("delete");
                        break;
                    case ts.SyntaxKind.GetAccessor:
                        syntax = lf("get accessor method");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.SetAccessor:
                        syntax = lf("set accessor method");
                        maybeSupportInFuture = true;
                        break;
                    case ts.SyntaxKind.TaggedTemplateExpression:
                        syntax = lf("tagged templates");
                        break;
                    case ts.SyntaxKind.TypeOfExpression:
                        syntax = lf("typeof");
                        break;
                    case ts.SyntaxKind.SpreadElementExpression:
                        syntax = lf("spread");
                        break;
                    case ts.SyntaxKind.TryStatement:
                    case ts.SyntaxKind.CatchClause:
                    case ts.SyntaxKind.FinallyKeyword:
                    case ts.SyntaxKind.ThrowStatement:
                        syntax = lf("throwing and catching exceptions");
                        break;
                    case ts.SyntaxKind.ClassExpression:
                        syntax = lf("class expressions");
                        alternative = lf("declare a class as class C {} not let C = class {}");
                        break;
                    default:
                        break;
                }
                var msg = "";
                if (maybeSupportInFuture) {
                    msg = lf("{0} not currently supported", syntax);
                }
                else {
                    msg = lf("{0} not supported", syntax);
                }
                if (alternative) {
                    msg += " - " + alternative;
                }
                return userError(code, msg);
            }
            function nodeKey(f) {
                return getNodeId(f) + "";
            }
            function getFunctionInfo(f) {
                var key = nodeKey(f);
                var info = functionInfo[key];
                if (!info)
                    functionInfo[key] = info = {
                        decl: f,
                        capturedVars: []
                    };
                return info;
            }
            function getVarInfo(v) {
                var key = getNodeId(v) + "";
                var info = variableStatus[key];
                if (!info)
                    variableStatus[key] = info = {};
                return info;
            }
            function recordUse(v, written) {
                if (written === void 0) { written = false; }
                var info = getVarInfo(v);
                if (written)
                    info.written = true;
                var varParent = getEnclosingFunction(v);
                if (varParent == null || varParent == proc.action) {
                }
                else {
                    var curr = proc.action;
                    while (curr && curr != varParent) {
                        var info2 = getFunctionInfo(curr);
                        if (info2.capturedVars.indexOf(v) < 0)
                            info2.capturedVars.push(v);
                        curr = getEnclosingFunction(curr);
                    }
                    info.captured = true;
                }
            }
            function scope(f) {
                var prevProc = proc;
                var prevBindings = typeBindings.slice();
                try {
                    f();
                }
                finally {
                    proc = prevProc;
                    typeBindings = prevBindings;
                }
            }
            function getIfaceMemberId(name) {
                var v = pxtc.U.lookup(ifaceMembers, name);
                if (v != null)
                    return v;
                for (var _i = 0, _a = bin.usedClassInfos; _i < _a.length; _i++) {
                    var inf = _a[_i];
                    for (var _b = 0, _c = inf.methods; _b < _c.length; _b++) {
                        var m = _c[_b];
                        if (getName(m) == name)
                            markFunctionUsed(m, inf.bindings);
                    }
                }
                v = ifaceMembers[name] = nextIfaceMemberId++;
                return v;
            }
            function finalEmit() {
                if (diagnostics.getModificationCount() || opts.noEmit || !host)
                    return;
                bin.writeFile = function (fn, data) {
                    return host.writeFile(fn, data, false, null);
                };
                if (opts.target.isNative) {
                    if (opts.extinfo.yotta)
                        bin.writeFile("yotta.json", JSON.stringify(opts.extinfo.yotta, null, 2));
                    if (opts.extinfo.platformio)
                        bin.writeFile("platformio.json", JSON.stringify(opts.extinfo.platformio, null, 2));
                    if (opts.target.nativeType == pxtc.NATIVE_TYPE_CS)
                        pxtc.csEmit(bin, opts);
                    else if (opts.target.nativeType == pxtc.NATIVE_TYPE_AVRVM)
                        pxtc.vmEmit(bin, opts);
                    else
                        pxtc.processorEmit(bin, opts, res);
                }
                else {
                    pxtc.jsEmit(bin);
                }
            }
            function typeCheckVar(decl) {
                if (!decl) {
                    userError(9203, lf("variable has unknown type"));
                }
                if (typeOf(decl).flags & ts.TypeFlags.Void) {
                    userError(9203, lf("void-typed variables not supported"));
                }
            }
            function lookupCell(decl) {
                if (isGlobalVar(decl)) {
                    markUsed(decl);
                    typeCheckVar(decl);
                    var ex = bin.globals.filter(function (l) { return l.def == decl; })[0];
                    if (!ex) {
                        ex = new pxtc.ir.Cell(null, decl, getVarInfo(decl));
                        bin.globals.push(ex);
                    }
                    return ex;
                }
                else {
                    var res_1 = proc.localIndex(decl);
                    if (!res_1) {
                        if (bin.finalPass)
                            userError(9204, lf("cannot locate identifer"));
                        else
                            res_1 = proc.mkLocal(decl, getVarInfo(decl));
                    }
                    return res_1;
                }
            }
            function getBaseClassInfo(node) {
                if (node.heritageClauses)
                    for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                        var h = _a[_i];
                        switch (h.token) {
                            case pxtc.SK.ExtendsKeyword:
                                if (!h.types || h.types.length != 1)
                                    throw userError(9228, lf("invalid extends clause"));
                                var superType = typeOf(h.types[0]);
                                if (superType && isClassType(superType)) {
                                    // check if user defined
                                    // let filename = getSourceFileOfNode(tp.symbol.valueDeclaration).fileName
                                    // if (program.getRootFileNames().indexOf(filename) == -1) {
                                    //    throw userError(9228, lf("cannot inherit from built-in type."))
                                    // }
                                    // need to redo subtype checking on members
                                    var subType = checker.getTypeAtLocation(node);
                                    typeCheckSubtoSup(subType, superType);
                                    return getClassInfo(superType);
                                }
                                else {
                                    throw userError(9228, lf("cannot inherit from this type"));
                                }
                            // ignore it - implementation of interfaces is implicit
                            case pxtc.SK.ImplementsKeyword:
                                break;
                            default:
                                throw userError(9228, lf("invalid heritage clause"));
                        }
                    }
                return null;
            }
            function getVTable(inf) {
                pxtc.assert(inf.isUsed, "inf.isUsed");
                if (inf.vtable)
                    return inf.vtable;
                var tbl = inf.baseClassInfo ? getVTable(inf.baseClassInfo).slice(0) : [];
                scope(function () {
                    pxtc.U.pushRange(typeBindings, inf.bindings);
                    for (var _i = 0, _a = inf.methods; _i < _a.length; _i++) {
                        var m = _a[_i];
                        var minf = getFunctionInfo(m);
                        if (minf.virtualParent) {
                            var key = classFunctionKey(m);
                            var done = false;
                            var proc_1 = lookupProc(m, inf.bindings);
                            for (var i = 0; i < tbl.length; ++i) {
                                if (classFunctionKey(tbl[i].action) == key) {
                                    tbl[i] = proc_1;
                                    minf.virtualIndex = i;
                                    done = true;
                                }
                            }
                            if (!done) {
                                minf.virtualIndex = tbl.length;
                                tbl.push(proc_1);
                            }
                        }
                    }
                    inf.vtable = tbl;
                    inf.itable = [];
                    inf.itableInfo = [];
                    var storeIface = function (name, proc) {
                        var id = getIfaceMemberId(name);
                        inf.itable[id] = proc;
                        inf.itableInfo[id] = name;
                        pxtc.assert(!!proc, "!!proc");
                    };
                    var emitSynthetic = function (fn, fill) {
                        var proc = lookupProc(fn, inf.bindings);
                        if (!proc) {
                            scope(function () {
                                emitFuncCore(fn, inf.bindings);
                                proc = lookupProc(fn, inf.bindings);
                                proc.body = [];
                                fill(proc);
                            });
                        }
                        pxtc.assert(!!proc, "!!proc");
                        storeIface(getName(fn), proc);
                    };
                    var _loop_2 = function(fld0) {
                        var fld = fld0;
                        var fname = getName(fld);
                        var setname = "set/" + fname;
                        if (isIfaceMemberUsed(fname)) {
                            if (!fld.irGetter)
                                fld.irGetter = mkBogusMethod(inf, fname);
                            var idx_2 = fieldIndexCore(inf, fld, typeOf(fld));
                            emitSynthetic(fld.irGetter, function (proc) {
                                // we skip final decr, but the ldfld call will do its own decr
                                var access = pxtc.ir.op(EK.FieldAccess, [proc.args[0].loadCore()], idx_2);
                                emitInJmpValue(access);
                            });
                        }
                        if (isIfaceMemberUsed(setname)) {
                            if (!fld.irSetter) {
                                fld.irSetter = mkBogusMethod(inf, setname);
                                fld.irSetter.parameters.unshift({
                                    kind: pxtc.SK.Parameter,
                                    name: { text: "v" },
                                    parent: fld.irSetter,
                                    typeOverride: typeOf(fld)
                                });
                            }
                            var idx_3 = fieldIndexCore(inf, fld, typeOf(fld));
                            emitSynthetic(fld.irSetter, function (proc) {
                                // decrs work out
                                var access = pxtc.ir.op(EK.FieldAccess, [proc.args[0].loadCore()], idx_3);
                                proc.emitExpr(pxtc.ir.op(EK.Store, [access, proc.args[1].loadCore()]));
                            });
                        }
                    };
                    for (var _b = 0, _c = inf.allfields; _b < _c.length; _b++) {
                        var fld0 = _c[_b];
                        _loop_2(fld0);
                    }
                    for (var curr = inf; curr; curr = curr.baseClassInfo) {
                        for (var _d = 0, _e = curr.methods; _d < _e.length; _d++) {
                            var m = _e[_d];
                            var n = getName(m);
                            if (isIfaceMemberUsed(n)) {
                                var id = getIfaceMemberId(n);
                                if (!inf.itable[id]) {
                                    storeIface(n, lookupProc(m, curr.bindings));
                                }
                            }
                        }
                    }
                    for (var i = 0; i < inf.itable.length; ++i)
                        if (!inf.itable[i])
                            inf.itable[i] = null; // avoid undefined
                    for (var _f = 0, _g = Object.keys(ifaceMembers); _f < _g.length; _f++) {
                        var k = _g[_f];
                        inf.itableInfo[ifaceMembers[k]] = k;
                    }
                });
                return inf.vtable;
            }
            // this code determines if we will need a vtable entry
            // by checking if we are overriding a method in a super class
            function computeVtableInfo(info) {
                // walk up the inheritance chain to collect any methods
                // we may be overriding in this class
                var nameMap = {};
                for (var curr = info.baseClassInfo; !!curr; curr = curr.baseClassInfo) {
                    for (var _i = 0, _a = curr.methods; _i < _a.length; _i++) {
                        var m = _a[_i];
                        nameMap[classFunctionKey(m)] = m;
                    }
                }
                for (var _b = 0, _c = info.methods; _b < _c.length; _b++) {
                    var m = _c[_b];
                    var prev = pxtc.U.lookup(nameMap, classFunctionKey(m));
                    if (prev) {
                        var minf = getFunctionInfo(m);
                        var pinf = getFunctionInfo(prev);
                        if (prev.parameters.length != m.parameters.length)
                            error(m, 9255, lf("the overriding method is currently required to have the same number of arguments as the base one"));
                        // pinf is just the parent (why not transitive?)
                        minf.virtualParent = pinf;
                        if (!pinf.virtualParent)
                            pinf.virtualParent = pinf;
                        pxtc.assert(pinf.virtualParent == pinf, "pinf.virtualParent == pinf");
                        if (!pinf.virtualInstances)
                            pinf.virtualInstances = [];
                        pinf.virtualInstances.push(minf);
                    }
                }
            }
            function pruneMethodsAndRecompute() {
                // reset the virtual info
                for (var fi in functionInfo) {
                    functionInfo[fi].virtualParent = undefined;
                    functionInfo[fi].virtualIndex = undefined;
                    functionInfo[fi].virtualInstances = undefined;
                }
                // remove methods that are not used
                for (var ci in classInfos) {
                    classInfos[ci].methods = classInfos[ci].methods.filter(function (m) { return getFunctionInfo(m).isUsed; });
                }
                // recompute vtable info
                for (var ci in classInfos) {
                    if (classInfos[ci].baseClassInfo)
                        computeVtableInfo(classInfos[ci]);
                }
            }
            function getClassInfo(t, decl, bindings) {
                if (decl === void 0) { decl = null; }
                if (bindings === void 0) { bindings = null; }
                if (!decl)
                    decl = t.symbol.valueDeclaration;
                if (!bindings)
                    bindings = t
                        ? getTypeBindings(t)
                        : decl.typeParameters
                            ? decl.typeParameters.map(function (p) { return ({ isRef: true, tp: checker.getTypeAtLocation(p), arg: checker.getTypeAtLocation(p) }); })
                            : [];
                var id = "C" + getNodeId(decl) + refMask(bindings);
                var info = classInfos[id];
                if (!info) {
                    var reffields_1 = [];
                    var primitivefields_1 = [];
                    info = {
                        id: id,
                        numRefFields: 0,
                        allfields: [],
                        attrs: parseComments(decl),
                        decl: decl,
                        refmask: null,
                        baseClassInfo: null,
                        methods: [],
                        bindings: bindings
                    };
                    if (info.attrs.autoCreate)
                        autoCreateFunctions[info.attrs.autoCreate] = true;
                    classInfos[id] = info;
                    // only do it after storing our in case we run into cycles (which should be errors)
                    info.baseClassInfo = getBaseClassInfo(decl);
                    scope(function () {
                        pxtc.U.pushRange(typeBindings, bindings);
                        for (var _i = 0, _a = decl.members; _i < _a.length; _i++) {
                            var mem = _a[_i];
                            if (mem.kind == pxtc.SK.PropertyDeclaration) {
                                var pdecl = mem;
                                if (isRefType(typeOf(pdecl)))
                                    reffields_1.push(pdecl);
                                else
                                    primitivefields_1.push(pdecl);
                                info.allfields.push(pdecl);
                            }
                            else if (isClassFunction(mem) && mem.kind != pxtc.SK.Constructor) {
                                var minf = getFunctionInfo(mem);
                                minf.parentClassInfo = info;
                                info.methods.push(mem);
                            }
                        }
                        if (info.baseClassInfo) {
                            info.allfields = info.baseClassInfo.allfields.concat(info.allfields);
                            info.numRefFields = -1;
                            computeVtableInfo(info);
                        }
                        else {
                            info.allfields = reffields_1.concat(primitivefields_1);
                            info.numRefFields = reffields_1.length;
                        }
                        info.refmask = info.allfields.map(function (f) { return isRefType(typeOf(f)); });
                    });
                }
                return info;
            }
            function emitImageLiteral(s) {
                if (!s)
                    s = "0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n";
                var x = 0;
                var w = 0;
                var h = 0;
                var lit = "";
                s += "\n";
                for (var i = 0; i < s.length; ++i) {
                    switch (s[i]) {
                        case ".":
                        case "_":
                        case "0":
                            lit += "0,";
                            x++;
                            break;
                        case "#":
                        case "*":
                        case "1":
                            lit += "1,";
                            x++;
                            break;
                        case "\t":
                        case "\r":
                        case " ": break;
                        case "\n":
                            if (x) {
                                if (w == 0)
                                    w = x;
                                else if (x != w)
                                    userError(9205, lf("lines in image literal have to have the same width (got {0} and then {1} pixels)", w, x));
                                x = 0;
                                h++;
                            }
                            break;
                        default:
                            userError(9206, lf("Only 0 . _ (off) and 1 # * (on) are allowed in image literals"));
                    }
                }
                var lbl = "_img" + bin.lblNo++;
                if (lit.length % 4 != 0)
                    lit += "42"; // pad
                bin.otherLiterals.push("\n.balign 4\n" + lbl + ": .short 0xffff\n        .short " + w + ", " + h + "\n        .byte " + lit + "\n");
                var jsLit = "new pxsim.Image(" + w + ", [" + lit + "])";
                return {
                    kind: pxtc.SK.NumericLiteral,
                    imageLiteral: lbl,
                    jsLit: jsLit
                };
            }
            function emitLocalLoad(decl) {
                if (isGlobalVar(decl)) {
                    var attrs = parseComments(decl);
                    if (attrs.shim)
                        return emitShim(decl, decl, []);
                }
                var l = lookupCell(decl);
                recordUse(decl);
                var r = l.load();
                //console.log("LOADLOC", l.toString(), r.toString())
                return r;
            }
            function emitFunLiteral(f) {
                var attrs = parseComments(f);
                if (attrs.shim)
                    userError(9207, lf("built-in functions cannot be yet used as values; did you forget ()?"));
                if (isGenericFunction(f))
                    userError(9232, lf("generic functions cannot be yet used as values; did you forget ()?"));
                var info = getFunctionInfo(f);
                if (info.location) {
                    return info.location.load();
                }
                else {
                    pxtc.assert(!bin.finalPass || info.capturedVars.length == 0, "!bin.finalPass || info.capturedVars.length == 0");
                    return emitFunLitCore(f);
                }
            }
            function emitIdentifier(node) {
                var decl = getDecl(node);
                if (decl && (decl.kind == pxtc.SK.VariableDeclaration || decl.kind == pxtc.SK.Parameter || decl.kind === pxtc.SK.BindingElement)) {
                    return emitLocalLoad(decl);
                }
                else if (decl && decl.kind == pxtc.SK.FunctionDeclaration) {
                    return emitFunLiteral(decl);
                }
                else {
                    if (node.text == "undefined")
                        return emitLit(undefined);
                    else
                        throw unhandled(node, lf("Unknown or undeclared identifier"), 9235);
                }
            }
            function emitParameter(node) { }
            function emitAccessor(node) {
                emitFunctionDeclaration(node);
            }
            function emitThis(node) {
                var meth = getEnclosingMethod(node);
                if (!meth)
                    userError(9208, lf("'this' used outside of a method"));
                var inf = getFunctionInfo(meth);
                if (!inf.thisParameter) {
                    //console.log("get this param,", meth.kind, nodeKey(meth))
                    //console.log("GET", meth)
                    pxtc.oops("no this");
                }
                return emitLocalLoad(inf.thisParameter);
            }
            function emitSuper(node) { }
            function emitStringLiteral(str) {
                if (str == "") {
                    return pxtc.ir.rtcall("String_::mkEmpty", []);
                }
                else {
                    var lbl = bin.emitString(str);
                    var res_2 = pxtc.ir.ptrlit(lbl + "meta", JSON.stringify(str), true);
                    return res_2;
                }
            }
            function emitLiteral(node) {
                if (node.kind == pxtc.SK.NumericLiteral) {
                    if (node.imageLiteral) {
                        return pxtc.ir.ptrlit(node.imageLiteral, node.jsLit);
                    }
                    else {
                        var parsed = parseFloat(node.text);
                        if (!opts.target.floatingPoint) {
                            if (Math.floor(parsed) !== parsed) {
                                userError(9257, lf("Decimal numbers are not supported"));
                            }
                            else if (parsed << 0 !== parsed) {
                                userError(9258, lf("Number is either too big or too small"));
                            }
                        }
                        return emitLit(parsed);
                    }
                }
                else if (isStringLiteral(node)) {
                    return emitStringLiteral(node.text);
                }
                else {
                    throw pxtc.oops();
                }
            }
            function emitTemplateExpression(node) {
                // TODO use getMask() to avoid incr() on string literals
                var concat = function (a, b) {
                    return isEmptyStringLiteral(b) ? a :
                        pxtc.ir.rtcallMask("String_::concat", 3, pxtc.ir.CallingConvention.Plain, [
                            a,
                            emitAsString(b)
                        ]);
                };
                // TODO could optimize for the case where node.head is empty
                var expr = emitAsString(node.head);
                for (var _i = 0, _a = node.templateSpans; _i < _a.length; _i++) {
                    var span = _a[_i];
                    expr = concat(expr, span.expression);
                    expr = concat(expr, span.literal);
                }
                return expr;
            }
            function emitTemplateSpan(node) { }
            function emitJsxElement(node) { }
            function emitJsxSelfClosingElement(node) { }
            function emitJsxText(node) { }
            function emitJsxExpression(node) { }
            function emitQualifiedName(node) { }
            function emitObjectBindingPattern(node) { }
            function emitArrayBindingPattern(node) { }
            function emitArrayLiteral(node) {
                var eltT = arrayElementType(typeOf(node));
                var isRef = isRefType(eltT);
                var flag = 0;
                if (eltT.flags & ts.TypeFlags.String)
                    flag = 3;
                else if (isRef)
                    flag = 1;
                var coll = pxtc.ir.shared(pxtc.ir.rtcall("Array_::mk", opts.target.floatingPoint ? [] : [pxtc.ir.numlit(flag)]));
                for (var _i = 0, _a = node.elements; _i < _a.length; _i++) {
                    var elt = _a[_i];
                    var e = pxtc.ir.shared(emitExpr(elt));
                    proc.emitExpr(pxtc.ir.rtcall("Array_::push", [coll, e]));
                    if (isRef) {
                        proc.emitExpr(pxtc.ir.op(EK.Decr, [e]));
                    }
                }
                return coll;
            }
            function emitObjectLiteral(node) {
                var expr = pxtc.ir.shared(pxtc.ir.rtcall("pxtrt::mkMap", []));
                node.properties.forEach(function (p) {
                    if (p.kind == pxtc.SK.ShorthandPropertyAssignment) {
                        userError(9264, "Shorthand properties not supported.");
                    }
                    var refSuff = "";
                    if (isRefCountedExpr(p.initializer))
                        refSuff = "Ref";
                    proc.emitExpr(pxtc.ir.rtcall("pxtrt::mapSet" + refSuff, [
                        pxtc.ir.op(EK.Incr, [expr]),
                        pxtc.ir.numlit(getIfaceMemberId(p.name.getText())),
                        emitExpr(p.initializer)
                    ]));
                });
                return expr;
            }
            function emitPropertyAssignment(node) {
                if (isStatic(node)) {
                    emitVariableDeclaration(node);
                    return;
                }
                if (node.initializer)
                    userError(9209, lf("class field initializers not supported"));
                // do nothing
            }
            function emitShorthandPropertyAssignment(node) { }
            function emitComputedPropertyName(node) { }
            function emitPropertyAccess(node) {
                var decl = getDecl(node);
                // we need to type check node.expression before committing code gen
                if (!decl || (decl.kind == pxtc.SK.PropertyDeclaration && !isStatic(decl))
                    || decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment) {
                    emitExpr(node.expression, false);
                    if (!decl)
                        return pxtc.ir.numlit(0);
                }
                if (decl.kind == pxtc.SK.GetAccessor) {
                    return emitCallCore(node, node, [], null);
                }
                var attrs = parseComments(decl);
                var callInfo = {
                    decl: decl,
                    qName: pxtc.getFullName(checker, decl.symbol),
                    attrs: attrs,
                    args: [],
                    isExpression: true
                };
                node.callInfo = callInfo;
                if (decl.kind == pxtc.SK.EnumMember) {
                    var ev = attrs.enumval;
                    if (!ev) {
                        var val = checker.getConstantValue(decl);
                        if (val == null) {
                            if (decl.initializer)
                                return emitExpr(decl.initializer);
                            userError(9210, lf("Cannot compute enum value"));
                        }
                        ev = val + "";
                    }
                    if (/^[+-]?\d+$/.test(ev))
                        return emitLit(parseInt(ev));
                    if (/^0x[A-Fa-f\d]{2,8}$/.test(ev))
                        return emitLit(parseInt(ev, 16));
                    pxtc.U.userError("enumval only support number literals");
                    // TODO needs dealing with int conversions
                    return pxtc.ir.rtcall(ev, []);
                }
                else if (decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment) {
                    return emitCallCore(node, node, [], null, decl, node.expression);
                }
                else if (decl.kind == pxtc.SK.PropertyDeclaration) {
                    if (isStatic(decl)) {
                        return emitLocalLoad(decl);
                    }
                    var idx = fieldIndex(node);
                    callInfo.args.push(node.expression);
                    return pxtc.ir.op(EK.FieldAccess, [emitExpr(node.expression)], idx);
                }
                else if (isClassFunction(decl) || decl.kind == pxtc.SK.MethodSignature) {
                    throw userError(9211, lf("cannot use method as lambda; did you forget '()' ?"));
                }
                else if (decl.kind == pxtc.SK.FunctionDeclaration) {
                    return emitFunLiteral(decl);
                }
                else if (decl.kind == pxtc.SK.VariableDeclaration) {
                    return emitLocalLoad(decl);
                }
                else {
                    throw unhandled(node, lf("Unknown property access for {0}", stringKind(decl)), 9237);
                }
            }
            function emitIndexedAccess(node, assign) {
                if (assign === void 0) { assign = null; }
                var t = typeOf(node.expression);
                var attrs = {
                    callingConvention: pxtc.ir.CallingConvention.Plain,
                    paramDefl: {},
                };
                var indexer = null;
                if (!assign && t.flags & ts.TypeFlags.String) {
                    indexer = "String_::charAt";
                }
                else if (isArrayType(t))
                    indexer = assign ? "Array_::setAt" : "Array_::getAt";
                else if (isInterfaceType(t)) {
                    attrs = parseCommentsOnSymbol(t.symbol);
                    indexer = assign ? attrs.indexerSet : attrs.indexerGet;
                }
                if (indexer) {
                    if (isNumberLike(node.argumentExpression)) {
                        var args = [node.expression, node.argumentExpression];
                        return rtcallMask(indexer, args, attrs, assign ? [assign] : []);
                    }
                    else {
                        throw unhandled(node, lf("non-numeric indexer on {0}", indexer), 9238);
                    }
                }
                else {
                    throw unhandled(node, lf("unsupported indexer"), 9239);
                }
            }
            function isOnDemandGlobal(decl) {
                if (!isGlobalVar(decl))
                    return false;
                var v = decl;
                if (!isSideEffectfulInitializer(v.initializer))
                    return true;
                var attrs = parseComments(decl);
                if (attrs.whenUsed)
                    return true;
                return false;
            }
            function isOnDemandDecl(decl) {
                var res = isOnDemandGlobal(decl) || isTopLevelFunctionDecl(decl);
                if (opts.testMode && res) {
                    if (!pxtc.U.startsWith(ts.getSourceFileOfNode(decl).fileName, "pxt_modules"))
                        return false;
                }
                return res;
            }
            function isUsed(decl) {
                return !isOnDemandDecl(decl) || usedDecls.hasOwnProperty(nodeKey(decl));
            }
            function markFunctionUsed(decl, bindings) {
                getFunctionInfo(decl).isUsed = true;
                if (!bindings || !bindings.length)
                    markUsed(decl);
                else {
                    var info = getFunctionInfo(decl);
                    if (!info.usages) {
                        usedDecls[nodeKey(decl)] = decl;
                        info.usages = [];
                        info.prePassUsagesEmitted = 0;
                        if (opts.computeUsedSymbols && decl && decl.symbol)
                            res.usedSymbols[pxtc.getFullName(checker, decl.symbol)] = null;
                    }
                    var mask_1 = refMask(bindings);
                    if (!info.usages.some(function (u) { return refMask(u) == mask_1; })) {
                        info.usages.push(bindings);
                        usedWorkList.push(decl);
                    }
                }
            }
            function markUsed(decl) {
                if (opts.computeUsedSymbols && decl && decl.symbol)
                    res.usedSymbols[pxtc.getFullName(checker, decl.symbol)] = null;
                if (decl && !isUsed(decl)) {
                    usedDecls[nodeKey(decl)] = decl;
                    usedWorkList.push(decl);
                }
            }
            function getDecl(node) {
                if (!node)
                    return null;
                var sym = checker.getSymbolAtLocation(node);
                var decl;
                if (sym) {
                    decl = sym.valueDeclaration;
                    if (!decl && sym.declarations) {
                        var decl0 = sym.declarations[0];
                        if (decl0 && decl0.kind == ts.SyntaxKind.ImportEqualsDeclaration) {
                            sym = checker.getSymbolAtLocation(decl0.moduleReference);
                            if (sym)
                                decl = sym.valueDeclaration;
                        }
                    }
                }
                markUsed(decl);
                return decl;
            }
            function isRefCountedExpr(e) {
                // we generate a fake NULL expression for default arguments
                // we also generate a fake numeric literal for image literals
                if (e.kind == pxtc.SK.NullKeyword || e.kind == pxtc.SK.NumericLiteral)
                    return !!e.isRefOverride;
                // no point doing the incr/decr for these - they are statically allocated anyways (unless on AVR)
                if (!isAVR() && isStringLiteral(e))
                    return false;
                return isRefType(typeOf(e));
            }
            function getMask(args) {
                pxtc.assert(args.length <= 8, "args.length <= 8");
                var m = 0;
                args.forEach(function (a, i) {
                    if (isRefCountedExpr(a))
                        m |= (1 << i);
                });
                return m;
            }
            function emitShim(decl, node, args) {
                var attrs = parseComments(decl);
                var hasRet = !(typeOf(node).flags & ts.TypeFlags.Void);
                var nm = attrs.shim;
                if (opts.target.needsUnboxing)
                    switch (nm) {
                        case "Number_::toString":
                        case "Boolean_::toString":
                            nm = "numops::toString";
                            break;
                    }
                if (nm.indexOf('(') >= 0) {
                    var parse = /(.*)\((.*)\)$/.exec(nm);
                    if (parse) {
                        if (args.length)
                            pxtc.U.userError("no arguments expected");
                        var litargs = [];
                        var strargs = parse[2].replace(/\s/g, "");
                        if (strargs) {
                            for (var _i = 0, _a = parse[2].split(/,/); _i < _a.length; _i++) {
                                var a = _a[_i];
                                var v = parseInt(a);
                                if (isNaN(v)) {
                                    v = lookupDalConst(node, a);
                                    if (v == null)
                                        v = lookupConfigConst(node, a);
                                    if (v == null)
                                        pxtc.U.userError("invalid argument: " + a + " in " + nm);
                                }
                                litargs.push(pxtc.ir.numlit(v));
                            }
                            if (litargs.length > 4)
                                pxtc.U.userError("too many args");
                        }
                        nm = parse[1];
                        if (opts.target.isNative) {
                            pxtc.hex.validateShim(getDeclName(decl), nm, attrs, true, litargs.map(function (v) { return true; }));
                        }
                        return pxtc.ir.rtcallMask(nm, 0, attrs.callingConvention, litargs);
                    }
                }
                if (nm == "TD_NOOP") {
                    pxtc.assert(!hasRet, "!hasRet");
                    return emitLit(undefined);
                }
                if (nm == "TD_ID") {
                    pxtc.assert(args.length == 1, "args.length == 1");
                    return emitExpr(args[0]);
                }
                if (opts.target.isNative) {
                    pxtc.hex.validateShim(getDeclName(decl), nm, attrs, hasRet, args.map(isNumberLike));
                }
                return rtcallMask(nm, args, attrs);
            }
            function isNumericLiteral(node) {
                switch (node.kind) {
                    case pxtc.SK.NullKeyword:
                    case pxtc.SK.TrueKeyword:
                    case pxtc.SK.FalseKeyword:
                    case pxtc.SK.NumericLiteral:
                        return true;
                    case pxtc.SK.PropertyAccessExpression:
                        var r = emitExpr(node);
                        return r.exprKind == EK.NumberLiteral;
                    default:
                        return false;
                }
            }
            function addDefaultParametersAndTypeCheck(sig, args, attrs) {
                if (!sig)
                    return;
                var parms = sig.getParameters();
                // remember the number of arguments passed explicitly
                var goodToGoLength = args.length;
                if (parms.length > args.length) {
                    parms.slice(args.length).forEach(function (p) {
                        if (p.valueDeclaration &&
                            p.valueDeclaration.kind == pxtc.SK.Parameter) {
                            var prm = p.valueDeclaration;
                            if (!prm.initializer) {
                                var defl = attrs.paramDefl[getName(prm)];
                                var expr = defl ? emitLit(parseInt(defl)) : null;
                                if (expr == null) {
                                    if (typeOf(prm).flags & ts.TypeFlags.NumberLike)
                                        expr = emitLit(0);
                                    else
                                        expr = emitLit(undefined);
                                }
                                args.push(irToNode(expr));
                            }
                            else {
                                if (!isNumericLiteral(prm.initializer)) {
                                    userError(9212, lf("only numbers, null, true and false supported as default arguments"));
                                }
                                args.push(prm.initializer);
                            }
                        }
                        else {
                            userError(9213, lf("unsupported default argument (shouldn't happen)"));
                        }
                    });
                }
                // type check for assignment of actual to formal,
                // TODO: checks for the rest needed
                for (var i = 0; i < goodToGoLength; i++) {
                    var p = parms[i];
                    // there may be more arguments than parameters
                    if (p && p.valueDeclaration && p.valueDeclaration.kind == pxtc.SK.Parameter)
                        typeCheckSubtoSup(args[i], p.valueDeclaration);
                }
                // TODO: this is micro:bit specific and should be lifted out
                if (attrs.imageLiteral) {
                    if (!isStringLiteral(args[0])) {
                        userError(9214, lf("Only image literals (string literals) supported here; {0}", stringKind(args[0])));
                    }
                    args[0] = emitImageLiteral(args[0].text);
                }
            }
            function emitCallExpression(node) {
                var sig = checker.getResolvedSignature(node);
                return emitCallCore(node, node.expression, node.arguments, sig);
            }
            function emitCallCore(node, funcExpr, callArgs, sig, decl, recv) {
                if (decl === void 0) { decl = null; }
                if (recv === void 0) { recv = null; }
                if (!decl)
                    decl = getDecl(funcExpr);
                var isMethod = false;
                if (decl) {
                    switch (decl.kind) {
                        // we treat properties via calls
                        // so we say they are "methods"
                        case pxtc.SK.PropertySignature:
                        case pxtc.SK.PropertyAssignment:
                        // TOTO case: case SK.ShorthandPropertyAssignment
                        // these are the real methods
                        case pxtc.SK.MethodDeclaration:
                        case pxtc.SK.MethodSignature:
                        case pxtc.SK.GetAccessor:
                        case pxtc.SK.SetAccessor:
                            isMethod = true;
                            break;
                        case pxtc.SK.ModuleDeclaration:
                        case pxtc.SK.FunctionDeclaration:
                            // has special handling
                            break;
                        default:
                            decl = null; // no special handling
                            break;
                    }
                }
                var attrs = parseComments(decl);
                var hasRet = !(typeOf(node).flags & ts.TypeFlags.Void);
                var args = callArgs.slice(0);
                var callInfo = {
                    decl: decl,
                    qName: decl ? pxtc.getFullName(checker, decl.symbol) : "?",
                    attrs: attrs,
                    args: args.slice(0),
                    isExpression: hasRet
                };
                node.callInfo = callInfo;
                if (isMethod && !recv && !isStatic(decl) && funcExpr.kind == pxtc.SK.PropertyAccessExpression)
                    recv = funcExpr.expression;
                if (callInfo.args.length == 0 && pxtc.U.lookup(autoCreateFunctions, callInfo.qName))
                    callInfo.isAutoCreate = true;
                var bindings = getCallBindings(sig);
                var isSelfGeneric = bindings.length > 0;
                addEnclosingTypeBindings(bindings, decl);
                if (res.usedArguments && attrs.trackArgs) {
                    var targs_1 = recv ? [recv].concat(args) : args;
                    var tracked = attrs.trackArgs.map(function (n) { return targs_1[n]; }).map(function (e) {
                        var d = getDecl(e);
                        if (d && (d.kind == pxtc.SK.EnumMember || d.kind == pxtc.SK.VariableDeclaration))
                            return pxtc.getFullName(checker, d.symbol);
                        else
                            return "*";
                    }).join(",");
                    var fn = pxtc.getFullName(checker, decl.symbol);
                    var lst = res.usedArguments[fn];
                    if (!lst) {
                        lst = res.usedArguments[fn] = [];
                    }
                    if (lst.indexOf(tracked) < 0)
                        lst.push(tracked);
                }
                function emitPlain() {
                    return mkProcCall(decl, args.map(function (x) { return emitExpr(x); }), bindings);
                }
                scope(function () {
                    pxtc.U.pushRange(typeBindings, bindings);
                    addDefaultParametersAndTypeCheck(sig, args, attrs);
                });
                // first we handle a set of direct cases, note that
                // we are not recursing on funcExpr here, but looking
                // at the associated decl
                if (decl && decl.kind == pxtc.SK.FunctionDeclaration) {
                    var info = getFunctionInfo(decl);
                    if (!info.location) {
                        if (attrs.shim && !hasShimDummy(decl)) {
                            return emitShim(decl, node, args);
                        }
                        markFunctionUsed(decl, bindings);
                        return emitPlain();
                    }
                }
                // special case call to super
                if (funcExpr.kind == pxtc.SK.SuperKeyword) {
                    var baseCtor = proc.classInfo.baseClassInfo.ctor;
                    pxtc.assert(!bin.finalPass || !!baseCtor, "!bin.finalPass || !!baseCtor");
                    var ctorArgs = args.map(function (x) { return emitExpr(x); });
                    ctorArgs.unshift(emitThis(funcExpr));
                    return mkProcCallCore(baseCtor, null, ctorArgs);
                }
                if (isMethod) {
                    var isSuper = false;
                    if (isStatic(decl)) {
                    }
                    else if (recv) {
                        if (recv.kind == pxtc.SK.SuperKeyword) {
                            isSuper = true;
                        }
                        args.unshift(recv);
                        callInfo.args.unshift(recv);
                        bindings = getTypeBindings(typeOf(recv)).concat(bindings);
                    }
                    else
                        unhandled(node, lf("strange method call"), 9241);
                    var info = getFunctionInfo(decl);
                    // if we call a method and it overrides then
                    // mark the virtual root class and all its overrides as used,
                    // if their classes are used
                    if (info.virtualParent)
                        info = info.virtualParent;
                    if (!info.isUsed) {
                        info.isUsed = true;
                        for (var _i = 0, _a = info.virtualInstances || []; _i < _a.length; _i++) {
                            var vinst = _a[_i];
                            if (vinst.parentClassInfo.isUsed)
                                markFunctionUsed(vinst.decl, bindings);
                        }
                    }
                    if (info.virtualParent && !isSuper) {
                        pxtc.U.assert(!bin.finalPass || info.virtualIndex != null, "!bin.finalPass || info.virtualIndex != null");
                        return mkProcCallCore(null, info.virtualIndex, args.map(function (x) { return emitExpr(x); }));
                    }
                    if (attrs.shim && !hasShimDummy(decl)) {
                        return emitShim(decl, node, args);
                    }
                    else if (attrs.helper) {
                        var syms = checker.getSymbolsInScope(node, ts.SymbolFlags.Module);
                        var helpersModule = syms.filter(function (s) { return s.name == "helpers"; })[0].valueDeclaration;
                        var helperStmt = helpersModule.body.statements.filter(function (s) { return s.symbol.name == attrs.helper; })[0];
                        if (!helperStmt)
                            userError(9215, lf("helpers.{0} not found", attrs.helper));
                        if (helperStmt.kind != pxtc.SK.FunctionDeclaration)
                            userError(9216, lf("helpers.{0} isn't a function", attrs.helper));
                        decl = helperStmt;
                        var sig_1 = checker.getSignatureFromDeclaration(decl);
                        var tp_1 = sig_1.getTypeParameters() || [];
                        if (tp_1.length != bindings.length)
                            pxtc.U.oops("helpers type parameter mismatch"); // can it happen?
                        bindings.forEach(function (b, i) {
                            b.tp = tp_1[i];
                        });
                        markFunctionUsed(decl, bindings);
                        return emitPlain();
                    }
                    else if (decl.kind == pxtc.SK.MethodSignature) {
                        var name_5 = getName(decl);
                        return mkProcCallCore(null, null, args.map(function (x) { return emitExpr(x); }), getIfaceMemberId(name_5));
                    }
                    else if (decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment) {
                        if (node == funcExpr) {
                            // in this special base case, we have property access recv.foo
                            // where recv is a map obejct
                            var name_6 = getName(decl);
                            var res_3 = mkProcCallCore(null, null, args.map(function (x) { return emitExpr(x); }), getIfaceMemberId(name_6));
                            if (decl.kind == pxtc.SK.PropertySignature || decl.kind == pxtc.SK.PropertyAssignment) {
                                var pid = res_3.data;
                                pid.mapIdx = pid.ifaceIndex;
                                var refSuff = "";
                                if (args.length == 2) {
                                    if (isRefCountedExpr(args[1]))
                                        refSuff = "Ref";
                                    pid.ifaceIndex = getIfaceMemberId("set/" + name_6);
                                    pid.mapMethod = "pxtrt::mapSet" + refSuff;
                                }
                                else {
                                    if (isRefType(typeOf(node)))
                                        refSuff = "Ref";
                                    pid.mapMethod = "pxtrt::mapGet" + refSuff;
                                }
                            }
                            return res_3;
                        }
                        else {
                            // in this case, recv.foo represents a function/lambda
                            // so the receiver is not needed, as we have already done
                            // the property lookup to get the lambda
                            args.shift();
                            callInfo.args.shift();
                        }
                    }
                    else {
                        markFunctionUsed(decl, bindings);
                        return emitPlain();
                    }
                }
                if (isSelfGeneric)
                    pxtc.U.oops("invalid generic call");
                if (decl && decl.kind == pxtc.SK.ModuleDeclaration) {
                    if (getName(decl) == "String")
                        userError(9219, lf("to convert X to string use: X + \"\""));
                    else
                        userError(9220, lf("namespaces cannot be called directly"));
                }
                // otherwise we assume a lambda
                if (args.length > (isStackMachine() ? 2 : 3))
                    userError(9217, lf("lambda functions with more than 3 arguments not supported"));
                var suff = args.length + "";
                // here's where we will recurse to generate toe evaluate funcExpr
                args.unshift(funcExpr);
                callInfo.args.unshift(funcExpr);
                // lambdas do not decr() arguments themselves; do it normally with getMask()
                return pxtc.ir.rtcallMask("pxt::runAction" + suff, getMask(args), pxtc.ir.CallingConvention.Async, args.map(function (x) { return emitExpr(x); }));
            }
            function mkProcCallCore(proc, vidx, args, ifaceIdx) {
                if (ifaceIdx === void 0) { ifaceIdx = null; }
                var data = {
                    proc: proc,
                    virtualIndex: vidx,
                    ifaceIndex: ifaceIdx
                };
                return pxtc.ir.op(EK.ProcCall, args, data);
            }
            function lookupProc(decl, bindings) {
                var id = { action: decl, bindings: bindings };
                return bin.procs.filter(function (p) { return p.matches(id); })[0];
            }
            function mkProcCall(decl, args, bindings) {
                var proc = lookupProc(decl, bindings);
                pxtc.assert(!!proc || !bin.finalPass, "!!proc || !bin.finalPass");
                return mkProcCallCore(proc, null, args);
            }
            function layOutGlobals() {
                var globals = bin.globals.slice(0);
                // stable-sort globals, with smallest first, because "strh/b" have
                // smaller immediate range than plain "str" (and same for "ldr")
                globals.forEach(function (g, i) { return g.index = i; });
                globals.sort(function (a, b) {
                    return sizeOfBitSize(a.bitSize) - sizeOfBitSize(b.bitSize) ||
                        a.index - b.index;
                });
                var currOff = pxtc.numReservedGlobals * 4;
                for (var _i = 0, globals_1 = globals; _i < globals_1.length; _i++) {
                    var g = globals_1[_i];
                    var sz = sizeOfBitSize(g.bitSize);
                    while (currOff & (sz - 1))
                        currOff++; // align
                    g.index = currOff;
                    currOff += sz;
                }
                bin.globalsWords = (currOff + 3) >> 2;
            }
            function emitVTables() {
                for (var _i = 0, _a = bin.usedClassInfos; _i < _a.length; _i++) {
                    var info = _a[_i];
                    getVTable(info); // gets cached
                }
            }
            function getCtor(decl) {
                return decl.members.filter(function (m) { return m.kind == pxtc.SK.Constructor; })[0];
            }
            function isIfaceMemberUsed(name) {
                return pxtc.U.lookup(ifaceMembers, name) != null;
            }
            function getCallBindings(sig) {
                var bindings = [];
                if (sig) {
                    // NOTE: we are playing with TypeScript internals here
                    var trg = sig.target;
                    var typeParams = sig.typeParameters || (trg ? trg.typeParameters : null) || [];
                    // NOTE: mapper also a TypeScript internal
                    var args = typeParams.map(function (x) { return sig.mapper(x); });
                    bindings = getTypeBindingsCore(typeParams, args);
                }
                return bindings;
            }
            function markClassUsed(info) {
                if (info.isUsed)
                    return;
                info.isUsed = true;
                if (info.baseClassInfo)
                    markClassUsed(info.baseClassInfo);
                bin.usedClassInfos.push(info);
                for (var _i = 0, _a = info.methods; _i < _a.length; _i++) {
                    var m = _a[_i];
                    var minf = getFunctionInfo(m);
                    if (isIfaceMemberUsed(getName(m)) || (minf.virtualParent && minf.virtualParent.isUsed))
                        markFunctionUsed(m, info.bindings);
                }
                var ctor = getCtor(info.decl);
                if (ctor) {
                    markFunctionUsed(ctor, info.bindings);
                }
            }
            function emitNewExpression(node) {
                var t = typeOf(node);
                if (isArrayType(t)) {
                    throw pxtc.oops();
                }
                else if (isPossiblyGenericClassType(t)) {
                    var classDecl = getDecl(node.expression);
                    if (classDecl.kind != pxtc.SK.ClassDeclaration) {
                        userError(9221, lf("new expression only supported on class types"));
                    }
                    var ctor = void 0;
                    var info = getClassInfo(typeOf(node), classDecl);
                    // find ctor to call in base chain
                    for (var parinfo = info; parinfo; parinfo = parinfo.baseClassInfo) {
                        ctor = getCtor(parinfo.decl);
                        if (ctor)
                            break;
                    }
                    markClassUsed(info);
                    var lbl = info.id + "_VT";
                    var obj = pxtc.ir.rtcall("pxt::mkClassInstance", [pxtc.ir.ptrlit(lbl, lbl)]);
                    obj = pxtc.ir.shared(obj);
                    if (ctor) {
                        markUsed(ctor);
                        var args = node.arguments.slice(0);
                        var ctorAttrs = parseComments(ctor);
                        var sig = checker.getResolvedSignature(node);
                        // TODO: can we have overloeads?
                        var bindings = getCallBindings(sig);
                        // NOTE: type checking with bindings
                        addDefaultParametersAndTypeCheck(checker.getResolvedSignature(node), args, ctorAttrs);
                        var compiled = args.map(function (x) { return emitExpr(x); });
                        if (ctorAttrs.shim) {
                            pxtc.U.userError("shim=... on constructor not supported right now");
                            // TODO need to deal with refMask and tagged ints here
                            // we drop 'obj' variable
                            return pxtc.ir.rtcall(ctorAttrs.shim, compiled);
                        }
                        compiled.unshift(pxtc.ir.op(EK.Incr, [obj]));
                        proc.emitExpr(mkProcCall(ctor, compiled, bindings));
                        return obj;
                    }
                    else {
                        if (node.arguments && node.arguments.length)
                            userError(9222, lf("constructor with arguments not found"));
                        return obj;
                    }
                }
                else {
                    throw unhandled(node, lf("unknown type for new"), 9243);
                }
            }
            /* Requires the following to be declared in global scope:
                //% shim=@hex
                function hex(lits: any, ...args: any[]): Buffer { return null }
            */
            function emitTaggedTemplateExpression(node) {
                function isHexDigit(c) {
                    return /^[0-9a-f]$/i.test(c);
                }
                function parseHexLiteral(s) {
                    if (s == "" && currJres) {
                        if (!currJres.dataEncoding || currJres.dataEncoding == "base64") {
                            s = pxtc.U.toHex(pxtc.U.stringToUint8Array(atob(currJres.data)));
                        }
                        else if (currJres.dataEncoding == "hex") {
                            s = currJres.data;
                        }
                        else {
                            userError(9271, lf("invalid jres encoding '{0}' on '{1}'", currJres.dataEncoding, currJres.id));
                        }
                    }
                    var res = "";
                    for (var i = 0; i < s.length; ++i) {
                        var c = s[i];
                        if (isHexDigit(c)) {
                            if (isHexDigit(s[i + 1])) {
                                res += c + s[i + 1];
                                i++;
                            }
                        }
                        else if (/^[\s\.]$/.test(c))
                            continue;
                        else
                            throw unhandled(node, lf("invalid character in hex literal '{0}'", c), 9265);
                    }
                    var lbl = bin.emitHexLiteral(res.toLowerCase());
                    return pxtc.ir.ptrlit(lbl, lbl, true);
                }
                var decl = getDecl(node.tag);
                if (!decl)
                    throw unhandled(node, lf("invalid tagged template"), 9265);
                var attrs = parseComments(decl);
                switch (attrs.shim) {
                    case "@hex":
                        if (node.template.kind != pxtc.SK.NoSubstitutionTemplateLiteral)
                            throw unhandled(node, lf("substitution not supported in hex literal", attrs.shim), 9265);
                        return parseHexLiteral(node.template.text);
                    default:
                        throw unhandled(node, lf("invalid shim '{0}' on tagged template", attrs.shim), 9265);
                }
            }
            function emitTypeAssertion(node) {
                typeCheckSubtoSup(node.expression, node);
                return emitExpr(node.expression);
            }
            function emitAsExpression(node) {
                typeCheckSubtoSup(node.expression, node);
                return emitExpr(node.expression);
            }
            function emitParenExpression(node) {
                return emitExpr(node.expression);
            }
            function getParameters(node) {
                var res = node.parameters.slice(0);
                if (!isStatic(node) && isClassFunction(node)) {
                    var info = getFunctionInfo(node);
                    if (!info.thisParameter) {
                        info.thisParameter = {
                            kind: pxtc.SK.Parameter,
                            name: { text: "this" },
                            isThisParameter: true,
                            parent: node
                        };
                    }
                    res.unshift(info.thisParameter);
                }
                return res;
            }
            function emitFunLitCore(node, raw) {
                if (raw === void 0) { raw = false; }
                var lbl = getFunctionLabel(node, getEnclosingTypeBindings(node));
                var jsInfo = lbl;
                if (pxtc.target.nativeType == pxtc.NATIVE_TYPE_CS) {
                    jsInfo = "(FnPtr)" + jsInfo;
                    if (!raw)
                        jsInfo = "PXT.pxt.mkAction(0, 0, " + jsInfo + ")";
                }
                var r = pxtc.ir.ptrlit(lbl + "_Lit", jsInfo, isAVR() ? false : !raw);
                if (!raw && isAVR())
                    r = pxtc.ir.shared(pxtc.ir.rtcall("pxt::mkAction", [pxtc.ir.numlit(0), pxtc.ir.numlit(0), r]));
                return r;
            }
            function emitFuncCore(node, bindings) {
                var info = getFunctionInfo(node);
                var lit = null;
                var isExpression = node.kind == pxtc.SK.ArrowFunction || node.kind == pxtc.SK.FunctionExpression;
                var isRef = function (d) {
                    if (isRefDecl(d))
                        return true;
                    var info = getVarInfo(d);
                    return (info.captured && info.written);
                };
                var refs = info.capturedVars.filter(function (v) { return isRef(v); });
                var prim = info.capturedVars.filter(function (v) { return !isRef(v); });
                var caps = refs.concat(prim);
                var locals = caps.map(function (v, i) {
                    var l = new pxtc.ir.Cell(i, v, getVarInfo(v));
                    l.iscap = true;
                    return l;
                });
                // forbid: let x = function<T>(a:T) { }
                if (isExpression && isGenericFunction(node))
                    userError(9233, lf("function expressions cannot be generic"));
                if (caps.length > 0 && isGenericFunction(node))
                    userError(9234, lf("nested functions cannot be generic yet"));
                // if no captured variables, then we can get away with a plain pointer to code
                if (caps.length > 0) {
                    pxtc.assert(getEnclosingFunction(node) != null, "getEnclosingFunction(node) != null)");
                    lit = pxtc.ir.shared(pxtc.ir.rtcall("pxt::mkAction", [pxtc.ir.numlit(refs.length), pxtc.ir.numlit(caps.length), emitFunLitCore(node, true)]));
                    caps.forEach(function (l, i) {
                        var loc = proc.localIndex(l);
                        if (!loc)
                            userError(9223, lf("cannot find captured value: {0}", checker.symbolToString(l.symbol)));
                        var v = loc.loadCore();
                        if (loc.isRef() || loc.isByRefLocal())
                            v = pxtc.ir.op(EK.Incr, [v]);
                        proc.emitExpr(pxtc.ir.rtcall("pxtrt::stclo", [lit, pxtc.ir.numlit(i), v]));
                    });
                    if (node.kind == pxtc.SK.FunctionDeclaration) {
                        info.location = proc.mkLocal(node, getVarInfo(node));
                        proc.emitExpr(info.location.storeDirect(lit));
                        lit = null;
                    }
                }
                else {
                    if (isExpression) {
                        lit = emitFunLitCore(node);
                    }
                }
                pxtc.assert(!!lit == isExpression, "!!lit == isExpression");
                var id = { action: node, bindings: bindings };
                var existing = bin.procs.filter(function (p) { return p.matches(id); })[0];
                if (existing) {
                    proc = existing;
                    proc.reset();
                }
                else {
                    pxtc.assert(!bin.finalPass, "!bin.finalPass");
                    proc = new pxtc.ir.Procedure();
                    proc.isRoot = !!node.isRootFunction;
                    proc.action = node;
                    proc.info = info;
                    proc.bindings = bindings;
                    bin.addProc(proc);
                }
                proc.captured = locals;
                if (node.parent.kind == pxtc.SK.ClassDeclaration) {
                    var parClass = node.parent;
                    var numTP = parClass.typeParameters ? parClass.typeParameters.length : 0;
                    pxtc.assert(bindings.length >= numTP, "bindings.length >= numTP");
                    var classInfo = getClassInfo(null, parClass, bindings.slice(0, numTP));
                    if (proc.classInfo)
                        pxtc.assert(proc.classInfo == classInfo, "proc.classInfo == classInfo");
                    else
                        proc.classInfo = classInfo;
                    if (node.kind == pxtc.SK.Constructor) {
                        if (classInfo.ctor)
                            pxtc.assert(classInfo.ctor == proc, "classInfo.ctor == proc");
                        else
                            classInfo.ctor = proc;
                    }
                }
                pxtc.U.pushRange(typeBindings, bindings);
                var destructuredParameters = [];
                proc.args = getParameters(node).map(function (p, i) {
                    if (p.name.kind === pxtc.SK.ObjectBindingPattern) {
                        destructuredParameters.push(p);
                    }
                    var l = new pxtc.ir.Cell(i, p, getVarInfo(p));
                    l.isarg = true;
                    return l;
                });
                proc.args.forEach(function (l) {
                    //console.log(l.toString(), l.info)
                    if (l.isByRefLocal()) {
                        // TODO add C++ support function to do this
                        var tmp = pxtc.ir.shared(pxtc.ir.rtcall("pxtrt::mkloc" + l.refSuffix(), []));
                        proc.emitExpr(pxtc.ir.rtcall("pxtrt::stloc" + l.refSuffix(), [tmp, l.loadCore()]));
                        proc.emitExpr(l.storeDirect(tmp));
                    }
                });
                destructuredParameters.forEach(function (dp) { return emitVariableDeclaration(dp); });
                if (node.body.kind == pxtc.SK.Block) {
                    emit(node.body);
                }
                else {
                    var v = emitExpr(node.body);
                    proc.emitJmp(getLabels(node).ret, v, pxtc.ir.JmpMode.Always);
                }
                proc.emitLblDirect(getLabels(node).ret);
                proc.stackEmpty();
                var lbl = proc.mkLabel("final");
                var hasRet = funcHasReturn(proc.action);
                if (hasRet) {
                    var v = pxtc.ir.shared(pxtc.ir.op(EK.JmpValue, []));
                    proc.emitExpr(v); // make sure we save it
                    proc.emitClrs(lbl, v);
                    proc.emitJmp(lbl, v, pxtc.ir.JmpMode.Always);
                }
                else {
                    proc.emitClrs(lbl, null);
                }
                if (hasRet || isStackMachine())
                    proc.emitLbl(lbl);
                // once we have emitted code for this function,
                // we should emit code for all decls that are used
                // as a result
                pxtc.assert(!bin.finalPass || usedWorkList.length == 0, "!bin.finalPass || usedWorkList.length == 0");
                while (usedWorkList.length > 0) {
                    var f = usedWorkList.pop();
                    emit(f);
                }
                return lit;
            }
            function hasShimDummy(node) {
                if (opts.target.isNative)
                    return false;
                var f = node;
                return f.body && (f.body.kind != pxtc.SK.Block || f.body.statements.length > 0);
            }
            function emitFunctionDeclaration(node) {
                if (!isUsed(node))
                    return;
                var attrs = parseComments(node);
                if (attrs.shim != null) {
                    if (attrs.shim[0] == "@")
                        return;
                    if (opts.target.isNative) {
                        pxtc.hex.validateShim(getDeclName(node), attrs.shim, attrs, funcHasReturn(node), getParameters(node).map(function (p) { return !!(typeOf(p).flags & ts.TypeFlags.NumberLike); }));
                    }
                    if (!hasShimDummy(node))
                        return;
                }
                if (node.flags & ts.NodeFlags.Ambient)
                    return;
                if (!node.body)
                    return;
                var info = getFunctionInfo(node);
                var lit = null;
                if (isGenericFunction(node)) {
                    if (!info.usages) {
                        pxtc.assert(opts.testMode && !usedDecls[nodeKey(node)] && !bin.finalPass, "opts.testMode && !usedDecls[nodeKey(node)] && !bin.finalPass");
                        // test mode - make fake binding
                        var bindings = getTypeParameters(node).map(function (t) { return ({
                            arg: checker.getTypeAtLocation(t),
                            tp: checker.getTypeAtLocation(t),
                            isRef: true
                        }); });
                        addEnclosingTypeBindings(bindings, node);
                        pxtc.U.assert(bindings.length > 0, "bindings.length > 0");
                        info.usages = [bindings];
                    }
                    pxtc.U.assert(info.usages.length > 0, "no generic usages recorded");
                    var todo = info.usages;
                    if (!bin.finalPass) {
                        todo = info.usages.slice(info.prePassUsagesEmitted);
                        info.prePassUsagesEmitted = info.usages.length;
                    }
                    var _loop_3 = function(bindings) {
                        scope(function () {
                            var nolit = emitFuncCore(node, bindings);
                            pxtc.U.assert(nolit == null, "nolit == null");
                        });
                    };
                    for (var _i = 0, todo_1 = todo; _i < todo_1.length; _i++) {
                        var bindings = todo_1[_i];
                        _loop_3(bindings);
                    }
                }
                else {
                    scope(function () {
                        lit = emitFuncCore(node, getEnclosingTypeBindings(node));
                    });
                }
                return lit;
            }
            function emitDeleteExpression(node) { }
            function emitTypeOfExpression(node) { }
            function emitVoidExpression(node) { }
            function emitAwaitExpression(node) { }
            function emitPrefixUnaryExpression(node) {
                var tp = typeOf(node.operand);
                if (node.operator == pxtc.SK.ExclamationToken) {
                    return fromBool(pxtc.ir.rtcall("Boolean_::bang", [emitCondition(node.operand)]));
                }
                if (tp.flags & ts.TypeFlags.Number) {
                    switch (node.operator) {
                        case pxtc.SK.PlusPlusToken:
                            return emitIncrement(node.operand, "numops::adds", false);
                        case pxtc.SK.MinusMinusToken:
                            return emitIncrement(node.operand, "numops::subs", false);
                        case pxtc.SK.MinusToken:
                            var inner = emitExpr(node.operand);
                            var v = valueToInt(inner);
                            if (v != null)
                                return emitLit(-v);
                            return emitIntOp("numops::subs", emitLit(0), inner);
                        case pxtc.SK.PlusToken:
                            return emitExpr(node.operand); // no-op
                        default:
                            break;
                    }
                }
                throw unhandled(node, lf("unsupported prefix unary operation"), 9245);
            }
            function doNothing() { }
            function needsCache(e) {
                var c = e;
                c.needsIRCache = true;
                irCachesToClear.push(c);
            }
            function prepForAssignment(trg, src) {
                if (src === void 0) { src = null; }
                var prev = irCachesToClear.length;
                if (trg.kind == pxtc.SK.PropertyAccessExpression || trg.kind == pxtc.SK.ElementAccessExpression) {
                    needsCache(trg.expression);
                }
                if (src)
                    needsCache(src);
                if (irCachesToClear.length == prev)
                    return doNothing;
                else
                    return function () {
                        for (var i = prev; i < irCachesToClear.length; ++i) {
                            irCachesToClear[i].cachedIR = null;
                            irCachesToClear[i].needsIRCache = false;
                        }
                        irCachesToClear.splice(prev, irCachesToClear.length - prev);
                    };
            }
            function irToNode(expr, isRef) {
                if (isRef === void 0) { isRef = false; }
                return {
                    kind: pxtc.SK.NullKeyword,
                    isRefOverride: isRef,
                    valueOverride: expr
                };
            }
            function emitIncrement(trg, meth, isPost, one) {
                if (one === void 0) { one = null; }
                var cleanup = prepForAssignment(trg);
                var oneExpr = one ? emitExpr(one) : emitLit(1);
                var prev = pxtc.ir.shared(emitExpr(trg));
                var result = pxtc.ir.shared(emitIntOp(meth, prev, oneExpr));
                emitStore(trg, irToNode(result, opts.target.taggedInts));
                cleanup();
                var r = isPost ? prev : result;
                if (opts.target.taggedInts)
                    return pxtc.ir.op(EK.Incr, [r]);
                return r;
            }
            function emitPostfixUnaryExpression(node) {
                var tp = typeOf(node.operand);
                if (tp.flags & ts.TypeFlags.Number) {
                    switch (node.operator) {
                        case pxtc.SK.PlusPlusToken:
                            return emitIncrement(node.operand, "numops::adds", true);
                        case pxtc.SK.MinusMinusToken:
                            return emitIncrement(node.operand, "numops::subs", true);
                        default:
                            break;
                    }
                }
                throw unhandled(node, lf("unsupported postfix unary operation"), 9246);
            }
            function fieldIndexCore(info, fld, t) {
                var attrs = parseComments(fld);
                return {
                    idx: info.allfields.indexOf(fld),
                    name: getName(fld),
                    isRef: isRefType(t),
                    shimName: attrs.shim
                };
            }
            function fieldIndex(pacc) {
                var tp = typeOf(pacc.expression);
                if (isPossiblyGenericClassType(tp)) {
                    var info = getClassInfo(tp);
                    return fieldIndexCore(info, getFieldInfo(info, pacc.name.text), typeOf(pacc));
                }
                else {
                    throw unhandled(pacc, lf("bad field access"), 9247);
                }
            }
            function getFieldInfo(info, fieldName) {
                var field = info.allfields.filter(function (f) { return f.name.text == fieldName; })[0];
                if (!field) {
                    userError(9224, lf("field {0} not found", fieldName));
                }
                return field;
            }
            function emitStore(trg, src, checkAssign) {
                if (checkAssign === void 0) { checkAssign = false; }
                if (checkAssign) {
                    typeCheckSubtoSup(src, trg);
                }
                var decl = getDecl(trg);
                var isGlobal = isGlobalVar(decl);
                if (trg.kind == pxtc.SK.Identifier || isGlobal) {
                    if (decl && (isGlobal || decl.kind == pxtc.SK.VariableDeclaration || decl.kind == pxtc.SK.Parameter)) {
                        var l = lookupCell(decl);
                        recordUse(decl, true);
                        proc.emitExpr(l.storeByRef(emitExpr(src)));
                    }
                    else {
                        unhandled(trg, lf("bad target identifier"), 9248);
                    }
                }
                else if (trg.kind == pxtc.SK.PropertyAccessExpression) {
                    var decl_1 = getDecl(trg);
                    if (decl_1 && decl_1.kind == pxtc.SK.GetAccessor) {
                        decl_1 = ts.getDeclarationOfKind(decl_1.symbol, pxtc.SK.SetAccessor);
                        if (!decl_1) {
                            unhandled(trg, lf("setter not available"), 9253);
                        }
                        proc.emitExpr(emitCallCore(trg, trg, [src], null, decl_1));
                    }
                    else if (decl_1 && (decl_1.kind == pxtc.SK.PropertySignature || decl_1.kind == pxtc.SK.PropertyAssignment)) {
                        proc.emitExpr(emitCallCore(trg, trg, [src], null, decl_1));
                    }
                    else {
                        proc.emitExpr(pxtc.ir.op(EK.Store, [emitExpr(trg), emitExpr(src)]));
                    }
                }
                else if (trg.kind == pxtc.SK.ElementAccessExpression) {
                    proc.emitExpr(emitIndexedAccess(trg, src));
                }
                else {
                    unhandled(trg, lf("bad assignment target"), 9249);
                }
            }
            function handleAssignment(node) {
                var cleanup = prepForAssignment(node.left, node.right);
                emitStore(node.left, node.right, true);
                var res = emitExpr(node.right);
                cleanup();
                return res;
            }
            function mapIntOpName(n) {
                if (!opts.target.floatingPoint) {
                    // legacy
                    if (pxtc.U.startsWith(n, "numops::")) {
                        var b = n.slice(8);
                        if (pxtc.U.lookup(pxtc.thumbArithmeticInstr, b))
                            return "thumb::" + b;
                        else if (b == "lt_bool")
                            return "Number_::lt";
                        else
                            return "Number_::" + b.replace(/eqq/, "eq");
                    }
                    switch (n) {
                        case "pxt::eq_bool":
                        case "pxt::eqq_bool":
                        case "langsupp::ptreq":
                        case "langsupp::ptreqq":
                            return "Number_::eq";
                        case "langsupp::ptrneq":
                        case "langsupp::ptrneqq":
                            return "Number_::neq";
                    }
                }
                return n;
            }
            function emitIntOp(op, left, right) {
                op = mapIntOpName(op);
                return pxtc.ir.rtcallMask(op, opts.target.taggedInts ? 3 : 0, pxtc.ir.CallingConvention.Plain, [left, right]);
            }
            function emitAsInt(e) {
                var expr = emitExpr(e);
                var v = valueToInt(expr);
                if (v === undefined)
                    throw userError(9267, lf("a constant number-like expression is required here"));
                return v;
            }
            function lookupConfigConst(ctx, name) {
                var r = lookupConfigConstCore(ctx, name, "userconfig");
                if (r == null)
                    r = lookupConfigConstCore(ctx, name, "config");
                return r;
            }
            function lookupConfigConstCore(ctx, name, mod) {
                var syms = checker.getSymbolsInScope(ctx, ts.SymbolFlags.Module);
                var configMod = syms.filter(function (s) { return s.name == mod && !!s.valueDeclaration; })[0];
                if (!configMod)
                    return null;
                for (var _i = 0, _a = configMod.valueDeclaration.body.statements; _i < _a.length; _i++) {
                    var stmt = _a[_i];
                    if (stmt.kind == pxtc.SK.VariableStatement) {
                        var v = stmt;
                        for (var _b = 0, _c = v.declarationList.declarations; _b < _c.length; _b++) {
                            var d = _c[_b];
                            if (d.symbol.name == name) {
                                return emitAsInt(d.initializer);
                            }
                        }
                    }
                }
                return null;
            }
            function lookupDalConst(ctx, name) {
                var syms = checker.getSymbolsInScope(ctx, ts.SymbolFlags.Enum);
                var dalEnm = syms.filter(function (s) { return s.name == "DAL" && !!s.valueDeclaration; })[0];
                if (!dalEnm)
                    return null;
                var decl = dalEnm.valueDeclaration.members
                    .filter(function (s) { return s.symbol.name == name; })[0];
                if (decl)
                    return checker.getConstantValue(decl);
                return null;
            }
            function valueToInt(e) {
                if (e.exprKind == pxtc.ir.EK.NumberLiteral) {
                    var v = e.data;
                    if (opts.target.taggedInts) {
                        if (v == pxtc.taggedNull || v == pxtc.taggedUndefined || v == pxtc.taggedFalse)
                            return 0;
                        if (v == pxtc.taggedTrue)
                            return 1;
                        if (typeof v == "number")
                            return v >> 1;
                    }
                    else {
                        if (typeof v == "number")
                            return v;
                    }
                }
                return undefined;
            }
            function emitLit(v) {
                if (opts.target.taggedInts) {
                    if (v === null)
                        return pxtc.ir.numlit(pxtc.taggedNull);
                    else if (v === undefined)
                        return pxtc.ir.numlit(pxtc.taggedUndefined);
                    else if (v === false)
                        return pxtc.ir.numlit(pxtc.taggedFalse);
                    else if (v === true)
                        return pxtc.ir.numlit(pxtc.taggedTrue);
                    else if (typeof v == "number") {
                        if (fitsTaggedInt(v))
                            return pxtc.ir.numlit((v << 1) | 1);
                        else {
                            var lbl = bin.emitDouble(v);
                            return pxtc.ir.ptrlit(lbl, JSON.stringify(v), true);
                        }
                    }
                    else {
                        throw pxtc.U.oops("bad literal: " + v);
                    }
                }
                else {
                    if (!opts.target.floatingPoint) {
                        if (v === false || v === null || v === undefined)
                            v = 0;
                        if (v === true)
                            v = 1;
                    }
                    return pxtc.ir.numlit(v);
                }
            }
            function isNumberLike(e) {
                if (e.kind == pxtc.SK.NullKeyword) {
                    var vo = e.valueOverride;
                    if (vo !== undefined) {
                        if (vo.exprKind == EK.NumberLiteral) {
                            if (opts.target.taggedInts)
                                return !!(vo.data & 1);
                            return true;
                        }
                        else if (vo.exprKind == EK.RuntimeCall && vo.data == "pxt::ptrOfLiteral") {
                            if (vo.args[0].exprKind == EK.PointerLiteral &&
                                !isNaN(parseFloat(vo.args[0].jsInfo)))
                                return true;
                            return false;
                        }
                        else if (vo.exprKind == EK.PointerLiteral && !isNaN(parseFloat(vo.jsInfo))) {
                            return true;
                        }
                        else
                            return false;
                    }
                }
                if (e.kind == pxtc.SK.NumericLiteral)
                    return true;
                return !!(typeOf(e).flags & ts.TypeFlags.NumberLike);
            }
            function rtcallMask(name, args, attrs, append) {
                if (append === void 0) { append = null; }
                var fmt = "";
                var inf = pxtc.hex.lookupFunc(name);
                if (inf)
                    fmt = inf.argsFmt;
                if (append)
                    args = args.concat(append);
                var mask = getMask(args);
                var args2 = args.map(function (a, i) {
                    var r = emitExpr(a);
                    if (!opts.target.taggedInts)
                        return r;
                    var f = fmt.charAt(i + 1);
                    var isNumber = isNumberLike(a);
                    if (!f) {
                        throw pxtc.U.userError("not enough args for " + name);
                    }
                    else if (f == "_" || f == "T" || f == "N") {
                        return r;
                    }
                    else if (f == "I") {
                        if (!isNumber)
                            pxtc.U.userError("argsFmt=...I... but argument not a number in " + name);
                        if (r.exprKind == EK.NumberLiteral && typeof r.data == "number") {
                            return pxtc.ir.numlit(r.data >> 1);
                        }
                        mask &= ~(1 << i);
                        return pxtc.ir.rtcallMask("pxt::toInt", getMask([a]), pxtc.ir.CallingConvention.Plain, [r]);
                    }
                    else if (f == "B") {
                        mask &= ~(1 << i);
                        return emitCondition(a, r);
                    }
                    else if (f == "F" || f == "D") {
                        if (f == "D")
                            pxtc.U.oops("double arguments not yet supported"); // take two words
                        if (!isNumber)
                            pxtc.U.userError("argsFmt=...F/D... but argument not a number in " + name);
                        mask &= ~(1 << i);
                        return pxtc.ir.rtcallMask(f == "D" ? "pxt::toDouble" : "pxt::toFloat", getMask([a]), pxtc.ir.CallingConvention.Plain, [r]);
                    }
                    else {
                        throw pxtc.U.oops("invalid format specifier: " + f);
                    }
                });
                var r = pxtc.ir.rtcallMask(name, mask, attrs.callingConvention, args2);
                if (opts.target.taggedInts) {
                    if (fmt.charAt(0) == "I")
                        r = fromInt(r);
                    else if (fmt.charAt(0) == "B")
                        r = fromBool(r);
                    else if (fmt.charAt(0) == "F")
                        r = fromFloat(r);
                    else if (fmt.charAt(0) == "D") {
                        pxtc.U.oops("double returns not yet supported"); // take two words
                        r = fromDouble(r);
                    }
                }
                return r;
            }
            function emitInJmpValue(expr) {
                var lbl = proc.mkLabel("ldjmp");
                proc.emitJmp(lbl, expr, pxtc.ir.JmpMode.Always);
                proc.emitLbl(lbl);
            }
            function emitLazyBinaryExpression(node) {
                var left = emitExpr(node.left);
                var isString = typeOf(node.left).flags & ts.TypeFlags.String;
                var lbl = proc.mkLabel("lazy");
                if (opts.target.floatingPoint) {
                    left = pxtc.ir.shared(left);
                    var cond = pxtc.ir.rtcall("numops::toBool", [left]);
                    var lblSkip = proc.mkLabel("lazySkip");
                    var mode = node.operatorToken.kind == pxtc.SK.BarBarToken ? pxtc.ir.JmpMode.IfZero :
                        node.operatorToken.kind == pxtc.SK.AmpersandAmpersandToken ? pxtc.ir.JmpMode.IfNotZero :
                            pxtc.U.oops();
                    proc.emitJmp(lblSkip, cond, mode);
                    proc.emitJmp(lbl, left, pxtc.ir.JmpMode.Always, left);
                    proc.emitLbl(lblSkip);
                    if (isRefCountedExpr(node.left))
                        proc.emitExpr(pxtc.ir.op(EK.Decr, [left]));
                    else
                        // make sure we have reference and the stack is cleared
                        proc.emitExpr(pxtc.ir.rtcall("langsupp::ignore", [left]));
                }
                else {
                    if (node.operatorToken.kind == pxtc.SK.BarBarToken) {
                        if (isString)
                            left = pxtc.ir.rtcall("pxtrt::emptyToNull", [left]);
                        proc.emitJmp(lbl, left, pxtc.ir.JmpMode.IfNotZero);
                    }
                    else if (node.operatorToken.kind == pxtc.SK.AmpersandAmpersandToken) {
                        left = pxtc.ir.shared(left);
                        if (isString) {
                            var slbl = proc.mkLabel("lazyStr");
                            proc.emitJmp(slbl, pxtc.ir.rtcall("pxtrt::emptyToNull", [left]), pxtc.ir.JmpMode.IfNotZero);
                            proc.emitJmp(lbl, left, pxtc.ir.JmpMode.Always, left);
                            proc.emitLbl(slbl);
                            if (isRefCountedExpr(node.left))
                                proc.emitExpr(pxtc.ir.op(EK.Decr, [left]));
                            else
                                // make sure we have reference and the stack is cleared
                                proc.emitExpr(pxtc.ir.rtcall("langsupp::ignore", [left]));
                        }
                        else {
                            if (isRefCountedExpr(node.left))
                                proc.emitExpr(pxtc.ir.op(EK.Decr, [left]));
                            proc.emitJmpZ(lbl, left);
                        }
                    }
                    else {
                        pxtc.oops();
                    }
                }
                proc.emitJmp(lbl, emitExpr(node.right), pxtc.ir.JmpMode.Always);
                proc.emitLbl(lbl);
                return pxtc.ir.op(EK.JmpValue, []);
            }
            function stripEquals(k) {
                switch (k) {
                    case pxtc.SK.PlusEqualsToken: return pxtc.SK.PlusToken;
                    case pxtc.SK.MinusEqualsToken: return pxtc.SK.MinusToken;
                    case pxtc.SK.AsteriskEqualsToken: return pxtc.SK.AsteriskToken;
                    case pxtc.SK.AsteriskAsteriskEqualsToken: return pxtc.SK.AsteriskAsteriskToken;
                    case pxtc.SK.SlashEqualsToken: return pxtc.SK.SlashToken;
                    case pxtc.SK.PercentEqualsToken: return pxtc.SK.PercentToken;
                    case pxtc.SK.LessThanLessThanEqualsToken: return pxtc.SK.LessThanLessThanToken;
                    case pxtc.SK.GreaterThanGreaterThanEqualsToken: return pxtc.SK.GreaterThanGreaterThanToken;
                    case pxtc.SK.GreaterThanGreaterThanGreaterThanEqualsToken: return pxtc.SK.GreaterThanGreaterThanGreaterThanToken;
                    case pxtc.SK.AmpersandEqualsToken: return pxtc.SK.AmpersandToken;
                    case pxtc.SK.BarEqualsToken: return pxtc.SK.BarToken;
                    case pxtc.SK.CaretEqualsToken: return pxtc.SK.CaretToken;
                    default: return pxtc.SK.Unknown;
                }
            }
            function emitBrk(node) {
                if (!opts.breakpoints)
                    return;
                var src = ts.getSourceFileOfNode(node);
                if (opts.justMyCode && pxtc.U.startsWith(src.fileName, "pxt_modules"))
                    return;
                var pos = node.pos;
                while (/^\s$/.exec(src.text[pos]))
                    pos++;
                var p = ts.getLineAndCharacterOfPosition(src, pos);
                var e = ts.getLineAndCharacterOfPosition(src, node.end);
                var brk = {
                    id: res.breakpoints.length,
                    isDebuggerStmt: node.kind == pxtc.SK.DebuggerStatement,
                    fileName: src.fileName,
                    start: pos,
                    length: node.end - pos,
                    line: p.line,
                    endLine: e.line,
                    column: p.character,
                    endColumn: e.character,
                };
                res.breakpoints.push(brk);
                var st = pxtc.ir.stmt(pxtc.ir.SK.Breakpoint, null);
                st.breakpointInfo = brk;
                proc.emit(st);
            }
            function simpleInstruction(k) {
                switch (k) {
                    case pxtc.SK.PlusToken: return "numops::adds";
                    case pxtc.SK.MinusToken: return "numops::subs";
                    // we could expose __aeabi_idiv directly...
                    case pxtc.SK.SlashToken: return "numops::div";
                    case pxtc.SK.PercentToken: return "numops::mod";
                    case pxtc.SK.AsteriskToken: return "numops::muls";
                    case pxtc.SK.AmpersandToken: return "numops::ands";
                    case pxtc.SK.BarToken: return "numops::orrs";
                    case pxtc.SK.CaretToken: return "numops::eors";
                    case pxtc.SK.LessThanLessThanToken: return "numops::lsls";
                    case pxtc.SK.GreaterThanGreaterThanToken: return "numops::asrs";
                    case pxtc.SK.GreaterThanGreaterThanGreaterThanToken: return "numops::lsrs";
                    // these could be compiled to branches but this is more code-size efficient
                    case pxtc.SK.LessThanEqualsToken: return "numops::le";
                    case pxtc.SK.LessThanToken: return "numops::lt";
                    case pxtc.SK.GreaterThanEqualsToken: return "numops::ge";
                    case pxtc.SK.GreaterThanToken: return "numops::gt";
                    case pxtc.SK.EqualsEqualsToken: return "numops::eq";
                    case pxtc.SK.EqualsEqualsEqualsToken: return "numops::eqq";
                    case pxtc.SK.ExclamationEqualsEqualsToken: return "numops::neqq";
                    case pxtc.SK.ExclamationEqualsToken: return "numops::neq";
                    default: return null;
                }
            }
            function emitBinaryExpression(node) {
                if (node.operatorToken.kind == pxtc.SK.EqualsToken) {
                    return handleAssignment(node);
                }
                var lt = typeOf(node.left);
                var rt = typeOf(node.right);
                if (node.operatorToken.kind == pxtc.SK.PlusToken) {
                    if (lt.flags & ts.TypeFlags.String || rt.flags & ts.TypeFlags.String) {
                        node.exprInfo = { leftType: checker.typeToString(lt), rightType: checker.typeToString(rt) };
                    }
                }
                var shim = function (n) {
                    n = mapIntOpName(n);
                    var args = [node.left, node.right];
                    return pxtc.ir.rtcallMask(n, getMask(args), pxtc.ir.CallingConvention.Plain, args.map(function (x) { return emitExpr(x); }));
                };
                if (node.operatorToken.kind == pxtc.SK.CommaToken) {
                    if (isNoopExpr(node.left))
                        return emitExpr(node.right);
                    else {
                        var v = emitIgnored(node.left);
                        return pxtc.ir.op(EK.Sequence, [v, emitExpr(node.right)]);
                    }
                }
                switch (node.operatorToken.kind) {
                    case pxtc.SK.BarBarToken:
                    case pxtc.SK.AmpersandAmpersandToken:
                        return emitLazyBinaryExpression(node);
                }
                if ((lt.flags & ts.TypeFlags.NumberLike) && (rt.flags & ts.TypeFlags.NumberLike)) {
                    var noEq = stripEquals(node.operatorToken.kind);
                    var shimName = simpleInstruction(noEq || node.operatorToken.kind);
                    if (!shimName)
                        unhandled(node.operatorToken, lf("unsupported numeric operator"), 9250);
                    if (noEq)
                        return emitIncrement(node.left, shimName, false, node.right);
                    return shim(shimName);
                }
                if (node.operatorToken.kind == pxtc.SK.PlusToken) {
                    if ((lt.flags & ts.TypeFlags.String) || (rt.flags & ts.TypeFlags.String)) {
                        // TODO use getMask() to limit incr/decr
                        return pxtc.ir.rtcallMask("String_::concat", 3, pxtc.ir.CallingConvention.Plain, [
                            emitAsString(node.left),
                            emitAsString(node.right)]);
                    }
                }
                if (node.operatorToken.kind == pxtc.SK.PlusEqualsToken &&
                    (lt.flags & ts.TypeFlags.String)) {
                    var cleanup = prepForAssignment(node.left);
                    // TODO use getMask() to limit incr/decr
                    var post = pxtc.ir.shared(pxtc.ir.rtcallMask("String_::concat", 3, pxtc.ir.CallingConvention.Plain, [
                        emitExpr(node.left),
                        emitAsString(node.right)]));
                    emitStore(node.left, irToNode(post));
                    cleanup();
                    return pxtc.ir.op(EK.Incr, [post]);
                }
                if ((lt.flags & ts.TypeFlags.String) && (rt.flags & ts.TypeFlags.String)) {
                    switch (node.operatorToken.kind) {
                        case pxtc.SK.EqualsEqualsToken:
                        case pxtc.SK.EqualsEqualsEqualsToken:
                        case pxtc.SK.ExclamationEqualsEqualsToken:
                        case pxtc.SK.ExclamationEqualsToken:
                            if (opts.target.needsUnboxing)
                                break; // let the generic case handle this
                        case pxtc.SK.LessThanEqualsToken:
                        case pxtc.SK.LessThanToken:
                        case pxtc.SK.GreaterThanEqualsToken:
                        case pxtc.SK.GreaterThanToken:
                            return pxtc.ir.rtcallMask(mapIntOpName(simpleInstruction(node.operatorToken.kind)), opts.target.boxDebug ? 1 : 0, pxtc.ir.CallingConvention.Plain, [fromInt(shim("String_::compare")), emitLit(0)]);
                        default:
                            unhandled(node.operatorToken, lf("unknown string operator"), 9251);
                    }
                }
                switch (node.operatorToken.kind) {
                    case pxtc.SK.EqualsEqualsToken:
                        return shim("langsupp::ptreq");
                    case pxtc.SK.EqualsEqualsEqualsToken:
                        return shim("langsupp::ptreqq");
                    case pxtc.SK.ExclamationEqualsEqualsToken:
                        return shim("langsupp::ptrneqq");
                    case pxtc.SK.ExclamationEqualsToken:
                        return shim("langsupp::ptrneq");
                    default:
                        throw unhandled(node.operatorToken, lf("unknown generic operator"), 9252);
                }
            }
            function emitAsString(e) {
                var r = emitExpr(e);
                // TS returns 'any' as type of template elements
                if (isStringLiteral(e))
                    return r;
                var tp = typeOf(e);
                if (pxtc.target.floatingPoint && (tp.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.Boolean)))
                    return pxtc.ir.rtcallMask("numops::toString", 1, pxtc.ir.CallingConvention.Plain, [r]);
                else if (tp.flags & ts.TypeFlags.NumberLike)
                    return pxtc.ir.rtcall("Number_::toString", [r]);
                else if (tp.flags & ts.TypeFlags.Boolean)
                    return pxtc.ir.rtcall("Boolean_::toString", [r]);
                else if (tp.flags & ts.TypeFlags.String)
                    return r; // OK
                else {
                    var decl = tp.symbol ? tp.symbol.valueDeclaration : null;
                    if (decl && (decl.kind == pxtc.SK.ClassDeclaration || decl.kind == pxtc.SK.InterfaceDeclaration)) {
                        var classDecl = decl;
                        var toString_1 = classDecl.members.filter(function (m) {
                            return (m.kind == pxtc.SK.MethodDeclaration || m.kind == pxtc.SK.MethodSignature) &&
                                m.parameters.length == 0 &&
                                getName(m) == "toString";
                        })[0];
                        if (toString_1) {
                            var ee = e;
                            return emitCallCore(ee, ee, [], null, toString_1, ee);
                        }
                        else {
                            throw userError(9254, lf("type {0} lacks toString() method", getName(decl)));
                        }
                    }
                    throw userError(9225, lf("don't know how to convert to string"));
                }
            }
            function emitConditionalExpression(node) {
                var els = proc.mkLabel("condexprz");
                var fin = proc.mkLabel("condexprfin");
                proc.emitJmp(els, emitCondition(node.condition), pxtc.ir.JmpMode.IfZero);
                proc.emitJmp(fin, emitExpr(node.whenTrue), pxtc.ir.JmpMode.Always);
                proc.emitLbl(els);
                proc.emitJmp(fin, emitExpr(node.whenFalse), pxtc.ir.JmpMode.Always);
                proc.emitLbl(fin);
                var v = pxtc.ir.shared(pxtc.ir.op(EK.JmpValue, []));
                proc.emitExpr(v); // make sure we save it
                return v;
            }
            function emitSpreadElementExpression(node) { }
            function emitYieldExpression(node) { }
            function emitBlock(node) {
                node.statements.forEach(emit);
            }
            function checkForLetOrConst(declList) {
                if ((declList.flags & ts.NodeFlags.Let) || (declList.flags & ts.NodeFlags.Const)) {
                    return true;
                }
                throw userError(9260, lf("variable needs to be defined using 'let' instead of 'var'"));
            }
            function emitVariableStatement(node) {
                function addConfigEntry(ent) {
                    var entry = pxtc.U.lookup(configEntries, ent.name);
                    if (!entry) {
                        entry = ent;
                        configEntries[ent.name] = entry;
                    }
                    if (entry.value != ent.value)
                        throw userError(9269, lf("conflicting values for config.{0}", ent.name));
                }
                if (node.declarationList.flags & ts.NodeFlags.Const)
                    for (var _i = 0, _a = node.declarationList.declarations; _i < _a.length; _i++) {
                        var decl = _a[_i];
                        var nm = getDeclName(decl);
                        var parname = node.parent && node.parent.kind == pxtc.SK.ModuleBlock ?
                            getName(node.parent.parent) : "?";
                        if (parname == "config" || parname == "userconfig") {
                            if (!decl.initializer)
                                continue;
                            var val = emitAsInt(decl.initializer);
                            var key = lookupDalConst(node, "CFG_" + nm);
                            if (key == null || key == 0)
                                throw userError(9268, lf("can't find DAL.CFG_{0}", nm));
                            if (parname == "userconfig")
                                nm = "!" + nm;
                            addConfigEntry({ name: nm, key: key, value: val });
                        }
                    }
                if (node.flags & ts.NodeFlags.Ambient)
                    return;
                checkForLetOrConst(node.declarationList);
                node.declarationList.declarations.forEach(emit);
            }
            function emitExpressionStatement(node) {
                emitExprAsStmt(node.expression);
            }
            function emitCondition(expr, inner) {
                if (inner === void 0) { inner = null; }
                if (!inner)
                    inner = emitExpr(expr);
                // in all cases decr is internal, so no mask
                if (opts.target.floatingPoint) {
                    return pxtc.ir.rtcall("numops::toBoolDecr", [inner]);
                }
                else {
                    if (typeOf(expr).flags & ts.TypeFlags.String) {
                        return pxtc.ir.rtcall("pxtrt::stringToBool", [inner]);
                    }
                    else if (isRefCountedExpr(expr)) {
                        return pxtc.ir.rtcall("pxtrt::ptrToBool", [inner]);
                    }
                    else {
                        return inner;
                    }
                }
            }
            function emitIfStatement(node) {
                emitBrk(node);
                var elseLbl = proc.mkLabel("else");
                proc.emitJmpZ(elseLbl, emitCondition(node.expression));
                emit(node.thenStatement);
                var afterAll = proc.mkLabel("afterif");
                proc.emitJmp(afterAll);
                proc.emitLbl(elseLbl);
                if (node.elseStatement)
                    emit(node.elseStatement);
                proc.emitLbl(afterAll);
            }
            function getLabels(stmt) {
                var id = getNodeId(stmt);
                return {
                    fortop: ".fortop." + id,
                    cont: ".cont." + id,
                    brk: ".brk." + id,
                    ret: ".ret." + id
                };
            }
            function emitDoStatement(node) {
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.cont);
                emit(node.statement);
                emitBrk(node.expression);
                proc.emitJmpZ(l.brk, emitCondition(node.expression));
                proc.emitJmp(l.cont);
                proc.emitLblDirect(l.brk);
            }
            function emitWhileStatement(node) {
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.cont);
                emitBrk(node.expression);
                proc.emitJmpZ(l.brk, emitCondition(node.expression));
                emit(node.statement);
                proc.emitJmp(l.cont);
                proc.emitLblDirect(l.brk);
            }
            function isNoopExpr(node) {
                if (!node)
                    return true;
                switch (node.kind) {
                    case pxtc.SK.Identifier:
                    case pxtc.SK.StringLiteral:
                    case pxtc.SK.NumericLiteral:
                    case pxtc.SK.NullKeyword:
                        return true; // no-op
                }
                return false;
            }
            function emitIgnored(node) {
                var v = emitExpr(node);
                var a = typeOf(node);
                if (!(a.flags & ts.TypeFlags.Void)) {
                    if (isRefType(a)) {
                        v = pxtc.ir.op(EK.Decr, [v]);
                    }
                }
                return v;
            }
            function emitExprAsStmt(node) {
                if (isNoopExpr(node))
                    return;
                emitBrk(node);
                var v = emitIgnored(node);
                proc.emitExpr(v);
                proc.stackEmpty();
            }
            function emitForStatement(node) {
                if (node.initializer && node.initializer.kind == pxtc.SK.VariableDeclarationList) {
                    checkForLetOrConst(node.initializer);
                    node.initializer.declarations.forEach(emit);
                }
                else {
                    emitExprAsStmt(node.initializer);
                }
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.fortop);
                if (node.condition) {
                    emitBrk(node.condition);
                    proc.emitJmpZ(l.brk, emitCondition(node.condition));
                }
                emit(node.statement);
                proc.emitLblDirect(l.cont);
                emitExprAsStmt(node.incrementor);
                proc.emitJmp(l.fortop);
                proc.emitLblDirect(l.brk);
            }
            function emitForOfStatement(node) {
                if (!(node.initializer && node.initializer.kind == pxtc.SK.VariableDeclarationList)) {
                    unhandled(node, "only a single variable may be used to iterate a collection");
                    return;
                }
                var declList = node.initializer;
                if (declList.declarations.length != 1) {
                    unhandled(node, "only a single variable may be used to iterate a collection");
                    return;
                }
                checkForLetOrConst(declList);
                //Typecheck the expression being iterated over
                var t = typeOf(node.expression);
                var indexer = "";
                var length = "";
                if (t.flags & ts.TypeFlags.String) {
                    indexer = "String_::charAt";
                    length = "String_::length";
                }
                else if (isArrayType(t)) {
                    indexer = "Array_::getAt";
                    length = "Array_::length";
                }
                else {
                    unhandled(node.expression, "cannot use for...of with this expression");
                    return;
                }
                //As the iterator isn't declared in the usual fashion we must mark it as used, otherwise no cell will be allocated for it
                markUsed(declList.declarations[0]);
                var iterVar = emitVariableDeclaration(declList.declarations[0]); // c
                //Start with undefined
                proc.emitExpr(iterVar.storeByRef(emitLit(undefined)));
                proc.stackEmpty();
                // Store the expression (it could be a string literal, for example) for the collection being iterated over
                // Note that it's alaways a ref-counted type
                var collectionVar = proc.mkLocalUnnamed(true); // a
                proc.emitExpr(collectionVar.storeByRef(emitExpr(node.expression)));
                // Declaration of iterating variable
                var intVarIter = proc.mkLocalUnnamed(opts.target.taggedInts ? true : false); // i
                proc.emitExpr(intVarIter.storeByRef(emitLit(0)));
                proc.stackEmpty();
                emitBrk(node);
                var l = getLabels(node);
                proc.emitLblDirect(l.fortop);
                // i < a.length()
                // we use loadCore() on collection variable so that it doesn't get incr()ed
                // we could have used load() and rtcallMask to be more regular
                var len = pxtc.ir.rtcall(length, [collectionVar.loadCore()]);
                var cmp = emitIntOp("numops::lt_bool", intVarIter.load(), fromInt(len));
                proc.emitJmpZ(l.brk, cmp);
                // TODO this should be changed to use standard indexer lookup and int handling
                var toInt = function (e) {
                    if (opts.target.needsUnboxing)
                        return pxtc.ir.rtcall("pxt::toInt", [e]);
                    else
                        return e;
                };
                // c = a[i]
                proc.emitExpr(iterVar.storeByRef(pxtc.ir.rtcall(indexer, [collectionVar.loadCore(), toInt(intVarIter.loadCore())])));
                emit(node.statement);
                proc.emitLblDirect(l.cont);
                // i = i + 1
                proc.emitExpr(intVarIter.storeByRef(emitIntOp("numops::adds", intVarIter.load(), emitLit(1))));
                proc.emitJmp(l.fortop);
                proc.emitLblDirect(l.brk);
                proc.emitExpr(collectionVar.storeByRef(emitLit(undefined))); // clear it, so it gets GCed
            }
            function emitForInOrForOfStatement(node) { }
            function emitBreakOrContinueStatement(node) {
                emitBrk(node);
                var label = node.label ? node.label.text : null;
                var isBreak = node.kind == pxtc.SK.BreakStatement;
                function findOuter(parent) {
                    if (!parent)
                        return null;
                    if (label && parent.kind == pxtc.SK.LabeledStatement &&
                        parent.label.text == label)
                        return parent.statement;
                    if (parent.kind == pxtc.SK.SwitchStatement && !label && isBreak)
                        return parent;
                    if (!label && ts.isIterationStatement(parent, false))
                        return parent;
                    return findOuter(parent.parent);
                }
                var stmt = findOuter(node);
                if (!stmt)
                    error(node, 9230, lf("cannot find outer loop"));
                else {
                    var l = getLabels(stmt);
                    if (node.kind == pxtc.SK.ContinueStatement) {
                        if (!ts.isIterationStatement(stmt, false))
                            error(node, 9231, lf("continue on non-loop"));
                        else
                            proc.emitJmp(l.cont);
                    }
                    else if (node.kind == pxtc.SK.BreakStatement) {
                        proc.emitJmp(l.brk);
                    }
                    else {
                        pxtc.oops();
                    }
                }
            }
            function emitReturnStatement(node) {
                emitBrk(node);
                var v = null;
                if (node.expression) {
                    v = emitExpr(node.expression);
                }
                else if (funcHasReturn(proc.action)) {
                    v = emitLit(undefined); // == return undefined
                }
                proc.emitJmp(getLabels(proc.action).ret, v, pxtc.ir.JmpMode.Always);
            }
            function emitWithStatement(node) { }
            function emitSwitchStatement(node) {
                emitBrk(node);
                var switchType = typeOf(node.expression);
                var isNumber = !!(switchType.flags & ts.TypeFlags.NumberLike);
                var l = getLabels(node);
                var defaultLabel;
                var quickCmpMode = isNumber;
                var expr = pxtc.ir.shared(emitExpr(node.expression));
                var plainExpr = expr;
                if (isNumber) {
                    emitInJmpValue(expr);
                }
                var lbls = node.caseBlock.clauses.map(function (cl) {
                    var lbl = proc.mkLabel("switch");
                    if (cl.kind == pxtc.SK.CaseClause) {
                        var cc = cl;
                        var cmpExpr = emitExpr(cc.expression);
                        if (opts.target.needsUnboxing) {
                            // we assume the value we're switching over will stay alive
                            // so, the mask only applies to the case expression if needed
                            var cmpCall = pxtc.ir.rtcallMask(mapIntOpName("pxt::switch_eq"), isRefCountedExpr(cc.expression) ? 1 : 0, pxtc.ir.CallingConvention.Plain, [cmpExpr, expr]);
                            quickCmpMode = false;
                            proc.emitJmp(lbl, cmpCall, pxtc.ir.JmpMode.IfNotZero, plainExpr);
                        }
                        else if (switchType.flags & ts.TypeFlags.String) {
                            var cmpCall = pxtc.ir.rtcallMask("String_::compare", isRefCountedExpr(cc.expression) ? 3 : 2, pxtc.ir.CallingConvention.Plain, [cmpExpr, expr]);
                            expr = pxtc.ir.op(EK.Incr, [expr]);
                            proc.emitJmp(lbl, cmpCall, pxtc.ir.JmpMode.IfZero, plainExpr);
                        }
                        else if (isRefCountedExpr(cc.expression)) {
                            var cmpCall = pxtc.ir.rtcallMask(mapIntOpName("langsupp::ptreq"), 3, pxtc.ir.CallingConvention.Plain, [cmpExpr, expr]);
                            quickCmpMode = false;
                            expr = pxtc.ir.op(EK.Incr, [expr]);
                            proc.emitJmp(lbl, cmpCall, pxtc.ir.JmpMode.IfNotZero, plainExpr);
                        }
                        else {
                            // TODO re-enable this opt for small non-zero number literals
                            if (!isStackMachine() && !opts.target.needsUnboxing && cmpExpr.exprKind == EK.NumberLiteral) {
                                if (!quickCmpMode) {
                                    emitInJmpValue(expr);
                                    quickCmpMode = true;
                                }
                                proc.emitJmp(lbl, cmpExpr, pxtc.ir.JmpMode.IfJmpValEq, plainExpr);
                            }
                            else {
                                var cmpCall = emitIntOp("pxt::eq_bool", cmpExpr, expr);
                                quickCmpMode = false;
                                proc.emitJmp(lbl, cmpCall, pxtc.ir.JmpMode.IfNotZero, plainExpr);
                            }
                        }
                    }
                    else if (cl.kind == pxtc.SK.DefaultClause) {
                        // Save default label for emit at the end of the
                        // tests section. Default label doesn't have to come at the
                        // end in JS.
                        pxtc.assert(!defaultLabel, "!defaultLabel");
                        defaultLabel = lbl;
                    }
                    else {
                        pxtc.oops();
                    }
                    return lbl;
                });
                if (opts.target.taggedInts) {
                    proc.emitExpr(pxtc.ir.op(EK.Decr, [expr]));
                }
                if (defaultLabel)
                    proc.emitJmp(defaultLabel, plainExpr);
                else
                    proc.emitJmp(l.brk, plainExpr);
                node.caseBlock.clauses.forEach(function (cl, i) {
                    proc.emitLbl(lbls[i]);
                    cl.statements.forEach(emit);
                });
                proc.emitLblDirect(l.brk);
            }
            function emitCaseOrDefaultClause(node) { }
            function emitLabeledStatement(node) {
                var l = getLabels(node.statement);
                emit(node.statement);
                proc.emitLblDirect(l.brk);
            }
            function emitThrowStatement(node) { }
            function emitTryStatement(node) { }
            function emitCatchClause(node) { }
            function emitDebuggerStatement(node) {
                emitBrk(node);
            }
            function emitVariableDeclaration(node) {
                if (node.name.kind === pxtc.SK.ObjectBindingPattern) {
                    if (!node.initializer) {
                        node.name.elements.forEach(function (e) { return emitVariableDeclaration(e); });
                        return null;
                    }
                    else {
                        userError(9259, "Object destructuring with initializers is not supported");
                    }
                }
                typeCheckVar(node);
                if (!isUsed(node)) {
                    return null;
                }
                var loc = isGlobalVar(node) ?
                    lookupCell(node) : proc.mkLocal(node, getVarInfo(node));
                if (loc.isByRefLocal()) {
                    proc.emitClrIfRef(loc); // we might be in a loop
                    proc.emitExpr(loc.storeDirect(pxtc.ir.rtcall("pxtrt::mkloc" + loc.refSuffix(), [])));
                }
                if (node.kind === pxtc.SK.BindingElement) {
                    emitBrk(node);
                    var rhs = bindingElementAccessExpression(node);
                    typeCheckSubtoSup(rhs[1], node);
                    proc.emitExpr(loc.storeByRef(rhs[0]));
                    proc.stackEmpty();
                }
                else if (node.initializer) {
                    emitBrk(node);
                    if (isGlobalVar(node)) {
                        var attrs = parseComments(node);
                        var jrname = attrs.jres;
                        if (jrname) {
                            if (jrname == "true") {
                                jrname = pxtc.getFullName(checker, node.symbol);
                            }
                            var jr = pxtc.U.lookup(opts.jres || {}, jrname);
                            if (!jr)
                                userError(9270, lf("resource '{0}' not found in any .jres file", jrname));
                            else {
                                currJres = jr;
                            }
                        }
                    }
                    typeCheckSubtoSup(node.initializer, node);
                    proc.emitExpr(loc.storeByRef(emitExpr(node.initializer)));
                    currJres = null;
                    proc.stackEmpty();
                }
                return loc;
            }
            function bindingElementAccessExpression(bindingElement) {
                var target = bindingElement.parent.parent;
                var parentAccess;
                var parentType;
                if (target.kind === pxtc.SK.BindingElement) {
                    var parent_4 = bindingElementAccessExpression(target);
                    parentAccess = parent_4[0];
                    parentType = parent_4[1];
                }
                else {
                    parentType = typeOf(target);
                }
                var propertyName = (bindingElement.propertyName || bindingElement.name);
                if (isPossiblyGenericClassType(parentType)) {
                    var info = getClassInfo(parentType);
                    parentAccess = parentAccess || emitLocalLoad(target);
                    var myType = checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(parentType, propertyName.text), bindingElement);
                    return [
                        pxtc.ir.op(EK.FieldAccess, [parentAccess], fieldIndexCore(info, getFieldInfo(info, propertyName.text), myType)),
                        myType
                    ];
                }
                else {
                    throw unhandled(bindingElement, lf("bad field access"), 9247);
                }
            }
            function emitClassDeclaration(node) {
                getClassInfo(null, node);
                node.members.forEach(emit);
            }
            function emitInterfaceDeclaration(node) {
                checkInterfaceDeclaration(node, classInfos);
                var attrs = parseComments(node);
                if (attrs.autoCreate)
                    autoCreateFunctions[attrs.autoCreate] = true;
            }
            function emitEnumDeclaration(node) {
                //No code needs to be generated, enum names are replaced by constant values in generated code
            }
            function emitEnumMember(node) { }
            function emitModuleDeclaration(node) {
                emit(node.body);
            }
            function emitImportDeclaration(node) { }
            function emitImportEqualsDeclaration(node) { }
            function emitExportDeclaration(node) { }
            function emitExportAssignment(node) { }
            function emitSourceFileNode(node) {
                node.statements.forEach(emit);
            }
            function catchErrors(node, f) {
                var prevErr = lastSecondaryError;
                inCatchErrors++;
                try {
                    lastSecondaryError = null;
                    var res_4 = f(node);
                    if (lastSecondaryError)
                        userError(lastSecondaryErrorCode, lastSecondaryError);
                    lastSecondaryError = prevErr;
                    inCatchErrors--;
                    return res_4;
                }
                catch (e) {
                    inCatchErrors--;
                    lastSecondaryError = null;
                    if (!e.ksEmitterUserError)
                        console.log(e.stack);
                    var code = e.ksErrorCode || 9200;
                    error(node, code, e.message);
                    return null;
                }
            }
            function emitExpr(node0, useCache) {
                if (useCache === void 0) { useCache = true; }
                var node = node0;
                if (useCache && node.cachedIR) {
                    if (isRefCountedExpr(node0))
                        return pxtc.ir.op(EK.Incr, [node.cachedIR]);
                    return node.cachedIR;
                }
                var res = catchErrors(node, emitExprInner) || emitLit(undefined);
                if (useCache && node.needsIRCache) {
                    node.cachedIR = pxtc.ir.shared(res);
                    return node.cachedIR;
                }
                return res;
            }
            function emitExprInner(node) {
                var expr = emitExprCore(node);
                if (expr.isExpr())
                    return expr;
                throw new Error("expecting expression");
            }
            function emit(node) {
                catchErrors(node, emitNodeCore);
            }
            function emitNodeCore(node) {
                switch (node.kind) {
                    case pxtc.SK.SourceFile:
                        return emitSourceFileNode(node);
                    case pxtc.SK.InterfaceDeclaration:
                        return emitInterfaceDeclaration(node);
                    case pxtc.SK.VariableStatement:
                        return emitVariableStatement(node);
                    case pxtc.SK.ModuleDeclaration:
                        return emitModuleDeclaration(node);
                    case pxtc.SK.EnumDeclaration:
                        return emitEnumDeclaration(node);
                    //case SyntaxKind.MethodSignature:
                    case pxtc.SK.FunctionDeclaration:
                    case pxtc.SK.Constructor:
                    case pxtc.SK.MethodDeclaration:
                        emitFunctionDeclaration(node);
                        return;
                    case pxtc.SK.ExpressionStatement:
                        return emitExpressionStatement(node);
                    case pxtc.SK.Block:
                    case pxtc.SK.ModuleBlock:
                        return emitBlock(node);
                    case pxtc.SK.VariableDeclaration:
                        emitVariableDeclaration(node);
                        return;
                    case pxtc.SK.IfStatement:
                        return emitIfStatement(node);
                    case pxtc.SK.WhileStatement:
                        return emitWhileStatement(node);
                    case pxtc.SK.DoStatement:
                        return emitDoStatement(node);
                    case pxtc.SK.ForStatement:
                        return emitForStatement(node);
                    case pxtc.SK.ForOfStatement:
                        return emitForOfStatement(node);
                    case pxtc.SK.ContinueStatement:
                    case pxtc.SK.BreakStatement:
                        return emitBreakOrContinueStatement(node);
                    case pxtc.SK.LabeledStatement:
                        return emitLabeledStatement(node);
                    case pxtc.SK.ReturnStatement:
                        return emitReturnStatement(node);
                    case pxtc.SK.ClassDeclaration:
                        return emitClassDeclaration(node);
                    case pxtc.SK.PropertyDeclaration:
                    case pxtc.SK.PropertyAssignment:
                        return emitPropertyAssignment(node);
                    case pxtc.SK.SwitchStatement:
                        return emitSwitchStatement(node);
                    case pxtc.SK.TypeAliasDeclaration:
                        // skip
                        return;
                    case pxtc.SK.DebuggerStatement:
                        return emitDebuggerStatement(node);
                    case pxtc.SK.GetAccessor:
                    case pxtc.SK.SetAccessor:
                        return emitAccessor(node);
                    case pxtc.SK.ImportEqualsDeclaration:
                        // this doesn't do anything in compiled code
                        return emitImportEqualsDeclaration(node);
                    case pxtc.SK.EmptyStatement:
                        return;
                    default:
                        unhandled(node);
                }
            }
            function emitExprCore(node) {
                switch (node.kind) {
                    case pxtc.SK.NullKeyword:
                        var v = node.valueOverride;
                        if (v)
                            return v;
                        return emitLit(null);
                    case pxtc.SK.TrueKeyword:
                        return emitLit(true);
                    case pxtc.SK.FalseKeyword:
                        return emitLit(false);
                    case pxtc.SK.TemplateHead:
                    case pxtc.SK.TemplateMiddle:
                    case pxtc.SK.TemplateTail:
                    case pxtc.SK.NumericLiteral:
                    case pxtc.SK.StringLiteral:
                    case pxtc.SK.NoSubstitutionTemplateLiteral:
                        //case SyntaxKind.RegularExpressionLiteral:
                        return emitLiteral(node);
                    case pxtc.SK.TaggedTemplateExpression:
                        return emitTaggedTemplateExpression(node);
                    case pxtc.SK.PropertyAccessExpression:
                        return emitPropertyAccess(node);
                    case pxtc.SK.BinaryExpression:
                        return emitBinaryExpression(node);
                    case pxtc.SK.PrefixUnaryExpression:
                        return emitPrefixUnaryExpression(node);
                    case pxtc.SK.PostfixUnaryExpression:
                        return emitPostfixUnaryExpression(node);
                    case pxtc.SK.ElementAccessExpression:
                        return emitIndexedAccess(node);
                    case pxtc.SK.ParenthesizedExpression:
                        return emitParenExpression(node);
                    case pxtc.SK.TypeAssertionExpression:
                        return emitTypeAssertion(node);
                    case pxtc.SK.ArrayLiteralExpression:
                        return emitArrayLiteral(node);
                    case pxtc.SK.NewExpression:
                        return emitNewExpression(node);
                    case pxtc.SK.SuperKeyword:
                    case pxtc.SK.ThisKeyword:
                        return emitThis(node);
                    case pxtc.SK.CallExpression:
                        return emitCallExpression(node);
                    case pxtc.SK.FunctionExpression:
                    case pxtc.SK.ArrowFunction:
                        return emitFunctionDeclaration(node);
                    case pxtc.SK.Identifier:
                        return emitIdentifier(node);
                    case pxtc.SK.ConditionalExpression:
                        return emitConditionalExpression(node);
                    case pxtc.SK.AsExpression:
                        return emitAsExpression(node);
                    case pxtc.SK.TemplateExpression:
                        return emitTemplateExpression(node);
                    case pxtc.SK.ObjectLiteralExpression:
                        return emitObjectLiteral(node);
                    default:
                        unhandled(node);
                        return null;
                }
            }
        }
        pxtc.compileBinary = compileBinary;
        function doubleToBits(v) {
            var a = new Float64Array(1);
            a[0] = v;
            return pxtc.U.toHex(new Uint8Array(a.buffer));
        }
        var Binary = (function () {
            function Binary() {
                this.procs = [];
                this.globals = [];
                this.finalPass = false;
                this.writeFile = function (fn, cont) { };
                this.usedClassInfos = [];
                this.sourceHash = "";
                this.numStmts = 1;
                this.strings = {};
                this.hexlits = {};
                this.doubles = {};
                this.otherLiterals = [];
                this.codeHelpers = {};
                this.lblNo = 0;
            }
            Binary.prototype.reset = function () {
                this.lblNo = 0;
                this.otherLiterals = [];
                this.strings = {};
                this.hexlits = {};
                this.doubles = {};
            };
            Binary.prototype.addProc = function (proc) {
                pxtc.assert(!this.finalPass, "!this.finalPass");
                this.procs.push(proc);
                proc.seqNo = this.procs.length;
                //proc.binary = this
            };
            Binary.prototype.emitLabelled = function (v, hash, lblpref) {
                var r = pxtc.U.lookup(hash, v);
                if (r != null)
                    return r;
                var lbl = lblpref + this.lblNo++;
                hash[v] = lbl;
                return lbl;
            };
            Binary.prototype.emitDouble = function (v) {
                return this.emitLabelled(doubleToBits(v), this.doubles, "_dbl");
            };
            Binary.prototype.emitString = function (s) {
                return this.emitLabelled(s, this.strings, "_str");
            };
            Binary.prototype.emitHexLiteral = function (s) {
                return this.emitLabelled(s, this.hexlits, "_hexlit");
            };
            return Binary;
        }());
        pxtc.Binary = Binary;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../built/typescriptServices.d.ts"/>
/// <reference path="../../localtypings/pxtarget.d.ts"/>
// Enforce order:
/// <reference path="avr.ts"/>
/// <reference path="thumb.ts"/>
/// <reference path="ir.ts"/>
/// <reference path="emitter.ts"/>
/// <reference path="backthumb.ts"/>
/// <reference path="decompiler.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        function getTsCompilerOptions(opts) {
            var options = ts.getDefaultCompilerOptions();
            options.target = pxtc.ScriptTarget.ES5;
            options.module = ts.ModuleKind.None;
            options.noImplicitAny = true;
            options.noImplicitReturns = true;
            options.allowUnreachableCode = true;
            return options;
        }
        pxtc.getTsCompilerOptions = getTsCompilerOptions;
        function nodeLocationInfo(node) {
            var file = ts.getSourceFileOfNode(node);
            var nodeStart = node.getStart ? node.getStart() : node.pos;
            var _a = ts.getLineAndCharacterOfPosition(file, nodeStart), line = _a.line, character = _a.character;
            var _b = ts.getLineAndCharacterOfPosition(file, node.end), endLine = _b.line, endChar = _b.character;
            var r = {
                start: nodeStart,
                length: node.end - nodeStart,
                line: line,
                column: character,
                endLine: endLine,
                endColumn: endChar,
                fileName: file.fileName,
            };
            return r;
        }
        pxtc.nodeLocationInfo = nodeLocationInfo;
        function patchUpDiagnostics(diags, ignoreFileResolutionErorrs) {
            if (ignoreFileResolutionErorrs === void 0) { ignoreFileResolutionErorrs = false; }
            if (ignoreFileResolutionErorrs) {
                // Because we generate the program and the virtual file system, we can safely ignore
                // file resolution errors. They are generated by triple slash references that likely
                // have a different path format than the one our dumb file system expects. The files
                // are included, our compiler host just isn't smart enough to resolve them.
                diags = diags.filter(function (d) { return d.code !== 5012; });
            }
            var highPri = diags.filter(function (d) { return d.code == 1148; });
            if (highPri.length > 0)
                diags = highPri;
            return diags.map(function (d) {
                if (!d.file) {
                    var rr = {
                        code: d.code,
                        start: d.start,
                        length: d.length,
                        line: 0,
                        column: 0,
                        messageText: d.messageText,
                        category: d.category,
                        fileName: "?",
                    };
                    return rr;
                }
                var pos = ts.getLineAndCharacterOfPosition(d.file, d.start);
                var r = {
                    code: d.code,
                    start: d.start,
                    length: d.length,
                    line: pos.line,
                    column: pos.character,
                    messageText: d.messageText,
                    category: d.category,
                    fileName: d.file.fileName,
                };
                if (r.code == 1148)
                    r.messageText = pxtc.Util.lf("all symbols in top-level scope are always exported; please use a namespace if you want to export only some");
                return r;
            });
        }
        pxtc.patchUpDiagnostics = patchUpDiagnostics;
        function compile(opts) {
            var startTime = Date.now();
            var res = {
                outfiles: {},
                diagnostics: [],
                success: false,
                times: {},
            };
            if (opts.target.taggedInts)
                opts.target.floatingPoint = true;
            if (!opts.target.isNative)
                opts.target.taggedInts = false;
            var fileText = {};
            for (var fileName in opts.fileSystem) {
                fileText[normalizePath(fileName)] = opts.fileSystem[fileName];
            }
            var setParentNodes = true;
            var options = getTsCompilerOptions(opts);
            var host = {
                getSourceFile: function (fn, v, err) {
                    fn = normalizePath(fn);
                    var text = "";
                    if (fileText.hasOwnProperty(fn)) {
                        text = fileText[fn];
                    }
                    else {
                        if (err)
                            err("File not found: " + fn);
                    }
                    if (text == null) {
                        err("File not found: " + fn);
                        text = "";
                    }
                    return ts.createSourceFile(fn, text, v, setParentNodes);
                },
                fileExists: function (fn) {
                    fn = normalizePath(fn);
                    return fileText.hasOwnProperty(fn);
                },
                getCanonicalFileName: function (fn) { return fn; },
                getDefaultLibFileName: function () { return "no-default-lib.d.ts"; },
                writeFile: function (fileName, data, writeByteOrderMark, onError) {
                    res.outfiles[fileName] = data;
                },
                getCurrentDirectory: function () { return "."; },
                useCaseSensitiveFileNames: function () { return true; },
                getNewLine: function () { return "\n"; },
                readFile: function (fn) {
                    fn = normalizePath(fn);
                    return fileText[fn] || "";
                },
                directoryExists: function (dn) { return true; },
            };
            if (!opts.sourceFiles)
                opts.sourceFiles = Object.keys(opts.fileSystem);
            var tsFiles = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); });
            // ensure that main.ts is last of TS files
            var tsFilesNoMain = tsFiles.filter(function (f) { return f != "main.ts"; });
            if (tsFiles.length > tsFilesNoMain.length) {
                tsFiles = tsFilesNoMain;
                tsFiles.push("main.ts");
            }
            // TODO: ensure that main.ts is last???
            var program = ts.createProgram(tsFiles, options, host);
            // First get and report any syntactic errors.
            res.diagnostics = patchUpDiagnostics(program.getSyntacticDiagnostics(), opts.ignoreFileResolutionErrors);
            if (res.diagnostics.length > 0) {
                if (opts.forceEmit) {
                    pxt.debug('syntactic errors, forcing emit');
                    pxtc.compileBinary(program, host, opts, res);
                }
                return res;
            }
            // If we didn't have any syntactic errors, then also try getting the global and
            // semantic errors.
            res.diagnostics = patchUpDiagnostics(program.getOptionsDiagnostics().concat(program.getGlobalDiagnostics()), opts.ignoreFileResolutionErrors);
            if (res.diagnostics.length == 0) {
                res.diagnostics = patchUpDiagnostics(program.getSemanticDiagnostics(), opts.ignoreFileResolutionErrors);
            }
            var emitStart = Date.now();
            res.times["typescript"] = emitStart - startTime;
            if (opts.ast) {
                res.ast = program;
            }
            if (opts.ast || opts.forceEmit || res.diagnostics.length == 0) {
                var binOutput = pxtc.compileBinary(program, host, opts, res);
                res.times["compilebinary"] = Date.now() - emitStart;
                res.diagnostics = res.diagnostics.concat(patchUpDiagnostics(binOutput.diagnostics));
            }
            if (res.diagnostics.length == 0)
                res.success = true;
            for (var _i = 0, _a = opts.sourceFiles; _i < _a.length; _i++) {
                var f = _a[_i];
                if (pxtc.Util.startsWith(f, "built/"))
                    res.outfiles[f.slice(6)] = opts.fileSystem[f];
            }
            return res;
        }
        pxtc.compile = compile;
        function decompile(opts, fileName) {
            var resp = compile(opts);
            if (!resp.success)
                return resp;
            var file = resp.ast.getSourceFile(fileName);
            var apis = pxtc.getApiInfo(opts, resp.ast);
            var blocksInfo = pxtc.getBlocksInfo(apis);
            var bresp = pxtc.decompiler.decompileToBlocks(blocksInfo, file, { snippetMode: false, alwaysEmitOnStart: opts.alwaysDecompileOnStart }, pxtc.decompiler.buildRenameMap(resp.ast, file));
            return bresp;
        }
        pxtc.decompile = decompile;
        function normalizePath(path) {
            path = path.replace(/\\/g, "/");
            var parts = [];
            path.split("/").forEach(function (part) {
                if (part === ".." && parts.length) {
                    parts.pop();
                }
                else if (part !== ".") {
                    parts.push(part);
                }
            });
            return parts.join("/");
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxt;
(function (pxt) {
    var elf;
    (function (elf) {
        ;
        var progHeaderFields = [
            "type",
            "offset",
            "vaddr",
            "paddr",
            "filesz",
            "memsz",
            "flags",
            "align",
        ];
        ;
        var r32 = pxt.HF2.read32;
        var r16 = pxt.HF2.read16;
        var pageSize = 4096;
        function parse(buf) {
            if (r32(buf, 0) != 0x464c457f)
                pxt.U.userError("no magic");
            if (buf[4] != 1)
                pxt.U.userError("not 32 bit");
            if (buf[5] != 1)
                pxt.U.userError("not little endian");
            if (buf[6] != 1)
                pxt.U.userError("bad version");
            if (r16(buf, 0x10) != 2)
                pxt.U.userError("wrong object type");
            if (r16(buf, 0x12) != 0x28)
                pxt.U.userError("not ARM");
            var phoff = r32(buf, 0x1c);
            var shoff = r32(buf, 0x20);
            if (phoff == 0)
                pxt.U.userError("expecting program headers");
            var phentsize = r16(buf, 42);
            var phnum = r16(buf, 44);
            var progHeaders = pxt.U.range(phnum).map(function (no) {
                return readPH(phoff + no * phentsize);
            });
            var addFileOff = buf.length + 1;
            while (addFileOff & 0xf)
                addFileOff++;
            var mapEnd = 0;
            for (var _i = 0, progHeaders_1 = progHeaders; _i < progHeaders_1.length; _i++) {
                var s = progHeaders_1[_i];
                if (s.type == 1 /* LOAD */)
                    mapEnd = Math.max(mapEnd, s.vaddr + s.memsz);
            }
            var addMemOff = ((mapEnd + pageSize - 1) & ~(pageSize - 1)) + (addFileOff & (pageSize - 1));
            var phOffset = -1;
            for (var _a = 0, progHeaders_2 = progHeaders; _a < progHeaders_2.length; _a++) {
                var s = progHeaders_2[_a];
                if (s.type == 4 /* NOTE */) {
                    phOffset = s._filepos;
                }
            }
            return {
                imageMemStart: addMemOff,
                imageFileStart: addFileOff,
                phOffset: phOffset,
                template: buf
            };
            function readPH(off) {
                var r = {};
                var o0 = off;
                for (var _i = 0, progHeaderFields_1 = progHeaderFields; _i < progHeaderFields_1.length; _i++) {
                    var f = progHeaderFields_1[_i];
                    r[f] = r32(buf, off);
                    off += 4;
                }
                var rr = r;
                rr._filepos = o0;
                return rr;
            }
        }
        elf.parse = parse;
        function patch(info, program) {
            var resBuf = new Uint8Array(info.imageFileStart + program.length);
            resBuf.fill(0);
            pxt.U.memcpy(resBuf, 0, info.template);
            pxt.U.memcpy(resBuf, info.imageFileStart, program);
            var ph = {
                _filepos: info.phOffset,
                type: 1 /* LOAD */,
                offset: info.imageFileStart,
                vaddr: info.imageMemStart,
                paddr: info.imageMemStart,
                filesz: program.length,
                memsz: program.length,
                flags: 4 /* R */ | 1 /* X */,
                align: pageSize
            };
            savePH(resBuf, ph);
            return resBuf;
            function savePH(buf, ph) {
                var off = ph._filepos;
                for (var _i = 0, progHeaderFields_2 = progHeaderFields; _i < progHeaderFields_2.length; _i++) {
                    var f = progHeaderFields_2[_i];
                    pxt.HF2.write32(buf, off, ph[f] || 0);
                    off += 4;
                }
            }
        }
        elf.patch = patch;
    })(elf = pxt.elf || (pxt.elf = {}));
})(pxt || (pxt = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var TokenKind;
        (function (TokenKind) {
            TokenKind[TokenKind["None"] = 0] = "None";
            TokenKind[TokenKind["Whitespace"] = 1] = "Whitespace";
            TokenKind[TokenKind["Identifier"] = 2] = "Identifier";
            TokenKind[TokenKind["Keyword"] = 3] = "Keyword";
            TokenKind[TokenKind["Operator"] = 4] = "Operator";
            TokenKind[TokenKind["CommentLine"] = 5] = "CommentLine";
            TokenKind[TokenKind["CommentBlock"] = 6] = "CommentBlock";
            TokenKind[TokenKind["NewLine"] = 7] = "NewLine";
            TokenKind[TokenKind["Literal"] = 8] = "Literal";
            TokenKind[TokenKind["Tree"] = 9] = "Tree";
            TokenKind[TokenKind["Block"] = 10] = "Block";
            TokenKind[TokenKind["EOF"] = 11] = "EOF";
        })(TokenKind || (TokenKind = {}));
        var inputForMsg = "";
        function lookupKind(k) {
            for (var _i = 0, _a = Object.keys(ts.SyntaxKind); _i < _a.length; _i++) {
                var o = _a[_i];
                if (ts.SyntaxKind[o] === k)
                    return o;
            }
            return "?";
        }
        var SK = ts.SyntaxKind;
        function showMsg(t, msg) {
            var pos = t.pos;
            var ctx = inputForMsg.slice(pos - 20, pos) + "<*>" + inputForMsg.slice(pos, pos + 20);
            console.log(ctx.replace(/\n/g, "<NL>"), ": L ", t.lineNo, msg);
        }
        function infixOperatorPrecedence(kind) {
            switch (kind) {
                case SK.CommaToken:
                    return 2;
                case SK.EqualsToken:
                case SK.PlusEqualsToken:
                case SK.MinusEqualsToken:
                case SK.AsteriskEqualsToken:
                case SK.AsteriskAsteriskEqualsToken:
                case SK.SlashEqualsToken:
                case SK.PercentEqualsToken:
                case SK.LessThanLessThanEqualsToken:
                case SK.GreaterThanGreaterThanEqualsToken:
                case SK.GreaterThanGreaterThanGreaterThanEqualsToken:
                case SK.AmpersandEqualsToken:
                case SK.BarEqualsToken:
                case SK.CaretEqualsToken:
                    return 5;
                case SK.QuestionToken:
                case SK.ColonToken:
                    return 7; // ternary operator
                case SK.BarBarToken:
                    return 10;
                case SK.AmpersandAmpersandToken:
                    return 20;
                case SK.BarToken:
                    return 30;
                case SK.CaretToken:
                    return 40;
                case SK.AmpersandToken:
                    return 50;
                case SK.EqualsEqualsToken:
                case SK.ExclamationEqualsToken:
                case SK.EqualsEqualsEqualsToken:
                case SK.ExclamationEqualsEqualsToken:
                    return 60;
                case SK.LessThanToken:
                case SK.GreaterThanToken:
                case SK.LessThanEqualsToken:
                case SK.GreaterThanEqualsToken:
                case SK.InstanceOfKeyword:
                case SK.InKeyword:
                case SK.AsKeyword:
                    return 70;
                case SK.LessThanLessThanToken:
                case SK.GreaterThanGreaterThanToken:
                case SK.GreaterThanGreaterThanGreaterThanToken:
                    return 80;
                case SK.PlusToken:
                case SK.MinusToken:
                    return 90;
                case SK.AsteriskToken:
                case SK.SlashToken:
                case SK.PercentToken:
                    return 100;
                case SK.AsteriskAsteriskToken:
                    return 101;
                case SK.DotToken:
                    return 120;
                default:
                    return 0;
            }
        }
        function getTokKind(kind) {
            switch (kind) {
                case SK.EndOfFileToken:
                    return TokenKind.EOF;
                case SK.SingleLineCommentTrivia:
                    return TokenKind.CommentLine;
                case SK.MultiLineCommentTrivia:
                    return TokenKind.CommentBlock;
                case SK.NewLineTrivia:
                    return TokenKind.NewLine;
                case SK.WhitespaceTrivia:
                    return TokenKind.Whitespace;
                case SK.ShebangTrivia:
                case SK.ConflictMarkerTrivia:
                    return TokenKind.CommentBlock;
                case SK.NumericLiteral:
                case SK.StringLiteral:
                case SK.RegularExpressionLiteral:
                case SK.NoSubstitutionTemplateLiteral:
                case SK.TemplateHead:
                case SK.TemplateMiddle:
                case SK.TemplateTail:
                    return TokenKind.Literal;
                case SK.Identifier:
                    return TokenKind.Identifier;
                default:
                    if (kind < SK.Identifier)
                        return TokenKind.Operator;
                    return TokenKind.Keyword;
            }
        }
        var brokenRegExps = false;
        function tokenize(input) {
            inputForMsg = input;
            var scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, input, function (msg) {
                var pos = scanner.getTextPos();
                console.log("scanner error", pos, msg.message);
            });
            var tokens = [];
            var braceBalance = 0;
            var templateLevel = -1;
            while (true) {
                var kind = scanner.scan();
                if (kind == SK.CloseBraceToken && braceBalance == templateLevel) {
                    templateLevel = -1;
                    kind = scanner.reScanTemplateToken();
                }
                if (brokenRegExps && kind == SK.SlashToken || kind == SK.SlashEqualsToken) {
                    var tmp = scanner.reScanSlashToken();
                    if (tmp == SK.RegularExpressionLiteral)
                        kind = tmp;
                }
                if (kind == SK.GreaterThanToken) {
                    kind = scanner.reScanGreaterToken();
                }
                var tok = {
                    kind: getTokKind(kind),
                    synKind: kind,
                    lineNo: 0,
                    pos: scanner.getTokenPos(),
                    text: scanner.getTokenText(),
                };
                if (kind == SK.OpenBraceToken)
                    braceBalance++;
                if (kind == SK.CloseBraceToken) {
                    if (--braceBalance < 0)
                        braceBalance = -10000000;
                }
                tokens.push(tok);
                if (kind == SK.TemplateHead || kind == SK.TemplateMiddle) {
                    templateLevel = braceBalance;
                }
                if (tok.kind == TokenKind.EOF)
                    break;
            }
            // Util.assert(tokens.map(t => t.text).join("") == input)
            return { tokens: tokens, braceBalance: braceBalance };
        }
        function skipWhitespace(tokens, i) {
            while (tokens[i] && tokens[i].kind == TokenKind.Whitespace)
                i++;
            return i;
        }
        // We do not want empty lines in the source to get lost - they serve as a sort of comment dividing parts of code
        // We turn them into empty comments here
        function emptyLinesToComments(tokens, cursorPos) {
            var output = [];
            var atLineBeg = true;
            var lineNo = 1;
            for (var i = 0; i < tokens.length; ++i) {
                if (atLineBeg) {
                    var bkp = i;
                    i = skipWhitespace(tokens, i);
                    if (tokens[i].kind == TokenKind.NewLine) {
                        var isCursor = false;
                        if (cursorPos >= 0 && tokens[i].pos >= cursorPos) {
                            cursorPos = -1;
                            isCursor = true;
                        }
                        output.push({
                            text: "",
                            kind: TokenKind.CommentLine,
                            pos: tokens[i].pos,
                            lineNo: lineNo,
                            synKind: SK.SingleLineCommentTrivia,
                            isCursor: isCursor
                        });
                    }
                    else {
                        i = bkp;
                    }
                }
                output.push(tokens[i]);
                tokens[i].lineNo = lineNo;
                if (tokens[i].kind == TokenKind.NewLine) {
                    atLineBeg = true;
                    lineNo++;
                }
                else {
                    atLineBeg = false;
                }
                if (cursorPos >= 0 && tokens[i].pos >= cursorPos) {
                    cursorPos = -1;
                }
            }
            return output;
        }
        // Add Tree tokens where needed
        function matchBraces(tokens) {
            var braceStack = [];
            var braceTop = function () { return braceStack[braceStack.length - 1]; };
            braceStack.push({
                synKind: SK.EndOfFileToken,
                token: {
                    children: [],
                },
            });
            var pushClose = function (tok, synKind) {
                var token = tok;
                token.children = [];
                token.kind = TokenKind.Tree;
                braceStack.push({ synKind: synKind, token: token });
            };
            for (var i = 0; i < tokens.length; ++i) {
                var token = tokens[i];
                var top_1 = braceStack[braceStack.length - 1];
                top_1.token.children.push(token);
                switch (token.kind) {
                    case TokenKind.Operator:
                        switch (token.synKind) {
                            case SK.OpenBraceToken:
                            case SK.OpenParenToken:
                            case SK.OpenBracketToken:
                                pushClose(token, token.synKind + 1);
                                break;
                            case SK.CloseBraceToken:
                            case SK.CloseParenToken:
                            case SK.CloseBracketToken:
                                top_1.token.children.pop();
                                while (true) {
                                    top_1 = braceStack.pop();
                                    if (top_1.synKind == token.synKind) {
                                        top_1.token.endToken = token;
                                        break;
                                    }
                                    // don't go past brace with other closing parens
                                    if (braceStack.length == 0 || top_1.synKind == SK.CloseBraceToken) {
                                        braceStack.push(top_1);
                                        break;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                        break;
                }
            }
            return braceStack[0].token.children;
        }
        function mkEOF() {
            return {
                kind: TokenKind.EOF,
                synKind: SK.EndOfFileToken,
                pos: 0,
                lineNo: 0,
                text: ""
            };
        }
        function mkSpace(t, s) {
            return {
                kind: TokenKind.Whitespace,
                synKind: SK.WhitespaceTrivia,
                pos: t.pos - s.length,
                lineNo: t.lineNo,
                text: s
            };
        }
        function mkNewLine(t) {
            return {
                kind: TokenKind.NewLine,
                synKind: SK.NewLineTrivia,
                pos: t.pos,
                lineNo: t.lineNo,
                text: "\n"
            };
        }
        function mkBlock(toks) {
            return {
                kind: TokenKind.Block,
                synKind: SK.OpenBraceToken,
                pos: toks[0].pos,
                lineNo: toks[0].lineNo,
                stmts: [{ tokens: toks }],
                text: "{",
                endToken: null
            };
        }
        function mkVirtualTree(toks) {
            return {
                kind: TokenKind.Tree,
                synKind: SK.WhitespaceTrivia,
                pos: toks[0].pos,
                lineNo: toks[0].lineNo,
                children: toks,
                endToken: null,
                text: ""
            };
        }
        function isExprEnd(t) {
            if (!t)
                return false;
            switch (t.synKind) {
                case SK.IfKeyword:
                case SK.ElseKeyword:
                case SK.LetKeyword:
                case SK.ConstKeyword:
                case SK.VarKeyword:
                case SK.DoKeyword:
                case SK.WhileKeyword:
                case SK.SwitchKeyword:
                case SK.CaseKeyword:
                case SK.DefaultKeyword:
                case SK.ForKeyword:
                case SK.ReturnKeyword:
                case SK.BreakKeyword:
                case SK.ContinueKeyword:
                case SK.TryKeyword:
                case SK.CatchKeyword:
                case SK.FinallyKeyword:
                case SK.DeleteKeyword:
                case SK.FunctionKeyword:
                case SK.ClassKeyword:
                case SK.YieldKeyword:
                case SK.DebuggerKeyword:
                    return true;
                default:
                    return false;
            }
        }
        function delimitStmts(tokens, inStmtCtx, ctxToken) {
            if (ctxToken === void 0) { ctxToken = null; }
            var res = [];
            var i = 0;
            var currCtxToken;
            var didBlock = false;
            tokens = tokens.concat([mkEOF()]);
            while (tokens[i].kind != TokenKind.EOF) {
                var stmtBeg = i;
                skipToStmtEnd();
                pxtc.Util.assert(i > stmtBeg, "Error at " + tokens[i].text);
                addStatement(tokens.slice(stmtBeg, i));
            }
            return res;
            function addStatement(tokens) {
                if (inStmtCtx)
                    tokens = trimWhitespace(tokens);
                if (tokens.length == 0)
                    return;
                tokens.forEach(delimitIn);
                tokens = injectBlocks(tokens);
                var merge = false;
                if (inStmtCtx && res.length > 0) {
                    var prev = res[res.length - 1];
                    var prevKind = prev.tokens[0].synKind;
                    var thisKind = tokens[0].synKind;
                    if ((prevKind == SK.IfKeyword && thisKind == SK.ElseKeyword) ||
                        (prevKind == SK.TryKeyword && thisKind == SK.CatchKeyword) ||
                        (prevKind == SK.TryKeyword && thisKind == SK.FinallyKeyword) ||
                        (prevKind == SK.CatchKeyword && thisKind == SK.FinallyKeyword)) {
                        tokens.unshift(mkSpace(tokens[0], " "));
                        pxtc.Util.pushRange(res[res.length - 1].tokens, tokens);
                        return;
                    }
                }
                res.push({
                    tokens: tokens
                });
            }
            function injectBlocks(tokens) {
                var output = [];
                var i = 0;
                while (i < tokens.length) {
                    if (tokens[i].blockSpanLength) {
                        var inner = tokens.slice(i, i + tokens[i].blockSpanLength);
                        var isVirtual = !!inner[0].blockSpanIsVirtual;
                        delete inner[0].blockSpanLength;
                        delete inner[0].blockSpanIsVirtual;
                        i += inner.length;
                        inner = injectBlocks(inner);
                        if (isVirtual) {
                            output.push(mkVirtualTree(inner));
                        }
                        else {
                            output.push(mkSpace(inner[0], " "));
                            output.push(mkBlock(trimWhitespace(inner)));
                        }
                    }
                    else {
                        output.push(tokens[i++]);
                    }
                }
                return output;
            }
            function delimitIn(t) {
                if (t.kind == TokenKind.Tree) {
                    var tree = t;
                    tree.children = pxtc.Util.concat(delimitStmts(tree.children, false, tree).map(function (s) { return s.tokens; }));
                }
            }
            function nextNonWs(stopOnNewLine) {
                if (stopOnNewLine === void 0) { stopOnNewLine = false; }
                while (true) {
                    i++;
                    switch (tokens[i].kind) {
                        case TokenKind.Whitespace:
                        case TokenKind.CommentBlock:
                        case TokenKind.CommentLine:
                            break;
                        case TokenKind.NewLine:
                            if (stopOnNewLine)
                                break;
                            break;
                        default:
                            return;
                    }
                }
            }
            function skipOptionalNewLine() {
                while (tokens[i].kind == TokenKind.Whitespace) {
                    i++;
                }
                if (tokens[i].kind == TokenKind.NewLine)
                    i++;
            }
            function skipUntilBlock() {
                while (true) {
                    i++;
                    switch (tokens[i].kind) {
                        case TokenKind.EOF:
                            return;
                        case TokenKind.Tree:
                            if (tokens[i].synKind == SK.OpenBraceToken) {
                                i--;
                                expectBlock();
                                return;
                            }
                            break;
                    }
                }
            }
            function handleBlock() {
                pxtc.Util.assert(tokens[i].synKind == SK.OpenBraceToken);
                var tree = tokens[i];
                pxtc.Util.assert(tree.kind == TokenKind.Tree);
                var blk = tokens[i];
                blk.stmts = delimitStmts(tree.children, true, currCtxToken);
                delete tree.children;
                blk.kind = TokenKind.Block;
                i++;
                didBlock = true;
            }
            function expectBlock() {
                var begIdx = i + 1;
                nextNonWs();
                if (tokens[i].synKind == SK.OpenBraceToken) {
                    handleBlock();
                    skipOptionalNewLine();
                }
                else {
                    skipToStmtEnd();
                    tokens[begIdx].blockSpanLength = i - begIdx;
                }
            }
            function skipToStmtEnd() {
                while (true) {
                    var t = tokens[i];
                    var bkp = i;
                    currCtxToken = t;
                    didBlock = false;
                    if (t.kind == TokenKind.EOF)
                        return;
                    if (inStmtCtx && t.synKind == SK.SemicolonToken) {
                        i++;
                        skipOptionalNewLine();
                        return;
                    }
                    if (t.synKind == SK.EqualsGreaterThanToken) {
                        nextNonWs();
                        if (tokens[i].synKind == SK.OpenBraceToken) {
                            handleBlock();
                            continue;
                        }
                        else {
                            var begIdx = i;
                            skipToStmtEnd();
                            var j = i;
                            while (tokens[j].kind == TokenKind.NewLine)
                                j--;
                            tokens[begIdx].blockSpanLength = j - begIdx;
                            tokens[begIdx].blockSpanIsVirtual = true;
                            return;
                        }
                    }
                    if (inStmtCtx && infixOperatorPrecedence(t.synKind)) {
                        var begIdx = i;
                        // an infix operator at the end of the line prevents the newline from ending the statement
                        nextNonWs();
                        if (isExprEnd(tokens[i])) {
                            // unless next line starts with something statement-like
                            i = begIdx;
                        }
                        else {
                            continue;
                        }
                    }
                    if (inStmtCtx && t.kind == TokenKind.NewLine) {
                        nextNonWs();
                        t = tokens[i];
                        // if we get a infix operator other than +/- after newline, it's a continuation
                        if (infixOperatorPrecedence(t.synKind) && t.synKind != SK.PlusToken && t.synKind != SK.MinusToken) {
                            continue;
                        }
                        else {
                            i = bkp + 1;
                            return;
                        }
                    }
                    if (t.synKind == SK.OpenBraceToken && ctxToken && ctxToken.synKind == SK.ClassKeyword) {
                        var jj = i - 1;
                        while (jj >= 0 && tokens[jj].kind == TokenKind.Whitespace)
                            jj--;
                        if (jj < 0 || tokens[jj].synKind != SK.EqualsToken) {
                            i--;
                            expectBlock(); // method body
                            return;
                        }
                    }
                    pxtc.Util.assert(bkp == i);
                    switch (t.synKind) {
                        case SK.ForKeyword:
                        case SK.WhileKeyword:
                        case SK.IfKeyword:
                        case SK.CatchKeyword:
                            nextNonWs();
                            if (tokens[i].synKind == SK.OpenParenToken) {
                                expectBlock();
                            }
                            else {
                                continue; // just continue until new line
                            }
                            return;
                        case SK.DoKeyword:
                            expectBlock();
                            i--;
                            nextNonWs();
                            if (tokens[i].synKind == SK.WhileKeyword) {
                                i++;
                                continue;
                            }
                            else {
                                return;
                            }
                        case SK.ElseKeyword:
                            nextNonWs();
                            if (tokens[i].synKind == SK.IfKeyword) {
                                continue; // 'else if' - keep scanning
                            }
                            else {
                                i = bkp;
                                expectBlock();
                                return;
                            }
                        case SK.TryKeyword:
                        case SK.FinallyKeyword:
                            expectBlock();
                            return;
                        case SK.ClassKeyword:
                        case SK.NamespaceKeyword:
                        case SK.ModuleKeyword:
                        case SK.InterfaceKeyword:
                        case SK.FunctionKeyword:
                            skipUntilBlock();
                            return;
                    }
                    pxtc.Util.assert(!didBlock, "forgot continue/return after expectBlock");
                    i++;
                }
            }
        }
        function isWhitespaceOrNewLine(tok) {
            return tok && (tok.kind == TokenKind.Whitespace || tok.kind == TokenKind.NewLine);
        }
        function removeIndent(tokens) {
            var output = [];
            var atLineBeg = false;
            for (var i = 0; i < tokens.length; ++i) {
                if (atLineBeg)
                    i = skipWhitespace(tokens, i);
                if (tokens[i]) {
                    output.push(tokens[i]);
                    atLineBeg = tokens[i].kind == TokenKind.NewLine;
                }
            }
            return output;
        }
        function trimWhitespace(toks) {
            toks = toks.slice(0);
            while (isWhitespaceOrNewLine(toks[0]))
                toks.shift();
            while (isWhitespaceOrNewLine(toks[toks.length - 1]))
                toks.pop();
            return toks;
        }
        function normalizeSpace(tokens) {
            var output = [];
            var i = 0;
            var lastNonTrivialToken = mkEOF();
            tokens = tokens.concat([mkEOF()]);
            while (i < tokens.length) {
                i = skipWhitespace(tokens, i);
                var token = tokens[i];
                if (token.kind == TokenKind.EOF)
                    break;
                var j = skipWhitespace(tokens, i + 1);
                if (token.kind == TokenKind.NewLine && tokens[j].synKind == SK.OpenBraceToken) {
                    i = j; // skip NL
                    continue;
                }
                var needsSpace = true;
                var last = output.length == 0 ? mkNewLine(token) : output[output.length - 1];
                switch (last.synKind) {
                    case SK.ExclamationToken:
                    case SK.TildeToken:
                    case SK.DotToken:
                        needsSpace = false;
                        break;
                    case SK.PlusToken:
                    case SK.MinusToken:
                    case SK.PlusPlusToken:
                    case SK.MinusMinusToken:
                        if (last.isPrefix)
                            needsSpace = false;
                        break;
                }
                switch (token.synKind) {
                    case SK.DotToken:
                    case SK.CommaToken:
                    case SK.NewLineTrivia:
                    case SK.ColonToken:
                    case SK.SemicolonToken:
                    case SK.OpenBracketToken:
                        needsSpace = false;
                        break;
                    case SK.PlusPlusToken:
                    case SK.MinusMinusToken:
                        if (last.kind == TokenKind.Tree || last.kind == TokenKind.Identifier || last.kind == TokenKind.Keyword)
                            needsSpace = false;
                    /* fall through */
                    case SK.PlusToken:
                    case SK.MinusToken:
                        if (lastNonTrivialToken.kind == TokenKind.EOF ||
                            infixOperatorPrecedence(lastNonTrivialToken.synKind) ||
                            lastNonTrivialToken.synKind == SK.SemicolonToken)
                            token.isPrefix = true;
                        break;
                    case SK.OpenParenToken:
                        if (last.kind == TokenKind.Identifier)
                            needsSpace = false;
                        if (last.kind == TokenKind.Keyword)
                            switch (last.synKind) {
                                case SK.IfKeyword:
                                case SK.ForKeyword:
                                case SK.WhileKeyword:
                                case SK.SwitchKeyword:
                                case SK.ReturnKeyword:
                                case SK.ThrowKeyword:
                                case SK.CatchKeyword:
                                    break;
                                default:
                                    needsSpace = false;
                            }
                        break;
                }
                if (last.kind == TokenKind.NewLine)
                    needsSpace = false;
                if (needsSpace)
                    output.push(mkSpace(token, " "));
                output.push(token);
                if (token.kind != TokenKind.NewLine)
                    lastNonTrivialToken = token;
                i++;
            }
            return output;
        }
        function finalFormat(ind, token) {
            if (token.synKind == SK.NoSubstitutionTemplateLiteral &&
                /^`[\s\.#01]*`$/.test(token.text)) {
                var lines = token.text.slice(1, token.text.length - 1).split("\n").map(function (l) { return l.replace(/\s/g, ""); }).filter(function (l) { return !!l; });
                if (lines.length < 4 || lines.length > 5)
                    return;
                var numFrames = Math.floor((Math.max.apply(Math, lines.map(function (l) { return l.length; })) + 2) / 5);
                if (numFrames <= 0)
                    numFrames = 1;
                var out = "`\n";
                for (var i = 0; i < 5; ++i) {
                    var l = lines[i] || "";
                    while (l.length < numFrames * 5)
                        l += ".";
                    l = l.replace(/0/g, ".");
                    l = l.replace(/1/g, "#");
                    l = l.replace(/...../g, function (m) { return "/" + m; });
                    out += ind + l.replace(/./g, function (m) { return " " + m; }).replace(/\//g, " ").slice(3) + "\n";
                }
                out += ind + "`";
                token.text = out;
            }
        }
        function toStr(v) {
            if (Array.isArray(v))
                return "[[ " + v.map(toStr).join("  ") + " ]]";
            if (typeof v.text == "string")
                return JSON.stringify(v.text);
            return v + "";
        }
        pxtc.toStr = toStr;
        function format(input, pos) {
            var r = tokenize(input);
            //if (r.braceBalance != 0) return null
            var topTokens = r.tokens;
            topTokens = emptyLinesToComments(topTokens, pos);
            topTokens = matchBraces(topTokens);
            var topStmts = delimitStmts(topTokens, true);
            var ind = "";
            var output = "";
            var outpos = -1;
            var indIncrLine = 0;
            topStmts.forEach(ppStmt);
            topStmts.forEach(function (s) { return s.tokens.forEach(findNonBlocks); });
            if (outpos == -1)
                outpos = output.length;
            return {
                formatted: output,
                pos: outpos
            };
            function findNonBlocks(t) {
                if (t.kind == TokenKind.Tree) {
                    var tree = t;
                    if (t.synKind == SK.OpenBraceToken) {
                    }
                    tree.children.forEach(findNonBlocks);
                }
                else if (t.kind == TokenKind.Block) {
                    t.stmts.forEach(function (s) { return s.tokens.forEach(findNonBlocks); });
                }
            }
            function incrIndent(parToken, f) {
                if (indIncrLine == parToken.lineNo) {
                    f();
                }
                else {
                    indIncrLine = parToken.lineNo;
                    var prev = ind;
                    ind += "    ";
                    f();
                    ind = prev;
                }
            }
            function ppStmt(s) {
                var toks = removeIndent(s.tokens);
                if (toks.length == 1 && !toks[0].isCursor && toks[0].text == "") {
                    output += "\n";
                    return;
                }
                output += ind;
                incrIndent(toks[0], function () {
                    ppToks(toks);
                });
                if (output[output.length - 1] != "\n")
                    output += "\n";
            }
            function writeToken(t) {
                if (outpos == -1 && t.pos + t.text.length >= pos) {
                    outpos = output.length + (pos - t.pos);
                }
                output += t.text;
            }
            function ppToks(tokens) {
                tokens = normalizeSpace(tokens);
                var _loop_4 = function(i) {
                    var t = tokens[i];
                    finalFormat(ind, t);
                    writeToken(t);
                    switch (t.kind) {
                        case TokenKind.Tree:
                            var tree_1 = t;
                            incrIndent(t, function () {
                                ppToks(removeIndent(tree_1.children));
                            });
                            if (tree_1.endToken) {
                                writeToken(tree_1.endToken);
                            }
                            break;
                        case TokenKind.Block:
                            var blk = t;
                            if (blk.stmts.length == 0) {
                                output += " ";
                            }
                            else {
                                output += "\n";
                                blk.stmts.forEach(ppStmt);
                                output += ind.slice(4);
                            }
                            if (blk.endToken)
                                writeToken(blk.endToken);
                            else
                                output += "}";
                            break;
                        case TokenKind.NewLine:
                            if (tokens[i + 1] && tokens[i + 1].kind == TokenKind.CommentLine &&
                                tokens[i + 1].text == "" && !tokens[i + 1].isCursor)
                                break; // no indent for empty line
                            if (i == tokens.length - 1)
                                output += ind.slice(4);
                            else
                                output += ind;
                            break;
                        case TokenKind.Whitespace:
                            break;
                    }
                };
                for (var i = 0; i < tokens.length; ++i) {
                    _loop_4(i);
                }
            }
        }
        pxtc.format = format;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        // HEX file documentation at: https://en.wikipedia.org/wiki/Intel_HEX
        /* From above:
        This example shows a file that has four data records followed by an end-of-file record:
    
    :10010000214601360121470136007EFE09D2190140
    :100110002146017E17C20001FF5F16002148011928
    :10012000194E79234623965778239EDA3F01B2CAA7
    :100130003F0156702B5E712B722B732146013421C7
    :00000001FF
    
            A record (line of text) consists of six fields (parts) that appear in order from left to right:
            - Start code, one character, an ASCII colon ':'.
            - Byte count, two hex digits, indicating the number of bytes (hex digit pairs) in the data field.
              The maximum byte count is 255 (0xFF). 16 (0x10) and 32 (0x20) are commonly used byte counts.
            - Address, four hex digits, representing the 16-bit beginning memory address offset of the data.
              The physical address of the data is computed by adding this offset to a previously established
              base address, thus allowing memory addressing beyond the 64 kilobyte limit of 16-bit addresses.
              The base address, which defaults to zero, can be changed by various types of records.
              Base addresses and address offsets are always expressed as big endian values.
            - Record type (see record types below), two hex digits, 00 to 05, defining the meaning of the data field.
            - Data, a sequence of n bytes of data, represented by 2n hex digits. Some records omit this field (n equals zero).
              The meaning and interpretation of data bytes depends on the application.
            - Checksum, two hex digits, a computed value that can be used to verify the record has no errors.
    
        */
        pxtc.vtableShift = 2;
        // TODO should be internal
        var hex;
        (function (hex_1) {
            var funcInfo = {};
            var hex;
            var jmpStartAddr;
            var jmpStartIdx;
            var bytecodePaddingSize;
            var bytecodeStartAddr;
            var elfInfo;
            var bytecodeStartIdx;
            var asmLabels = {};
            hex_1.asmTotalSource = "";
            hex_1.defaultPageSize = 0x400;
            // utility function
            function swapBytes(str) {
                var r = "";
                var i = 0;
                for (; i < str.length; i += 2)
                    r = str[i] + str[i + 1] + r;
                pxtc.assert(i == str.length);
                return r;
            }
            function hexDump(bytes, startOffset) {
                if (startOffset === void 0) { startOffset = 0; }
                function toHex(n, len) {
                    if (len === void 0) { len = 8; }
                    var r = n.toString(16);
                    while (r.length < len)
                        r = "0" + r;
                    return r;
                }
                var r = "";
                for (var i = 0; i < bytes.length; i += 16) {
                    r += toHex(startOffset + i) + ": ";
                    var t = "";
                    for (var j = 0; j < 16; j++) {
                        if ((j & 3) == 0)
                            r += " ";
                        var v = bytes[i + j];
                        if (v == null) {
                            r += "   ";
                            continue;
                        }
                        r += toHex(v, 2) + " ";
                        if (32 <= v && v < 127)
                            t += String.fromCharCode(v);
                        else
                            t += ".";
                    }
                    r += " " + t + "\n";
                }
                return r;
            }
            hex_1.hexDump = hexDump;
            function setupInlineAssembly(opts) {
                asmLabels = {};
                var asmSources = opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".asm"); });
                hex_1.asmTotalSource = "";
                var asmIdx = 0;
                for (var _i = 0, asmSources_1 = asmSources; _i < asmSources_1.length; _i++) {
                    var f = asmSources_1[_i];
                    var src = opts.fileSystem[f];
                    src.replace(/^\s*(\w+):/mg, function (f, lbl) {
                        asmLabels[lbl] = true;
                        return "";
                    });
                    var code = ".section code\n" +
                        "@stackmark func\n" +
                        "@scope user" + asmIdx++ + "\n" +
                        src + "\n" +
                        "@stackempty func\n" +
                        "@scope\n";
                    hex_1.asmTotalSource += code;
                }
            }
            hex_1.setupInlineAssembly = setupInlineAssembly;
            function parseHexBytes(bytes) {
                bytes = bytes.replace(/^[\s:]/, "");
                if (!bytes)
                    return [];
                var m = /^([a-f0-9][a-f0-9])/i.exec(bytes);
                if (m)
                    return [parseInt(m[1], 16)].concat(parseHexBytes(bytes.slice(2)));
                else
                    throw pxtc.oops("bad bytes " + bytes);
            }
            // setup for a particular .hex template file (which corresponds to the C++ source in included packages and the board)
            function flashCodeAlign(opts) {
                return opts.flashCodeAlign || hex_1.defaultPageSize;
            }
            hex_1.flashCodeAlign = flashCodeAlign;
            // some hex files use '02' records instead of '04' record for addresses. go figure.
            function patchSegmentHex(hex) {
                for (var i = 0; i < hex.length; ++i) {
                    // :020000021000EC
                    if (hex[i][8] == '2') {
                        var m = /^:02....02(....)..$/.exec(hex[i]);
                        pxtc.U.assert(!!m);
                        var upaddr = parseInt(m[1], 16) * 16;
                        pxtc.U.assert((upaddr & 0xffff) == 0);
                        hex[i] = hexBytes([0x02, 0x00, 0x00, 0x04, 0x00, upaddr >> 16]);
                    }
                }
            }
            function encodeVTPtr(ptr) {
                var vv = ptr >> pxtc.vtableShift;
                pxtc.assert(vv < 0xffff);
                pxtc.assert(vv << pxtc.vtableShift == ptr);
                return vv;
            }
            hex_1.encodeVTPtr = encodeVTPtr;
            function setupFor(opts, extInfo, hexinfo) {
                if (hex_1.isSetupFor(extInfo))
                    return;
                var funs = extInfo.functions;
                hex_1.currentSetup = extInfo.sha;
                hex_1.currentHexInfo = hexinfo;
                hex = hexinfo.hex;
                patchSegmentHex(hex);
                if (opts.nativeType == pxtc.NATIVE_TYPE_CS) {
                    for (var _i = 0, funs_1 = funs; _i < funs_1.length; _i++) {
                        var inf = funs_1[_i];
                        funcInfo[inf.name] = inf;
                    }
                    return;
                }
                if (hex.length <= 2) {
                    elfInfo = pxt.elf.parse(pxtc.U.fromHex(hex[0]));
                    bytecodeStartIdx = -1;
                    bytecodeStartAddr = elfInfo.imageMemStart;
                    hex_1.bytecodeStartAddrPadded = elfInfo.imageMemStart;
                    bytecodePaddingSize = 0;
                    var jmpIdx = hex[0].indexOf("0108010842424242010801083ed8e98d");
                    if (jmpIdx < 0)
                        pxtc.oops("no jmp table in elf");
                    jmpStartAddr = jmpIdx / 2;
                    jmpStartIdx = -1;
                    var ptrs = hex[0].slice(jmpIdx + 32, jmpIdx + 32 + funs.length * 8 + 16);
                    readPointers(ptrs);
                    checkFuns();
                    return;
                }
                var i = 0;
                var upperAddr = "0000";
                var lastAddr = 0;
                var lastIdx = 0;
                bytecodeStartAddr = 0;
                var hitEnd = function () {
                    if (!bytecodeStartAddr) {
                        var bytes = parseHexBytes(hex[lastIdx]);
                        var missing = (0x10 - ((lastAddr + bytes[0]) & 0xf)) & 0xf;
                        if (missing)
                            if (bytes[2] & 0xf) {
                                var next = lastAddr + bytes[0];
                                var newline = [missing, next >> 8, next & 0xff, 0x00];
                                for (var i_1 = 0; i_1 < missing; ++i_1)
                                    newline.push(0x00);
                                lastIdx++;
                                hex.splice(lastIdx, 0, hexBytes(newline));
                                bytecodeStartAddr = next + missing;
                            }
                            else {
                                if (bytes[0] != 0x10) {
                                    bytes.pop(); // checksum
                                    bytes[0] = 0x10;
                                    while (bytes.length < 20)
                                        bytes.push(0x00);
                                    hex[lastIdx] = hexBytes(bytes);
                                }
                                bytecodeStartAddr = lastAddr + 16;
                            }
                        else {
                            bytecodeStartAddr = lastAddr + bytes[0];
                        }
                        bytecodeStartIdx = lastIdx + 1;
                        var pageSize = flashCodeAlign(opts);
                        hex_1.bytecodeStartAddrPadded = (bytecodeStartAddr & ~(pageSize - 1)) + pageSize;
                        var paddingBytes = hex_1.bytecodeStartAddrPadded - bytecodeStartAddr;
                        pxtc.assert((paddingBytes & 0xf) == 0);
                        bytecodePaddingSize = paddingBytes;
                    }
                };
                for (; i < hex.length; ++i) {
                    var m = /:02000004(....)/.exec(hex[i]);
                    if (m) {
                        upperAddr = m[1];
                    }
                    m = /^:..(....)00/.exec(hex[i]);
                    if (m) {
                        var newAddr = parseInt(upperAddr + m[1], 16);
                        if (newAddr >= 0x3C000)
                            hitEnd();
                        lastIdx = i;
                        lastAddr = newAddr;
                    }
                    if (/^:00000001/.test(hex[i]))
                        hitEnd();
                    // random magic number, which marks the beginning of the array of function pointers in the .hex file
                    // it is defined in pxt-microbit-core
                    m = /^:10....000108010842424242010801083ED8E98D/.exec(hex[i]);
                    if (m) {
                        jmpStartAddr = lastAddr;
                        jmpStartIdx = i;
                    }
                }
                if (!jmpStartAddr)
                    pxtc.oops("No hex start");
                if (!bytecodeStartAddr)
                    pxtc.oops("No hex end");
                funcInfo = {};
                for (var i_2 = jmpStartIdx + 1; i_2 < hex.length; ++i_2) {
                    var m = /^:..(....)00(.{4,})/.exec(hex[i_2]);
                    if (!m)
                        continue;
                    readPointers(m[2]);
                    if (funs.length == 0)
                        break;
                }
                checkFuns();
                return;
                function readPointers(s) {
                    var step = opts.shortPointers ? 4 : 8;
                    while (s.length >= step) {
                        var hexb = s.slice(0, step);
                        var value = parseInt(swapBytes(hexb), 16);
                        s = s.slice(step);
                        var inf = funs.shift();
                        if (!inf)
                            break;
                        funcInfo[inf.name] = inf;
                        if (!value) {
                            pxtc.U.oops("No value for " + inf.name + " / " + hexb);
                        }
                        if (opts.nativeType == pxtc.NATIVE_TYPE_THUMB && !(value & 1)) {
                            pxtc.U.oops("Non-thumb addr for " + inf.name + " / " + hexb);
                        }
                        inf.value = value;
                    }
                }
                function checkFuns() {
                    if (funs.length)
                        pxtc.oops("premature EOF in hex file; missing: " + funs.map(function (f) { return f.name; }).join(", "));
                }
            }
            hex_1.setupFor = setupFor;
            function validateShim(funname, shimName, attrs, hasRet, argIsNumber) {
                if (shimName == "TD_ID" || shimName == "TD_NOOP")
                    return;
                if (pxtc.U.lookup(asmLabels, shimName))
                    return;
                var nm = funname + "(...) (shim=" + shimName + ")";
                var inf = lookupFunc(shimName);
                if (inf) {
                    if (pxtc.target.nativeType == pxtc.NATIVE_TYPE_CS)
                        return;
                    if (!hasRet) {
                        if (inf.argsFmt[0] != "V")
                            pxtc.U.userError("expecting procedure for " + nm);
                    }
                    else {
                        if (inf.argsFmt[0] == "V")
                            pxtc.U.userError("expecting function for " + nm);
                    }
                    for (var i = 0; i < argIsNumber.length; ++i) {
                        var spec = inf.argsFmt[i + 1];
                        if (!spec)
                            pxtc.U.userError("excessive parameters passed to " + nm);
                        if (pxtc.target.taggedInts) {
                            var needNum = spec == "I" || spec == "N" || spec == "F";
                            if (spec == "T") {
                            }
                            else if (needNum && !argIsNumber[i])
                                pxtc.U.userError("expecting number at parameter " + (i + 1) + " of " + nm);
                            else if (!needNum && argIsNumber[i])
                                pxtc.U.userError("expecting non-number at parameter " + (i + 1) + " of " + nm + " / " + inf.argsFmt);
                        }
                    }
                    if (argIsNumber.length != inf.argsFmt.length - 1)
                        pxtc.U.userError("not enough arguments for " + nm + " (got " + argIsNumber.length + "; fmt=" + inf.argsFmt + ")");
                }
                else {
                    pxtc.U.userError("function not found: " + nm);
                }
            }
            hex_1.validateShim = validateShim;
            function lookupFunc(name) {
                return funcInfo[name];
            }
            hex_1.lookupFunc = lookupFunc;
            function lookupFunctionAddr(name) {
                var inf = lookupFunc(name);
                if (inf)
                    return inf.value;
                return null;
            }
            hex_1.lookupFunctionAddr = lookupFunctionAddr;
            function hexTemplateHash() {
                var sha = hex_1.currentSetup ? hex_1.currentSetup.slice(0, 16) : "";
                while (sha.length < 16)
                    sha += "0";
                return sha.toUpperCase();
            }
            hex_1.hexTemplateHash = hexTemplateHash;
            function hexPrelude() {
                return "    .startaddr 0x" + hex_1.bytecodeStartAddrPadded.toString(16) + "\n";
            }
            hex_1.hexPrelude = hexPrelude;
            function hexBytes(bytes) {
                var chk = 0;
                var r = ":";
                bytes.forEach(function (b) { return chk += b; });
                bytes.push((-chk) & 0xff);
                bytes.forEach(function (b) { return r += ("0" + b.toString(16)).slice(-2); });
                return r.toUpperCase();
            }
            function applyPatches(f, binfile) {
                if (binfile === void 0) { binfile = null; }
                // constant strings in the binary are 4-byte aligned, and marked 
                // with "@PXT@:" at the beginning - this 6 byte string needs to be
                // replaced with proper reference count (0xffff to indicate read-only
                // flash location), string virtual table, and the length of the string
                var stringVT = [0xff, 0xff, 0x01, 0x00];
                pxtc.assert(stringVT.length == 4);
                var patchAt = function (b, i, readMore) {
                    // @PXT
                    if (b[i] == 0x40 && b[i + 1] == 0x50 && b[i + 2] == 0x58 && b[i + 3] == 0x54) {
                        var bytes = readMore();
                        // @:
                        if (bytes[4] == 0x40 && bytes[5] == 0x3a) {
                            var len = 0;
                            while (6 + len < bytes.length) {
                                if (bytes[6 + len] == 0)
                                    break;
                                len++;
                            }
                            if (6 + len >= bytes.length)
                                pxtc.U.oops("constant string too long!");
                            return stringVT.concat([len & 0xff, len >> 8]);
                        }
                    }
                    return null;
                };
                if (binfile) {
                    var _loop_5 = function(i) {
                        var patchV = patchAt(binfile, i, function () { return binfile.slice(i, i + 200); });
                        if (patchV)
                            pxtc.U.memcpy(binfile, i, patchV);
                    };
                    for (var i = 0; i < binfile.length - 8; i += 4) {
                        _loop_5(i);
                    }
                }
                else {
                    for (var bidx = 0; bidx < f.blocks.length; ++bidx) {
                        var b = f.blocks[bidx];
                        var upper = f.ptrs[bidx] << 8;
                        var _loop_6 = function(i) {
                            var addr = upper + i - 32;
                            var patchV = patchAt(b, i, function () { return pxtc.UF2.readBytesFromFile(f, addr, 200); });
                            if (patchV)
                                pxtc.UF2.writeBytes(f, addr, patchV);
                        };
                        for (var i = 32; i < 32 + 256; i += 4) {
                            _loop_6(i);
                        }
                    }
                }
            }
            function patchHex(bin, buf, shortForm, useuf2) {
                var myhex = hex.slice(0, bytecodeStartIdx);
                pxtc.assert(buf.length < 64000, "program too large, words: " + buf.length);
                // store the size of the program (in 16 bit words)
                buf[17] = buf.length;
                var zeros = [];
                for (var i = 0; i < bytecodePaddingSize >> 1; ++i)
                    zeros.push(0);
                buf = zeros.concat(buf);
                var ptr = 0;
                function nextLine(buf, addr) {
                    var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0];
                    for (var j = 0; j < 8; ++j) {
                        bytes.push((buf[ptr] || 0) & 0xff);
                        bytes.push((buf[ptr] || 0) >>> 8);
                        ptr++;
                    }
                    return bytes;
                }
                // 0x4209 is the version number matching pxt-microbit-core
                var hd = [0x4209, 0, hex_1.bytecodeStartAddrPadded & 0xffff, hex_1.bytecodeStartAddrPadded >>> 16];
                var tmp = hexTemplateHash();
                for (var i = 0; i < 4; ++i)
                    hd.push(parseInt(swapBytes(tmp.slice(i * 4, i * 4 + 4)), 16));
                var uf2 = useuf2 ? pxtc.UF2.newBlockFile() : null;
                if (elfInfo) {
                    var prog = new Uint8Array(buf.length * 2);
                    for (var i = 0; i < buf.length; ++i) {
                        pxt.HF2.write16(prog, i * 2, buf[i]);
                    }
                    var resbuf = pxt.elf.patch(elfInfo, prog);
                    for (var i = 0; i < hd.length; ++i)
                        pxt.HF2.write16(resbuf, i * 2 + jmpStartAddr, hd[i]);
                    applyPatches(null, resbuf);
                    if (uf2) {
                        pxtc.UF2.writeBytes(uf2, 0, resbuf);
                        return [pxtc.UF2.serializeFile(uf2)];
                    }
                    return [pxtc.U.uint8ArrayToString(resbuf)];
                }
                if (uf2) {
                    pxtc.UF2.writeHex(uf2, myhex);
                    applyPatches(uf2);
                    pxtc.UF2.writeBytes(uf2, jmpStartAddr, nextLine(hd, jmpStartIdx).slice(4));
                    if (bin.checksumBlock) {
                        var bytes = [];
                        for (var _i = 0, _a = bin.checksumBlock; _i < _a.length; _i++) {
                            var w = _a[_i];
                            bytes.push(w & 0xff, w >> 8);
                        }
                        pxtc.UF2.writeBytes(uf2, bin.target.flashChecksumAddr, bytes);
                    }
                }
                else {
                    myhex[jmpStartIdx] = hexBytes(nextLine(hd, jmpStartAddr));
                    if (bin.checksumBlock) {
                        pxtc.U.oops("checksum block in HEX not implemented yet");
                    }
                }
                ptr = 0;
                if (shortForm)
                    myhex = [];
                var addr = bytecodeStartAddr;
                var upper = (addr - 16) >> 16;
                while (ptr < buf.length) {
                    if (uf2) {
                        pxtc.UF2.writeBytes(uf2, addr, nextLine(buf, addr).slice(4));
                    }
                    else {
                        if ((addr >> 16) != upper) {
                            upper = addr >> 16;
                            myhex.push(hexBytes([0x02, 0x00, 0x00, 0x04, upper >> 8, upper & 0xff]));
                        }
                        myhex.push(hexBytes(nextLine(buf, addr)));
                    }
                    addr += 16;
                }
                if (!shortForm) {
                    var app = hex.slice(bytecodeStartIdx);
                    if (uf2)
                        pxtc.UF2.writeHex(uf2, app);
                    else
                        pxtc.Util.pushRange(myhex, app);
                }
                if (uf2)
                    return [pxtc.UF2.serializeFile(uf2)];
                else
                    return myhex;
            }
            hex_1.patchHex = patchHex;
        })(hex = pxtc.hex || (pxtc.hex = {}));
        function asmline(s) {
            if (!/(^[\s;])|(:$)/.test(s))
                s = "    " + s;
            return s + "\n";
        }
        pxtc.asmline = asmline;
        function emitStrings(snippets, bin) {
            for (var _i = 0, _a = Object.keys(bin.strings); _i < _a.length; _i++) {
                var s = _a[_i];
                // string representation of DAL - 0xffff in general for ref-counted objects means it's static and shouldn't be incr/decred
                bin.otherLiterals.push(snippets.string_literal(bin.strings[s], s));
            }
            for (var _b = 0, _c = Object.keys(bin.doubles); _b < _c.length; _b++) {
                var data = _c[_b];
                var lbl = bin.doubles[data];
                bin.otherLiterals.push("\n.balign 4\n" + lbl + ": .short 0xffff, " + pxt.REF_TAG_NUMBER + "\n        .hex " + data + "\n");
            }
            for (var _d = 0, _e = Object.keys(bin.hexlits); _d < _e.length; _d++) {
                var data = _e[_d];
                bin.otherLiterals.push(snippets.hex_literal(bin.hexlits[data], data));
                bin.otherLiterals.push();
            }
        }
        function vtableToAsm(info) {
            var s = "\n        .balign " + (1 << pxtc.vtableShift) + "\n" + info.id + "_VT:\n        .short " + (info.refmask.length * 4 + 4) + "  ; size in bytes\n        .byte " + (info.vtable.length + 2) + ", 0  ; num. methods\n";
            var ptrSz = pxtc.target.shortPointers ? ".short" : ".word";
            var addPtr = function (n) {
                if (n != "0" && (!pxtc.isStackMachine() || n.indexOf("::") >= 0))
                    n += "@fn";
                s += "        " + ptrSz + " " + n + "\n";
            };
            s += "        " + ptrSz + " " + info.id + "_IfaceVT\n";
            addPtr("pxt::RefRecord_destroy");
            addPtr("pxt::RefRecord_print");
            for (var _i = 0, _a = info.vtable; _i < _a.length; _i++) {
                var m = _a[_i];
                addPtr(m.label());
            }
            var refmask = info.refmask.map(function (v) { return v ? "1" : "0"; });
            while (refmask.length < 2 || refmask.length % 2 != 0)
                refmask.push("0");
            s += "        .byte " + refmask.join(",") + "\n";
            // VTable for interface method is just linear. If we ever have lots of interface
            // methods and lots of classes this could become a problem. We could use a table
            // of (iface-member-id, function-addr) pairs and binary search.
            // See https://makecode.microbit.org/15593-01779-41046-40599 for Thumb binary search.
            s += "\n        .balign " + (pxtc.target.shortPointers ? 2 : 4) + "\n" + info.id + "_IfaceVT:\n";
            for (var _b = 0, _c = info.itable; _b < _c.length; _b++) {
                var m = _c[_b];
                addPtr(m ? m.label() : "0");
            }
            s += "\n";
            return s;
        }
        pxtc.vtableToAsm = vtableToAsm;
        function serialize(bin, opts) {
            var asmsource = "; start\n" + hex.hexPrelude() + "        \n    .hex 708E3B92C615A841C49866C975EE5197 ; magic number\n    .hex " + hex.hexTemplateHash() + " ; hex template hash\n    .hex 0000000000000000 ; @SRCHASH@\n    .short " + bin.globalsWords + "   ; num. globals\n    .short 0 ; patched with number of words resulting from assembly\n    .word _pxt_config_data\n    .word 0 ; reserved\n    .word 0 ; reserved\n";
            var snippets = null;
            if (opts.target.nativeType == pxtc.NATIVE_TYPE_AVR)
                snippets = new pxtc.AVRSnippets();
            else
                snippets = new pxtc.ThumbSnippets();
            bin.procs.forEach(function (p) {
                var p2a = new pxtc.ProctoAssembler(snippets, bin, p);
                asmsource += "\n" + p2a.getAssembly() + "\n";
            });
            bin.usedClassInfos.forEach(function (info) {
                asmsource += vtableToAsm(info);
            });
            pxtc.U.iterMap(bin.codeHelpers, function (code, lbl) {
                asmsource += "    .section code\n" + lbl + ":\n" + code + "\n";
            });
            asmsource += snippets.arithmetic();
            asmsource += "\n.balign 4\n_pxt_config_data:\n";
            for (var _i = 0, _a = bin.res.configData || []; _i < _a.length; _i++) {
                var d = _a[_i];
                asmsource += "    .word " + d.key + ", " + d.value + "  ; " + d.name + "=" + d.value + "\n";
            }
            asmsource += "    .word 0\n\n";
            asmsource += hex.asmTotalSource;
            asmsource += "_js_end:\n";
            emitStrings(snippets, bin);
            asmsource += bin.otherLiterals.join("");
            asmsource += "_program_end:\n";
            return asmsource;
        }
        function patchSrcHash(bin, src) {
            var sha = pxtc.U.sha256(src);
            bin.sourceHash = sha;
            return src.replace(/\n.*@SRCHASH@\n/, "\n    .hex " + sha.slice(0, 16).toUpperCase() + " ; program hash\n");
        }
        function processorInlineAssemble(target, src) {
            var b = mkProcessorFile(target);
            b.disablePeepHole = true;
            b.emit(src);
            throwAssemblerErrors(b);
            var res = [];
            for (var i = 0; i < b.buf.length; i += 2) {
                res.push((((b.buf[i + 1] || 0) << 16) | b.buf[i]) >>> 0);
            }
            return res;
        }
        pxtc.processorInlineAssemble = processorInlineAssemble;
        function mkProcessorFile(target) {
            var b;
            if (target.nativeType == pxtc.NATIVE_TYPE_AVR)
                b = new pxtc.assembler.File(new pxtc.avr.AVRProcessor());
            else if (target.nativeType == pxtc.NATIVE_TYPE_AVRVM)
                b = new pxtc.assembler.VMFile(new pxtc.vm.VmProcessor(target));
            else
                b = new pxtc.assembler.File(new pxtc.thumb.ThumbProcessor());
            b.ei.testAssembler(); // just in case
            b.lookupExternalLabel = hex.lookupFunctionAddr;
            b.normalizeExternalLabel = function (s) {
                var inf = hex.lookupFunc(s);
                if (inf)
                    return inf.name;
                return s;
            };
            // b.throwOnError = true;
            return b;
        }
        function throwAssemblerErrors(b) {
            if (b.errors.length > 0) {
                var userErrors_1 = "";
                b.errors.forEach(function (e) {
                    var m = /^user(\d+)/.exec(e.scope);
                    if (m) {
                        // This generally shouldn't happen, but it may for certin kind of global 
                        // errors - jump range and label redefinitions
                        var no = parseInt(m[1]); // TODO lookup assembly file name
                        userErrors_1 += pxtc.U.lf("At inline assembly:\n");
                        userErrors_1 += e.message;
                    }
                });
                if (userErrors_1) {
                    //TODO
                    console.log(pxtc.U.lf("errors in inline assembly"));
                    console.log(userErrors_1);
                    throw new Error(b.errors[0].message);
                }
                else {
                    throw new Error(b.errors[0].message);
                }
            }
        }
        var peepDbg = false;
        function assemble(target, bin, src) {
            var b = mkProcessorFile(target);
            b.emit(src);
            src = b.getSource(!peepDbg, bin.numStmts, target.flashEnd);
            throwAssemblerErrors(b);
            return {
                src: src,
                buf: b.buf,
                thumbFile: b
            };
        }
        pxtc.assemble = assemble;
        function addSource(meta, binstring) {
            var metablob = pxtc.Util.toUTF8(meta);
            var totallen = metablob.length + binstring.length;
            if (totallen > 40000) {
                return "; program too long\n";
            }
            var str = "\n    .balign 16\n    .hex 41140E2FB82FA2BB\n    .short " + metablob.length + "\n    .short " + binstring.length + "\n    .short 0, 0   ; future use\n\n_stored_program: .string \"";
            var addblob = function (b) {
                for (var i = 0; i < b.length; ++i) {
                    var v = b.charCodeAt(i) & 0xff;
                    if (v <= 0xf)
                        str += "\\x0" + v.toString(16);
                    else
                        str += "\\x" + v.toString(16);
                }
            };
            addblob(metablob);
            addblob(binstring);
            str += "\"\n";
            return str;
        }
        function processorEmit(bin, opts, cres) {
            var src = serialize(bin, opts);
            src = patchSrcHash(bin, src);
            if (opts.embedBlob)
                src += addSource(opts.embedMeta, pxtc.decodeBase64(opts.embedBlob));
            var checksumWords = 8;
            var pageSize = hex.flashCodeAlign(opts.target);
            if (opts.target.flashChecksumAddr) {
                var k = 0;
                while (pageSize > (1 << k))
                    k++;
                var endMarker = parseInt(bin.sourceHash.slice(0, 8), 16);
                var progStart = hex.bytecodeStartAddrPadded / pageSize;
                endMarker = (endMarker & 0xffffff00) | k;
                var templBeg = 0;
                var templSize = progStart;
                // we exclude the checksum block from the template
                if (opts.target.flashChecksumAddr < hex.bytecodeStartAddrPadded) {
                    templBeg = Math.ceil((opts.target.flashChecksumAddr + 32) / pageSize);
                    templSize -= templBeg;
                }
                src += "\n    .balign 4\n__end_marker:\n    .word " + endMarker + "\n\n; ------- this will get removed from the final binary ------\n__flash_checksums:\n    .word 0x87eeb07c ; magic\n    .word __end_marker ; end marker position\n    .word " + endMarker + " ; end marker\n    ; template region\n    .short " + templBeg + ", " + templSize + "\n    .word 0x" + hex.hexTemplateHash().slice(0, 8) + "\n    ; user region\n    .short " + progStart + ", 0xffff\n    .word 0x" + bin.sourceHash.slice(0, 8) + "\n    .word 0x0 ; terminator\n";
            }
            bin.writeFile(pxtc.BINARY_ASM, src);
            bin.numStmts = cres.breakpoints.length;
            var res = assemble(opts.target, bin, src);
            if (res.src)
                bin.writeFile(pxtc.BINARY_ASM, res.src);
            if (res.buf) {
                if (opts.target.flashChecksumAddr) {
                    var pos = res.thumbFile.lookupLabel("__flash_checksums") / 2;
                    pxtc.U.assert(pos == res.buf.length - checksumWords * 2);
                    var chk = res.buf.slice(res.buf.length - checksumWords * 2);
                    res.buf.splice(res.buf.length - checksumWords * 2, checksumWords * 2);
                    var len = Math.ceil(res.buf.length * 2 / pageSize);
                    chk[chk.length - 5] = len;
                    bin.checksumBlock = chk;
                }
                if (!pxt.isOutputText(pxtc.target)) {
                    var myhex = btoa(hex.patchHex(bin, res.buf, false, true)[0]);
                    bin.writeFile(pxt.outputName(pxtc.target), myhex);
                }
                else {
                    var myhex = hex.patchHex(bin, res.buf, false, false).join("\r\n") + "\r\n";
                    bin.writeFile(pxt.outputName(pxtc.target), myhex);
                }
            }
            for (var _i = 0, _a = cres.breakpoints; _i < _a.length; _i++) {
                var bkpt = _a[_i];
                var lbl = pxtc.U.lookup(res.thumbFile.getLabels(), "__brkp_" + bkpt.id);
                if (lbl != null)
                    bkpt.binAddr = lbl;
            }
            for (var _b = 0, _c = bin.procs; _b < _c.length; _b++) {
                var proc = _c[_b];
                proc.fillDebugInfo(res.thumbFile);
            }
            cres.procDebugInfo = bin.procs.map(function (p) { return p.debugInfo; });
        }
        pxtc.processorEmit = processorEmit;
        pxtc.validateShim = hex.validateShim;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var reportDiagnostic = reportDiagnosticSimply;
        function reportDiagnostics(diagnostics, host) {
            for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
                var diagnostic = diagnostics_1[_i];
                reportDiagnostic(diagnostic, host);
            }
        }
        function reportDiagnosticSimply(diagnostic, host) {
            var output = "";
            if (diagnostic.file) {
                var _a = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start), line = _a.line, character = _a.character;
                var relativeFileName = diagnostic.file.fileName;
                output += relativeFileName + "(" + (line + 1) + "," + (character + 1) + "): ";
            }
            var category = pxtc.DiagnosticCategory[diagnostic.category].toLowerCase();
            output += category + " TS" + diagnostic.code + ": " + pxtc.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine) + ts.sys.newLine;
            ts.sys.write(output);
        }
        function plainTsc(dir) {
            var commandLine = ts.parseCommandLine([]);
            var configFileName = ts.findConfigFile(dir, ts.sys.fileExists);
            return performCompilation();
            function parseConfigFile() {
                var cachedConfigFileText = ts.sys.readFile(configFileName);
                var result = ts.parseConfigFileTextToJson(configFileName, cachedConfigFileText);
                var configObject = result.config;
                if (!configObject) {
                    reportDiagnostics([result.error], /* compilerHost */ undefined);
                    ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                    return;
                }
                var configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, dir, commandLine.options, configFileName);
                if (configParseResult.errors.length > 0) {
                    reportDiagnostics(configParseResult.errors, /* compilerHost */ undefined);
                    ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
                    return;
                }
                return configParseResult;
            }
            function performCompilation() {
                var configParseResult = parseConfigFile();
                var compilerHost = ts.createCompilerHost(configParseResult.options);
                compilerHost.getDefaultLibFileName = function () { return "node_modules/typescript/lib/lib.d.ts"; };
                return compile(configParseResult.fileNames, configParseResult.options, compilerHost);
            }
        }
        pxtc.plainTsc = plainTsc;
        function compile(fileNames, compilerOptions, compilerHost) {
            var program = ts.createProgram(fileNames, compilerOptions, compilerHost);
            compileProgram();
            return program;
            function compileProgram() {
                var diagnostics = program.getSyntacticDiagnostics();
                if (diagnostics.length === 0) {
                    diagnostics = program.getOptionsDiagnostics().concat(program.getGlobalDiagnostics());
                    if (diagnostics.length === 0) {
                        diagnostics = program.getSemanticDiagnostics();
                    }
                }
                reportDiagnostics(diagnostics, compilerHost);
                //const emitOutput = program.emit();
                //diagnostics = diagnostics.concat(emitOutput.diagnostics);
            }
        }
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../../typings/globals/fusejs/index.d.ts" />
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.placeholderChar = "◊";
        pxtc.defaultImgLit = "\n. . . . .\n. . . . .\n. . # . .\n. . . . .\n. . . . .\n";
        function renderDefaultVal(apis, p, imgLit, cursorMarker) {
            if (p.initializer)
                return p.initializer;
            if (p.default)
                return p.default;
            if (p.type == "number")
                return "0";
            if (p.type == "boolean")
                return "false";
            else if (p.type == "string") {
                if (imgLit) {
                    imgLit = false;
                    return "`" + pxtc.defaultImgLit + cursorMarker + "`";
                }
                return "\"" + cursorMarker + "\"";
            }
            var si = apis ? pxtc.Util.lookup(apis.byQName, p.type) : undefined;
            if (si && si.kind == pxtc.SymbolKind.Enum) {
                var en = pxtc.Util.values(apis.byQName).filter(function (e) { return e.namespace == p.type; })[0];
                if (en)
                    return en.namespace + "." + en.name;
            }
            var m = /^\((.*)\) => (.*)$/.exec(p.type);
            if (m)
                return "(" + m[1] + ") => {\n    " + cursorMarker + "\n}";
            return pxtc.placeholderChar;
        }
        function renderCall(apiInfo, si) {
            return si.namespace + "." + si.name + renderParameters(apiInfo, si) + ";";
        }
        pxtc.renderCall = renderCall;
        function renderParameters(apis, si, cursorMarker) {
            if (cursorMarker === void 0) { cursorMarker = ''; }
            if (si.parameters) {
                var imgLit_1 = !!si.attributes.imageLiteral;
                return "(" + si.parameters
                    .filter(function (p) { return !p.initializer; })
                    .map(function (p) { return renderDefaultVal(apis, p, imgLit_1, cursorMarker); }).join(", ") + ")";
            }
            return '';
        }
        pxtc.renderParameters = renderParameters;
        function getSymbolKind(node) {
            switch (node.kind) {
                case pxtc.SK.MethodDeclaration:
                case pxtc.SK.MethodSignature:
                    return pxtc.SymbolKind.Method;
                case pxtc.SK.PropertyDeclaration:
                case pxtc.SK.PropertySignature:
                    return pxtc.SymbolKind.Property;
                case pxtc.SK.FunctionDeclaration:
                    return pxtc.SymbolKind.Function;
                case pxtc.SK.VariableDeclaration:
                    return pxtc.SymbolKind.Variable;
                case pxtc.SK.ModuleDeclaration:
                    return pxtc.SymbolKind.Module;
                case pxtc.SK.EnumDeclaration:
                    return pxtc.SymbolKind.Enum;
                case pxtc.SK.EnumMember:
                    return pxtc.SymbolKind.EnumMember;
                case pxtc.SK.ClassDeclaration:
                    return pxtc.SymbolKind.Class;
                case pxtc.SK.InterfaceDeclaration:
                    return pxtc.SymbolKind.Interface;
                default:
                    return pxtc.SymbolKind.None;
            }
        }
        function isExported(decl) {
            if (decl.modifiers && decl.modifiers.some(function (m) { return m.kind == pxtc.SK.PrivateKeyword || m.kind == pxtc.SK.ProtectedKeyword; }))
                return false;
            var symbol = decl.symbol;
            if (!symbol)
                return false;
            while (true) {
                var parSymbol = symbol.parent;
                if (parSymbol)
                    symbol = parSymbol;
                else
                    break;
            }
            var topDecl = symbol.valueDeclaration || symbol.declarations[0];
            if (topDecl.kind == pxtc.SK.VariableDeclaration)
                topDecl = topDecl.parent.parent;
            if (topDecl.parent && topDecl.parent.kind == pxtc.SK.SourceFile)
                return true;
            else
                return false;
        }
        function isInKsModule(decl) {
            while (decl) {
                if (decl.kind == pxtc.SK.SourceFile) {
                    var src = decl;
                    return src.fileName.indexOf("pxt_modules") >= 0;
                }
                decl = decl.parent;
            }
            return false;
        }
        function createSymbolInfo(typechecker, qName, stmt) {
            function typeOf(tn, n, stripParams) {
                if (stripParams === void 0) { stripParams = false; }
                var t = typechecker.getTypeAtLocation(n);
                if (!t)
                    return "None";
                if (stripParams) {
                    t = t.getCallSignatures()[0].getReturnType();
                }
                return typechecker.typeToString(t, null, ts.TypeFormatFlags.UseFullyQualifiedType);
            }
            var kind = getSymbolKind(stmt);
            if (kind != pxtc.SymbolKind.None) {
                var decl = stmt;
                var attributes_1 = pxtc.parseComments(decl);
                if (attributes_1.weight < 0)
                    return null;
                var m = /^(.*)\.(.*)/.exec(qName);
                var hasParams = kind == pxtc.SymbolKind.Function || kind == pxtc.SymbolKind.Method;
                var pkg = null;
                var src = ts.getSourceFileOfNode(stmt);
                if (src) {
                    var m_1 = /^pxt_modules\/([^\/]+)/.exec(src.fileName);
                    if (m_1)
                        pkg = m_1[1];
                }
                var extendsTypes = undefined;
                if (kind == pxtc.SymbolKind.Class || kind == pxtc.SymbolKind.Interface) {
                    var cl = stmt;
                    extendsTypes = [];
                    if (cl.heritageClauses)
                        for (var _i = 0, _a = cl.heritageClauses; _i < _a.length; _i++) {
                            var h = _a[_i];
                            if (h.types) {
                                for (var _b = 0, _c = h.types; _b < _c.length; _b++) {
                                    var t = _c[_b];
                                    extendsTypes.push(typeOf(t, t));
                                }
                            }
                        }
                }
                return {
                    kind: kind,
                    namespace: m ? m[1] : "",
                    name: m ? m[2] : qName,
                    attributes: attributes_1,
                    pkg: pkg,
                    extendsTypes: extendsTypes,
                    retType: kind == pxtc.SymbolKind.Module ? "" : typeOf(decl.type, decl, hasParams),
                    parameters: !hasParams ? null : (decl.parameters || []).map(function (p, i) {
                        var n = pxtc.getName(p);
                        var desc = attributes_1.paramHelp[n] || "";
                        var minVal = attributes_1.paramMin && attributes_1.paramMin[n];
                        var maxVal = attributes_1.paramMax && attributes_1.paramMax[n];
                        var m = /\beg\.?:\s*(.+)/.exec(desc);
                        var props;
                        var parameters;
                        if (p.type && p.type.kind === pxtc.SK.FunctionType) {
                            var callBackSignature = typechecker.getSignatureFromDeclaration(p.type);
                            var callbackParameters_1 = callBackSignature.getParameters();
                            if (attributes_1.mutate === "objectdestructuring") {
                                pxtc.assert(callbackParameters_1.length > 0);
                                props = typechecker.getTypeAtLocation(callbackParameters_1[0].valueDeclaration).getProperties().map(function (prop) {
                                    return { name: prop.getName(), type: typechecker.typeToString(typechecker.getTypeOfSymbolAtLocation(prop, callbackParameters_1[0].valueDeclaration)) };
                                });
                            }
                            else {
                                parameters = callbackParameters_1.map(function (sym, i) {
                                    return {
                                        name: sym.getName(),
                                        type: typechecker.typeToString(typechecker.getTypeOfSymbolAtLocation(sym, p))
                                    };
                                });
                            }
                        }
                        var options = {};
                        var paramType = typechecker.getTypeAtLocation(p);
                        var isEnum = paramType && !!(paramType.flags & ts.TypeFlags.Enum);
                        if (attributes_1.block && attributes_1.paramShadowOptions) {
                            var argNames_1 = [];
                            attributes_1.block.replace(/%(\w+)/g, function (f, n) {
                                argNames_1.push(n);
                                return "";
                            });
                            if (attributes_1.paramShadowOptions[argNames_1[i]]) {
                                options['fieldEditorOptions'] = { value: attributes_1.paramShadowOptions[argNames_1[i]] };
                            }
                        }
                        if (minVal)
                            options['min'] = { value: minVal };
                        if (maxVal)
                            options['max'] = { value: maxVal };
                        return {
                            name: n,
                            description: desc,
                            type: typeOf(p.type, p),
                            initializer: p.initializer ? p.initializer.getText() : attributes_1.paramDefl[n],
                            default: attributes_1.paramDefl[n],
                            properties: props,
                            handlerParameters: parameters,
                            options: options,
                            isEnum: isEnum
                        };
                    }),
                    snippet: pxtc.service.getSnippet(decl, attributes_1)
                };
            }
            return null;
        }
        function genDocs(pkg, apiInfo, options) {
            if (options === void 0) { options = {}; }
            pxt.debug("generating docs for " + pkg);
            pxt.debug(JSON.stringify(Object.keys(apiInfo.byQName), null, 2));
            var files = {};
            var infos = pxtc.Util.values(apiInfo.byQName);
            var enumMembers = infos.filter(function (si) { return si.kind == pxtc.SymbolKind.EnumMember; }).sort(compareSymbol);
            var locStrings = {};
            var jsdocStrings = {};
            var nameToFilename = function (n) { return n.replace(/([A-Z])/g, function (m) { return '-' + m.toLowerCase(); }); };
            var writeLoc = function (si) {
                if (!options.locs || !si.qName) {
                    return;
                }
                if (si.attributes.deprecated || /^__/.test(si.name))
                    return; // skip deprecated or function starting with __
                pxt.debug("loc: " + si.qName);
                // must match blockly loader
                if (si.kind != pxtc.SymbolKind.EnumMember) {
                    var ns = ts.pxtc.blocksCategory(si);
                    if (ns)
                        locStrings[("{id:category}" + ns)] = ns;
                }
                if (si.attributes.jsDoc)
                    jsdocStrings[si.qName] = si.attributes.jsDoc;
                if (si.attributes.block)
                    locStrings[(si.qName + "|block")] = si.attributes.block;
                if (si.attributes.group)
                    locStrings[("{id:group}" + si.attributes.group)] = si.attributes.group;
                if (si.parameters)
                    si.parameters.filter(function (pi) { return !!pi.description; }).forEach(function (pi) {
                        jsdocStrings[(si.qName + "|param|" + pi.name)] = pi.description;
                    });
            };
            var mapLocs = function (m, name) {
                if (!options.locs)
                    return;
                var locs = {};
                Object.keys(m).sort().forEach(function (l) { return locs[l] = m[l]; });
                files[pkg + name + "-strings.json"] = JSON.stringify(locs, null, 2);
            };
            var _loop_7 = function(info) {
                var isNamespace = info.kind == pxtc.SymbolKind.Module;
                if (isNamespace) {
                    if (!infos.filter(function (si) { return si.namespace == info.name && !!si.attributes.jsDoc; })[0])
                        return "continue"; // nothing in namespace
                    if (!info.attributes.block)
                        info.attributes.block = info.name; // reusing this field to store localized namespace name
                }
                writeLoc(info);
            };
            for (var _i = 0, infos_1 = infos; _i < infos_1.length; _i++) {
                var info = infos_1[_i];
                var state_7 = _loop_7(info);
                if (state_7 === "continue") continue;
            }
            if (options.locs)
                enumMembers.forEach(function (em) {
                    if (em.attributes.block)
                        locStrings[(em.qName + "|block")] = em.attributes.block;
                    if (em.attributes.jsDoc)
                        locStrings[em.qName] = em.attributes.jsDoc;
                });
            mapLocs(locStrings, "");
            mapLocs(jsdocStrings, "-jsdoc");
            return files;
            function hasBlock(sym) {
                return !!sym.attributes.block && !!sym.attributes.blockId;
            }
            function capitalize(name) {
                return name[0].toUpperCase() + name.slice(1);
            }
            function compareSymbol(l, r) {
                var c = -(hasBlock(l) ? 1 : -1) + (hasBlock(r) ? 1 : -1);
                if (c)
                    return c;
                c = -(l.attributes.weight || 50) + (r.attributes.weight || 50);
                if (c)
                    return c;
                return pxtc.U.strcmp(l.name, r.name);
            }
        }
        pxtc.genDocs = genDocs;
        function getApiInfo(opts, program, legacyOnly) {
            if (legacyOnly === void 0) { legacyOnly = false; }
            var res = {
                byQName: {}
            };
            var typechecker = program.getTypeChecker();
            var collectDecls = function (stmt) {
                if (stmt.kind == pxtc.SK.VariableStatement) {
                    var vs = stmt;
                    vs.declarationList.declarations.forEach(collectDecls);
                    return;
                }
                // if (!isExported(stmt as Declaration)) return; ?
                if (isExported(stmt)) {
                    if (!stmt.symbol) {
                        console.warn("no symbol", stmt);
                        return;
                    }
                    var qName = getFullName(typechecker, stmt.symbol);
                    var si_1 = createSymbolInfo(typechecker, qName, stmt);
                    if (si_1) {
                        var existing = pxtc.U.lookup(res.byQName, qName);
                        if (existing) {
                            si_1.attributes = pxtc.parseCommentString(existing.attributes._source + "\n" +
                                si_1.attributes._source);
                            if (existing.extendsTypes) {
                                si_1.extendsTypes = si_1.extendsTypes || [];
                                existing.extendsTypes.forEach(function (t) {
                                    if (si_1.extendsTypes.indexOf(t) === -1) {
                                        si_1.extendsTypes.push(t);
                                    }
                                });
                            }
                        }
                        res.byQName[qName] = si_1;
                    }
                }
                if (stmt.kind == pxtc.SK.ModuleDeclaration) {
                    var mod = stmt;
                    if (mod.body.kind == pxtc.SK.ModuleBlock) {
                        var blk = mod.body;
                        blk.statements.forEach(collectDecls);
                    }
                }
                else if (stmt.kind == pxtc.SK.InterfaceDeclaration) {
                    var iface = stmt;
                    iface.members.forEach(collectDecls);
                }
                else if (stmt.kind == pxtc.SK.ClassDeclaration) {
                    var iface = stmt;
                    iface.members.forEach(collectDecls);
                }
                else if (stmt.kind == pxtc.SK.EnumDeclaration) {
                    var e = stmt;
                    e.members.forEach(collectDecls);
                }
            };
            for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
                var srcFile = _a[_i];
                srcFile.statements.forEach(collectDecls);
            }
            var toclose = [];
            // store qName in symbols
            for (var qName in res.byQName) {
                var si = res.byQName[qName];
                si.qName = qName;
                si.attributes._source = null;
                if (si.extendsTypes && si.extendsTypes.length)
                    toclose.push(si);
                var jrname = si.attributes.jres;
                if (jrname) {
                    if (jrname == "true")
                        jrname = qName;
                    var jr = pxtc.U.lookup(opts.jres || {}, jrname);
                    if (jr && jr.icon && !si.attributes.iconURL) {
                        si.attributes.iconURL = jr.icon;
                    }
                    if (jr && jr.data && !si.attributes.jresURL) {
                        si.attributes.jresURL = "data:" + jr.mimeType + ";base64," + jr.data;
                    }
                }
            }
            // transitive closure of inheritance
            var closed = {};
            var closeSi = function (si) {
                if (pxtc.U.lookup(closed, si.qName))
                    return;
                closed[si.qName] = true;
                var mine = {};
                mine[si.qName] = true;
                for (var _i = 0, _a = si.extendsTypes || []; _i < _a.length; _i++) {
                    var e = _a[_i];
                    mine[e] = true;
                    var psi = res.byQName[e];
                    if (psi) {
                        closeSi(psi);
                        for (var _b = 0, _c = psi.extendsTypes; _b < _c.length; _b++) {
                            var ee = _c[_b];
                            mine[ee] = true;
                        }
                    }
                }
                si.extendsTypes = Object.keys(mine);
            };
            toclose.forEach(closeSi);
            if (legacyOnly) {
                // conflicts with pins.map()
                delete res.byQName["Array.map"];
            }
            return res;
        }
        pxtc.getApiInfo = getApiInfo;
        function getFullName(typechecker, symbol) {
            return typechecker.getFullyQualifiedName(symbol);
        }
        pxtc.getFullName = getFullName;
        function fillCompletionEntries(program, symbols, r, apiInfo) {
            var typechecker = program.getTypeChecker();
            for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
                var s = symbols_1[_i];
                var qName = getFullName(typechecker, s);
                if (!r.isMemberCompletion && pxtc.Util.lookup(apiInfo.byQName, qName))
                    continue; // global symbol
                if (pxtc.Util.lookup(r.entries, qName))
                    continue;
                var decl = s.valueDeclaration || (s.declarations || [])[0];
                if (!decl)
                    continue;
                var si = createSymbolInfo(typechecker, qName, decl);
                if (!si)
                    continue;
                si.isContextual = true;
                //let tmp = ts.getLocalSymbolForExportDefault(s)
                //let name = typechecker.symbolToString(tmp || s)
                r.entries[qName] = si;
            }
        }
        pxtc.fillCompletionEntries = fillCompletionEntries;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var service;
        (function (service_1) {
            var emptyOptions = {
                fileSystem: {},
                sourceFiles: [],
                target: { isNative: false, hasHex: false },
                hexinfo: null
            };
            var Host = (function () {
                function Host() {
                    this.opts = emptyOptions;
                    this.fileVersions = {};
                    this.projectVer = 0;
                }
                Host.prototype.getProjectVersion = function () {
                    return this.projectVer + "";
                };
                Host.prototype.setFile = function (fn, cont) {
                    if (this.opts.fileSystem[fn] != cont) {
                        this.fileVersions[fn] = (this.fileVersions[fn] || 0) + 1;
                        this.opts.fileSystem[fn] = cont;
                        this.projectVer++;
                    }
                };
                Host.prototype.setOpts = function (o) {
                    var _this = this;
                    pxtc.Util.iterMap(o.fileSystem, function (fn, v) {
                        if (_this.opts.fileSystem[fn] != v) {
                            _this.fileVersions[fn] = (_this.fileVersions[fn] || 0) + 1;
                        }
                    });
                    this.opts = o;
                    this.projectVer++;
                };
                Host.prototype.getCompilationSettings = function () {
                    return pxtc.getTsCompilerOptions(this.opts);
                };
                Host.prototype.getScriptFileNames = function () {
                    return this.opts.sourceFiles.filter(function (f) { return pxtc.U.endsWith(f, ".ts"); });
                };
                Host.prototype.getScriptVersion = function (fileName) {
                    return (this.fileVersions[fileName] || 0).toString();
                };
                Host.prototype.getScriptSnapshot = function (fileName) {
                    var f = this.opts.fileSystem[fileName];
                    if (f)
                        return ts.ScriptSnapshot.fromString(f);
                    else
                        return null;
                };
                Host.prototype.getNewLine = function () { return "\n"; };
                Host.prototype.getCurrentDirectory = function () { return "."; };
                Host.prototype.getDefaultLibFileName = function (options) { return "no-default-lib.d.ts"; };
                Host.prototype.log = function (s) { console.log("LOG", s); };
                Host.prototype.trace = function (s) { console.log("TRACE", s); };
                Host.prototype.error = function (s) { console.error("ERROR", s); };
                Host.prototype.useCaseSensitiveFileNames = function () { return true; };
                return Host;
            }());
            var service;
            var host;
            var lastApiInfo;
            var lastBlocksInfo;
            var lastLocBlocksInfo;
            var lastFuse;
            var builtinItems;
            var blockDefinitions;
            var tbSubset;
            function fileDiags(fn) {
                if (!/\.ts$/.test(fn))
                    return [];
                var d = service.getSyntacticDiagnostics(fn);
                if (!d || !d.length)
                    d = service.getSemanticDiagnostics(fn);
                if (!d)
                    d = [];
                return d;
            }
            var blocksInfoOp = function (apisInfoLocOverride) {
                if (apisInfoLocOverride) {
                    if (!lastLocBlocksInfo) {
                        lastLocBlocksInfo = pxtc.getBlocksInfo(apisInfoLocOverride);
                    }
                    return lastLocBlocksInfo;
                }
                else {
                    if (!lastBlocksInfo) {
                        lastBlocksInfo = pxtc.getBlocksInfo(lastApiInfo);
                    }
                    return lastBlocksInfo;
                }
            };
            var operations = {
                reset: function () {
                    service.cleanupSemanticCache();
                    host.setOpts(emptyOptions);
                },
                setOptions: function (v) {
                    host.setOpts(v.options);
                },
                getCompletions: function (v) {
                    if (v.fileContent) {
                        host.setFile(v.fileName, v.fileContent);
                    }
                    var program = service.getProgram(); // this synchornizes host data as well
                    var data = service.getCompletionData(v.fileName, v.position);
                    if (!data)
                        return {};
                    var typechecker = program.getTypeChecker();
                    var r = {
                        entries: {},
                        isMemberCompletion: data.isMemberCompletion,
                        isNewIdentifierLocation: data.isNewIdentifierLocation,
                        isTypeLocation: false // TODO
                    };
                    pxtc.fillCompletionEntries(program, data.symbols, r, lastApiInfo);
                    return r;
                },
                compile: function (v) {
                    return pxtc.compile(v.options);
                },
                decompile: function (v) {
                    return pxtc.decompile(v.options, v.fileName);
                },
                compileTd: function (v) {
                    var res = pxtc.compile(v.options);
                    return pxtc.getApiInfo(host.opts, res.ast, true);
                },
                assemble: function (v) {
                    return {
                        words: pxtc.processorInlineAssemble(host.opts.target, v.fileContent)
                    };
                },
                fileDiags: function (v) { return pxtc.patchUpDiagnostics(fileDiags(v.fileName)); },
                allDiags: function () {
                    var global = service.getCompilerOptionsDiagnostics() || [];
                    var byFile = host.getScriptFileNames().map(fileDiags);
                    var allD = global.concat(pxtc.Util.concat(byFile));
                    if (allD.length == 0) {
                        var res = {
                            outfiles: {},
                            diagnostics: [],
                            success: true,
                            times: {}
                        };
                        var binOutput = pxtc.compileBinary(service.getProgram(), null, host.opts, res);
                        allD = binOutput.diagnostics;
                    }
                    return pxtc.patchUpDiagnostics(allD);
                },
                format: function (v) {
                    var formatOptions = v.format;
                    return pxtc.format(formatOptions.input, formatOptions.pos);
                },
                apiInfo: function () {
                    lastBlocksInfo = undefined;
                    lastFuse = undefined;
                    return lastApiInfo = pxtc.getApiInfo(host.opts, service.getProgram());
                },
                blocksInfo: blocksInfoOp,
                apiSearch: function (v) {
                    var SEARCH_RESULT_COUNT = 7;
                    var search = v.search;
                    var blockInfo = blocksInfoOp(search.localizedApis); // cache
                    if (search.localizedStrings) {
                        pxt.Util.setLocalizedStrings(search.localizedStrings);
                    }
                    // Computes the preferred tooltip or block text to use for search (used for blocks that have multiple tooltips or block texts)
                    var computeSearchProperty = function (tooltipOrBlock, preferredSearch, blockDef) {
                        if (!tooltipOrBlock) {
                            return;
                        }
                        if (typeof tooltipOrBlock === "string") {
                            // There is only one tooltip or block text; use it
                            return tooltipOrBlock;
                        }
                        if (preferredSearch) {
                            // The block definition specifies a preferred tooltip / block text to use for search; use it
                            return tooltipOrBlock[preferredSearch];
                        }
                        // The block definition does not specify which tooltip or block text to use for search; join all values with a space
                        return Object.keys(tooltipOrBlock).map(function (k) { return tooltipOrBlock[k]; }).join(" ");
                    };
                    if (!builtinItems) {
                        builtinItems = [];
                        blockDefinitions = pxt.blocks.blockDefinitions();
                        var _loop_8 = function(id) {
                            var blockDef = blockDefinitions[id];
                            if (blockDef.operators) {
                                var _loop_9 = function(op) {
                                    var opValues = blockDef.operators[op];
                                    opValues.forEach(function (v) { return builtinItems.push({
                                        id: id,
                                        name: blockDef.name,
                                        jsdoc: typeof blockDef.tooltip === "string" ? blockDef.tooltip : blockDef.tooltip[v],
                                        block: v,
                                        field: [op, v]
                                    }); });
                                };
                                for (var op in blockDef.operators) {
                                    _loop_9(op);
                                }
                            }
                            else {
                                builtinItems.push({
                                    id: id,
                                    name: blockDef.name,
                                    jsdoc: computeSearchProperty(blockDef.tooltip, blockDef.tooltipSearch, blockDef),
                                    block: computeSearchProperty(blockDef.block, blockDef.blockTextSearch, blockDef)
                                });
                            }
                        };
                        for (var id in blockDefinitions) {
                            _loop_8(id);
                        }
                    }
                    var subset;
                    var fnweight = function (fn) {
                        var fnw = fn.attributes.weight || 50;
                        var nsInfo = blockInfo.apis.byQName[fn.namespace];
                        var nsw = nsInfo ? (nsInfo.attributes.weight || 50) : 50;
                        var ad = (nsInfo ? nsInfo.attributes.advanced : false) || fn.attributes.advanced;
                        var weight = (nsw * 1000 + fnw) * (ad ? 1 : 1e6);
                        return weight;
                    };
                    if (!lastFuse || search.subset) {
                        var weights_1 = {};
                        var builtinSearchSet = void 0;
                        if (search.subset) {
                            tbSubset = search.subset;
                            builtinSearchSet = builtinItems.filter(function (s) { return tbSubset[s.id]; });
                        }
                        if (tbSubset) {
                            subset = blockInfo.blocks.filter(function (s) { return tbSubset[s.attributes.blockId]; });
                        }
                        else {
                            subset = blockInfo.blocks;
                            builtinSearchSet = builtinItems;
                        }
                        var searchSet = subset.map(function (s) {
                            return {
                                id: s.attributes.blockId,
                                qName: s.qName,
                                name: s.name,
                                nameSpace: s.namespace,
                                block: s.attributes.block,
                                jsDoc: s.attributes.jsDoc
                            };
                        });
                        var mw_1 = 0;
                        subset.forEach(function (b) {
                            var w = weights_1[b.qName] = fnweight(b);
                            mw_1 = Math.max(mw_1, w);
                        });
                        searchSet = searchSet.concat(builtinSearchSet);
                        var fuseOptions = {
                            shouldSort: true,
                            threshold: 0.6,
                            location: 0,
                            distance: 100,
                            maxPatternLength: 16,
                            minMatchCharLength: 2,
                            findAllMatches: false,
                            caseSensitive: false,
                            keys: [
                                { name: 'name', weight: 0.3125 },
                                { name: 'namespace', weight: 0.1875 },
                                { name: 'block', weight: 0.4375 },
                                { name: 'jsDoc', weight: 0.0625 }
                            ],
                            sortFn: function (a, b) {
                                var wa = a.qName ? 1 - weights_1[a.item.qName] / mw_1 : 1;
                                var wb = b.qName ? 1 - weights_1[b.item.qName] / mw_1 : 1;
                                // allow 10% wiggle room for weights
                                return a.score * (1 + wa / 10) - b.score * (1 + wb / 10);
                            }
                        };
                        lastFuse = new Fuse(searchSet, fuseOptions);
                    }
                    var fns = lastFuse.search(search.term);
                    return fns.slice(0, SEARCH_RESULT_COUNT);
                }
            };
            function performOperation(op, arg) {
                init();
                var res = null;
                if (operations.hasOwnProperty(op)) {
                    try {
                        res = operations[op](arg) || {};
                    }
                    catch (e) {
                        res = {
                            errorMessage: e.stack
                        };
                    }
                }
                else {
                    res = {
                        errorMessage: "No such operation: " + op
                    };
                }
                return res;
            }
            service_1.performOperation = performOperation;
            function init() {
                if (!service) {
                    host = new Host();
                    service = ts.createLanguageService(host);
                }
            }
            var defaultImgLit = "`\n. . . . .\n. . . . .\n. . # . .\n. . . . .\n. . . . .\n`";
            function getSnippet(n, attrs) {
                if (!ts.isFunctionLike(n)) {
                    return undefined;
                }
                var checker = service ? service.getProgram().getTypeChecker() : undefined;
                var args = n.parameters ? n.parameters.filter(function (param) { return !param.initializer && !param.questionToken; }).map(function (param) {
                    var typeNode = param.type;
                    if (!typeNode)
                        return "null";
                    var name = param.name.kind === pxtc.SK.Identifier ? param.name.text : undefined;
                    if (attrs && attrs.paramDefl && attrs.paramDefl[name]) {
                        if (typeNode.kind == pxtc.SK.StringKeyword) {
                            var defaultName = attrs.paramDefl[name];
                            return typeNode.kind == pxtc.SK.StringKeyword && defaultName.indexOf("\"") != 0 ? "\"" + defaultName + "\"" : defaultName;
                        }
                        return attrs.paramDefl[name];
                    }
                    switch (typeNode.kind) {
                        case pxtc.SK.StringKeyword: return (name == "leds" ? defaultImgLit : "\"\"");
                        case pxtc.SK.NumberKeyword: return "0";
                        case pxtc.SK.BooleanKeyword: return "false";
                        case pxtc.SK.ArrayType: return "[]";
                        case pxtc.SK.TypeReference:
                            if (checker) {
                                var type_1 = checker.getTypeAtLocation(param);
                                if (type_1) {
                                    if (type_1.flags & ts.TypeFlags.Enum) {
                                        if (type_1.symbol) {
                                            var decl = type_1.symbol.valueDeclaration;
                                            if (decl.members.length && decl.members[0].name.kind === pxtc.SK.Identifier) {
                                                return type_1.symbol.name + "." + decl.members[0].name.text;
                                            }
                                        }
                                        return "0";
                                    }
                                    else if (type_1.flags & ts.TypeFlags.Number) {
                                        return "0";
                                    }
                                }
                            }
                            break;
                        case pxtc.SK.FunctionType:
                            var tn = typeNode;
                            var functionSignature = checker ? checker.getSignatureFromDeclaration(tn) : undefined;
                            if (functionSignature) {
                                return getFunctionString(functionSignature);
                            }
                            return "function () {}";
                    }
                    var type = checker ? checker.getTypeAtLocation(param) : undefined;
                    if (type) {
                        if (type.flags & ts.TypeFlags.Anonymous) {
                            var sigs = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
                            if (sigs.length) {
                                return getFunctionString(sigs[0]);
                            }
                            return "function () {}";
                        }
                    }
                    return "null";
                }) : [];
                return n.name.getText() + "(" + args.join(', ') + ")";
                function getFunctionString(functionSignature) {
                    var functionArgument = "()";
                    var returnValue = "";
                    var displayParts = ts.mapToDisplayParts(function (writer) {
                        checker.getSymbolDisplayBuilder().buildSignatureDisplay(functionSignature, writer);
                    });
                    var returnType = checker.getReturnTypeOfSignature(functionSignature);
                    if (returnType.flags & ts.TypeFlags.NumberLike)
                        returnValue = "return 0;";
                    else if (returnType.flags & ts.TypeFlags.StringLike)
                        returnValue = "return \"\";";
                    else if (returnType.flags & ts.TypeFlags.Boolean)
                        returnValue = "return false;";
                    var displayPartsStr = ts.displayPartsToString(displayParts);
                    functionArgument = displayPartsStr.substr(0, displayPartsStr.lastIndexOf(":"));
                    return "function " + functionArgument + " {\n    " + returnValue + "\n}";
                }
            }
            service_1.getSnippet = getSnippet;
        })(service = pxtc.service || (pxtc.service = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var vm;
        (function (vm) {
            var emitErr = pxtc.assembler.emitErr;
            var badNameError = emitErr("opcode name doesn't match", "<name>");
            var VmInstruction = (function (_super) {
                __extends(VmInstruction, _super);
                function VmInstruction(ei, format, opcode) {
                    _super.call(this, ei, format, opcode, opcode, false);
                }
                VmInstruction.prototype.emit = function (ln) {
                    var tokens = ln.words;
                    if (tokens[0] != this.name)
                        return badNameError;
                    var opcode = this.opcode;
                    var j = 1;
                    var stack = 0;
                    var numArgs = [];
                    var labelName = null;
                    var opcode2 = null;
                    var opcode3 = null;
                    for (var i = 0; i < this.args.length; ++i) {
                        var formal = this.args[i];
                        var actual = tokens[j++];
                        if (formal[0] == "$") {
                            var enc = this.ei.encoders[formal];
                            var v = null;
                            if (enc.isImmediate) {
                                if (!actual)
                                    return emitErr("expecting number", actual);
                                actual = actual.replace(/^#/, "");
                                v = ln.bin.parseOneInt(actual);
                                if (v == null)
                                    return emitErr("expecting number", actual);
                            }
                            else {
                                pxtc.oops();
                            }
                            if (v == null)
                                return emitErr("didn't understand it", actual);
                            numArgs.push(v);
                            v = enc.encode(v);
                            if (v == null)
                                return emitErr("argument out of range or mis-aligned", actual);
                            if (formal == "$i1") {
                                pxtc.assert(0 <= v && v <= 255);
                                opcode2 = v;
                            }
                            else if (formal == "$i2") {
                                opcode2 = v & 0xff;
                                opcode3 = (v >> 8) & 0xff;
                            }
                            else {
                                pxtc.oops();
                            }
                        }
                        else if (formal == actual) {
                        }
                        else {
                            return emitErr("expecting " + formal, actual);
                        }
                    }
                    if (tokens[j])
                        return emitErr("trailing tokens", tokens[j]);
                    if (this.name == "call") {
                        opcode += numArgs[0];
                    }
                    return {
                        stack: stack,
                        opcode: opcode,
                        opcode2: opcode2,
                        opcode3: opcode3,
                        numArgs: numArgs,
                        labelName: ln.bin.normalizeExternalLabel(labelName)
                    };
                };
                return VmInstruction;
            }(pxtc.assembler.Instruction));
            vm.VmInstruction = VmInstruction;
            var VmProcessor = (function (_super) {
                __extends(VmProcessor, _super);
                function VmProcessor(target) {
                    var _this = this;
                    _super.call(this);
                    this.addEnc("$i1", "#0-255", function (v) { return _this.inrange(255, v, v); });
                    this.addEnc("$i2", "#0-65535", function (v) { return _this.inrange(65535, v, v); });
                    pxtc.U.iterMap(target.vmOpCodes, function (opnamefull, opcode) {
                        var m = /(.*)_(\d+)/.exec(opnamefull);
                        var fmt = "";
                        if (m[1] == "call")
                            fmt = "call $i1, $i2";
                        else if (m[2] == "0")
                            fmt = m[1];
                        else if (m[2] == "1")
                            fmt = m[1] + " $i1";
                        else if (m[2] == "2")
                            fmt = m[1] + " $i2";
                        else
                            pxtc.oops();
                        var ins = new VmInstruction(_this, fmt, opcode);
                        if (!_this.instructions.hasOwnProperty(ins.name))
                            _this.instructions[ins.name] = [];
                        _this.instructions[ins.name].push(ins);
                    });
                }
                VmProcessor.prototype.testAssembler = function () {
                };
                VmProcessor.prototype.postProcessRelAddress = function (f, v) {
                    return v + f.baseOffset;
                };
                // absolute addresses come in divide by two
                VmProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    return v;
                };
                VmProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    // lookup absolute, relative, dependeing
                    var l = f.lookupLabel(s);
                    if (l == null)
                        return null;
                    if (i.is32bit)
                        // absolute address
                        return l;
                    // relative address
                    return l - (f.pc() + 2);
                };
                VmProcessor.prototype.toFnPtr = function (v, baseOff) {
                    return v;
                };
                VmProcessor.prototype.wordSize = function () {
                    return 2;
                };
                VmProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    var lnop = ln.getOp();
                    var lnop2 = "";
                    if (lnNext) {
                        lnop2 = lnNext.getOp();
                        var key = lnop + ";" + lnop2;
                        var pc = this.file.peepCounts;
                        pc[key] = (pc[key] || 0) + 1;
                    }
                    if (lnop == "jmp" && ln.numArgs[0] == this.file.baseOffset + lnNext.location) {
                        // RULE: jmp .somewhere; .somewhere: -> .somewhere:
                        ln.update("");
                    }
                    else if (lnop == "push" && (lnop2 == "callproc" || lnop2 == "ldconst" ||
                        lnop2 == "stringlit" || lnop2 == "ldtmp")) {
                        ln.update("");
                        lnNext.update("push_" + lnop2 + " " + lnNext.words[1]);
                    }
                    else if (lnop == "push" && (lnop2 == "ldzero" || lnop2 == "ldone")) {
                        ln.update("");
                        lnNext.update("push_" + lnop2);
                    }
                    else if (lnop == "ldtmp" && (lnop2 == "incr" || lnop2 == "decr")) {
                        ln.update("ldtmp_" + lnop2 + " " + ln.words[1]);
                        lnNext.update("");
                    }
                };
                return VmProcessor;
            }(pxtc.assembler.AbstractProcessor));
            vm.VmProcessor = VmProcessor;
        })(vm = pxtc.vm || (pxtc.vm = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
