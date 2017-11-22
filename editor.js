/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts" />
var blocklyToolboxXML = "<xml id=\"blocklyToolboxDefinition\" style=\"display: none\">\n<block type=\"controls_repeat_ext\" gap=\"8\">\n<value name=\"TIMES\">\n    <shadow type=\"math_number\">\n        <field name=\"NUM\">4</field>\n    </shadow>\n</value>\n</block>\n</xml>";
pxt.editor.initExtensionsAsync = function (opts) {
    window.addEventListener("message", function (ev) {
        var m = ev.data;
        switch (m.type) {
            case "resize":
                var width = m.width;
                var height = m.height;
                var top_1 = m.top;
                var left = m.left;
                // Resize sim-frame
                console.log("Receive resize message");
                var simframe = document.getElementsByClassName('simframe')[0];
                if (simframe) {
                    simframe.style.position = 'fixed';
                    simframe.style.height = height + "px";
                    simframe.style.width = width + "px";
                    simframe.style.top = top_1 + "px";
                    simframe.style.left = left + "px";
                    simframe.style.paddingBottom = "0px";
                }
                break;
            default:
        }
    });
    var footer = document.createElement('div');
    footer.className = "blockly-footer footer";
    var injectionDiv = document.getElementById('blocksArea');
    if (injectionDiv) {
        injectionDiv.appendChild(footer);
    }
    var res = {
        toolboxOptions: {
            blocklyXml: blocklyToolboxXML
        }
    };
    return Promise.resolve(res);
};
