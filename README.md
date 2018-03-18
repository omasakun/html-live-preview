# HTML live preview Extension for VS Code
## Feature
This extension provide HTML preview which execute on local server. This extension automatically reload browser when you save HTML files. 
## Preparation
Insert ```<!-- INSERT DEBUG CODE HERE -->``` to your HTML code.   
This extension replaces the comment with the code necessary for the browser reloading when this extension provides the HTML file to the browser.
## Commands
### Preview HTML in your Browser (```htmlLivePreview.command.startWatching```)
Start a local server that provides HTML files etc.
### Stop Preview server(```htmlLivePreview.command.stopWatching```)
Stop the local server.
### html-live-preview: Force browsers to reload(```htmlLivePreview.command.reload```)
Force the browser to reload HTML pages.

## Settings
### ```htmlLivePreview.port```
Decide on which port to start the local server

## How to build locally
Simple.
1. Run ```npm install``` to install dependencies.
2. Press F5 key to launch extension.
3. Enjoy Coding-Preview-See-Rewrite Loop!