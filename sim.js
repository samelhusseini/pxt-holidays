var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../libs/core/enums.d.ts"/>
var pxsim;
(function (pxsim) {
    var main;
    (function (main) {
        /**
         * Write text on the card
         * @param text text to write on the card, eg: "Happy Holidays!"
         */
        //% weight=90
        //% blockId="say" block="say %text"
        function say(text) {
            pxsim.board().sendMessage('text', text);
        }
        main.say = say;
        /**
         * Set the card background
         */
        //% weight=89
        //% blockId="setBackground" block="set background %color=colorNumberPicker"
        function setBackground(color) {
            pxsim.board().sendMessage('background', color.toString(16));
        }
        main.setBackground = setBackground;
        //% weight=89
        //% blockId="setIcon" block="set icon %icon=main_iconPicker"
        function setIcon(icon) {
            pxsim.board().sendMessage('icon', icon.toString());
        }
        main.setIcon = setIcon;
        //% blockId="main_iconPicker" block="%input" shim=TD_ID
        //% blockHidden=true
        //% input.fieldEditor="imagedropdown" input.fieldOptions.columns=4
        function _iconPicker(input) {
            return input;
        }
        main._iconPicker = _iconPicker;
    })(main = pxsim.main || (pxsim.main = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var loops;
    (function (loops) {
        /**
         * Repeats the code forever in the background. On each iteration, allows other code to run.
         * @param body the code to repeat
         */
        //% help=functions/forever weight=99 blockGap=8
        //% blockId=device_forever block="repeat forever" blockAllowMultiple=true
        function forever(body) {
            pxsim.thread.forever(body);
        }
        loops.forever = forever;
        /**
         * Pause for the specified time in milliseconds
         * @param ms how long to pause for, eg: 1, 2, 5
         */
        //% help=functions/pause weight=98
        //% block="wait %pause|second(s)" blockId=device_pause
        //% s.defl="1"
        function pauseAsync(s) {
            return Promise.delay(s * 1000);
        }
        loops.pauseAsync = pauseAsync;
    })(loops = pxsim.loops || (pxsim.loops = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var lights;
    (function (lights) {
        /**
         * Set the lights background
         */
        //% weight=89
        //% blockId="setLightColor" block="set lights %color=colorNumberPicker"
        function setLightColor(color) {
            pxsim.board().sendMessage('light.color', color.toString());
        }
        lights.setLightColor = setLightColor;
        /**
         * Set the animation on the lights
         */
        //% blockId="setLightAnimation" block="show %animation=light_animation_picker"
        //% weight=89
        function setLightAnimation(animation) {
            pxsim.board().sendMessage('light.animation', animation.toString());
            pxsim.loops.pauseAsync(0.1);
        }
        lights.setLightAnimation = setLightAnimation;
        //% blockId="light_animation_picker" block="%animation" shim=TD_ID
        //% blockHidden=true
        function _animationPicker(animation) {
            return animation;
        }
        lights._animationPicker = _animationPicker;
    })(lights = pxsim.lights || (pxsim.lights = {}));
})(pxsim || (pxsim = {}));
function logMsg(m) { console.log(m); }
var pxsim;
(function (pxsim) {
    var console;
    (function (console) {
        /**
         * Print out message
         */
        //% 
        function log(msg) {
            logMsg("CONSOLE: " + msg);
            // why doesn't that work?
            pxsim.board().writeSerial(msg + "\n");
        }
        console.log = log;
    })(console = pxsim.console || (pxsim.console = {}));
})(pxsim || (pxsim = {}));
/// <reference path="../node_modules/pxt-core/typings/globals/bluebird/index.d.ts"/>
/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>
var pxsim;
(function (pxsim) {
    /**
     * This function gets called each time the program restarts
     */
    pxsim.initCurrentRuntime = function () {
        pxsim.runtime.board = new Board();
    };
    /**
     * Gets the current 'board', eg. program state.
     */
    function board() {
        return pxsim.runtime.board;
    }
    pxsim.board = board;
    var postContainerMessage = function (message) {
        pxsim.Runtime.postMessage({
            type: "custom",
            __proxy: "parent",
            content: message
        });
    };
    /**
     * Represents the entire state of the executing program.
     * Do not store state anywhere else!
     */
    var Board = (function (_super) {
        __extends(Board, _super);
        function Board() {
            _super.call(this);
        }
        Board.prototype.initAsync = function (msg) {
            document.body.innerHTML = ''; // clear children
            return Promise.resolve();
        };
        Board.prototype.updateView = function () {
            pxsim.console.log("Update view");
        };
        Board.prototype.sendMessage = function (key, data) {
            postContainerMessage({
                type: "simulator.message",
                key: key,
                data: data
            });
        };
        return Board;
    }(pxsim.BaseBoard));
    pxsim.Board = Board;
})(pxsim || (pxsim = {}));
