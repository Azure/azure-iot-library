/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as url from 'url';

import {LinkRelation, Rel, Method} from './constants';
import {Response} from './response';
import {provides, hal} from './decorators';
import {Api} from './api';
import {Linker} from './linker';
import {Template} from './template';
import {Arguments} from './arguments';

// Resolve a relative href using the base path of an Express application
function relative(app: express.Application, href: string): string {
    return href && href[0] === '/' ? app.path().replace(/\/+$/, '') + href : href;
}

// Extract the path portion of an Express request
function path(req: express.Request): string {
    return url.parse(req.originalUrl).path!;
}

// Provides functionality for embedding HAL server data in a given server object
export class Server {
    // Provide a global linker for cross-server registration
    static linker: Linker = new Linker();

    // Access the functional decorator representation for the target server or method;
    // this will typically be a prototype when called for a decorator and an instance otherwise
    static api(decorator: boolean, target: Object): Api.Class;
    static api(decorator: boolean, target: Object, method: string | symbol): Api.Method;
    static api(decorator: boolean, target: Object, method?: string | symbol): Api.Api {
        let api: Api.Api;
        if (!method) {
            if (!target.hasOwnProperty(Server.Class)) {
               target[Server.Class] = new Api.Class(target.constructor.name, decorator);
            }
            api = target[Server.Class];
        } else {
            if (!target.hasOwnProperty(Server.Methods)) {
                target[Server.Methods] = {};
            }
            if (!target[Server.Methods][method]) {
                target[Server.Methods][method] = new Api.Method(method.toString(), decorator);
            }
            api = target[Server.Methods][method];
        }
        return api;
    }
    
    // Generate an automated documentation Express handler for the given namespace
    private static autodoc(ns: string): express.RequestHandler {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            // If a rel was not provided, this is not a valid documentation call
            if (!req.params[Rel.Param]) {
                res.sendStatus(404);
            }

            // For each possible route in the resolved rel, display the route, all available verbs,
            // and the given description for each verb (if available)
            let doc = '';
            Server.linker.handle({}, ns + ':' + req.params[Rel.Param], (server: Object, route: string, links: Server.Link[]) => {
                doc += `<h1>${route}</h1>`;
                links.forEach(link => {
                    if (link.description) {
                        doc += `<h2>${link.verb}</h2>`;
                        doc += `<p>${link.description}</p>`;
                    }
                });
            });

            // If nothing was found (even routes), assume this was not a valid rel
            if (doc) {
                res.status(200).send(doc);
            } else {
                res.sendStatus(404);
            }
        };
    }

    // Register all data for a single handler method
    private static register(server: Object, method: Arguments.Method, app: express.Application, handler: express.RequestHandler) {
        // Merge hal and middleware decorator calls
        const hal = {
            links: new Set(method.hal.reduce<Rel[]>((links, hal) => links.concat(hal.links), [])),
            options: method.hal.reduce((options, hal) => Object.assign(options, hal.options), {}) as hal.Options
        };
        const middleware = method.middleware.map(middleware => middleware.handler);

        // If a self rel has been explicitly requested, add it to the links
        if (hal.options.self) {
            hal.links.add(LinkRelation.Self);
        }

        // Transform all route verbs into their string equivalents
        const routes = method.route.map(route => ({
            verb: typeof route.verb === 'string' ? (route.verb as string).toUpperCase() : Method[route.verb],
            path: route.path
        }));

        for (let route of routes) {
            if (app[route.verb.toLowerCase()]) {
                // If this route requires an automatic default 'self' rel, add it
                const links = Array.from(typeof hal.options.self === 'undefined' && route.verb === 'GET' ?
                    (new Set(hal.links)).add(LinkRelation.Self) : hal.links);

                // If this method provides rels, map them for quick access
                for (let provides of method.provides) {
                    let template = Template.apply(route.path, provides.options.params || {});
                    Server.linker.registerLink(server, provides.rel, template, Object.assign({
                        verb: route.verb,
                        href: route.path,
                        links
                    }, provides.options));
                }

                // If this is a HAL handler, add middleware that will transmute the response object into a HAL response
                // (with the current links for this route)
                const handlers = method.hal.length === 0 ? middleware : [
                    (req: express.Request, res: express.Response, next: express.NextFunction) =>
                        Response.create(server, path(req), links, req, res) && next()
                ].concat(middleware);
                
                app[route.verb.toLowerCase()].call(app, Template.express(route.path), handlers, handler);
            } else {
                console.error(`${route.verb} is not a valid HTTP method.`);
            }
        }
    }

    // Merge class and instance decorators to support prototype inheritance
    private static proto(target: Object): Arguments.Class & { methods: { [method: string]: Api.Method } } {
        let proto: Arguments.Class & { methods: { [method: string]: Api.Method } } = { provides: [], middleware: [], methods: {} };

        // Walk down the prototype chain and merge class decorators
        let prototype = target;
        while (prototype) {
            if (prototype.hasOwnProperty(Server.Class)) {
                proto.provides = proto.provides.concat(prototype[Server.Class][Arguments.Stack].provides);
                proto.middleware = proto.middleware.concat(prototype[Server.Class][Arguments.Stack].middleware);
            }
            if (prototype.hasOwnProperty(Server.Methods)) {
                proto.methods = Object.assign({}, prototype[Server.Methods], proto.methods);
            }
            prototype = Object.getPrototypeOf(prototype);
        }

        return proto;
    }

    // Obtain the Express application for the given server object
    static route(server: Object): express.Application {
        if (!server[Server.App]) {
            // If this is the first time this has been called, perform all necessary registration actions
            let app = server[Server.App] = express();

            const proto = Server.proto(server);

            // Resolve a default namespace if none was specified
            if (proto.provides.length === 0) {
                proto.provides.push({ namespace: server.constructor.name, options: {} });
            }

            // Resolve namespace documentation
            for (let provides of proto.provides) {
                const href = provides.options.href || `/docs/${provides.namespace}/:${Rel.Param}`;

                Server.linker.registerDocs(server, provides.namespace, href);

                // Register automatically-generated documentation
                if ((typeof provides.options.auto === 'undefined' && typeof provides.options.href === 'undefined') || provides.options.auto) {
                    app.get(Template.express(href), Server.autodoc(provides.namespace));
                }
            }

            // Resolve server-wide middleware
            for (let middleware of proto.middleware.filter(middleware => !middleware.options.error)) {
                app.use(middleware.handler);
            }

            // Resolve individual routes
            for (let methodName in proto.methods) {
                Server.register(server, proto.methods[methodName][Arguments.Stack], app,

                    // Bind the handler in a promise; Express does not use the return values of its handlers, 
                    // and this allows us to properly catch error results from async methods
                    (req: express.Request, res: express.Response, next: express.NextFunction) =>
                        Promise.resolve(server[methodName](req, res, next)).catch(next)
                );
            }
            
            // Resolve server-wide error-handling middleware
            for (let middleware of proto.middleware.filter(middleware => middleware.options.error)) {
                app.use(middleware.handler);
            }

            // Ensure proper relative href resolution
            Server.linker.setDocsCallback(server, docs => {
                docs.href = relative(app, docs.href!);
                return docs;
            });
            Server.linker.setLinkCallback(server, link => {
                link.href = relative(app, link.href!);
                return link;
            });
        }
        
        return server[Server.App];
    }
    
    // An Express handler which provides HAL links to all discoverable routes
    static discovery(req: express.Request, res: express.Response, next: express.NextFunction) {
        const hal = Response.create({}, path(req), [], req, res);
        for (let server of Server.linker.servers()) {
            const proto = Server.proto(server);
            for (let methodName in proto.methods) {
                for (let provides of proto.methods[methodName][Arguments.Stack].provides) {
                    if (provides.options.discoverable) {
                        hal.link(provides.rel, { server });
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

    export const App = Symbol();
    export const Class = Symbol();
    export const Methods = Symbol();
}
