/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// BunyanLoader decides whether we're running bunyan in the browser or as a nodejs library based on definition of window.
// Loads bunyan dynamically from node_modules if it's being used as a node logging library 
// Otherwise bunyan name is set as a window global when it's browserified 
                   
declare var bunyan: any;
export function bunyanLoader(): any {
    if (typeof (window) === 'undefined') {
        return require('bunyan');
    } else {
        return bunyan;
    }
}