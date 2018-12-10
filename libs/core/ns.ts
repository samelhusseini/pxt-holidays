//% color=#27ae60 weight=80
namespace loops {

}

//% color=#E55934 weight=100
namespace card {

    /**
     * Get the color wheel field editor
     * @param color color, eg: #ff0000
     */
    //% blockId=colorNumberPicker2 block="%value"
    //% blockHidden=true
    //% shim=TD_ID colorSecondary="#FFFFFF"
    //% value.fieldEditor="colornumber" value.fieldOptions.decompileLiterals=true
    //% value.defl='#ff0000'
    export function colorNumberPicker(value: number) {
        return value;
    }

    /**
     * Get the color wheel field editor
     * @param value value between 0 to 255 to get a color value, eg: 10
     */
    //% blockId=colorWheelPicker2 block="%value"
    //% blockHidden=true
    //% shim=TD_ID colorSecondary="#FFFFFF"
    //% value.fieldEditor="colorwheel" value.fieldOptions.decompileLiterals=true
    //% value.fieldOptions.sliderWidth='200'
    //% value.fieldOptions.min=0 value.fieldOptions.max=255
    export function colorWheelPicker(value: number) {
        return value;
    }

    /**
     * Get the color wheel field editor
     * @param color color, eg: #ff0000
     */
    //% blockId=colorPicker2 block="%value"
    //% blockHidden=true
    //% shim=TD_ID colorSecondary="#FFFFFF"
    //% value.fieldEditor="colorpicker2" value.fieldOptions.decompileLiterals=true
    //% value.defl='#ff0000'
    export function colorPicker(value: string) {
        return value;
    }
}

/**
 * Control the lights.
 */
//% color=#3498db weight=90
namespace lights {
    
}