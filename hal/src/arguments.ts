/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {Rel, Verb} from './constants';
import {provides, middleware, hal} from './decorators';

// Provides interfaces for storing the arguments of the decorator callstacks
// NOTE: These should be aligned with the arguments of the decorators and the Api classes
export namespace Arguments {
    export interface Class {
        provides: Class.Provides[];
        middleware: Class.Middleware[];
    }

    export namespace Class {
        export interface Provides {
            namespace: string;
            options: provides.Options.Namespace;
        }
        export interface Middleware {
            handler: express.RequestHandler | express.ErrorHandler;
            options: middleware.Options;
        }
    }

    export interface Method {
        route: Method.Route[];
        provides: Method.Provides[];
        middleware: Method.Middleware[];
        hal: Method.Hal[];
    }

    export namespace Method {
        export interface Route {
            verb: Verb;
            path: string;
        }
        export interface Provides {
            rel: Rel;
            options: provides.Options.Rel;
        }
        export interface Middleware {
            handler: express.RequestHandler;
        }
        export interface Hal {
            links: Rel[];
            options: hal.Options;
        }
    }

    export const Stack = Symbol();
}