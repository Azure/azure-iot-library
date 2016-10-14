/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {route, provides, middleware, hal} from './decorators';
import {Server} from './server';
import {Verb, Rel} from './constants';
import {Arguments} from './arguments';

// Decorators are called in reverse order, whereas methods are called in the expected order;
// adding to the decorator callstack should compensate accordingly
function add<T>(obj: any, collection: string, value: T) {
    obj[Arguments.Stack][collection][obj.decorator ? 'unshift' : 'push'](value);
}

export namespace Api {
    export class Api {
        constructor(protected name: string, protected decorator: boolean = false) {}
    }

    export class Class extends Api {
        constructor(name: string, decorator?: boolean) {
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
        constructor(name: string, decorator?: boolean) {
            super(name, decorator);
            this[Arguments.Stack] = {
                route: [],
                provides: [],
                middleware: [],
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

        route(verb: Verb, path: string): this {
            add<Arguments.Method.Route>(this, 'route', { verb, path });
            return this;
        }

        middleware(handler: express.RequestHandler): this {
            add<Arguments.Method.Middleware>(this, 'middleware', { handler });
            return this;
        }
    }
}
