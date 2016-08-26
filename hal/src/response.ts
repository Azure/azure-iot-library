/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as halson from 'halson';
// These typings are not up-to-date, so we have to cast pathToRegexp to 'any' to use 'parse' and 'compile'
import * as pathToRegexp from 'path-to-regexp';

import {Server} from './server';
import {Rel, LinkRelation, Hal} from './constants';
import {hal} from './decorators';

const CURIES = 'curies';

function templateParams(href: string) {
    let params: { [param: string]: string } = {};
    let parsed = (<any>pathToRegexp).parse(href);
    for (let param of parsed) {
        if (param.repeat) {
            params[param.name] = `{${param.delimiter}${param.name}*}`;
        } else {
            params[param.name] = `{${param.name}}`;
        }
    }
    return params;
}

function templateDecode(href: string): string {
    return href.replace(/%7B(.+)%7D/, param => decodeURIComponent(param));
}

export function templatize(href: string, params: any): string {
    return templateDecode((<any>pathToRegexp).compile(href)(
        Object.assign(templateParams(href), params)
    ));
}

function templateLink(resolved: hal.Overrides): Hal.Link {
    let link: Hal.Link = { href: resolved.href };
    if (resolved.href && resolved.params) {
        // Create templates for all undefined params and fully resolve the href
        link.href = templatize(resolved.href, resolved.params);
    }
    if (/\{.+\}/.test(link.href)) {
        // Since the default of templated is false, we only want it set at all if it is true
        link.templated = true;
    }
    if (resolved.id) {
        link.name = resolved.id;
    }
    if (resolved.title) {
        link.title = resolved.title;
    }
    return link;
}

function ensureArray<T>(set: { [rel: string]: T | T[] }, rel: Rel, ensure: boolean) {
    // Conditionally ensure this link or embed is an array, even if it's only a single item
    let value = set && set[rel];
    if (ensure && value && !(value instanceof Array)) {
        set[rel] = [value];
    }
}

export class Response implements hal.Response {
    private static resource(resolved: hal.Overrides, root?: hal.Response, data?: any): hal.Response {
        let res = {};

        res[Response.Private] = <Response.Private>{
            server: resolved.server,
            params: resolved.params,
            hal: halson(data || {}),
            root: root || res,
            resolve: Response.prototype._resolve.bind(res),
            docs: Response.prototype._docs.bind(res)
        };
        
        let resource = Object.assign(res, {
            link: Response.prototype.link.bind(res),
            embed: Response.prototype.embed.bind(res),
            docs: Response.prototype.docs.bind(res)
        });
        
        Response.prototype._initialize.bind(res)(resolved);
        
        return resource;
    }

    static create(server: Server, href: string, links: Rel[], req: express.Request, res: express.Response): express.Response & hal.Response {
        let resource = Response.resource({ server, href, links, params: req.params });
        return Object.assign(res, resource, {
            json: Response.prototype.json.bind(resource, res.json.bind(res))
        });
    }
    
    private _initialize(resolved: hal.Overrides) {
        // Add all of the default links
        if (resolved.links) {
            for (let link of resolved.links) {
                if (link === LinkRelation.Self) {
                    _private(this).hal.addLink('self', templateLink(resolved));
                } else {
                    this.link(link);
                }
            }
        }
    }

    json(original: express.Send, data: any): express.Response {
        ensureArray(_private(this).hal._links, CURIES, true);

        // HAL responses are just JSON objects with specified properties;
        // we create the actual response by merging in our JSON object
        return original(Object.assign(_private(this).hal, data));
    }

    private _resolve(rel: Rel, overrides: hal.Overrides): hal.Overrides[] {
        // Initialize the resolved link from the request
        let base: hal.Overrides = {
            rel: rel,
            params: _private(this).params,
            links: [],
            server: overrides.server || _private(this).server
        };
        
        let links = Server.relLinks(base.server, base.rel) || [{}];

        return links.map(link => {
            // Splice the automatic link resolution with the overrides
            let resolved = Object.assign({}, base, link, overrides);
            
            // Unless they were overridden, params should be a union of the provided params
            if (!overrides.params) {
                resolved.params = Object.assign({}, base.params, link.params);
            }
            
            // Resolve the real id from explicitly present params
            resolved.id = resolved.id && resolved.params[resolved.id];

            // Normalize the resolved rel; if it was overridden, bypass the server to prevent automatic namespacing
            resolved.rel = Server.relNormalize(overrides.rel ? null : resolved.server, resolved.rel);
            
            return resolved;
        });
    }

    private _docs(resolved: hal.Overrides) {
        let docs = Server.relNamespace(resolved.server, resolved.rel);
        if (docs) {
            this.docs(docs.name, docs.href);
        }
    }
    
    link(rel: Rel, overrides?: hal.Overrides) {
        overrides = overrides || {};
         _private(this).resolve(rel, overrides).forEach(resolved => {
            if (resolved.rel && resolved.href) {
                _private(this).docs(resolved);
                _private(this).hal.addLink(resolved.rel.toString(), templateLink(resolved));
                ensureArray(_private(this).hal._links, resolved.rel, overrides.array);
            } else {
                console.error(`Cannot find rel: ${Server.relNormalize(_private(this).server, rel)}`);
            }
        });
    }
    
    embed(rel: Rel, value: Object, overrides?: hal.Overrides): hal.Response {
        overrides = overrides || {};
        let resolved = _private(this).resolve(rel, overrides)[0];
        if (resolved.rel) {
            let resource = Response.resource(resolved, _private(this).root, value);
            _private(this).docs(resolved);
            _private(this).hal.addEmbed(resolved.rel.toString(), _private(resource).hal);
            ensureArray(_private(this).hal._embedded, resolved.rel, overrides.array);
            return resource;
        } else {
            return Response.resource(
                Object.assign({ server: _private(this).server, params: _private(this).params }, overrides),
                _private(this).root, value);
        }
    }
    
    docs(name: string, href: string) {
        // Add the curie shorthand to the root object if it's not already present
        if (!_private(_private(this).root).hal.getLink(CURIES, (link: Hal.Link) => link.name === name)) {
            _private(_private(this).root).hal.addLink(CURIES, templateLink({
                href: href,
                id: name,
                params: {}
            }));
        }
    }
}

export namespace Response {
    export interface Private {
        server: Server;
        params: any;
        hal: halson.HALSONResource & Hal.Resource;
        root: hal.Response;
        resolve(rel: Rel, overrides: hal.Overrides): hal.Overrides[];
        docs(resolved: hal.Overrides): void;
    }
    export const Private = Symbol();
}

function _private(response: hal.Response): Response.Private {
    return response[Response.Private];
}