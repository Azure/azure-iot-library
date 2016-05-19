/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// The expression: let a = 5; is not required for any logic, but it's required for sourcemaps to create a mapping for this file correctly. 
// If the file contains only the export expression the sourcemap that gets generated doesn't contain the .ts file and it causes test coverage remap action to fail. 
let a = 5;
export * from './common/common';