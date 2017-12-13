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
/// <reference path="../libs/core/enums.d.ts"/>
var pxsim;
(function (pxsim) {
    var card;
    (function (card) {
        /**
         * Write text on the card
         * @param text text to write on the card, eg: "Happy Holidays!"
         */
        //% weight=90
        //% blockId="say" block="say %text"
        function say(text) {
            pxsim.board().setText(text);
        }
        card.say = say;
        /**
         * Set the card background
         */
        //% weight=89
        //% blockId="setBackground" block="set background %color=colorNumberPicker"
        function setBackground(color) {
            pxsim.board().getGame().stage.backgroundColor = "0x" + color.toString(16);
        }
        card.setBackground = setBackground;
        //% weight=89
        //% blockId="setIcon" block="set icon %icon=main_iconPicker"
        function setIcon(icon) {
            pxsim.board().showIcon(icon.toString());
        }
        card.setIcon = setIcon;
        //% blockId="main_iconPicker" block="%input" shim=TD_ID
        //% blockHidden=true
        //% input.fieldEditor="imagedropdown" input.fieldOptions.columns=6
        function _iconPicker(input) {
            return input;
        }
        card._iconPicker = _iconPicker;
        /**
         * Set the animation on the lights
         */
        //% blockId="randomColor" block="random color"
        //% weight=89
        function randomColor() {
            var red = Math.floor(Math.random() * 255);
            var green = Math.floor(Math.random() * 255);
            var blue = Math.floor(Math.random() * 255);
            return ((red & 0xFF) << 16) | ((green & 0xFF) << 8) | (blue & 0xFF);
        }
        card.randomColor = randomColor;
    })(card = pxsim.card || (pxsim.card = {}));
})(pxsim || (pxsim = {}));
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
(function (pxsim) {
    var lights;
    (function (lights) {
        /**
         * Set the lights
         */
        //% weight=89
        //% blockId="setLightColor" block="set lights %color=colorNumberPicker"
        function setLightColor(color) {
            pxsim.board().drawLights([color.toString()]);
        }
        lights.setLightColor = setLightColor;
        /**
         * Clear the lights
         */
        //% weight=89
        //% blockId="clearLights" block="clear lights"
        function clearLights() {
            pxsim.board().clearLights();
        }
        lights.clearLights = clearLights;
        /**
         * Set the animation on the lights
         */
        //% blockId="setLightAnimation" block="show %animation=light_animation_picker"
        //% weight=89 blockHidden=1
        function setLightAnimation(animation) {
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
    var Board = /** @class */ (function (_super) {
        __extends(Board, _super);
        function Board() {
            var _this = _super.call(this) || this;
            _this.lightGraphics = [];
            // Initialize phaser
            _this.initPhaser();
            return _this;
        }
        Board.prototype.initAsync = function (msg) {
            postContainerMessage({
                type: "simulator.message",
                key: "init"
            });
            var that = this;
            return new Promise(function (resolve, reject) {
                (function waitForFoo() {
                    if (that.isGameInitialized())
                        return resolve();
                    setTimeout(waitForFoo, 50);
                })();
            });
        };
        Board.prototype.initPhaser = function () {
            var fullHeight = window.innerHeight;
            var fullWidth = window.innerWidth;
            this.game = new Phaser.Game(fullWidth, fullHeight, Phaser.AUTO, 'inner-card', { preload: this.preload, create: this.create.bind(this), update: this.update });
        };
        Board.prototype.getGame = function () {
            return this.game;
        };
        Board.prototype.preload = function () {
            var isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(window.location.href);
            var staticPath = isLocalhost ? '../static' : './docs/static';
            this.game.load.image('balloons', staticPath + "/sprites/balloons.png");
            this.game.load.image('barbecue', staticPath + "/sprites/barbecue-1.png");
            this.game.load.image('bauble', staticPath + "/sprites/bauble.png");
            this.game.load.image('baubles', staticPath + "/sprites/baubles.png");
            this.game.load.image('bell', staticPath + "/sprites/bell.png");
            this.game.load.image('candies', staticPath + "/sprites/candies.png");
            this.game.load.image('candycane', staticPath + "/sprites/candy-cane.png");
            this.game.load.image('christmas-sock', staticPath + "/sprites/christmas-sock.png");
            this.game.load.image('christmas-tree', staticPath + "/sprites/christmas-tree.png");
            this.game.load.image('church', staticPath + "/sprites/church.png");
            this.game.load.image('firecracker', staticPath + "/sprites/firecracker-1.png");
            this.game.load.image('fireworks-1', staticPath + "/sprites/fireworks-1.png");
            this.game.load.image('fireworks-2', staticPath + "/sprites/fireworks-2.png");
            this.game.load.image('fireworks', staticPath + "/sprites/fireworks.png");
            this.game.load.image('gift', staticPath + "/sprites/gift.png");
            this.game.load.image('mistletoe', staticPath + "/sprites/mistletoe.png");
            this.game.load.image('mittens', staticPath + "/sprites/mittens.png");
            this.game.load.image('rainbow', staticPath + "/sprites/rainbow.png");
            this.game.load.image('reindeer', staticPath + "/sprites/reindeer.png");
            this.game.load.image('ribbon', staticPath + "/sprites/ribbon.png");
            this.game.load.image('santa', staticPath + "/sprites/santa-claus.png");
            this.game.load.image('sledge', staticPath + "/sprites/sledge.png");
            this.game.load.image('snowflake-1', staticPath + "/sprites/snowflake-1.png");
            this.game.load.image('snowflake-2', staticPath + "/sprites/snowflake-2.png");
            this.game.load.image('snowflake', staticPath + "/sprites/snowflake.png");
            this.game.load.image('snowman', staticPath + "/sprites/snowman.png");
            this.game.load.image('kwanzaa1', staticPath + "/sprites/kwanzaa1.png");
            this.game.load.image('kwanzaa2', staticPath + "/sprites/kwanzaa2.png");
            this.game.load.image('kwanzaa3', staticPath + "/sprites/kwanzaa3.png");
            this.game.load.image('kwanzaa4', staticPath + "/sprites/kwanzaa4.png");
            this.game.load.image('kwanzaa5', staticPath + "/sprites/kwanzaa5.png");
            this.game.load.image('stlucia', staticPath + "/sprites/stlucia.png");
            this.game.load.image('hebrew1', staticPath + "/sprites/hebrew1.png");
            this.game.load.image('hebrew2', staticPath + "/sprites/hebrew2.png");
            this.game.load.image('hebrew3', staticPath + "/sprites/hebrew3.png");
            this.game.load.image('yarmulke', staticPath + "/sprites/yarmulke.png");
        };
        Board.prototype.lookupIcon = function (icon) {
            switch (icon) {
                case "1":
                    return "santa";
                case "2":
                    return "snowman";
                case "3":
                    return "snowflake";
                case "4":
                    return "snowflake-1";
                case "5":
                    return "snowflake-2";
                case "6":
                    return "ribbon";
                case "7":
                    return "sledge";
                case "8":
                    return "reindeer";
                case "9":
                    return "mittens";
                case "10":
                    return "mistletoe";
                case "11":
                    return "gift";
                case "12":
                    return "fireworks";
                case "13":
                    return "fireworks-1";
                case "14":
                    return "fireworks-2";
                case "15":
                    return "firecracker";
                case "16":
                    return "church";
                case "17":
                    return "christmas-tree";
                case "18":
                    return "christmas-sock";
                case "19":
                    return "candycane";
                case "20":
                    return "candies";
                case "21":
                    return "bell";
                case "22":
                    return "bauble";
                case "23":
                    return "baubles";
                case "24":
                    return "barbecue";
                case "25":
                    return "balloons";
                case "26":
                    return "stlucia";
                case "27":
                    return "kwanzaa1";
                case "28":
                    return "kwanzaa2";
                case "29":
                    return "kwanzaa3";
                case "30":
                    return "kwanzaa4";
                case "31":
                    return "kwanzaa5";
                case "32":
                    return "hebrew1";
                case "33":
                    return "hebrew2";
                case "34":
                    return "hebrew3";
                case "35":
                    return "yarmulke";
            }
            return "";
        };
        Board.prototype.create = function () {
            this.game.stage.backgroundColor = "0xFFFFFF";
            this.gameLoaded = true;
        };
        Board.prototype.setText = function (text) {
            var style = { font: 'bold 30pt Arial', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 100 };
            if (this.textElement) {
                this.textElement.destroy();
                this.textElement = null;
            }
            this.textElement = this.game.add.text(120, this.game.world.centerY, text, style);
            this.textElement.anchor.set(0.5);
        };
        Board.prototype.showIcon = function (icon) {
            var iconName = this.lookupIcon(icon);
            if (this.iconElement) {
                this.iconElement.destroy();
                this.iconElement = null;
            }
            var height = this.game.world.height;
            var width = this.game.world.width;
            this.iconElement = this.game.add.sprite(width / 2, height / 5, iconName);
            var imageCached = this.game.cache.getImage(iconName);
            var newHeight = height / 5 * 3;
            var newWidth = imageCached.height / imageCached.width * newHeight;
            //this.iconElement.scale.setTo(0.5, 0.5);
            this.iconElement.width = newWidth;
            this.iconElement.height = newHeight;
        };
        Board.prototype.drawLights = function (lightBuffer) {
            if (!this.lightGraphics || this.lightGraphics.length == 0) {
                // setup lights
                var width = this.game.world.width;
                var height = this.game.world.height;
                var lightWidth = this.game.world.width / 10;
                var numOfLights = width / lightWidth;
                var curveHeight = height / 10;
                var pointA = { x: 0, y: 0 };
                var pointB = { x: width / 2, y: curveHeight };
                var pointC = { x: width, y: 0 };
                var circleCenter = this.calcCircleCenter(pointA, pointB, pointC);
                var circleRadius = Math.sqrt(Math.pow(circleCenter.x - width, 2) + Math.pow(circleCenter.y - 0, 2));
                var circleRadius2 = Math.pow(circleRadius, 2);
                this.lightArc = this.game.add.graphics(circleCenter.x, circleCenter.y);
                //  Our first arc will be a line only
                this.lightArc.lineStyle(6, 0x656d78);
                // graphics.arc(0, 0, 135, game.math.degToRad(0), game.math.degToRad(90), false);
                this.lightArc.arc(0, 0, circleRadius, 0, this.game.math.degToRad(180), false);
                // draw lights on the arc
                this.game.bmd = this.game.add.bitmapData(this.game.width, this.game.height);
                this.game.bmd.addToWorld();
                this.game.bmd.clear();
                var i = 0;
                for (var p = 0; p < numOfLights; p++) {
                    var x = 10 + p * lightWidth;
                    var y = Math.sqrt(circleRadius2 - Math.pow((x - circleCenter.x), 2)) + circleCenter.y;
                    this.game.bmd.rect(x - 3, y + 2, 6, 10, '#656d78');
                    var graphics = this.game.add.graphics(x, y + 18);
                    //  Our first arc will be a line only
                    var color = lightBuffer[i];
                    graphics.lineStyle(2, color);
                    graphics.beginFill(color, 1);
                    graphics.drawEllipse(0, 0, 6, 10);
                    this.lightGraphics.push(graphics);
                    i++;
                    if (i >= lightBuffer.length)
                        i = 0;
                }
            }
            else {
                var j = 0;
                for (var i = 0; i < this.lightGraphics.length; i++) {
                    var color = lightBuffer[j];
                    var graphics = this.lightGraphics[i];
                    var x = graphics.position.x;
                    var y = graphics.position.y;
                    graphics.destroy();
                    graphics = null;
                    var newgraphics = this.game.add.graphics(x, y);
                    newgraphics.lineStyle(2, color);
                    newgraphics.beginFill(color, 1);
                    newgraphics.drawEllipse(0, 0, 6, 10);
                    this.lightGraphics[i] = newgraphics;
                    j++;
                    if (j >= lightBuffer.length)
                        j = 0;
                }
            }
        };
        Board.prototype.clearLights = function () {
            this.lightArc.clear();
            this.game.bmd.clear();
            for (var i = 0; i < this.lightGraphics.length; i++) {
                this.lightGraphics[i].clear();
            }
            this.lightGraphics = [];
            this.lightArc = null;
        };
        Board.prototype.calcCircleCenter = function (A, B, C) {
            var yDelta_a = B.y - A.y;
            var xDelta_a = B.x - A.x;
            var yDelta_b = C.y - B.y;
            var xDelta_b = C.x - B.x;
            var center = {};
            var aSlope = yDelta_a / xDelta_a;
            var bSlope = yDelta_b / xDelta_b;
            center.x = (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + B.x) - aSlope * (B.x + C.x)) / (2 * (bSlope - aSlope));
            center.y = -1 * (center.x - (A.x + B.x) / 2) / aSlope + (A.y + B.y) / 2;
            return center;
        };
        Board.prototype.update = function () {
        };
        Board.prototype.isGameInitialized = function () {
            return this.game && this.game.isBooted && this.gameLoaded;
        };
        Board.prototype.updateView = function () {
            pxsim.console.log("Update view");
        };
        Board.prototype.resizeGame = function (width, height) {
            if (this.isGameInitialized())
                this.game.scale.setGameSize(width, height);
        };
        Board.prototype.kill = function () {
            _super.prototype.kill.call(this);
            if (this.game) {
                this.game.world.removeAll();
                this.game.destroy();
                this.game = null;
                this.gameLoaded = false;
            }
        };
        Board.prototype.receiveMessage = function (msg) {
            switch (msg.type) {
                case "resize":
                    var width = msg.width;
                    var height = msg.height;
                    this.resizeGame(width, height);
                    break;
                default:
            }
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
