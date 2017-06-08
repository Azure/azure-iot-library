/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {provides, middleware, filter, hal} from './decorators';
import {Verb, Rel, Href} from './constants';
import {Arguments} from './arguments';

// Decorators are called in reverse order, whereas methods are called in the expected order;
// adding to the decorator callstack should compensate accordingly
function add<T>(obj: any, collection: string, value: T) {
    obj[Arguments.Stack][collection][obj.decorator ? 'unshift' : 'push'](value);
}

// These provide method-like representations of the decorator calls,
// and store the provided arguments for later processing
export namespace Api {
    export class Api {
        constructor(public /* readonly */ name: string, protected /* readonly */ decorator: boolean) {}
    }

    export class Class extends Api {
        constructor(name: string, decorator: boolean) {
            super(name, decorator);
            this[Arguments.Stack] = {
                provides: [],
                middleware: []
            } as Arguments.Class;
        }

        provides(namespace: string = this.name, options: provides.Options.Namespace = {}): this {
            add<Arguments.Class.Provides>(this, 'provides', { namespace, options });
            return this;
        }

        middleware(handler: express.RequestHandler | express.ErrorRequestHandler, options: middleware.Options = {}): this {
            add<Arguments.Class.Middleware>(this, 'middleware', { handler, options });
            return this;
        }
    }

    export class Method extends Api {
        constructor(name: string, decorator: boolean) {
            super(name, decorator);
            this[Arguments.Stack] = {
                route: [],
                provides: [],
                middleware: [],
                filter: [],
                hal: []
            } as Arguments.Method;
        }

        provides(rel: Rel = this.name, options: provides.Options.Rel = {}): this {
            add<Arguments.Method.Provides>(this, 'provides', { rel, options });
            return this;
        }

        hal(...args: (Rel | hal.Options)[]): this {
            add<Arguments.Method.Hal>(this, 'hal', {
                links: args.filter(arg => typeof arg !== 'object') as Rel[],
                options: Object.assign({}, ...args.filter(arg => typeof arg === 'object'))
            });
            return this;
        }

        route(verb: Verb, path: Href): this {
            add<Arguments.Method.Route>(this, 'route', { verb, path });
            return this;
        }

        middleware(handler: express.RequestHandler): this {
            add<Arguments.Method.Middleware>(this, 'middleware', { handler });
            return this;
        }

        filter(filter: filter.Filter): this {
            add<Arguments.Method.Filter>(this, 'filter', { filter });
            return this;
        }
    }
}
