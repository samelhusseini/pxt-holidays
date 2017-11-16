(function() {
    if (window.ksRunnerInit) return;

    // This line gets patched up by the cloud
    var pxtConfig = {
    "relprefix": "/pxt-holidays/",
    "workerjs": "/pxt-holidays/worker.js",
    "tdworkerjs": "/pxt-holidays/tdworker.js",
    "monacoworkerjs": "/pxt-holidays/monacoworker.js",
    "pxtVersion": "2.3.24",
    "pxtRelId": "",
    "pxtCdnUrl": "/pxt-holidays/",
    "commitCdnUrl": "/pxt-holidays/",
    "blobCdnUrl": "/pxt-holidays/",
    "cdnUrl": "/pxt-holidays/",
    "targetVersion": "0.0.0",
    "targetRelId": "",
    "targetUrl": "",
    "targetId": "holidays",
    "simUrl": "/pxt-holidays/simulator.html",
    "partsUrl": "/pxt-holidays/siminstructions.html",
    "runUrl": "/pxt-holidays/run.html",
    "docsUrl": "/pxt-holidays/docs.html",
    "isStatic": true
};

    var scripts = [
        "/pxt-holidays/highlight.js/highlight.pack.js",
        "/pxt-holidays/bluebird.min.js",
        "/pxt-holidays/typescript.js",
        "/pxt-holidays/semantic.js",
        "/pxt-holidays/marked/marked.min.js",
        "/pxt-holidays/lzma/lzma_worker-min.js",
        "/pxt-holidays/blockly/blockly_compressed.js",
        "/pxt-holidays/blockly/blocks_compressed.js",
        "/pxt-holidays/blockly/msg/js/en.js",
        "/pxt-holidays/pxtlib.js",
        "/pxt-holidays/pxtcompiler.js",
        "/pxt-holidays/pxtblocks.js",
        "/pxt-holidays/pxteditor.js",
        "/pxt-holidays/pxtsim.js",
        "/pxt-holidays/target.js",
        "/pxt-holidays/pxtrunner.js"
    ]

    if (typeof jQuery == "undefined")
        scripts.unshift("/pxt-holidays/jquery.js")

    var pxtCallbacks = []

    window.ksRunnerReady = function(f) {
        if (pxtCallbacks == null) f()
        else pxtCallbacks.push(f)
    }

    window.ksRunnerWhenLoaded = function() {
        pxt.docs.requireHighlightJs = function() { return hljs; }
        pxt.setupWebConfig(pxtConfig || window.pxtWebConfig)
        pxt.runner.initCallbacks = pxtCallbacks
        pxtCallbacks.push(function() {
            pxtCallbacks = null
        })
        pxt.runner.init();
    }

    scripts.forEach(function(src) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    })

} ())
