/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {Server} from './server';
import {Verb, Rel} from './constants';
import {Api} from './api';

type ExpressHandlerDescriptor = TypedPropertyDescriptor<express.RequestHandler>;

export function provides(rel?: Rel, options?: provides.Options.Namespace & provides.Options.Rel): ClassDecorator & MethodDecorator {
    return function (target: Object | Function, methodName?: string | symbol, descriptor?: ExpressHandlerDescriptor): Function | ExpressHandlerDescriptor | void {
        if (target instanceof Function) {
            // -- Class decorator --
            Server.api(true, target.prototype).provides(rel && Rel.stringify(rel), options);
            return target;
        } else {
            // -- Method decorator --
            Server.api(true, target, methodName!).provides(rel, options);
            return descriptor;
        }
    };
}

export namespace provides {
    export namespace Options {
        export interface Rel extends hal.Metadata {
            discoverable?: boolean;
            description?: string;
        };
        export interface Namespace {
            href?: string;
            auto?: boolean;
            template?: string;
        };
    }
}

export function hal(...args: (Rel | hal.Options)[]): MethodDecorator {
    return function (target: Object, methodName: string | symbol, descriptor: ExpressHandlerDescriptor): ExpressHandlerDescriptor | void {
        // -- Method decorator --
        Server.api(true, target, methodName).hal(...args);
        return descriptor;
    };
}

export namespace hal {
    export interface Options {
        self?: boolean;
    }
    export interface Metadata {
        params?: any;
        array?: boolean;
        id?: string;
        title?: string;
    }
    export interface Overrides extends Metadata {
        rel?: Rel;
        href?: string;
        server?: Object;
        links?: Rel[];
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
            Server.api(true, target, methodName).route(first, second!);
            return descriptor;
        };
    }
}

export function middleware(handler: express.RequestHandler | express.ErrorHandler, options?: middleware.Options): ClassDecorator & MethodDecorator {
    return function (target: Function | Object, methodName?: string | symbol, descriptor?: ExpressHandlerDescriptor): Function | ExpressHandlerDescriptor | void {
        if (target instanceof Function) {
            // -- Class decorator --
            Server.api(true, target.prototype).middleware(handler, options);
            return target;
        } else {
            // -- Method decorator --
            Server.api(true, target, methodName!).middleware(handler as express.RequestHandler);
            return descriptor;
        }
    };
}

export namespace middleware {
    export interface Options {
        error?: boolean;
    }
}

export function api(server: Object): Api.Class;
export function api(server: Object, method: string | symbol): Api.Method;
export function api(server: Object, method?: string | symbol): Api.Class | Api.Method {
    return Server.api(false, server, method!);
}