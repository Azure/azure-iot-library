/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {Server} from './server';
import {Method, Verb, Rel} from './constants';

type ExpressHandlerDescriptor = TypedPropertyDescriptor<express.RequestHandler>;

export function provides(rel?: Rel, options?: provides.Options.Namespace & provides.Options.Rel): ClassDecorator & MethodDecorator {
    options = options || {};
    return function (target: Object | Function, methodName?: string | symbol, descriptor?: ExpressHandlerDescriptor): Function | ExpressHandlerDescriptor | void {
        if (target instanceof Function) {
            // -- Class decorator --
            let server = Server.class(target);
            
            // Decorators are called bottom to top so the specified name should always override the current name
            server.name = (rel || target.name).toString();

            server.docs[server.name] = {
                name: server.name,
                href: options.href || `/docs/${server.name}/:rel`,
                auto: (typeof options.auto === 'undefined' && typeof options.href === 'undefined') || options.auto
            };

            return target;
        } else {
            // -- Method decorator --
            let method = Server.method(target, methodName, descriptor.value);

            method.provides.push({
                rel: rel || methodName.toString(),
                options: options || {}
            });
            
            return descriptor;
        }
    };
}

export namespace provides {
    export namespace Options {
        export interface Rel {
            discoverable?: boolean;
            params?: any;
            id?: string;
            title?: string;
            description?: string;
        };
        export interface Namespace {
            href?: string;
            auto?: boolean;
        };
    }
}

// Use function overloading to prevent emitting the ... operator which is not currently supported by Node.js
export function hal(...args: (Rel | hal.Options)[]): MethodDecorator;
export function hal(): MethodDecorator {
    let args: (Rel | hal.Options)[] = Array.from(arguments);
    let links: Rel[] = <Rel[]>args.filter(arg => typeof arg !== 'object');
    let options: hal.Options[] = <hal.Options[]>args.filter(arg => typeof arg === 'object');
    return function (target: Object, methodName: string | symbol, descriptor: ExpressHandlerDescriptor): ExpressHandlerDescriptor | void {
        // -- Method decorator --
        let method = Server.method(target, methodName, descriptor.value);
        
        method.hal.links = method.hal.links.concat(links || []);
        method.hal.options = Object.assign(method.hal.options, ...options);
        method.hal.handler = true;
        
        return descriptor;
    };
}

export namespace hal {
    export interface Options {
        self?: boolean;
    }
    export interface Overrides {
        rel?: Rel;
        href?: string;
        params?: any;
        server?: Object;
        array?: boolean;
        links?: Rel[];
        id?: string;
        title?: string;
    }
    export interface Response {
        link(rel: Rel, overrides?: Overrides): void;
        embed(rel: Rel, value: Object, overrides?: Overrides): Response;
        docs(name: string, href: string): void;
    }
    export const discovery: express.RequestHandler = Server.discovery;
}

export function route(target: Object): express.Application;
export function route(verb: Verb, path: string): MethodDecorator;
export function route(first: Verb | Object, second?: string): express.Application | MethodDecorator {
    if (typeof first === 'object') {
        // -- Utility method --
        return Server.route(first);
    } else {
        return function (target: Object, methodName: string | symbol, descriptor: ExpressHandlerDescriptor): ExpressHandlerDescriptor | void {
            // -- Method decorator --
            let method = Server.method(target, methodName, descriptor.value);

            method.route.verb = typeof first === 'string' ? first.toUpperCase() : Method[first];
            method.route.path = second;
            
            return descriptor;
        };
    }
}

export function middleware(handler: express.RequestHandler | express.ErrorRequestHandler, options?: middleware.Options): ClassDecorator & MethodDecorator {
    options = options || {};
    return function (target: Function | Object, methodName?: string | symbol, descriptor?: ExpressHandlerDescriptor): Function | ExpressHandlerDescriptor | void {
        if (target instanceof Function) {
            // -- Class decorator --
            let server = Server.class(target);
        
            // Decorators are called bottom to top so we have to reverse the middleware list
            if (options.error) {
                server.middleware.after = [<express.ErrorRequestHandler>handler].concat(server.middleware.after);
            } else {
                server.middleware.before = [<express.RequestHandler>handler].concat(server.middleware.before);
            }

            return target;
        } else {
            // -- Method decorator --
            let method = Server.method(target, methodName, descriptor.value);
            
            // Decorators are called bottom to top so we have to reverse the middleware list
            method.middleware = [<express.RequestHandler>handler].concat(method.middleware);
            
            return descriptor;
        }
    };
}

export namespace middleware {
    export interface Options {
        error?: boolean;
    }
}