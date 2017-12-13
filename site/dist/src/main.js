"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var ReactDOM = require("react-dom");
var semantic_ui_react_1 = require("semantic-ui-react");
var MainApp = /** @class */ (function (_super) {
    __extends(MainApp, _super);
    function MainApp(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {};
        _this.projects = [
            {
                "text": {
                    "main.blocks": "<xml xmlns=\"http://www.w3.org/1999/xhtml\">\n  <block type=\"pxt-on-start\" id=\",{,HjW]u:lVGcDRS_Cu|\" x=\"-247\" y=\"113\"></block>\n</xml>",
                    "main.ts": "\n",
                    "README.md": " ",
                    "pxt.json": "{\n    \"name\": \"Untitled\",\n    \"dependencies\": {\n        \"core\": \"*\"\n    },\n    \"description\": \"\",\n    \"files\": [\n        \"main.blocks\",\n        \"main.ts\",\n        \"README.md\"\n    ]\n}"
                }
            }
        ];
        return _this;
    }
    MainApp.prototype.componentDidMount = function () {
        window.addEventListener("message", this.receiveMessage.bind(this), false);
    };
    MainApp.prototype.receiveMessage = function (ev) {
        var editor = this.editorFrame.contentWindow;
        var msg = ev.data;
        console.log('received...');
        console.log(msg);
        var logs = document.getElementById("logs");
        // if (msg.action === "simevent") {
        //     logs.innerText += "< " + msg.type + " " + msg.action + " (" + msg.subtype + ")\n";
        // }
        // else {
        //     logs.innerText += "< " + msg.type +(msg.action ? " " + msg.action : "" ) + "\n";
        // }
        if (msg.resp)
            console.log(JSON.stringify(msg.resp, null, 2));
        if (msg.type == "pxthost") {
            if (msg.action == "workspacesync") {
                // no project
                msg.projects = this.projects;
                editor.postMessage(msg, "*");
                return;
            }
            else if (msg.action == "workspacesave") {
                console.log(JSON.stringify(msg.project, null, 2));
                //lastSaved = msg.project;
            }
        }
        if (msg.type == "pxteditor") {
            //var req = pendingMsgs[msg.id];
            // if (req.action == "renderblocks") {
            //     var img = document.createElement("img");
            //     img.src = msg.resp;
            //     logs.appendChild(img)
            // }
        }
    };
    MainApp.prototype.render = function () {
        var _this = this;
        return React.createElement("div", { className: "pusher" },
            "Hello world",
            React.createElement(semantic_ui_react_1.Button, { active: true }),
            React.createElement("iframe", { ref: function (e) { return _this.editorFrame = e; }, id: "iframe", src: "index.html?editorlayout=ide" }));
    };
    return MainApp;
}(React.Component));
exports.MainApp = MainApp;
ReactDOM.render(React.createElement(MainApp, null), document.getElementById("root"));
