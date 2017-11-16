/// <reference path="../../built/pxtlib.d.ts"/>
/// <reference path="../../built/pxtcompiler.d.ts"/>
importScripts("/pxt-holidays/typescript.js", "/pxt-holidays/fuse.min.js", "/pxt-holidays/pxtlib.js", "/pxt-holidays/pxtcompiler.js");
var pm = postMessage;
// work around safari not providing atob
if (typeof atob === "undefined") {
    // http://www.rise4fun.com/Bek/base64encode
    pxtc.decodeBase64 = function (_input) {
        function _base64(_x) { return ((_x <= 0x19) ? (_x + 0x41) : ((_x <= 0x33) ? (_x + 0x47) : ((_x <= 0x3D) ? (_x - 0x4) : ((_x == 0x3E) ? 0x2B : 0x2F)))); }
        ;
        var result = new Array();
        var _q = 0x0;
        var _r = 0x0;
        for (var _i = 0; _i < _input.length; _i++) {
            var _x = _input.charCodeAt(_i);
            if ((_x > 0xFF)) {
                //throw { name: 'InvalidCharacter' };
                return undefined;
            }
            else if ((_q == 0x0)) {
                result.push(String.fromCharCode(_base64((_x >> 0x2))));
                _q = 0x1;
                _r = ((_x & 0x3) << 0x4);
            }
            else if ((_q == 0x1)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x4)))));
                _q = 0x2;
                _r = ((_x & 0xF) << 0x2);
            }
            else if ((_q == 0x2)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x6))), _base64((_x & 0x3F))));
                _q = 0x0;
                _r = 0x0;
            }
        }
        if ((_q == 0x1)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D, 0x3D));
        }
        else if ((_q == 0x2)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D));
        }
        return result.join('');
    };
}
// Polyfill for Uint8Array.slice for IE and Safari
// https://tc39.github.io/ecma262/#sec-%typedarray%.prototype.slice
if (!Uint8Array.prototype.slice) {
    Object.defineProperty(Uint8Array.prototype, 'slice', {
        value: Array.prototype.slice,
        writable: true,
        enumerable: true
    });
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
if (!Uint8Array.prototype.fill) {
    Object.defineProperty(Uint8Array.prototype, 'fill', {
        writable: true,
        enumerable: true,
        value: function (value) {
            // Steps 1-2.
            if (this == null) {
                throw new TypeError('this is null or not defined');
            }
            var O = Object(this);
            // Steps 3-5.
            var len = O.length >>> 0;
            // Steps 6-7.
            var start = arguments[1];
            var relativeStart = start >> 0;
            // Step 8.
            var k = relativeStart < 0 ?
                Math.max(len + relativeStart, 0) :
                Math.min(relativeStart, len);
            // Steps 9-10.
            var end = arguments[2];
            var relativeEnd = end === undefined ?
                len : end >> 0;
            // Step 11.
            var final = relativeEnd < 0 ?
                Math.max(len + relativeEnd, 0) :
                Math.min(relativeEnd, len);
            // Step 12.
            while (k < final) {
                O[k] = value;
                k++;
            }
            // Step 13.
            return O;
        }
    });
}
onmessage = function (ev) {
    var res = pxtc.service.performOperation(ev.data.op, ev.data.arg);
    pm({
        op: ev.data.op,
        id: ev.data.id,
        result: JSON.parse(JSON.stringify(res))
    });
};
pm({
    id: "ready"
});
