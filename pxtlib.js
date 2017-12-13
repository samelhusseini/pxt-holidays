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
var pxt;
(function (pxt) {
    var analytics;
    (function (analytics) {
        function enable() {
            var ai = window.appInsights;
            if (!ai)
                return;
            pxt.debug('enabling app insights');
            var te = pxt.tickEvent;
            pxt.tickEvent = function (id, data) {
                if (te)
                    te(id, data);
                if (!data)
                    ai.trackEvent(id);
                else {
                    var props = {};
                    var measures = {};
                    for (var k in data)
                        if (typeof data[k] == "string")
                            props[k] = data[k];
                        else
                            measures[k] = data[k];
                    ai.trackEvent(id, props, measures);
                }
            };
            var rexp = pxt.reportException;
            pxt.reportException = function (err, data) {
                if (rexp)
                    rexp(err, data);
                var props = {
                    target: pxt.appTarget.id,
                    version: pxt.appTarget.versions.target
                };
                if (data)
                    pxt.Util.jsonMergeFrom(props, data);
                ai.trackException(err, 'exception', props);
            };
            var re = pxt.reportError;
            pxt.reportError = function (cat, msg, data) {
                if (re)
                    re(cat, msg, data);
                try {
                    throw msg;
                }
                catch (err) {
                    var props = {
                        target: pxt.appTarget.id,
                        version: pxt.appTarget.versions.target,
                        category: cat,
                        message: msg
                    };
                    if (data)
                        pxt.Util.jsonMergeFrom(props, data);
                    ai.trackException(err, 'error', props);
                }
            };
        }
        analytics.enable = enable;
    })(analytics = pxt.analytics || (pxt.analytics = {}));
})(pxt || (pxt = {}));
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.__dummy = 42;
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxtc = ts.pxtc;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var Util;
        (function (Util) {
            function bufferSerial(buffers, data, source, maxBufLen) {
                if (data === void 0) { data = ""; }
                if (source === void 0) { source = "?"; }
                if (maxBufLen === void 0) { maxBufLen = 255; }
                for (var i = 0; i < data.length; ++i) {
                    var char = data[i];
                    buffers[source] = buffers[source] ? buffers[source] + char : char;
                    if (char === "\n" || buffers[source].length > maxBufLen) {
                        var buffer = buffers[source];
                        buffers[source] = "";
                        window.postMessage({
                            type: "serial",
                            id: source,
                            data: buffer
                        }, "*");
                    }
                }
            }
            Util.bufferSerial = bufferSerial;
            function assert(cond, msg) {
                if (msg === void 0) { msg = "Assertion failed"; }
                if (!cond) {
                    debugger;
                    throw new Error(msg);
                }
            }
            Util.assert = assert;
            function fileReadAsBufferAsync(f) {
                if (!f)
                    return Promise.resolve(null);
                else {
                    return new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onerror = function (ev) { return resolve(null); };
                        reader.onload = function (ev) { return resolve(new Uint8Array(reader.result)); };
                        reader.readAsArrayBuffer(f);
                    });
                }
            }
            Util.fileReadAsBufferAsync = fileReadAsBufferAsync;
            function fileReadAsTextAsync(f) {
                if (!f)
                    return Promise.resolve(null);
                else {
                    return new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onerror = function (ev) { return resolve(null); };
                        reader.onload = function (ev) { return resolve(reader.result); };
                        reader.readAsText(f);
                    });
                }
            }
            Util.fileReadAsTextAsync = fileReadAsTextAsync;
            function repeatMap(n, fn) {
                n = n || 0;
                var r = [];
                for (var i = 0; i < n; ++i)
                    r.push(fn(i));
                return r;
            }
            Util.repeatMap = repeatMap;
            function listsEqual(a, b) {
                if (!a || !b || a.length !== b.length) {
                    return false;
                }
                for (var i = 0; i < a.length; i++) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            }
            Util.listsEqual = listsEqual;
            function oops(msg) {
                if (msg === void 0) { msg = "OOPS"; }
                debugger;
                throw new Error(msg);
            }
            Util.oops = oops;
            function reversed(arr) {
                arr = arr.slice(0);
                arr.reverse();
                return arr;
            }
            Util.reversed = reversed;
            function flatClone(obj) {
                if (obj == null)
                    return null;
                var r = {};
                Object.keys(obj).forEach(function (k) { r[k] = obj[k]; });
                return r;
            }
            Util.flatClone = flatClone;
            function clone(v) {
                if (v == null)
                    return null;
                return JSON.parse(JSON.stringify(v));
            }
            Util.clone = clone;
            function iterMap(m, f) {
                Object.keys(m).forEach(function (k) { return f(k, m[k]); });
            }
            Util.iterMap = iterMap;
            function mapMap(m, f) {
                var r = {};
                Object.keys(m).forEach(function (k) { return r[k] = f(k, m[k]); });
                return r;
            }
            Util.mapMap = mapMap;
            function mapStringMapAsync(m, f) {
                var r = {};
                return Promise.all(Object.keys(m).map(function (k) { return f(k, m[k]).then(function (v) { return r[k] = v; }); }))
                    .then(function () { return r; });
            }
            Util.mapStringMapAsync = mapStringMapAsync;
            function values(m) {
                return Object.keys(m || {}).map(function (k) { return m[k]; });
            }
            Util.values = values;
            function lookup(m, key) {
                if (m.hasOwnProperty(key))
                    return m[key];
                return null;
            }
            Util.lookup = lookup;
            function pushRange(trg, src) {
                for (var i = 0; i < src.length; ++i)
                    trg.push(src[i]);
            }
            Util.pushRange = pushRange;
            function concat(arrays) {
                var r = [];
                for (var i = 0; i < arrays.length; ++i) {
                    pushRange(r, arrays[i]);
                }
                return r;
            }
            Util.concat = concat;
            function isKV(v) {
                return !!v && typeof v === "object" && !Array.isArray(v);
            }
            function memcpy(trg, trgOff, src, srcOff, len) {
                if (srcOff === void 0)
                    srcOff = 0;
                if (len === void 0)
                    len = src.length - srcOff;
                for (var i = 0; i < len; ++i)
                    trg[trgOff + i] = src[srcOff + i];
            }
            Util.memcpy = memcpy;
            function uint8ArrayConcat(chunks) {
                var numbytes = 0;
                for (var _i = 0, chunks_1 = chunks; _i < chunks_1.length; _i++) {
                    var c = chunks_1[_i];
                    numbytes += c.length;
                }
                var r = new Uint8Array(numbytes);
                var ptr = 0;
                for (var _a = 0, chunks_2 = chunks; _a < chunks_2.length; _a++) {
                    var c = chunks_2[_a];
                    memcpy(r, ptr, c);
                    ptr += c.length;
                }
                return r;
            }
            Util.uint8ArrayConcat = uint8ArrayConcat;
            function jsonMergeFrom(trg, src) {
                if (!src)
                    return;
                Object.keys(src).forEach(function (k) {
                    if (isKV(trg[k]) && isKV(src[k]))
                        jsonMergeFrom(trg[k], src[k]);
                    else
                        trg[k] = clone(src[k]);
                });
            }
            Util.jsonMergeFrom = jsonMergeFrom;
            function jsonCopyFrom(trg, src) {
                var v = clone(src);
                for (var _i = 0, _a = Object.keys(src); _i < _a.length; _i++) {
                    var k = _a[_i];
                    trg[k] = v[k];
                }
            }
            Util.jsonCopyFrom = jsonCopyFrom;
            // { a: { b: 1 }, c: 2} => { "a.b": 1, c: 2 }
            function jsonFlatten(v) {
                var res = {};
                var loop = function (pref, v) {
                    if (v !== null && typeof v == "object") {
                        assert(!Array.isArray(v));
                        if (pref)
                            pref += ".";
                        for (var _i = 0, _a = Object.keys(v); _i < _a.length; _i++) {
                            var k = _a[_i];
                            loop(pref + k, v[k]);
                        }
                    }
                    else {
                        res[pref] = v;
                    }
                };
                loop("", v);
                return res;
            }
            Util.jsonFlatten = jsonFlatten;
            function jsonUnFlatten(v) {
                var res = {};
                for (var _i = 0, _a = Object.keys(v); _i < _a.length; _i++) {
                    var k = _a[_i];
                    var ptr = res;
                    var parts = k.split(".");
                    for (var i = 0; i < parts.length; ++i) {
                        var part = parts[i];
                        if (i == parts.length - 1)
                            ptr[part] = v[k];
                        else {
                            if (typeof ptr[part] != "object")
                                ptr[part] = {};
                            ptr = ptr[part];
                        }
                    }
                }
                return res;
            }
            Util.jsonUnFlatten = jsonUnFlatten;
            function strcmp(a, b) {
                if (a == b)
                    return 0;
                if (a < b)
                    return -1;
                else
                    return 1;
            }
            Util.strcmp = strcmp;
            function stringMapEq(a, b) {
                var ak = Object.keys(a);
                var bk = Object.keys(b);
                if (ak.length != bk.length)
                    return false;
                for (var _i = 0, ak_1 = ak; _i < ak_1.length; _i++) {
                    var k = ak_1[_i];
                    if (!b.hasOwnProperty(k))
                        return false;
                    if (a[k] !== b[k])
                        return false;
                }
                return true;
            }
            Util.stringMapEq = stringMapEq;
            function endsWith(str, suffix) {
                if (str.length < suffix.length)
                    return false;
                if (suffix.length == 0)
                    return true;
                return str.slice(-suffix.length) == suffix;
            }
            Util.endsWith = endsWith;
            function startsWith(str, prefix) {
                if (str.length < prefix.length)
                    return false;
                if (prefix.length == 0)
                    return true;
                return str.slice(0, prefix.length) == prefix;
            }
            Util.startsWith = startsWith;
            function contains(str, contains) {
                if (str.length < contains.length)
                    return false;
                if (contains.length == 0)
                    return true;
                return str.indexOf(contains) > -1;
            }
            Util.contains = contains;
            function replaceAll(str, old, new_) {
                if (!old)
                    return str;
                return str.split(old).join(new_);
            }
            Util.replaceAll = replaceAll;
            function sortObjectFields(o) {
                var keys = Object.keys(o);
                keys.sort(strcmp);
                var r = {};
                keys.forEach(function (k) { return r[k] = o[k]; });
                return r;
            }
            Util.sortObjectFields = sortObjectFields;
            function chopArray(arr, chunkSize) {
                var res = [];
                for (var i = 0; i < arr.length; i += chunkSize)
                    res.push(arr.slice(i, i + chunkSize));
                return res;
            }
            Util.chopArray = chopArray;
            function unique(arr, f) {
                var v = [];
                var r = {};
                arr.forEach(function (e) {
                    var k = f(e);
                    if (!r.hasOwnProperty(k)) {
                        r[k] = null;
                        v.push(e);
                    }
                });
                return v;
            }
            Util.unique = unique;
            function groupBy(arr, f) {
                var r = {};
                arr.forEach(function (e) {
                    var k = f(e);
                    if (!r.hasOwnProperty(k))
                        r[k] = [];
                    r[k].push(e);
                });
                return r;
            }
            Util.groupBy = groupBy;
            function toDictionary(arr, f) {
                var r = {};
                arr.forEach(function (e) { r[f(e)] = e; });
                return r;
            }
            Util.toDictionary = toDictionary;
            function toArray(a) {
                if (Array.isArray(a)) {
                    return a;
                }
                var r = [];
                for (var i = 0; i < a.length; ++i)
                    r.push(a[i]);
                return r;
            }
            Util.toArray = toArray;
            function indexOfMatching(arr, f) {
                for (var i = 0; i < arr.length; ++i)
                    if (f(arr[i]))
                        return i;
                return -1;
            }
            Util.indexOfMatching = indexOfMatching;
            function nextTick(f) {
                Promise._async._schedule(f);
            }
            Util.nextTick = nextTick;
            function memoizeString(createNew) {
                return memoize(function (s) { return s; }, createNew);
            }
            Util.memoizeString = memoizeString;
            function memoize(getId, createNew) {
                var cache = {};
                return function (v) {
                    var id = getId(v);
                    if (cache.hasOwnProperty(id))
                        return cache[id];
                    return (cache[id] = createNew(v));
                };
            }
            Util.memoize = memoize;
            // Returns a function, that, as long as it continues to be invoked, will not
            // be triggered. The function will be called after it stops being called for
            // N milliseconds. If `immediate` is passed, trigger the function on the
            // leading edge, instead of the trailing.
            function debounce(func, wait, immediate) {
                var timeout;
                return function () {
                    var context = this;
                    var args = arguments;
                    var later = function () {
                        timeout = null;
                        if (!immediate)
                            func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow)
                        func.apply(context, args);
                };
            }
            Util.debounce = debounce;
            // Returns a function, that, as long as it continues to be invoked, will only
            // trigger every N milliseconds. If `immediate` is passed, trigger the
            // function on the leading edge, instead of the trailing.
            function throttle(func, wait, immediate) {
                var timeout;
                return function () {
                    var context = this;
                    var args = arguments;
                    var later = function () {
                        timeout = null;
                        if (!immediate)
                            func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    if (!timeout)
                        timeout = setTimeout(later, wait);
                    if (callNow)
                        func.apply(context, args);
                };
            }
            Util.throttle = throttle;
            function randomPermute(arr) {
                for (var i = 0; i < arr.length; ++i) {
                    var j = randomUint32() % arr.length;
                    var tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
            Util.randomPermute = randomPermute;
            function randomPick(arr) {
                if (arr.length == 0)
                    return null;
                return arr[randomUint32() % arr.length];
            }
            Util.randomPick = randomPick;
            function isoTime(time) {
                var d = new Date(time * 1000);
                return Util.fmt("{0}-{1:f02.0}-{2:f02.0} {3:f02.0}:{4:f02.0}:{5:f02.0}", d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
            }
            Util.isoTime = isoTime;
            function timeSince(time) {
                var now = Date.now();
                time *= 1000;
                var diff = (now - time) / 1000;
                if (isNaN(diff))
                    return "";
                if (diff < -30) {
                    diff = -diff;
                    if (diff < 60)
                        return lf("in a few seconds");
                    if (diff < 2 * 60)
                        return lf("in a minute");
                    if (diff < 60 * 60)
                        return lf("in {0} minute{0:s}", Math.floor(diff / 60));
                    if (diff < 2 * 60 * 60)
                        return lf("in an hour");
                    if (diff < 60 * 60 * 24)
                        return lf("in {0} hour{0:s}", Math.floor(diff / 60 / 60));
                    if (diff < 60 * 60 * 24 * 30)
                        return lf("in {0} day{0:s}", Math.floor(diff / 60 / 60 / 24));
                    if (diff < 60 * 60 * 24 * 365)
                        return lf("in {0} month{0:s}", Math.floor(diff / 60 / 60 / 24 / 30));
                    return lf("in {0} year{0:s}", Math.floor(diff / 60 / 60 / 24 / 365));
                }
                else {
                    if (diff < 0)
                        return lf("now");
                    if (diff < 10)
                        return lf("a few seconds ago");
                    if (diff < 60)
                        return lf("{0} second{0:s} ago", Math.floor(diff));
                    if (diff < 2 * 60)
                        return lf("a minute ago");
                    if (diff < 60 * 60)
                        return lf("{0} minute{0:s} ago", Math.floor(diff / 60));
                    if (diff < 2 * 60 * 60)
                        return lf("an hour ago");
                    if (diff < 60 * 60 * 24)
                        return lf("{0} hour{0:s} ago", Math.floor(diff / 60 / 60));
                    if (diff < 60 * 60 * 24 * 30)
                        return lf("{0} day{0:s} ago", Math.floor(diff / 60 / 60 / 24));
                    if (diff < 60 * 60 * 24 * 365)
                        return lf("{0} month{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 30));
                    return lf("{0} year{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 365));
                }
            }
            Util.timeSince = timeSince;
            function unicodeToChar(text) {
                var r = /\\u([\d\w]{4})/gi;
                return text.replace(r, function (match, grp) {
                    return String.fromCharCode(parseInt(grp, 16));
                });
            }
            Util.unicodeToChar = unicodeToChar;
            function escapeForRegex(str) {
                return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            }
            Util.escapeForRegex = escapeForRegex;
            function stripUrlProtocol(str) {
                return str.replace(/.*?:\/\//g, "");
            }
            Util.stripUrlProtocol = stripUrlProtocol;
            function normalizePath(path) {
                if (path) {
                    path = path.replace(/\\/g, "/");
                }
                return path;
            }
            Util.normalizePath = normalizePath;
            function pathJoin(a, b) {
                normalizePath(a);
                normalizePath(b);
                if (!a && !b)
                    return undefined;
                else if (!a)
                    return b;
                else if (!b)
                    return a;
                if (a.charAt(a.length - 1) !== "/") {
                    a += "/";
                }
                if (b.charAt(0) == "/") {
                    b = b.substring(1);
                }
                return a + b;
            }
            Util.pathJoin = pathJoin;
            Util.isNodeJS = false;
            function requestAsync(options) {
                return Util.httpRequestCoreAsync(options)
                    .then(function (resp) {
                    if ((resp.statusCode != 200 && resp.statusCode != 304) && !options.allowHttpErrors) {
                        var msg = Util.lf("Bad HTTP status code: {0} at {1}; message: {2}", resp.statusCode, options.url, (resp.text || "").slice(0, 500));
                        var err = new Error(msg);
                        err.statusCode = resp.statusCode;
                        return Promise.reject(err);
                    }
                    if (resp.text && /application\/json/.test(resp.headers["content-type"]))
                        resp.json = JSON.parse(resp.text);
                    return resp;
                });
            }
            Util.requestAsync = requestAsync;
            function httpGetTextAsync(url) {
                return requestAsync({ url: url }).then(function (resp) { return resp.text; });
            }
            Util.httpGetTextAsync = httpGetTextAsync;
            function httpGetJsonAsync(url) {
                return requestAsync({ url: url }).then(function (resp) { return resp.json; });
            }
            Util.httpGetJsonAsync = httpGetJsonAsync;
            function httpPostJsonAsync(url, data) {
                return requestAsync({ url: url, data: data || {} }).then(function (resp) { return resp.json; });
            }
            Util.httpPostJsonAsync = httpPostJsonAsync;
            function userError(msg) {
                var e = new Error(msg);
                e.isUserError = true;
                throw e;
            }
            Util.userError = userError;
            // this will take lower 8 bits from each character
            function stringToUint8Array(input) {
                var len = input.length;
                var res = new Uint8Array(len);
                for (var i = 0; i < len; ++i)
                    res[i] = input.charCodeAt(i) & 0xff;
                return res;
            }
            Util.stringToUint8Array = stringToUint8Array;
            function uint8ArrayToString(input) {
                var len = input.length;
                var res = "";
                for (var i = 0; i < len; ++i)
                    res += String.fromCharCode(input[i]);
                return res;
            }
            Util.uint8ArrayToString = uint8ArrayToString;
            function fromUTF8(binstr) {
                if (!binstr)
                    return "";
                // escape function is deprecated
                var escaped = "";
                for (var i = 0; i < binstr.length; ++i) {
                    var k = binstr.charCodeAt(i) & 0xff;
                    if (k == 37 || k > 0x7f) {
                        escaped += "%" + k.toString(16);
                    }
                    else {
                        escaped += binstr.charAt(i);
                    }
                }
                // decodeURIComponent does the actual UTF8 decoding
                return decodeURIComponent(escaped);
            }
            Util.fromUTF8 = fromUTF8;
            function toUTF8(str) {
                var res = "";
                if (!str)
                    return res;
                for (var i = 0; i < str.length; ++i) {
                    var code = str.charCodeAt(i);
                    if (code <= 0x7f)
                        res += str.charAt(i);
                    else if (code <= 0x7ff) {
                        res += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
                    }
                    else {
                        if (0xd800 <= code && code <= 0xdbff) {
                            var next = str.charCodeAt(++i);
                            if (!isNaN(next))
                                code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                        }
                        if (code <= 0xffff)
                            res += String.fromCharCode(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                        else
                            res += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                    }
                }
                return res;
            }
            Util.toUTF8 = toUTF8;
            function toHex(bytes) {
                var r = "";
                for (var i = 0; i < bytes.length; ++i)
                    r += ("0" + bytes[i].toString(16)).slice(-2);
                return r;
            }
            Util.toHex = toHex;
            function fromHex(hex) {
                var r = new Uint8Array(hex.length >> 1);
                for (var i = 0; i < hex.length; i += 2)
                    r[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
                return r;
            }
            Util.fromHex = fromHex;
            var PromiseQueue = /** @class */ (function () {
                function PromiseQueue() {
                    this.promises = {};
                }
                PromiseQueue.prototype.enqueue = function (id, f) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var arr = _this.promises[id];
                        if (!arr) {
                            arr = _this.promises[id] = [];
                        }
                        arr.push(function () {
                            return f()
                                .finally(function () {
                                arr.shift();
                                if (arr.length == 0)
                                    delete _this.promises[id];
                                else
                                    arr[0]();
                            })
                                .then(resolve, reject);
                        });
                        if (arr.length == 1)
                            arr[0]();
                    });
                };
                return PromiseQueue;
            }());
            Util.PromiseQueue = PromiseQueue;
            var PromiseBuffer = /** @class */ (function () {
                function PromiseBuffer() {
                    this.waiting = [];
                    this.available = [];
                }
                PromiseBuffer.prototype.drain = function () {
                    for (var _i = 0, _a = this.waiting; _i < _a.length; _i++) {
                        var f = _a[_i];
                        f(new Error("Promise Buffer Reset"));
                    }
                    this.waiting = [];
                    this.available = [];
                };
                PromiseBuffer.prototype.pushError = function (v) {
                    this.push(v);
                };
                PromiseBuffer.prototype.push = function (v) {
                    var f = this.waiting.shift();
                    if (f)
                        f(v);
                    else
                        this.available.push(v);
                };
                PromiseBuffer.prototype.shiftAsync = function (timeout) {
                    var _this = this;
                    if (timeout === void 0) { timeout = 0; }
                    if (this.available.length > 0) {
                        var v = this.available.shift();
                        if (v instanceof Error)
                            return Promise.reject(v);
                        else
                            return Promise.resolve(v);
                    }
                    else
                        return new Promise(function (resolve, reject) {
                            var f = function (v) {
                                if (v instanceof Error)
                                    reject(v);
                                else
                                    resolve(v);
                            };
                            _this.waiting.push(f);
                            if (timeout > 0) {
                                Promise.delay(timeout)
                                    .then(function () {
                                    var idx = _this.waiting.indexOf(f);
                                    if (idx >= 0) {
                                        _this.waiting.splice(idx, 1);
                                        reject(new Error("Timeout"));
                                    }
                                });
                            }
                        });
                };
                return PromiseBuffer;
            }());
            Util.PromiseBuffer = PromiseBuffer;
            function now() {
                return Date.now();
            }
            Util.now = now;
            function nowSeconds() {
                return Math.round(now() / 1000);
            }
            Util.nowSeconds = nowSeconds;
            function getMime(filename) {
                var m = /\.([a-zA-Z0-9]+)$/.exec(filename);
                if (m)
                    switch (m[1].toLowerCase()) {
                        case "txt": return "text/plain";
                        case "html":
                        case "htm": return "text/html";
                        case "css": return "text/css";
                        case "js": return "application/javascript";
                        case "jpg":
                        case "jpeg": return "image/jpeg";
                        case "png": return "image/png";
                        case "ico": return "image/x-icon";
                        case "manifest": return "text/cache-manifest";
                        case "webmanifest": return "application/manifest+json";
                        case "json": return "application/json";
                        case "svg": return "image/svg+xml";
                        case "eot": return "application/vnd.ms-fontobject";
                        case "ttf": return "font/ttf";
                        case "woff": return "application/font-woff";
                        case "woff2": return "application/font-woff2";
                        case "md": return "text/markdown";
                        case "xml": return "application/xml";
                        case "m4a": return "audio/m4a";
                        case "mp3": return "audio/mp3";
                        default: return "application/octet-stream";
                    }
                else
                    return "application/octet-stream";
            }
            Util.getMime = getMime;
            function randomUint32() {
                var buf = new Uint8Array(4);
                Util.getRandomBuf(buf);
                return new Uint32Array(buf.buffer)[0];
            }
            Util.randomUint32 = randomUint32;
            function guidGen() {
                function f() { return (randomUint32() | 0x10000).toString(16).slice(-4); }
                return f() + f() + "-" + f() + "-4" + f().slice(-3) + "-" + f() + "-" + f() + f() + f();
            }
            Util.guidGen = guidGen;
            // Localization functions. Please port any modifications over to pxtsim/localization.ts
            var _localizeLang = "en";
            var _localizeStrings = {};
            var _translationsCache = {};
            Util.localizeLive = false;
            var MemTranslationDb = /** @class */ (function () {
                function MemTranslationDb() {
                    this.translations = {};
                }
                MemTranslationDb.prototype.key = function (lang, filename, branch) {
                    return lang + "|" + filename + "|" + (branch || "");
                };
                MemTranslationDb.prototype.getAsync = function (lang, filename, branch) {
                    return Promise.resolve(this.translations[this.key(lang, filename, branch)]);
                };
                MemTranslationDb.prototype.setAsync = function (lang, filename, branch, etag, strings) {
                    this.translations[this.key(lang, filename, branch)] = {
                        etag: etag,
                        strings: strings,
                        cached: true
                    };
                    return Promise.resolve();
                };
                return MemTranslationDb;
            }());
            // wired up in the app to store translations in pouchdb. MAY BE UNDEFINED!
            Util.translationDb = new MemTranslationDb();
            /**
             * Returns the current user language, prepended by "live-" if in live mode
             */
            function localeInfo() {
                return "" + (Util.localizeLive ? "live-" : "") + userLanguage();
            }
            Util.localeInfo = localeInfo;
            /**
             * Returns current user language iSO-code. Default is `en`.
             */
            function userLanguage() {
                return _localizeLang;
            }
            Util.userLanguage = userLanguage;
            function isUserLanguageRtl() {
                // ar: Arabic
                // dv: Divehi
                // fa: Farsi
                // ha: Hausa
                // he: Hebrew
                // ks: Kashmiri
                // ku: Kurdish
                // ps: Pashto
                // ur: Urdu
                // yi: Yiddish
                return /^ar|dv|fa|ha|he|ks|ku|ps|ur|yi/i.test(_localizeLang);
            }
            Util.isUserLanguageRtl = isUserLanguageRtl;
            function _localize(s) {
                return _localizeStrings[s] || s;
            }
            Util._localize = _localize;
            function downloadLiveTranslationsAsync(lang, filename, branch, etag) {
                // hitting the cloud
                function downloadFromCloudAsync() {
                    // https://pxt.io/api/translations?filename=strings.json&lang=pl&approved=true&branch=v0
                    var url = "https://makecode.com/api/translations?lang=" + encodeURIComponent(lang) + "&filename=" + encodeURIComponent(filename) + "&approved=true";
                    if (branch)
                        url += '&branch=' + encodeURIComponent(branch);
                    var headers = {};
                    if (etag)
                        headers["If-None-Match"] = etag;
                    return requestAsync({ url: url, headers: headers }).then(function (resp) {
                        // if 304, translation not changed, skipe
                        if (resp.statusCode == 304)
                            return undefined;
                        else if (resp.statusCode == 200) {
                            // store etag and translations
                            etag = resp.headers["ETag"] || "";
                            return Util.translationDb.setAsync(lang, filename, branch, etag, resp.json)
                                .then(function () { return resp.json; });
                        }
                        return resp.json;
                    }, function (e) {
                        console.log("failed to load translations from " + url);
                        return undefined;
                    });
                }
                // check for cache
                return Util.translationDb.getAsync(lang, filename, branch)
                    .then(function (entry) {
                    // if cached, return immediately
                    if (entry) {
                        etag = entry.etag;
                        // background update
                        if (!entry.cached)
                            downloadFromCloudAsync().done();
                        return entry.strings;
                    }
                    else
                        return downloadFromCloudAsync();
                });
            }
            Util.downloadLiveTranslationsAsync = downloadLiveTranslationsAsync;
            function getLocalizedStrings() {
                return _localizeStrings;
            }
            Util.getLocalizedStrings = getLocalizedStrings;
            function setLocalizedStrings(strs) {
                _localizeStrings = strs;
            }
            Util.setLocalizedStrings = setLocalizedStrings;
            function normalizeLanguageCode(code) {
                if (!/^(es|pt|si|sv|zh)/i.test(code))
                    code = code.split("-")[0];
                return code;
            }
            function updateLocalizationAsync(targetId, simulator, baseUrl, code, pxtBranch, targetBranch, live) {
                code = normalizeLanguageCode(code);
                if (code === _localizeLang)
                    return Promise.resolve();
                return downloadTranslationsAsync(targetId, simulator, baseUrl, code, pxtBranch, targetBranch, live)
                    .then(function (translations) {
                    if (translations) {
                        _localizeLang = code;
                        _localizeStrings = translations;
                        if (live) {
                            Util.localizeLive = true;
                        }
                    }
                    return Promise.resolve();
                });
            }
            Util.updateLocalizationAsync = updateLocalizationAsync;
            function downloadSimulatorLocalizationAsync(targetId, baseUrl, code, pxtBranch, targetBranch, live) {
                code = normalizeLanguageCode(code);
                if (code === _localizeLang)
                    return Promise.resolve(undefined);
                return downloadTranslationsAsync(targetId, true, baseUrl, code, pxtBranch, targetBranch, live);
            }
            Util.downloadSimulatorLocalizationAsync = downloadSimulatorLocalizationAsync;
            function downloadTranslationsAsync(targetId, simulator, baseUrl, code, pxtBranch, targetBranch, live) {
                code = normalizeLanguageCode(code);
                var translationsCacheId = code + "/" + live + "/" + simulator;
                if (_translationsCache[translationsCacheId]) {
                    return Promise.resolve(_translationsCache[translationsCacheId]);
                }
                var stringFiles = simulator
                    ? [{ branch: targetBranch, path: targetId + "/sim-strings.json" }]
                    : [
                        { branch: pxtBranch, path: "strings.json" },
                        { branch: targetBranch, path: targetId + "/target-strings.json" }
                    ];
                var translations;
                function mergeTranslations(tr) {
                    if (!tr)
                        return;
                    if (!translations) {
                        translations = {};
                    }
                    Object.keys(tr)
                        .filter(function (k) { return !!tr[k]; })
                        .forEach(function (k) { return translations[k] = tr[k]; });
                }
                if (live) {
                    var hadError_1 = false;
                    var pAll = Promise.mapSeries(stringFiles, function (file) { return downloadLiveTranslationsAsync(code, file.path, file.branch)
                        .then(mergeTranslations, function (e) {
                        console.log(e.message);
                        hadError_1 = true;
                    }); });
                    return pAll.then(function () {
                        // Cache translations unless there was an error for one of the files
                        if (!hadError_1) {
                            _translationsCache[translationsCacheId] = translations;
                        }
                        return Promise.resolve(translations);
                    });
                }
                else {
                    return Util.httpGetJsonAsync(baseUrl + "locales/" + code + "/strings.json")
                        .then(function (tr) {
                        if (tr) {
                            translations = tr;
                            _translationsCache[translationsCacheId] = translations;
                        }
                    }, function (e) {
                        console.error('failed to load localizations');
                    })
                        .then(function () { return translations; });
                }
            }
            Util.downloadTranslationsAsync = downloadTranslationsAsync;
            function htmlEscape(_input) {
                if (!_input)
                    return _input; // null, undefined, empty string test
                return _input.replace(/([^\w .!?\-$])/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; });
            }
            Util.htmlEscape = htmlEscape;
            function jsStringQuote(s) {
                return s.replace(/[^\w .!?\-$]/g, function (c) {
                    var h = c.charCodeAt(0).toString(16);
                    return "\\u" + "0000".substr(0, 4 - h.length) + h;
                });
            }
            Util.jsStringQuote = jsStringQuote;
            function jsStringLiteral(s) {
                return "\"" + jsStringQuote(s) + "\"";
            }
            Util.jsStringLiteral = jsStringLiteral;
            function fmt_va(f, args) {
                if (args.length == 0)
                    return f;
                return f.replace(/\{([0-9]+)(\:[^\}]+)?\}/g, function (s, n, spec) {
                    var v = args[parseInt(n)];
                    var r = "";
                    var fmtMatch = /^:f(\d*)\.(\d+)/.exec(spec);
                    if (fmtMatch) {
                        var precision = parseInt(fmtMatch[2]);
                        var len = parseInt(fmtMatch[1]) || 0;
                        var fillChar = /^0/.test(fmtMatch[1]) ? "0" : " ";
                        var num = v.toFixed(precision);
                        if (len > 0 && precision > 0)
                            len += precision + 1;
                        if (len > 0) {
                            while (num.length < len) {
                                num = fillChar + num;
                            }
                        }
                        r = num;
                    }
                    else if (spec == ":x") {
                        r = "0x" + v.toString(16);
                    }
                    else if (v === undefined)
                        r = "(undef)";
                    else if (v === null)
                        r = "(null)";
                    else if (v.toString)
                        r = v.toString();
                    else
                        r = v + "";
                    if (spec == ":a") {
                        if (/^\s*[euioah]/.test(r.toLowerCase()))
                            r = "an " + r;
                        else if (/^\s*[bcdfgjklmnpqrstvwxz]/.test(r.toLowerCase()))
                            r = "a " + r;
                    }
                    else if (spec == ":s") {
                        if (v == 1)
                            r = "";
                        else
                            r = "s";
                    }
                    else if (spec == ":q") {
                        r = Util.htmlEscape(r);
                    }
                    else if (spec == ":jq") {
                        r = Util.jsStringQuote(r);
                    }
                    else if (spec == ":uri") {
                        r = encodeURIComponent(r).replace(/'/g, "%27").replace(/"/g, "%22");
                    }
                    else if (spec == ":url") {
                        r = encodeURI(r).replace(/'/g, "%27").replace(/"/g, "%22");
                    }
                    else if (spec == ":%") {
                        r = (v * 100).toFixed(1).toString() + '%';
                    }
                    return r;
                });
            }
            Util.fmt_va = fmt_va;
            function fmt(f) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return fmt_va(f, args);
            }
            Util.fmt = fmt;
            var locStats = {};
            function dumpLocStats() {
                var r = {};
                Object.keys(locStats).sort(function (a, b) { return locStats[b] - locStats[a]; })
                    .forEach(function (k) { return r[k] = k; });
                console.log('prioritized list of strings:');
                console.log(JSON.stringify(r, null, 2));
            }
            Util.dumpLocStats = dumpLocStats;
            var sForPlural = true;
            function lf_va(format, args) {
                locStats[format] = (locStats[format] || 0) + 1;
                var lfmt = Util._localize(format);
                if (!sForPlural && lfmt != format && /\d:s\}/.test(lfmt)) {
                    lfmt = lfmt.replace(/\{\d+:s\}/g, "");
                }
                lfmt = lfmt.replace(/\{(id|loc):[^\}]+\}/g, '');
                return fmt_va(lfmt, args);
            }
            Util.lf_va = lf_va;
            function lf(format) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return lf_va(format, args);
            }
            Util.lf = lf;
            /**
             * Similar to lf but the string do not get extracted into the loc file.
             */
            function rlf(format) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return lf_va(format, args);
            }
            Util.rlf = rlf;
            function capitalize(n) {
                return n ? (n[0].toLocaleUpperCase() + n.slice(1)) : n;
            }
            Util.capitalize = capitalize;
            function uncapitalize(n) {
                return (n || "").split(/(?=[A-Z])/g).join(" ").toLowerCase();
            }
            Util.uncapitalize = uncapitalize;
            function range(len) {
                var r = [];
                for (var i = 0; i < len; ++i)
                    r.push(i);
                return r;
            }
            Util.range = range;
            function multipartPostAsync(uri, data, filename, filecontents) {
                if (data === void 0) { data = {}; }
                if (filename === void 0) { filename = null; }
                if (filecontents === void 0) { filecontents = null; }
                var boundary = "--------------------------0461489f461126c5";
                var form = "";
                function add(name, val) {
                    form += boundary + "\r\n";
                    form += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
                    form += val + "\r\n";
                }
                function addF(name, val) {
                    var fn = name.split('/').reverse()[0];
                    form += boundary + "\r\n";
                    form += "Content-Disposition: form-data; name=\"files[" + name + "]\"; filename=\"" + fn + "\"\r\n";
                    form += "\r\n";
                    form += val + "\r\n";
                }
                Object.keys(data).forEach(function (k) { return add(k, data[k]); });
                if (filename)
                    addF(filename, filecontents);
                form += boundary + "--\r\n";
                var req = {
                    url: uri,
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data; boundary=" + boundary.slice(2)
                    },
                    data: form
                };
                return Util.httpRequestCoreAsync(req);
            }
            Util.multipartPostAsync = multipartPostAsync;
            function toDataUri(data, mimetype) {
                // TODO does this only support trusted data?
                // weed out urls
                if (/^https?:/i.test(data))
                    return data;
                // already a data uri?
                if (/^data:/i.test(data))
                    return data;
                // infer mimetype
                if (!mimetype) {
                    if (/^<svg/i.test(data))
                        mimetype = "image/svg+xml";
                }
                // encode
                if (/xml|svg/.test(mimetype))
                    return "data:" + mimetype + "," + encodeURIComponent(data);
                else
                    return "data:" + (mimetype || "image/png") + ";base64," + btoa(toUTF8(data));
            }
            Util.toDataUri = toDataUri;
        })(Util = pxtc.Util || (pxtc.Util = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var BrowserImpl;
        (function (BrowserImpl) {
            pxtc.Util.httpRequestCoreAsync = httpRequestCoreAsync;
            pxtc.Util.sha256 = sha256string;
            pxtc.Util.getRandomBuf = function (buf) {
                if (window.crypto)
                    window.crypto.getRandomValues(buf);
                else {
                    for (var i = 0; i < buf.length; ++i)
                        buf[i] = Math.floor(Math.random() * 255);
                }
            };
            function httpRequestCoreAsync(options) {
                return new Promise(function (resolve, reject) {
                    var client;
                    var resolved = false;
                    var headers = pxtc.Util.clone(options.headers) || {};
                    client = new XMLHttpRequest();
                    if (options.responseArrayBuffer)
                        client.responseType = "arraybuffer";
                    client.onreadystatechange = function () {
                        if (resolved)
                            return; // Safari/iOS likes to call this thing more than once
                        if (client.readyState == 4) {
                            resolved = true;
                            var res_1 = {
                                statusCode: client.status,
                                headers: {},
                                buffer: client.responseBody || client.response,
                                text: options.responseArrayBuffer ? undefined : client.responseText,
                            };
                            client.getAllResponseHeaders().split(/\r?\n/).forEach(function (l) {
                                var m = /^\s*([^:]+): (.*)/.exec(l);
                                if (m)
                                    res_1.headers[m[1].toLowerCase()] = m[2];
                            });
                            resolve(res_1);
                        }
                    };
                    var data = options.data;
                    var method = options.method || (data == null ? "GET" : "POST");
                    var buf;
                    if (data == null) {
                        buf = null;
                    }
                    else if (data instanceof Uint8Array) {
                        buf = data;
                    }
                    else if (typeof data == "object") {
                        buf = JSON.stringify(data);
                        headers["content-type"] = "application/json; charset=utf8";
                    }
                    else if (typeof data == "string") {
                        buf = data;
                    }
                    else {
                        pxtc.Util.oops("bad data");
                    }
                    client.open(method, options.url);
                    Object.keys(headers).forEach(function (k) {
                        client.setRequestHeader(k, headers[k]);
                    });
                    if (buf == null)
                        client.send();
                    else
                        client.send(buf);
                });
            }
            var sha256_k = new Uint32Array([
                0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
            ]);
            function rotr(v, b) {
                return (v >>> b) | (v << (32 - b));
            }
            function sha256round(hs, w) {
                pxtc.Util.assert(hs.length == 8);
                pxtc.Util.assert(w.length == 64);
                for (var i = 16; i < 64; ++i) {
                    var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                    var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                }
                var a = hs[0];
                var b = hs[1];
                var c = hs[2];
                var d = hs[3];
                var e = hs[4];
                var f = hs[5];
                var g = hs[6];
                var h = hs[7];
                for (var i = 0; i < 64; ++i) {
                    var s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                    var ch = (e & f) ^ (~e & g);
                    var temp1 = (h + s1 + ch + sha256_k[i] + w[i]) | 0;
                    var s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                    var maj = (a & b) ^ (a & c) ^ (b & c);
                    var temp2 = (s0 + maj) | 0;
                    h = g;
                    g = f;
                    f = e;
                    e = (d + temp1) | 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (temp1 + temp2) | 0;
                }
                hs[0] += a;
                hs[1] += b;
                hs[2] += c;
                hs[3] += d;
                hs[4] += e;
                hs[5] += f;
                hs[6] += g;
                hs[7] += h;
            }
            function sha256buffer(buf) {
                var h = new Uint32Array(8);
                h[0] = 0x6a09e667;
                h[1] = 0xbb67ae85;
                h[2] = 0x3c6ef372;
                h[3] = 0xa54ff53a;
                h[4] = 0x510e527f;
                h[5] = 0x9b05688c;
                h[6] = 0x1f83d9ab;
                h[7] = 0x5be0cd19;
                var work = new Uint32Array(64);
                var chunkLen = 16 * 4;
                function addBuf(buf) {
                    var end = buf.length - (chunkLen - 1);
                    for (var i = 0; i < end; i += chunkLen) {
                        for (var j = 0; j < 16; j++) {
                            var off = (j << 2) + i;
                            work[j] = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
                        }
                        sha256round(h, work);
                    }
                }
                addBuf(buf);
                var padSize = 64 - (buf.length + 9) % 64;
                if (padSize == 64)
                    padSize = 0;
                var endPos = buf.length - (buf.length % chunkLen);
                var padBuf = new Uint8Array((buf.length - endPos) + 1 + padSize + 8);
                var dst = 0;
                while (endPos < buf.length)
                    padBuf[dst++] = buf[endPos++];
                padBuf[dst++] = 0x80;
                while (padSize-- > 0)
                    padBuf[dst++] = 0x00;
                var len = buf.length * 8;
                dst = padBuf.length;
                while (len > 0) {
                    padBuf[--dst] = len & 0xff;
                    len >>= 8;
                }
                addBuf(padBuf);
                var res = "";
                for (var i = 0; i < h.length; ++i)
                    res += ("000000000" + h[i].toString(16)).slice(-8);
                return res.toLowerCase();
            }
            BrowserImpl.sha256buffer = sha256buffer;
            function sha256string(s) {
                return sha256buffer(pxtc.Util.stringToUint8Array(pxtc.Util.toUTF8(s)));
            }
            BrowserImpl.sha256string = sha256string;
        })(BrowserImpl = pxtc.BrowserImpl || (pxtc.BrowserImpl = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
/// <reference path="../localtypings/pxtpackage.d.ts"/>
/// <reference path="../localtypings/pxtparts.d.ts"/>
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="util.ts"/>
var pxt;
(function (pxt) {
    pxt.U = pxtc.Util;
    pxt.Util = pxtc.Util;
    var lf = pxt.U.lf;
    function setAppTarget(trg) {
        pxt.appTarget = trg || {};
        // patch-up the target
        var comp = pxt.appTarget.compile;
        if (!comp)
            comp = pxt.appTarget.compile = { isNative: false, hasHex: false };
        if (comp.hasHex && comp.jsRefCounting === undefined)
            comp.jsRefCounting = true;
        if (!comp.hasHex && comp.floatingPoint === undefined)
            comp.floatingPoint = true;
        if (comp.hasHex && !comp.nativeType)
            comp.nativeType = pxtc.NATIVE_TYPE_THUMB;
        if (comp.nativeType == pxtc.NATIVE_TYPE_AVR || comp.nativeType == pxtc.NATIVE_TYPE_AVRVM) {
            comp.shortPointers = true;
            comp.flashCodeAlign = 0x10;
        }
        if (comp.nativeType == pxtc.NATIVE_TYPE_CS) {
            comp.floatingPoint = true;
            comp.needsUnboxing = true;
            comp.jsRefCounting = false;
        }
        if (comp.taggedInts) {
            comp.floatingPoint = true;
            comp.needsUnboxing = true;
        }
        if (!pxt.appTarget.appTheme)
            pxt.appTarget.appTheme = {};
        if (!pxt.appTarget.appTheme.embedUrl)
            pxt.appTarget.appTheme.embedUrl = pxt.appTarget.appTheme.homeUrl;
        var cs = pxt.appTarget.compileService;
        if (cs) {
            if (cs.yottaTarget && !cs.yottaBinary)
                cs.yottaBinary = "pxt-microbit-app-combined.hex";
        }
    }
    pxt.setAppTarget = setAppTarget;
    pxt.options = {};
    // general error reported
    pxt.debug = typeof console !== "undefined" && !!console.debug
        ? function (msg) {
            if (pxt.options.debug)
                console.debug(msg);
        } : function () { };
    pxt.log = typeof console !== "undefined" && !!console.log
        ? function (msg) {
            console.log(msg);
        } : function () { };
    pxt.reportException = function (e, d) {
        if (console) {
            console.error(e);
            if (d) {
                try {
                    // log it as object, so native object inspector can be used
                    console.log(d);
                    //pxt.log(JSON.stringify(d, null, 2))
                }
                catch (e) { }
            }
        }
    };
    pxt.reportError = function (cat, msg, data) {
        if (console) {
            console.error(cat + ": " + msg);
            if (data) {
                try {
                    pxt.log(JSON.stringify(data, null, 2));
                }
                catch (e) { }
            }
        }
    };
    /**
     * Track an event.
     */
    pxt.tickEvent = function (id) { };
    var activityEvents = {};
    var tickActivityDebounced = pxt.Util.debounce(function () {
        pxt.tickEvent("activity", activityEvents);
        activityEvents = {};
    }, 10000, false);
    /**
     * Ticks activity events. This event gets aggregated and eventually gets sent.
     */
    function tickActivity() {
        var ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ids[_i] = arguments[_i];
        }
        ids.filter(function (id) { return !!id; }).map(function (id) { return id.slice(0, 64); })
            .forEach(function (id) { return activityEvents[id] = (activityEvents[id] || 0) + 1; });
        tickActivityDebounced();
    }
    pxt.tickActivity = tickActivity;
    function localWebConfig() {
        var r = {
            relprefix: "/--",
            workerjs: "/worker.js",
            tdworkerjs: "/tdworker.js",
            monacoworkerjs: "/monacoworker.js",
            pxtVersion: "local",
            pxtRelId: "",
            pxtCdnUrl: "/cdn/",
            commitCdnUrl: "/cdn/",
            blobCdnUrl: "/blb/",
            cdnUrl: "/cdn/",
            targetUrl: "",
            targetVersion: "local",
            targetRelId: "",
            targetId: pxt.appTarget ? pxt.appTarget.id : "",
            simUrl: "/sim/simulator.html",
            partsUrl: "/sim/siminstructions.html"
        };
        return r;
    }
    pxt.localWebConfig = localWebConfig;
    function getOnlineCdnUrl() {
        if (!pxt.webConfig)
            return null;
        var m = /^(https:\/\/[^\/]+)/.exec(pxt.webConfig.commitCdnUrl);
        if (m)
            return m[1];
        else
            return null;
    }
    pxt.getOnlineCdnUrl = getOnlineCdnUrl;
    function setupWebConfig(cfg) {
        if (cfg)
            pxt.webConfig = cfg;
        else if (!pxt.webConfig)
            pxt.webConfig = localWebConfig();
    }
    pxt.setupWebConfig = setupWebConfig;
    function getEmbeddedScript(id) {
        return pxt.U.lookup(pxt.appTarget.bundledpkgs || {}, id);
    }
    pxt.getEmbeddedScript = getEmbeddedScript;
    var _targetConfig = undefined;
    function targetConfigAsync() {
        return _targetConfig ? Promise.resolve(_targetConfig)
            : pxt.Cloud.downloadTargetConfigAsync()
                .then(function (js) { _targetConfig = js; return _targetConfig; }, function (err) { _targetConfig = undefined; return undefined; });
    }
    pxt.targetConfigAsync = targetConfigAsync;
    function packagesConfigAsync() {
        return targetConfigAsync().then(function (config) { return config ? config.packages : undefined; });
    }
    pxt.packagesConfigAsync = packagesConfigAsync;
    pxt.CONFIG_NAME = "pxt.json";
    pxt.SERIAL_EDITOR_FILE = "serial.txt";
    pxt.CLOUD_ID = "pxt/";
    pxt.BLOCKS_PROJECT_NAME = "blocksprj";
    pxt.JAVASCRIPT_PROJECT_NAME = "tsprj";
    function outputName(trg) {
        if (trg === void 0) { trg = null; }
        if (!trg)
            trg = pxt.appTarget.compile;
        if (trg.nativeType == ts.pxtc.NATIVE_TYPE_CS)
            return ts.pxtc.BINARY_CS;
        if (trg.useUF2)
            return ts.pxtc.BINARY_UF2;
        else if (trg.useELF)
            return ts.pxtc.BINARY_ELF;
        else
            return ts.pxtc.BINARY_HEX;
    }
    pxt.outputName = outputName;
    function isOutputText(trg) {
        if (trg === void 0) { trg = null; }
        return outputName(trg) == ts.pxtc.BINARY_HEX;
    }
    pxt.isOutputText = isOutputText;
})(pxt || (pxt = {}));
/// <reference path="main.ts"/>
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        function normalizeBlock(b) {
            if (!b)
                return b;
            // normalize and validate common errors
            // made while translating
            var nb = b.replace(/%\s+/g, '%');
            if (nb != b) {
                pxt.log("block has extra spaces: " + b);
                return b;
            }
            nb = nb.replace(/\s*\|\s*/g, '|');
            return nb;
        }
        blocks.normalizeBlock = normalizeBlock;
        function parameterNames(fn) {
            // collect blockly parameter name mapping
            var instance = (fn.kind == ts.pxtc.SymbolKind.Method || fn.kind == ts.pxtc.SymbolKind.Property) && !fn.attributes.defaultInstance;
            var attrNames = {};
            var handlerArgs = [];
            if (instance)
                attrNames["this"] = { name: "this", type: fn.namespace };
            if (fn.parameters)
                fn.parameters.forEach(function (pr) {
                    attrNames[pr.name] = {
                        name: pr.name,
                        type: pr.type,
                        shadowValue: pr.default || undefined
                    };
                    if (pr.handlerParameters) {
                        pr.handlerParameters.forEach(function (arg) { return handlerArgs.push(arg); });
                    }
                });
            if (fn.attributes.block) {
                Object.keys(attrNames).forEach(function (k) { return attrNames[k].name = ""; });
                var rx = /%([a-zA-Z0-9_]+)(=([a-zA-Z0-9_]+))?/g;
                var m = void 0;
                var i = 0;
                while (m = rx.exec(fn.attributes.block)) {
                    if (i == 0 && instance) {
                        attrNames["this"].name = m[1];
                        if (m[3])
                            attrNames["this"].shadowType = m[3];
                        m = rx.exec(fn.attributes.block);
                        if (!m)
                            break;
                    }
                    var at = attrNames[fn.parameters[i++].name];
                    at.name = m[1];
                    if (m[3])
                        at.shadowType = m[3];
                }
            }
            return {
                attrNames: attrNames,
                handlerArgs: handlerArgs
            };
        }
        blocks.parameterNames = parameterNames;
        function parseFields(b) {
            // normalize and validate common errors
            // made while translating
            return b.split('|').map(function (n, ni) {
                var m = /([^%]*)\s*%([a-zA-Z0-9_]+)/.exec(n);
                if (!m)
                    return { n: n, ni: ni };
                var pre = m[1];
                if (pre)
                    pre = pre.trim();
                var p = m[2];
                return { n: n, ni: ni, pre: pre, p: p };
            });
        }
        blocks.parseFields = parseFields;
        var _blockDefinitions;
        function blockDefinitions() {
            if (!_blockDefinitions)
                cacheBlockDefinitions();
            return _blockDefinitions;
        }
        blocks.blockDefinitions = blockDefinitions;
        function getBlockDefinition(blockId) {
            if (!_blockDefinitions)
                cacheBlockDefinitions();
            return _blockDefinitions[blockId];
        }
        blocks.getBlockDefinition = getBlockDefinition;
        // Resources for built-in and extra blocks
        function cacheBlockDefinitions() {
            _blockDefinitions = {
                'device_while': {
                    name: pxt.Util.lf("a loop that repeats while the condition is true"),
                    tooltip: pxt.Util.lf("Run the same sequence of actions while the condition is met."),
                    url: '/blocks/loops/while',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("while %1"),
                        appendField: pxt.Util.lf("{id:while}do")
                    }
                },
                'controls_simple_for': {
                    name: pxt.Util.lf("a loop that repeats the number of times you say"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take on the values from 0 to the end number, counting by 1, and do the specified blocks."),
                    url: 'blocks/loops/for',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for %1 from 0 to %2"),
                        variable: pxt.Util.lf("{id:var}index"),
                        appendField: pxt.Util.lf("{id:for}do")
                    }
                },
                'controls_for_of': {
                    name: pxt.Util.lf("a loop that repeats for each value in an array"),
                    tooltip: pxt.Util.lf("Have the variable '{0}' take the value of each item in the array one by one, and do the specified blocks."),
                    url: 'blocks/loops/for-of',
                    category: 'loops',
                    block: {
                        message0: pxt.Util.lf("for element %1 of %2"),
                        variable: pxt.Util.lf("{id:var}value"),
                        appendField: pxt.Util.lf("{id:for_of}do")
                    }
                },
                'math_op2': {
                    name: pxt.Util.lf("minimum or maximum of 2 numbers"),
                    tooltip: {
                        "min": pxt.Util.lf("smaller value of 2 numbers"),
                        "max": pxt.Util.lf("larger value of 2 numbers")
                    },
                    url: '/blocks/math',
                    operators: {
                        'op': ["min", "max"]
                    },
                    category: 'math'
                },
                'math_op3': {
                    name: pxt.Util.lf("absolute number"),
                    tooltip: pxt.Util.lf("absolute value of a number"),
                    url: '/reference/math',
                    category: 'math',
                    block: {
                        message0: pxt.Util.lf("absolute of %1")
                    }
                },
                'math_number': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math'
                },
                'math_number_minmax': {
                    name: pxt.Util.lf("{id:block}number"),
                    url: '/blocks/math/random',
                    category: 'math'
                },
                'math_arithmetic': {
                    name: pxt.Util.lf("arithmetic operation"),
                    url: '/blocks/math',
                    tooltip: {
                        ADD: pxt.Util.lf("Return the sum of the two numbers."),
                        MINUS: pxt.Util.lf("Return the difference of the two numbers."),
                        MULTIPLY: pxt.Util.lf("Return the product of the two numbers."),
                        DIVIDE: pxt.Util.lf("Return the quotient of the two numbers."),
                        POWER: pxt.Util.lf("Return the first number raised to the power of the second number."),
                    },
                    operators: {
                        'OP': ["ADD", "MINUS", "MULTIPLY", "DIVIDE", "POWER"]
                    },
                    category: 'math',
                    block: {
                        MATH_ADDITION_SYMBOL: pxt.Util.lf("{id:op}+"),
                        MATH_SUBTRACTION_SYMBOL: pxt.Util.lf("{id:op}-"),
                        MATH_MULTIPLICATION_SYMBOL: pxt.Util.lf("{id:op}×"),
                        MATH_DIVISION_SYMBOL: pxt.Util.lf("{id:op}÷"),
                        MATH_POWER_SYMBOL: pxt.Util.lf("{id:op}^")
                    }
                },
                'math_modulo': {
                    name: pxt.Util.lf("division remainder"),
                    tooltip: pxt.Util.lf("Return the remainder from dividing the two numbers."),
                    url: '/blocks/math',
                    category: 'math',
                    block: {
                        MATH_MODULO_TITLE: pxt.Util.lf("remainder of %1 ÷ %2")
                    }
                },
                'variables_change': {
                    name: pxt.Util.lf("update the value of a number variable"),
                    tooltip: pxt.Util.lf("Changes the value of the variable by this amount"),
                    url: '/blocks/variables/change',
                    category: 'variables',
                    block: {
                        message0: pxt.Util.lf("change %1 by %2")
                    }
                },
                'controls_repeat_ext': {
                    name: pxt.Util.lf("a loop that repeats and increments an index"),
                    tooltip: pxt.Util.lf("Do some statements several times."),
                    url: '/blocks/loops/repeat',
                    category: 'loops',
                    block: {
                        CONTROLS_REPEAT_TITLE: pxt.Util.lf("repeat %1 times"),
                        CONTROLS_REPEAT_INPUT_DO: pxt.Util.lf("{id:repeat}do")
                    }
                },
                'variables_get': {
                    name: pxt.Util.lf("get the value of a variable"),
                    tooltip: pxt.Util.lf("Returns the value of this variable."),
                    url: '/blocks/variables',
                    category: 'variables',
                    block: {
                        VARIABLES_GET_CREATE_SET: pxt.Util.lf("Create 'set %1'")
                    }
                },
                'variables_set': {
                    name: pxt.Util.lf("assign the value of a variable"),
                    tooltip: pxt.Util.lf("Sets this variable to be equal to the input."),
                    url: '/blocks/variables/assign',
                    category: 'variables',
                    block: {
                        VARIABLES_SET: pxt.Util.lf("set %1 to %2")
                    }
                },
                'controls_if': {
                    name: pxt.Util.lf("a conditional statement"),
                    tooltip: {
                        CONTROLS_IF_TOOLTIP_1: pxt.Util.lf("If a value is true, then do some statements."),
                        CONTROLS_IF_TOOLTIP_2: pxt.Util.lf("If a value is true, then do the first block of statements. Otherwise, do the second block of statements."),
                        CONTROLS_IF_TOOLTIP_3: pxt.Util.lf("If the first value is true, then do the first block of statements. Otherwise, if the second value is true, do the second block of statements."),
                        CONTROLS_IF_TOOLTIP_4: pxt.Util.lf("If the first value is true, then do the first block of statements. Otherwise, if the second value is true, do the second block of statements. If none of the values are true, do the last block of statements.")
                    },
                    tooltipSearch: "CONTROLS_IF_TOOLTIP_2",
                    url: '/blocks/logic/if',
                    category: 'logic',
                    block: {
                        CONTROLS_IF_MSG_IF: pxt.Util.lf("{id:logic}if"),
                        CONTROLS_IF_MSG_THEN: pxt.Util.lf("{id:logic}then"),
                        CONTROLS_IF_MSG_ELSE: pxt.Util.lf("{id:logic}else"),
                        CONTROLS_IF_MSG_ELSEIF: pxt.Util.lf("{id:logic}else if")
                    }
                },
                'lists_create_with': {
                    name: pxt.Util.lf("create an array"),
                    tooltip: pxt.Util.lf("Creates a new array."),
                    url: '/reference/arrays/create',
                    category: 'arrays',
                    blockTextSearch: "LISTS_CREATE_WITH_INPUT_WITH",
                    block: {
                        LISTS_CREATE_EMPTY_TITLE: pxt.Util.lf("create empty array"),
                        LISTS_CREATE_WITH_INPUT_WITH: pxt.Util.lf("create array with"),
                        LISTS_CREATE_WITH_CONTAINER_TITLE_ADD: pxt.Util.lf("array"),
                        LISTS_CREATE_WITH_ITEM_TITLE: pxt.Util.lf("value")
                    }
                },
                'lists_length': {
                    name: pxt.Util.lf("array length"),
                    tooltip: pxt.Util.lf("Returns the number of items in an array."),
                    url: '/reference/arrays/length',
                    category: 'arrays',
                    block: {
                        LISTS_LENGTH_TITLE: pxt.Util.lf("length of array %1")
                    }
                },
                'lists_index_get': {
                    name: pxt.Util.lf("get a value in an array"),
                    tooltip: pxt.Util.lf("Returns the value at the given index in an array."),
                    url: '/reference/arrays/get',
                    category: 'arrays',
                    block: {
                        message0: pxt.Util.lf("%1 get value at %2")
                    }
                },
                'lists_index_set': {
                    name: pxt.Util.lf("set a value in an array"),
                    tooltip: pxt.Util.lf("Sets the value at the given index in an array"),
                    url: '/reference/arrays/set',
                    category: 'arrays',
                    block: {
                        message0: pxt.Util.lf("%1 set value at %2 to %3")
                    }
                },
                'logic_compare': {
                    name: pxt.Util.lf("comparing two numbers"),
                    tooltip: {
                        LOGIC_COMPARE_TOOLTIP_EQ: pxt.Util.lf("Return true if both inputs equal each other."),
                        LOGIC_COMPARE_TOOLTIP_NEQ: pxt.Util.lf("Return true if both inputs are not equal to each other."),
                        LOGIC_COMPARE_TOOLTIP_LT: pxt.Util.lf("Return true if the first input is smaller than the second input."),
                        LOGIC_COMPARE_TOOLTIP_LTE: pxt.Util.lf("Return true if the first input is smaller than or equal to the second input."),
                        LOGIC_COMPARE_TOOLTIP_GT: pxt.Util.lf("Return true if the first input is greater than the second input."),
                        LOGIC_COMPARE_TOOLTIP_GTE: pxt.Util.lf("Return true if the first input is greater than or equal to the second input.")
                    },
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        search: "= ≠ < ≤ > ≥" // Only used for search; this string is not surfaced in the block's text
                    }
                },
                'logic_operation': {
                    name: pxt.Util.lf("boolean operation"),
                    tooltip: {
                        LOGIC_OPERATION_TOOLTIP_AND: pxt.Util.lf("Return true if both inputs are true."),
                        LOGIC_OPERATION_TOOLTIP_OR: pxt.Util.lf("Return true if at least one of the inputs is true.")
                    },
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_OPERATION_AND: pxt.Util.lf("{id:op}and"),
                        LOGIC_OPERATION_OR: pxt.Util.lf("{id:op}or")
                    }
                },
                'logic_negate': {
                    name: pxt.Util.lf("logical negation"),
                    tooltip: pxt.Util.lf("Returns true if the input is false. Returns false if the input is true."),
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_NEGATE_TITLE: pxt.Util.lf("not %1")
                    }
                },
                'logic_boolean': {
                    name: pxt.Util.lf("a `true` or `false` value"),
                    tooltip: pxt.Util.lf("Returns either true or false."),
                    url: '/blocks/logic/boolean',
                    category: 'logic',
                    block: {
                        LOGIC_BOOLEAN_TRUE: pxt.Util.lf("{id:boolean}true"),
                        LOGIC_BOOLEAN_FALSE: pxt.Util.lf("{id:boolean}false")
                    }
                },
                'text': {
                    name: pxt.Util.lf("a piece of text"),
                    tooltip: pxt.Util.lf("A letter, word, or line of text."),
                    url: 'types/string',
                    category: 'text',
                    block: {
                        search: pxt.Util.lf("a piece of text") // Only used for search; this string is not surfaced in the block's text
                    }
                },
                'text_length': {
                    name: pxt.Util.lf("number of characters in the string"),
                    tooltip: pxt.Util.lf("Returns the number of letters (including spaces) in the provided text."),
                    url: 'reference/text/length',
                    category: 'text',
                    block: {
                        TEXT_LENGTH_TITLE: pxt.Util.lf("length of %1")
                    }
                },
                'text_join': {
                    name: pxt.Util.lf("join items to create text"),
                    tooltip: pxt.Util.lf("Create a piece of text by joining together any number of items."),
                    url: 'reference/text/join',
                    category: 'text',
                    block: {
                        TEXT_JOIN_TITLE_CREATEWITH: pxt.Util.lf("join")
                    }
                },
                'procedures_defnoreturn': {
                    name: pxt.Util.lf("define the function"),
                    tooltip: pxt.Util.lf("Create a function."),
                    url: 'types/function/define',
                    category: 'functions',
                    block: {
                        PROCEDURES_DEFNORETURN_TITLE: pxt.Util.lf("function"),
                        PROCEDURE_ALREADY_EXISTS: pxt.Util.lf("A function named '%1' already exists.")
                    }
                },
                'procedures_callnoreturn': {
                    name: pxt.Util.lf("call the function"),
                    tooltip: pxt.Util.lf("Call the user-defined function."),
                    url: 'types/function/call',
                    category: 'functions',
                    block: {
                        PROCEDURES_CALLNORETURN_TITLE: pxt.Util.lf("call function")
                    }
                }
            };
            _blockDefinitions[pxtc.ON_START_TYPE] = {
                name: pxt.Util.lf("on start event"),
                tooltip: pxt.Util.lf("Run code when the program starts"),
                url: '/blocks/on-start',
                category: "loops",
                block: {
                    message0: pxt.Util.lf("on start %1 %2")
                }
            };
            _blockDefinitions[pxtc.PAUSE_UNTIL_TYPE] = {
                name: pxt.Util.lf("pause until"),
                tooltip: pxt.Util.lf("Pause execution of code until the given boolean expression is true"),
                url: '/blocks/pause-until',
                category: "loops",
                block: {
                    message0: pxt.Util.lf("pause until %1")
                }
            };
        }
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var BrowserUtils;
    (function (BrowserUtils) {
        function isIFrame() {
            try {
                return window && window.self !== window.top;
            }
            catch (e) {
                return true;
            }
        }
        BrowserUtils.isIFrame = isIFrame;
        function hasNavigator() {
            return typeof navigator !== "undefined";
        }
        BrowserUtils.hasNavigator = hasNavigator;
        function isWindows() {
            return hasNavigator() && /(Win32|Win64|WOW64)/i.test(navigator.platform);
        }
        BrowserUtils.isWindows = isWindows;
        function isWindows10() {
            return hasNavigator() && /(Win32|Win64|WOW64)/i.test(navigator.platform) && /Windows NT 10/i.test(navigator.userAgent);
        }
        BrowserUtils.isWindows10 = isWindows10;
        function isMobile() {
            return hasNavigator() && /mobi/i.test(navigator.userAgent);
        }
        BrowserUtils.isMobile = isMobile;
        //MacIntel on modern Macs
        function isMac() {
            return hasNavigator() && /Mac/i.test(navigator.platform);
        }
        BrowserUtils.isMac = isMac;
        //This is generally appears for Linux
        //Android *sometimes* returns this
        function isLinux() {
            return !!navigator && /Linux/i.test(navigator.platform);
        }
        BrowserUtils.isLinux = isLinux;
        // Detects if we are running on ARM (Raspberry pi)
        function isARM() {
            return hasNavigator() && /arm/i.test(navigator.platform);
        }
        BrowserUtils.isARM = isARM;
        // Detects if we are running inside the UWP runtime (Edge)
        function isUwpEdge() {
            return typeof window !== "undefined" && !!window.Windows;
        }
        BrowserUtils.isUwpEdge = isUwpEdge;
        /*
        Notes on browser detection
    
        Actually:   Claims to be:
                    IE  Edge    Chrome  Safari  Firefox
        IE          X                   X?
        Edge            X       X       X
        Chrome                  X       X
        Safari                          X       X
        Firefox                                 X
    
        I allow Opera to go about claiming to be Chrome because it might as well be
        */
        //Edge lies about its user agent and claims to be Chrome, but Edge/Version
        //is always at the end
        function isEdge() {
            return hasNavigator() && /Edge/i.test(navigator.userAgent);
        }
        BrowserUtils.isEdge = isEdge;
        //IE11 also lies about its user agent, but has Trident appear somewhere in
        //the user agent. Detecting the different between IE11 and Edge isn't
        //super-important because the UI is similar enough
        function isIE() {
            return hasNavigator() && /Trident/i.test(navigator.userAgent);
        }
        BrowserUtils.isIE = isIE;
        //Edge and IE11 lie about being Chrome
        function isChrome() {
            return !isEdge() && !isIE() && !!navigator && (/Chrome/i.test(navigator.userAgent) || /Chromium/i.test(navigator.userAgent));
        }
        BrowserUtils.isChrome = isChrome;
        //Chrome and Edge lie about being Safari
        function isSafari() {
            //Could also check isMac but I don't want to risk excluding iOS
            //Checking for iPhone, iPod or iPad as well as Safari in order to detect home screen browsers on iOS
            return !isChrome() && !isEdge() && !!navigator && /(Safari|iPod|iPhone|iPad)/i.test(navigator.userAgent);
        }
        BrowserUtils.isSafari = isSafari;
        //Safari and WebKit lie about being Firefox
        function isFirefox() {
            return !isSafari() && !!navigator && (/Firefox/i.test(navigator.userAgent) || /Seamonkey/i.test(navigator.userAgent));
        }
        BrowserUtils.isFirefox = isFirefox;
        //These days Opera's core is based on Chromium so we shouldn't distinguish between them too much
        function isOpera() {
            return hasNavigator() && /Opera|OPR/i.test(navigator.userAgent);
        }
        BrowserUtils.isOpera = isOpera;
        //Midori *was* the default browser on Raspbian, however isn't any more
        function isMidori() {
            return hasNavigator() && /Midori/i.test(navigator.userAgent);
        }
        BrowserUtils.isMidori = isMidori;
        //Epiphany (code name for GNOME Web) is the default browser on Raspberry Pi
        //Epiphany also lies about being Chrome, Safari, and Chromium
        function isEpiphany() {
            return hasNavigator() && /Epiphany/i.test(navigator.userAgent);
        }
        BrowserUtils.isEpiphany = isEpiphany;
        function isTouchEnabled() {
            return typeof window !== "undefined" &&
                ('ontouchstart' in window // works on most browsers 
                    || navigator.maxTouchPoints > 0); // works on IE10/11 and Surface);
        }
        BrowserUtils.isTouchEnabled = isTouchEnabled;
        function hasPointerEvents() {
            return typeof window != "undefined" && !!window.PointerEvent;
        }
        BrowserUtils.hasPointerEvents = hasPointerEvents;
        function hasSaveAs() {
            return isEdge() || isIE() || isFirefox();
        }
        BrowserUtils.hasSaveAs = hasSaveAs;
        function os() {
            if (isWindows())
                return "windows";
            else if (isMac())
                return "mac";
            else if (isLinux() && isARM())
                return "rpi";
            else if (isLinux())
                return "linux";
            else
                return "unknown";
        }
        BrowserUtils.os = os;
        function browser() {
            if (isEdge())
                return "edge";
            if (isEpiphany())
                return "epiphany";
            else if (isMidori())
                return "midori";
            else if (isOpera())
                return "opera";
            else if (isIE())
                return "ie";
            else if (isChrome())
                return "chrome";
            else if (isSafari())
                return "safari";
            else if (isFirefox())
                return "firefox";
            else
                return "unknown";
        }
        BrowserUtils.browser = browser;
        function browserVersion() {
            if (!hasNavigator())
                return null;
            //Unsurprisingly browsers also lie about this and include other browser versions...
            var matches = [];
            if (isOpera()) {
                matches = /(Opera|OPR)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            if (isEpiphany()) {
                matches = /Epiphany\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isMidori()) {
                matches = /Midori\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isSafari()) {
                matches = /Version\/([0-9\.]+)/i.exec(navigator.userAgent);
                // pinned web site have a different user agent
                // Mozilla/5.0 (iPhone; CPU iPhone OS 10_2_1 like Mac OS X) AppleWebKit/602.4.6 (KHTML, like Gecko) Mobile/14D27
                // Mozilla/5.0 (iPad; CPU OS 10_3_3 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60
                if (!matches)
                    matches = /(iPod|iPhone|iPad); CPU .*?OS (\d+)/i.exec(navigator.userAgent);
            }
            else if (isChrome()) {
                matches = /(Chrome|Chromium)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isEdge()) {
                matches = /Edge\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else if (isIE()) {
                matches = /(MSIE |rv:)([0-9\.]+)/i.exec(navigator.userAgent);
            }
            else {
                matches = /(Firefox|Seamonkey)\/([0-9\.]+)/i.exec(navigator.userAgent);
            }
            if (!matches || matches.length == 0) {
                return null;
            }
            return matches[matches.length - 1];
        }
        BrowserUtils.browserVersion = browserVersion;
        var hasLoggedBrowser = false;
        function isBrowserSupported() {
            if (!navigator) {
                return true; //All browsers define this, but we can't make any predictions if it isn't defined, so assume the best
            }
            // allow bots in general
            if (/bot|crawler|spider|crawling/i.test(navigator.userAgent))
                return true;
            // testing browser versions
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            var isRecentChrome = isChrome() && v >= 38;
            var isRecentFirefox = isFirefox() && v >= 31;
            var isRecentEdge = isEdge();
            var isRecentSafari = isSafari() && v >= 9;
            var isRecentOpera = (isOpera() && isChrome()) && v >= 21;
            var isRecentIE = isIE() && v >= 11;
            var isModernBrowser = isRecentChrome || isRecentFirefox || isRecentEdge || isRecentSafari || isRecentOpera || isRecentIE;
            //In the future this should check for the availability of features, such
            //as web workers
            var isSupported = isModernBrowser;
            var isUnsupportedRPI = isMidori() || (isLinux() && isARM() && isEpiphany());
            var isNotSupported = isUnsupportedRPI;
            isSupported = isSupported && !isNotSupported;
            //Bypass
            isSupported = isSupported || /anybrowser=(true|1)/.test(window.location.href);
            if (!hasLoggedBrowser) {
                pxt.log("Browser: " + browser() + " " + versionString + " on " + os());
                if (!isSupported) {
                    pxt.tickEvent("browser.unsupported." + navigator.userAgent);
                }
                hasLoggedBrowser = true;
            }
            return isSupported;
        }
        BrowserUtils.isBrowserSupported = isBrowserSupported;
        function devicePixelRatio() {
            if (typeof window === "undefined" || !window.screen)
                return 1;
            if (window.screen.systemXDPI !== undefined
                && window.screen.logicalXDPI !== undefined
                && window.screen.systemXDPI > window.screen.logicalXDPI) {
                return window.screen.systemXDPI / window.screen.logicalXDPI;
            }
            else if (window && window.devicePixelRatio !== undefined) {
                return window.devicePixelRatio;
            }
            return 1;
        }
        BrowserUtils.devicePixelRatio = devicePixelRatio;
        function browserDownloadBinText(text, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(btoa(text), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadBinText = browserDownloadBinText;
        function browserDownloadText(text, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(btoa(pxt.Util.toUTF8(text)), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadText = browserDownloadText;
        function isBrowserDownloadInSameWindow() {
            var windowOpen = isMobile() && isSafari() && !/downloadWindowOpen=0/i.test(window.location.href);
            return windowOpen;
        }
        BrowserUtils.isBrowserDownloadInSameWindow = isBrowserDownloadInSameWindow;
        // for browsers that strictly require that a download gets initiated within a user click
        function isBrowserDownloadWithinUserContext() {
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            var r = (isMobile() && isSafari() && v >= 11) || /downloadUserContext=1/i.test(window.location.href);
            return r;
        }
        BrowserUtils.isBrowserDownloadWithinUserContext = isBrowserDownloadWithinUserContext;
        function browserDownloadDataUri(uri, name, userContextWindow) {
            var windowOpen = isBrowserDownloadInSameWindow();
            var versionString = browserVersion();
            var v = parseInt(versionString || "0");
            if (windowOpen) {
                if (userContextWindow)
                    userContextWindow.location.href = uri;
                else
                    window.open(uri, "_self");
            }
            else if (pxt.BrowserUtils.isSafari()
                && (v < 10 || (versionString.indexOf('10.0') == 0) || isMobile())) {
                // For Safari versions prior to 10.1 and all Mobile Safari versions
                // For mysterious reasons, the "link" trick closes the
                // PouchDB database
                var iframe = document.getElementById("downloader");
                if (!iframe) {
                    pxt.debug('injecting downloader iframe');
                    iframe = document.createElement("iframe");
                    iframe.id = "downloader";
                    iframe.style.position = "absolute";
                    iframe.style.right = "0";
                    iframe.style.bottom = "0";
                    iframe.style.zIndex = "-1";
                    iframe.style.width = "1px";
                    iframe.style.height = "1px";
                    document.body.appendChild(iframe);
                }
                iframe.src = uri;
            }
            else if (pxt.BrowserUtils.isEdge() || pxt.BrowserUtils.isIE()) {
                //Fix for edge
                var byteString = atob(uri.split(',')[1]);
                var ia = pxt.Util.stringToUint8Array(byteString);
                var blob = new Blob([ia], { type: "img/png" });
                window.navigator.msSaveOrOpenBlob(blob, name);
            }
            else {
                var link = window.document.createElement('a');
                if (typeof link.download == "string") {
                    link.href = uri;
                    link.download = name;
                    document.body.appendChild(link); // for FF
                    link.click();
                    document.body.removeChild(link);
                }
                else {
                    document.location.href = uri;
                }
            }
        }
        BrowserUtils.browserDownloadDataUri = browserDownloadDataUri;
        function browserDownloadUInt8Array(buf, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            return browserDownloadBase64(btoa(pxt.Util.uint8ArrayToString(buf)), name, contentType, userContextWindow, onError);
        }
        BrowserUtils.browserDownloadUInt8Array = browserDownloadUInt8Array;
        function toDownloadDataUri(b64, contentType) {
            var protocol = "data";
            if (isMobile() && isSafari() && pxt.appTarget.appTheme.mobileSafariDownloadProtocol)
                protocol = pxt.appTarget.appTheme.mobileSafariDownloadProtocol;
            var m = /downloadProtocol=([a-z0-9:/?]+)/i.exec(window.location.href);
            if (m)
                protocol = m[1];
            var dataurl = protocol + ":" + contentType + ";base64," + b64;
            return dataurl;
        }
        BrowserUtils.toDownloadDataUri = toDownloadDataUri;
        function browserDownloadBase64(b64, name, contentType, userContextWindow, onError) {
            if (contentType === void 0) { contentType = "application/octet-stream"; }
            pxt.debug('trigger download');
            var saveBlob = window.navigator.msSaveOrOpenBlob && !pxt.BrowserUtils.isMobile();
            var dataurl = toDownloadDataUri(b64, name);
            try {
                if (saveBlob) {
                    var b = new Blob([pxt.Util.stringToUint8Array(atob(b64))], { type: contentType });
                    var result = window.navigator.msSaveOrOpenBlob(b, name);
                }
                else
                    browserDownloadDataUri(dataurl, name, userContextWindow);
            }
            catch (e) {
                if (onError)
                    onError(e);
                pxt.debug("saving failed");
            }
            return dataurl;
        }
        BrowserUtils.browserDownloadBase64 = browserDownloadBase64;
        function loadImageAsync(data) {
            var img = document.createElement("img");
            return new Promise(function (resolve, reject) {
                img.onload = function () { return resolve(img); };
                img.onerror = function () { return resolve(undefined); };
                img.crossOrigin = "anonymous";
                img.src = data;
            });
        }
        BrowserUtils.loadImageAsync = loadImageAsync;
        function loadScriptAsync(url) {
            return new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;
                script.addEventListener('load', function () { return resolve(); });
                script.addEventListener('error', function (e) { return reject(e); });
                document.body.appendChild(script);
            });
        }
        BrowserUtils.loadScriptAsync = loadScriptAsync;
        function loadAjaxAsync(url) {
            return new Promise(function (resolve, reject) {
                var httprequest = new XMLHttpRequest();
                httprequest.onreadystatechange = function () {
                    if (httprequest.readyState == XMLHttpRequest.DONE) {
                        if (httprequest.status == 200) {
                            resolve(httprequest.responseText);
                        }
                        else {
                            reject(httprequest.status);
                        }
                    }
                };
                httprequest.open("GET", url, true);
                httprequest.send();
            });
        }
        BrowserUtils.loadAjaxAsync = loadAjaxAsync;
        function initTheme() {
            function patchCdn(url) {
                if (!url)
                    return url;
                return url.replace("@cdnUrl@", pxt.getOnlineCdnUrl());
            }
            var theme = pxt.appTarget.appTheme;
            if (theme) {
                if (theme.accentColor) {
                    var style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = ".ui.accent { color: " + theme.accentColor + "; }\n                .ui.inverted.menu .accent.active.item, .ui.inverted.accent.menu  { background-color: " + theme.accentColor + "; }";
                    document.getElementsByTagName('head')[0].appendChild(style);
                }
                theme.appLogo = patchCdn(theme.appLogo);
                theme.cardLogo = patchCdn(theme.cardLogo);
                theme.homeScreenHero = patchCdn(theme.homeScreenHero);
            }
            // RTL languages
            if (pxt.Util.isUserLanguageRtl()) {
                pxt.debug("rtl layout");
                document.body.classList.add("rtl");
                document.body.style.direction = "rtl";
                // replace semantic.css with rtlsemantic.css
                var links = pxt.Util.toArray(document.head.getElementsByTagName("link"));
                var semanticLink = links.filter(function (l) { return pxt.Util.endsWith(l.getAttribute("href"), "semantic.css"); })[0];
                if (semanticLink) {
                    var semanticHref = semanticLink.getAttribute("data-rtl");
                    if (semanticHref) {
                        pxt.debug("swapping to " + semanticHref);
                        semanticLink.setAttribute("href", semanticHref);
                    }
                }
                // replace blockly.css with rtlblockly.css
                var blocklyLink = links.filter(function (l) { return pxt.Util.endsWith(l.getAttribute("href"), "blockly.css"); })[0];
                if (blocklyLink) {
                    var blocklyHref = blocklyLink.getAttribute("data-rtl");
                    if (blocklyHref) {
                        pxt.debug("swapping to " + blocklyHref);
                        blocklyLink.setAttribute("href", blocklyHref);
                    }
                }
            }
            var sim = pxt.appTarget.simulator;
            if (sim
                && sim.boardDefinition
                && sim.boardDefinition.visual) {
                var boardDef = sim.boardDefinition.visual;
                if (boardDef.image) {
                    boardDef.image = patchCdn(boardDef.image);
                    if (boardDef.outlineImage)
                        boardDef.outlineImage = patchCdn(boardDef.outlineImage);
                }
            }
            // patch icons in bundled packages
            Object.keys(pxt.appTarget.bundledpkgs).forEach(function (pkgid) {
                var res = pxt.appTarget.bundledpkgs[pkgid];
                // path config before storing
                var config = JSON.parse(res[pxt.CONFIG_NAME]);
                if (config.icon)
                    config.icon = patchCdn(config.icon);
                res[pxt.CONFIG_NAME] = JSON.stringify(config, null, 2);
            });
        }
        BrowserUtils.initTheme = initTheme;
        /**
         * Utility method to change the hash.
         * Pass keepHistory to retain an entry of the change in the browser history.
         */
        function changeHash(hash, keepHistory) {
            if (hash.charAt(0) != '#')
                hash = '#' + hash;
            if (keepHistory) {
                window.location.hash = hash;
            }
            else {
                window.history.replaceState('', '', hash);
            }
        }
        BrowserUtils.changeHash = changeHash;
    })(BrowserUtils = pxt.BrowserUtils || (pxt.BrowserUtils = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var commands;
    (function (commands) {
        // overriden by targets
        commands.deployCoreAsync = undefined;
        commands.browserDownloadAsync = undefined;
        commands.saveOnlyAsync = undefined;
        commands.showUploadInstructionsAsync = undefined;
    })(commands = pxt.commands || (pxt.commands = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtarget.d.ts"/>
var pxt;
(function (pxt) {
    function getLzmaAsync() {
        if (pxt.U.isNodeJS)
            return Promise.resolve(require("lzma"));
        else {
            var lz = window.LZMA;
            if (lz)
                return Promise.resolve(lz);
            var monacoPaths = window.MonacoPaths;
            return pxt.BrowserUtils.loadScriptAsync(monacoPaths['lzma/lzma_worker-min.js'])
                .then(function () { return window.LZMA; });
        }
    }
    function lzmaDecompressAsync(buf) {
        return getLzmaAsync()
            .then(function (lzma) { return new Promise(function (resolve, reject) {
            try {
                lzma.decompress(buf, function (res, error) {
                    resolve(error ? undefined : res);
                });
            }
            catch (e) {
                resolve(undefined);
            }
        }); });
    }
    pxt.lzmaDecompressAsync = lzmaDecompressAsync;
    function lzmaCompressAsync(text) {
        return getLzmaAsync()
            .then(function (lzma) { return new Promise(function (resolve, reject) {
            try {
                lzma.compress(text, 7, function (res, error) {
                    resolve(error ? undefined : new Uint8Array(res));
                });
            }
            catch (e) {
                resolve(undefined);
            }
        }); });
    }
    pxt.lzmaCompressAsync = lzmaCompressAsync;
})(pxt || (pxt = {}));
// preprocess C++ file to find functions exposed to pxt
(function (pxt) {
    var cpp;
    (function (cpp) {
        var U = pxtc.Util;
        var lf = U.lf;
        function parseExpr(e) {
            e = e.trim();
            e = e.replace(/^\(/, "");
            e = e.replace(/\)$/, "");
            e = e.trim();
            if (/^-/.test(e) && parseExpr(e.slice(1)) != null)
                return -parseExpr(e.slice(1));
            if (/^0x[0-9a-f]+$/i.exec(e))
                return parseInt(e.slice(2), 16);
            if (/^0b[01]+$/i.exec(e))
                return parseInt(e.slice(2), 2);
            if (/^0\d+$/i.exec(e))
                return parseInt(e, 8);
            if (/^\d+$/i.exec(e))
                return parseInt(e, 10);
            return null;
        }
        function nsWriter(nskw) {
            if (nskw === void 0) { nskw = "namespace"; }
            var text = "";
            var currNs = "";
            var setNs = function (ns, over) {
                if (over === void 0) { over = ""; }
                if (currNs == ns)
                    return;
                if (currNs)
                    text += "}\n";
                if (ns)
                    text += over || (nskw + " " + ns + " {\n");
                currNs = ns;
            };
            var indent = "    ";
            return {
                setNs: setNs,
                clear: function () {
                    text = "";
                    currNs = "";
                },
                write: function (s) {
                    if (!s.trim())
                        text += "\n";
                    else {
                        s = s.trim()
                            .replace(/^\s*/mg, indent)
                            .replace(/^(\s*)\*/mg, function (f, s) { return s + " *"; });
                        text += s + "\n";
                    }
                },
                incrIndent: function () {
                    indent += "    ";
                },
                decrIndent: function () {
                    indent = indent.slice(4);
                },
                finish: function () {
                    setNs("");
                    return text;
                }
            };
        }
        cpp.nsWriter = nsWriter;
        function parseCppInt(v) {
            if (!v)
                return null;
            v = v.trim();
            var mm = /^\((.*)\)/.exec(v);
            if (mm)
                v = mm[1];
            if (/^-?(\d+|0[xX][0-9a-fA-F]+)$/.test(v))
                return parseInt(v);
            return null;
        }
        cpp.parseCppInt = parseCppInt;
        var prevExtInfo;
        var prevSnapshot;
        var PkgConflictError = /** @class */ (function (_super) {
            __extends(PkgConflictError, _super);
            function PkgConflictError(msg) {
                var _this = _super.call(this, msg) || this;
                _this.isUserError = true;
                _this.message = msg;
                return _this;
            }
            return PkgConflictError;
        }(Error));
        cpp.PkgConflictError = PkgConflictError;
        function getExtensionInfo(mainPkg) {
            var pkgSnapshot = {};
            var constsName = "dal.d.ts";
            var sourcePath = "/source/";
            for (var _i = 0, _a = mainPkg.sortedDeps(); _i < _a.length; _i++) {
                var pkg = _a[_i];
                pkg.addSnapshot(pkgSnapshot, [constsName, ".h", ".cpp"]);
            }
            if (prevSnapshot && U.stringMapEq(pkgSnapshot, prevSnapshot)) {
                pxt.debug("Using cached extinfo");
                return prevExtInfo;
            }
            pxt.debug("Generating new extinfo");
            var res = pxtc.emptyExtInfo();
            var compileService = pxt.appTarget.compileService;
            if (!compileService)
                compileService = {
                    gittag: "none",
                    serviceId: "nocompile"
                };
            var compile = pxt.appTarget.compile;
            if (!compile)
                compile = {
                    isNative: false,
                    hasHex: false,
                };
            var isCSharp = compile.nativeType == pxtc.NATIVE_TYPE_CS;
            var isPlatformio = !!compileService.platformioIni;
            var isCodal = compileService.buildEngine == "codal";
            var isDockerMake = compileService.buildEngine == "dockermake";
            var isYotta = !isCSharp && !isPlatformio && !isCodal && !isDockerMake;
            if (isPlatformio)
                sourcePath = "/src/";
            else if (isCodal || isDockerMake)
                sourcePath = "/pxtapp/";
            var pxtConfig = "// Configuration defines\n";
            var pointersInc = "\nPXT_SHIMS_BEGIN\n";
            var includesInc = "#include \"pxt.h\"\n";
            var fullCS = "";
            var thisErrors = "";
            var dTsNamespace = "";
            var err = function (s) { return thisErrors += "   " + fileName + "(" + lineNo + "): " + s + "\n"; };
            var lineNo = 0;
            var fileName = "";
            var protos = nsWriter("namespace");
            var shimsDTS = nsWriter("declare namespace");
            var enumsDTS = nsWriter("declare namespace");
            var allErrors = "";
            var knownEnums = {};
            var enumVals = {
                "true": "1",
                "false": "0",
                "null": "0",
                "NULL": "0",
            };
            // we sometimes append _ to C++ names to avoid name clashes
            function toJs(name) {
                return name.trim().replace(/[\_\*]$/, "");
            }
            var makefile = "";
            for (var _b = 0, _c = mainPkg.sortedDeps(); _b < _c.length; _b++) {
                var pkg = _c[_b];
                if (pkg.getFiles().indexOf(constsName) >= 0) {
                    var src = pkg.host().readFile(pkg, constsName);
                    pxt.Util.assert(!!src, constsName + " not found in " + pkg.id);
                    src.split(/\r?\n/).forEach(function (ln) {
                        var m = /^\s*(\w+) = (.*),/.exec(ln);
                        if (m) {
                            enumVals[m[1]] = m[2];
                        }
                    });
                }
                if (!makefile && pkg.getFiles().indexOf("Makefile") >= 0) {
                    makefile = pkg.host().readFile(pkg, "Makefile");
                }
            }
            function stripComments(ln) {
                return ln.replace(/\/\/.*/, "").replace(/\/\*/, "");
            }
            var enumVal = 0;
            var inEnum = false;
            var currNs = "";
            var currDocComment = "";
            var currAttrs = "";
            var inDocComment = false;
            var outp = "";
            function handleComments(ln) {
                if (inEnum) {
                    outp += ln + "\n";
                    return true;
                }
                if (/^\s*\/\*\*/.test(ln)) {
                    inDocComment = true;
                    currDocComment = ln + "\n";
                    if (/\*\//.test(ln))
                        inDocComment = false;
                    outp += "//\n";
                    return true;
                }
                if (inDocComment) {
                    currDocComment += ln + "\n";
                    if (/\*\//.test(ln)) {
                        inDocComment = false;
                    }
                    outp += "//\n";
                    return true;
                }
                if (/^\s*\/\/%/.test(ln)) {
                    currAttrs += ln + "\n";
                    outp += "//\n";
                    return true;
                }
                outp += ln + "\n";
                return false;
            }
            function enterEnum(cpname, brace) {
                inEnum = true;
                enumVal = -1;
                enumsDTS.write("");
                enumsDTS.write("");
                if (currAttrs || currDocComment) {
                    enumsDTS.write(currDocComment);
                    enumsDTS.write(currAttrs);
                    currAttrs = "";
                    currDocComment = "";
                }
                enumsDTS.write("declare const enum " + toJs(cpname) + " " + brace);
                knownEnums[cpname] = true;
            }
            function processEnumLine(ln) {
                var lnNC = stripComments(ln);
                if (inEnum && lnNC.indexOf("}") >= 0) {
                    inEnum = false;
                    enumsDTS.write("}");
                }
                if (!inEnum)
                    return;
                // parse the enum case, with lots of optional stuff (?)
                var mm = /^\s*(\w+)\s*(=\s*(.*?))?,?\s*$/.exec(lnNC);
                if (mm) {
                    var nm = mm[1];
                    var v = mm[3];
                    var opt = "";
                    if (v) {
                        // user-supplied value
                        v = v.trim();
                        var curr = U.lookup(enumVals, v);
                        if (curr != null) {
                            opt = "  // " + v;
                            v = curr;
                        }
                        enumVal = parseCppInt(v);
                        if (enumVal == null)
                            err("cannot determine value of " + lnNC);
                    }
                    else {
                        // no user-supplied value
                        enumVal++;
                        v = enumVal + "";
                    }
                    enumsDTS.write("    " + toJs(nm) + " = " + v + "," + opt);
                }
                else {
                    enumsDTS.write(ln);
                }
            }
            function finishNamespace() {
                shimsDTS.setNs("");
                shimsDTS.write("");
                shimsDTS.write("");
                if (currAttrs || currDocComment) {
                    shimsDTS.write(currDocComment);
                    shimsDTS.write(currAttrs);
                    currAttrs = "";
                    currDocComment = "";
                }
            }
            function parseArg(parsedAttrs, s) {
                s = s.trim();
                var m = /(.*)=\s*(-?\w+)$/.exec(s);
                var defl = "";
                var qm = "";
                if (m) {
                    defl = m[2];
                    qm = "?";
                    s = m[1].trim();
                }
                m = /^(.*?)(\w+)$/.exec(s);
                if (!m) {
                    err("invalid argument: " + s);
                    return {
                        name: "???",
                        type: "int"
                    };
                }
                var argName = m[2];
                if (parsedAttrs.paramDefl[argName]) {
                    defl = parsedAttrs.paramDefl[argName];
                    qm = "?";
                }
                var numVal = defl ? U.lookup(enumVals, defl) : null;
                if (numVal != null)
                    defl = numVal;
                if (defl) {
                    if (parseCppInt(defl) == null)
                        err("Invalid default value (non-integer): " + defl);
                    currAttrs += " " + argName + ".defl=" + defl;
                }
                return {
                    name: argName + qm,
                    type: m[1]
                };
            }
            function parseCpp(src, isHeader) {
                currNs = "";
                currDocComment = "";
                currAttrs = "";
                inDocComment = false;
                var indexedInstanceAttrs;
                var indexedInstanceIdx = -1;
                // replace #if 0 .... #endif with newlines
                src = src.replace(/^\s*#\s*if\s+0\s*$[^]*?^\s*#\s*endif\s*$/mg, function (f) { return f.replace(/[^\n]/g, ""); });
                // special handling of C++ namespace that ends with Methods (e.g. FooMethods)
                // such a namespace will be converted into a TypeScript interface
                // this enables simple objects with methods to be defined. See, for example:
                // https://github.com/Microsoft/pxt-microbit/blob/master/libs/core/buffer.cpp
                // within that namespace, the first parameter of each function should have
                // the type Foo
                function interfaceName() {
                    var n = currNs.replace(/Methods$/, "");
                    if (n == currNs)
                        return null;
                    return n;
                }
                lineNo = 0;
                // the C++ types we can map to TypeScript
                function mapType(tp) {
                    switch (tp.replace(/\s+/g, "")) {
                        case "void": return "void";
                        // TODO: need int16_t
                        case "int32_t":
                        case "int":
                            return "int32";
                        case "uint32_t":
                        case "unsigned":
                            return "uint32";
                        case "TNumber":
                        case "float":
                        case "double":
                            return "number";
                        case "uint16_t": return "uint16";
                        case "int16_t":
                        case "short": return "int16";
                        case "uint8_t":
                        case "byte": return "uint8";
                        case "int8_t":
                        case "sbyte": return "int8";
                        case "bool":
                            if (compile.shortPointers)
                                err("use 'boolean' not 'bool' on 8 bit targets");
                            return "boolean";
                        case "StringData*": return "string";
                        case "String": return "string";
                        case "ImageLiteral": return "string";
                        case "Action": return "() => void";
                        case "TValue": return "any";
                        default:
                            return toJs(tp);
                    }
                }
                function mapRunTimeType(tp) {
                    tp = tp.replace(/\s+/g, "");
                    switch (tp) {
                        case "int32_t":
                        case "uint32_t":
                        case "unsigned":
                        case "uint16_t":
                        case "int16_t":
                        case "short":
                        case "uint8_t":
                        case "byte":
                        case "int8_t":
                        case "sbyte":
                        case "int":
                            return "I";
                        case "void": return "V";
                        case "float": return "F";
                        case "TNumber": return "N";
                        case "TValue": return "T";
                        case "bool": return "B";
                        case "double": return "D";
                        default:
                            if (U.lookup(knownEnums, tp))
                                return "I";
                            return "_";
                    }
                }
                outp = "";
                inEnum = false;
                enumVal = 0;
                enumsDTS.setNs("");
                shimsDTS.setNs("");
                src.split(/\r?\n/).forEach(function (ln) {
                    ++lineNo;
                    // remove comments (NC = no comments)
                    var lnNC = stripComments(ln);
                    processEnumLine(ln);
                    // "enum class" and "enum struct" is C++ syntax to force scoping of
                    // enum members
                    var enM = /^\s*enum\s+(|class\s+|struct\s+)(\w+)\s*({|$)/.exec(lnNC);
                    if (enM) {
                        enterEnum(enM[2], enM[3]);
                        if (!isHeader) {
                            protos.setNs(currNs);
                            protos.write("enum " + enM[2] + " : int;");
                        }
                    }
                    if (handleComments(ln))
                        return;
                    if (/^typedef.*;\s*$/.test(ln)) {
                        protos.setNs(currNs);
                        protos.write(ln);
                    }
                    var m = /^\s*namespace\s+(\w+)/.exec(ln);
                    if (m) {
                        //if (currNs) err("more than one namespace declaration not supported")
                        currNs = m[1];
                        if (interfaceName()) {
                            finishNamespace();
                            var tpName = interfaceName();
                            shimsDTS.setNs(currNs, "declare interface " + tpName + " {");
                        }
                        else if (currAttrs || currDocComment) {
                            finishNamespace();
                            shimsDTS.setNs(toJs(currNs));
                            enumsDTS.setNs(toJs(currNs));
                        }
                        return;
                    }
                    // function definition
                    m = /^\s*(\w+)([\*\&]*\s+[\*\&]*)(\w+)\s*\(([^\(\)]*)\)\s*(;\s*$|\{|$)/.exec(ln);
                    if (currAttrs && m) {
                        indexedInstanceAttrs = null;
                        var parsedAttrs_1 = pxtc.parseCommentString(currAttrs);
                        // top-level functions (outside of a namespace) are not permitted
                        if (!currNs)
                            err("missing namespace declaration");
                        var retTp = (m[1] + m[2]).replace(/\s+/g, "");
                        var funName = m[3];
                        var origArgs = m[4];
                        currAttrs = currAttrs.trim().replace(/ \w+\.defl=\w+/g, "");
                        var argsFmt_1 = mapRunTimeType(retTp);
                        var args = origArgs.split(/,/).filter(function (s) { return !!s; }).map(function (s) {
                            var r = parseArg(parsedAttrs_1, s);
                            argsFmt_1 += mapRunTimeType(r.type);
                            return r.name + ": " + mapType(r.type);
                        });
                        var numArgs = args.length;
                        var fi = {
                            name: currNs + "::" + funName,
                            argsFmt: argsFmt_1,
                            value: null
                        };
                        //console.log(`${ln.trim()} : ${argsFmt}`)
                        if (currDocComment) {
                            shimsDTS.setNs(toJs(currNs));
                            shimsDTS.write("");
                            shimsDTS.write(currDocComment);
                            if (/ImageLiteral/.test(m[4]) && !/imageLiteral=/.test(currAttrs))
                                currAttrs += " imageLiteral=1";
                            currAttrs += " shim=" + fi.name;
                            shimsDTS.write(currAttrs);
                            funName = toJs(funName);
                            if (interfaceName()) {
                                var tp0 = (args[0] || "").replace(/^.*:\s*/, "").trim();
                                if (tp0.toLowerCase() != interfaceName().toLowerCase()) {
                                    err(lf("Invalid first argument; should be of type '{0}', but is '{1}'", interfaceName(), tp0));
                                }
                                args.shift();
                                if (args.length == 0 && /\bproperty\b/.test(currAttrs))
                                    shimsDTS.write(funName + ": " + mapType(retTp) + ";");
                                else
                                    shimsDTS.write(funName + "(" + args.join(", ") + "): " + mapType(retTp) + ";");
                            }
                            else {
                                shimsDTS.write("function " + funName + "(" + args.join(", ") + "): " + mapType(retTp) + ";");
                            }
                        }
                        currDocComment = "";
                        currAttrs = "";
                        if (!isHeader) {
                            protos.setNs(currNs);
                            protos.write(retTp + " " + funName + "(" + origArgs + ");");
                        }
                        res.functions.push(fi);
                        if (isYotta)
                            pointersInc += "(uint32_t)(void*)::" + fi.name + ",\n";
                        else
                            pointersInc += "PXT_FNPTR(::" + fi.name + "),\n";
                        return;
                    }
                    m = /^\s*(\w+)\s+(\w+)\s*;/.exec(ln);
                    if (currAttrs && m) {
                        var parsedAttrs = pxtc.parseCommentString(currAttrs);
                        if (parsedAttrs.indexedInstanceNS) {
                            indexedInstanceAttrs = parsedAttrs;
                            shimsDTS.setNs(parsedAttrs.indexedInstanceNS);
                            indexedInstanceIdx = 0;
                        }
                        var tp = m[1];
                        var nm = m[2];
                        if (indexedInstanceAttrs) {
                            currAttrs = currAttrs.trim();
                            currAttrs += " fixedInstance shim=" + indexedInstanceAttrs.indexedInstanceShim + "(" + indexedInstanceIdx++ + ")";
                            shimsDTS.write("");
                            shimsDTS.write(currDocComment);
                            shimsDTS.write(currAttrs);
                            shimsDTS.write("const " + nm + ": " + mapType(tp) + ";");
                            currDocComment = "";
                            currAttrs = "";
                            return;
                        }
                    }
                    if (currAttrs && ln.trim()) {
                        err("declaration not understood: " + ln);
                        currAttrs = "";
                        currDocComment = "";
                        return;
                    }
                });
                return outp;
            }
            function parseCs(src) {
                currNs = "";
                currDocComment = "";
                currAttrs = "";
                inDocComment = false;
                // replace #if false .... #endif with newlines
                src = src.replace(/^\s*#\s*if\s+false\s*$[^]*?^\s*#\s*endif\s*$/mg, function (f) { return f.replace(/[^\n]/g, ""); });
                lineNo = 0;
                // the C# types we can map to TypeScript
                function mapType(tp) {
                    switch (tp.replace(/\s+/g, "")) {
                        case "void": return "void";
                        case "int": return "int32";
                        case "uint": return "uint32";
                        case "float":
                        case "double": return "number";
                        case "ushort": return "uint16";
                        case "short": return "int16";
                        case "byte": return "uint8";
                        case "sbyte": return "int8";
                        case "bool": return "boolean";
                        case "string":
                        case "String": return "string";
                        case "Function": return "() => void";
                        case "object": return "any";
                        default:
                            return toJs(tp);
                    }
                }
                function isNumberType(tp) {
                    tp = tp.replace(/\s+/g, "");
                    if (U.lookup(knownEnums, tp))
                        return true;
                    var mt = mapType(tp);
                    if (mt == "number" || /^u?int\d+$/.test(mt))
                        return true;
                    return false;
                }
                function mapRunTimeType(tp) {
                    tp = tp.replace(/\s+/g, "");
                    if (isNumberType(tp))
                        tp = "#" + tp;
                    return tp + ";";
                }
                outp = ""; // we don't really care about this one for C#
                inEnum = false;
                enumVal = 0;
                enumsDTS.setNs("");
                shimsDTS.setNs("");
                src.split(/\r?\n/).forEach(function (ln) {
                    ++lineNo;
                    // remove comments (NC = no comments)
                    var lnNC = stripComments(ln);
                    processEnumLine(ln);
                    var enM = /^\s*(public) enum\s+(\w+)\s*({|$)/.exec(lnNC);
                    if (enM) {
                        enterEnum(enM[2], enM[3]);
                    }
                    if (handleComments(ln))
                        return;
                    var m = /^\s*public (static\s+|partial\s+)*class\s+(\w+)/.exec(ln);
                    if (m) {
                        currNs = m[2];
                        if (currAttrs || currDocComment) {
                            finishNamespace();
                            shimsDTS.setNs(toJs(currNs));
                            enumsDTS.setNs(toJs(currNs));
                        }
                        return;
                    }
                    // function definition
                    m = /^\s*public static (async\s+)*([\w\[\]<>]+)\s+(\w+)\(([^\(\)]*)\)\s*(;\s*$|\{|$)/.exec(ln);
                    if (currAttrs && m) {
                        var parsedAttrs = pxtc.parseCommentString(currAttrs);
                        // top-level functions (outside of a namespace) are not permitted
                        if (!currNs)
                            err("missing namespace declaration");
                        var retTp = m[2];
                        var funName = m[3];
                        var origArgs = m[4];
                        var isAsync = false;
                        currAttrs = currAttrs.trim().replace(/ \w+\.defl=\w+/g, "");
                        if (retTp == "Task") {
                            retTp = "void";
                            isAsync = true;
                        }
                        else {
                            var mm = /^Task<(.*)>$/.exec(retTp);
                            if (mm) {
                                isAsync = true;
                                retTp = mm[1];
                            }
                        }
                        var argsFmt = mapRunTimeType(retTp);
                        if (isAsync) {
                            argsFmt = "async;" + argsFmt;
                            currAttrs += " async";
                        }
                        var args = [];
                        for (var _i = 0, _a = origArgs.split(/,/); _i < _a.length; _i++) {
                            var s = _a[_i];
                            if (!s)
                                continue;
                            var r = parseArg(parsedAttrs, s);
                            var mapped = mapRunTimeType(r.type);
                            argsFmt += mapped;
                            if (mapped != "CTX;")
                                args.push(r.name + ": " + mapType(r.type));
                        }
                        var fi = {
                            name: currNs + "::" + funName,
                            argsFmt: argsFmt,
                            value: null
                        };
                        //console.log(`${ln.trim()} : ${argsFmt}`)
                        if (currDocComment) {
                            shimsDTS.setNs(toJs(currNs));
                            shimsDTS.write("");
                            shimsDTS.write(currDocComment);
                            currAttrs += " shim=" + fi.name;
                            shimsDTS.write(currAttrs);
                            funName = toJs(funName);
                            shimsDTS.write("function " + funName + "(" + args.join(", ") + "): " + mapType(retTp) + ";");
                        }
                        currDocComment = "";
                        currAttrs = "";
                        res.functions.push(fi);
                        return;
                    }
                    if (currAttrs && ln.trim()) {
                        err("declaration not understood: " + ln);
                        currAttrs = "";
                        currDocComment = "";
                        return;
                    }
                });
                return outp;
            }
            var currSettings = U.clone(compileService.yottaConfig || {});
            var optSettings = {};
            var settingSrc = {};
            function parseJson(pkg) {
                var j0 = pkg.config.platformio;
                if (j0 && j0.dependencies) {
                    U.jsonCopyFrom(res.platformio.dependencies, j0.dependencies);
                }
                if (res.npmDependencies && pkg.config.npmDependencies)
                    U.jsonCopyFrom(res.npmDependencies, pkg.config.npmDependencies);
                var json = pkg.config.yotta;
                if (!json)
                    return;
                // TODO check for conflicts
                if (json.dependencies) {
                    U.jsonCopyFrom(res.yotta.dependencies, json.dependencies);
                }
                if (json.config) {
                    var cfg = U.jsonFlatten(json.config);
                    for (var _i = 0, _a = Object.keys(cfg); _i < _a.length; _i++) {
                        var settingName = _a[_i];
                        var prev = U.lookup(settingSrc, settingName);
                        var settingValue = cfg[settingName];
                        if (!prev || prev.config.yotta.configIsJustDefaults) {
                            settingSrc[settingName] = pkg;
                            currSettings[settingName] = settingValue;
                        }
                        else if (currSettings[settingName] === settingValue) {
                            // OK
                        }
                        else if (!pkg.parent.config.yotta || !pkg.parent.config.yotta.ignoreConflicts) {
                            var err_1 = new PkgConflictError(lf("conflict on yotta setting {0} between packages {1} and {2}", settingName, pkg.id, prev.id));
                            err_1.pkg0 = prev;
                            err_1.pkg1 = pkg;
                            err_1.settingName = settingName;
                            throw err_1;
                        }
                    }
                }
                if (json.optionalConfig) {
                    var cfg = U.jsonFlatten(json.optionalConfig);
                    for (var _b = 0, _c = Object.keys(cfg); _b < _c.length; _b++) {
                        var settingName = _c[_b];
                        var settingValue = cfg[settingName];
                        // last one wins
                        optSettings[settingName] = settingValue;
                    }
                }
            }
            // This is overridden on the build server, but we need it for command line build
            if (isYotta && compile.hasHex) {
                var cs = compileService;
                U.assert(!!cs.yottaCorePackage);
                U.assert(!!cs.githubCorePackage);
                U.assert(!!cs.gittag);
                var tagged = cs.githubCorePackage + "#" + compileService.gittag;
                res.yotta.dependencies[cs.yottaCorePackage] = tagged;
            }
            if (mainPkg) {
                var seenMain = false;
                // TODO computeReachableNodes(pkg, true)
                for (var _d = 0, _e = mainPkg.sortedDeps(); _d < _e.length; _d++) {
                    var pkg = _e[_d];
                    thisErrors = "";
                    parseJson(pkg);
                    if (pkg == mainPkg) {
                        seenMain = true;
                        // we only want the main package in generated .d.ts
                        shimsDTS.clear();
                        enumsDTS.clear();
                    }
                    else {
                        U.assert(!seenMain);
                    }
                    var ext = isCSharp ? ".cs" : ".cpp";
                    for (var _f = 0, _g = pkg.getFiles(); _f < _g.length; _f++) {
                        var fn = _g[_f];
                        var isHeader = !isCSharp && U.endsWith(fn, ".h");
                        if (isHeader || U.endsWith(fn, ext)) {
                            var fullName = pkg.config.name + "/" + fn;
                            if ((pkg.config.name == "base" || pkg.config.name == "core") && isHeader)
                                fullName = fn;
                            if (isHeader)
                                includesInc += "#include \"" + (isYotta ? sourcePath.slice(1) : "") + fullName + "\"\n";
                            var src = pkg.readFile(fn);
                            if (src == null)
                                U.userError(lf("C++ file {0} is missing in package {1}.", fn, pkg.config.name));
                            fileName = fullName;
                            if (isCSharp) {
                                pxt.debug("Parse C#: " + fullName);
                                parseCs(src);
                                fullCS += "\n\n\n#line 1 \"" + fullName + "\"\n" + src;
                            }
                            else {
                                // parseCpp() will remove doc comments, to prevent excessive recompilation
                                pxt.debug("Parse C++: " + fullName);
                                src = parseCpp(src, isHeader);
                                res.extensionFiles[sourcePath + fullName] = src;
                            }
                            if (pkg.level == 0)
                                res.onlyPublic = false;
                            if (pkg.verProtocol() && pkg.verProtocol() != "pub" && pkg.verProtocol() != "embed")
                                res.onlyPublic = false;
                        }
                        if (!isCSharp && (U.endsWith(fn, ".c") || U.endsWith(fn, ".S") || U.endsWith(fn, ".s"))) {
                            var src = pkg.readFile(fn);
                            res.extensionFiles[sourcePath + pkg.config.name + "/" + fn.replace(/\.S$/, ".s")] = src;
                        }
                    }
                    if (thisErrors) {
                        allErrors += lf("Package {0}:\n", pkg.id) + thisErrors;
                    }
                }
            }
            if (allErrors)
                U.userError(allErrors);
            fullCS += "\n#line default\n";
            // merge optional settings
            U.jsonCopyFrom(optSettings, currSettings);
            var configJson = U.jsonUnFlatten(optSettings);
            if (isCSharp) {
                res.extensionFiles["/lib.cs"] = fullCS;
                res.generatedFiles["/module.json"] = "{}";
            }
            else if (isDockerMake) {
                var packageJson = {
                    name: "pxt-app",
                    private: true,
                    dependencies: res.npmDependencies,
                };
                res.generatedFiles["/package.json"] = JSON.stringify(packageJson, null, 4) + "\n";
            }
            else if (isCodal) {
                var cs = compileService;
                var cfg_1 = U.clone(cs.codalDefinitions) || {};
                var trg = cs.codalTarget;
                if (typeof trg == "string")
                    trg = trg + ".json";
                var codalJson = {
                    "target": trg,
                    "definitions": cfg_1,
                    "config": cfg_1,
                    "application": "pxtapp",
                    "output_folder": "build",
                    // include these, because we use hash of this file to see if anything changed
                    "pxt_gitrepo": cs.githubCorePackage,
                    "pxt_gittag": cs.gittag,
                };
                U.iterMap(U.jsonFlatten(configJson), function (k, v) {
                    k = k.replace(/^codal\./, "device.").toUpperCase().replace(/\./g, "_");
                    cfg_1[k] = v;
                });
                res.generatedFiles["/codal.json"] = JSON.stringify(codalJson, null, 4) + "\n";
            }
            else if (isPlatformio) {
                var iniLines_1 = compileService.platformioIni.slice();
                // TODO merge configjson
                iniLines_1.push("lib_deps =");
                U.iterMap(res.platformio.dependencies, function (pkg, ver) {
                    var pkgSpec = /[@#\/]/.test(ver) ? ver : pkg + "@" + ver;
                    iniLines_1.push("  " + pkgSpec);
                });
                res.generatedFiles["/platformio.ini"] = iniLines_1.join("\n") + "\n";
            }
            else {
                res.yotta.config = configJson;
                var name_1 = "pxt-app";
                if (compileService.yottaBinary)
                    name_1 = compileService.yottaBinary.replace(/-combined/, "").replace(/\.hex$/, "");
                var moduleJson = {
                    "name": name_1,
                    "version": "0.0.0",
                    "description": "Auto-generated. Do not edit.",
                    "license": "n/a",
                    "dependencies": res.yotta.dependencies,
                    "targetDependencies": {},
                    "bin": "./source"
                };
                res.generatedFiles["/module.json"] = JSON.stringify(moduleJson, null, 4) + "\n";
            }
            if (compile.boxDebug) {
                pxtConfig += "#define PXT_BOX_DEBUG 1\n";
                pxtConfig += "#define PXT_MEMLEAK_DEBUG 1\n";
            }
            if (compile.nativeType == pxtc.NATIVE_TYPE_AVRVM) {
                pxtConfig += "#define PXT_VM 1\n";
            }
            else {
                pxtConfig += "#define PXT_VM 0\n";
            }
            if (!isCSharp) {
                res.generatedFiles[sourcePath + "pointers.cpp"] = includesInc + protos.finish() + pointersInc + "\nPXT_SHIMS_END\n";
                res.generatedFiles[sourcePath + "pxtconfig.h"] = pxtConfig;
                if (isYotta)
                    res.generatedFiles["/config.json"] = JSON.stringify(configJson, null, 4) + "\n";
                res.generatedFiles[sourcePath + "main.cpp"] = "\n#include \"pxt.h\"\n#ifdef PXT_MAIN\nPXT_MAIN\n#else\nint main() {\n    uBit.init();\n    pxt::start();\n    while (1) uBit.sleep(10000);\n    return 0;\n}\n#endif\n";
            }
            if (makefile) {
                var allfiles_1 = Object.keys(res.extensionFiles).concat(Object.keys(res.generatedFiles));
                var inc_1 = "";
                var objs = [];
                var add = function (name, ext) {
                    var files = allfiles_1.filter(function (f) { return U.endsWith(f, ext); }).map(function (s) { return s.slice(1); });
                    inc_1 += name + " = " + files.join(" ") + "\n";
                };
                add("PXT_C", ".c");
                add("PXT_CPP", ".cpp");
                add("PXT_S", ".s");
                add("PXT_HEADERS", ".h");
                inc_1 += "PXT_SOURCES = $(PXT_C) $(PXT_S) $(PXT_CPP)\n";
                inc_1 += "PXT_OBJS = $(addprefix bld/, $(PXT_C:.c=.o) $(PXT_S:.s=.o) $(PXT_CPP:.cpp=.o))\n";
                res.generatedFiles["/Makefile"] = makefile;
                res.generatedFiles["/Makefile.inc"] = inc_1;
            }
            var tmp = res.extensionFiles;
            U.jsonCopyFrom(tmp, res.generatedFiles);
            var creq = {
                config: compileService.serviceId,
                tag: compileService.gittag,
                replaceFiles: tmp,
                dependencies: (isYotta ? res.yotta.dependencies : null)
            };
            var data = JSON.stringify(creq);
            res.sha = U.sha256(data);
            res.compileData = btoa(U.toUTF8(data));
            res.shimsDTS = shimsDTS.finish();
            res.enumsDTS = enumsDTS.finish();
            prevSnapshot = pkgSnapshot;
            prevExtInfo = res;
            return res;
        }
        cpp.getExtensionInfo = getExtensionInfo;
        function fileReadAsArrayBufferAsync(f) {
            if (!f)
                return Promise.resolve(null);
            else {
                return new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onerror = function (ev) { return resolve(null); };
                    reader.onload = function (ev) { return resolve(reader.result); };
                    reader.readAsArrayBuffer(f);
                });
            }
        }
        function fromUTF8Bytes(binstr) {
            if (!binstr)
                return "";
            // escape function is deprecated
            var escaped = "";
            for (var i = 0; i < binstr.length; ++i) {
                var k = binstr[i] & 0xff;
                if (k == 37 || k > 0x7f) {
                    escaped += "%" + k.toString(16);
                }
                else {
                    escaped += String.fromCharCode(k);
                }
            }
            // decodeURIComponent does the actual UTF8 decoding
            return decodeURIComponent(escaped);
        }
        function swapBytes(str) {
            var r = "";
            var i = 0;
            for (; i < str.length; i += 2)
                r = str[i] + str[i + 1] + r;
            pxt.Util.assert(i == str.length);
            return r;
        }
        function extractSourceFromBin(bin) {
            var magic = [0x41, 0x14, 0x0E, 0x2F, 0xB8, 0x2F, 0xA2, 0xBB];
            outer: for (var p = 0; p < bin.length; p += 16) {
                if (bin[p] != magic[0])
                    continue;
                for (var i = 0; i < magic.length; ++i)
                    if (bin[p + i] != magic[i])
                        continue outer;
                var metaLen = bin[p + 8] | (bin[p + 9] << 8);
                var textLen = bin[p + 10] | (bin[p + 11] << 8) | (bin[p + 12] << 16) | (bin[p + 13] << 24);
                // TODO test in iOS Safari
                p += 16;
                var end = p + metaLen + textLen;
                if (end > bin.length)
                    continue;
                var bufmeta = bin.slice(p, p + metaLen);
                var buftext = bin.slice(p + metaLen, end);
                return {
                    meta: fromUTF8Bytes(bufmeta),
                    text: buftext
                };
            }
            return null;
        }
        function extractSource(hexfile) {
            if (!hexfile)
                return undefined;
            var metaLen = 0;
            var textLen = 0;
            var toGo = 0;
            var buf;
            var ptr = 0;
            hexfile.split(/\r?\n/).forEach(function (ln) {
                var m = /^:10....0041140E2FB82FA2BB(....)(....)(....)(....)(..)/.exec(ln);
                if (m) {
                    metaLen = parseInt(swapBytes(m[1]), 16);
                    textLen = parseInt(swapBytes(m[2]), 16);
                    toGo = metaLen + textLen;
                    buf = new Uint8Array(toGo);
                }
                else if (toGo > 0) {
                    m = /^:10....00(.*)(..)$/.exec(ln);
                    if (!m)
                        return;
                    var k = m[1];
                    while (toGo > 0 && k.length > 0) {
                        buf[ptr++] = parseInt(k[0] + k[1], 16);
                        k = k.slice(2);
                        toGo--;
                    }
                }
            });
            if (!buf || !(toGo == 0 && ptr == buf.length)) {
                return undefined;
            }
            var bufmeta = new Uint8Array(metaLen);
            var buftext = new Uint8Array(textLen);
            for (var i = 0; i < metaLen; ++i)
                bufmeta[i] = buf[i];
            for (var i = 0; i < textLen; ++i)
                buftext[i] = buf[metaLen + i];
            // iOS Safari doesn't seem to have slice() on Uint8Array
            return {
                meta: fromUTF8Bytes(bufmeta),
                text: buftext
            };
        }
        function unpackSourceFromHexFileAsync(file) {
            if (!file)
                return undefined;
            return fileReadAsArrayBufferAsync(file).then(function (data) {
                var a = new Uint8Array(data);
                return unpackSourceFromHexAsync(a);
            });
        }
        cpp.unpackSourceFromHexFileAsync = unpackSourceFromHexFileAsync;
        function unpackSourceFromHexAsync(dat) {
            function error(e) {
                pxt.debug(e);
                return Promise.reject(new Error(e));
            }
            var rawEmbed;
            // UF2?
            if (pxt.HF2.read32(dat, 0) == ts.pxtc.UF2.UF2_MAGIC_START0) {
                var bin = ts.pxtc.UF2.toBin(dat);
                if (bin)
                    rawEmbed = extractSourceFromBin(bin.buf);
            }
            // ELF?
            if (pxt.HF2.read32(dat, 0) == 0x464c457f) {
                rawEmbed = extractSourceFromBin(dat);
            }
            // HEX? (check for colon)
            if (dat[0] == 0x3a) {
                var str = fromUTF8Bytes(dat);
                rawEmbed = extractSource(str || "");
            }
            if (!rawEmbed || !rawEmbed.meta || !rawEmbed.text) {
                return error("This .hex file doesn't contain source.");
            }
            var hd = JSON.parse(rawEmbed.meta);
            if (!hd) {
                return error("This .hex file is not valid.");
            }
            else if (hd.compression == "LZMA") {
                return pxt.lzmaDecompressAsync(rawEmbed.text)
                    .then(function (res) {
                    if (!res)
                        return null;
                    var meta = res.slice(0, hd.headerSize || hd.metaSize || 0);
                    var text = res.slice(meta.length);
                    if (meta)
                        pxt.Util.jsonCopyFrom(hd, JSON.parse(meta));
                    return { meta: hd, source: text };
                });
            }
            else if (hd.compression) {
                return error("Compression type " + hd.compression + " not supported.");
            }
            else {
                return Promise.resolve({ source: fromUTF8Bytes(rawEmbed.text) });
            }
        }
        cpp.unpackSourceFromHexAsync = unpackSourceFromHexAsync;
    })(cpp = pxt.cpp || (pxt.cpp = {}));
})(pxt || (pxt = {}));
(function (pxt) {
    var hex;
    (function (hex_1) {
        var downloadCache = {};
        var cdnUrlPromise;
        function downloadHexInfoAsync(extInfo) {
            var cachePromise = Promise.resolve();
            if (!downloadCache.hasOwnProperty(extInfo.sha)) {
                cachePromise = downloadHexInfoCoreAsync(extInfo)
                    .then(function (hexFile) {
                    downloadCache[extInfo.sha] = hexFile;
                });
            }
            return cachePromise
                .then(function () {
                return downloadCache[extInfo.sha];
            });
        }
        function getCdnUrlAsync() {
            if (cdnUrlPromise)
                return cdnUrlPromise;
            else {
                var curr = pxt.getOnlineCdnUrl();
                if (curr)
                    return (cdnUrlPromise = Promise.resolve(curr));
                return (cdnUrlPromise = pxt.Cloud.privateGetAsync("clientconfig").then(function (r) { return r.primaryCdnUrl; }));
            }
        }
        function downloadHexInfoCoreAsync(extInfo) {
            var hexurl = "";
            return downloadHexInfoLocalAsync(extInfo)
                .then(function (hex) {
                if (hex) {
                    // Found the hex image in the local server cache, use that
                    return hex;
                }
                return getCdnUrlAsync()
                    .then(function (url) {
                    hexurl = url + "/compile/" + extInfo.sha;
                    return pxt.U.httpGetTextAsync(hexurl + ".hex");
                })
                    .then(function (r) { return r; }, function (e) {
                    return pxt.Cloud.privatePostAsync("compile/extension", { data: extInfo.compileData })
                        .then(function (ret) { return new Promise(function (resolve, reject) {
                        var tryGet = function () {
                            var url = ret.hex.replace(/\.hex/, ".json");
                            pxt.log("polling at " + url);
                            return pxt.Util.httpGetJsonAsync(url)
                                .then(function (json) {
                                if (!json.success)
                                    pxt.U.userError(JSON.stringify(json, null, 1));
                                else {
                                    pxt.log("fetching " + hexurl + ".hex");
                                    resolve(pxt.U.httpGetTextAsync(hexurl + ".hex"));
                                }
                            }, function (e) {
                                setTimeout(tryGet, 1000);
                                return null;
                            });
                        };
                        tryGet();
                    }); });
                })
                    .then(function (text) {
                    return {
                        enums: [],
                        functions: [],
                        hex: text.split(/\r?\n/)
                    };
                });
            });
        }
        function downloadHexInfoLocalAsync(extInfo) {
            if (!pxt.Cloud.localToken || !window || !pxt.Cloud.isLocalHost()) {
                return Promise.resolve();
            }
            return apiAsync("compile/" + extInfo.sha)
                .then(function (json) {
                if (!json || json.notInOfflineCache || !json.hex) {
                    return Promise.resolve();
                }
                json.hex = json.hex.split(/\r?\n/);
                return json;
            })
                .catch(function (e) {
                return Promise.resolve();
            });
        }
        function apiAsync(path, data) {
            return pxt.U.requestAsync({
                url: "/api/" + path,
                headers: { "Authorization": pxt.Cloud.localToken },
                method: data ? "POST" : "GET",
                data: data || undefined,
                allowHttpErrors: true
            }).then(function (r) { return r.json; });
        }
        function storeWithLimitAsync(host, idxkey, newkey, newval, maxLen) {
            if (maxLen === void 0) { maxLen = 10; }
            return host.cacheStoreAsync(newkey, newval)
                .then(function () { return host.cacheGetAsync(idxkey); })
                .then(function (res) {
                var keys;
                try {
                    keys = JSON.parse(res || "[]");
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.error('invalid cache entry, clearing entry');
                    keys = [];
                }
                keys = keys.filter(function (k) { return k != newkey; });
                keys.unshift(newkey);
                var todel = keys.slice(maxLen);
                keys = keys.slice(0, maxLen);
                return Promise.map(todel, function (e) { return host.cacheStoreAsync(e, null); })
                    .then(function () { return host.cacheStoreAsync(idxkey, JSON.stringify(keys)); });
            });
        }
        hex_1.storeWithLimitAsync = storeWithLimitAsync;
        function recordGetAsync(host, idxkey, newkey) {
            return host.cacheGetAsync(idxkey)
                .then(function (res) {
                var keys;
                try {
                    keys = JSON.parse(res || "[]");
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.error('invalid cache entry, clearing entry');
                    return host.cacheStoreAsync(idxkey, "[]");
                }
                if (keys[0] != newkey) {
                    keys = keys.filter(function (k) { return k != newkey; });
                    keys.unshift(newkey);
                    return host.cacheStoreAsync(idxkey, JSON.stringify(keys));
                }
                else {
                    return null;
                }
            });
        }
        hex_1.recordGetAsync = recordGetAsync;
        function getHexInfoAsync(host, extInfo, cloudModule) {
            if (!extInfo.sha)
                return Promise.resolve(null);
            if (pxtc.hex.isSetupFor(extInfo))
                return Promise.resolve(pxtc.hex.currentHexInfo);
            pxt.debug("get hex info: " + extInfo.sha);
            var key = "hex-" + extInfo.sha;
            return host.cacheGetAsync(key)
                .then(function (res) {
                var cachedMeta;
                try {
                    cachedMeta = res ? JSON.parse(res) : null;
                }
                catch (e) {
                    // cache entry is corrupted, clear cache so that it gets rebuilt
                    console.log('invalid cache entry, clearing entry');
                    cachedMeta = null;
                }
                if (cachedMeta && cachedMeta.hex) {
                    pxt.debug("cache hit, size=" + res.length);
                    cachedMeta.hex = decompressHex(cachedMeta.hex);
                    return recordGetAsync(host, "hex-keys", key)
                        .then(function () { return cachedMeta; });
                }
                else {
                    return downloadHexInfoAsync(extInfo)
                        .then(function (meta) {
                        var origHex = meta.hex;
                        meta.hex = compressHex(meta.hex);
                        var store = JSON.stringify(meta);
                        meta.hex = origHex;
                        return storeWithLimitAsync(host, "hex-keys", key, store)
                            .then(function () { return meta; });
                    }).catch(function (e) {
                        pxt.reportException(e, { sha: extInfo.sha });
                        return Promise.resolve(null);
                    });
                }
            });
        }
        hex_1.getHexInfoAsync = getHexInfoAsync;
        function decompressHex(hex) {
            var outp = [];
            for (var i = 0; i < hex.length; i++) {
                var m = /^([@!])(....)$/.exec(hex[i]);
                if (!m) {
                    outp.push(hex[i]);
                    continue;
                }
                var addr = parseInt(m[2], 16);
                var nxt = hex[++i];
                var buf = "";
                if (m[1] == "@") {
                    buf = "";
                    var cnt = parseInt(nxt, 16);
                    while (cnt-- > 0) {
                        buf += "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
                    }
                }
                else {
                    buf = pxtc.decodeBase64(nxt);
                }
                pxt.Util.assert(buf.length > 0);
                pxt.Util.assert(buf.length % 16 == 0);
                for (var j = 0; j < buf.length;) {
                    var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0];
                    addr += 16;
                    for (var k = 0; k < 16; ++k) {
                        bytes.push(buf.charCodeAt(j++));
                    }
                    var chk = 0;
                    for (var k = 0; k < bytes.length; ++k)
                        chk += bytes[k];
                    bytes.push((-chk) & 0xff);
                    var r = ":";
                    for (var k = 0; k < bytes.length; ++k) {
                        var b = bytes[k] & 0xff;
                        if (b <= 0xf)
                            r += "0";
                        r += b.toString(16);
                    }
                    outp.push(r.toUpperCase());
                }
            }
            return outp;
        }
        function compressHex(hex) {
            var outp = [];
            var j = 0;
            for (var i = 0; i < hex.length; i += j) {
                var addr = -1;
                var outln = "";
                j = 0;
                var zeroMode = false;
                while (j < 500) {
                    var m = /^:10(....)00(.{32})(..)$/.exec(hex[i + j]);
                    if (!m)
                        break;
                    var h = m[2];
                    var isZero = /^0+$/.test(h);
                    var newaddr = parseInt(m[1], 16);
                    if (addr == -1) {
                        zeroMode = isZero;
                        outp.push((zeroMode ? "@" : "!") + m[1]);
                        addr = newaddr - 16;
                    }
                    else {
                        if (isZero != zeroMode)
                            break;
                        if (addr + 16 != newaddr)
                            break;
                    }
                    if (!zeroMode)
                        outln += h;
                    addr = newaddr;
                    j++;
                }
                if (j == 0) {
                    outp.push(hex[i]);
                    j = 1;
                }
                else {
                    if (zeroMode) {
                        outp.push(j.toString(16));
                    }
                    else {
                        var bin = "";
                        for (var k = 0; k < outln.length; k += 2)
                            bin += String.fromCharCode(parseInt(outln.slice(k, k + 2), 16));
                        outp.push(btoa(bin));
                    }
                }
            }
            return outp;
        }
    })(hex = pxt.hex || (pxt.hex = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var crowdin;
    (function (crowdin) {
        crowdin.KEY_VARIABLE = "CROWDIN_KEY";
        function apiUri(branch, prj, key, cmd, args) {
            pxt.Util.assert(!!prj && !!key && !!cmd);
            var apiRoot = "https://api.crowdin.com/api/project/" + prj + "/";
            var suff = "?key=" + key;
            if (branch) {
                if (!args)
                    args = {};
                args["branch"] = branch;
            }
            if (args)
                suff += "&" + Object.keys(args).map(function (k) { return k + "=" + encodeURIComponent(args[k]); }).join("&");
            return apiRoot + cmd + suff;
        }
        function downloadTranslationsAsync(branch, prj, key, filename, options) {
            if (options === void 0) { options = {}; }
            var q = { json: "true" };
            var infoUri = apiUri(branch, prj, key, "info", q);
            var r = {};
            filename = normalizeFileName(filename);
            return pxt.Util.httpGetTextAsync(infoUri).then(function (respText) {
                var info = JSON.parse(respText);
                if (!info)
                    throw new Error("info failed");
                var todo = info.languages;
                pxt.log('languages: ' + todo.map(function (l) { return l.code; }).join(', '));
                var nextFile = function () {
                    var item = todo.pop();
                    if (!item)
                        return Promise.resolve();
                    var exportFileUri = apiUri(branch, prj, key, "export-file", {
                        file: filename,
                        language: item.code,
                        export_translated_only: options.translatedOnly ? "1" : "0",
                        export_approved_only: options.validatedOnly ? "1" : "0"
                    });
                    pxt.log("downloading " + item.name + " - " + item.code + " (" + todo.length + " more)");
                    return pxt.Util.httpGetTextAsync(exportFileUri).then(function (transationsText) {
                        try {
                            var translations = JSON.parse(transationsText);
                            if (translations)
                                r[item.code] = translations;
                        }
                        catch (e) {
                            pxt.log(exportFileUri + ' ' + e);
                        }
                        return nextFile();
                    }).delay(1000); // throttling otherwise crowdin fails
                };
                return nextFile();
            }).then(function () { return r; });
        }
        crowdin.downloadTranslationsAsync = downloadTranslationsAsync;
        function mkIncr(filename) {
            var cnt = 0;
            return function incr() {
                if (cnt++ > 10) {
                    throw new Error("Too many API calls for " + filename);
                }
            };
        }
        function createDirectoryAsync(branch, prj, key, name, incr) {
            name = normalizeFileName(name);
            pxt.debug("create directory " + (branch || "") + "/" + name);
            if (!incr)
                incr = mkIncr(name);
            return pxt.Util.multipartPostAsync(apiUri(branch, prj, key, "add-directory"), { json: "true", name: name })
                .then(function (resp) {
                pxt.debug("crowdin resp: " + resp.statusCode);
                // 400 returned by folder already exists
                if (resp.statusCode == 200 || resp.statusCode == 400)
                    return Promise.resolve();
                if (resp.statusCode == 500 && resp.text) {
                    var json = JSON.parse(resp.text);
                    if (json.error.code === 50) {
                        pxt.log('directory already exists');
                        return Promise.resolve();
                    }
                }
                var data = resp.json || JSON.parse(resp.text) || { error: {} };
                if (resp.statusCode == 404 && data.error.code == 17) {
                    pxt.log("parent directory missing for " + name);
                    var par = name.replace(/\/[^\/]+$/, "");
                    if (par != name) {
                        return createDirectoryAsync(branch, prj, key, par, incr)
                            .then(function () { return createDirectoryAsync(branch, prj, key, name, incr); }); // retry
                    }
                }
                throw new Error("cannot create directory " + (branch || "") + "/" + name + ": " + resp.statusCode + " " + JSON.stringify(data));
            });
        }
        crowdin.createDirectoryAsync = createDirectoryAsync;
        function normalizeFileName(filename) {
            return filename.replace(/\\/g, '/');
        }
        function uploadTranslationAsync(branch, prj, key, filename, data) {
            pxt.Util.assert(!!prj);
            pxt.Util.assert(!!key);
            filename = normalizeFileName(filename);
            var incr = mkIncr(filename);
            function startAsync() {
                return uploadAsync("update-file", { update_option: "update_as_unapproved" });
            }
            function uploadAsync(op, opts) {
                opts["type"] = "auto";
                opts["json"] = "";
                opts["escape_quotes"] = "0";
                incr();
                return pxt.Util.multipartPostAsync(apiUri(branch, prj, key, op), opts, filename, data)
                    .then(function (resp) { return handleResponseAsync(resp); });
            }
            function handleResponseAsync(resp) {
                var code = resp.statusCode;
                var data = JSON.parse(resp.text);
                pxt.debug("upload result: " + code);
                if (code == 404 && data.error.code == 8) {
                    pxt.log("create new translation file: " + filename);
                    return uploadAsync("add-file", {});
                }
                else if (code == 404 && data.error.code == 17) {
                    return createDirectoryAsync(branch, prj, key, filename.replace(/\/[^\/]+$/, ""), incr)
                        .then(function () { return startAsync(); });
                }
                else if (code == 200) {
                    return Promise.resolve();
                }
                else {
                    throw new Error("Error, upload translation: " + filename + ", " + resp + ", " + JSON.stringify(data));
                }
            }
            return startAsync();
        }
        crowdin.uploadTranslationAsync = uploadTranslationAsync;
        function flatten(allFiles, files, parentDir, branch) {
            var n = files.name;
            var d = parentDir ? parentDir + "/" + n : n;
            files.fullName = d;
            files.branch = branch || "";
            switch (files.node_type) {
                case "file":
                    allFiles.push(files);
                    break;
                case "directory":
                    (files.files || []).forEach(function (f) { return flatten(allFiles, f, d); });
                    break;
                case "branch":
                    (files.files || []).forEach(function (f) { return flatten(allFiles, f, parentDir, files.name); });
                    break;
            }
        }
        function filterAndFlattenFiles(files, crowdinPath) {
            var pxtCrowdinBranch = pxt.appTarget.versions.pxtCrowdinBranch || "";
            var targetCrowdinBranch = pxt.appTarget.versions.targetCrowdinBranch || "";
            var allFiles = [];
            // flatten the files
            files.forEach(function (f) { return flatten(allFiles, f, ""); });
            // top level files are for PXT, subolder are targets
            allFiles = allFiles.filter(function (f) {
                if (f.fullName.indexOf('/') < 0)
                    return f.branch == pxtCrowdinBranch; // pxt file
                else
                    return f.branch == targetCrowdinBranch;
            });
            // folder filter
            if (crowdinPath) {
                // filter out crowdin folder
                allFiles = allFiles.filter(function (f) { return f.fullName.indexOf(crowdinPath) == 0; });
            }
            // filter out non-target files
            if (pxt.appTarget.id != "core") {
                var id_1 = pxt.appTarget.id + '/';
                allFiles = allFiles.filter(function (f) {
                    return f.fullName.indexOf('/') < 0 // top level file
                        || f.fullName.substr(0, id_1.length) == id_1 // from the target folder
                        || f.fullName.indexOf('common-docs') >= 0; // common docs
                });
            }
            return allFiles;
        }
        function projectInfoAsync(prj, key) {
            var q = { json: "true" };
            var infoUri = apiUri("", prj, key, "info", q);
            return pxt.Util.httpGetTextAsync(infoUri).then(function (respText) {
                var info = JSON.parse(respText);
                return info;
            });
        }
        crowdin.projectInfoAsync = projectInfoAsync;
        /**
         * Scans files in crowdin and report files that are not on disk anymore
         */
        function listFilesAsync(prj, key, crowdinPath) {
            pxt.log("crowdin: listing files under " + crowdinPath);
            return projectInfoAsync(prj, key)
                .then(function (info) {
                if (!info)
                    throw new Error("info failed");
                var allFiles = filterAndFlattenFiles(info.files, crowdinPath);
                pxt.debug("crowdin: found " + allFiles.length + " under " + crowdinPath);
                return allFiles.map(function (f) {
                    return {
                        fullName: f.fullName,
                        branch: f.branch || ""
                    };
                });
            });
        }
        crowdin.listFilesAsync = listFilesAsync;
        function languageStatsAsync(prj, key, lang) {
            var uri = apiUri("", prj, key, "language-status", { language: lang, json: "true" });
            return pxt.Util.httpGetJsonAsync(uri)
                .then(function (info) {
                var allFiles = filterAndFlattenFiles(info.files);
                return allFiles;
            });
        }
        crowdin.languageStatsAsync = languageStatsAsync;
    })(crowdin = pxt.crowdin || (pxt.crowdin = {}));
})(pxt || (pxt = {}));
/// <reference path='../localtypings/pxtarget.d.ts' />
/// <reference path="util.ts"/>
var pxt;
(function (pxt) {
    var docs;
    (function (docs) {
        var U = pxtc.Util;
        var lf = U.lf;
        var markedInstance;
        var stdboxes = {};
        var stdmacros = {};
        var stdSetting = "<!-- @CMD@ @ARGS@ -->";
        var stdsettings = {
            "parent": stdSetting,
            "short": stdSetting,
            "description": "<!-- desc -->"
        };
        function replaceAll(replIn, x, y) {
            return replIn.split(x).join(y);
        }
        function htmlQuote(s) {
            s = replaceAll(s, "&", "&amp;");
            s = replaceAll(s, "<", "&lt;");
            s = replaceAll(s, ">", "&gt;");
            s = replaceAll(s, "\"", "&quot;");
            s = replaceAll(s, "\'", "&#39;");
            return s;
        }
        docs.htmlQuote = htmlQuote;
        // the input already should be HTML-quoted but we want to make sure, and also quote quotes
        function html2Quote(s) {
            if (!s)
                return s;
            return htmlQuote(s.replace(/\&([#a-z0-9A-Z]+);/g, function (f, ent) {
                switch (ent) {
                    case "amp": return "&";
                    case "lt": return "<";
                    case "gt": return ">";
                    case "quot": return "\"";
                    default:
                        if (ent[0] == "#")
                            return String.fromCharCode(parseInt(ent.slice(1)));
                        else
                            return f;
                }
            }));
        }
        docs.html2Quote = html2Quote;
        //The extra YouTube macros are in case there is a timestamp on the YouTube URL.
        //TODO: Add equivalent support for youtu.be links
        var links = [
            {
                rx: /^vimeo\.com\/(\d+)/i,
                cmd: "### @vimeo $1"
            },
            {
                rx: /^(www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+(\#t=([0-9]+m[0-9]+s|[0-9]+m|[0-9]+s))?)/i,
                cmd: "### @youtube $2"
            }
        ];
        docs.requireMarked = function () {
            if (typeof marked !== "undefined")
                return marked;
            if (typeof require === "undefined")
                return undefined;
            return require("marked");
        };
        function parseHtmlAttrs(s) {
            var attrs = {};
            while (s.trim()) {
                var m = /\s*([^=\s]+)=("([^"]*)"|'([^']*)'|(\S*))/.exec(s);
                if (m) {
                    var v = m[3] || m[4] || m[5] || "";
                    attrs[m[1].toLowerCase()] = v;
                }
                else {
                    m = /^\s*(\S+)/.exec(s);
                    attrs[m[1]] = "true";
                }
                s = s.slice(m[0].length);
            }
            return attrs;
        }
        var error = function (s) {
            return "<div class='ui negative message'>" + htmlQuote(s) + "</div>";
        };
        function prepTemplate(d) {
            var boxes = U.clone(stdboxes);
            var macros = U.clone(stdmacros);
            var settings = U.clone(stdsettings);
            var menus = {};
            var toc = {};
            var params = d.params;
            var theme = d.theme;
            d.boxes = boxes;
            d.macros = macros;
            d.settings = settings;
            d.html = d.html.replace(/<aside\s+([^<>]+)>([^]*?)<\/aside>/g, function (full, attrsStr, body) {
                var attrs = parseHtmlAttrs(attrsStr);
                var name = attrs["data-name"] || attrs["id"];
                if (!name)
                    return error("id or data-name missing on macro");
                if (/box/.test(attrs["class"])) {
                    boxes[name] = body;
                }
                else if (/aside/.test(attrs["class"])) {
                    boxes[name] = "<!-- BEGIN-ASIDE " + name + " -->" + body + "<!-- END-ASIDE -->";
                }
                else if (/setting/.test(attrs["class"])) {
                    settings[name] = body;
                }
                else if (/menu/.test(attrs["class"])) {
                    menus[name] = body;
                }
                else if (/toc/.test(attrs["class"])) {
                    toc[name] = body;
                }
                else {
                    macros[name] = body;
                }
                return "<!-- macro " + name + " -->";
            });
            var recMenu = function (m, lev) {
                var templ = menus["item"];
                var mparams = {
                    NAME: m.name,
                };
                if (m.subitems) {
                    if (lev == 0)
                        templ = menus["top-dropdown"];
                    else
                        templ = menus["inner-dropdown"];
                    mparams["ITEMS"] = m.subitems.map(function (e) { return recMenu(e, lev + 1); }).join("\n");
                }
                else {
                    if (/^-+$/.test(m.name)) {
                        templ = menus["divider"];
                    }
                    if (m.path && !/^(https?:|\/)/.test(m.path))
                        return error("Invalid link: " + m.path);
                    mparams["LINK"] = m.path;
                }
                return injectHtml(templ, mparams, ["ITEMS"]);
            };
            var breadcrumb = [{
                    name: lf("Docs"),
                    href: "/docs"
                }];
            var tocPath = [];
            var isCurrentTOC = function (m) {
                for (var _i = 0, _a = m.subitems || []; _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (isCurrentTOC(c)) {
                        tocPath.push(m);
                        return true;
                    }
                }
                if (d.filepath && d.filepath.indexOf(m.path) == 0) {
                    tocPath.push(m);
                    return true;
                }
                return false;
            };
            (theme.TOC || []).forEach(isCurrentTOC);
            var currentTocEntry;
            var recTOC = function (m, lev) {
                var templ = toc["item"];
                var mparams = {
                    NAME: m.name,
                };
                if (m.path && !/^(https?:|\/)/.test(m.path))
                    return error("Invalid link: " + m.path);
                mparams["LINK"] = m.path;
                if (tocPath.indexOf(m) >= 0) {
                    mparams["ACTIVE"] = 'active';
                    mparams["EXPANDED"] = 'true';
                    currentTocEntry = m;
                    breadcrumb.push({
                        name: m.name,
                        href: m.path
                    });
                }
                else {
                    mparams["EXPANDED"] = 'false';
                }
                if (m.subitems && m.subitems.length > 0) {
                    if (lev == 0) {
                        if (m.name !== "") {
                            templ = toc["top-dropdown"];
                        }
                        else {
                            templ = toc["top-dropdown-noHeading"];
                        }
                    }
                    else if (lev == 1)
                        templ = toc["inner-dropdown"];
                    else
                        templ = toc["nested-dropdown"];
                    mparams["ITEMS"] = m.subitems.map(function (e) { return recTOC(e, lev + 1); }).join("\n");
                }
                else {
                    if (/^-+$/.test(m.name)) {
                        templ = toc["divider"];
                    }
                }
                return injectHtml(templ, mparams, ["ITEMS"]);
            };
            params["menu"] = (theme.docMenu || []).map(function (e) { return recMenu(e, 0); }).join("\n");
            params["TOC"] = (theme.TOC || []).map(function (e) { return recTOC(e, 0); }).join("\n");
            if (theme.appStoreID)
                params["appstoremeta"] = "<meta name=\"apple-itunes-app\" content=\"app-id=" + U.htmlEscape(theme.appStoreID) + "\"/>";
            var breadcrumbHtml = '';
            if (breadcrumb.length > 1) {
                breadcrumbHtml = "\n            <nav class=\"ui breadcrumb\" aria-label=\"" + lf("Breadcrumb") + "\">\n                " + breadcrumb.map(function (b, i) {
                    return "<a class=\"" + (i == breadcrumb.length - 1 ? "active" : "") + " section\"\n                        href=\"" + html2Quote(b.href) + "\" aria-current=\"" + (i == breadcrumb.length - 1 ? "page" : "") + "\">" + html2Quote(b.name) + "</a>";
                })
                    .join('<i class="right chevron icon divider"></i>') + "\n            </nav>";
            }
            params["breadcrumb"] = breadcrumbHtml;
            if (currentTocEntry) {
                if (currentTocEntry.prevPath) {
                    params["prev"] = "<a href=\"" + currentTocEntry.prevPath + "\" class=\"navigation navigation-prev \" title=\"" + currentTocEntry.prevName + "\">\n                                    <i class=\"icon angle left\"></i>\n                                </a>";
                }
                if (currentTocEntry.nextPath) {
                    params["next"] = "<a href=\"" + currentTocEntry.nextPath + "\" class=\"navigation navigation-next \" title=\"" + currentTocEntry.nextName + "\">\n                                    <i class=\"icon angle right\"></i>\n                                </a>";
                }
            }
            if (theme.boardName)
                params["boardname"] = html2Quote(theme.boardName);
            if (theme.driveDisplayName)
                params["drivename"] = html2Quote(theme.driveDisplayName);
            if (theme.homeUrl)
                params["homeurl"] = html2Quote(theme.homeUrl);
            params["targetid"] = theme.id || "???";
            params["targetname"] = theme.name || "Microsoft MakeCode";
            params["targetlogo"] = theme.docsLogo ? "<img aria-hidden=\"true\" role=\"presentation\" class=\"ui mini image\" src=\"" + U.toDataUri(theme.docsLogo) + "\" />" : "";
            var ghURLs = d.ghEditURLs || [];
            if (ghURLs.length) {
                var ghText = "<p style=\"margin-top:1em\">\n";
                var linkLabel = lf("Edit this page on GitHub");
                for (var _i = 0, ghURLs_1 = ghURLs; _i < ghURLs_1.length; _i++) {
                    var u = ghURLs_1[_i];
                    ghText += "<a href=\"" + u + "\"><i class=\"write icon\"></i>" + linkLabel + "</a><br>\n";
                    linkLabel = lf("Edit template of this page on GitHub");
                }
                ghText += "</p>\n";
                params["github"] = ghText;
            }
            else {
                params["github"] = "";
            }
            // Add accessiblity menu
            var accMenuHtml = "\n            <a href=\"#maincontent\" class=\"ui item link\" tabindex=\"0\" role=\"menuitem\">" + lf("Skip to main content") + "</a>\n        ";
            params['accMenu'] = accMenuHtml;
            // Add print button
            var printBtnHtml = "\n            <button id=\"printbtn\" class=\"circular ui icon right floated button hideprint\" title=\"" + lf("Print this page") + "\">\n                <i class=\"icon print\"></i>\n            </button>\n        ";
            params['printBtn'] = printBtnHtml;
            // Add sidebar toggle
            var sidebarToggleHtml = "\n            <a id=\"togglesidebar\" class=\"launch icon item\" tabindex=\"0\" title=\"Side menu\" aria-label=\"" + lf("Side menu") + "\" role=\"menu\" aria-expanded=\"false\">\n                <i class=\"content icon\"></i>\n            </a>\n        ";
            params['sidebarToggle'] = sidebarToggleHtml;
            // Add search bars
            var searchBarIds = ['tocsearch1', 'tocsearch2'];
            var searchBarsHtml = searchBarIds.map(function (searchBarId) {
                return "\n                <input type=\"search\" name=\"q\" placeholder=\"" + lf("Search...") + "\" aria-label=\"" + lf("Search Documentation") + "\">\n                <i onclick=\"document.getElementById('" + searchBarId + "').submit();\" tabindex=\"0\" class=\"search link icon\" aria-label=\"" + lf("Search") + "\" role=\"button\"></i>\n            ";
            });
            params["searchBar1"] = searchBarsHtml[0];
            params["searchBar2"] = searchBarsHtml[1];
            var style = '';
            if (theme.accentColor)
                style += "\n.ui.accent { color: " + theme.accentColor + "; }\n.ui.inverted.accent { background: " + theme.accentColor + "; }\n";
            params["targetstyle"] = style;
            for (var _a = 0, _b = Object.keys(theme); _a < _b.length; _a++) {
                var k = _b[_a];
                var v = theme[k];
                if (params[k] === undefined && typeof v == "string")
                    params[k] = v;
            }
            d.finish = function () { return injectHtml(d.html, params, [
                "body",
                "menu",
                "accMenu",
                "TOC",
                "prev",
                "next",
                "printBtn",
                "breadcrumb",
                "targetlogo",
                "github",
                "JSON",
                "appstoremeta",
                "sidebarToggle",
                "searchBar1",
                "searchBar2"
            ]); };
        }
        docs.prepTemplate = prepTemplate;
        function renderMarkdown(opts) {
            var hasPubInfo = true;
            if (!opts.pubinfo) {
                hasPubInfo = false;
                opts.pubinfo = {};
            }
            var pubinfo = opts.pubinfo;
            if (!opts.theme)
                opts.theme = {};
            delete opts.pubinfo["private"]; // just in case
            if (pubinfo["time"]) {
                var tm = parseInt(pubinfo["time"]);
                if (!pubinfo["timems"])
                    pubinfo["timems"] = 1000 * tm + "";
                if (!pubinfo["humantime"])
                    pubinfo["humantime"] = U.isoTime(tm);
            }
            if (pubinfo["name"]) {
                pubinfo["dirname"] = pubinfo["name"].replace(/[^A-Za-z0-9_]/g, "-");
                pubinfo["title"] = pubinfo["name"];
            }
            if (hasPubInfo) {
                pubinfo["JSON"] = JSON.stringify(pubinfo, null, 4).replace(/</g, "\\u003c");
            }
            var template = opts.template;
            template = template
                .replace(/<!--\s*@include\s+(\S+)\s*-->/g, function (full, fn) {
                var cont = (opts.theme.htmlDocIncludes || {})[fn] || "";
                return "<!-- include " + fn + " -->\n" + cont + "\n<!-- end include -->\n";
            });
            template = template
                .replace(/<!--\s*@(ifn?def)\s+(\w+)\s*-->([^]*?)<!--\s*@endif\s*-->/g, function (full, cond, sym, inner) {
                if ((cond == "ifdef" && pubinfo[sym]) || (cond == "ifndef" && !pubinfo[sym]))
                    return "<!-- " + cond + " " + sym + " -->" + inner + "<!-- endif -->";
                else
                    return "<!-- " + cond + " " + sym + " endif -->";
            });
            if (opts.locale)
                template = translate(template, opts.locale).text;
            var d = {
                html: template,
                theme: opts.theme,
                filepath: opts.filepath,
                ghEditURLs: opts.ghEditURLs,
                params: pubinfo,
            };
            prepTemplate(d);
            if (!markedInstance) {
                markedInstance = docs.requireMarked();
                var renderer = new markedInstance.Renderer();
                renderer.image = function (href, title, text) {
                    var out = '<img class="ui centered image" src="' + href + '" alt="' + text + '"';
                    if (title) {
                        out += ' title="' + title + '"';
                    }
                    out += this.options.xhtml ? '/>' : '>';
                    return out;
                };
                renderer.listitem = function (text) {
                    var m = /^\s*\[( |x)\]/i.exec(text);
                    if (m)
                        return "<li class=\"" + (m[1] == ' ' ? 'unchecked' : 'checked') + "\">" + text.slice(m[0].length) + '</li>\n';
                    return '<li>' + text + '</li>\n';
                };
                renderer.heading = function (text, level, raw) {
                    var m = /(.*)#([\w\-]+)\s*$/.exec(text);
                    var id = "";
                    if (m) {
                        text = m[1];
                        id = m[2];
                    }
                    else {
                        id = raw.toLowerCase().replace(/[^\w]+/g, '-');
                    }
                    return "<h" + level + " id=\"" + this.options.headerPrefix + id + "\">" + text + "</h" + level + ">";
                };
                markedInstance.setOptions({
                    renderer: renderer,
                    gfm: true,
                    tables: true,
                    breaks: false,
                    pedantic: false,
                    sanitize: true,
                    smartLists: true,
                    smartypants: true
                });
            }
            ;
            var markdown = opts.markdown;
            // append repo info if any
            if (opts.repo)
                markdown += "\n```package\n" + opts.repo.name.replace(/^pxt-/, '') + "=github:" + opts.repo.fullName + "#" + (opts.repo.tag || "master") + "\n```\n";
            //Uses the CmdLink definitions to replace links to YouTube and Vimeo (limited at the moment)
            markdown = markdown.replace(/^\s*https?:\/\/(\S+)\s*$/mg, function (f, lnk) {
                var _loop_1 = function (ent) {
                    var m = ent.rx.exec(lnk);
                    if (m) {
                        return { value: ent.cmd.replace(/\$(\d+)/g, function (f, k) {
                                return m[parseInt(k)] || "";
                            }) + "\n" };
                    }
                };
                for (var _i = 0, links_1 = links; _i < links_1.length; _i++) {
                    var ent = links_1[_i];
                    var state_1 = _loop_1(ent);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
                return f;
            });
            // replace pre-template in markdown
            markdown = markdown.replace(/@([a-z]+)@/ig, function (m, param) { return pubinfo[param] || 'unknown macro'; });
            var html = markedInstance(markdown);
            // support for breaks which somehow don't work out of the box
            html = html.replace(/&lt;br\s*\/&gt;/ig, "<br/>");
            var endBox = "";
            html = html.replace(/<h\d[^>]+>\s*([~@])\s*(.*?)<\/h\d>/g, function (f, tp, body) {
                var m = /^(\w+)\s+(.*)/.exec(body);
                var cmd = m ? m[1] : body;
                var args = m ? m[2] : "";
                var rawArgs = args;
                args = html2Quote(args);
                cmd = html2Quote(cmd);
                if (tp == "@") {
                    var expansion = U.lookup(d.settings, cmd);
                    if (expansion != null) {
                        pubinfo[cmd] = args;
                    }
                    else {
                        expansion = U.lookup(d.macros, cmd);
                        if (expansion == null)
                            return error("Unknown command: @" + cmd);
                    }
                    var ivars = {
                        ARGS: args,
                        CMD: cmd
                    };
                    return injectHtml(expansion, ivars, ["ARGS", "CMD"]);
                }
                else {
                    if (!cmd) {
                        var r = endBox;
                        endBox = "";
                        return r;
                    }
                    var box = U.lookup(d.boxes, cmd);
                    if (box) {
                        var parts = box.split("@BODY@");
                        endBox = parts[1];
                        return parts[0].replace("@ARGS@", args);
                    }
                    else {
                        return error("Unknown box: ~" + cmd);
                    }
                }
            });
            if (!pubinfo["title"]) {
                var titleM = /<h1[^<>]*>([^<>]+)<\/h1>/.exec(html);
                if (titleM)
                    pubinfo["title"] = html2Quote(titleM[1]);
            }
            if (!pubinfo["description"]) {
                var descM = /<p>([^]+?)<\/p>/.exec(html);
                if (descM)
                    pubinfo["description"] = html2Quote(descM[1]);
            }
            // try getting a better custom image for twitter
            var imgM = /<div class="ui embed mdvid"[^<>]+?data-placeholder="([^"]+)"[^>]*\/?>/i.exec(html)
                || /<img class="ui [^"]*image" src="([^"]+)"[^>]*\/?>/i.exec(html);
            if (imgM)
                pubinfo["cardLogo"] = html2Quote(imgM[1]);
            pubinfo["twitter"] = html2Quote(opts.theme.twitter || "@msmakecode");
            var registers = {};
            registers["main"] = ""; // first
            html = html.replace(/<!-- BEGIN-ASIDE (\S+) -->([^]*?)<!-- END-ASIDE -->/g, function (f, nam, cont) {
                var s = U.lookup(registers, nam);
                registers[nam] = (s || "") + cont;
                return "<!-- aside -->";
            });
            // fix up spourious newlines at the end of code blocks
            html = html.replace(/\n<\/code>/g, "</code>");
            registers["main"] = html;
            var injectBody = function (tmpl, body) {
                return injectHtml(d.boxes[tmpl] || "@BODY@", { BODY: body }, ["BODY"]);
            };
            html = "";
            for (var _i = 0, _a = Object.keys(registers); _i < _a.length; _i++) {
                var k = _a[_i];
                html += injectBody(k + "-container", registers[k]);
            }
            pubinfo["body"] = html;
            pubinfo["name"] = pubinfo["title"] + " - " + pubinfo["targetname"];
            for (var _b = 0, _c = Object.keys(opts.theme); _b < _c.length; _b++) {
                var k = _c[_b];
                var v = opts.theme[k];
                if (typeof v == "string")
                    pubinfo["theme_" + k] = v;
            }
            return d.finish();
        }
        docs.renderMarkdown = renderMarkdown;
        function injectHtml(template, vars, quoted) {
            if (quoted === void 0) { quoted = []; }
            if (!template)
                return '';
            return template.replace(/@(\w+)@/g, function (f, key) {
                var res = U.lookup(vars, key) || "";
                res += ""; // make sure it's a string
                if (quoted.indexOf(key) < 0) {
                    res = html2Quote(res);
                }
                return res;
            });
        }
        function embedUrl(rootUrl, tag, id, height) {
            var url = rootUrl + "#" + tag + ":" + id;
            var padding = '70%';
            return "<div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + url + "\" frameborder=\"0\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\"></iframe></div>";
        }
        docs.embedUrl = embedUrl;
        function runUrl(url, padding, id) {
            var embed = "<div style=\"position:relative;height:0;padding-bottom:" + padding + ";overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + url + "?id=" + encodeURIComponent(id) + "\" allowfullscreen=\"allowfullscreen\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\" frameborder=\"0\"></iframe></div>";
            return embed;
        }
        docs.runUrl = runUrl;
        function docsEmbedUrl(rootUrl, id, height) {
            var docurl = rootUrl + "--docs?projectid=" + id;
            height = Math.ceil(height || 300);
            return "<div style=\"position:relative;height:calc(" + height + "px + 5em);width:100%;overflow:hidden;\"><iframe style=\"position:absolute;top:0;left:0;width:100%;height:100%;\" src=\"" + docurl + "\" allowfullscreen=\"allowfullscreen\" frameborder=\"0\" sandbox=\"allow-popups allow-forms allow-scripts allow-same-origin\"></iframe></div>";
        }
        docs.docsEmbedUrl = docsEmbedUrl;
        var inlineTags = {
            b: 1,
            strong: 1,
            em: 1,
        };
        function translate(html, locale) {
            var missing = {};
            function translateOne(toTranslate) {
                var spm = /^(\s*)([^]*?)(\s*)$/.exec(toTranslate);
                var text = spm[2].replace(/\s+/g, " ");
                if (text == "" || /^((IE=edge,.*|width=device-width.*|(https?:\/\/|\/)[\w@\/\.]+|@[\-\w]+@|\{[^\{\}]+\}|[^a-zA-Z]*|(&nbsp;)+)\s*)+$/.test(text))
                    return null;
                var v = U.lookup(locale, text);
                if (v)
                    text = v;
                else
                    missing[text] = "";
                return spm[1] + text + spm[3];
            }
            html = html.replace(/<([\/\w]+)([^<>]*)>/g, function (full, tagname, args) {
                var key = tagname.replace(/^\//, "").toLowerCase();
                if (inlineTags[key] === 1)
                    return "&llt;" + tagname + args + "&ggt;";
                return full;
            });
            function ungt(s) {
                return s.replace(/&llt;/g, "<").replace(/&ggt;/g, ">");
            }
            html = "<start>" + html;
            html = html.replace(/(<([\/\w]+)([^<>]*)>)([^<>]+)/g, function (full, fullTag, tagname, args, str) {
                if (tagname == "script" || tagname == "style")
                    return ungt(full);
                var tr = translateOne(ungt(str));
                if (tr == null)
                    return ungt(full);
                return fullTag + tr;
            });
            html = html.replace(/(<[^<>]*)(content|placeholder|alt|title)="([^"]+)"/g, function (full, pref, attr, text) {
                var tr = translateOne(text);
                if (tr == null)
                    return full;
                return pref + attr + '="' + text.replace(/"/g, "''") + '"';
            });
            html = html.replace(/^<start>/g, "");
            return {
                text: html,
                missing: missing
            };
        }
        docs.translate = translate;
        function lookupSection(template, id) {
            if (template.id == id)
                return template;
            for (var _i = 0, _a = template.children; _i < _a.length; _i++) {
                var ch = _a[_i];
                var r = lookupSection(ch, id);
                if (r)
                    return r;
            }
            return null;
        }
        function splitMdSections(md, template) {
            var lineNo = 0;
            var openSections = [{
                    level: 0,
                    id: "",
                    title: "",
                    start: lineNo,
                    text: "",
                    children: []
                }];
            md = md.replace(/\r/g, "");
            var lines = md.split(/\n/);
            var skipThese = {};
            var _loop_2 = function (l) {
                var m = /^\s*(#+)\s*(.*?)(#(\S+)\s*)?$/.exec(l);
                var templSect = null;
                if (template && m) {
                    if (!m[4])
                        m = null;
                    else if (skipThese[m[4]])
                        m = null;
                    else {
                        templSect = lookupSection(template, m[4]);
                        var skip_1 = function (s) {
                            if (s.id)
                                skipThese[s.id] = true;
                            s.children.forEach(skip_1);
                        };
                        if (templSect)
                            skip_1(templSect);
                    }
                }
                if (m) {
                    var level = template ? 1 : m[1].length;
                    var s = {
                        level: level,
                        title: m[2].trim(),
                        id: m[4] || "",
                        start: lineNo,
                        text: "",
                        children: []
                    };
                    if (templSect) {
                        l = "";
                        for (var i = 0; i < templSect.level; ++i)
                            l += "#";
                        l += " ";
                        l += s.title || templSect.title;
                        l += " #" + s.id;
                    }
                    while (openSections[openSections.length - 1].level >= s.level)
                        openSections.pop();
                    var parent_1 = openSections[openSections.length - 1];
                    parent_1.children.push(s);
                    openSections.push(s);
                }
                openSections[openSections.length - 1].text += l + "\n";
                lineNo++;
            };
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var l = lines_1[_i];
                _loop_2(l);
            }
            return openSections[0];
        }
        function buildTOC(summaryMD) {
            if (!summaryMD)
                return null;
            var markedInstance = pxt.docs.requireMarked();
            var options = {
                renderer: new markedInstance.Renderer(),
                gfm: true,
                tables: false,
                breaks: false,
                pedantic: false,
                sanitize: false,
                smartLists: false,
                smartypants: false
            };
            var dummy = { name: 'dummy', subitems: [] };
            var currentStack = [];
            currentStack.push(dummy);
            var tokens = markedInstance.lexer(summaryMD, options);
            tokens.forEach(function (token) {
                switch (token.type) {
                    case "heading":
                        if (token.depth == 3) {
                            // heading
                        }
                        break;
                    case "list_start":
                        break;
                    case "list_item_start":
                    case "loose_item_start":
                        var newItem = {
                            name: '',
                            subitems: []
                        };
                        currentStack.push(newItem);
                        break;
                    case "text":
                        token.text.replace(/^\[(.*)\]\((.*)\)$/i, function (full, name, path) {
                            currentStack[currentStack.length - 1].name = name;
                            currentStack[currentStack.length - 1].path = path.replace('.md', '');
                        });
                        break;
                    case "list_item_end":
                    case "loose_item_end":
                        var docEntry = currentStack.pop();
                        currentStack[currentStack.length - 1].subitems.push(docEntry);
                        break;
                    case "list_end":
                        break;
                    default:
                }
            });
            var TOC = dummy.subitems;
            if (!TOC || TOC.length == 0)
                return null;
            var previousNode;
            // Scan tree and build next / prev paths
            var buildPrevNext = function (node) {
                if (previousNode) {
                    node.prevName = previousNode.name;
                    node.prevPath = previousNode.path;
                    previousNode.nextName = node.name;
                    previousNode.nextPath = node.path;
                }
                if (node.path) {
                    previousNode = node;
                }
                node.subitems.forEach(function (tocItem, tocIndex) {
                    buildPrevNext(tocItem);
                });
            };
            TOC.forEach(function (tocItem, tocIndex) {
                buildPrevNext(tocItem);
            });
            return TOC;
        }
        docs.buildTOC = buildTOC;
        function visitTOC(toc, fn) {
            function visitEntry(entry) {
                fn(entry);
                if (entry.subitems)
                    entry.subitems.forEach(fn);
            }
            toc.forEach(visitEntry);
        }
        docs.visitTOC = visitTOC;
        var testedAugment = false;
        function augmentDocs(baseMd, childMd) {
            if (!testedAugment)
                testAugment();
            if (!childMd)
                return baseMd;
            var templ = splitMdSections(baseMd, null);
            var repl = splitMdSections(childMd, templ);
            var lookup = {};
            var used = {};
            for (var _i = 0, _a = repl.children; _i < _a.length; _i++) {
                var ch = _a[_i];
                U.assert(ch.children.length == 0);
                U.assert(!!ch.id);
                lookup[ch.id] = ch.text;
            }
            var replaceInTree = function (s) {
                if (s.id && lookup[s.id] !== undefined) {
                    used[s.id] = true;
                    s.text = lookup[s.id];
                    s.children = [];
                }
                s.children.forEach(replaceInTree);
            };
            replaceInTree(templ);
            var resMd = "";
            var flatten = function (s) {
                resMd += s.text;
                s.children.forEach(flatten);
            };
            flatten(templ);
            var leftover = "";
            var hd = repl.text
                .replace(/^\s*#+\s*@extends.*/mg, "")
                .replace(/^\s*\n/mg, "");
            if (hd.trim())
                leftover += hd.trim() + "\n";
            for (var _b = 0, _c = repl.children; _b < _c.length; _b++) {
                var s = _c[_b];
                if (!used[s.id])
                    leftover += s.text;
            }
            if (leftover) {
                resMd += "## Couldn't apply replacement logic to:\n" + leftover;
            }
            return resMd;
        }
        docs.augmentDocs = augmentDocs;
        function testAugment() {
            function test(a, b, c) {
                var r = augmentDocs(a, b).trim();
                c = c.trim();
                if (r != c) {
                    console.log("*** Template:\n" + a + "\n*** Input:\n" + b + "\n*** Expected:\n" + c + "\n*** Output:\n" + r);
                    throw new Error("augment docs test fail");
                }
            }
            testedAugment = true;
            var templ0 = "\n# T0\n## Examples #ex\n### Example 1\nTEx1\n### Example 2 #ex2\nTEx2\n### Example 3\nTEx3\n\n## See also #also\nTAlso\n";
            var inp0 = "\n# @extends\n# #ex2\nMy example\n## See Also These! #also\nMy links\n";
            var outp0 = "\n# T0\n## Examples #ex\n### Example 1\nTEx1\n### Example 2 #ex2\nMy example\n### Example 3\nTEx3\n\n## See Also These! #also\nMy links\n";
            var inp1 = "\n# @extends\n### #ex\nFoo\n#### Example 1\nEx1\n#### Example 2x #ex2\nEx2\n## See Also These! #also\nMy links\n";
            var outp1 = "\n# T0\n## Examples #ex\nFoo\n#### Example 1\nEx1\n#### Example 2x #ex2\nEx2\n## See Also These! #also\nMy links\n";
            test(templ0, "", templ0);
            test(templ0, " ", templ0);
            test(templ0, inp0, outp0);
            test(templ0, inp1, outp1);
        }
    })(docs = pxt.docs || (pxt.docs = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var github;
    (function (github) {
        function listRefsAsync(repopath, namespace) {
            if (namespace === void 0) { namespace = "tags"; }
            return pxt.U.httpGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/" + namespace + "/?per_page=100")
                .then(function (resp) {
                var tagnames = resp
                    .map(function (x) { return x.ref.replace(/^refs\/[^\/]+\//, ""); });
                tagnames.sort(pxt.semver.strcmp);
                return tagnames;
            }, function (err) {
                if (err.statusCode == 404)
                    return [];
                else
                    return Promise.reject(err);
            });
        }
        github.listRefsAsync = listRefsAsync;
        function resolveRefAsync(r) {
            if (r.object.type == "commit")
                return Promise.resolve(r.object.sha);
            else if (r.object.type == "tag")
                return pxt.U.httpGetJsonAsync(r.object.url)
                    .then(function (r) {
                    return r.object.type == "commit" ? r.object.sha :
                        Promise.reject(new Error("Bad type (2nd order) " + r.object.type));
                });
            else
                return Promise.reject(new Error("Bad type " + r.object.type));
        }
        function tagToShaAsync(repopath, tag) {
            if (/^[a-f0-9]{40}$/.test(tag))
                return Promise.resolve(tag);
            return pxt.U.httpGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/tags/" + tag)
                .then(resolveRefAsync, function (e) {
                return pxt.U.httpGetJsonAsync("https://api.github.com/repos/" + repopath + "/git/refs/heads/" + tag)
                    .then(resolveRefAsync);
            });
        }
        github.tagToShaAsync = tagToShaAsync;
        function pkgConfigAsync(repopath, tag) {
            if (tag === void 0) { tag = "master"; }
            var url = "https://raw.githubusercontent.com/" + repopath + "/" + tag + "/" + pxt.CONFIG_NAME;
            return pxt.U.httpGetTextAsync(url)
                .then(function (v) { return JSON.parse(v); });
        }
        github.pkgConfigAsync = pkgConfigAsync;
        function downloadPackageAsync(repoWithTag, config, current) {
            if (current === void 0) { current = null; }
            var p = parseRepoId(repoWithTag);
            if (!p) {
                pxt.log('Unknown github syntax');
                return Promise.resolve(undefined);
            }
            if (isRepoBanned(p, config)) {
                pxt.tickEvent("github.download.banned");
                pxt.log('Github repo is banned');
                return Promise.resolve(undefined);
            }
            return tagToShaAsync(p.fullName, p.tag)
                .then(function (sha) {
                var pref = "https://raw.githubusercontent.com/" + p.fullName + "/" + sha + "/";
                if (!current)
                    current = { sha: "", files: {} };
                if (current.sha === sha)
                    return Promise.resolve(current);
                else {
                    pxt.log("Downloading " + repoWithTag + " -> " + sha);
                    return pxt.U.httpGetTextAsync(pref + pxt.CONFIG_NAME)
                        .then(function (pkg) {
                        current.files = {};
                        current.sha = "";
                        current.files[pxt.CONFIG_NAME] = pkg;
                        var cfg = JSON.parse(pkg);
                        return Promise.map(cfg.files.concat(cfg.testFiles || []), function (fn) { return pxt.U.httpGetTextAsync(pref + fn)
                            .then(function (text) {
                            current.files[fn] = text;
                        }); })
                            .then(function () {
                            current.sha = sha;
                            return current;
                        });
                    });
                }
            });
        }
        github.downloadPackageAsync = downloadPackageAsync;
        var GitRepoStatus;
        (function (GitRepoStatus) {
            GitRepoStatus[GitRepoStatus["Unknown"] = 0] = "Unknown";
            GitRepoStatus[GitRepoStatus["Approved"] = 1] = "Approved";
            GitRepoStatus[GitRepoStatus["Banned"] = 2] = "Banned";
        })(GitRepoStatus = github.GitRepoStatus || (github.GitRepoStatus = {}));
        function repoIconUrl(repo) {
            if (repo.status != GitRepoStatus.Approved)
                return undefined;
            return pxt.Cloud.apiRoot + ("gh/" + repo.fullName + "/icon");
        }
        github.repoIconUrl = repoIconUrl;
        function mkRepo(r, config, tag) {
            if (!r)
                return undefined;
            var rr = {
                owner: r.owner.login.toLowerCase(),
                fullName: r.full_name.toLowerCase(),
                name: r.name,
                description: r.description,
                defaultBranch: r.default_branch,
                tag: tag
            };
            rr.status = repoStatus(rr, config);
            return rr;
        }
        function repoStatus(rr, config) {
            return isRepoBanned(rr, config) ? GitRepoStatus.Banned
                : isRepoApproved(rr, config) ? GitRepoStatus.Approved
                    : GitRepoStatus.Unknown;
        }
        github.repoStatus = repoStatus;
        function isOrgBanned(repo, config) {
            if (!config)
                return false; // don't know
            if (!repo || !repo.owner)
                return true;
            if (config.bannedOrgs
                && config.bannedOrgs.some(function (org) { return org.toLowerCase() == repo.owner.toLowerCase(); }))
                return true;
            return false;
        }
        function isRepoBanned(repo, config) {
            if (isOrgBanned(repo, config))
                return true;
            if (!config)
                return false; // don't know
            if (!repo || !repo.fullName)
                return true;
            if (config.bannedRepos
                && config.bannedRepos.some(function (fn) { return fn.toLowerCase() == repo.fullName.toLowerCase(); }))
                return true;
            return false;
        }
        function isOrgApproved(repo, config) {
            if (!repo || !config)
                return false;
            if (repo.owner
                && config.approvedOrgs
                && config.approvedOrgs.some(function (org) { return org.toLowerCase() == repo.owner.toLowerCase(); }))
                return true;
            return false;
        }
        function isRepoApproved(repo, config) {
            if (isOrgApproved(repo, config))
                return true;
            if (!repo || !config)
                return false;
            if (repo.fullName
                && config.approvedRepos
                && config.approvedRepos.some(function (fn) { return fn.toLowerCase() == repo.fullName.toLowerCase(); }))
                return true;
            return false;
        }
        function repoAsync(id, config) {
            var rid = parseRepoId(id);
            var status = repoStatus(rid, config);
            if (status == GitRepoStatus.Banned)
                return Promise.resolve(undefined);
            // always use proxy
            return pxt.Util.httpGetJsonAsync(pxt.Cloud.apiRoot + "gh/" + rid.fullName)
                .then(function (meta) {
                if (!meta)
                    return undefined;
                return {
                    github: true,
                    owner: rid.owner,
                    fullName: rid.fullName,
                    name: meta.name,
                    description: meta.description,
                    defaultBranch: "master",
                    tag: rid.tag,
                    status: status
                };
            });
        }
        github.repoAsync = repoAsync;
        function searchAsync(query, config) {
            if (!config)
                return Promise.resolve([]);
            var repos = query.split('|').map(parseRepoUrl).filter(function (repo) { return !!repo; });
            if (repos.length > 0)
                return Promise.all(repos.map(function (id) { return repoAsync(id.path, config); }))
                    .then(function (rs) { return rs.filter(function (r) { return r.status != GitRepoStatus.Banned; }); }); // allow deep links to github repos
            query += " in:name,description,readme \"for PXT/" + (pxt.appTarget.platformid || pxt.appTarget.id) + "\"";
            return pxt.U.httpGetJsonAsync("https://api.github.com/search/repositories?q=" + encodeURIComponent(query))
                .then(function (rs) {
                return rs.items.map(function (item) { return mkRepo(item, config); })
                    .filter(function (r) { return r.status == GitRepoStatus.Approved || (config.allowUnapproved && r.status == GitRepoStatus.Unknown); });
            })
                .catch(function (err) { return []; }); // offline
        }
        github.searchAsync = searchAsync;
        function parseRepoUrl(url) {
            if (!url)
                return undefined;
            var m = /^((https:\/\/)?github.com\/)?([^/]+\/[^/#]+)(#(\w+))?$/i.exec(url.trim());
            if (!m)
                return undefined;
            var r = {
                repo: m ? m[3].toLowerCase() : null,
                tag: m ? m[5] : null
            };
            r.path = r.repo + (r.tag ? '#' + r.tag : '');
            return r;
        }
        github.parseRepoUrl = parseRepoUrl;
        function parseRepoId(repo) {
            if (!repo)
                return undefined;
            repo = repo.replace(/^github:/i, "");
            var m = /([^#]+)(#(.*))?/.exec(repo);
            var owner = m ? m[1].split('/')[0].toLowerCase() : undefined;
            return {
                owner: owner,
                fullName: m ? m[1].toLowerCase() : repo.toLowerCase(),
                tag: m ? m[3] : null
            };
        }
        github.parseRepoId = parseRepoId;
        function isGithubId(id) {
            return id.slice(0, 7) == "github:";
        }
        github.isGithubId = isGithubId;
        function stringifyRepo(p) {
            return p ? "github:" + p.fullName.toLowerCase() + "#" + (p.tag || "master") : undefined;
        }
        github.stringifyRepo = stringifyRepo;
        function noramlizeRepoId(id) {
            return stringifyRepo(parseRepoId(id));
        }
        github.noramlizeRepoId = noramlizeRepoId;
        function latestVersionAsync(path, config) {
            var parsed = parseRepoId(path);
            if (!parsed)
                return Promise.resolve(null);
            return repoAsync(parsed.fullName, config)
                .then(function (scr) {
                if (!scr)
                    return undefined;
                return listRefsAsync(scr.fullName, "tags")
                    .then(function (tags) {
                    tags.sort(pxt.semver.strcmp);
                    tags.reverse();
                    if (tags[0])
                        return Promise.resolve(tags[0]);
                    else
                        return tagToShaAsync(scr.fullName, scr.defaultBranch);
                });
            });
        }
        github.latestVersionAsync = latestVersionAsync;
        function publishGistAsync(token, forceNew, files, name, currentGistId) {
            // Github gist API: https://developer.github.com/v3/gists/
            var data = {
                "description": name,
                "public": false,
                "files": files
            };
            var headers = {};
            var method, url = "https://api.github.com/gists";
            if (token)
                headers['Authorization'] = "token " + token;
            if (currentGistId && token && !forceNew) {
                // Patch existing gist
                method = 'PATCH';
                url += "/" + currentGistId;
            }
            else {
                // Create new gist
                method = 'POST';
            }
            return pxt.U.requestAsync({
                url: url,
                allowHttpErrors: true,
                headers: headers,
                method: method,
                data: data || {}
            })
                .then(function (resp) {
                if ((resp.statusCode == 200 || resp.statusCode == 201) && resp.json.id) {
                    return Promise.resolve(resp.json.id);
                }
                else if (resp.statusCode == 404 && method == 'PATCH') {
                    return Promise.reject(resp.statusCode);
                }
                else if (resp.statusCode == 404) {
                    return Promise.reject("Make sure to add the ``gist`` scope to your token. " + resp.text);
                }
                return Promise.reject(resp.text);
            });
        }
        github.publishGistAsync = publishGistAsync;
    })(github = pxt.github || (pxt.github = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var HF2;
    (function (HF2) {
        // see https://github.com/Microsoft/uf2/blob/master/hf2.md for full spec
        HF2.HF2_CMD_BININFO = 0x0001; // no arguments
        HF2.HF2_MODE_BOOTLOADER = 0x01;
        HF2.HF2_MODE_USERSPACE = 0x02;
        /*
        struct HF2_BININFO_Result {
            uint32_t mode;
            uint32_t flash_page_size;
            uint32_t flash_num_pages;
            uint32_t max_message_size;
        };
        */
        HF2.HF2_CMD_INFO = 0x0002;
        // no arguments
        // results is utf8 character array
        HF2.HF2_CMD_RESET_INTO_APP = 0x0003; // no arguments, no result
        HF2.HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004; // no arguments, no result
        HF2.HF2_CMD_START_FLASH = 0x0005; // no arguments, no result
        HF2.HF2_CMD_WRITE_FLASH_PAGE = 0x0006;
        /*
        struct HF2_WRITE_FLASH_PAGE_Command {
            uint32_t target_addr;
            uint32_t data[flash_page_size];
        };
        */
        // no result
        HF2.HF2_CMD_CHKSUM_PAGES = 0x0007;
        /*
        struct HF2_CHKSUM_PAGES_Command {
            uint32_t target_addr;
            uint32_t num_pages;
        };
        struct HF2_CHKSUM_PAGES_Result {
            uint16_t chksums[num_pages];
        };
        */
        HF2.HF2_CMD_READ_WORDS = 0x0008;
        /*
        struct HF2_READ_WORDS_Command {
            uint32_t target_addr;
            uint32_t num_words;
        };
        struct HF2_READ_WORDS_Result {
            uint32_t words[num_words];
        };
        */
        HF2.HF2_CMD_WRITE_WORDS = 0x0009;
        /*
        struct HF2_WRITE_WORDS_Command {
            uint32_t target_addr;
            uint32_t num_words;
            uint32_t words[num_words];
        };
        */
        // no result
        HF2.HF2_CMD_DMESG = 0x0010;
        // no arguments
        // results is utf8 character array
        HF2.HF2_FLAG_SERIAL_OUT = 0x80;
        HF2.HF2_FLAG_SERIAL_ERR = 0xC0;
        HF2.HF2_FLAG_CMDPKT_LAST = 0x40;
        HF2.HF2_FLAG_CMDPKT_BODY = 0x00;
        HF2.HF2_FLAG_MASK = 0xC0;
        HF2.HF2_SIZE_MASK = 63;
        HF2.HF2_STATUS_OK = 0x00;
        HF2.HF2_STATUS_INVALID_CMD = 0x01;
        HF2.HF2_STATUS_EXEC_ERR = 0x02;
        HF2.HF2_STATUS_EVENT = 0x80;
        // the eventId is overlayed on the tag+status; the mask corresponds
        // to the HF2_STATUS_EVENT above
        HF2.HF2_EV_MASK = 0x800000;
        function write32(buf, pos, v) {
            buf[pos + 0] = (v >> 0) & 0xff;
            buf[pos + 1] = (v >> 8) & 0xff;
            buf[pos + 2] = (v >> 16) & 0xff;
            buf[pos + 3] = (v >> 24) & 0xff;
        }
        HF2.write32 = write32;
        function write16(buf, pos, v) {
            buf[pos + 0] = (v >> 0) & 0xff;
            buf[pos + 1] = (v >> 8) & 0xff;
        }
        HF2.write16 = write16;
        function read32(buf, pos) {
            return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0;
        }
        HF2.read32 = read32;
        function read16(buf, pos) {
            return buf[pos] | (buf[pos + 1] << 8);
        }
        HF2.read16 = read16;
        function encodeU32LE(words) {
            var r = new Uint8Array(words.length * 4);
            for (var i = 0; i < words.length; ++i)
                write32(r, i * 4, words[i]);
            return r;
        }
        HF2.encodeU32LE = encodeU32LE;
        function decodeU32LE(buf) {
            var res = [];
            for (var i = 0; i < buf.length; i += 4)
                res.push(read32(buf, i));
            return res;
        }
        HF2.decodeU32LE = decodeU32LE;
        var logEnabled = false;
        function enableLog() {
            logEnabled = true;
        }
        HF2.enableLog = enableLog;
        function log(msg) {
            if (logEnabled)
                pxt.log("HF2: " + msg);
            else
                pxt.debug("HF2: " + msg);
        }
        var Wrapper = /** @class */ (function () {
            function Wrapper(io) {
                var _this = this;
                this.io = io;
                this.cmdSeq = pxt.U.randomUint32();
                this.lock = new pxt.U.PromiseQueue();
                this.rawMode = false;
                this.maxMsgSize = 63; // when running in forwarding mode, we do not really know
                this.bootloaderMode = false;
                this.reconnectTries = 0;
                this.autoReconnect = false;
                this.msgs = new pxt.U.PromiseBuffer();
                this.eventHandlers = {};
                this.onSerial = function (buf, isStderr) { };
                var frames = [];
                io.onSerial = function (b, e) { return _this.onSerial(b, e); };
                io.onData = function (buf) {
                    var tp = buf[0] & HF2.HF2_FLAG_MASK;
                    var len = buf[0] & 63;
                    //console.log(`msg tp=${tp} len=${len}`)
                    var frame = new Uint8Array(len);
                    pxt.U.memcpy(frame, 0, buf, 1, len);
                    if (tp & HF2.HF2_FLAG_SERIAL_OUT) {
                        _this.onSerial(frame, tp == HF2.HF2_FLAG_SERIAL_ERR);
                        return;
                    }
                    frames.push(frame);
                    if (tp == HF2.HF2_FLAG_CMDPKT_BODY) {
                        return;
                    }
                    else {
                        pxt.U.assert(tp == HF2.HF2_FLAG_CMDPKT_LAST);
                        var total = 0;
                        for (var _i = 0, frames_1 = frames; _i < frames_1.length; _i++) {
                            var f = frames_1[_i];
                            total += f.length;
                        }
                        var r = new Uint8Array(total);
                        var ptr = 0;
                        for (var _a = 0, frames_2 = frames; _a < frames_2.length; _a++) {
                            var f = frames_2[_a];
                            pxt.U.memcpy(r, ptr, f);
                            ptr += f.length;
                        }
                        frames = [];
                        if (r[2] & HF2.HF2_STATUS_EVENT) {
                            // asynchronous event
                            io.onEvent(r);
                        }
                        else {
                            _this.msgs.push(r);
                        }
                    }
                };
                io.onEvent = function (buf) {
                    var evid = read32(buf, 0);
                    var f = pxt.U.lookup(_this.eventHandlers, evid + "");
                    if (f) {
                        f(buf.slice(4));
                    }
                    else {
                        log("unhandled event: " + evid.toString(16));
                    }
                };
                io.onError = function (err) {
                    log("recv error: " + err.message);
                    if (_this.autoReconnect) {
                        _this.autoReconnect = false;
                        _this.reconnectAsync()
                            .then(function () {
                            _this.autoReconnect = true;
                        }, function (err) {
                            log("reconnect error: " + err.message);
                        });
                    }
                    //this.msgs.pushError(err)
                };
            }
            Wrapper.prototype.resetState = function () {
                this.lock = new pxt.U.PromiseQueue();
                this.info = null;
                this.infoRaw = null;
                this.pageSize = null;
                this.flashSize = null;
                this.maxMsgSize = 63;
                this.bootloaderMode = false;
                this.msgs.drain();
            };
            Wrapper.prototype.onEvent = function (id, f) {
                pxt.U.assert(!!(id & HF2.HF2_EV_MASK));
                this.eventHandlers[id + ""] = f;
            };
            Wrapper.prototype.reconnectAsync = function (first) {
                var _this = this;
                if (first === void 0) { first = false; }
                this.resetState();
                if (first)
                    return this.initAsync();
                log("reconnect raw=" + this.rawMode);
                return this.io.reconnectAsync()
                    .then(function () { return _this.initAsync(); })
                    .catch(function (e) {
                    if (_this.reconnectTries < 5) {
                        _this.reconnectTries++;
                        log("error " + e.message + "; reconnecting attempt #" + _this.reconnectTries);
                        return Promise.delay(500)
                            .then(function () { return _this.reconnectAsync(); });
                    }
                    else {
                        throw e;
                    }
                });
            };
            Wrapper.prototype.disconnectAsync = function () {
                log("disconnect");
                return this.io.disconnectAsync();
            };
            Wrapper.prototype.error = function (m) {
                return this.io.error(m);
            };
            Wrapper.prototype.talkAsync = function (cmd, data) {
                var _this = this;
                if (this.io.talksAsync)
                    return this.io.talksAsync([{ cmd: cmd, data: data }])
                        .then(function (v) { return v[0]; });
                var len = 8;
                if (data)
                    len += data.length;
                var pkt = new Uint8Array(len);
                var seq = ++this.cmdSeq & 0xffff;
                write32(pkt, 0, cmd);
                write16(pkt, 4, seq);
                write16(pkt, 6, 0);
                if (data)
                    pxt.U.memcpy(pkt, 8, data, 0, data.length);
                var numSkipped = 0;
                var handleReturnAsync = function () {
                    return _this.msgs.shiftAsync(1000) // we wait up to a second
                        .then(function (res) {
                        if (read16(res, 0) != seq) {
                            if (numSkipped < 3) {
                                numSkipped++;
                                log("message out of sync, (" + seq + " vs " + read16(res, 0) + "); will re-try");
                                return handleReturnAsync();
                            }
                            _this.error("out of sync");
                        }
                        var info = "";
                        if (res[3])
                            info = "; info=" + res[3];
                        switch (res[2]) {
                            case HF2.HF2_STATUS_OK:
                                return res.slice(4);
                            case HF2.HF2_STATUS_INVALID_CMD:
                                _this.error("invalid command" + info);
                                break;
                            case HF2.HF2_STATUS_EXEC_ERR:
                                _this.error("execution error" + info);
                                break;
                            default:
                                _this.error("error " + res[2] + info);
                                break;
                        }
                        return null;
                    });
                };
                return this.sendMsgAsync(pkt)
                    .then(handleReturnAsync);
            };
            Wrapper.prototype.sendMsgAsync = function (buf) {
                return this.sendMsgCoreAsync(buf);
            };
            Wrapper.prototype.sendSerialAsync = function (buf, useStdErr) {
                if (useStdErr === void 0) { useStdErr = false; }
                if (this.io.sendSerialAsync)
                    return this.io.sendSerialAsync(buf, useStdErr);
                return this.sendMsgCoreAsync(buf, useStdErr ? 2 : 1);
            };
            Wrapper.prototype.sendMsgCoreAsync = function (buf, serial) {
                var _this = this;
                if (serial === void 0) { serial = 0; }
                // Util.assert(buf.length <= this.maxMsgSize)
                var frame = new Uint8Array(64);
                var loop = function (pos) {
                    var len = buf.length - pos;
                    if (len <= 0)
                        return Promise.resolve();
                    if (len > 63) {
                        len = 63;
                        frame[0] = HF2.HF2_FLAG_CMDPKT_BODY;
                    }
                    else {
                        frame[0] = HF2.HF2_FLAG_CMDPKT_LAST;
                    }
                    if (serial)
                        frame[0] = serial == 1 ? HF2.HF2_FLAG_SERIAL_OUT : HF2.HF2_FLAG_SERIAL_ERR;
                    frame[0] |= len;
                    for (var i = 0; i < len; ++i)
                        frame[i + 1] = buf[pos + i];
                    return _this.io.sendPacketAsync(frame)
                        .then(function () { return loop(pos + len); });
                };
                return this.lock.enqueue("out", function () { return loop(0); });
            };
            Wrapper.prototype.switchToBootloaderAsync = function () {
                var _this = this;
                if (this.bootloaderMode)
                    return Promise.resolve();
                log("Switching into bootloader mode");
                return this.talkAsync(HF2.HF2_CMD_START_FLASH)
                    .then(function () { return _this.initAsync(); })
                    .then(function () {
                    if (!_this.bootloaderMode)
                        _this.error("cannot switch into bootloader mode");
                });
            };
            Wrapper.prototype.reflashAsync = function (blocks) {
                var _this = this;
                log("reflash");
                return this.flashAsync(blocks)
                    .then(function () { return Promise.delay(100); })
                    .then(function () { return _this.reconnectAsync(); });
            };
            Wrapper.prototype.writeWordsAsync = function (addr, words) {
                pxt.U.assert(words.length <= 64); // just sanity check
                return this.talkAsync(HF2.HF2_CMD_WRITE_WORDS, encodeU32LE([addr, words.length].concat(words)))
                    .then(function () { });
            };
            Wrapper.prototype.readWordsAsync = function (addr, numwords) {
                var args = new Uint8Array(8);
                write32(args, 0, addr);
                write32(args, 4, numwords);
                pxt.U.assert(numwords <= 64); // just sanity check
                return this.talkAsync(HF2.HF2_CMD_READ_WORDS, args);
            };
            Wrapper.prototype.pingAsync = function () {
                if (this.rawMode)
                    return Promise.resolve();
                return this.talkAsync(HF2.HF2_CMD_BININFO)
                    .then(function (buf) { });
            };
            Wrapper.prototype.flashAsync = function (blocks) {
                var _this = this;
                var start = Date.now();
                var fstart = 0;
                var loopAsync = function (pos) {
                    if (pos >= blocks.length)
                        return Promise.resolve();
                    var b = blocks[pos];
                    pxt.U.assert(b.payloadSize == _this.pageSize);
                    var buf = new Uint8Array(4 + b.payloadSize);
                    write32(buf, 0, b.targetAddr);
                    pxt.U.memcpy(buf, 4, b.data, 0, b.payloadSize);
                    return _this.talkAsync(HF2.HF2_CMD_WRITE_FLASH_PAGE, buf)
                        .then(function () { return loopAsync(pos + 1); });
                };
                return this.switchToBootloaderAsync()
                    .then(function () {
                    var size = blocks.length * _this.pageSize;
                    log("Starting flash (" + Math.round(size / 1024) + "kB).");
                    fstart = Date.now();
                    return onlyChangedBlocksAsync(blocks, function (a, l) { return _this.readWordsAsync(a, l); });
                })
                    .then(function (res) {
                    if (res.length != blocks.length) {
                        blocks = res;
                        var size = blocks.length * _this.pageSize;
                        log("Performing partial flash (" + Math.round(size / 1024) + "kB).");
                    }
                })
                    .then(function () { return loopAsync(0); })
                    .then(function () {
                    var n = Date.now();
                    var t0 = n - start;
                    var t1 = n - fstart;
                    log("Flashing done at " + Math.round(blocks.length * _this.pageSize / t1 * 1000 / 1024) + " kB/s in " + t0 + "ms (reset " + (t0 - t1) + "ms). Resetting.");
                })
                    .then(function () {
                    return _this.talkAsync(HF2.HF2_CMD_RESET_INTO_APP)
                        .catch(function (e) {
                        // error expected here - device is resetting
                    });
                })
                    .then(function () { });
            };
            Wrapper.prototype.initAsync = function () {
                var _this = this;
                if (this.rawMode)
                    return Promise.resolve();
                return Promise.resolve()
                    .then(function () { return _this.talkAsync(HF2.HF2_CMD_BININFO); })
                    .then(function (binfo) {
                    _this.bootloaderMode = binfo[0] == HF2.HF2_MODE_BOOTLOADER;
                    _this.pageSize = read32(binfo, 4);
                    _this.flashSize = read32(binfo, 8) * _this.pageSize;
                    _this.maxMsgSize = read32(binfo, 12);
                    log("Connected; msgSize " + _this.maxMsgSize + "B; flash " + _this.flashSize / 1024 + "kB; " + (_this.bootloaderMode ? "bootloader" : "application") + " mode");
                    return _this.talkAsync(HF2.HF2_CMD_INFO);
                })
                    .then(function (buf) {
                    _this.infoRaw = pxt.U.fromUTF8(pxt.U.uint8ArrayToString(buf));
                    var info = {};
                    ("Header: " + _this.infoRaw).replace(/^([\w\-]+):\s*([^\n\r]*)/mg, function (f, n, v) {
                        info[n.replace(/-/g, "")] = v;
                        return "";
                    });
                    _this.info = info;
                    var m = /v(\d\S+)\s+(\S+)/.exec(_this.info.Header);
                    _this.info.Parsed = {
                        Version: m[1],
                        Features: m[2],
                    };
                    log("Board-ID: " + _this.info.BoardID + " v" + _this.info.Parsed.Version + " f" + _this.info.Parsed.Features);
                })
                    .then(function () {
                    _this.reconnectTries = 0;
                });
            };
            return Wrapper;
        }());
        HF2.Wrapper = Wrapper;
        function readChecksumBlockAsync(readWordsAsync) {
            if (!pxt.appTarget.compile.flashChecksumAddr)
                return Promise.resolve(null);
            return readWordsAsync(pxt.appTarget.compile.flashChecksumAddr, 12)
                .then(function (buf) {
                var blk = pxtc.hex.parseChecksumBlock(buf);
                if (!blk)
                    return null;
                return readWordsAsync(blk.endMarkerPos, 1)
                    .then(function (w) {
                    if (read32(w, 0) != blk.endMarker) {
                        pxt.log("end-marker mismatch");
                        return null;
                    }
                    return blk;
                });
            });
        }
        function onlyChangedBlocksAsync(blocks, readWordsAsync) {
            if (!pxt.appTarget.compile.flashChecksumAddr)
                return Promise.resolve(blocks);
            var blBuf = pxtc.UF2.readBytes(blocks, pxt.appTarget.compile.flashChecksumAddr, 12 * 4);
            var blChk = pxtc.hex.parseChecksumBlock(blBuf);
            if (!blChk)
                return Promise.resolve(blocks);
            return readChecksumBlockAsync(readWordsAsync)
                .then(function (devChk) {
                if (!devChk)
                    return blocks;
                var regionsOk = devChk.regions.filter(function (r) {
                    var hasMatching = blChk.regions.some(function (r2) {
                        return r.checksum == r2.checksum &&
                            r.length == r2.length &&
                            r.start == r2.start;
                    });
                    return hasMatching;
                });
                if (regionsOk.length == 0)
                    return blocks;
                log("skipping flash at: " +
                    regionsOk.map(function (r) {
                        return pxtc.assembler.tohex(r.start) + " (" + r.length / 1024 + "kB)";
                    })
                        .join(", "));
                var unchangedAddr = function (a) {
                    return regionsOk.some(function (r) { return r.start <= a && a < r.start + r.length; });
                };
                return blocks.filter(function (b) {
                    return !(unchangedAddr(b.targetAddr) &&
                        unchangedAddr(b.targetAddr + b.payloadSize - 1));
                });
            });
        }
        HF2.onlyChangedBlocksAsync = onlyChangedBlocksAsync;
    })(HF2 = pxt.HF2 || (pxt.HF2 = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    // keep in sync with RefCounted.h in Codal
    pxt.REF_TAG_STRING = 1;
    pxt.REF_TAG_BUFFER = 2;
    pxt.REF_TAG_IMAGE = 3;
    pxt.REF_TAG_NUMBER = 32;
    pxt.REF_TAG_ACTION = 33;
})(pxt || (pxt = {}));
(function (pxt) {
    var HWDBG;
    (function (HWDBG) {
        var U = pxt.Util;
        var H = pxt.HF2;
        var HF2_DBG_GET_GLOBAL_STATE = 0x53fc66e0;
        var HF2_DBG_RESUME = 0x27a55931;
        var HF2_DBG_RESTART = 0x1120bd93;
        var HF2_DBG_GET_STACK = 0x70901510;
        var HF2_EV_DBG_PAUSED = 0x3692f9fd;
        var r32 = H.read32;
        var isHalted = false;
        var lastCompileResult;
        var onHalted;
        var haltHandler;
        var cachedStaticState;
        var currBreakpoint;
        var callInfos;
        var lastFlash;
        var hid;
        function taggedSpecialValue(n) { return (n << 2) | 2; }
        HWDBG.taggedUndefined = 0;
        HWDBG.taggedNull = taggedSpecialValue(1);
        HWDBG.taggedFalse = taggedSpecialValue(2);
        HWDBG.taggedTrue = taggedSpecialValue(16);
        HWDBG.postMessage = function (msg) { return console.log(msg); };
        function clearAsync() {
            isHalted = false;
            lastCompileResult = null;
            cachedStaticState = null;
            return Promise.resolve();
        }
        function decodeValue(n) {
            if (n & 1)
                return n >> 1;
            if (n == 0)
                return undefined;
            if (n & 2) {
                if (n == HWDBG.taggedNull)
                    return null;
                if (n == HWDBG.taggedFalse)
                    return false;
                if (n == HWDBG.taggedTrue)
                    return true;
                return { tagged: n >> 2 };
            }
            return { ptr: n };
        }
        HWDBG.decodeValue = decodeValue;
        function readMemAsync(addr, numbytes) {
            U.assert(!(addr & 3));
            U.assert(addr >= 0);
            if (addr < 2 * 1024 * 1024) {
                // assume these sit in flash
                var res = new Uint8Array(numbytes);
                addr -= lastFlash.start;
                U.memcpy(res, 0, lastFlash.buf, addr, numbytes);
                return Promise.resolve(res);
            }
            var maxBytes = hid.maxMsgSize - 32;
            if (numbytes > maxBytes) {
                var promises = [];
                while (numbytes > 0) {
                    var n = Math.min(maxBytes, numbytes);
                    promises.push(readMemAsync(addr, n));
                    numbytes -= n;
                    addr += n;
                }
                return Promise.all(promises)
                    .then(U.uint8ArrayConcat);
            }
            else {
                return hid.readWordsAsync(addr, Math.ceil(numbytes / 4))
                    .then(function (rr) {
                    if (rr.length > numbytes)
                        return rr.slice(0, numbytes);
                    else
                        return rr;
                });
            }
        }
        function heapExpandAsync(v) {
            if (typeof v != "object" || !v)
                return Promise.resolve(v);
            if (typeof v.ptr == "number") {
                // there should be no unaligned pointers
                if (v.ptr & 3)
                    return Promise.resolve({ unalignedPtr: v.ptr });
                var tag_1 = 0;
                // 56 bytes of data fit in one HID packet (with 5 bytes of header and 3 bytes of padding)
                return readMemAsync(v.ptr, 56)
                    .then(function (buf) {
                    tag_1 = H.read16(buf, 2);
                    var neededLength = buf.length;
                    if (tag_1 == pxt.REF_TAG_STRING || tag_1 == pxt.REF_TAG_BUFFER) {
                        neededLength = H.read16(buf, 4) + 6;
                    }
                    else if (tag_1 == pxt.REF_TAG_IMAGE) {
                        neededLength = H.read16(buf, 4) * H.read16(buf, 8) + 8;
                    }
                    else if (tag_1 == pxt.REF_TAG_NUMBER) {
                        neededLength = 8 + 4;
                    }
                    else {
                        // TODO
                    }
                    if (neededLength > buf.length) {
                        return readMemAsync(v.ptr + buf.length, neededLength - buf.length)
                            .then(function (secondary) { return U.uint8ArrayConcat([buf, secondary]); });
                    }
                    else if (neededLength < buf.length) {
                        return buf.slice(0, neededLength);
                    }
                    else {
                        return buf;
                    }
                })
                    .then(function (buf) {
                    if (tag_1 == pxt.REF_TAG_STRING)
                        return U.uint8ArrayToString(buf.slice(6));
                    else if (tag_1 == pxt.REF_TAG_STRING)
                        return { type: "buffer", data: buf.slice(6) };
                    else if (tag_1 == pxt.REF_TAG_IMAGE)
                        return {
                            type: "image",
                            data: buf.slice(8),
                            width: H.read16(buf, 4),
                            height: H.read16(buf, 8),
                        };
                    else if (tag_1 == pxt.REF_TAG_NUMBER)
                        return new Float64Array(buf.buffer.slice(4))[0];
                    else
                        return {
                            type: "unknown",
                            tag: tag_1,
                            refcnt: H.read16(buf, 0),
                            data: buf.slice(4)
                        };
                });
            }
            else {
                return Promise.resolve(v);
            }
        }
        HWDBG.heapExpandAsync = heapExpandAsync;
        function heapExpandMapAsync(vars) {
            var promises = [];
            var _loop_3 = function (k) {
                promises.push(heapExpandAsync(vars[k])
                    .then(function (r) {
                    vars[k] = r;
                    //console.log("set", k, "to", r, "prev", vars[k], "NOW", vars)
                }));
            };
            for (var _i = 0, _a = Object.keys(vars); _i < _a.length; _i++) {
                var k = _a[_i];
                _loop_3(k);
            }
            return Promise.all(promises)
                .then(function () {
                //console.log("FIN", vars)
            });
        }
        HWDBG.heapExpandMapAsync = heapExpandMapAsync;
        function buildFrames(stack, msg) {
            var currAddr = currBreakpoint.binAddr;
            var sp = 0;
            var pi = lastCompileResult.procDebugInfo.filter(function (p) {
                return p.codeStartLoc <= currAddr && currAddr <= p.codeEndLoc;
            })[0];
            while (true) {
                if (!pi)
                    break; // ???
                if (pi == lastCompileResult.procDebugInfo[0])
                    break; // main
                var bp = findPrevBrkp(currAddr);
                var info = U.clone(bp);
                info.functionName = pi.name;
                msg.stackframes.push({
                    locals: {},
                    funcInfo: info,
                    breakpointId: bp.id,
                });
                var frame = msg.stackframes[msg.stackframes.length - 1];
                var idx = 0;
                for (var _i = 0, _a = pi.locals; _i < _a.length; _i++) {
                    var l = _a[_i];
                    U.assert(l.index == idx++);
                    frame.locals[l.name] = decodeValue(stack[sp++]);
                }
                currAddr = stack[sp++] & 0x7ffffffe;
                var ci = callInfos[currAddr + ""];
                for (var _b = 0, _c = pi.args; _b < _c.length; _b++) {
                    var l = _c[_b];
                    frame.locals[l.name] = decodeValue(stack[sp + (pi.args.length - 1 - l.index)]);
                }
                if (!ci)
                    break;
                pi = ci.from;
                sp += ci.stack - pi.localsMark;
            }
        }
        function findPrevBrkp(addr) {
            var bb = lastCompileResult.breakpoints;
            var brkMatch = bb[0];
            var bestDelta = Infinity;
            for (var _i = 0, bb_1 = bb; _i < bb_1.length; _i++) {
                var b = bb_1[_i];
                var delta = addr - b.binAddr;
                // console.log(`${b.line+1}: addr=${b.binAddr} d=${delta}`)
                if (delta >= 0 && delta < bestDelta) {
                    bestDelta = delta;
                    brkMatch = b;
                }
            }
            return brkMatch;
        }
        function corePaused(buf) {
            if (isHalted)
                return Promise.resolve();
            isHalted = true;
            var msg;
            return getHwStateAsync()
                .then(function (st) {
                var w = H.decodeU32LE(buf);
                var pc = w[0];
                var globals = {};
                var _loop_4 = function (l) {
                    var gbuf = st.globals;
                    var readV = function () {
                        switch (l.type) {
                            case "uint32": return H.read32(gbuf, l.index);
                            case "int32": return H.read32(gbuf, l.index) | 0;
                            case "uint16": return H.read16(gbuf, l.index);
                            case "int16": return (H.read16(gbuf, l.index) << 16) >> 16;
                            case "uint8": return gbuf[l.index];
                            case "int8": return (gbuf[l.index] << 24) >> 24;
                            default: return null;
                        }
                    };
                    var v = readV();
                    if (v === null) {
                        U.assert((l.index & 3) == 0);
                        v = decodeValue(H.read32(gbuf, l.index));
                    }
                    globals[l.name] = v;
                };
                for (var _i = 0, _a = lastCompileResult.procDebugInfo[0].locals; _i < _a.length; _i++) {
                    var l = _a[_i];
                    _loop_4(l);
                }
                currBreakpoint = findPrevBrkp(pc);
                msg = {
                    type: 'debugger',
                    subtype: 'breakpoint',
                    breakpointId: currBreakpoint.id,
                    globals: globals,
                    stackframes: []
                };
                haltHandler();
                return hid.talkAsync(HF2_DBG_GET_STACK);
            })
                .then(function (stack) {
                buildFrames(H.decodeU32LE(stack), msg);
                var maps = [msg.globals].concat(msg.stackframes.map(function (s) { return s.locals; }));
                return Promise.map(maps, heapExpandMapAsync);
            })
                .then(function () { return HWDBG.postMessage(msg); });
        }
        function clearHalted() {
            isHalted = false;
            onHalted = new Promise(function (resolve, reject) {
                haltHandler = resolve;
            });
        }
        function startDebugAsync(compileRes, hidWr) {
            hid = hidWr;
            hid.onEvent(HF2_EV_DBG_PAUSED, corePaused);
            return clearAsync()
                .then(function () {
                lastCompileResult = compileRes;
                callInfos = {};
                var procLookup = [];
                for (var _i = 0, _a = compileRes.procDebugInfo; _i < _a.length; _i++) {
                    var pdi = _a[_i];
                    procLookup[pdi.idx] = pdi;
                }
                for (var _b = 0, _c = compileRes.procDebugInfo; _b < _c.length; _b++) {
                    var pdi = _c[_b];
                    //console.log(pdi)
                    for (var _d = 0, _e = pdi.calls; _d < _e.length; _d++) {
                        var ci = _e[_d];
                        callInfos[ci.addr + ""] = {
                            from: pdi,
                            to: procLookup[ci.procIndex],
                            stack: ci.stack
                        };
                    }
                }
            })
                .then(function () {
                var f = lastCompileResult.outfiles[pxtc.BINARY_UF2];
                var blockBuf = U.stringToUint8Array(atob(f));
                lastFlash = pxtc.UF2.toBin(blockBuf);
                var blocks = pxtc.UF2.parseFile(blockBuf);
                return hid.reflashAsync(blocks); // this will reset into app at the end
            })
                .then(function () { return hid.talkAsync(HF2_DBG_RESTART).catch(function (e) { }); })
                .then(function () { return Promise.delay(200); })
                .then(function () { return hid.reconnectAsync(); })
                .then(clearHalted)
                .then(waitForHaltAsync);
        }
        HWDBG.startDebugAsync = startDebugAsync;
        function handleMessage(msg) {
            console.log("HWDBGMSG", msg);
            if (msg.type != "debugger")
                return;
            var stepInto = false;
            switch (msg.subtype) {
                case 'stepinto':
                    stepInto = true;
                case 'stepover':
                    resumeAsync(stepInto);
                    break;
            }
        }
        HWDBG.handleMessage = handleMessage;
        function resumeAsync(into) {
            if (into === void 0) { into = false; }
            return Promise.resolve()
                .then(function () { return hid.talkAsync(HF2_DBG_RESUME, H.encodeU32LE([into ? 1 : 3])); })
                .then(clearHalted);
        }
        HWDBG.resumeAsync = resumeAsync;
        function waitForHaltAsync() {
            if (!onHalted)
                onHalted = Promise.resolve();
            return onHalted;
        }
        HWDBG.waitForHaltAsync = waitForHaltAsync;
        function getStaticStateAsync() {
            if (cachedStaticState)
                return Promise.resolve(cachedStaticState);
            return hid.talkAsync(HF2_DBG_GET_GLOBAL_STATE)
                .then(function (buf) { return (cachedStaticState = {
                numGlobals: r32(buf, 0),
                globalsPtr: r32(buf, 4)
            }); });
        }
        function getHwStateAsync() {
            return getStaticStateAsync()
                .then(function (st) { return hid.readWordsAsync(st.globalsPtr, st.numGlobals); })
                .then(function (buf) {
                var res = {
                    staticState: cachedStaticState,
                    globals: buf
                };
                return res;
            });
        }
        HWDBG.getHwStateAsync = getHwStateAsync;
    })(HWDBG = pxt.HWDBG || (pxt.HWDBG = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var blocks;
    (function (blocks) {
        var NT;
        (function (NT) {
            NT[NT["Prefix"] = 0] = "Prefix";
            NT[NT["Infix"] = 1] = "Infix";
            NT[NT["Block"] = 2] = "Block";
            NT[NT["NewLine"] = 3] = "NewLine";
        })(NT = blocks.NT || (blocks.NT = {}));
        var GlueMode;
        (function (GlueMode) {
            GlueMode[GlueMode["None"] = 0] = "None";
            GlueMode[GlueMode["WithSpace"] = 1] = "WithSpace";
            GlueMode[GlueMode["NoSpace"] = 2] = "NoSpace";
        })(GlueMode = blocks.GlueMode || (blocks.GlueMode = {}));
        var reservedWords = ["break", "case", "catch", "class", "const", "continue", "debugger",
            "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally",
            "for", "function", "if", "import", "in", "instanceof", "new", "null", "return",
            "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while",
            "with"];
        var placeholders = {};
        function stringLit(s) {
            if (s.length > 20 && /\n/.test(s))
                return "`" + s.replace(/[\\`${}]/g, function (f) { return "\\" + f; }) + "`";
            else
                return JSON.stringify(s);
        }
        blocks.stringLit = stringLit;
        function mkNode(tp, pref, children) {
            return {
                type: tp,
                op: pref,
                children: children
            };
        }
        blocks.mkNode = mkNode;
        function mkNewLine() {
            return mkNode(NT.NewLine, "", []);
        }
        blocks.mkNewLine = mkNewLine;
        function mkPrefix(pref, children) {
            return mkNode(NT.Prefix, pref, children);
        }
        blocks.mkPrefix = mkPrefix;
        function mkInfix(child0, op, child1) {
            return mkNode(NT.Infix, op, child0 == null ? [child1] : [child0, child1]);
        }
        blocks.mkInfix = mkInfix;
        function mkText(s) {
            return mkPrefix(s, []);
        }
        blocks.mkText = mkText;
        function mkBlock(nodes) {
            return mkNode(NT.Block, "", nodes);
        }
        blocks.mkBlock = mkBlock;
        function mkGroup(nodes) {
            return mkPrefix("", nodes);
        }
        blocks.mkGroup = mkGroup;
        function mkStmt() {
            var nodes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                nodes[_i] = arguments[_i];
            }
            var last = nodes[nodes.length - 1];
            if (last && last.type == NT.Block) {
                // OK - no newline needed
            }
            else {
                nodes.push(mkNewLine());
            }
            return mkGroup(nodes);
        }
        blocks.mkStmt = mkStmt;
        function mkCommaSep(nodes, withNewlines) {
            if (withNewlines === void 0) { withNewlines = false; }
            var r = [];
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var n = nodes_1[_i];
                if (withNewlines) {
                    if (r.length > 0)
                        r.push(mkText(","));
                    r.push(mkNewLine());
                }
                else if (r.length > 0) {
                    r.push(mkText(", "));
                }
                r.push(n);
            }
            if (withNewlines)
                r.push(mkNewLine());
            return mkGroup(r);
        }
        blocks.mkCommaSep = mkCommaSep;
        // A series of utility functions for constructing various J* AST nodes.
        var Helpers;
        (function (Helpers) {
            function mkArrayLiteral(args) {
                return mkGroup([
                    mkText("["),
                    mkCommaSep(args, false),
                    mkText("]")
                ]);
            }
            Helpers.mkArrayLiteral = mkArrayLiteral;
            function mkNumberLiteral(x) {
                return mkText(x.toString());
            }
            Helpers.mkNumberLiteral = mkNumberLiteral;
            function mkBooleanLiteral(x) {
                return mkText(x ? "true" : "false");
            }
            Helpers.mkBooleanLiteral = mkBooleanLiteral;
            function mkStringLiteral(x) {
                return mkText(stringLit(x));
            }
            Helpers.mkStringLiteral = mkStringLiteral;
            function mkPropertyAccess(name, thisArg) {
                return mkGroup([
                    mkInfix(thisArg, ".", mkText(name)),
                ]);
            }
            Helpers.mkPropertyAccess = mkPropertyAccess;
            function mkCall(name, args, externalInputs, method) {
                if (externalInputs === void 0) { externalInputs = false; }
                if (method === void 0) { method = false; }
                if (method)
                    return mkGroup([
                        mkInfix(args[0], ".", mkText(name)),
                        mkText("("),
                        mkCommaSep(args.slice(1), externalInputs),
                        mkText(")")
                    ]);
                else
                    return mkGroup([
                        mkText(name),
                        mkText("("),
                        mkCommaSep(args, externalInputs),
                        mkText(")")
                    ]);
            }
            Helpers.mkCall = mkCall;
            // Call function [name] from the standard device library with arguments
            // [args].
            function stdCall(name, args, externalInputs) {
                return mkCall(name, args, externalInputs);
            }
            Helpers.stdCall = stdCall;
            // Call extension method [name] on the first argument
            function extensionCall(name, args, externalInputs) {
                return mkCall(name, args, externalInputs, true);
            }
            Helpers.extensionCall = extensionCall;
            // Call function [name] from the specified [namespace] in the micro:bit
            // library.
            function namespaceCall(namespace, name, args, externalInputs) {
                return mkCall(namespace + "." + name, args, externalInputs);
            }
            Helpers.namespaceCall = namespaceCall;
            function mathCall(name, args) {
                return namespaceCall("Math", name, args, false);
            }
            Helpers.mathCall = mathCall;
            function mkGlobalRef(name) {
                return mkText(name);
            }
            Helpers.mkGlobalRef = mkGlobalRef;
            function mkSimpleCall(p, args) {
                pxt.U.assert(args.length == 2);
                return mkInfix(args[0], p, args[1]);
            }
            Helpers.mkSimpleCall = mkSimpleCall;
            function mkWhile(condition, body) {
                return mkGroup([
                    mkText("while ("),
                    condition,
                    mkText(")"),
                    mkBlock(body)
                ]);
            }
            Helpers.mkWhile = mkWhile;
            function mkComment(text) {
                return mkStmt(mkText("// " + text));
            }
            Helpers.mkComment = mkComment;
            function mkAssign(x, e) {
                return mkStmt(mkSimpleCall("=", [x, e]));
            }
            Helpers.mkAssign = mkAssign;
            function mkParenthesizedExpression(expression) {
                return mkGroup([
                    mkText("("),
                    expression,
                    mkText(")")
                ]);
            }
            Helpers.mkParenthesizedExpression = mkParenthesizedExpression;
        })(Helpers = blocks.Helpers || (blocks.Helpers = {}));
        blocks.H = Helpers;
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
        var infixPriTable = {
            // 0 = comma/sequence
            // 1 = spread (...)
            // 2 = yield, yield*
            // 3 = assignment
            "=": 3,
            "+=": 3,
            "-=": 3,
            "?": 4,
            ":": 4,
            "||": 5,
            "&&": 6,
            "|": 7,
            "^": 8,
            "&": 9,
            // 10 = equality
            "==": 10,
            "!=": 10,
            "===": 10,
            "!==": 10,
            // 11 = comparison (excludes in, instanceof)
            "<": 11,
            ">": 11,
            "<=": 11,
            ">=": 11,
            // 12 = bitwise shift
            ">>": 12,
            ">>>": 12,
            "<<": 12,
            "+": 13,
            "-": 13,
            "*": 14,
            "/": 14,
            "%": 14,
            "**": 15,
            "!": 16,
            "~": 16,
            "P-": 16,
            "P+": 16,
            "++": 16,
            "--": 16,
            ".": 18,
        };
        function flattenNode(app) {
            var sourceMap = [];
            var sourceMapById = {};
            var output = "";
            var indent = "";
            var variables = [{}];
            function flatten(e0) {
                function rec(e, outPrio) {
                    if (e.type != NT.Infix) {
                        for (var _i = 0, _a = e.children; _i < _a.length; _i++) {
                            var c = _a[_i];
                            rec(c, -1);
                        }
                        return;
                    }
                    var r = [];
                    function pushOp(c) {
                        if (c[0] == "P")
                            c = c.slice(1);
                        r.push(mkText(c));
                    }
                    var infixPri = pxt.U.lookup(infixPriTable, e.op);
                    if (infixPri == null)
                        pxt.U.oops("bad infix op: " + e.op);
                    if (infixPri < outPrio)
                        pushOp("(");
                    if (e.children.length == 1) {
                        pushOp(e.op);
                        rec(e.children[0], infixPri);
                        r.push(e.children[0]);
                    }
                    else {
                        var bindLeft = infixPri != 3 && e.op != "**";
                        var letType = undefined;
                        rec(e.children[0], bindLeft ? infixPri : infixPri + 0.1);
                        r.push(e.children[0]);
                        if (letType && letType != "number") {
                            pushOp(": ");
                            pushOp(letType);
                        }
                        if (e.op == ".")
                            pushOp(".");
                        else
                            pushOp(" " + e.op + " ");
                        rec(e.children[1], !bindLeft ? infixPri : infixPri + 0.1);
                        r.push(e.children[1]);
                    }
                    if (infixPri < outPrio)
                        pushOp(")");
                    e.type = NT.Prefix;
                    e.op = "";
                    e.children = r;
                }
                rec(e0, -1);
            }
            var root = mkGroup(app);
            flatten(root);
            emit(root);
            // never return empty string - TS compiler service thinks it's an error
            if (!output)
                output += "\n";
            return { output: output, sourceMap: sourceMap };
            function emit(n) {
                if (n.glueToBlock) {
                    removeLastIndent();
                    if (n.glueToBlock == GlueMode.WithSpace) {
                        output += " ";
                    }
                }
                var start = getCurrentLine();
                switch (n.type) {
                    case NT.Infix:
                        pxt.U.oops("no infix should be left");
                        break;
                    case NT.NewLine:
                        output += "\n" + indent;
                        break;
                    case NT.Block:
                        block(n);
                        break;
                    case NT.Prefix:
                        if (n.canIndentInside)
                            output += n.op.replace(/\n/g, "\n" + indent + "    ");
                        else
                            output += n.op;
                        n.children.forEach(emit);
                        break;
                    default:
                        break;
                }
                var end = getCurrentLine();
                if (n.id) {
                    if (sourceMapById[n.id]) {
                        var node = sourceMapById[n.id];
                        node.start = Math.min(node.start, start);
                        node.end = Math.max(node.end, end);
                    }
                    else {
                        var interval = { id: n.id, start: start, end: end };
                        sourceMapById[n.id] = interval;
                        sourceMap.push(interval);
                    }
                }
            }
            function getCurrentLine() {
                var i = 0;
                output.replace(/\n/g, function (a) { i++; return a; });
                return i;
            }
            function write(s) {
                output += s.replace(/\n/g, "\n" + indent);
            }
            function removeLastIndent() {
                output = output.replace(/\n *$/, "");
            }
            function block(n) {
                var finalNl = n.noFinalNewline ? "" : "\n";
                if (n.children.length == 0) {
                    write(" {\n\t\n}" + finalNl);
                    return;
                }
                var vars = pxt.U.clone(variables[variables.length - 1] || {});
                variables.push(vars);
                indent += "    ";
                if (output[output.length - 1] != " ")
                    write(" ");
                write("{\n");
                for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                    var nn = _a[_i];
                    emit(nn);
                }
                indent = indent.slice(4);
                removeLastIndent();
                write("\n}" + finalNl);
                variables.pop();
            }
        }
        blocks.flattenNode = flattenNode;
        function isReservedWord(str) {
            return reservedWords.indexOf(str) !== -1;
        }
        blocks.isReservedWord = isReservedWord;
    })(blocks = pxt.blocks || (pxt.blocks = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtpackage.d.ts"/>
/// <reference path="../localtypings/pxtparts.d.ts"/>
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="util.ts"/>
var pxt;
(function (pxt) {
    var lf = pxt.U.lf;
    var Package = /** @class */ (function () {
        function Package(id, _verspec, parent, addedBy) {
            this.id = id;
            this._verspec = _verspec;
            this.parent = parent;
            this.level = -1;
            this.isLoaded = false;
            if (addedBy) {
                this.level = addedBy.level + 1;
            }
            this.addedBy = [addedBy];
        }
        Package.getConfigAsync = function (id, fullVers) {
            return Promise.resolve().then(function () {
                if (pxt.github.isGithubId(fullVers)) {
                    var repoInfo_1 = pxt.github.parseRepoId(fullVers);
                    return pxt.packagesConfigAsync()
                        .then(function (config) { return pxt.github.repoAsync(repoInfo_1.fullName, config); }) // Make sure repo exists and is whitelisted
                        .then(function (gitRepo) { return gitRepo ? pxt.github.pkgConfigAsync(repoInfo_1.fullName, repoInfo_1.tag) : null; });
                }
                else {
                    // If it's not from GH, assume it's a bundled package
                    // TODO: Add logic for shared packages if we enable that
                    return JSON.parse(pxt.appTarget.bundledpkgs[Package.upgradePackageReference(id, fullVers)][pxt.CONFIG_NAME]);
                }
            });
        };
        Package.upgradePackageReference = function (pkg, val) {
            if (val != "*")
                return pkg;
            var upgrades = pxt.appTarget.compile ? pxt.appTarget.compile.upgrades : undefined;
            var newPackage = pkg;
            if (upgrades) {
                upgrades.filter(function (rule) { return rule.type == "package"; })
                    .forEach(function (rule) {
                    for (var match in rule.map) {
                        if (newPackage == match) {
                            newPackage = rule.map[match];
                        }
                    }
                });
            }
            return newPackage;
        };
        Package.prototype.version = function () {
            return this.resolvedVersion || this._verspec;
        };
        Package.prototype.verProtocol = function () {
            var spl = this.version().split(':');
            if (spl.length > 1)
                return spl[0];
            else
                return "";
        };
        Package.prototype.verArgument = function () {
            var p = this.verProtocol();
            if (p)
                return this.version().slice(p.length + 1);
            return this.version();
        };
        Package.prototype.commonDownloadAsync = function () {
            var _this = this;
            var proto = this.verProtocol();
            if (proto == "pub") {
                return pxt.Cloud.downloadScriptFilesAsync(this.verArgument());
            }
            else if (proto == "github") {
                return pxt.packagesConfigAsync()
                    .then(function (config) { return pxt.github.downloadPackageAsync(_this.verArgument(), config); })
                    .then(function (resp) { return resp.files; });
            }
            else if (proto == "embed") {
                var resp = pxt.getEmbeddedScript(this.verArgument());
                return Promise.resolve(resp);
            }
            else
                return Promise.resolve(null);
        };
        Package.prototype.host = function () { return this.parent._host; };
        Package.prototype.readFile = function (fn) {
            return this.host().readFile(this, fn);
        };
        Package.prototype.resolveDep = function (id) {
            if (this.parent.deps.hasOwnProperty(id))
                return this.parent.deps[id];
            return null;
        };
        Package.prototype.saveConfig = function () {
            var cfg = JSON.stringify(this.config, null, 4) || "\n";
            this.host().writeFile(this, pxt.CONFIG_NAME, cfg);
        };
        Package.prototype.parseJRes = function (allres) {
            if (allres === void 0) { allres = {}; }
            for (var _i = 0, _a = this.getFiles(); _i < _a.length; _i++) {
                var f = _a[_i];
                if (pxt.U.endsWith(f, ".jres")) {
                    var js = JSON.parse(this.readFile(f));
                    var base = js["*"];
                    for (var _b = 0, _c = Object.keys(js); _b < _c.length; _b++) {
                        var k = _c[_b];
                        if (k == "*")
                            continue;
                        var v = js[k];
                        if (typeof v == "string") {
                            // short form
                            v = { data: v };
                        }
                        var ns = v.namespace || base.namespace || "";
                        if (ns)
                            ns += ".";
                        var id = v.id || ns + k;
                        var icon = v.icon;
                        var mimeType = v.mimeType || base.mimeType;
                        var dataEncoding = v.dataEncoding || base.dataEncoding || "base64";
                        if (!icon && dataEncoding == "base64" && (mimeType == "image/png" || mimeType == "image/jpeg")) {
                            icon = "data:" + mimeType + ";base64," + v.data;
                        }
                        allres[id] = {
                            id: id,
                            data: v.data,
                            dataEncoding: v.dataEncoding || base.dataEncoding || "base64",
                            icon: icon,
                            namespace: ns,
                            mimeType: mimeType
                        };
                    }
                }
            }
            return allres;
        };
        Package.prototype.resolveVersionAsync = function () {
            var v = this._verspec;
            if (pxt.getEmbeddedScript(this.id)) {
                this.resolvedVersion = v = "embed:" + this.id;
            }
            else if (!v || v == "*") {
                pxt.U.userError(lf("version not specified for {0}", this.id));
            }
            return Promise.resolve(v);
        };
        Package.prototype.downloadAsync = function () {
            var _this = this;
            var kindCfg = "";
            return this.resolveVersionAsync()
                .then(function (verNo) {
                if (!/^embed:/.test(verNo) &&
                    _this.config && _this.config.installedVersion == verNo)
                    return undefined;
                pxt.debug('downloading ' + verNo);
                return _this.host().downloadPackageAsync(_this)
                    .then(function () {
                    var confStr = _this.readFile(pxt.CONFIG_NAME);
                    if (!confStr)
                        pxt.U.userError("package " + _this.id + " is missing " + pxt.CONFIG_NAME);
                    _this.parseConfig(confStr);
                    if (_this.level != 0)
                        _this.config.installedVersion = _this.version();
                    _this.saveConfig();
                })
                    .then(function () {
                    pxt.debug("installed " + _this.id + " /" + verNo);
                });
            });
        };
        Package.prototype.validateConfig = function () {
            if (!this.config.dependencies)
                pxt.U.userError("Missing dependencies in config of: " + this.id);
            if (!Array.isArray(this.config.files))
                pxt.U.userError("Missing files in config of: " + this.id);
            if (typeof this.config.name != "string" || !this.config.name ||
                (this.config.public && !/^[a-z][a-z0-9\-_]+$/i.test(this.config.name)))
                pxt.U.userError("Invalid package name: " + this.config.name);
            if (this.config.targetVersions
                && this.config.targetVersions.target
                && pxt.semver.strcmp(this.config.targetVersions.target, pxt.appTarget.versions.target) > 0)
                pxt.U.userError(lf("Package {0} requires target version {1} (you are running {2})", this.config.name, this.config.targetVersions.target, pxt.appTarget.versions.target));
        };
        Package.prototype.isPackageInUse = function (pkgId, ts) {
            if (ts === void 0) { ts = this.readFile("main.ts"); }
            // Build the RegExp that will determine whether the dependency is in use. Try to use upgrade rules,
            // otherwise fallback to the package's name
            var regex = null;
            var upgrades = pxt.appTarget.compile ? pxt.appTarget.compile.upgrades : undefined;
            if (upgrades) {
                upgrades.filter(function (rule) { return rule.type == "missingPackage"; }).forEach(function (rule) {
                    Object.keys(rule.map).forEach(function (match) {
                        if (rule.map[match] === pkgId) {
                            regex = new RegExp(match, "g");
                        }
                    });
                });
            }
            if (!regex) {
                regex = new RegExp(pkgId + "\\.", "g");
            }
            return regex.test(ts);
        };
        Package.prototype.getMissingPackages = function (config, ts) {
            var upgrades = pxt.appTarget.compile ? pxt.appTarget.compile.upgrades : undefined;
            var missing = {};
            if (ts && upgrades)
                upgrades.filter(function (rule) { return rule.type == "missingPackage"; })
                    .forEach(function (rule) {
                    var _loop_5 = function (match) {
                        var regex = new RegExp(match, 'g');
                        var pkg = rule.map[match];
                        ts.replace(regex, function (m) {
                            if (!config.dependencies[pkg]) {
                                missing[pkg] = "*";
                            }
                            return "";
                        });
                    };
                    for (var match in rule.map) {
                        _loop_5(match);
                    }
                });
            return missing;
        };
        /**
         * For the given package config or ID, looks through all the currently installed packages to find conflicts in
         * Yotta settings and version spec
         */
        Package.prototype.findConflictsAsync = function (pkgOrId, version) {
            var _this = this;
            var conflicts = [];
            var pkgCfg;
            return Promise.resolve()
                .then(function () {
                // Get the package config if it's not already provided
                if (typeof pkgOrId === "string") {
                    return Package.getConfigAsync(pkgOrId, version);
                }
                else {
                    return Promise.resolve(pkgOrId);
                }
            })
                .then(function (cfg) {
                pkgCfg = cfg;
                // Iterate through all installed packages and check for conflicting settings
                if (pkgCfg) {
                    var yottaCfg_1 = pkgCfg.yotta ? pxt.U.jsonFlatten(pkgCfg.yotta.config) : null;
                    _this.parent.sortedDeps().forEach(function (depPkg) {
                        if (pkgCfg.core && depPkg.config.core) {
                            var conflict = new pxt.cpp.PkgConflictError(lf("conflict between core packages {0} and {1}", pkgCfg.name, depPkg.id));
                            conflict.pkg0 = depPkg;
                            conflicts.push(conflict);
                            return;
                        }
                        var foundYottaConflict = false;
                        if (yottaCfg_1) {
                            var depConfig = depPkg.config || JSON.parse(depPkg.readFile(pxt.CONFIG_NAME));
                            var hasYottaSettings = !!depConfig && !!depConfig.yotta && !!depPkg.config.yotta.config;
                            if (hasYottaSettings) {
                                var depYottaCfg = pxt.U.jsonFlatten(depConfig.yotta.config);
                                for (var _i = 0, _a = Object.keys(yottaCfg_1); _i < _a.length; _i++) {
                                    var settingName = _a[_i];
                                    var depSetting = depYottaCfg[settingName];
                                    var isJustDefaults = pkgCfg.yotta.configIsJustDefaults || depConfig.yotta.configIsJustDefaults;
                                    if (depYottaCfg.hasOwnProperty(settingName) && depSetting !== yottaCfg_1[settingName] && !isJustDefaults && (!depPkg.parent.config.yotta || !depPkg.parent.config.yotta.ignoreConflicts)) {
                                        var conflict = new pxt.cpp.PkgConflictError(lf("conflict on yotta setting {0} between packages {1} and {2}", settingName, pkgCfg.name, depPkg.id));
                                        conflict.pkg0 = depPkg;
                                        conflict.settingName = settingName;
                                        conflicts.push(conflict);
                                        foundYottaConflict = true;
                                    }
                                }
                            }
                        }
                        if (!foundYottaConflict && pkgCfg.name === depPkg.id && depPkg._verspec != version && !/^file:/.test(depPkg._verspec) && !/^file:/.test(version)) {
                            var conflict = new pxt.cpp.PkgConflictError(lf("version mismatch for package {0} (installed: {1}, installing: {2})", depPkg, depPkg._verspec, version));
                            conflict.pkg0 = depPkg;
                            conflict.isVersionConflict = true;
                            conflicts.push(conflict);
                        }
                    });
                }
                // Also check for conflicts for all the specified package's dependencies (recursively)
                return Object.keys(pkgCfg.dependencies).reduce(function (soFar, pkgDep) {
                    return soFar
                        .then(function () { return _this.findConflictsAsync(pkgDep, pkgCfg.dependencies[pkgDep]); })
                        .then(function (childConflicts) { return conflicts.push.apply(conflicts, childConflicts); });
                }, Promise.resolve());
            })
                .then(function () {
                // For each conflicting package, we need to include their ancestor tree in the list of conflicts
                // For example, if package A depends on package B, and package B is in conflict with package C,
                // then package A is also technically in conflict with C
                var allAncestors = function (p) {
                    var ancestors = [];
                    p.addedBy.forEach(function (a) {
                        if (a.id !== _this.id) {
                            ancestors.push.apply(allAncestors(a));
                            ancestors.push(a);
                        }
                    });
                    return ancestors;
                };
                var additionalConflicts = [];
                conflicts.forEach(function (c) {
                    additionalConflicts.push.apply(additionalConflicts, allAncestors(c.pkg0).map(function (anc) {
                        var confl = new pxt.cpp.PkgConflictError(c.isVersionConflict ?
                            lf("a dependency of {0} has a version mismatch with package {1} (installed: {1}, installing: {2})", anc.id, pkgCfg.name, c.pkg0._verspec, version) :
                            lf("conflict on yotta setting {0} between packages {1} and {2}", c.settingName, pkgCfg.name, c.pkg0.id));
                        confl.pkg0 = anc;
                        return confl;
                    }));
                });
                conflicts.push.apply(conflicts, additionalConflicts);
                // Remove duplicate conflicts (happens if more than one package had the same ancestor)
                conflicts = conflicts.filter(function (c, index) {
                    for (var i = 0; i < index; ++i) {
                        if (c.pkg0.id === conflicts[i].pkg0.id) {
                            return false;
                        }
                    }
                    return true;
                });
                return conflicts;
            });
        };
        Package.prototype.upgradeAPI = function (fileContents) {
            var upgrades = pxt.appTarget.compile ? pxt.appTarget.compile.upgrades : undefined;
            var updatedContents = fileContents;
            if (upgrades) {
                upgrades.filter(function (rule) { return rule.type == "api"; })
                    .forEach(function (rule) {
                    for (var match in rule.map) {
                        var regex = new RegExp(match, 'g');
                        updatedContents = updatedContents.replace(regex, rule.map[match]);
                    }
                });
            }
            return updatedContents;
        };
        Package.prototype.parseConfig = function (cfgSrc) {
            var cfg = JSON.parse(cfgSrc);
            this.config = cfg;
            var currentConfig = JSON.stringify(this.config);
            for (var dep in this.config.dependencies) {
                var value = Package.upgradePackageReference(dep, this.config.dependencies[dep]);
                if (value != dep) {
                    delete this.config.dependencies[dep];
                    if (value) {
                        this.config.dependencies[value] = "*";
                    }
                }
            }
            if (JSON.stringify(this.config) != currentConfig) {
                this.saveConfig();
            }
            this.validateConfig();
        };
        Package.prototype.loadAsync = function (isInstall) {
            var _this = this;
            if (isInstall === void 0) { isInstall = false; }
            if (this.isLoaded)
                return Promise.resolve();
            var initPromise = Promise.resolve();
            this.isLoaded = true;
            var str = this.readFile(pxt.CONFIG_NAME);
            if (str == null) {
                if (!isInstall)
                    pxt.U.userError("Package not installed: " + this.id + ", did you forget to run `pxt install`?");
            }
            else {
                initPromise = initPromise.then(function () { return _this.parseConfig(str); });
            }
            if (isInstall)
                initPromise = initPromise.then(function () { return _this.downloadAsync(); });
            if (pxt.appTarget.simulator && pxt.appTarget.simulator.dynamicBoardDefinition) {
                initPromise = initPromise.then(function () {
                    if (_this.config.files.indexOf("board.json") < 0)
                        return;
                    pxt.appTarget.simulator.boardDefinition = JSON.parse(_this.readFile("board.json"));
                    var expandPkg = function (v) {
                        var m = /^pkg:\/\/(.*)/.exec(v);
                        if (m) {
                            var fn = m[1];
                            var content = _this.readFile(fn);
                            return pxt.U.toDataUri(content, pxt.U.getMime(fn));
                        }
                        else {
                            return v;
                        }
                    };
                    var bd = pxt.appTarget.simulator.boardDefinition;
                    if (typeof bd.visual == "object") {
                        var vis = bd.visual;
                        vis.image = expandPkg(vis.image);
                        vis.outlineImage = expandPkg(vis.outlineImage);
                    }
                });
            }
            var loadDepsRecursive = function (dependencies) {
                return pxt.U.mapStringMapAsync(dependencies, function (id, ver) {
                    var mod = _this.resolveDep(id);
                    ver = ver || "*";
                    if (mod) {
                        if (mod._verspec != ver && !/^file:/.test(mod._verspec) && !/^file:/.test(ver))
                            pxt.U.userError("Version spec mismatch on " + id);
                        mod.level = Math.min(mod.level, _this.level + 1);
                        mod.addedBy.push(_this);
                        return Promise.resolve();
                    }
                    else {
                        mod = new Package(id, ver, _this.parent, _this);
                        _this.parent.deps[id] = mod;
                        return mod.loadAsync(isInstall);
                    }
                });
            };
            return initPromise
                .then(function () { return loadDepsRecursive(_this.config.dependencies); })
                .then(function () {
                if (_this.level === 0) {
                    // Check for missing packages. We need to add them 1 by 1 in case they conflict with eachother.
                    var mainTs = _this.readFile("main.ts");
                    if (!mainTs)
                        return Promise.resolve(null);
                    var missingPackages_1 = _this.getMissingPackages(_this.config, mainTs);
                    var didAddPackages_1 = false;
                    var addPackagesPromise = Promise.resolve();
                    Object.keys(missingPackages_1).reduce(function (addPackagesPromise, missing) {
                        return addPackagesPromise
                            .then(function () { return _this.findConflictsAsync(missing, missingPackages_1[missing]); })
                            .then(function (conflicts) {
                            if (conflicts.length) {
                                var conflictNames = conflicts.map(function (c) { return c.pkg0.id; }).join(", ");
                                var settingNames = conflicts.map(function (c) { return c.settingName; }).filter(function (s) { return !!s; }).join(", ");
                                pxt.log("skipping missing package " + missing + " because it conflicts with the following packages: " + conflictNames + " (conflicting settings: " + settingNames + ")");
                                return Promise.resolve(null);
                            }
                            else {
                                pxt.log("adding missing package " + missing);
                                didAddPackages_1 = true;
                                _this.config.dependencies[missing] = "*";
                                var addDependency = {};
                                addDependency[missing] = missingPackages_1[missing];
                                return loadDepsRecursive(addDependency);
                            }
                        });
                    }, Promise.resolve(null))
                        .then(function () {
                        if (didAddPackages_1) {
                            _this.saveConfig();
                            _this.validateConfig();
                        }
                        return Promise.resolve(null);
                    });
                }
                return Promise.resolve(null);
            })
                .then(function () { return null; });
        };
        Package.prototype.getFiles = function () {
            if (this.level == 0)
                return this.config.files.concat(this.config.testFiles || []);
            else
                return this.config.files.slice(0);
        };
        Package.prototype.addSnapshot = function (files, exts) {
            if (exts === void 0) { exts = [""]; }
            var _loop_6 = function (fn) {
                if (exts.some(function (e) { return pxt.U.endsWith(fn, e); })) {
                    files[this_1.id + "/" + fn] = this_1.readFile(fn);
                }
            };
            var this_1 = this;
            for (var _i = 0, _a = this.getFiles(); _i < _a.length; _i++) {
                var fn = _a[_i];
                _loop_6(fn);
            }
            files[this.id + "/" + pxt.CONFIG_NAME] = this.readFile(pxt.CONFIG_NAME);
        };
        /**
         * Returns localized strings qName -> translation
         */
        Package.prototype.packageLocalizationStringsAsync = function (lang) {
            var _this = this;
            var targetId = pxt.appTarget.id;
            var filenames = [this.id + "-jsdoc", this.id];
            var r = {};
            var theme = pxt.appTarget.appTheme || {};
            // live loc of bundled packages
            if (pxt.Util.localizeLive && this.id != "this" && pxt.appTarget.bundledpkgs[this.id]) {
                pxt.log("loading live translations for " + this.id);
                var code_1 = pxt.Util.userLanguage();
                return Promise.all(filenames.map(function (fn) { return pxt.Util.downloadLiveTranslationsAsync(code_1, targetId + "/" + fn + "-strings.json", theme.crowdinBranch)
                    .then(function (tr) { return pxt.Util.jsonMergeFrom(r, tr); })
                    .catch(function (e) { return pxt.log("error while downloading " + targetId + "/" + fn + "-strings.json"); }); })).then(function () { return r; });
            }
            else {
                var files_1 = this.config.files;
                filenames.map(function (name) {
                    var fn = "_locales/" + lang.toLowerCase() + "/" + name + "-strings.json";
                    if (files_1.indexOf(fn) > -1)
                        return JSON.parse(_this.readFile(fn));
                    if (lang.length > 2) {
                        fn = "_locales/" + lang.substring(0, 2).toLowerCase() + "/" + name + "-strings.json";
                        if (files_1.indexOf(fn) > -1)
                            return JSON.parse(_this.readFile(fn));
                    }
                    return undefined;
                }).filter(function (d) { return !!d; }).forEach(function (d) { return pxt.Util.jsonMergeFrom(r, d); });
                return Promise.resolve(r);
            }
        };
        return Package;
    }());
    pxt.Package = Package;
    var MainPackage = /** @class */ (function (_super) {
        __extends(MainPackage, _super);
        function MainPackage(_host) {
            var _this = _super.call(this, "this", "file:.", null, null) || this;
            _this._host = _host;
            _this.deps = {};
            _this.parent = _this;
            _this.addedBy = [_this];
            _this.level = 0;
            _this.deps[_this.id] = _this;
            return _this;
        }
        MainPackage.prototype.installAllAsync = function () {
            return this.loadAsync(true);
        };
        MainPackage.prototype.sortedDeps = function () {
            var _this = this;
            var visited = {};
            var ids = [];
            var rec = function (p) {
                if (!p || pxt.U.lookup(visited, p.id))
                    return;
                visited[p.id] = true;
                if (p.config && p.config.dependencies) {
                    var deps = Object.keys(p.config.dependencies);
                    deps.sort(function (a, b) { return pxt.U.strcmp(a, b); });
                    deps.forEach(function (id) { return rec(_this.resolveDep(id)); });
                    ids.push(p.id);
                }
            };
            rec(this);
            return ids.map(function (id) { return _this.resolveDep(id); });
        };
        MainPackage.prototype.localizationStringsAsync = function (lang) {
            var loc = {};
            return Promise.all(pxt.Util.values(this.deps).map(function (dep) {
                return dep.packageLocalizationStringsAsync(lang)
                    .then(function (depLoc) {
                    if (depLoc)
                        for (var k in depLoc)
                            if (!loc[k])
                                loc[k] = depLoc[k];
                });
            }))
                .then(function () { return loc; });
        };
        MainPackage.prototype.getTargetOptions = function () {
            var res = pxt.U.clone(pxt.appTarget.compile);
            pxt.U.assert(!!res);
            return res;
        };
        MainPackage.prototype.getJRes = function () {
            if (!this._jres) {
                this._jres = {};
                for (var _i = 0, _a = this.sortedDeps(); _i < _a.length; _i++) {
                    var pkg = _a[_i];
                    pkg.parseJRes(this._jres);
                }
            }
            return this._jres;
        };
        MainPackage.prototype.getCompileOptionsAsync = function (target) {
            var _this = this;
            if (target === void 0) { target = this.getTargetOptions(); }
            var opts = {
                sourceFiles: [],
                fileSystem: {},
                target: target,
                hexinfo: { hex: [] }
            };
            var generateFile = function (fn, cont) {
                if (_this.config.files.indexOf(fn) < 0)
                    pxt.U.userError(lf("please add '{0}' to \"files\" in {1}", fn, pxt.CONFIG_NAME));
                cont = "// Auto-generated. Do not edit.\n" + cont + "\n// Auto-generated. Do not edit. Really.\n";
                if (_this.host().readFile(_this, fn) !== cont) {
                    pxt.debug("updating " + fn + " (size=" + cont.length + ")...");
                    _this.host().writeFile(_this, fn, cont);
                }
            };
            var upgradeFile = function (fn, cont) {
                var updatedCont = _this.upgradeAPI(cont);
                if (updatedCont != cont) {
                    // save file (force write)
                    pxt.debug("updating APIs in " + fn + " (size=" + cont.length + ")...");
                    _this.host().writeFile(_this, fn, updatedCont, true);
                }
                return updatedCont;
            };
            return this.loadAsync()
                .then(function () {
                pxt.debug("building: " + _this.sortedDeps().map(function (p) { return p.config.name; }).join(", "));
                var ext = pxt.cpp.getExtensionInfo(_this);
                if (ext.shimsDTS)
                    generateFile("shims.d.ts", ext.shimsDTS);
                if (ext.enumsDTS)
                    generateFile("enums.d.ts", ext.enumsDTS);
                return (target.isNative
                    ? _this.host().getHexInfoAsync(ext)
                    : Promise.resolve(null))
                    .then(function (inf) {
                    ext = pxt.U.flatClone(ext);
                    delete ext.compileData;
                    delete ext.generatedFiles;
                    delete ext.extensionFiles;
                    opts.extinfo = ext;
                    opts.hexinfo = inf;
                });
            })
                .then(function () { return _this.config.binaryonly || pxt.appTarget.compile.shortPointers || !opts.target.isNative ? null : _this.filesToBePublishedAsync(true); })
                .then(function (files) {
                if (files) {
                    files = pxt.U.mapMap(files, upgradeFile);
                    var headerString_1 = JSON.stringify({
                        name: _this.config.name,
                        comment: _this.config.description,
                        status: "unpublished",
                        scriptId: _this.config.installedVersion,
                        cloudId: pxt.CLOUD_ID + pxt.appTarget.id,
                        editor: target.preferredEditor ? target.preferredEditor : (pxt.U.lookup(files, "main.blocks") ? pxt.BLOCKS_PROJECT_NAME : pxt.JAVASCRIPT_PROJECT_NAME),
                        targetVersions: pxt.appTarget.versions
                    });
                    var programText_1 = JSON.stringify(files);
                    return pxt.lzmaCompressAsync(headerString_1 + programText_1)
                        .then(function (buf) {
                        opts.embedMeta = JSON.stringify({
                            compression: "LZMA",
                            headerSize: headerString_1.length,
                            textSize: programText_1.length,
                            name: _this.config.name,
                            eURL: pxt.appTarget.appTheme.embedUrl,
                            eVER: pxt.appTarget.versions ? pxt.appTarget.versions.target : "",
                            pxtTarget: pxt.appTarget.id,
                        });
                        opts.embedBlob = btoa(pxt.U.uint8ArrayToString(buf));
                    });
                }
                else {
                    return Promise.resolve();
                }
            })
                .then(function () {
                for (var _i = 0, _a = _this.sortedDeps(); _i < _a.length; _i++) {
                    var pkg = _a[_i];
                    for (var _b = 0, _c = pkg.getFiles(); _b < _c.length; _b++) {
                        var f = _c[_b];
                        if (/\.(ts|asm)$/.test(f)) {
                            var sn = f;
                            if (pkg.level > 0)
                                sn = "pxt_modules/" + pkg.id + "/" + f;
                            opts.sourceFiles.push(sn);
                            opts.fileSystem[sn] = pkg.readFile(f);
                        }
                    }
                }
                opts.jres = _this.getJRes();
                return opts;
            });
        };
        MainPackage.prototype.filesToBePublishedAsync = function (allowPrivate) {
            var _this = this;
            if (allowPrivate === void 0) { allowPrivate = false; }
            var files = {};
            return this.loadAsync()
                .then(function () {
                if (!allowPrivate && !_this.config.public)
                    pxt.U.userError('Only packages with "public":true can be published');
                var cfg = pxt.U.clone(_this.config);
                delete cfg.installedVersion;
                delete cfg.additionalFilePath;
                pxt.U.iterMap(cfg.dependencies, function (k, v) {
                    if (!v || /^file:/.test(v) || /^workspace:/.test(v)) {
                        cfg.dependencies[k] = "*";
                    }
                });
                files[pxt.CONFIG_NAME] = JSON.stringify(cfg, null, 4);
                for (var _i = 0, _a = _this.getFiles(); _i < _a.length; _i++) {
                    var f = _a[_i];
                    var str = _this.readFile(f);
                    if (str == null)
                        pxt.U.userError("referenced file missing: " + f);
                    files[f] = str;
                }
                return pxt.U.sortObjectFields(files);
            });
        };
        MainPackage.prototype.compressToFileAsync = function (editor) {
            var _this = this;
            return this.filesToBePublishedAsync(true)
                .then(function (files) {
                var project = {
                    meta: {
                        cloudId: pxt.CLOUD_ID + pxt.appTarget.id,
                        targetVersions: pxt.appTarget.versions,
                        editor: editor || pxt.BLOCKS_PROJECT_NAME,
                        name: _this.config.name
                    },
                    source: JSON.stringify(files, null, 2)
                };
                return pxt.lzmaCompressAsync(JSON.stringify(project, null, 2));
            });
        };
        MainPackage.prototype.computePartDefinitions = function (parts) {
            if (!parts || !parts.length)
                return {};
            var res = {};
            this.sortedDeps().forEach(function (d) {
                var pjson = d.readFile("pxtparts.json");
                if (pjson) {
                    try {
                        var p = JSON.parse(pjson);
                        for (var k in p) {
                            if (parts.indexOf(k) >= 0) {
                                var part = res[k] = p[k];
                                if (typeof part.visual.image === "string" && /\.svg$/i.test(part.visual.image)) {
                                    var f = d.readFile(part.visual.image);
                                    if (!f)
                                        pxt.reportError("parts", "invalid part definition", { "error": "missing visual " + part.visual.image });
                                    part.visual.image = "data:image/svg+xml," + encodeURIComponent(f);
                                }
                            }
                        }
                    }
                    catch (e) {
                        pxt.reportError("parts", "invalid pxtparts.json file");
                    }
                }
            });
            return res;
        };
        return MainPackage;
    }(Package));
    pxt.MainPackage = MainPackage;
})(pxt || (pxt = {}));
// see http://semver.org/
var pxt;
(function (pxt) {
    var semver;
    (function (semver) {
        function cmp(a, b) {
            if (!a)
                if (!b)
                    return 0;
                else
                    return 1;
            else if (!b)
                return -1;
            else {
                var d = a.major - b.major || a.minor - b.minor || a.patch - b.patch;
                if (d)
                    return d;
                if (a.pre.length == 0 && b.pre.length > 0)
                    return 1;
                if (a.pre.length > 0 && b.pre.length == 0)
                    return -1;
                for (var i = 0; i < a.pre.length + 1; ++i) {
                    var aa = a.pre[i];
                    var bb = b.pre[i];
                    if (!aa)
                        if (!bb)
                            return 0;
                        else
                            return -1;
                    else if (!bb)
                        return 1;
                    else if (/^\d+$/.test(aa))
                        if (/^\d+$/.test(bb)) {
                            d = parseInt(aa) - parseInt(bb);
                            if (d)
                                return d;
                        }
                        else
                            return -1;
                    else if (/^\d+$/.test(bb))
                        return 1;
                    else {
                        d = pxt.U.strcmp(aa, bb);
                        if (d)
                            return d;
                    }
                }
                return 0;
            }
        }
        semver.cmp = cmp;
        function parse(v) {
            var r = tryParse(v);
            if (!r)
                pxt.U.userError(pxt.U.lf("'{0}' doesn't look like a semantic version number", v));
            return r;
        }
        semver.parse = parse;
        function tryParse(v) {
            if (/^v\d/i.test(v))
                v = v.slice(1);
            var m = /^(\d+)\.(\d+)\.(\d+)(-([0-9a-zA-Z\-\.]+))?(\+([0-9a-zA-Z\-\.]+))?$/.exec(v);
            if (m)
                return {
                    major: parseInt(m[1]),
                    minor: parseInt(m[2]),
                    patch: parseInt(m[3]),
                    pre: m[5] ? m[5].split(".") : [],
                    build: m[7] ? m[7].split(".") : []
                };
            return null;
        }
        semver.tryParse = tryParse;
        function stringify(v) {
            var r = v.major + "." + v.minor + "." + v.patch;
            if (v.pre.length)
                r += "-" + v.pre.join(".");
            if (v.build.length)
                r += "+" + v.build.join(".");
            return r;
        }
        semver.stringify = stringify;
        function majorCmp(a, b) {
            var aa = tryParse(a);
            var bb = tryParse(b);
            return aa.major - bb.major;
        }
        semver.majorCmp = majorCmp;
        function strcmp(a, b) {
            var aa = tryParse(a);
            var bb = tryParse(b);
            if (!aa && !bb)
                return pxt.U.strcmp(a, b);
            else
                return cmp(aa, bb);
        }
        semver.strcmp = strcmp;
        function test() {
            console.log("Test semver");
            var d = [
                "0.9.0",
                "1.0.0-0.3.7",
                "1.0.0-alpha", "1.0.0-alpha.1",
                "1.0.0-alpha.beta", "1.0.0-beta",
                "1.0.0-beta.2", "1.0.0-beta.11",
                "1.0.0-rc.1",
                "1.0.0-x.7.z.92",
                "1.0.0",
                "1.0.1",
                "1.9.0", "1.10.0", "1.11.0"
            ];
            for (var i = 0; i < d.length; ++i) {
                var p = parse(d[i]);
                console.log(d[i], p);
                pxt.U.assert(stringify(p) == d[i]);
                for (var j = 0; j < d.length; ++j) {
                    var x = cmp(p, parse(d[j]));
                    console.log(d[i], d[j], x);
                    if (i < j)
                        pxt.U.assert(x < 0);
                    else if (i > j)
                        pxt.U.assert(x > 0);
                    else
                        pxt.U.assert(x == 0);
                }
            }
        }
        semver.test = test;
    })(semver = pxt.semver || (pxt.semver = {}));
})(pxt || (pxt = {}));
/// <reference path="../localtypings/pxtarget.d.ts"/>
/// <reference path="../localtypings/pxtpackage.d.ts"/>
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        pxtc.assert = pxtc.Util.assert;
        pxtc.oops = pxtc.Util.oops;
        pxtc.U = pxtc.Util;
        pxtc.ON_START_TYPE = "pxt-on-start";
        pxtc.ON_START_COMMENT = pxtc.U.lf("on start");
        pxtc.HANDLER_COMMENT = pxtc.U.lf("code goes here");
        pxtc.TS_STATEMENT_TYPE = "typescript_statement";
        pxtc.TS_OUTPUT_TYPE = "typescript_expression";
        pxtc.PAUSE_UNTIL_TYPE = "pxt_pause_until";
        pxtc.BINARY_JS = "binary.js";
        pxtc.BINARY_CS = "binary.cs";
        pxtc.BINARY_ASM = "binary.asm";
        pxtc.BINARY_HEX = "binary.hex";
        pxtc.BINARY_UF2 = "binary.uf2";
        pxtc.BINARY_ELF = "binary.elf";
        pxtc.NATIVE_TYPE_THUMB = "thumb";
        pxtc.NATIVE_TYPE_AVR = "AVR";
        pxtc.NATIVE_TYPE_CS = "C#";
        pxtc.NATIVE_TYPE_AVRVM = "AVRVM";
        var SymbolKind;
        (function (SymbolKind) {
            SymbolKind[SymbolKind["None"] = 0] = "None";
            SymbolKind[SymbolKind["Method"] = 1] = "Method";
            SymbolKind[SymbolKind["Property"] = 2] = "Property";
            SymbolKind[SymbolKind["Function"] = 3] = "Function";
            SymbolKind[SymbolKind["Variable"] = 4] = "Variable";
            SymbolKind[SymbolKind["Module"] = 5] = "Module";
            SymbolKind[SymbolKind["Enum"] = 6] = "Enum";
            SymbolKind[SymbolKind["EnumMember"] = 7] = "EnumMember";
            SymbolKind[SymbolKind["Class"] = 8] = "Class";
            SymbolKind[SymbolKind["Interface"] = 9] = "Interface";
        })(SymbolKind = pxtc.SymbolKind || (pxtc.SymbolKind = {}));
        function computeUsedParts(resp, ignoreBuiltin) {
            if (ignoreBuiltin === void 0) { ignoreBuiltin = false; }
            if (!resp.usedSymbols || !pxt.appTarget.simulator || !pxt.appTarget.simulator.parts)
                return [];
            var parts = [];
            for (var symbol in resp.usedSymbols) {
                var info = resp.usedSymbols[symbol];
                if (info && info.attributes.parts) {
                    var partsRaw = info.attributes.parts;
                    if (partsRaw) {
                        var partsSplit = partsRaw.split(/[ ,]+/);
                        partsSplit.forEach(function (p) {
                            if (0 < p.length && parts.indexOf(p) < 0) {
                                parts.push(p);
                            }
                        });
                    }
                }
            }
            if (ignoreBuiltin) {
                var builtinParts_1 = pxt.appTarget.simulator.boardDefinition.onboardComponents;
                if (builtinParts_1)
                    parts = parts.filter(function (p) { return builtinParts_1.indexOf(p) < 0; });
            }
            //sort parts (so breadboarding layout is stable w.r.t. code ordering)
            parts.sort();
            parts = parts.reverse(); //not strictly necessary, but it's a little
            // nicer for demos to have "ledmatrix"
            // before "buttonpair"
            return parts;
        }
        pxtc.computeUsedParts = computeUsedParts;
        /**
         * Unlocalized category name for a symbol
         */
        function blocksCategory(si) {
            var n = !si ? undefined : (si.attributes.blockNamespace || si.namespace);
            return n ? pxtc.Util.capitalize(n.split('.')[0]) : undefined;
        }
        pxtc.blocksCategory = blocksCategory;
        function getBlocksInfo(info) {
            var blocks = pxtc.Util.values(info.byQName)
                .filter(function (s) { return !!s.attributes.block && !!s.attributes.blockId && (s.kind != pxtc.SymbolKind.EnumMember); });
            return {
                apis: info,
                blocks: blocks,
                blocksById: pxt.Util.toDictionary(blocks, function (b) { return b.attributes.blockId; })
            };
        }
        pxtc.getBlocksInfo = getBlocksInfo;
        function localizeApisAsync(apis, mainPkg) {
            var lang = pxtc.Util.userLanguage();
            if (pxtc.Util.userLanguage() == "en")
                return Promise.resolve(apis);
            return mainPkg.localizationStringsAsync(lang)
                .then(function (loc) { return pxtc.Util.values(apis.byQName).forEach(function (fn) {
                var jsDoc = loc[fn.qName];
                if (jsDoc) {
                    fn.attributes.jsDoc = jsDoc;
                    if (fn.parameters)
                        fn.parameters.forEach(function (pi) { return pi.description = loc[fn.qName + "|param|" + pi.name] || pi.description; });
                }
                var nsDoc = loc['{id:category}' + pxtc.Util.capitalize(fn.qName)];
                var locBlock = loc[fn.qName + "|block"];
                if (nsDoc) {
                    // Check for "friendly namespace"
                    if (fn.attributes.block) {
                        fn.attributes.block = locBlock || fn.attributes.block;
                    }
                    else {
                        fn.attributes.block = nsDoc;
                    }
                }
                else if (fn.attributes.block && locBlock) {
                    var ps = pxt.blocks.parameterNames(fn).attrNames;
                    var oldBlock = fn.attributes.block;
                    fn.attributes.block = pxt.blocks.normalizeBlock(locBlock);
                    if (oldBlock != fn.attributes.block) {
                        var locps = pxt.blocks.parameterNames(fn).attrNames;
                        if (JSON.stringify(ps) != JSON.stringify(locps)) {
                            pxt.log("block has non matching arguments: " + oldBlock + " vs " + fn.attributes.block);
                            fn.attributes.block = oldBlock;
                        }
                    }
                }
            }); })
                .then(function () { return apis; });
        }
        pxtc.localizeApisAsync = localizeApisAsync;
        function emptyExtInfo() {
            var cs = pxt.appTarget.compileService;
            if (!cs)
                cs = {};
            var pio = !!cs.platformioIni;
            var docker = cs.buildEngine == "dockermake";
            var r = {
                functions: [],
                generatedFiles: {},
                extensionFiles: {},
                sha: "",
                compileData: "",
                shimsDTS: "",
                enumsDTS: "",
                onlyPublic: true
            };
            if (pio)
                r.platformio = { dependencies: {} };
            else if (docker)
                r.npmDependencies = {};
            else
                r.yotta = { config: {}, dependencies: {} };
            return r;
        }
        pxtc.emptyExtInfo = emptyExtInfo;
        var numberAttributes = ["weight", "imageLiteral"];
        var booleanAttributes = ["advanced", "handlerStatement", "afterOnStart", "optionalVariableArgs", "blockHidden"];
        function parseCommentString(cmt) {
            var res = {
                paramDefl: {},
                callingConvention: pxtc.ir.CallingConvention.Plain,
                _source: cmt
            };
            var didSomething = true;
            while (didSomething) {
                didSomething = false;
                cmt = cmt.replace(/\/\/%[ \t]*([\w\.]+)(=(("[^"\n]*")|'([^'\n]*)'|([^\s]*)))?/, function (f, n, d0, d1, v0, v1, v2) {
                    var v = v0 ? JSON.parse(v0) : (d0 ? (v0 || v1 || v2) : "true");
                    if (!v)
                        v = "";
                    if (pxtc.U.endsWith(n, ".defl")) {
                        if (v.indexOf(" ") > -1) {
                            res.paramDefl[n.slice(0, n.length - 5)] = "\"" + v + "\"";
                        }
                        else {
                            res.paramDefl[n.slice(0, n.length - 5)] = v;
                        }
                    }
                    else if (pxtc.U.endsWith(n, ".fieldEditor")) {
                        if (!res.paramFieldEditor)
                            res.paramFieldEditor = {};
                        res.paramFieldEditor[n.slice(0, n.length - 12)] = v;
                    }
                    else if (pxtc.U.contains(n, ".fieldOptions.")) {
                        if (!res.paramFieldEditorOptions)
                            res.paramFieldEditorOptions = {};
                        var field = n.slice(0, n.indexOf('.fieldOptions.'));
                        var key = n.slice(n.indexOf('.fieldOptions.') + 14, n.length);
                        if (!res.paramFieldEditorOptions[field])
                            res.paramFieldEditorOptions[field] = {};
                        res.paramFieldEditorOptions[field][key] = v;
                    }
                    else if (pxtc.U.contains(n, ".shadowOptions.")) {
                        if (!res.paramShadowOptions)
                            res.paramShadowOptions = {};
                        var field = n.slice(0, n.indexOf('.shadowOptions.'));
                        var key = n.slice(n.indexOf('.shadowOptions.') + 15, n.length);
                        if (!res.paramShadowOptions[field])
                            res.paramShadowOptions[field] = {};
                        res.paramShadowOptions[field][key] = v;
                    }
                    else if (pxtc.U.endsWith(n, ".min")) {
                        if (!res.paramMin)
                            res.paramMin = {};
                        res.paramMin[n.slice(0, n.length - 4)] = v;
                    }
                    else if (pxtc.U.endsWith(n, ".max")) {
                        if (!res.paramMax)
                            res.paramMax = {};
                        res.paramMax[n.slice(0, n.length - 4)] = v;
                    }
                    else {
                        res[n] = v;
                    }
                    didSomething = true;
                    return "//% ";
                });
            }
            for (var _i = 0, numberAttributes_1 = numberAttributes; _i < numberAttributes_1.length; _i++) {
                var n = numberAttributes_1[_i];
                if (typeof res[n] == "string")
                    res[n] = parseInt(res[n]);
            }
            for (var _a = 0, booleanAttributes_1 = booleanAttributes; _a < booleanAttributes_1.length; _a++) {
                var n = booleanAttributes_1[_a];
                if (typeof res[n] == "string")
                    res[n] = res[n] == 'true' || res[n] == '1' ? true : false;
            }
            if (res.trackArgs) {
                res.trackArgs = res.trackArgs.split(/[ ,]+/).map(function (s) { return parseInt(s) || 0; });
            }
            if (res.blockExternalInputs && !res.inlineInputMode) {
                res.inlineInputMode = "external";
            }
            res.paramHelp = {};
            res.jsDoc = "";
            cmt = cmt.replace(/\/\*\*([^]*?)\*\//g, function (full, doccmt) {
                doccmt = doccmt.replace(/\n\s*(\*\s*)?/g, "\n");
                doccmt = doccmt.replace(/^\s*@param\s+(\w+)\s+(.*)$/mg, function (full, name, desc) {
                    res.paramHelp[name] = desc;
                    if (!res.paramDefl[name]) {
                        var m = /\beg\.?:\s*(.+)/.exec(desc);
                        if (m && m[1]) {
                            var defaultValue = /(?:"([^"]*)")|(?:'([^']*)')|(?:([^\s,]+))/g.exec(m[1]);
                            if (defaultValue) {
                                var val = defaultValue[1] || defaultValue[2] || defaultValue[3];
                                if (!val)
                                    val = "";
                                // If there are spaces in the value, it means the value was surrounded with quotes, so add them back
                                if (val.indexOf(" ") > -1) {
                                    res.paramDefl[name] = "\"" + val + "\"";
                                }
                                else {
                                    res.paramDefl[name] = val;
                                }
                            }
                        }
                    }
                    return "";
                });
                res.jsDoc += doccmt;
                return "";
            });
            res.jsDoc = res.jsDoc.trim();
            if (res.async)
                res.callingConvention = pxtc.ir.CallingConvention.Async;
            if (res.promise)
                res.callingConvention = pxtc.ir.CallingConvention.Promise;
            if (res.jres)
                res.whenUsed = true;
            if (res.subcategories) {
                try {
                    res.subcategories = JSON.parse(res.subcategories);
                }
                catch (e) {
                    res.subcategories = undefined;
                }
            }
            if (res.groups) {
                try {
                    res.groups = JSON.parse(res.groups);
                }
                catch (e) {
                    res.groups = undefined;
                }
            }
            return res;
        }
        pxtc.parseCommentString = parseCommentString;
        // TODO should be internal
        var hex;
        (function (hex) {
            function isSetupFor(extInfo) {
                return hex.currentSetup == extInfo.sha;
            }
            hex.isSetupFor = isSetupFor;
            hex.currentSetup = null;
            function parseChecksumBlock(buf, pos) {
                if (pos === void 0) { pos = 0; }
                var magic = pxt.HF2.read32(buf, pos);
                if ((magic & 0x7fffffff) != 0x07eeb07c) {
                    pxt.log("no checksum block magic");
                    return null;
                }
                var endMarkerPos = pxt.HF2.read32(buf, pos + 4);
                var endMarker = pxt.HF2.read32(buf, pos + 8);
                if (endMarkerPos & 3) {
                    pxt.log("invalid end marker position");
                    return null;
                }
                var pageSize = 1 << (endMarker & 0xff);
                if (pageSize != pxt.appTarget.compile.flashCodeAlign) {
                    pxt.log("invalid page size: " + pageSize);
                    return null;
                }
                var blk = {
                    magic: magic,
                    endMarkerPos: endMarkerPos,
                    endMarker: endMarker,
                    regions: []
                };
                for (var i = pos + 12; i < buf.length - 7; i += 8) {
                    var r = {
                        start: pageSize * pxt.HF2.read16(buf, i),
                        length: pageSize * pxt.HF2.read16(buf, i + 2),
                        checksum: pxt.HF2.read32(buf, i + 4)
                    };
                    if (r.length && r.checksum) {
                        blk.regions.push(r);
                    }
                    else {
                        break;
                    }
                }
                //console.log(hexDump(buf), blk)
                return blk;
            }
            hex.parseChecksumBlock = parseChecksumBlock;
        })(hex = pxtc.hex || (pxtc.hex = {}));
        pxtc.decodeBase64 = function (s) { return atob(s); };
        var UF2;
        (function (UF2) {
            UF2.UF2_MAGIC_START0 = 0x0A324655; // "UF2\n"
            UF2.UF2_MAGIC_START1 = 0x9E5D5157; // Randomly selected
            UF2.UF2_MAGIC_END = 0x0AB16F30; // Ditto
            UF2.UF2_FLAG_NONE = 0x00000000;
            UF2.UF2_FLAG_NOFLASH = 0x00000001;
            UF2.UF2_FLAG_FILE = 0x00001000;
            function parseBlock(block) {
                var wordAt = function (k) {
                    return (block[k] + (block[k + 1] << 8) + (block[k + 2] << 16) + (block[k + 3] << 24)) >>> 0;
                };
                if (!block || block.length != 512 ||
                    wordAt(0) != UF2.UF2_MAGIC_START0 || wordAt(4) != UF2.UF2_MAGIC_START1 ||
                    wordAt(block.length - 4) != UF2.UF2_MAGIC_END)
                    return null;
                var flags = wordAt(8);
                var payloadSize = wordAt(16);
                if (payloadSize > 476)
                    payloadSize = 256;
                var filename = null;
                if (flags & UF2.UF2_FLAG_FILE) {
                    var fnbuf = block.slice(32 + payloadSize);
                    var len = fnbuf.indexOf(0);
                    if (len >= 0) {
                        fnbuf = fnbuf.slice(0, len);
                    }
                    filename = pxtc.U.fromUTF8(pxtc.U.uint8ArrayToString(fnbuf));
                }
                return {
                    flags: flags,
                    targetAddr: wordAt(12),
                    payloadSize: payloadSize,
                    blockNo: wordAt(20),
                    numBlocks: wordAt(24),
                    fileSize: wordAt(28),
                    data: block.slice(32, 32 + payloadSize),
                    filename: filename
                };
            }
            UF2.parseBlock = parseBlock;
            function parseFile(blocks) {
                var r = [];
                for (var i = 0; i < blocks.length; i += 512) {
                    var b = parseBlock(blocks.slice(i, i + 512));
                    if (b)
                        r.push(b);
                }
                return r;
            }
            UF2.parseFile = parseFile;
            function toBin(blocks) {
                if (blocks.length < 512)
                    return null;
                var curraddr = -1;
                var appstartaddr = -1;
                var bufs = [];
                for (var i = 0; i < blocks.length; ++i) {
                    var ptr = i * 512;
                    var bl = parseBlock(blocks.slice(ptr, ptr + 512));
                    if (!bl)
                        continue;
                    if (curraddr == -1) {
                        curraddr = bl.targetAddr;
                        appstartaddr = curraddr;
                    }
                    var padding = bl.targetAddr - curraddr;
                    if (padding < 0 || padding % 4 || padding > 1024 * 1024)
                        continue;
                    if (padding > 0)
                        bufs.push(new Uint8Array(padding));
                    bufs.push(blocks.slice(ptr + 32, ptr + 32 + bl.payloadSize));
                    curraddr = bl.targetAddr + bl.payloadSize;
                }
                var len = 0;
                for (var _i = 0, bufs_1 = bufs; _i < bufs_1.length; _i++) {
                    var b = bufs_1[_i];
                    len += b.length;
                }
                if (len == 0)
                    return null;
                var r = new Uint8Array(len);
                var dst = 0;
                for (var _a = 0, bufs_2 = bufs; _a < bufs_2.length; _a++) {
                    var b = bufs_2[_a];
                    for (var i = 0; i < b.length; ++i)
                        r[dst++] = b[i];
                }
                return {
                    buf: r,
                    start: appstartaddr,
                };
            }
            UF2.toBin = toBin;
            function hasAddr(b, a) {
                if (!b)
                    return false;
                return b.targetAddr <= a && a < b.targetAddr + b.payloadSize;
            }
            function readBytes(blocks, addr, length) {
                var res = new Uint8Array(length);
                var bl;
                for (var i = 0; i < length; ++i, ++addr) {
                    if (!hasAddr(bl, addr))
                        bl = blocks.filter(function (b) { return hasAddr(b, addr); })[0];
                    if (bl)
                        res[i] = bl.data[addr - bl.targetAddr];
                }
                return res;
            }
            UF2.readBytes = readBytes;
            function setWord(block, ptr, v) {
                block[ptr] = (v & 0xff);
                block[ptr + 1] = ((v >> 8) & 0xff);
                block[ptr + 2] = ((v >> 16) & 0xff);
                block[ptr + 3] = ((v >> 24) & 0xff);
            }
            function newBlockFile() {
                return {
                    currBlock: null,
                    currPtr: -1,
                    blocks: [],
                    ptrs: [],
                    filesize: 0
                };
            }
            UF2.newBlockFile = newBlockFile;
            function finalizeFile(f) {
                for (var i = 0; i < f.blocks.length; ++i) {
                    setWord(f.blocks[i], 20, i);
                    setWord(f.blocks[i], 24, f.blocks.length);
                    if (f.filename)
                        setWord(f.blocks[i], 28, f.filesize);
                }
            }
            UF2.finalizeFile = finalizeFile;
            function concatFiles(fs) {
                for (var _i = 0, fs_1 = fs; _i < fs_1.length; _i++) {
                    var f = fs_1[_i];
                    finalizeFile(f);
                    f.filename = null;
                }
                var r = newBlockFile();
                r.blocks = pxtc.U.concat(fs.map(function (f) { return f.blocks; }));
                for (var _a = 0, fs_2 = fs; _a < fs_2.length; _a++) {
                    var f = fs_2[_a];
                    f.blocks = [];
                }
                return r;
            }
            UF2.concatFiles = concatFiles;
            function serializeFile(f) {
                finalizeFile(f);
                var res = "";
                for (var _i = 0, _a = f.blocks; _i < _a.length; _i++) {
                    var b = _a[_i];
                    res += pxtc.Util.uint8ArrayToString(b);
                }
                return res;
            }
            UF2.serializeFile = serializeFile;
            function readBytesFromFile(f, addr, length) {
                //console.log(`read @${addr} len=${length}`)
                var needAddr = addr >> 8;
                var bl;
                if (needAddr == f.currPtr)
                    bl = f.currBlock;
                else {
                    for (var i = 0; i < f.ptrs.length; ++i) {
                        if (f.ptrs[i] == needAddr) {
                            bl = f.blocks[i];
                            break;
                        }
                    }
                    if (bl) {
                        f.currPtr = needAddr;
                        f.currBlock = bl;
                    }
                }
                if (!bl)
                    return null;
                var res = new Uint8Array(length);
                var toRead = Math.min(length, 256 - (addr & 0xff));
                pxtc.U.memcpy(res, 0, bl, (addr & 0xff) + 32, toRead);
                var leftOver = length - toRead;
                if (leftOver > 0) {
                    var le = readBytesFromFile(f, addr + toRead, leftOver);
                    pxtc.U.memcpy(res, toRead, le);
                }
                return res;
            }
            UF2.readBytesFromFile = readBytesFromFile;
            function writeBytes(f, addr, bytes) {
                var currBlock = f.currBlock;
                var needAddr = addr >> 8;
                // account for unaligned writes
                var thisChunk = 256 - (addr & 0xff);
                if (bytes.length > thisChunk) {
                    var b = new Uint8Array(bytes);
                    writeBytes(f, addr, b.slice(0, thisChunk));
                    while (thisChunk < bytes.length) {
                        var nextOff = Math.min(thisChunk + 256, bytes.length);
                        writeBytes(f, addr + thisChunk, b.slice(thisChunk, nextOff));
                        thisChunk = nextOff;
                    }
                    return;
                }
                if (needAddr != f.currPtr) {
                    var i = 0;
                    currBlock = null;
                    for (var i_1 = 0; i_1 < f.ptrs.length; ++i_1) {
                        if (f.ptrs[i_1] == needAddr) {
                            currBlock = f.blocks[i_1];
                            break;
                        }
                    }
                    if (!currBlock) {
                        currBlock = new Uint8Array(512);
                        setWord(currBlock, 0, UF2.UF2_MAGIC_START0);
                        setWord(currBlock, 4, UF2.UF2_MAGIC_START1);
                        setWord(currBlock, 8, f.filename ? UF2.UF2_FLAG_FILE : UF2.UF2_FLAG_NONE);
                        setWord(currBlock, 12, needAddr << 8);
                        setWord(currBlock, 16, 256);
                        setWord(currBlock, 20, f.blocks.length);
                        setWord(currBlock, 512 - 4, UF2.UF2_MAGIC_END);
                        if (f.filename) {
                            pxtc.U.memcpy(currBlock, 32 + 256, pxtc.U.stringToUint8Array(pxtc.U.toUTF8(f.filename)));
                        }
                        f.blocks.push(currBlock);
                        f.ptrs.push(needAddr);
                    }
                    f.currPtr = needAddr;
                    f.currBlock = currBlock;
                }
                var p = (addr & 0xff) + 32;
                for (var i = 0; i < bytes.length; ++i)
                    currBlock[p + i] = bytes[i];
                f.filesize = Math.max(f.filesize, bytes.length + addr);
            }
            UF2.writeBytes = writeBytes;
            function writeHex(f, hex) {
                var upperAddr = "0000";
                for (var i = 0; i < hex.length; ++i) {
                    var m = /:02000004(....)/.exec(hex[i]);
                    if (m) {
                        upperAddr = m[1];
                    }
                    m = /^:..(....)00(.*)[0-9A-F][0-9A-F]$/.exec(hex[i]);
                    if (m) {
                        var newAddr = parseInt(upperAddr + m[1], 16);
                        var hh = m[2];
                        var arr = [];
                        for (var j = 0; j < hh.length; j += 2) {
                            arr.push(parseInt(hh[j] + hh[j + 1], 16));
                        }
                        writeBytes(f, newAddr, arr);
                    }
                }
            }
            UF2.writeHex = writeHex;
        })(UF2 = pxtc.UF2 || (pxtc.UF2 = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var ir;
        (function (ir) {
            var CallingConvention;
            (function (CallingConvention) {
                CallingConvention[CallingConvention["Plain"] = 0] = "Plain";
                CallingConvention[CallingConvention["Async"] = 1] = "Async";
                CallingConvention[CallingConvention["Promise"] = 2] = "Promise";
            })(CallingConvention = ir.CallingConvention || (ir.CallingConvention = {}));
        })(ir = pxtc.ir || (pxtc.ir = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
// See https://github.com/Microsoft/TouchDevelop-backend/blob/master/docs/streams.md
var pxt;
(function (pxt) {
    var streams;
    (function (streams) {
        function createStreamAsync(target, name) {
            return pxt.Cloud.privatePostAsync("streams", { target: target, name: name || 'data' }).then(function (j) { return j; });
        }
        streams.createStreamAsync = createStreamAsync;
        function postPayloadAsync(stream, data) {
            pxt.Util.assert(!!stream.privatekey);
            return pxt.Cloud.privatePostAsync(stream.id + "/data?privatekey=" + stream.privatekey, data);
        }
        streams.postPayloadAsync = postPayloadAsync;
    })(streams = pxt.streams || (pxt.streams = {}));
})(pxt || (pxt = {}));
/// <reference path='../built/typescriptServices.d.ts' />
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        function flattenDiagnosticMessageText(messageText, newLine) {
            if (typeof messageText === "string") {
                return messageText;
            }
            else {
                var diagnosticChain = messageText;
                var result = "";
                var indent = 0;
                while (diagnosticChain) {
                    if (indent) {
                        result += newLine;
                        for (var i = 0; i < indent; i++) {
                            result += "  ";
                        }
                    }
                    result += diagnosticChain.messageText;
                    indent++;
                    diagnosticChain = diagnosticChain.next;
                }
                return result;
            }
        }
        pxtc.flattenDiagnosticMessageText = flattenDiagnosticMessageText;
        var ScriptTarget;
        (function (ScriptTarget) {
            ScriptTarget[ScriptTarget["ES3"] = 0] = "ES3";
            ScriptTarget[ScriptTarget["ES5"] = 1] = "ES5";
            ScriptTarget[ScriptTarget["ES6"] = 2] = "ES6";
            ScriptTarget[ScriptTarget["ES2015"] = 2] = "ES2015";
            ScriptTarget[ScriptTarget["Latest"] = 2] = "Latest";
        })(ScriptTarget = pxtc.ScriptTarget || (pxtc.ScriptTarget = {}));
        function isIdentifierStart(ch, languageVersion) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
                ch === 36 /* $ */ || ch === 95 /* _ */ ||
                ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierStart(ch, languageVersion);
        }
        pxtc.isIdentifierStart = isIdentifierStart;
        function isIdentifierPart(ch, languageVersion) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
                ch >= 48 /* _0 */ && ch <= 57 /* _9 */ || ch === 36 /* $ */ || ch === 95 /* _ */ ||
                ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierPart(ch, languageVersion);
        }
        pxtc.isIdentifierPart = isIdentifierPart;
        pxtc.reservedWords = ["abstract", "any", "as", "break",
            "case", "catch", "class", "continue", "const", "constructor", "debugger",
            "declare", "default", "delete", "do", "else", "enum", "export", "extends",
            "false", "finally", "for", "from", "function", "get", "if", "implements",
            "import", "in", "instanceof", "interface", "is", "let", "module", "namespace",
            "new", "null", "package", "private", "protected", "public",
            "require", "global", "return", "set", "static", "super", "switch",
            "symbol", "this", "throw", "true", "try", "type", "typeof", "var", "void",
            "while", "with", "yield", "async", "await", "of",
            // PXT Specific
            "Math"];
        function escapeIdentifier(name) {
            if (!name)
                return '_';
            var n = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_$]/g, function (a) {
                return ts.pxtc.isIdentifierPart(a.charCodeAt(0), ts.pxtc.ScriptTarget.ES5) ? a : "";
            });
            if (!n || !ts.pxtc.isIdentifierStart(n.charCodeAt(0), ts.pxtc.ScriptTarget.ES5) || pxtc.reservedWords.indexOf(n) !== -1) {
                n = "_" + n;
            }
            return n;
        }
        pxtc.escapeIdentifier = escapeIdentifier;
        var unicodeES5IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 880, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1568, 1610, 1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775, 1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957, 1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069, 2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2208, 2208, 2210, 2220, 2308, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2417, 2423, 2425, 2431, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929, 2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3133, 3160, 3161, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261, 3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3389, 3406, 3406, 3424, 3425, 3450, 3455, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3807, 3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138, 4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198, 4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000, 6016, 6067, 6103, 6103, 6108, 6108, 6176, 6263, 6272, 6312, 6314, 6314, 6320, 6389, 6400, 6428, 6480, 6509, 6512, 6516, 6528, 6571, 6593, 6599, 6656, 6678, 6688, 6740, 6823, 6823, 6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7098, 7141, 7168, 7203, 7245, 7247, 7258, 7293, 7401, 7404, 7406, 7409, 7413, 7414, 7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11502, 11506, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11823, 11823, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539, 42560, 42606, 42623, 42647, 42656, 42735, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43009, 43011, 43013, 43015, 43018, 43020, 43042, 43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259, 43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442, 43471, 43471, 43520, 43560, 43584, 43586, 43588, 43595, 43616, 43638, 43642, 43642, 43648, 43695, 43697, 43697, 43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714, 43739, 43741, 43744, 43754, 43762, 43764, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44002, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES5IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 768, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1155, 1159, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1469, 1471, 1471, 1473, 1474, 1476, 1477, 1479, 1479, 1488, 1514, 1520, 1522, 1552, 1562, 1568, 1641, 1646, 1747, 1749, 1756, 1759, 1768, 1770, 1788, 1791, 1791, 1808, 1866, 1869, 1969, 1984, 2037, 2042, 2042, 2048, 2093, 2112, 2139, 2208, 2208, 2210, 2220, 2276, 2302, 2304, 2403, 2406, 2415, 2417, 2423, 2425, 2431, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2561, 2563, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2652, 2654, 2654, 2662, 2677, 2689, 2691, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2787, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2915, 2918, 2927, 2929, 2929, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3024, 3024, 3031, 3031, 3046, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3160, 3161, 3168, 3171, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3260, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3299, 3302, 3311, 3313, 3314, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3396, 3398, 3400, 3402, 3406, 3415, 3415, 3424, 3427, 3430, 3439, 3450, 3455, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3807, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3948, 3953, 3972, 3974, 3991, 3993, 4028, 4038, 4038, 4096, 4169, 4176, 4253, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4957, 4959, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5908, 5920, 5940, 5952, 5971, 5984, 5996, 5998, 6000, 6002, 6003, 6016, 6099, 6103, 6103, 6108, 6109, 6112, 6121, 6155, 6157, 6160, 6169, 6176, 6263, 6272, 6314, 6320, 6389, 6400, 6428, 6432, 6443, 6448, 6459, 6470, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6617, 6656, 6683, 6688, 6750, 6752, 6780, 6783, 6793, 6800, 6809, 6823, 6823, 6912, 6987, 6992, 7001, 7019, 7027, 7040, 7155, 7168, 7223, 7232, 7241, 7245, 7293, 7376, 7378, 7380, 7414, 7424, 7654, 7676, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8204, 8205, 8255, 8256, 8276, 8276, 8305, 8305, 8319, 8319, 8336, 8348, 8400, 8412, 8417, 8417, 8421, 8432, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11647, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11744, 11775, 11823, 11823, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12348, 12353, 12438, 12441, 12442, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42539, 42560, 42607, 42612, 42621, 42623, 42647, 42655, 42737, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43047, 43072, 43123, 43136, 43204, 43216, 43225, 43232, 43255, 43259, 43259, 43264, 43309, 43312, 43347, 43360, 43388, 43392, 43456, 43471, 43481, 43520, 43574, 43584, 43597, 43600, 43609, 43616, 43638, 43642, 43643, 43648, 43714, 43739, 43741, 43744, 43759, 43762, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44010, 44012, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65024, 65039, 65056, 65062, 65075, 65076, 65101, 65103, 65136, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES3IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1610, 1649, 1747, 1749, 1749, 1765, 1766, 1786, 1788, 1808, 1808, 1810, 1836, 1920, 1957, 2309, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2784, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3294, 3294, 3296, 3297, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3424, 3425, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3805, 3840, 3840, 3904, 3911, 3913, 3946, 3976, 3979, 4096, 4129, 4131, 4135, 4137, 4138, 4176, 4181, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6067, 6176, 6263, 6272, 6312, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8319, 8319, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12346, 12353, 12436, 12445, 12446, 12449, 12538, 12540, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65138, 65140, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        var unicodeES3IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 768, 846, 864, 866, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1155, 1158, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1441, 1443, 1465, 1467, 1469, 1471, 1471, 1473, 1474, 1476, 1476, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1621, 1632, 1641, 1648, 1747, 1749, 1756, 1759, 1768, 1770, 1773, 1776, 1788, 1808, 1836, 1840, 1866, 1920, 1968, 2305, 2307, 2309, 2361, 2364, 2381, 2384, 2388, 2392, 2403, 2406, 2415, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2492, 2494, 2500, 2503, 2504, 2507, 2509, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2562, 2562, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2649, 2652, 2654, 2654, 2662, 2676, 2689, 2691, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2784, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2876, 2883, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2913, 2918, 2927, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3031, 3031, 3047, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3134, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3168, 3169, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3262, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3297, 3302, 3311, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3390, 3395, 3398, 3400, 3402, 3405, 3415, 3415, 3424, 3425, 3430, 3439, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3805, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3946, 3953, 3972, 3974, 3979, 3984, 3991, 3993, 4028, 4038, 4038, 4096, 4129, 4131, 4135, 4137, 4138, 4140, 4146, 4150, 4153, 4160, 4169, 4176, 4185, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 4969, 4977, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6099, 6112, 6121, 6160, 6169, 6176, 6263, 6272, 6313, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8255, 8256, 8319, 8319, 8400, 8412, 8417, 8417, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12346, 12353, 12436, 12441, 12442, 12445, 12446, 12449, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65056, 65059, 65075, 65076, 65101, 65103, 65136, 65138, 65140, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65381, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500,];
        function isUnicodeIdentifierStart(code, languageVersion) {
            return languageVersion >= ScriptTarget.ES5 ?
                lookupInUnicodeMap(code, unicodeES5IdentifierStart) :
                lookupInUnicodeMap(code, unicodeES3IdentifierStart);
        }
        pxtc.isUnicodeIdentifierStart = isUnicodeIdentifierStart;
        function isUnicodeIdentifierPart(code, languageVersion) {
            return languageVersion >= ScriptTarget.ES5 ?
                lookupInUnicodeMap(code, unicodeES5IdentifierPart) :
                lookupInUnicodeMap(code, unicodeES3IdentifierPart);
        }
        function lookupInUnicodeMap(code, map) {
            // Bail out quickly if it couldn't possibly be in the map.
            if (code < map[0]) {
                return false;
            }
            // Perform binary search in one of the Unicode range maps
            var lo = 0;
            var hi = map.length;
            var mid;
            while (lo + 1 < hi) {
                mid = lo + (hi - lo) / 2;
                // mid has to be even to catch a range's beginning
                mid -= mid % 2;
                if (map[mid] <= code && code <= map[mid + 1]) {
                    return true;
                }
                if (code < map[mid]) {
                    hi = mid;
                }
                else {
                    lo = mid + 2;
                }
            }
            return false;
        }
        var DiagnosticCategory;
        (function (DiagnosticCategory) {
            DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
            DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
            DiagnosticCategory[DiagnosticCategory["Message"] = 2] = "Message";
        })(DiagnosticCategory = pxtc.DiagnosticCategory || (pxtc.DiagnosticCategory = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxt;
(function (pxt) {
    var usb;
    (function (usb) {
        var USBError = /** @class */ (function (_super) {
            __extends(USBError, _super);
            function USBError(msg) {
                var _this = _super.call(this, msg) || this;
                _this.message = msg;
                return _this;
            }
            return USBError;
        }(Error));
        usb.USBError = USBError;
        ;
        ;
        ;
        var HID = /** @class */ (function () {
            function HID(dev) {
                this.dev = dev;
                this.ready = false;
                this.onData = function (v) { };
                this.onError = function (e) { };
                this.onEvent = function (v) { };
                this.readLoop();
            }
            HID.prototype.error = function (msg) {
                throw new USBError(pxt.U.lf("USB error on device {0} ({1})", this.dev.productName, msg));
            };
            HID.prototype.disconnectAsync = function () {
                var _this = this;
                if (!this.dev)
                    return Promise.resolve();
                this.ready = false;
                return this.dev.close()
                    .then(function () {
                    _this.dev = null;
                    return Promise.delay(500);
                });
            };
            HID.prototype.reconnectAsync = function () {
                var _this = this;
                return this.disconnectAsync()
                    .then(requestDeviceAsync)
                    .then(function (dev) {
                    _this.dev = dev;
                    return _this.initAsync();
                });
            };
            HID.prototype.sendPacketAsync = function (pkt) {
                var _this = this;
                pxt.Util.assert(pkt.length <= 64);
                return this.dev.transferOut(this.epOut.endpointNumber, pkt)
                    .then(function (res) {
                    if (res.status != "ok")
                        _this.error("USB OUT transfer failed");
                });
            };
            HID.prototype.readLoop = function () {
                var _this = this;
                var loop = function () {
                    if (!_this.ready)
                        Promise.delay(300).then(loop);
                    else
                        _this.recvPacketAsync()
                            .then(function (buf) {
                            _this.onData(buf);
                            loop();
                        }, function (err) {
                            _this.onError(err);
                            Promise.delay(300).then(loop);
                        });
                };
                loop();
            };
            HID.prototype.recvPacketAsync = function () {
                var _this = this;
                return this.dev.transferIn(this.epIn.endpointNumber, 64)
                    .then(function (res) {
                    if (res.status != "ok")
                        _this.error("USB IN transfer failed");
                    var arr = new Uint8Array(res.data.buffer);
                    if (arr.length == 0)
                        return _this.recvPacketAsync();
                    return arr;
                });
            };
            HID.prototype.initAsync = function () {
                var _this = this;
                var dev = this.dev;
                return dev.open()
                    .then(function () { return dev.selectConfiguration(1); })
                    .then(function () {
                    var isHID = function (iface) {
                        return iface.alternates[0].interfaceClass == 0xff &&
                            iface.alternates[0].interfaceSubclass == 42;
                    };
                    //iface.alternates[0].endpoints[0].type == "interrupt";
                    var hid = dev.configurations[0].interfaces.filter(isHID)[0];
                    if (!hid)
                        _this.error("cannot find USB HID interface");
                    _this.altIface = hid.alternates[0];
                    _this.epIn = _this.altIface.endpoints.filter(function (e) { return e.direction == "in"; })[0];
                    _this.epOut = _this.altIface.endpoints.filter(function (e) { return e.direction == "out"; })[0];
                    pxt.Util.assert(_this.epIn.packetSize == 64);
                    pxt.Util.assert(_this.epOut.packetSize == 64);
                    //Util.assert(this.epIn.type == "interrupt");
                    //Util.assert(this.epOut.type == "interrupt");
                    //console.log("USB-device", dev)
                    return dev.claimInterface(hid.interfaceNumber);
                })
                    .then(function () { _this.ready = true; });
            };
            return HID;
        }());
        function requestDeviceAsync() {
            return navigator.usb.requestDevice({ filters: [] });
        }
        function getHidAsync() {
            return requestDeviceAsync()
                .then(function (dev) {
                var h = new HID(dev);
                return h.initAsync()
                    .then(function () { return h; });
            });
        }
        function hf2Async() {
            return getHidAsync()
                .then(function (h) {
                var w = new pxt.HF2.Wrapper(h);
                return w.reconnectAsync(true)
                    .then(function () { return w; });
            });
        }
        var initPromise;
        function initAsync() {
            if (!initPromise)
                initPromise = hf2Async();
            return initPromise;
        }
        usb.initAsync = initAsync;
    })(usb = pxt.usb || (pxt.usb = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var worker;
    (function (worker_1) {
        var U = pxt.Util;
        var workers = {};
        // Gets a cached worker for the given file
        function getWorker(workerFile) {
            var w = workers[workerFile];
            if (!w) {
                w = workers[workerFile] = makeWebWorker(workerFile);
            }
            return w;
        }
        worker_1.getWorker = getWorker;
        function wrap(send) {
            var pendingMsgs = {};
            var msgId = 0;
            var q = new U.PromiseQueue();
            var initPromise = new Promise(function (resolve, reject) {
                pendingMsgs["ready"] = resolve;
            });
            q.enqueue("main", function () { return initPromise; });
            var recvHandler = function (data) {
                if (pendingMsgs.hasOwnProperty(data.id)) {
                    var cb = pendingMsgs[data.id];
                    delete pendingMsgs[data.id];
                    cb(data.result);
                }
            };
            function opAsync(op, arg) {
                return q.enqueue("main", function () { return new Promise(function (resolve, reject) {
                    var id = "" + msgId++;
                    pendingMsgs[id] = function (v) {
                        if (!v) {
                            //pxt.reportError("worker", "no response")
                            reject(new Error("no response"));
                        }
                        else if (v.errorMessage) {
                            //pxt.reportError("worker", v.errorMessage)
                            reject(new Error(v.errorMessage));
                        }
                        else {
                            resolve(v);
                        }
                    };
                    send({ id: id, op: op, arg: arg });
                }); });
            }
            return { opAsync: opAsync, recvHandler: recvHandler };
        }
        worker_1.wrap = wrap;
        function makeWebWorker(workerFile) {
            var worker = new Worker(workerFile);
            var iface = wrap(function (v) { return worker.postMessage(v); });
            worker.onmessage = function (ev) {
                iface.recvHandler(ev.data);
            };
            return iface;
        }
        worker_1.makeWebWorker = makeWebWorker;
        function makeWebSocket(url, onOOB) {
            if (onOOB === void 0) { onOOB = null; }
            var ws = new WebSocket(url);
            var sendq = [];
            var iface = wrap(function (v) {
                var s = JSON.stringify(v);
                if (sendq)
                    sendq.push(s);
                else
                    ws.send(s);
            });
            ws.onmessage = function (ev) {
                var js = JSON.parse(ev.data);
                if (onOOB && js.id == null) {
                    onOOB(js);
                }
                else {
                    iface.recvHandler(js);
                }
            };
            ws.onopen = function (ev) {
                pxt.debug('socket opened');
                for (var _i = 0, sendq_1 = sendq; _i < sendq_1.length; _i++) {
                    var m = sendq_1[_i];
                    ws.send(m);
                }
                sendq = null;
            };
            ws.onclose = function (ev) {
                pxt.debug('socket closed');
            };
            return iface;
        }
        worker_1.makeWebSocket = makeWebSocket;
    })(worker = pxt.worker || (pxt.worker = {}));
})(pxt || (pxt = {}));
// TODO: add a macro facility to make 8-bit assembly easier?
var ts;
(function (ts) {
    var pxtc;
    (function (pxtc) {
        var assembler;
        (function (assembler) {
            function lf(fmt) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return fmt.replace(/{(\d+)}/g, function (match, index) { return args[+index]; });
            }
            assembler.lf = lf;
            var badNameError = emitErr("opcode name doesn't match", "<name>");
            // An Instruction represents an instruction class with meta-variables
            // that should be substituted given an actually line (Line) of assembly
            // Thus, the Instruction helps us parse a sequence of tokens in a Line
            // as well as extract the relevant values to substitute for the meta-variables.
            // The Instruction also knows how to convert the particular instance into
            // machine code (EmitResult)
            var Instruction = /** @class */ (function () {
                function Instruction(ei, format, opcode, mask, is32bit) {
                    var _this = this;
                    this.opcode = opcode;
                    this.mask = mask;
                    this.is32bit = is32bit;
                    this.canBeShared = false;
                    pxtc.assert((opcode & mask) == opcode);
                    this.ei = ei;
                    this.code = format.replace(/\s+/g, " ");
                    this.friendlyFmt = format.replace(/\$\w+/g, function (m) {
                        if (_this.ei.encoders[m])
                            return _this.ei.encoders[m].pretty;
                        return m;
                    });
                    var words = tokenize(format);
                    this.name = words[0];
                    this.args = words.slice(1);
                }
                Instruction.prototype.emit = function (ln) {
                    var tokens = ln.words;
                    if (tokens[0] != this.name)
                        return badNameError;
                    var r = this.opcode;
                    var j = 1;
                    var stack = 0;
                    var numArgs = [];
                    var labelName = null;
                    var bit32_value = null;
                    var bit32_actual = null;
                    for (var i = 0; i < this.args.length; ++i) {
                        var formal = this.args[i];
                        var actual = tokens[j++];
                        if (formal[0] == "$") {
                            var enc = this.ei.encoders[formal];
                            var v = null;
                            if (enc.isRegister) {
                                v = this.ei.registerNo(actual);
                                if (v == null)
                                    return emitErr("expecting register name", actual);
                                if (this.ei.isPush(this.opcode))
                                    stack++;
                                else if (this.ei.isPop(this.opcode))
                                    stack--;
                            }
                            else if (enc.isImmediate) {
                                actual = actual.replace(/^#/, "");
                                v = ln.bin.parseOneInt(actual);
                                if (v == null) {
                                    return emitErr("expecting number", actual);
                                }
                                else {
                                    // explicit manipulation of stack pointer (SP)
                                    // ARM only
                                    if (this.ei.isAddSP(this.opcode))
                                        stack = -(v / this.ei.wordSize());
                                    else if (this.ei.isSubSP(this.opcode))
                                        stack = (v / this.ei.wordSize());
                                }
                            }
                            else if (enc.isRegList) {
                                // register lists are ARM-specific - this code not used in AVR 
                                if (actual != "{")
                                    return emitErr("expecting {", actual);
                                v = 0;
                                while (tokens[j] != "}") {
                                    actual = tokens[j++];
                                    if (!actual)
                                        return emitErr("expecting }", tokens[j - 2]);
                                    var no = this.ei.registerNo(actual);
                                    if (no == null)
                                        return emitErr("expecting register name", actual);
                                    if (v & (1 << no))
                                        return emitErr("duplicate register name", actual);
                                    v |= (1 << no);
                                    if (this.ei.isPush(this.opcode))
                                        stack++;
                                    else if (this.ei.isPop(this.opcode))
                                        stack--;
                                    if (tokens[j] == ",")
                                        j++;
                                }
                                actual = tokens[j++]; // skip close brace
                            }
                            else if (enc.isLabel) {
                                actual = actual.replace(/^#/, "");
                                if (/^[+-]?\d+$/.test(actual)) {
                                    v = parseInt(actual, 10);
                                    labelName = "rel" + v;
                                }
                                else if (/^0x[0-9a-fA-F]+$/.test(actual)) {
                                    v = parseInt(actual, 16);
                                    labelName = "abs" + v;
                                }
                                else {
                                    labelName = actual;
                                    v = this.ei.getAddressFromLabel(ln.bin, this, actual, enc.isWordAligned);
                                    if (v == null) {
                                        if (ln.bin.finalEmit)
                                            return emitErr("unknown label", actual);
                                        else
                                            // just need some value when we are 
                                            // doing some pass other than finalEmit
                                            v = 8; // needs to be divisible by 4 etc
                                    }
                                }
                                if (this.ei.is32bit(this)) {
                                    // console.log(actual + " " + v.toString())
                                    bit32_value = v;
                                    bit32_actual = actual;
                                    continue;
                                }
                            }
                            else {
                                pxtc.oops();
                            }
                            if (v == null)
                                return emitErr("didn't understand it", actual); // shouldn't happen
                            numArgs.push(v);
                            v = enc.encode(v);
                            // console.log("enc(v) = ",v)
                            if (v == null)
                                return emitErr("argument out of range or mis-aligned", actual);
                            pxtc.assert((r & v) == 0);
                            r |= v;
                        }
                        else if (formal == actual) {
                            // skip
                        }
                        else {
                            return emitErr("expecting " + formal, actual);
                        }
                    }
                    if (tokens[j])
                        return emitErr("trailing tokens", tokens[j]);
                    if (this.ei.is32bit(this)) {
                        return this.ei.emit32(r, bit32_value, ln.bin.normalizeExternalLabel(bit32_actual));
                    }
                    return {
                        stack: stack,
                        opcode: r,
                        numArgs: numArgs,
                        labelName: ln.bin.normalizeExternalLabel(labelName)
                    };
                };
                Instruction.prototype.toString = function () {
                    return this.friendlyFmt;
                };
                return Instruction;
            }());
            assembler.Instruction = Instruction;
            // represents a line of assembly from a file
            var Line = /** @class */ (function () {
                function Line(bin, text) {
                    this.bin = bin;
                    this.text = text;
                }
                Line.prototype.getOpExt = function () {
                    return this.instruction ? this.instruction.code : "";
                };
                Line.prototype.getOp = function () {
                    return this.instruction ? this.instruction.name : "";
                };
                Line.prototype.update = function (s) {
                    this.bin.peepOps++;
                    s = s.replace(/^\s*/, "");
                    if (!s)
                        this.bin.peepDel++;
                    if (s)
                        s += "      ";
                    s = "    " + s;
                    this.text = s + "; WAS: " + this.text.trim();
                    this.instruction = null;
                    this.numArgs = null;
                    this.words = tokenize(s) || [];
                    if (this.words.length == 0)
                        this.type = "empty";
                    else if (this.words[0][0] == "@")
                        this.type = "directive";
                };
                return Line;
            }());
            assembler.Line = Line;
            // File is the center of the action: parsing a file into a sequence of Lines
            // and also emitting the binary (buf)
            var File = /** @class */ (function () {
                function File(ei) {
                    this.baseOffset = 0;
                    this.checkStack = true;
                    this.inlineMode = false;
                    this.normalizeExternalLabel = function (n) { return n; };
                    this.currLineNo = 0;
                    this.scope = "";
                    this.scopeId = 0;
                    this.errors = [];
                    this.labels = {};
                    this.stackpointers = {};
                    this.stack = 0;
                    this.peepOps = 0;
                    this.peepDel = 0;
                    this.peepCounts = {};
                    this.stats = "";
                    this.throwOnError = false;
                    this.disablePeepHole = false;
                    this.stackAtLabel = {};
                    this.currLine = new Line(this, "<start>");
                    this.currLine.lineNo = 0;
                    this.ei = ei;
                    this.ei.file = this;
                }
                File.prototype.emitShort = function (op) {
                    pxtc.assert(0 <= op && op <= 0xffff);
                    this.buf.push(op);
                };
                File.prototype.emitOpCode = function (op) {
                    this.emitShort(op);
                };
                File.prototype.location = function () {
                    // store one short (2 bytes) per buf location
                    return this.buf.length * 2;
                };
                File.prototype.pc = function () {
                    return this.location() + this.baseOffset;
                };
                // parsing of an "integer", well actually much more than 
                // just that
                File.prototype.parseOneInt = function (s) {
                    if (!s)
                        return null;
                    if (s == "0")
                        return 0;
                    var mul = 1;
                    // recursive-descent parsing of multiplication
                    if (s.indexOf("*") >= 0) {
                        var m_1 = null;
                        while (m_1 = /^([^\*]*)\*(.*)$/.exec(s)) {
                            var tmp = this.parseOneInt(m_1[1]);
                            if (tmp == null)
                                return null;
                            mul *= tmp;
                            s = m_1[2];
                        }
                    }
                    if (s[0] == "-") {
                        mul *= -1;
                        s = s.slice(1);
                    }
                    else if (s[0] == "+") {
                        s = s.slice(1);
                    }
                    var v = null;
                    // allow or'ing of 1 to least-signficant bit
                    if (pxtc.U.endsWith(s, "|1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) | 1;
                    }
                    // allow subtracting 1 too
                    if (pxtc.U.endsWith(s, "-1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) - 1;
                    }
                    // allow adding 1 too
                    if (pxtc.U.endsWith(s, "+1")) {
                        return this.parseOneInt(s.slice(0, s.length - 2)) + 1;
                    }
                    // handle hexadecimal and binary encodings
                    if (s[0] == "0") {
                        if (s[1] == "x" || s[1] == "X") {
                            var m_2 = /^0x([a-f0-9]+)$/i.exec(s);
                            if (m_2)
                                v = parseInt(m_2[1], 16);
                        }
                        else if (s[1] == "b" || s[1] == "B") {
                            var m_3 = /^0b([01]+)$/i.exec(s);
                            if (m_3)
                                v = parseInt(m_3[1], 2);
                        }
                    }
                    // decimal encoding
                    var m = /^(\d+)$/i.exec(s);
                    if (m)
                        v = parseInt(m[1], 10);
                    // stack-specific processing
                    // more special characters to handle
                    if (s.indexOf("@") >= 0) {
                        m = /^(\w+)@(-?\d+)$/.exec(s);
                        if (m) {
                            if (mul != 1)
                                this.directiveError(lf("multiplication not supported with saved stacks"));
                            if (this.stackpointers.hasOwnProperty(m[1])) {
                                // console.log(m[1] + ": " + this.stack + " " + this.stackpointers[m[1]] + " " + m[2])
                                v = this.ei.wordSize() * this.ei.computeStackOffset(m[1], this.stack - this.stackpointers[m[1]] + parseInt(m[2]));
                                // console.log(v)
                            }
                            else
                                this.directiveError(lf("saved stack not found"));
                        }
                        m = /^(.*)@(hi|lo|fn)$/.exec(s);
                        if (m && this.looksLikeLabel(m[1])) {
                            v = this.lookupLabel(m[1], true);
                            if (v != null) {
                                if (m[2] == "fn")
                                    v = this.ei.toFnPtr(v, this.baseOffset);
                                else {
                                    v >>= 1;
                                    if (0 <= v && v <= 0xffff) {
                                        if (m[2] == "hi")
                                            v = (v >> 8) & 0xff;
                                        else if (m[2] == "lo")
                                            v = v & 0xff;
                                        else
                                            pxtc.oops();
                                    }
                                    else {
                                        this.directiveError(lf("@hi/lo out of range"));
                                        v = null;
                                    }
                                }
                            }
                        }
                    }
                    if (v == null && this.looksLikeLabel(s)) {
                        v = this.lookupLabel(s, true);
                        if (v != null) {
                            if (this.ei.postProcessRelAddress(this, 1) == 1)
                                v += this.baseOffset;
                        }
                    }
                    if (v == null || isNaN(v))
                        return null;
                    return v * mul;
                };
                File.prototype.looksLikeLabel = function (name) {
                    if (/^(r\d|pc|sp|lr)$/i.test(name))
                        return false;
                    return /^[\.a-zA-Z_][\.:\w+]*$/.test(name);
                };
                File.prototype.scopedName = function (name) {
                    if (name[0] == "." && this.scope)
                        return this.scope + "$" + name;
                    else
                        return name;
                };
                File.prototype.lookupLabel = function (name, direct) {
                    if (direct === void 0) { direct = false; }
                    var v = null;
                    var scoped = this.scopedName(name);
                    if (this.labels.hasOwnProperty(scoped)) {
                        v = this.labels[scoped];
                        v = this.ei.postProcessRelAddress(this, v);
                    }
                    else if (this.lookupExternalLabel) {
                        v = this.lookupExternalLabel(name);
                        if (v != null) {
                            v = this.ei.postProcessAbsAddress(this, v);
                        }
                    }
                    if (v == null && direct) {
                        if (this.finalEmit)
                            this.directiveError(lf("unknown label: {0}", name));
                        else
                            // use a number over 1 byte
                            v = 33333;
                    }
                    return v;
                };
                File.prototype.align = function (n) {
                    pxtc.assert(n == 2 || n == 4 || n == 8 || n == 16);
                    while (this.location() % n != 0)
                        this.emitOpCode(0);
                };
                File.prototype.pushError = function (msg, hints) {
                    if (hints === void 0) { hints = ""; }
                    var err = {
                        scope: this.scope,
                        message: lf("  -> Line {2} ('{1}'), error: {0}\n{3}", msg, this.currLine.text, this.currLine.lineNo, hints),
                        lineNo: this.currLine.lineNo,
                        line: this.currLine.text,
                        coremsg: msg,
                        hints: hints
                    };
                    this.errors.push(err);
                    if (this.throwOnError)
                        throw new Error(err.message);
                };
                File.prototype.directiveError = function (msg) {
                    this.pushError(msg);
                    // this.pushError(lf("directive error: {0}", msg))
                };
                File.prototype.emitString = function (l) {
                    function byteAt(s, i) { return (s.charCodeAt(i) || 0) & 0xff; }
                    var m = /^\s*([\w\.]+\s*:\s*)?.\w+\s+(".*")\s*$/.exec(l);
                    var s;
                    if (!m || null == (s = parseString(m[2]))) {
                        this.directiveError(lf("expecting string"));
                    }
                    else {
                        this.align(2);
                        // s.length + 1 to NUL terminate
                        for (var i = 0; i < s.length + 1; i += 2) {
                            this.emitShort((byteAt(s, i + 1) << 8) | byteAt(s, i));
                        }
                    }
                };
                File.prototype.parseNumber = function (words) {
                    var v = this.parseOneInt(words.shift());
                    if (v == null)
                        return null;
                    return v;
                };
                File.prototype.parseNumbers = function (words) {
                    words = words.slice(1);
                    var nums = [];
                    while (true) {
                        var n = this.parseNumber(words);
                        if (n == null) {
                            this.directiveError(lf("cannot parse number at '{0}'", words[0]));
                            break;
                        }
                        else
                            nums.push(n);
                        if (words[0] == ",") {
                            words.shift();
                            if (words[0] == null)
                                break;
                        }
                        else if (words[0] == null) {
                            break;
                        }
                        else {
                            this.directiveError(lf("expecting number, got '{0}'", words[0]));
                            break;
                        }
                    }
                    return nums;
                };
                File.prototype.emitSpace = function (words) {
                    var nums = this.parseNumbers(words);
                    if (nums.length == 1)
                        nums.push(0);
                    if (nums.length != 2)
                        this.directiveError(lf("expecting one or two numbers"));
                    else if (nums[0] % 2 != 0)
                        this.directiveError(lf("only even space supported"));
                    else {
                        var f = nums[1] & 0xff;
                        f = f | (f << 8);
                        for (var i = 0; i < nums[0]; i += 2)
                            this.emitShort(f);
                    }
                };
                File.prototype.emitBytes = function (words) {
                    var nums = this.parseNumbers(words);
                    if (nums.length % 2 != 0) {
                        this.directiveError(".bytes needs an even number of arguments");
                        nums.push(0);
                    }
                    for (var i = 0; i < nums.length; i += 2) {
                        var n0 = nums[i];
                        var n1 = nums[i + 1];
                        if (0 <= n0 && n1 <= 0xff &&
                            0 <= n1 && n0 <= 0xff)
                            this.emitShort((n0 & 0xff) | ((n1 & 0xff) << 8));
                        else
                            this.directiveError(lf("expecting uint8"));
                    }
                };
                File.prototype.emitHex = function (words) {
                    var _this = this;
                    words.slice(1).forEach(function (w) {
                        if (w == ",")
                            return;
                        // TODO: why 4 and not 2?
                        if (w.length % 4 != 0)
                            _this.directiveError(".hex needs an even number of bytes");
                        else if (!/^[a-f0-9]+$/i.test(w))
                            _this.directiveError(".hex needs a hex number");
                        else
                            for (var i = 0; i < w.length; i += 4) {
                                var n = parseInt(w.slice(i, i + 4), 16);
                                n = ((n & 0xff) << 8) | ((n >> 8) & 0xff);
                                _this.emitShort(n);
                            }
                    });
                };
                File.prototype.handleDirective = function (l) {
                    var _this = this;
                    var words = l.words;
                    var expectOne = function () {
                        if (words.length != 2)
                            _this.directiveError(lf("expecting one argument"));
                    };
                    var num0;
                    switch (words[0]) {
                        case ".ascii":
                        case ".asciz":
                        case ".string":
                            this.emitString(l.text);
                            break;
                        case ".align":
                            expectOne();
                            num0 = this.parseOneInt(words[1]);
                            if (num0 != null) {
                                if (num0 == 0)
                                    return;
                                if (num0 <= 4) {
                                    this.align(1 << num0);
                                }
                                else {
                                    this.directiveError(lf("expecting 1, 2, 3 or 4 (for 2, 4, 8, or 16 byte alignment)"));
                                }
                            }
                            else
                                this.directiveError(lf("expecting number"));
                            break;
                        case ".balign":
                            expectOne();
                            num0 = this.parseOneInt(words[1]);
                            if (num0 != null) {
                                if (num0 == 1)
                                    return;
                                if (num0 == 2 || num0 == 4 || num0 == 8 || num0 == 16) {
                                    this.align(num0);
                                }
                                else {
                                    this.directiveError(lf("expecting 2, 4, 8, or 16"));
                                }
                            }
                            else
                                this.directiveError(lf("expecting number"));
                            break;
                        case ".byte":
                            this.emitBytes(words);
                            break;
                        case ".hex":
                            this.emitHex(words);
                            break;
                        case ".hword":
                        case ".short":
                        case ".2bytes":
                            this.parseNumbers(words).forEach(function (n) {
                                // we allow negative numbers
                                if (-0x8000 <= n && n <= 0xffff)
                                    _this.emitShort(n & 0xffff);
                                else
                                    _this.directiveError(lf("expecting int16"));
                            });
                            break;
                        case ".word":
                        case ".4bytes":
                            // TODO: a word is machine-dependent (16-bit for AVR, 32-bit for ARM)
                            this.parseNumbers(words).forEach(function (n) {
                                // we allow negative numbers
                                if (-0x80000000 <= n && n <= 0xffffffff) {
                                    _this.emitShort(n & 0xffff);
                                    _this.emitShort((n >> 16) & 0xffff);
                                }
                                else {
                                    _this.directiveError(lf("expecting int32"));
                                }
                            });
                            break;
                        case ".skip":
                        case ".space":
                            this.emitSpace(words);
                            break;
                        case ".startaddr":
                            if (this.location())
                                this.directiveError(lf(".startaddr can be only be specified at the beginning of the file"));
                            expectOne();
                            this.baseOffset = this.parseOneInt(words[1]);
                            break;
                        // The usage for this is as follows:
                        // push {...}
                        // @stackmark locals   ; locals := sp
                        // ... some push/pops ...
                        // ldr r0, [sp, locals@3] ; load local number 3
                        // ... some push/pops ...
                        // @stackempty locals ; expect an empty stack here
                        case "@stackmark":
                            expectOne();
                            this.stackpointers[words[1]] = this.stack;
                            break;
                        case "@stackempty":
                            if (this.stackpointers[words[1]] == null)
                                this.directiveError(lf("no such saved stack"));
                            else if (this.stackpointers[words[1]] != this.stack)
                                this.directiveError(lf("stack mismatch"));
                            break;
                        case "@scope":
                            this.scope = words[1] || "";
                            this.currLineNo = this.scope ? 0 : this.realCurrLineNo;
                            break;
                        case "@nostackcheck":
                            this.checkStack = false;
                            break;
                        case "@dummystack":
                            expectOne();
                            this.stack += this.parseOneInt(words[1]);
                            break;
                        case ".section":
                        case ".global":
                            this.stackpointers = {};
                            this.stack = 0;
                            this.scope = "$S" + this.scopeId++;
                            break;
                        case ".file":
                        case ".text":
                        case ".cpu":
                        case ".fpu":
                        case ".eabi_attribute":
                        case ".code":
                        case ".thumb_func":
                        case ".type":
                            break;
                        case "@":
                            // @ sp needed
                            break;
                        default:
                            if (/^\.cfi_/.test(words[0])) {
                                // ignore
                            }
                            else {
                                this.directiveError(lf("unknown directive"));
                            }
                            break;
                    }
                };
                File.prototype.handleOneInstruction = function (ln, instr) {
                    var op = instr.emit(ln);
                    if (!op.error) {
                        this.stack += op.stack;
                        if (this.checkStack && this.stack < 0)
                            this.pushError(lf("stack underflow"));
                        ln.location = this.location();
                        ln.opcode = op.opcode;
                        ln.stack = op.stack;
                        this.emitOpCode(op.opcode);
                        if (op.opcode2 != null)
                            this.emitOpCode(op.opcode2);
                        if (op.opcode3 != null)
                            this.emitOpCode(op.opcode3);
                        ln.instruction = instr;
                        ln.numArgs = op.numArgs;
                        return true;
                    }
                    return false;
                };
                File.prototype.handleInstruction = function (ln) {
                    var _this = this;
                    if (ln.instruction) {
                        if (this.handleOneInstruction(ln, ln.instruction))
                            return;
                    }
                    var getIns = function (n) { return _this.ei.instructions.hasOwnProperty(n) ? _this.ei.instructions[n] : []; };
                    if (!ln.instruction) {
                        var ins = getIns(ln.words[0]);
                        for (var i = 0; i < ins.length; ++i) {
                            if (this.handleOneInstruction(ln, ins[i]))
                                return;
                        }
                    }
                    var w0 = ln.words[0].toLowerCase().replace(/s$/, "").replace(/[^a-z]/g, "");
                    var hints = "";
                    var possibilities = getIns(w0).concat(getIns(w0 + "s"));
                    if (possibilities.length > 0) {
                        possibilities.forEach(function (i) {
                            var err = i.emit(ln);
                            hints += lf("   Maybe: {0} ({1} at '{2}')\n", i.toString(), err.error, err.errorAt);
                        });
                    }
                    this.pushError(lf("assembly error"), hints);
                };
                File.prototype.buildLine = function (tx, lst) {
                    var _this = this;
                    var mkLine = function (tx) {
                        var l = new Line(_this, tx);
                        l.scope = _this.scope;
                        l.lineNo = _this.currLineNo;
                        lst.push(l);
                        return l;
                    };
                    var l = mkLine(tx);
                    var words = tokenize(l.text) || [];
                    l.words = words;
                    var w0 = words[0] || "";
                    if (w0.charAt(w0.length - 1) == ":") {
                        var m = /^([\.\w]+):$/.exec(words[0]);
                        if (m) {
                            l.type = "label";
                            l.text = m[1] + ":";
                            l.words = [m[1]];
                            if (words.length > 1) {
                                words.shift();
                                l = mkLine(tx.replace(/^[^:]*:/, ""));
                                l.words = words;
                                w0 = words[0] || "";
                            }
                            else {
                                return;
                            }
                        }
                    }
                    var c0 = w0.charAt(0);
                    if (c0 == "." || c0 == "@") {
                        l.type = "directive";
                        if (l.words[0] == "@scope")
                            this.handleDirective(l);
                    }
                    else {
                        if (l.words.length == 0)
                            l.type = "empty";
                        else
                            l.type = "instruction";
                    }
                };
                File.prototype.prepLines = function (text) {
                    var _this = this;
                    this.currLineNo = 0;
                    this.realCurrLineNo = 0;
                    this.lines = [];
                    text.split(/\r?\n/).forEach(function (tx) {
                        if (_this.errors.length > 10)
                            return;
                        _this.currLineNo++;
                        _this.realCurrLineNo++;
                        _this.buildLine(tx, _this.lines);
                    });
                };
                File.prototype.iterLines = function () {
                    var _this = this;
                    this.stack = 0;
                    this.buf = [];
                    this.scopeId = 0;
                    this.lines.forEach(function (l) {
                        if (_this.errors.length > 10)
                            return;
                        _this.currLine = l;
                        if (l.words.length == 0)
                            return;
                        if (l.type == "label") {
                            var lblname = _this.scopedName(l.words[0]);
                            _this.prevLabel = lblname;
                            if (_this.finalEmit) {
                                var curr = _this.labels[lblname];
                                if (curr == null)
                                    pxtc.oops();
                                pxtc.assert(_this.errors.length > 0 || curr == _this.location());
                                if (_this.reallyFinalEmit) {
                                    _this.stackAtLabel[lblname] = _this.stack;
                                }
                            }
                            else {
                                if (_this.labels.hasOwnProperty(lblname))
                                    _this.directiveError(lf("label redefinition"));
                                else if (_this.inlineMode && /^_/.test(lblname))
                                    _this.directiveError(lf("labels starting with '_' are reserved for the compiler"));
                                else {
                                    _this.labels[lblname] = _this.location();
                                }
                            }
                            l.location = _this.location();
                        }
                        else if (l.type == "directive") {
                            _this.handleDirective(l);
                        }
                        else if (l.type == "instruction") {
                            _this.handleInstruction(l);
                        }
                        else if (l.type == "empty") {
                            // nothing
                        }
                        else {
                            pxtc.oops();
                        }
                    });
                };
                File.prototype.getSource = function (clean, numStmts, flashSize) {
                    var _this = this;
                    if (numStmts === void 0) { numStmts = 1; }
                    if (flashSize === void 0) { flashSize = 0; }
                    var lenTotal = this.buf ? this.location() : 0;
                    var lenThumb = this.labels["_program_end"] || lenTotal;
                    var lenFrag = this.labels["_frag_start"] || 0;
                    if (lenFrag)
                        lenFrag = this.labels["_js_end"] - lenFrag;
                    var lenLit = this.labels["_program_end"];
                    if (lenLit)
                        lenLit -= this.labels["_js_end"];
                    var totalSize = lenTotal + this.baseOffset;
                    if (flashSize && totalSize > flashSize)
                        pxtc.U.userError(lf("program too big by {0} bytes!", totalSize - flashSize));
                    flashSize = flashSize || 128 * 1024;
                    var totalInfo = lf("; total bytes: {0} ({1}% of {2}k flash with {3} free)", totalSize, (100 * totalSize / flashSize).toFixed(1), (flashSize / 1024).toFixed(1), flashSize - totalSize);
                    var res = 
                    // ARM-specific
                    lf("; code sizes (bytes): {0} (incl. {1} frags, and {2} lits); src size {3}\n", lenThumb, lenFrag, lenLit, lenTotal - lenThumb) +
                        lf("; assembly: {0} lines; density: {1} bytes/stmt\n", this.lines.length, Math.round(100 * (lenThumb - lenLit) / numStmts) / 100) +
                        totalInfo + "\n" +
                        this.stats + "\n\n";
                    var skipOne = false;
                    this.lines.forEach(function (ln, i) {
                        if (ln.words[0] == "_stored_program") {
                            res += "_stored_program: .string \"...\"\n";
                            skipOne = true;
                            return;
                        }
                        if (skipOne) {
                            skipOne = false;
                            return;
                        }
                        var text = ln.text;
                        if (clean) {
                            if (ln.words[0] == "@stackempty" &&
                                _this.lines[i - 1].text == ln.text)
                                return;
                            text = text.replace(/; WAS: .*/, "");
                            if (!text.trim())
                                return;
                        }
                        if (_this.location() == _this.buf.length)
                            if (ln.type == "label" || ln.type == "instruction")
                                text += " \t; 0x" + (ln.location + _this.baseOffset).toString(16);
                        res += text + "\n";
                    });
                    return res;
                };
                File.prototype.peepHole = function () {
                    // TODO add: str X; ldr X -> str X ?
                    var mylines = this.lines.filter(function (l) { return l.type != "empty"; });
                    for (var i = 0; i < mylines.length; ++i) {
                        var ln = mylines[i];
                        if (/^user/.test(ln.scope))
                            continue;
                        var lnNext = mylines[i + 1];
                        if (!lnNext)
                            continue;
                        var lnNext2 = mylines[i + 2];
                        if (ln.type == "instruction") {
                            this.ei.peephole(ln, lnNext, lnNext2);
                        }
                    }
                };
                File.prototype.peepPass = function (reallyFinal) {
                    if (this.disablePeepHole)
                        return;
                    this.peepOps = 0;
                    this.peepDel = 0;
                    this.peepCounts = {};
                    this.peepHole();
                    this.throwOnError = true;
                    this.finalEmit = false;
                    this.labels = {};
                    this.iterLines();
                    pxtc.assert(!this.checkStack || this.stack == 0);
                    this.finalEmit = true;
                    this.reallyFinalEmit = reallyFinal || this.peepOps == 0;
                    this.iterLines();
                    this.stats += lf("; peep hole pass: {0} instructions removed and {1} updated\n", this.peepDel, this.peepOps - this.peepDel);
                };
                File.prototype.getLabels = function () {
                    var _this = this;
                    if (!this.userLabelsCache)
                        this.userLabelsCache = pxtc.U.mapMap(this.labels, function (k, v) { return v + _this.baseOffset; });
                    return this.userLabelsCache;
                };
                File.prototype.emit = function (text) {
                    pxtc.assert(this.buf == null);
                    this.prepLines(text);
                    if (this.errors.length > 0)
                        return;
                    this.labels = {};
                    this.iterLines();
                    if (this.checkStack && this.stack != 0)
                        this.directiveError(lf("stack misaligned at the end of the file"));
                    if (this.errors.length > 0)
                        return;
                    this.ei.expandLdlit(this);
                    this.ei.commonalize(this);
                    this.labels = {};
                    this.iterLines();
                    this.finalEmit = true;
                    this.reallyFinalEmit = this.disablePeepHole;
                    this.iterLines();
                    if (this.errors.length > 0)
                        return;
                    var maxPasses = 5;
                    for (var i = 0; i < maxPasses; ++i) {
                        pxt.debug("Peephole OPT, pass " + i);
                        this.peepPass(i == maxPasses);
                        if (this.peepOps == 0)
                            break;
                    }
                };
                return File;
            }());
            assembler.File = File;
            var VMFile = /** @class */ (function (_super) {
                __extends(VMFile, _super);
                function VMFile(ei) {
                    return _super.call(this, ei) || this;
                }
                VMFile.prototype.location = function () {
                    // the this.buf stores bytes here
                    return this.buf.length;
                };
                VMFile.prototype.emitShort = function (op) {
                    pxtc.assert(0 <= op && op <= 0xffff);
                    this.buf.push(op & 0xff);
                    this.buf.push(op >> 8);
                };
                VMFile.prototype.emitOpCode = function (op) {
                    pxtc.assert(0 <= op && op <= 0xff);
                    this.buf.push(op);
                };
                return VMFile;
            }(File));
            assembler.VMFile = VMFile;
            // an assembler provider must inherit from this
            // class and provide Encoders and Instructions
            var AbstractProcessor = /** @class */ (function () {
                function AbstractProcessor() {
                    var _this = this;
                    this.file = null;
                    this.addEnc = function (n, p, e) {
                        var ee = {
                            name: n,
                            pretty: p,
                            encode: e,
                            isRegister: /^\$r\d/.test(n),
                            isImmediate: /^\$i\d/.test(n),
                            isRegList: /^\$rl\d/.test(n),
                            isLabel: /^\$l[a-z]/.test(n),
                        };
                        _this.encoders[n] = ee;
                        return ee;
                    };
                    this.inrange = function (max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < 0)
                            return null;
                        if (v > max)
                            return null;
                        return e;
                    };
                    this.inminmax = function (min, max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < min)
                            return null;
                        if (v > max)
                            return null;
                        return e;
                    };
                    this.inseq = function (seq, v) {
                        var ind = seq.indexOf(v);
                        if (ind < 0)
                            return null;
                        return ind;
                    };
                    this.inrangeSigned = function (max, v, e) {
                        if (Math.floor(v) != v)
                            return null;
                        if (v < -(max + 1))
                            return null;
                        if (v > max)
                            return null;
                        var mask = (max << 1) | 1;
                        return e & mask;
                    };
                    this.addInst = function (name, code, mask, is32Bit) {
                        var ins = new Instruction(_this, name, code, mask, is32Bit);
                        if (!_this.instructions.hasOwnProperty(ins.name))
                            _this.instructions[ins.name] = [];
                        _this.instructions[ins.name].push(ins);
                        return ins;
                    };
                    this.encoders = {};
                    this.instructions = {};
                }
                AbstractProcessor.prototype.toFnPtr = function (v, baseOff) {
                    return v;
                };
                AbstractProcessor.prototype.wordSize = function () {
                    return -1;
                };
                AbstractProcessor.prototype.computeStackOffset = function (kind, offset) {
                    return offset;
                };
                AbstractProcessor.prototype.is32bit = function (i) {
                    return false;
                };
                AbstractProcessor.prototype.emit32 = function (v1, v2, actual) {
                    return null;
                };
                AbstractProcessor.prototype.postProcessRelAddress = function (f, v) {
                    return v;
                };
                AbstractProcessor.prototype.postProcessAbsAddress = function (f, v) {
                    return v;
                };
                AbstractProcessor.prototype.peephole = function (ln, lnNext, lnNext2) {
                    return;
                };
                AbstractProcessor.prototype.registerNo = function (actual) {
                    return null;
                };
                AbstractProcessor.prototype.getAddressFromLabel = function (f, i, s, wordAligned) {
                    if (wordAligned === void 0) { wordAligned = false; }
                    return null;
                };
                AbstractProcessor.prototype.isPop = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isPush = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isAddSP = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.isSubSP = function (opcode) {
                    return false;
                };
                AbstractProcessor.prototype.testAssembler = function () {
                    pxtc.assert(false);
                };
                AbstractProcessor.prototype.commonalize = function (file) {
                };
                AbstractProcessor.prototype.expandLdlit = function (f) {
                };
                return AbstractProcessor;
            }());
            assembler.AbstractProcessor = AbstractProcessor;
            // utility functions
            function tokenize(line) {
                var words = [];
                var w = "";
                loop: for (var i = 0; i < line.length; ++i) {
                    switch (line[i]) {
                        case "[":
                        case "]":
                        case "!":
                        case "{":
                        case "}":
                        case ",":
                            if (w) {
                                words.push(w);
                                w = "";
                            }
                            words.push(line[i]);
                            break;
                        case " ":
                        case "\t":
                        case "\r":
                        case "\n":
                            if (w) {
                                words.push(w);
                                w = "";
                            }
                            break;
                        case ";":
                            // drop the trailing comment
                            break loop;
                        default:
                            w += line[i];
                            break;
                    }
                }
                if (w) {
                    words.push(w);
                    w = "";
                }
                if (!words[0])
                    return null;
                return words;
            }
            function parseString(s) {
                s = s.replace(/\\\\/g, "\\B") // don't get confused by double backslash
                    .replace(/\\(['\?])/g, function (f, q) { return q; }) // these are not valid in JSON yet valid in C
                    .replace(/\\[z0]/g, "\u0000") // \0 is valid in C 
                    .replace(/\\x([0-9a-f][0-9a-f])/gi, function (f, h) { return "\\u00" + h; })
                    .replace(/\\B/g, "\\\\"); // undo anti-confusion above
                try {
                    return JSON.parse(s);
                }
                catch (e) {
                    return null;
                }
            }
            function emitErr(msg, tok) {
                return {
                    stack: null,
                    opcode: null,
                    error: msg,
                    errorAt: tok
                };
            }
            assembler.emitErr = emitErr;
            function testOne(ei, op, code) {
                var b = new File(ei);
                b.checkStack = false;
                b.emit(op);
                pxtc.assert(b.buf[0] == code);
            }
            function expectError(ei, asm) {
                var b = new File(ei);
                b.emit(asm);
                if (b.errors.length == 0) {
                    pxtc.oops("ASMTEST: expecting error for: " + asm);
                }
                // console.log(b.errors[0].message)
            }
            assembler.expectError = expectError;
            function tohex(n) {
                if (n < 0 || n > 0xffff)
                    return ("0x" + n.toString(16)).toLowerCase();
                else
                    return ("0x" + ("000" + n.toString(16)).slice(-4)).toLowerCase();
            }
            assembler.tohex = tohex;
            function expect(ei, disasm) {
                var exp = [];
                var asm = disasm.replace(/^([0-9a-fA-F]{4,8})\s/gm, function (w, n) {
                    exp.push(parseInt(n.slice(0, 4), 16));
                    if (n.length == 8)
                        exp.push(parseInt(n.slice(4, 8), 16));
                    return "";
                });
                var b = new File(ei);
                b.throwOnError = true;
                b.disablePeepHole = true;
                b.emit(asm);
                if (b.errors.length > 0) {
                    console.debug(b.errors[0].message);
                    pxtc.oops("ASMTEST: not expecting errors");
                }
                if (b.buf.length != exp.length)
                    pxtc.oops("ASMTEST: wrong buf len");
                for (var i = 0; i < exp.length; ++i) {
                    if (b.buf[i] != exp[i])
                        pxtc.oops("ASMTEST: wrong buf content at " + i + " , exp:" + tohex(exp[i]) + ", got: " + tohex(b.buf[i]));
                }
            }
            assembler.expect = expect;
        })(assembler = pxtc.assembler || (pxtc.assembler = {}));
    })(pxtc = ts.pxtc || (ts.pxtc = {}));
})(ts || (ts = {}));
var pxt;
(function (pxt) {
    var Cloud;
    (function (Cloud) {
        var Util = pxtc.Util;
        Cloud.apiRoot = "https://makecode.com/api/";
        Cloud.accessToken = "";
        Cloud.localToken = "";
        var _isOnline = true;
        Cloud.onOffline = function () { };
        function offlineError(url) {
            var e = new Error(Util.lf("Cannot access {0} while offline", url));
            e.isOffline = true;
            return Promise.delay(1000).then(function () { return Promise.reject(e); });
        }
        function hasAccessToken() {
            return !!Cloud.accessToken;
        }
        Cloud.hasAccessToken = hasAccessToken;
        function isLocalHost() {
            try {
                return /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(window.location.href)
                    && !/nolocalhost=1/.test(window.location.href)
                    && !(pxt.webConfig && pxt.webConfig.isStatic);
            }
            catch (e) {
                return false;
            }
        }
        Cloud.isLocalHost = isLocalHost;
        function privateRequestAsync(options) {
            options.url = pxt.webConfig && pxt.webConfig.isStatic ? pxt.webConfig.relprefix + options.url : Cloud.apiRoot + options.url;
            options.allowGzipPost = true;
            if (!Cloud.isOnline()) {
                return offlineError(options.url);
            }
            if (Cloud.accessToken) {
                if (!options.headers)
                    options.headers = {};
                options.headers["x-td-access-token"] = Cloud.accessToken;
            }
            return Util.requestAsync(options)
                .catch(function (e) {
                if (e.statusCode == 0) {
                    if (_isOnline) {
                        _isOnline = false;
                        Cloud.onOffline();
                    }
                    return offlineError(options.url);
                }
                else {
                    return Promise.reject(e);
                }
            });
        }
        Cloud.privateRequestAsync = privateRequestAsync;
        function privateGetTextAsync(path) {
            return privateRequestAsync({ url: path }).then(function (resp) { return resp.text; });
        }
        Cloud.privateGetTextAsync = privateGetTextAsync;
        function privateGetAsync(path) {
            return privateRequestAsync({ url: path }).then(function (resp) { return resp.json; });
        }
        Cloud.privateGetAsync = privateGetAsync;
        function downloadTargetConfigAsync() {
            if (!Cloud.isOnline())
                return Promise.resolve(undefined);
            var url = pxt.webConfig && pxt.webConfig.isStatic ? "targetconfig.json" : "config/" + pxt.appTarget.id + "/targetconfig";
            if (Cloud.isLocalHost())
                return Util.requestAsync({
                    url: "/api/" + url,
                    headers: { "Authorization": Cloud.localToken },
                    method: "GET",
                    allowHttpErrors: true
                }).then(function (resp) { return resp.json; });
            else
                return Cloud.privateGetAsync(url);
        }
        Cloud.downloadTargetConfigAsync = downloadTargetConfigAsync;
        function downloadScriptFilesAsync(id) {
            return privateRequestAsync({ url: id + "/text" }).then(function (resp) {
                return JSON.parse(resp.text);
            });
        }
        Cloud.downloadScriptFilesAsync = downloadScriptFilesAsync;
        function downloadMarkdownAsync(docid, locale, live) {
            var packaged = pxt.webConfig && pxt.webConfig.isStatic;
            var url = packaged
                ? "docs/" + docid + ".md"
                : "md/" + pxt.appTarget.id + "/" + docid.replace(/^\//, "") + "?targetVersion=" + encodeURIComponent(pxt.webConfig.targetVersion);
            if (!packaged && locale != "en") {
                url += "&lang=" + encodeURIComponent(Util.userLanguage());
                if (live)
                    url += "&live=1";
            }
            if (Cloud.isLocalHost() && !live)
                return Util.requestAsync({
                    url: "/api/" + url,
                    headers: { "Authorization": Cloud.localToken },
                    method: "GET",
                    allowHttpErrors: true
                }).then(function (resp) {
                    if (resp.statusCode == 404)
                        return privateGetTextAsync(url);
                    else
                        return resp.text;
                });
            else
                return privateGetTextAsync(url);
        }
        Cloud.downloadMarkdownAsync = downloadMarkdownAsync;
        function privateDeleteAsync(path) {
            return privateRequestAsync({ url: path, method: "DELETE" }).then(function (resp) { return resp.json; });
        }
        Cloud.privateDeleteAsync = privateDeleteAsync;
        function privatePostAsync(path, data) {
            return privateRequestAsync({ url: path, data: data || {} }).then(function (resp) { return resp.json; });
        }
        Cloud.privatePostAsync = privatePostAsync;
        function isLoggedIn() { return !!Cloud.accessToken; }
        Cloud.isLoggedIn = isLoggedIn;
        function isNavigatorOnline() {
            return navigator && navigator.onLine;
        }
        Cloud.isNavigatorOnline = isNavigatorOnline;
        function isOnline() {
            if (typeof navigator !== "undefined" && isNavigatorOnline()) {
                _isOnline = true;
            }
            return _isOnline;
        }
        Cloud.isOnline = isOnline;
        function getServiceUrl() {
            return Cloud.apiRoot.replace(/\/api\/$/, "");
        }
        Cloud.getServiceUrl = getServiceUrl;
        function getUserId() {
            var m = /^0(\w+)\./.exec(Cloud.accessToken);
            if (m)
                return m[1];
            return null;
        }
        Cloud.getUserId = getUserId;
        function parseScriptId(uri) {
            var target = pxt.appTarget;
            if (!uri || !target.appTheme || !target.cloud || !target.cloud.sharing)
                return undefined;
            var domains = ["makecode.com"];
            if (target.appTheme.embedUrl)
                domains.push(target.appTheme.embedUrl);
            if (target.appTheme.shareUrl)
                domains.push(target.appTheme.shareUrl);
            if (target.appTheme.legacyDomain)
                domains.push(target.appTheme.legacyDomain);
            domains = Util.unique(domains, function (d) { return d; }).map(function (d) { return Util.escapeForRegex(Util.stripUrlProtocol(d).replace(/\/$/, '')).toLowerCase(); });
            var rx = "^((https://)?(?:" + domains.join('|') + ")/)?(api/oembed?url=.*%2F([^&]*)&.*?|([a-z0-9-_]+))$";
            var m = new RegExp(rx, 'i').exec(uri.trim());
            var scriptid = m && (!m[1] || domains.indexOf(Util.escapeForRegex(m[1].replace(/https:\/\//, '').replace(/\/$/, '')).toLowerCase()) >= 0) && (m[3] || m[4]) ? (m[3] ? m[3] : m[4]) : null;
            return scriptid;
        }
        Cloud.parseScriptId = parseScriptId;
    })(Cloud = pxt.Cloud || (pxt.Cloud = {}));
})(pxt || (pxt = {}));
