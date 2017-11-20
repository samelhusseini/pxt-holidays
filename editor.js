/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts" />
var blocklyToolboxXML = "<xml id=\"blocklyToolboxDefinition\" style=\"display: none\">\n<block type=\"controls_repeat_ext\" gap=\"8\">\n<value name=\"TIMES\">\n    <shadow type=\"math_number\">\n        <field name=\"NUM\">4</field>\n    </shadow>\n</value>\n</block>\n</xml>";
pxt.editor.initExtensionsAsync = function (opts) {
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
