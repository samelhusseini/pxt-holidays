/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>

declare let Phaser: any;

namespace pxsim {

    export interface ISimMessage {
        type: "simulator.message";
        key?: string;
        data?: string;
    }

    /**
     * This function gets called each time the program restarts
     */
    initCurrentRuntime = () => {
        runtime.board = new Board();
    };

    /**
     * Gets the current 'board', eg. program state.
     */
    export function board(): Board {
        return runtime.board as Board;
    }

    const postContainerMessage = (message: pxsim.ISimMessage) => {
        Runtime.postMessage({
            type: "custom",
            __proxy: "parent",
            content: message
        } as pxsim.SimulatorCustomMessage);
    };

    /**
     * Represents the entire state of the executing program.
     * Do not store state anywhere else!
     */
    export class Board extends pxsim.BaseBoard {

        private game: any; // Phaser game
        private gameLoaded: boolean;

        constructor() {
            super();

            // Initialize phaser
            this.initPhaser();
        }

        initAsync(msg: pxsim.SimulatorRunMessage): Promise<void> {
            postContainerMessage({
                type: "simulator.message",
                key: "init"
            });
            let that = this;
            return new Promise<void>((resolve, reject) => {
                (function waitForFoo() {
                    if (that.isGameInitialized()) return resolve();
                    setTimeout(waitForFoo, 50);
                })();
            });
        }

        initPhaser() {
            const fullHeight = window.innerHeight;
            const fullWidth = window.innerWidth;
            this.game = new Phaser.Game(fullWidth, fullHeight, Phaser.AUTO, 'inner-card', { preload: this.preload, create: this.create.bind(this), update: this.update });
        }

        getGame() {
            return this.game;
        }

        preload() {
            const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(window.location.href);
            const staticPath = isLocalhost ? '../static' : './docs/static';
            this.game.load.image('balloons', `${staticPath}/sprites/balloons.png`);
            this.game.load.image('barbecue', `${staticPath}/sprites/barbecue-1.png`);
            this.game.load.image('bauble', `${staticPath}/sprites/bauble.png`);
            this.game.load.image('baubles', `${staticPath}/sprites/baubles.png`);
            this.game.load.image('bell', `${staticPath}/sprites/bell.png`);
            this.game.load.image('candies', `${staticPath}/sprites/candies.png`);
            this.game.load.image('candycane', `${staticPath}/sprites/candy-cane.png`);
            this.game.load.image('christmas-sock', `${staticPath}/sprites/christmas-sock.png`);
            this.game.load.image('christmas-tree', `${staticPath}/sprites/christmas-tree.png`);
            this.game.load.image('church', `${staticPath}/sprites/church.png`);
            this.game.load.image('firecracker', `${staticPath}/sprites/firecracker-1.png`);
            this.game.load.image('fireworks-1', `${staticPath}/sprites/fireworks-1.png`);
            this.game.load.image('fireworks-2', `${staticPath}/sprites/fireworks-2.png`);
            this.game.load.image('fireworks', `${staticPath}/sprites/fireworks.png`);
            this.game.load.image('gift', `${staticPath}/sprites/gift.png`);
            this.game.load.image('mistletoe', `${staticPath}/sprites/mistletoe.png`);
            this.game.load.image('mittens', `${staticPath}/sprites/mittens.png`);
            this.game.load.image('rainbow', `${staticPath}/sprites/rainbow.png`);
            this.game.load.image('reindeer', `${staticPath}/sprites/reindeer.png`);
            this.game.load.image('ribbon', `${staticPath}/sprites/ribbon.png`);
            this.game.load.image('santa', `${staticPath}/sprites/santa-claus.png`);
            this.game.load.image('sledge', `${staticPath}/sprites/sledge.png`);
            this.game.load.image('snowflake-1', `${staticPath}/sprites/snowflake-1.png`);
            this.game.load.image('snowflake-2', `${staticPath}/sprites/snowflake-2.png`);
            this.game.load.image('snowflake', `${staticPath}/sprites/snowflake.png`);
            this.game.load.image('snowman', `${staticPath}/sprites/snowman.png`);
            this.game.load.image('kwanzaa1', `${staticPath}/sprites/kwanzaa1.png`);
            this.game.load.image('kwanzaa2', `${staticPath}/sprites/kwanzaa2.png`);
            this.game.load.image('kwanzaa3', `${staticPath}/sprites/kwanzaa3.png`);
            this.game.load.image('kwanzaa4', `${staticPath}/sprites/kwanzaa4.png`);
            this.game.load.image('kwanzaa5', `${staticPath}/sprites/kwanzaa5.png`);
            this.game.load.image('stlucia', `${staticPath}/sprites/stlucia.png`);
            this.game.load.image('hebrew1', `${staticPath}/sprites/hebrew1.png`);
            this.game.load.image('hebrew2', `${staticPath}/sprites/hebrew2.png`);
            this.game.load.image('hebrew3', `${staticPath}/sprites/hebrew3.png`);
            this.game.load.image('yarmulke', `${staticPath}/sprites/yarmulke.png`);
        }

        lookupIcon(icon: string) {
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
                    return "candycane"
                case "20":
                    return "candies"
                case "21":
                    return "bell"
                case "22":
                    return "bauble"
                case "23":
                    return "baubles"
                case "24":
                    return "barbecue"
                case "25":
                    return "balloons"
                case "26":
                    return "stlucia"
                case "27":
                    return "kwanzaa1"
                case "28":
                    return "kwanzaa2"
                case "29":
                    return "kwanzaa3"
                case "30":
                    return "kwanzaa4"
                case "31":
                    return "kwanzaa5"
                case "32":
                    return "hebrew1"
                case "33":
                    return "hebrew2"
                case "34":
                    return "hebrew3"
                case "35":
                    return "yarmulke"
            }
            return "";
        }

        create() {
            this.game.stage.backgroundColor = `0xFFFFFF`;
            this.gameLoaded = true;
        }

        private textElement: any;
        setText(text: string) {
            var style = { font: 'bold 30pt Arial', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 100 };
            if (this.textElement) {
                this.textElement.destroy();
                this.textElement = null;
            }
            this.textElement = this.game.add.text(120, this.game.world.centerY, text, style);
            this.textElement.anchor.set(0.5);
        }

        private iconElement: any;
        showIcon(icon: string) {
            const iconName = this.lookupIcon(icon);
            if (this.iconElement) {
                this.iconElement.destroy();
                this.iconElement = null;
            }
            const height = this.game.world.height;
            const width = this.game.world.width;
            this.iconElement = this.game.add.sprite(width / 2, height / 5, iconName);
            let imageCached = this.game.cache.getImage(iconName);
            const newHeight = height / 5 * 3;
            const newWidth = imageCached.height / imageCached.width * newHeight;
            //this.iconElement.scale.setTo(0.5, 0.5);
            this.iconElement.width = newWidth;
            this.iconElement.height = newHeight;
        }

        private lightGraphics: any[] = [];
        private lightArc: any;
        drawLights(lightBuffer: string[]) {
            if (!this.lightGraphics || this.lightGraphics.length == 0) {
                // setup lights
                const width = this.game.world.width;
                const height = this.game.world.height;
                const lightWidth = this.game.world.width / 10;
                const numOfLights = width / lightWidth;
                const curveHeight = height / 10;

                const pointA = { x: 0, y: 0 };
                const pointB = { x: width / 2, y: curveHeight };
                const pointC = { x: width, y: 0 };

                const circleCenter = this.calcCircleCenter(pointA, pointB, pointC);
                const circleRadius = Math.sqrt(Math.pow(circleCenter.x - width, 2) + Math.pow(circleCenter.y - 0, 2));
                const circleRadius2 = Math.pow(circleRadius, 2);

                this.lightArc = this.game.add.graphics(circleCenter.x, circleCenter.y);

                //  Our first arc will be a line only
                this.lightArc.lineStyle(6, 0x656d78);

                // graphics.arc(0, 0, 135, game.math.degToRad(0), game.math.degToRad(90), false);
                this.lightArc.arc(0, 0, circleRadius, 0, this.game.math.degToRad(180), false);

                // draw lights on the arc
                this.game.bmd = this.game.add.bitmapData(this.game.width, this.game.height);
                this.game.bmd.addToWorld();

                this.game.bmd.clear();

                let i = 0;
                for (let p = 0; p < numOfLights; p++) {
                    let x = 10 + p * lightWidth;
                    let y = Math.sqrt(circleRadius2 - Math.pow((x - circleCenter.x), 2)) + circleCenter.y;
                    this.game.bmd.rect(x - 3, y + 2, 6, 10, '#656d78');

                    let graphics = this.game.add.graphics(x, y + 18);
                    //  Our first arc will be a line only
                    const color = lightBuffer[i];
                    graphics.lineStyle(2, color);
                    graphics.beginFill(color, 1);
                    graphics.drawEllipse(0, 0, 6, 10);
                    this.lightGraphics.push(graphics);
                    i++;
                    if (i >= lightBuffer.length) i = 0;
                }
            } else {
                let j = 0;
                for (let i = 0; i < this.lightGraphics.length; i++) {
                    const color = lightBuffer[j];
                    let graphics = this.lightGraphics[i];
                    let x = graphics.position.x;
                    let y = graphics.position.y;
                    graphics.destroy();
                    graphics = null;
                    let newgraphics = this.game.add.graphics(x, y);
                    newgraphics.lineStyle(2, color);
                    newgraphics.beginFill(color, 1);
                    newgraphics.drawEllipse(0, 0, 6, 10);
                    this.lightGraphics[i] = newgraphics;
                    j++;
                    if (j >= lightBuffer.length) j = 0;
                }
            }
        }

        clearLights() {
            this.lightArc.clear();
            this.game.bmd.clear();
            for (let i = 0; i < this.lightGraphics.length; i++) {
                this.lightGraphics[i].clear();
            }
            this.lightGraphics = [];
            this.lightArc = null;
        }

        private calcCircleCenter(A: any, B: any, C: any) {
            const yDelta_a = B.y - A.y;
            const xDelta_a = B.x - A.x;
            const yDelta_b = C.y - B.y;
            const xDelta_b = C.x - B.x;

            let center: { x?: number, y?: number } = {};

            const aSlope = yDelta_a / xDelta_a;
            const bSlope = yDelta_b / xDelta_b;

            center.x = (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + B.x) - aSlope * (B.x + C.x)) / (2 * (bSlope - aSlope));
            center.y = -1 * (center.x - (A.x + B.x) / 2) / aSlope + (A.y + B.y) / 2;
            return center;
        }

        update() {

        }

        isGameInitialized() {
            return this.game && this.game.isBooted && this.gameLoaded;
        }

        updateView() {
            console.log("Update view");
        }

        resizeGame(width: number, height: number) {
            if (this.isGameInitialized()) this.game.scale.setGameSize(width, height);
        }

        kill() {
            super.kill();
            if (this.game) {
                if (this.game.world)
                    this.game.world.removeAll();
                this.game.destroy();
                this.game = null;
                this.gameLoaded = false;
            }
        }

        public receiveMessage(msg: SimulatorMessage) {
            switch (msg.type) {
                case "resize":
                    const width = (msg as any).width;
                    const height = (msg as any).height;
                    this.resizeGame(width, height);
                    break;
                default:
            }
        }

        public sendMessage(key: string, data: string) {
            postContainerMessage({
                type: "simulator.message",
                key: key,
                data: data
            } as pxsim.ISimMessage);
        }
    }
}