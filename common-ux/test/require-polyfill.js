/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// This polyfill is required for running tests 
// Tests are run before bundling and they will fail if require is not defined   
window.require = function() {}