/// <reference path="../libs/core/enums.d.ts"/>

namespace pxsim.card {

    /**
     * Write text on the card
     * @param text text to write on the card, eg: "Happy Holidays!"
     */
    //% weight=90
    //% blockId="say" block="say %text"
    export function say(text: string) {
        board().setText(text);
    }

    /**
     * Set the card background
     */
    //% weight=89
    //% blockId="setBackground" block="set background %color=colorNumberPicker2"
    export function setBackground(color: number) {
        board().getGame().stage.backgroundColor = `0x${color.toString(16)}`;
    }

    //% weight=89
    //% blockId="setIcon" block="set icon %icon=main_iconPicker"
    export function setIcon(icon: number) {
        board().showIcon(icon.toString());
    }

    //% blockId="main_iconPicker" block="%input" shim=TD_ID
    //% blockHidden=true
    //% input.fieldEditor="imagedropdown" input.fieldOptions.columns=6
    export function _iconPicker(input: Icon): number {
        return input;
    }

    /**
     * Set the animation on the lights
     */
    //% blockId="randomColor" block="random color"
    //% weight=89
    export function randomColor(): number {
        const red = Math.floor(Math.random() * 255);
        const green = Math.floor(Math.random() * 255);
        const blue = Math.floor(Math.random() * 255);
        return ((red & 0xFF) << 16) | ((green & 0xFF) << 8) | (blue & 0xFF);
    }
}

namespace pxsim.loops {

    /**
     * Repeats the code forever in the background. On each iteration, allows other code to run.
     * @param body the code to repeat
     */
    //% help=functions/forever weight=99 blockGap=8
    //% blockId=device_forever block="repeat forever" blockAllowMultiple=true
    export function forever(body: RefAction): void {
        thread.forever(body)
    }

    /**
     * Pause for the specified time in milliseconds
     * @param ms how long to pause for, eg: 1, 2, 5
     */
    //% help=functions/pause weight=98
    //% block="wait %pause|second(s)" blockId=device_pause
    //% s.defl="1"
    export function pauseAsync(s: number) {
        return Promise.delay(s * 1000)
    }
}

namespace pxsim.lights {
    /**
     * Set the lights
     */
    //% weight=89
    //% blockId="setLightColor" block="set lights %color=colorNumberPicker2"
    export function setLightColor(color: number) {
        board().drawLights([color.toString()]);
    }

    /**
     * Clear the lights
     */
    //% weight=89
    //% blockId="clearLights" block="clear lights"
    export function clearLights() {
        board().clearLights();
    }

    /**
     * Set the animation on the lights
     */
    //% blockId="setLightAnimation" block="show %animation=light_animation_picker"
    //% weight=89 blockHidden=1
    export function setLightAnimation(animation: number) {
        loops.pauseAsync(0.1);
    }

    //% blockId="light_animation_picker" block="%animation" shim=TD_ID
    //% blockHidden=true
    export function _animationPicker(animation: LightAnimation): number {
        return animation;
    }
}