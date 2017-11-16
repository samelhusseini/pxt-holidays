/// <reference path="../typings/globals/bluebird/index.d.ts"/>
/// <reference path="./winrtrefs.d.ts"/>
/// <reference path="../built/pxtlib.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        function driveDeployCoreAsync(res) {
            var drives = pxt.appTarget.compile.deployDrives;
            pxt.Util.assert(!!drives);
            pxt.debug("deploying to drives " + drives);
            var drx = new RegExp(drives);
            var firmware = pxt.outputName();
            var r = res.outfiles[firmware];
            function writeAsync(folder) {
                pxt.debug("writing " + firmware + " to " + folder.displayName);
                return pxt.winrt.promisify(folder.createFileAsync(firmware, Windows.Storage.CreationCollisionOption.replaceExisting)
                    .then(function (file) { return Windows.Storage.FileIO.writeTextAsync(file, r); })).then(function (r) { }).catch(function (e) {
                    pxt.debug("failed to write " + firmware + " to " + folder.displayName + " - " + e);
                });
            }
            return pxt.winrt.promisify(Windows.Storage.KnownFolders.removableDevices.getFoldersAsync())
                .then(function (ds) {
                var df = ds.filter(function (d) { return drx.test(d.displayName); });
                var pdf = df.map(writeAsync);
                var all = Promise.join.apply(Promise, pdf);
                return all;
            }).then(function (r) { });
        }
        winrt.driveDeployCoreAsync = driveDeployCoreAsync;
        function browserDownloadAsync(text, name, contentType) {
            var file;
            return pxt.winrt.promisify(Windows.Storage.ApplicationData.current.temporaryFolder.createFileAsync(name, Windows.Storage.CreationCollisionOption.replaceExisting)
                .then(function (f) { return Windows.Storage.FileIO.writeTextAsync(file = f, text); })
                .then(function () { return Windows.System.Launcher.launchFileAsync(file); })
                .then(function (b) { }));
        }
        winrt.browserDownloadAsync = browserDownloadAsync;
        function saveOnlyAsync(res) {
            var useUf2 = pxt.appTarget.compile.useUF2;
            var fileTypes = useUf2 ? [".uf2"] : [".hex"];
            var savePicker = new Windows.Storage.Pickers.FileSavePicker();
            savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
            savePicker.fileTypeChoices.insert("MakeCode binary file", fileTypes);
            savePicker.suggestedFileName = res.downloadFileBaseName;
            return pxt.winrt.promisify(savePicker.pickSaveFileAsync()
                .then(function (file) {
                if (file) {
                    var fileContent = useUf2 ? res.outfiles[pxtc.BINARY_UF2] : res.outfiles[pxtc.BINARY_HEX];
                    var ar_1 = [];
                    var bytes = pxt.Util.stringToUint8Array(atob(fileContent));
                    bytes.forEach(function (b) { return ar_1.push(b); });
                    return Windows.Storage.FileIO.writeBytesAsync(file, ar_1)
                        .then(function () { return true; });
                }
                // Save cancelled
                return Promise.resolve(false);
            }));
        }
        winrt.saveOnlyAsync = saveOnlyAsync;
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="../typings/globals/bluebird/index.d.ts"/>
/// <reference path="./winrtrefs.d.ts"/>
/// <reference path="../built/pxtlib.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var WindowsRuntimeIO = (function () {
            function WindowsRuntimeIO() {
                this.onData = function (v) { };
                this.onEvent = function (v) { };
                this.onError = function (e) { };
            }
            WindowsRuntimeIO.prototype.error = function (msg) {
                throw new Error(pxt.U.lf("USB/HID error ({0})", msg));
            };
            WindowsRuntimeIO.prototype.reconnectAsync = function () {
                var _this = this;
                return this.disconnectAsync()
                    .then(function () { return _this.initAsync(); });
            };
            WindowsRuntimeIO.prototype.disconnectAsync = function () {
                if (this.dev) {
                    this.dev.close();
                    delete this.dev;
                }
                return Promise.resolve();
            };
            WindowsRuntimeIO.prototype.sendPacketAsync = function (pkt) {
                if (!this.dev)
                    return Promise.resolve();
                var ar = [0];
                for (var i = 0; i < Math.max(pkt.length, 64); ++i)
                    ar.push(pkt[i] || 0);
                var dataWriter = new Windows.Storage.Streams.DataWriter();
                dataWriter.writeBytes(ar);
                var buffer = dataWriter.detachBuffer();
                var report = this.dev.createOutputReport(0);
                report.data = buffer;
                return pxt.winrt.promisify(this.dev.sendOutputReportAsync(report)
                    .then(function (value) {
                    pxt.debug("hf2: " + value + " bytes written");
                }));
            };
            WindowsRuntimeIO.prototype.initAsync = function () {
                var _this = this;
                pxt.Util.assert(!this.dev, "HID interface not properly reseted");
                var wd = Windows.Devices;
                var whid = wd.HumanInterfaceDevice.HidDevice;
                if (!WindowsRuntimeIO.uf2Selectors) {
                    this.initUf2Selectors();
                }
                var getDevicesPromise = WindowsRuntimeIO.uf2Selectors.reduce(function (soFar, currentSelector) {
                    // Try all selectors, in order, until some devices are found
                    return soFar.then(function (devices) {
                        if (devices && devices.length) {
                            return Promise.resolve(devices);
                        }
                        return wd.Enumeration.DeviceInformation.findAllAsync(currentSelector, null);
                    });
                }, Promise.resolve(null));
                return getDevicesPromise
                    .then(function (devices) {
                    if (!devices || !devices[0]) {
                        pxt.debug("no hid device found");
                        return Promise.reject(new Error("no hid device found"));
                    }
                    pxt.debug("hid enumerate " + devices.length + " devices");
                    var device = devices[0];
                    pxt.debug("hid connect to " + device.name + " (" + device.id + ")");
                    return whid.fromIdAsync(device.id, Windows.Storage.FileAccessMode.readWrite);
                })
                    .then(function (r) {
                    _this.dev = r;
                    if (!_this.dev) {
                        pxt.debug("can't connect to hid device");
                        return Promise.reject(new Error("can't connect to hid device"));
                    }
                    pxt.debug("hid device version " + _this.dev.version);
                    _this.dev.addEventListener("inputreportreceived", function (e) {
                        pxt.debug("input report");
                        var dr = Windows.Storage.Streams.DataReader.fromBuffer(e.report.data);
                        var values = [];
                        while (dr.unconsumedBufferLength) {
                            values.push(dr.readByte());
                        }
                        if (values.length == 65 && values[0] === 0) {
                            values.shift();
                        }
                        _this.onData(new Uint8Array(values));
                    });
                    return Promise.resolve();
                })
                    .catch(function (e) {
                    var err = new Error(pxt.U.lf("Device not found"));
                    err.notifyUser = true;
                    return Promise.reject(err);
                });
            };
            WindowsRuntimeIO.prototype.initUf2Selectors = function () {
                var whid = Windows.Devices.HumanInterfaceDevice.HidDevice;
                WindowsRuntimeIO.uf2Selectors = [];
                if (pxt.appTarget && pxt.appTarget.compile && pxt.appTarget.compile.hidSelectors) {
                    pxt.appTarget.compile.hidSelectors.forEach(function (s) {
                        var sel = whid.getDeviceSelector(parseInt(s.usagePage), parseInt(s.usageId), parseInt(s.vid), parseInt(s.pid));
                        WindowsRuntimeIO.uf2Selectors.push(sel);
                    });
                }
            };
            return WindowsRuntimeIO;
        }());
        function mkPacketIOAsync() {
            var b = new WindowsRuntimeIO();
            return b.initAsync()
                .then(function () { return b; });
        }
        winrt.mkPacketIOAsync = mkPacketIOAsync;
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="./winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var watcher;
        var ports = {};
        var options;
        function initSerial() {
            if (!pxt.appTarget.serial
                || !pxt.appTarget.serial.log
                || !pxt.appTarget.serial.nameFilter)
                return;
            var filter = new RegExp(pxt.appTarget.serial.nameFilter);
            var serialDeviceSelector = Windows.Devices.SerialCommunication.SerialDevice.getDeviceSelector();
            // Create a device watcher to look for instances of the Serial device
            // The createWatcher() takes a string only when you provide it two arguments, so be sure to include an array as a second
            // parameter (JavaScript can only recognize overloaded functions with different numbers of parameters).
            watcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(serialDeviceSelector, []);
            watcher.addEventListener("added", function (dis) {
                winrt.toArray(dis.detail).forEach(function (di) {
                    if (!filter.test(di.name))
                        return;
                    pxt.debug("serial port added " + di.name + " - " + di.id);
                    ports[di.id] = {
                        info: di
                    };
                    Windows.Devices.SerialCommunication.SerialDevice.fromIdAsync(di.id)
                        .done(function (dev) {
                        ports[di.id].device = dev;
                        startDevice(di.id);
                    });
                });
            });
            watcher.addEventListener("removed", function (dis) {
                winrt.toArray(dis.detail).forEach(function (di) { return delete ports[di.id]; });
            });
            watcher.addEventListener("updated", function (dis) {
                winrt.toArray(dis.detail).forEach(function (di) { return ports[di.id] ? ports[di.id].info.update(di.info) : null; });
            });
            watcher.start();
        }
        winrt.initSerial = initSerial;
        function startDevice(id) {
            var port = ports[id];
            if (!port)
                return;
            if (!port.device) {
                var status_1 = Windows.Devices.Enumeration.DeviceAccessInformation.createFromId(id).currentStatus;
                pxt.debug("device issue: " + status_1);
                return;
            }
            port.device.baudRate = 115200;
            var stream = port.device.inputStream;
            var reader = new Windows.Storage.Streams.DataReader(stream);
            var serialBuffers = {};
            var readMore = function () { return reader.loadAsync(32).done(function (bytesRead) {
                var msg = reader.readString(Math.floor(bytesRead / 4) * 4);
                pxt.Util.bufferSerial(serialBuffers, msg, id);
                readMore();
            }, function (e) {
                setTimeout(function () { return startDevice(id); }, 1000);
            }); };
            readMore();
        }
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        function promisify(p) {
            return new Promise(function (resolve, reject) {
                p.done(function (v) { return resolve(v); }, function (e) { return reject(e); });
            });
        }
        winrt.promisify = promisify;
        function toArray(v) {
            var r = [];
            var length = v.length;
            for (var i = 0; i < length; ++i)
                r.push(v[i]);
            return r;
        }
        winrt.toArray = toArray;
        /**
         * Detects if the script is running in a browser on windows
         */
        function isWindows() {
            return !!navigator && /Win32/i.test(navigator.platform);
        }
        winrt.isWindows = isWindows;
        function isWinRT() {
            return typeof Windows !== "undefined";
        }
        winrt.isWinRT = isWinRT;
        function initAsync(importHexImpl) {
            if (!isWinRT())
                return Promise.resolve();
            var uiCore = Windows.UI.Core;
            var navMgr = uiCore.SystemNavigationManager.getForCurrentView();
            navMgr.onbackrequested = function (e) {
                // Ignore the built-in back button; it tries to back-navigate the sidedoc panel, but it crashes the
                // app if the sidedoc has been closed since the navigation happened
                console.log("BACK NAVIGATION");
                navMgr.appViewBackButtonVisibility = uiCore.AppViewBackButtonVisibility.collapsed;
                e.handled = true;
            };
            winrt.initSerial();
            return hasActivationProjectAsync()
                .then(function () {
                if (importHexImpl) {
                    importHex = importHexImpl;
                    var app = Windows.UI.WebUI.WebUIApplication;
                    app.removeEventListener("activated", initialActivationHandler);
                    app.addEventListener("activated", fileActivationHandler);
                }
            });
        }
        winrt.initAsync = initAsync;
        // Needed for when user double clicks a hex file without the app already running
        function captureInitialActivation() {
            if (!isWinRT()) {
                return;
            }
            initialActivationDeferred = Promise.defer();
            Windows.UI.WebUI.WebUIApplication.addEventListener("activated", initialActivationHandler);
        }
        winrt.captureInitialActivation = captureInitialActivation;
        function loadActivationProject() {
            return initialActivationDeferred.promise
                .then(function (args) { return fileActivationHandler(args, /* createNewIfFailed */ true); });
        }
        winrt.loadActivationProject = loadActivationProject;
        function hasActivationProjectAsync() {
            if (!isWinRT()) {
                return Promise.resolve(false);
            }
            // By the time the webapp calls this, if the activation promise hasn't been settled yet, assume we missed the
            // activation event and pretend there were no activation args
            initialActivationDeferred.resolve(null); // This is no-op if the promise had been previously resolved
            return initialActivationDeferred.promise
                .then(function (args) {
                return Promise.resolve(args && args.kind === Windows.ApplicationModel.Activation.ActivationKind.file);
            });
        }
        winrt.hasActivationProjectAsync = hasActivationProjectAsync;
        function initialActivationHandler(args) {
            Windows.UI.WebUI.WebUIApplication.removeEventListener("activated", initialActivationHandler);
            initialActivationDeferred.resolve(args);
        }
        var initialActivationDeferred;
        var importHex;
        function fileActivationHandler(args, createNewIfFailed) {
            if (createNewIfFailed === void 0) { createNewIfFailed = false; }
            if (args.kind === Windows.ApplicationModel.Activation.ActivationKind.file) {
                var info = args;
                var file = info.files.getAt(0);
                if (file && file.isOfType(Windows.Storage.StorageItemTypes.file)) {
                    var f = file;
                    Windows.Storage.FileIO.readBufferAsync(f)
                        .then(function (buffer) {
                        var ar = [];
                        var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                        while (dataReader.unconsumedBufferLength) {
                            ar.push(dataReader.readByte());
                        }
                        dataReader.close();
                        return pxt.cpp.unpackSourceFromHexAsync(new Uint8Array(ar));
                    })
                        .then(function (hex) { return importHex(hex, createNewIfFailed); });
                }
            }
        }
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="../built/pxtlib.d.ts"/>
/// <reference path="../built/pxteditor.d.ts"/>
/// <reference path="./winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var workspace;
        (function (workspace) {
            var U = pxt.Util;
            var lf = U.lf;
            var folder;
            var allScripts = [];
            var currentTarget;
            function lookup(id) {
                return allScripts.filter(function (x) { return x.id == id; })[0];
            }
            function getHeaders() {
                return allScripts.map(function (e) { return e.header; });
            }
            function getHeader(id) {
                var e = lookup(id);
                if (e && !e.header.isDeleted)
                    return e.header;
                return null;
            }
            function mergeFsPkg(pkg) {
                var e = lookup(pkg.path);
                if (!e) {
                    e = {
                        id: pkg.path,
                        header: null,
                        text: null,
                        fsText: null
                    };
                    allScripts.push(e);
                }
                var time = pkg.files.map(function (f) { return f.mtime; });
                time.sort(function (a, b) { return b - a; });
                var modTime = Math.round(time[0] / 1000) || U.nowSeconds();
                var hd = {
                    target: currentTarget,
                    name: pkg.config.name,
                    meta: {},
                    editor: pxt.JAVASCRIPT_PROJECT_NAME,
                    pubId: pkg.config.installedVersion,
                    pubCurrent: false,
                    _rev: null,
                    id: pkg.path,
                    recentUse: modTime,
                    modificationTime: modTime,
                    blobId: null,
                    blobCurrent: false,
                    isDeleted: false,
                    icon: pkg.icon
                };
                if (!e.header) {
                    e.header = hd;
                }
                else {
                    var eh = e.header;
                    eh.name = hd.name;
                    eh.pubId = hd.pubId;
                    eh.modificationTime = hd.modificationTime;
                    eh.isDeleted = hd.isDeleted;
                    eh.icon = hd.icon;
                }
            }
            function initAsync(target) {
                allScripts = [];
                currentTarget = target;
                var applicationData = Windows.Storage.ApplicationData.current;
                var localFolder = applicationData.localFolder;
                pxt.debug("winrt: initializing workspace");
                return winrt.promisify(localFolder.createFolderAsync(currentTarget, Windows.Storage.CreationCollisionOption.openIfExists))
                    .then(function (fd) {
                    folder = fd;
                    pxt.debug("winrt: initialized workspace at " + folder.path);
                    return syncAsync();
                }).then(function () { });
            }
            function fetchTextAsync(e) {
                pxt.debug("winrt: fetch " + e.id);
                return readPkgAsync(e.id, true)
                    .then(function (resp) {
                    if (!e.text) {
                        // otherwise we were beaten to it
                        e.text = {};
                        e.mtime = 0;
                        for (var _i = 0, _a = resp.files; _i < _a.length; _i++) {
                            var f = _a[_i];
                            e.text[f.name] = f.content;
                            e.mtime = Math.max(e.mtime, f.mtime);
                        }
                        e.fsText = U.flatClone(e.text);
                    }
                    return e.text;
                });
            }
            var headerQ = new U.PromiseQueue();
            function getTextAsync(id) {
                pxt.debug("winrt: get text " + id);
                var e = lookup(id);
                if (!e)
                    return Promise.resolve(null);
                if (e.text)
                    return Promise.resolve(e.text);
                return headerQ.enqueue(id, function () { return fetchTextAsync(e); });
            }
            function saveCoreAsync(h, text) {
                if (h.temporary)
                    return Promise.resolve();
                var e = lookup(h.id);
                U.assert(e.header === h);
                if (!text)
                    return Promise.resolve();
                h.saveId = null;
                e.textNeedsSave = true;
                e.text = text;
                return headerQ.enqueue(h.id, function () {
                    U.assert(!!e.fsText);
                    var pkg = {
                        files: [],
                        config: null,
                        path: h.id,
                    };
                    for (var _i = 0, _a = Object.keys(e.text); _i < _a.length; _i++) {
                        var fn = _a[_i];
                        if (e.text[fn] !== e.fsText[fn])
                            pkg.files.push({
                                name: fn,
                                mtime: null,
                                content: e.text[fn],
                                prevContent: e.fsText[fn]
                            });
                    }
                    var savedText = U.flatClone(e.text);
                    if (pkg.files.length == 0)
                        return Promise.resolve();
                    return writePkgAsync(h.id, pkg)
                        .then(function (pkg) {
                        e.fsText = savedText;
                        mergeFsPkg(pkg);
                        if (text) {
                            h.saveId = null;
                        }
                    });
                });
            }
            function saveAsync(h, text) {
                return saveCoreAsync(h, text);
            }
            function installAsync(h0, text) {
                var h = h0;
                var path = h.name.replace(/[^a-zA-Z0-9]+/g, " ").trim().replace(/ /g, "-");
                if (lookup(path)) {
                    var n = 2;
                    while (lookup(path + "-" + n))
                        n++;
                    path += "-" + n;
                    h.name += " " + n;
                }
                h.id = path;
                h.recentUse = U.nowSeconds();
                h.modificationTime = h.recentUse;
                h.target = currentTarget;
                var e = {
                    id: h.id,
                    header: h,
                    text: text,
                    fsText: {}
                };
                allScripts.push(e);
                return saveCoreAsync(h, text)
                    .then(function () { return h; });
            }
            function saveToCloudAsync(h) {
                return Promise.resolve();
            }
            function pathjoin() {
                var parts = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    parts[_i - 0] = arguments[_i];
                }
                return parts.join('\\');
            }
            function readFileAsync(path) {
                var fp = pathjoin(folder.path, path);
                pxt.debug("winrt: reading " + fp);
                return winrt.promisify(Windows.Storage.StorageFile.getFileFromPathAsync(fp)
                    .then(function (file) { return Windows.Storage.FileIO.readTextAsync(file); }));
            }
            function writeFileAsync(dir, name, content) {
                var fd = pathjoin(folder.path, dir);
                pxt.debug("winrt: writing " + pathjoin(fd, name));
                return winrt.promisify(Windows.Storage.StorageFolder.getFolderFromPathAsync(fd))
                    .then(function (dk) { return dk.createFileAsync(name, Windows.Storage.CreationCollisionOption.replaceExisting); })
                    .then(function (f) { return Windows.Storage.FileIO.writeTextAsync(f, content); })
                    .then(function () { });
            }
            function statOptAsync(path) {
                var fn = pathjoin(folder.path, path);
                pxt.debug("winrt: " + fn);
                return winrt.promisify(Windows.Storage.StorageFile.getFileFromPathAsync(fn)
                    .then(function (file) { return file.getBasicPropertiesAsync()
                    .then(function (props) {
                    return {
                        name: path,
                        mtime: props.dateModified.getTime()
                    };
                }); }));
            }
            function throwError(code, msg) {
                if (msg === void 0) { msg = null; }
                var err = new Error(msg || "Error " + code);
                err.statusCode = code;
                throw err;
            }
            function writePkgAsync(logicalDirname, data) {
                pxt.debug("winrt: writing package at " + logicalDirname);
                return winrt.promisify(folder.createFolderAsync(logicalDirname, Windows.Storage.CreationCollisionOption.openIfExists))
                    .then(function () { return Promise.map(data.files, function (f) { return readFileAsync(pathjoin(logicalDirname, f.name))
                    .then(function (text) {
                    if (f.name == pxt.CONFIG_NAME) {
                        try {
                            var cfg = JSON.parse(f.content);
                            if (!cfg.name) {
                                pxt.log("Trying to save invalid JSON config");
                                throwError(410);
                            }
                        }
                        catch (e) {
                            pxt.log("Trying to save invalid format JSON config");
                            throwError(410);
                        }
                    }
                    if (text !== f.prevContent) {
                        pxt.log("merge error for " + f.name + ": previous content changed...");
                        throwError(409);
                    }
                }, function (err) { }); }); })
                    .then(function () { return Promise.map(data.files, function (f) { return writeFileAsync(logicalDirname, f.name, f.content); }); })
                    .then(function () { return readPkgAsync(logicalDirname, false); });
            }
            function readPkgAsync(logicalDirname, fileContents) {
                pxt.debug("winrt: reading package under " + logicalDirname);
                return readFileAsync(pathjoin(logicalDirname, pxt.CONFIG_NAME))
                    .then(function (text) {
                    var cfg = JSON.parse(text);
                    var files = [pxt.CONFIG_NAME].concat(cfg.files || []).concat(cfg.testFiles || []);
                    return Promise.map(files, function (fn) {
                        return statOptAsync(pathjoin(logicalDirname, fn))
                            .then(function (st) {
                            var rf = {
                                name: fn,
                                mtime: st ? st.mtime : null
                            };
                            if (st == null || !fileContents)
                                return rf;
                            else
                                return readFileAsync(pathjoin(logicalDirname, fn))
                                    .then(function (text) {
                                    rf.content = text;
                                    return rf;
                                });
                        });
                    })
                        .then(function (files) {
                        var rs = {
                            path: logicalDirname,
                            config: cfg,
                            files: files
                        };
                        return rs;
                    });
                });
            }
            function syncAsync() {
                return winrt.promisify(folder.getFoldersAsync())
                    .then(function (fds) { return Promise.all(fds.map(function (fd) { return readPkgAsync(fd.name, false); })); })
                    .then(function (hs) {
                    hs.forEach(mergeFsPkg);
                    return undefined;
                });
            }
            function resetAsync() {
                return winrt.promisify(folder.deleteAsync(Windows.Storage.StorageDeleteOption.default)
                    .then(function () {
                    folder = undefined;
                    allScripts = [];
                    pxt.storage.clearLocal();
                }));
            }
            workspace.provider = {
                getHeaders: getHeaders,
                getHeader: getHeader,
                getTextAsync: getTextAsync,
                initAsync: initAsync,
                saveAsync: saveAsync,
                installAsync: installAsync,
                saveToCloudAsync: saveToCloudAsync,
                syncAsync: syncAsync,
                resetAsync: resetAsync
            };
        })(workspace = winrt.workspace || (winrt.workspace = {}));
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
