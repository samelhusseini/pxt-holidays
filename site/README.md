# A "Holiday Card" web app embedding a Microsoft MakeCode editor

This section of the repo contains a site built with React.js and [Semantic UI React](https://github.com/Semantic-Org/Semantic-UI-React) that demonstrates how to communicate with PXT. You would mostly likely not use this if you're trying to integrate PXT into your application. 

Follow these instructions to build the React site locally:

## Setup

Install all the node dependencies in the /site directory. 
```
npm install
```

Once you're done, simply run this command to build the main bundled js:
```
webpack
```

## Test

Follow [these instructions](../README.md) to run PXT locally and you can test this React app by browsing to: 
http://localhost:3232/controller.html