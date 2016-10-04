/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as http from 'http';
import * as url from 'url';

import {LinkRelation, Rel} from './constants';
import {Response, templatize} from './response';
import {route, provides, middleware, hal} from './decorators'; 

export interface Namespace {
    name: string;
    href: string;
    auto?: boolean;
}

function relative(app: express.Application, href: string): string {
    return href && href[0] === '/' ? app.path().replace(/\/+$/, '') + href : href;
}

function path(req: express.Request): string {
    return url.parse(req.originalUrl).path;
}

export type Provider = { method: Server.Method, provides: Server.Method.Provides };

export class Server {
    private static _map: { [name: string]: Server } = {};

    private static _parseRel<T>(
        server: Server,
        rel: Rel,
        callback: (server: Server, parsed: string, ns: string) => T
    ): T {
        if (typeof rel === 'string') {
            let parts = rel.split(':');
            if (parts.length === 1) {
                // If the rel is not namespaced, assume it is owned by this server (if one was provided)
                return callback(server, (server && _static(server).name ? _static(server).name + ':' : '') + parts[0], '');
            } else {
                // If it is namespaced, find the associated server class
                return callback(Server._map[parts[0]] || server, rel, parts[0]);
            }
        } else {
            // Default relations cannot be cross-class, because they are not namespaced
            return callback(server, LinkRelation[rel], null);
        }
    }
    
    private static _handleRel<T>(
        base: Server,
        rel: Rel,
        callback: (server: Server, route: string, rels: Provider[]) => T
    ): T[] {
        return Server._parseRel(base, rel, (server, parsed) => {
            let routes = server && _private(server).rels[parsed];
            return routes && Object.keys(routes).map(route => {
                return callback(server, route,
                    http.METHODS.map(verb => routes[route][verb]).filter(rel => !!rel));
            });
        });
    }
    
    static relNamespace(base: Server, rel: Rel): Namespace {
        return Server._parseRel(base, rel, (server, parsed, ns) => {
            return server && ns ? {
                name: ns,
                href: relative(_private(server).app, _static(server).docs[ns].href)
            } : null;
        });
    }
    
    static relLinks(base: Server, rel: Rel): hal.Overrides[] {
        return Server._handleRel(base, rel, (server, route, rels) => {
            // Merge links for multiple verbs on a single route into one
            return {
                server: server,
                
                // All the rels and paths should be the same, so just use the first
                rel: rels[0].provides.rel,
                href: relative(_private(server).app, rels[0].method.route.path),

                // Merge the links into a single array, using the Set object to ensure uniqueness
                links: Array.from(new Set(rels.reduce<Rel[]>((links, rel) => links.concat(rel.method.hal.links), []))),
                
                // For these options, prefer the value from the verbs in alphabetical order
                id: rels[0].provides.options.id,
                title: rels[0].provides.options.title,
                
                // Merge params into a single object; in order to keep the same order preference
                // mentioned above, we reverse the array, so that the preferred verbs are applied last
                params: Object.assign({}, ...rels.reverse().map(rel => rel.provides.options.params || {}))
            };
        });
    }
    
    static relNormalize(base: Server, rel: Rel): string {
        return Server._parseRel(base, rel, (server, parsed, ns) => {
            return ns !== null ? parsed :
                parsed.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
        });
    }
    
    static instance(target: Object): Server {
        if (!target[Server.Private]) {
            target[Server.Private] = <Server.Private>{
                methods: {},
                rels: {},
                app: express(),
                routed: false
            };
        }
        return target;
    }
    
    static class(target: Function): Server.Static {
        if (!target[Server.Private]) {
            target[Server.Private] = <Server.Static>{
                name: null,
                docs: {},
                middleware: { before: [], after: [] }
            };
        }
        return target[Server.Private];
    }
    
    static method(target: Object, method: string | symbol, handler?: express.RequestHandler): Server.Method {
        let server = Server.instance(target);
        
        // Initialize the route with default values if it does not already exist
        if (!_private(server).methods[method] && handler) {
            _private(server).methods[method] = {
                route: { verb: null, path: null },
                provides: [],
                middleware: [],
                hal: { links: [], options: {}, handler: false },
                handler: handler,
            };
        }
    
        return _private(server).methods[method];
    }
    
    private static _autodoc(ns: string): express.RequestHandler {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (!req.params.rel) {
                res.sendStatus(404);
            }
            let doc = '';
            Server._handleRel(null, ns + ':' + req.params.rel, (server, route, rels) => {
                doc += `<h1>${route}</h1>`;
                rels.forEach(rel => {
                    if (rel.provides.options.description) {
                        doc += `<h2>${rel.method.route.verb}</h2>`;
                        doc += `<p>${rel.provides.options.description}</p>`;
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
    
    static route(target: Object): express.Application {
        let server = Server.instance(target);
        
        if (!_private(server).routed) {
            _static(server).middleware.before.forEach(middleware => _private(server).app.use(middleware));
            
            for (let methodName of Object.keys(_private(server).methods)) {
                let method = _private(server).methods[methodName];
                
                // If this route provides rels, map them to our rels for quick access
                for (let i = 0; i < method.provides.length; i++) {
                    let provides = method.provides[i];
                    let path = templatize(method.route.path, provides.options.params);
                    Server._parseRel(server, provides.rel, (server, parsed, ns) => {
                        if (!_private(server).rels[parsed]) {
                            _private(server).rels[parsed] = {};
                        }
                        if (!_private(server).rels[parsed][path]) {
                            _private(server).rels[parsed][path] = {};
                        }
                        _private(server).rels[parsed][path][method.route.verb] = {
                            method: method,
                            provides: provides
                        };
                        provides.rel = ns !== null ? parsed : provides.rel;
                    });
                }

                // If this method requires a 'self' rel and does not already have one, add it to the start of its list of rels
                if (((typeof method.hal.options.self === 'undefined' && method.route.verb === 'GET') || method.hal.options.self)
                    && method.hal.links.indexOf(LinkRelation.Self) < 0) {
                    method.hal.links.unshift(LinkRelation.Self);
                }
                
                // If this is a HAL handler, override the original method on the API so that the response
                // can be replaced with a class that will return a HAL response
                if (method.hal.handler) {
                    let hal = method.handler;
                    method.handler = function (req: express.Request, res: express.Response, next: express.NextFunction) {
                        let handler: Server.Method = _private(this).methods[methodName];
                        return hal.call(this, req, Response.create(this, path(req), handler.hal.links, req, res), next);
                    };
                    method.hal.handler = false;
                }
                
                // Method is type of Method (enum), convert back to string for express
                if (_private(server).app[method.route.verb.toLowerCase()]) {
                    // Reduce the full route to its path portion; HAL supports templated query parameters,
                    // but Express does not
                    let path = url.parse(method.route.path).pathname;

                    // Bind the handler in a promise; Express does not use the return values of its handlers, 
                    // and this allows us to properly catch error results from async methods
                    let handler = ((handler: express.RequestHandler) => 
                        (req: express.Request, res: express.Response, next: express.NextFunction) =>
                            Promise.resolve(handler(req, res, next)).catch(next)
                    )(method.handler.bind(server));

                    _private(server).app[method.route.verb.toLowerCase()].call(_private(server).app,
                        path, method.middleware, handler);
                } else {
                    console.error(`${method.route.verb} is not a valid HTTP method.`);
                }
            }
            
            for (let ns of Object.keys(_static(server).docs)) {
                let docs = _static(server).docs[ns];
                
                // Record this name for cross-class rel linking
                Server._map[docs.name] = server;
                
                // Register automatically-generated documentation
                if (docs.auto) {
                    _private(server).app.get(docs.href, Server._autodoc(docs.name));
                }
            }
            
            _static(server).middleware.after.forEach(middleware => _private(server).app.use(middleware));
            
            _private(server).routed = true;
        }
        
        return _private(server).app;
    }
    
    static discovery(req: express.Request, res: express.Response, next: express.NextFunction) {
        let hal = Response.create(null, path(req), [], req, res);
        (new Set(Object.keys(Server._map).map(name => Server._map[name]))).forEach(server => {
            for (let methodName of Object.keys(_private(server).methods)) {
                for (let provides of _private(server).methods[methodName].provides) {
                    if (provides.options.discoverable) {
                        hal.link(provides.rel, { server: server });
                    }
                }
            }
        });
        hal.json({});
    };
}

export namespace Server {
    export namespace Method {
        export type Route = { verb: string, path: string };
        export type Provides = { rel: Rel, options: provides.Options.Rel };
        export type Hal = { links: Rel[], options: hal.Options, handler: boolean };
    }
    export interface Method {
        route: Method.Route;
        provides: Method.Provides[];
        middleware: express.RequestHandler[];
        hal: Method.Hal;
        handler: express.RequestHandler;
    }
    export interface Private {
        methods: { [method: string]: Method };
        rels: { [rel: string]: { [route: string]: { [verb: string]: Provider } } };
        app: express.Application;
        routed: boolean;
    };
    export interface Static {
        docs: { [name: string]: Namespace };
        middleware: { before: express.RequestHandler[], after: express.ErrorRequestHandler[] };
        name: string;
    }
    export const Private = Symbol();
}

function _private(server: Server): Server.Private {
    return server[Server.Private];
}

function _static(server: Server): Server.Static {
    return server.constructor[Server.Private];
}
