/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts" />


const blocklyInitialToolbox = {
  loops: {
    blocks: [] as pxt.editor.ToolboxBlockDefinition[]
  }
};

window.addEventListener("message", ev => {
  let m = ev.data as pxsim.SimulatorMessage;
  switch (m.type) {
    case "resize":
      const width = (m as any).width;
      const height = (m as any).height;
      const top = (m as any).top;
      const left = (m as any).left;
      // Resize sim-frame
      console.log("Receive resize message");

      const simframe = document.getElementsByClassName('simframe')[0] as HTMLDivElement;
      if (simframe) {
        simframe.style.position = 'fixed';
        simframe.style.height = `${height}px`;
        simframe.style.width = `${width}px`;
        simframe.style.top = `${top}px`;
        simframe.style.left = `${left}px`;
        simframe.style.paddingBottom = `0px`;
      }
      break;
    case "showmaineditor":
      document.getElementById('maineditor').style.display = '';
      break;
    case "hidemaineditor":
      document.getElementById('maineditor').style.display = 'none';
      break;
    default:
  }
});

pxt.editor.initExtensionsAsync = function (opts: pxt.editor.ExtensionOptions): Promise<pxt.editor.ExtensionResult> {
  let footer = document.createElement('div');
  footer.className = "blockly-footer footer";
  let injectionDiv = document.getElementById('blocksArea');
  if (injectionDiv) {
    injectionDiv.appendChild(footer);
  }
  const res: pxt.editor.ExtensionResult = {
    toolboxOptions: {
      // Define the blocks mode toolbox
      blocklyToolbox: blocklyInitialToolbox
    }
  };
  return Promise.resolve<pxt.editor.ExtensionResult>(res);
};