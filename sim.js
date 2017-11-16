var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../libs/core/enums.d.ts"/>
var pxsim;
(function (pxsim) {
    var turtle;
    (function (turtle) {
        /**
         * Moves the sprite forward
         * @param steps number of steps to move, eg: 1
         */
        //% weight=90
        //% block
        function forwardAsync(steps) {
            return pxsim.board().sprite.forwardAsync(steps);
        }
        turtle.forwardAsync = forwardAsync;
        /**
         * Moves the sprite forward
         * @param direction the direction to turn, eg: Direction.Left
         * @param angle degrees to turn, eg:90
         */
        //% weight=85
        //% blockId=sampleTurn block="turn %direction|by %angle degrees"
        function turnAsync(direction, angle) {
            var b = pxsim.board();
            if (direction == 0 /* Left */)
                b.sprite.angle -= angle;
            else
                b.sprite.angle += angle;
            return Promise.delay(400);
        }
        turtle.turnAsync = turnAsync;
    })(turtle = pxsim.turtle || (pxsim.turtle = {}));
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var loops;
    (function (loops) {
        /**
         * Repeats the code forever in the background. On each iteration, allows other code to run.
         * @param body the code to repeat
         */
        //% help=functions/forever weight=55 blockGap=8
        //% blockId=device_forever block="forever" 
        function forever(body) {
            pxsim.thread.forever(body);
        }
        loops.forever = forever;
        /**
         * Pause for the specified time in milliseconds
         * @param ms how long to pause for, eg: 100, 200, 500, 1000, 2000
         */
        //% help=functions/pause weight=54
        //% block="pause (ms) %pause" blockId=device_pause
        function pauseAsync(ms) {
            return Promise.delay(ms);
        }
        loops.pauseAsync = pauseAsync;
    })(loops = pxsim.loops || (pxsim.loops = {}));
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
var pxsim;
(function (pxsim) {
    /**
     * A ghost on the screen.
     */
    //%
    var Sprite = (function () {
        function Sprite() {
            /**
             * The X-coordiante
             */
            //%
            this.x = 100;
            /**
            * The Y-coordiante
            */
            //%
            this.y = 100;
            this.angle = 90;
        }
        Sprite.prototype.foobar = function () { };
        /**
         * Move the thing forward
         */
        //%
        Sprite.prototype.forwardAsync = function (steps) {
            var deg = this.angle / 180 * Math.PI;
            this.x += Math.cos(deg) * steps * 10;
            this.y += Math.sin(deg) * steps * 10;
            pxsim.board().updateView();
            return Promise.delay(400);
        };
        return Sprite;
    }());
    pxsim.Sprite = Sprite;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    var sprites;
    (function (sprites) {
        /**
         * Creates a new sprite
         */
        //% block
        function createSprite() {
            return new pxsim.Sprite();
        }
        sprites.createSprite = createSprite;
    })(sprites = pxsim.sprites || (pxsim.sprites = {}));
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
    /**
     * Represents the entire state of the executing program.
     * Do not store state anywhere else!
     */
    var Board = (function (_super) {
        __extends(Board, _super);
        function Board() {
            _super.call(this);
            this.element = document.getElementById('svgcanvas');
            this.spriteElement = this.element.getElementById('svgsprite');
            this.sprite = new pxsim.Sprite();
        }
        Board.prototype.initAsync = function (msg) {
            document.body.innerHTML = ''; // clear children
            document.body.appendChild(this.element);
            return Promise.resolve();
        };
        Board.prototype.updateView = function () {
            this.spriteElement.cx.baseVal.value = this.sprite.x;
            this.spriteElement.cy.baseVal.value = this.sprite.y;
        };
        return Board;
    }(pxsim.BaseBoard));
    pxsim.Board = Board;
})(pxsim || (pxsim = {}));
