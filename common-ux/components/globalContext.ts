/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Input} from 'angular2/core';
import {DefaultResources} from './resources';

export class GlobalContext {
    
    /**
     * Resources; see DefaultResources for typings
     * OPTIONAL: if not present, default resources are used
     * NOTE: if you do not provide a specific resource that is expected, fallback to the default resources will occur
     */
    @Input('resources') Resources = DefaultResources;
    
    /**
     * This is a second reference to the default resources so that if the consumer of the grid provides a resource override, we can still fall back to the default if it isn't present
     */
    public DefaultResources = DefaultResources;
}