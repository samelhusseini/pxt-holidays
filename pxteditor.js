var pxt;
(function (pxt) {
    var editor;
    (function (editor) {
        (function (FilterState) {
            FilterState[FilterState["Hidden"] = 0] = "Hidden";
            FilterState[FilterState["Visible"] = 1] = "Visible";
            FilterState[FilterState["Disabled"] = 2] = "Disabled";
        })(editor.FilterState || (editor.FilterState = {}));
        var FilterState = editor.FilterState;
    })(editor = pxt.editor || (pxt.editor = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var editor;
    (function (editor_1) {
        var pendingRequests = {};
        /**
         * Binds incoming window messages to the project view.
         * Requires the "allowParentController" flag in the pxtarget.json/appTheme object.
         *
         * When the project view receives a request (EditorMessageRequest),
         * it starts the command and returns the result upon completion.
         * The response (EditorMessageResponse) contains the request id and result.
         * Some commands may be async, use the ``id`` field to correlate to the original request.
         */
        function bindEditorMessages(projectView) {
            var allowEditorMessages = pxt.appTarget.appTheme.allowParentController && pxt.BrowserUtils.isIFrame();
            var allowExtensionMessages = pxt.appTarget.appTheme.allowPackageExtensions;
            var allowSimTelemetry = pxt.appTarget.appTheme.allowSimulatorTelemetry;
            if (!allowEditorMessages && !allowExtensionMessages && !allowSimTelemetry)
                return;
            window.addEventListener("message", function (msg) {
                var data = msg.data;
                if (!data || !/^pxt(host|editor|pkgext|sim)$/.test(data.type))
                    return false;
                if (data.type === "pxtpkgext" && allowExtensionMessages) {
                    // Messages sent to the editor iframe from a child iframe containing an extension
                    projectView.handleExtensionRequest(data);
                }
                else if (data.type === "pxtsim" && allowSimTelemetry) {
                    var event_1 = data;
                    if (event_1.action === "event") {
                        if (event_1.category || event_1.message) {
                            pxt.reportError(event_1.category, event_1.message, event_1.data);
                        }
                        else {
                            pxt.tickEvent(event_1.tick, event_1.data);
                        }
                    }
                }
                else if (allowEditorMessages) {
                    // Messages sent to the editor from the parent frame
                    var p = Promise.resolve();
                    var resp_1 = undefined;
                    if (data.type == "pxthost") {
                        var req_1 = pendingRequests[data.id];
                        if (!req_1) {
                            pxt.debug("pxthost: unknown request " + data.id);
                        }
                        else {
                            p = p.then(function () { return req_1.resolve(data); });
                        }
                    }
                    else if (data.type == "pxteditor") {
                        var req = data;
                        pxt.debug("pxteditor: " + req.action);
                        switch (req.action.toLowerCase()) {
                            case "switchjavascript":
                                p = p.then(function () { return projectView.openJavaScript(); });
                                break;
                            case "switchblocks":
                                p = p.then(function () { return projectView.openBlocks(); });
                                break;
                            case "startsimulator":
                                p = p.then(function () { return projectView.startSimulator(); });
                                break;
                            case "restartsimulator":
                                p = p.then(function () { return projectView.restartSimulator(); });
                                break;
                            case "hidesimulator":
                                p = p.then(function () { return projectView.collapseSimulator(); });
                                break;
                            case "showsimulator":
                                p = p.then(function () { return projectView.expandSimulator(); });
                                break;
                            case "closeflyout":
                                p = p.then(function () { return projectView.closeFlyout(); });
                                break;
                            case "redo":
                                p = p.then(function () {
                                    var editor = projectView.editor;
                                    if (editor && editor.hasRedo())
                                        editor.redo();
                                });
                                break;
                            case "undo":
                                p = p.then(function () {
                                    var editor = projectView.editor;
                                    if (editor && editor.hasUndo())
                                        editor.undo();
                                });
                                break;
                            case "stopsimulator": {
                                var stop_1 = data;
                                p = p.then(function () { return projectView.stopSimulator(stop_1.unload); });
                                break;
                            }
                            case "newproject": {
                                var create_1 = data;
                                p = p.then(function () { return projectView.newProject(create_1.options); });
                                break;
                            }
                            case "importproject": {
                                var load_1 = data;
                                p = p.then(function () { return projectView.importProjectAsync(load_1.project, {
                                    filters: load_1.filters,
                                    searchBar: load_1.searchBar
                                }); });
                                break;
                            }
                            case "proxytosim": {
                                var simmsg_1 = data;
                                p = p.then(function () { return projectView.proxySimulatorMessage(simmsg_1.content); });
                                break;
                            }
                            case "renderblocks": {
                                var rendermsg_1 = data;
                                p = p.then(function () { return projectView.renderBlocksAsync(rendermsg_1); })
                                    .then(function (img) { resp_1 = img; });
                                break;
                            }
                            case "toggletrace": {
                                var togglemsg_1 = data;
                                p = p.then(function () { return projectView.toggleTrace(togglemsg_1.intervalSpeed); });
                                break;
                            }
                        }
                    }
                    p.done(function () { return sendResponse(data, resp_1, true, undefined); }, function (err) { return sendResponse(data, resp_1, false, err); });
                }
                return true;
            }, false);
        }
        editor_1.bindEditorMessages = bindEditorMessages;
        /**
         * Sends analytics messages upstream to container if any
         */
        function enableControllerAnalytics() {
            if (!pxt.appTarget.appTheme.allowParentController || !pxt.BrowserUtils.isIFrame())
                return;
            var te = pxt.tickEvent;
            pxt.tickEvent = function (id, data) {
                if (te)
                    te(id, data);
                postHostMessageAsync({
                    type: 'pxthost',
                    action: 'event',
                    tick: id,
                    response: false,
                    data: data
                });
            };
            var rexp = pxt.reportException;
            pxt.reportException = function (err, data) {
                if (rexp)
                    rexp(err, data);
                try {
                    postHostMessageAsync({
                        type: 'pxthost',
                        action: 'event',
                        tick: 'error',
                        message: err.message,
                        response: false,
                        data: data
                    });
                }
                catch (e) {
                }
            };
            var re = pxt.reportError;
            pxt.reportError = function (cat, msg, data) {
                if (re)
                    re(cat, msg, data);
                postHostMessageAsync({
                    type: 'pxthost',
                    action: 'event',
                    tick: 'error',
                    category: cat,
                    message: msg,
                    data: data
                });
            };
        }
        editor_1.enableControllerAnalytics = enableControllerAnalytics;
        function sendResponse(request, resp, success, error) {
            if (request.response) {
                window.parent.postMessage({
                    type: request.type,
                    id: request.id,
                    resp: resp,
                    success: success,
                    error: error
                }, "*");
            }
        }
        /**
         * Posts a message from the editor to the host
         */
        function postHostMessageAsync(msg) {
            return new Promise(function (resolve, reject) {
                var env = pxt.Util.clone(msg);
                env.id = pxt.Util.guidGen();
                if (msg.response)
                    pendingRequests[env.id] = { resolve: resolve, reject: reject };
                window.parent.postMessage(env, "*");
                if (!msg.response)
                    resolve(undefined);
            });
        }
        editor_1.postHostMessageAsync = postHostMessageAsync;
    })(editor = pxt.editor || (pxt.editor = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var editor;
    (function (editor) {
        (function (PermissionResponses) {
            PermissionResponses[PermissionResponses["Granted"] = 0] = "Granted";
            PermissionResponses[PermissionResponses["Denied"] = 1] = "Denied";
            PermissionResponses[PermissionResponses["NotAvailable"] = 2] = "NotAvailable";
        })(editor.PermissionResponses || (editor.PermissionResponses = {}));
        var PermissionResponses = editor.PermissionResponses;
    })(editor = pxt.editor || (pxt.editor = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var storage;
    (function (storage) {
        var MemoryStorage = (function () {
            function MemoryStorage() {
                this.items = {};
            }
            MemoryStorage.prototype.removeItem = function (key) {
                delete this.items[key];
            };
            MemoryStorage.prototype.getItem = function (key) {
                return this.items[key];
            };
            MemoryStorage.prototype.setItem = function (key, value) {
                this.items[key] = value;
            };
            MemoryStorage.prototype.clear = function () {
                this.items = {};
            };
            return MemoryStorage;
        }());
        var LocalStorage = (function () {
            function LocalStorage(storageId) {
                this.storageId = storageId;
            }
            LocalStorage.prototype.targetKey = function (key) {
                return this.storageId + '/' + key;
            };
            LocalStorage.prototype.removeItem = function (key) {
                window.localStorage.removeItem(this.targetKey(key));
            };
            LocalStorage.prototype.getItem = function (key) {
                return window.localStorage[this.targetKey(key)];
            };
            LocalStorage.prototype.setItem = function (key, value) {
                window.localStorage[this.targetKey(key)] = value;
            };
            LocalStorage.prototype.clear = function () {
                var prefix = this.targetKey('');
                var keys = [];
                for (var i = 0; i < window.localStorage.length; ++i) {
                    var key = window.localStorage.key(i);
                    if (key.indexOf(prefix) == 0)
                        keys.push(key);
                }
                keys.forEach(function (key) { return window.localStorage.removeItem(key); });
            };
            return LocalStorage;
        }());
        function storageId() {
            var id = pxt.appTarget ? pxt.appTarget.id : window.pxtConfig ? window.pxtConfig.targetId : '';
            return id;
        }
        storage.storageId = storageId;
        var impl;
        function init() {
            if (impl)
                return;
            // test if local storage is supported
            var sid = storageId();
            var supported = false;
            // no local storage in sandbox mode
            if (!pxt.shell.isSandboxMode()) {
                try {
                    window.localStorage[sid] = '1';
                    var v = window.localStorage[sid];
                    supported = true;
                }
                catch (e) { }
            }
            if (!supported) {
                impl = new MemoryStorage();
                pxt.debug('storage: in memory');
            }
            else {
                impl = new LocalStorage(sid);
                pxt.debug("storage: local under " + sid);
            }
        }
        function setLocal(key, value) {
            init();
            impl.setItem(key, value);
        }
        storage.setLocal = setLocal;
        function getLocal(key) {
            init();
            return impl.getItem(key);
        }
        storage.getLocal = getLocal;
        function removeLocal(key) {
            init();
            impl.removeItem(key);
        }
        storage.removeLocal = removeLocal;
        function clearLocal() {
            init();
            impl.clear();
        }
        storage.clearLocal = clearLocal;
    })(storage = pxt.storage || (pxt.storage = {}));
})(pxt || (pxt = {}));
/// <reference path="../typings/globals/bluebird/index.d.ts"/>
/// <reference path="../localtypings/monaco.d.ts" />
/// <reference path="../built/pxtlib.d.ts"/>
var pxt;
(function (pxt) {
    var vs;
    (function (vs) {
        function syncModels(mainPkg, libs, currFile, readOnly) {
            if (readOnly)
                return;
            var extraLibs = monaco.languages.typescript.typescriptDefaults.getExtraLibs();
            var modelMap = {};
            mainPkg.sortedDeps().forEach(function (pkg) {
                pkg.getFiles().forEach(function (f) {
                    var fp = pkg.id + "/" + f;
                    var proto = "pkg:" + fp;
                    if (/\.(ts)$/.test(f) && fp != currFile) {
                        if (!monaco.languages.typescript.typescriptDefaults.getExtraLibs()[fp]) {
                            var content = pkg.readFile(f) || " ";
                            libs[fp] = monaco.languages.typescript.typescriptDefaults.addExtraLib(content, fp);
                        }
                        modelMap[fp] = "1";
                    }
                });
            });
            // dispose of any extra libraries, the typescript worker will be killed as a result of this
            Object.keys(extraLibs)
                .filter(function (lib) { return /\.(ts)$/.test(lib) && !modelMap[lib]; })
                .forEach(function (lib) {
                libs[lib].dispose();
            });
        }
        vs.syncModels = syncModels;
        function initMonacoAsync(element) {
            return new Promise(function (resolve, reject) {
                if (typeof (window.monaco) === 'object') {
                    // monaco is already loaded
                    resolve(createEditor(element));
                    return;
                }
                var monacoPaths = window.MonacoPaths;
                var onGotAmdLoader = function () {
                    var req = window.require;
                    req.config({ paths: monacoPaths });
                    // Load monaco
                    req(['vs/editor/editor.main'], function () {
                        setupMonaco();
                        resolve(createEditor(element));
                    });
                };
                // Load AMD loader if necessary
                if (!window.require) {
                    var loaderScript = document.createElement('script');
                    loaderScript.type = 'text/javascript';
                    loaderScript.src = monacoPaths['vs/loader'];
                    loaderScript.addEventListener('load', onGotAmdLoader);
                    document.body.appendChild(loaderScript);
                }
                else {
                    onGotAmdLoader();
                }
            });
        }
        vs.initMonacoAsync = initMonacoAsync;
        function setupMonaco() {
            if (!monaco.languages.typescript)
                return;
            initAsmMonarchLanguage();
            // validation settings
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSyntaxValidation: true,
                noSemanticValidation: true
            });
            // compiler options
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                allowUnreachableCode: true,
                noImplicitAny: true,
                allowJs: false,
                allowUnusedLabels: true,
                target: monaco.languages.typescript.ScriptTarget.ES5,
                outDir: "built",
                rootDir: ".",
                noLib: true,
                mouseWheelZoom: true
            });
            // maximum idle time
            monaco.languages.typescript.typescriptDefaults.setMaximunWorkerIdleTime(20 * 60 * 1000);
        }
        function createEditor(element) {
            var inverted = pxt.appTarget.appTheme.invertedMonaco;
            var editor = monaco.editor.create(element, {
                model: null,
                ariaLabel: pxt.Util.lf("JavaScript editor"),
                fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'monospace'",
                scrollBeyondLastLine: false,
                language: "typescript",
                mouseWheelZoom: true,
                wordBasedSuggestions: true,
                lineNumbersMinChars: 3,
                formatOnPaste: true,
                minimap: {
                    enabled: false
                },
                autoIndent: true,
                dragAndDrop: true,
                matchBrackets: true,
                occurrencesHighlight: false,
                mouseWheelScrollSensitivity: 0.5,
                quickSuggestionsDelay: 200,
                theme: inverted ? 'vs-dark' : 'vs',
                //accessibilitySupport: 'on',
                accessibilityHelpUrl: "" //TODO: Add help url explaining how to use the editor with a screen reader
            });
            editor.layout();
            return editor;
        }
        vs.createEditor = createEditor;
        function initAsmMonarchLanguage() {
            monaco.languages.register({ id: 'asm', extensions: ['.asm'] });
            monaco.languages.setMonarchTokensProvider('asm', {
                // Set defaultToken to invalid to see what you do not tokenize yet
                // defaultToken: 'invalid',
                tokenPostfix: '',
                //Extracted from http://infocenter.arm.com/help/topic/com.arm.doc.qrc0006e/QRC0006_UAL16.pdf
                //Should be a superset of the instructions emitted
                keywords: [
                    'movs', 'mov', 'adds', 'add', 'adcs', 'adr', 'subs', 'sbcs', 'sub', 'rsbs',
                    'muls', 'cmp', 'cmn', 'ands', 'eors', 'orrs', 'bics', 'mvns', 'tst', 'lsls',
                    'lsrs', 'asrs', 'rors', 'ldr', 'ldrh', 'ldrb', 'ldrsh', 'ldrsb', 'ldm',
                    'str', 'strh', 'strb', 'stm', 'push', 'pop', 'cbz', 'cbnz', 'b', 'bl', 'bx', 'blx',
                    'sxth', 'sxtb', 'uxth', 'uxtb', 'rev', 'rev16', 'revsh', 'svc', 'cpsid', 'cpsie',
                    'setend', 'bkpt', 'nop', 'sev', 'wfe', 'wfi', 'yield',
                    'beq', 'bne', 'bcs', 'bhs', 'bcc', 'blo', 'bmi', 'bpl', 'bvs', 'bvc', 'bhi', 'bls',
                    'bge', 'blt', 'bgt', 'ble', 'bal',
                    //Registers
                    'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15',
                    'pc', 'sp', 'lr'
                ],
                typeKeywords: [
                    '.startaddr', '.hex', '.short', '.space', '.section', '.string', '.byte'
                ],
                operators: [],
                // Not all of these are valid in ARM Assembly
                symbols: /[:\*]+/,
                // C# style strings
                escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
                // The main tokenizer for our languages
                tokenizer: {
                    root: [
                        // identifiers and keywords
                        [/(\.)?[a-z_$\.][\w$]*/, {
                                cases: {
                                    '@typeKeywords': 'keyword',
                                    '@keywords': 'keyword',
                                    '@default': 'identifier'
                                }
                            }],
                        // whitespace
                        { include: '@whitespace' },
                        // delimiters and operators
                        [/[{}()\[\]]/, '@brackets'],
                        [/[<>](?!@symbols)/, '@brackets'],
                        [/@symbols/, {
                                cases: {
                                    '@operators': 'operator',
                                    '@default': ''
                                }
                            }],
                        // @ annotations.
                        [/@\s*[a-zA-Z_\$][\w\$]*/, { token: 'annotation' }],
                        // numbers
                        //[/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                        [/(#|(0[xX]))?[0-9a-fA-F]+/, 'number'],
                        // delimiter: after number because of .\d floats
                        [/[;,.]/, 'delimiter'],
                        // strings
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                        // characters
                        [/'[^\\']'/, 'string'],
                        [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
                        [/'/, 'string.invalid']
                    ],
                    comment: [],
                    string: [
                        [/[^\\"]+/, 'string'],
                        [/@escapes/, 'string.escape'],
                        [/\\./, 'string.escape.invalid'],
                        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
                    ],
                    whitespace: [
                        [/[ \t\r\n]+/, 'white'],
                        [/\/\*/, 'comment', '@comment'],
                        [/;.*$/, 'comment'],
                    ],
                }
            });
        }
    })(vs = pxt.vs || (pxt.vs = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var shell;
    (function (shell) {
        (function (EditorLayoutType) {
            EditorLayoutType[EditorLayoutType["IDE"] = 0] = "IDE";
            EditorLayoutType[EditorLayoutType["Sandbox"] = 1] = "Sandbox";
            EditorLayoutType[EditorLayoutType["Widget"] = 2] = "Widget";
        })(shell.EditorLayoutType || (shell.EditorLayoutType = {}));
        var EditorLayoutType = shell.EditorLayoutType;
        var layoutType;
        function init() {
            if (layoutType !== undefined)
                return;
            var sandbox = /sandbox=1|#sandbox|#sandboxproject/i.test(window.location.href)
                || pxt.BrowserUtils.isIFrame();
            var nosandbox = /nosandbox=1/i.test(window.location.href);
            var layout = /editorlayout=(widget|sandbox|ide)/i.exec(window.location.href);
            layoutType = EditorLayoutType.IDE;
            if (nosandbox)
                layoutType = EditorLayoutType.Widget;
            else if (sandbox)
                layoutType = EditorLayoutType.Sandbox;
            if (layout) {
                switch (layout[1].toLowerCase()) {
                    case "widget":
                        layoutType = EditorLayoutType.Widget;
                        break;
                    case "sandbox":
                        layoutType = EditorLayoutType.Sandbox;
                        break;
                    case "ide":
                        layoutType = EditorLayoutType.IDE;
                        break;
                }
            }
            pxt.debug("shell: layout type " + EditorLayoutType[layoutType] + ", readonly " + isReadOnly());
        }
        function layoutTypeClass() {
            init();
            return pxt.shell.EditorLayoutType[layoutType].toLowerCase();
        }
        shell.layoutTypeClass = layoutTypeClass;
        function isSandboxMode() {
            init();
            return layoutType == EditorLayoutType.Sandbox;
        }
        shell.isSandboxMode = isSandboxMode;
        function isReadOnly() {
            return isSandboxMode()
                && !/[?&]edit=1/i.test(window.location.href);
        }
        shell.isReadOnly = isReadOnly;
    })(shell = pxt.shell || (pxt.shell = {}));
})(pxt || (pxt = {}));
/// <reference path="../typings/globals/bluebird/index.d.ts"/>
/// <reference path="../built/pxtlib.d.ts"/>
