# A "Holiday Card" target for a Microsoft MakeCode Editor

This repo contains a "Holiday card" target built with Microsoft MakeCode (PXT). The editor is hosted on the GitHub pages at https://samelhusseini.github.io/pxt-holidays/controller.html

The repo serves as a demonstration to anyone trying to integrate PXT into their own application without using the PXT frontend.

Using the "editor controller" mode of PXT, you can embed PXT inside an iframe in your application and send and receive messages query project state and control PXT using a pre-defined protocol. 
The protocol for communicating with PXT in that mode is defined here: 
https://github.com/Microsoft/pxt/blob/master/pxteditor/editorcontroller.ts

This repo also contains a separate site built with React.js that demonstrates how to communicate with PXT. The site is built under /site. You would mostly likely not use this if you're trying to integrate PXT into your application.

If you'd like to start your own editor, create a copy of this repo and fix all the TODOs.
- [ ] Setup local server (see below)
- [ ] [Follow these instructions](site/README.md) to build and test the React site.
- [ ] Update metadata in ``pxtarget.json``. Change the id, title, name, etc... to your taste.
- [ ] Update the JavaScript runtime in ``sim/simulator.ts``. If needed add additional JS library under ``sim/public/**``
and edit ``sim/public/simulator.html`` with additional ``script`` tags.
- [ ] Update the APIs in ``sim/api.ts`` to use your runtime.
- [ ] Test your editor in the local server
- [ ] run ``pgk staticpkg --gh --bump`` to upload a static version to GitHub pages.

## Running locally

These instructions allow to run locally to modify this target.

## Setup

The following commands are a 1-time setup after synching the repo on your machine.
- install node.js
- install the PXT command line
```
npm install -g pxt
```
- install the node dependencies
```
npm install
```

## Running the local server

Once you're done, simply run this command to open a local web server:
```
pxt serve
```

Normally, you would test your page from http://localhost:3232/index.html but since the editor is in "controller" mode, we would instead test it from a page were it's embedded in an iframe, use http://localhost:3232/controller.html instead.

[Follow these instructions](site/README.md) to build and test the React site.

After making a change in the source, refresh the page in the browser.

## Updating the tools

If you would like to pick up the latest PXT build, simply run
```
pxt update
```

More instructions at https://github.com/Microsoft/pxt#running-a-target-from-localhost
