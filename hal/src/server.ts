/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as url from 'url';

import {LinkRelation, Rel, Method, Verb} from './constants';
import {Response} from './response';
import {route, provides, middleware, hal} from './decorators';
import {Api} from './api';
import {Linker} from './linker';
import {Template} from './template';
import {Arguments} from './arguments';

function relative(app: express.Application, href: string): string {
    return href && href[0] === '/' ? app.path().replace(/\/+$/, '') + href : href;
}

function path(req: express.Request): string {
    return url.parse(req.originalUrl).path;
}

export class Server {
    private methods: { [method: string]: Api.Method };
    private class: Api.Class;
    private app: express.Application;

    constructor() {
        this.methods = {};
        this.class = null;
        this.app = null;
    }
    
    static instance(target: Object): Server {
        if (!target[Server.Private]) {
            target[Server.Private] = new Server();
        }
        return target[Server.Private];
    }
    
    static api(decorator: boolean, server: Object): Api.Class;
    static api(decorator: boolean, constructor: Function): Api.Class;
    static api(decorator: boolean, server: Object, method: string | symbol): Api.Method;
    static api(decorator: boolean, target: Object | Function, method?: string | symbol): Api.Api {
        let api: Api.Api;
        if (typeof target === 'function') {
            if (!target[Server.Private]) {
                target[Server.Private] = new Api.Class((target as Function).name);
            }
            api = target[Server.Private];
        } else {
            let server = Server.instance(target);
            if (!method) {
                if (!server.class) {
                    server.class = new Api.Class(target.constructor.name);
                }
                api = server.class;
            } else {
                if (!server.methods[method]) {
                    server.methods[method] = new Api.Method(method.toString());
                }
                api = server.methods[method];
            }
        }
        // The decorator parameter needs to be private to the outside world, but we need to modify it here
        (api as any).decorator = decorator;
        return api;
    }
    
    private static autodoc(ns: string): express.RequestHandler {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (!req.params.rel) {
                res.sendStatus(404);
            }
            let doc = '';
            Linker.handle(null, ns + ':' + req.params.rel, (server: Object, route: string, links: Server.Link[]) => {
                doc += `<h1>${route}</h1>`;
                links.forEach(link => {
                    if (link.description) {
                        doc += `<h2>${link.verb}</h2>`;
                        doc += `<p>${link.description}</p>`;
                    }
                });
            });
            if (doc) {
                res.status(200).send(doc);
            } else {
                res.sendStatus(404);
            }
        };
    }

    private static register(target: Object, server: Server, method: Arguments.Method, handler: express.RequestHandler) {
        // Merge hal and middleware decorator calls
        const hal = {
            links: method.hal.reduce((links, hal) => links.concat(hal.links), []) as Rel[],
            options: method.hal.reduce((options, hal) => Object.assign(options, hal.options), {}) as hal.Options
        };
        const middleware = method.middleware.map(middleware => middleware.handler);

        // Transform all route verbs into their string equivalents
        const routes = method.route.map(route => ({
            verb: typeof route.verb === 'string' ? (route.verb as string).toUpperCase() : Method[route.verb],
            path: route.path
        }));

        // If this method requires a 'self' rel and does not already have one, add it to the start of its list of rels
        if ((hal.options.self || (typeof hal.options.self === 'undefined' && routes.find(route => route.verb === 'GET'))) &&
            hal.links.indexOf(LinkRelation.Self) < 0) {
            hal.links.unshift(LinkRelation.Self);
        } 

        // If this is a HAL handler, add middleware that will transmute the response object into a HAL response
        if (method.hal.length > 0) {
            middleware.push((req: express.Request, res: express.Response, next: express.NextFunction) =>
                Response.create(target, path(req), hal.links, req, res) && next());
        }

        for (let route of routes) {
            if (server.app[route.verb.toLowerCase()]) {
                // If this route provides rels, map them for quick access
                for (let provides of method.provides) {
                    let template = Template.apply(route.path, provides.options.params);
                    Linker.registerLink(target, provides.rel, template, Object.assign({
                        href: route.path,
                        links: hal.links,
                        verb: route.verb
                    }, provides.options));
                }
                
                // Reduce the full route to its path portion; HAL supports templated query parameters,
                // but Express does not
                server.app[route.verb.toLowerCase()].call(server.app,
                    url.parse(route.path).pathname, middleware, handler);
            } else {
                console.error(`${route.verb} is not a valid HTTP method.`);
            }
        }
    }

    // Merge class and instance decorators
    private static proto(target: Object): Arguments.Class {
        const defaults: Arguments.Class = { provides: [], middleware: [] };
        const instance: Arguments.Class = target[Server.Private].class ? target[Server.Private].class[Server.Private] : defaults;
        const prototype: Arguments.Class = target.constructor[Server.Private] ? target.constructor[Server.Private][Server.Private] : defaults;
        return {
            provides: prototype.provides.concat(instance.provides),
            middleware: prototype.middleware.concat(instance.middleware)
        };
    }
    
    static route(target: Object): express.Application {
        let server = Server.instance(target);
        
        if (!server.app) {
            server.app = express();

            const proto: Arguments.Class = Server.proto(target);

            // Resolve a default namespace if none was specified
            if (proto.provides.length === 0) {
                proto.provides.push({ namespace: target.constructor.name, options: {} });
            }

            // Resolve namespace documentation
            for (let provides of proto.provides) {
                const href = provides.options.href || `/docs/${provides.namespace}/:rel`;

                Linker.registerDocs(target, provides.namespace, href);

                // Register automatically-generated documentation
                if ((typeof provides.options.auto === 'undefined' && typeof provides.options.href === 'undefined') || provides.options.auto) {
                    server.app.get(href, Server.autodoc(provides.namespace));
                }
            }

            // Resolve server-wide middleware
            for (let middleware of proto.middleware.filter(middleware => !middleware.options.error)) {
                server.app.use(middleware.handler);
            }

            // Resolve individual routes
            for (let methodName in server.methods) {
                Server.register(target, server, server.methods[methodName][Server.Private],

                    // Bind the handler in a promise; Express does not use the return values of its handlers, 
                    // and this allows us to properly catch error results from async methods
                    (req: express.Request, res: express.Response, next: express.NextFunction) =>
                        Promise.resolve(target[methodName](req, res, next)).catch(next)
                );
            }
            
            // Resolve server-wide error-handling middleware
            for (let middleware of proto.middleware.filter(middleware => middleware.options.error)) {
                server.app.use(middleware.handler);
            }

            // Ensure proper relative href resolution
            Linker.setDocsCallback(target, docs => {
                docs.href = relative(server.app, docs.href);
                return docs;
            });
            Linker.setLinkCallback(target, link => {
                link.href = relative(server.app, link.href);
                return link;
            });
        }
        
        return server.app;
    }
    
    static discovery(req: express.Request, res: express.Response, next: express.NextFunction) {
        const hal = Response.create(null, path(req), [], req, res);
        for (let server of Linker.servers()) {
            const internal = server[Server.Private];
            if (internal) {
                for (let methodName in internal.methods) {
                    for (let provides of internal.methods[methodName][Server.Private].provides) {
                        if (provides.options.discoverable) {
                            hal.link(provides.rel, { server });
                        }
                    }
                }
            }
        }
        hal.json({});
    };
}

export namespace Server {
    export interface Link extends hal.Overrides, provides.Options.Rel {
        verb?: string;
    }

    export const Private = Symbol();
}
