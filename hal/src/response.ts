/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as halson from 'halson';

import {Server} from './server';
import {Linker} from './linker';
import {Template} from './template';
import {Rel, LinkRelation, Hal} from './constants';
import {hal} from './decorators';

const CURIES = 'curies';

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

    static create(server: Object, href: string, links: Rel[], req: express.Request, res: express.Response): express.Response & hal.Response {
        let resource = Response.resource({ server, href, links, params: req.params });
        return Object.assign(res, resource, {
            json: Response.prototype.json.bind(res, res.json.bind(res))
        });
    }
    
    private _initialize(resolved: hal.Overrides) {
        // Add all of the default links
        if (resolved.links) {
            for (let link of resolved.links) {
                if (link === LinkRelation.Self) {
                    _private(this).hal.addLink('self', Template.link(resolved));
                } else {
                    this.link(link);
                }
            }
        }
    }

    json(original: (obj: any) => express.Response, data: any): express.Response {
        ensureArray(_private(this).hal._links, CURIES, true);

        // This method will be bound to an (express.Response & hal.Response) object;
        // update the Express response to return the appropriate response type
        (this as any).type('application/hal+json');

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
        
        let links = Linker.getLinks(base.server, base.rel) || [{}];

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
            resolved.rel = Linker.normalize(overrides.rel ? null : resolved.server, resolved.rel);
            
            return resolved;
        });
    }

    private _docs(resolved: hal.Overrides) {
        let docs = Linker.getDocs(resolved.server, resolved.rel);
        if (docs) {
            this.docs(docs.name, docs.href);
        }
    }
    
    link(rel: Rel, overrides?: hal.Overrides) {
        overrides = overrides || {};
         _private(this).resolve(rel, overrides).forEach(resolved => {
            if (resolved.rel && resolved.href) {
                _private(this).docs(resolved);
                _private(this).hal.addLink(resolved.rel.toString(), Template.link(resolved));
                ensureArray(_private(this).hal._links, resolved.rel, overrides.array);
            } else {
                console.error(`Cannot find rel: ${Linker.normalize(_private(this).server, rel)}`);
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
            // Remove the well-known rel parameter, so that it remains templated
            let params = Object.assign({}, _private(this).params);
            delete params[Rel.Param];

            _private(_private(this).root).hal.addLink(CURIES, Template.link({
                href: href,
                id: name,
                params
            }));
        }
    }
}

export namespace Response {
    export interface Private {
        server: Object;
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