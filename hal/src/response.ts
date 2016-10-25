/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as halson from 'halson';

import {Server} from './server';
import {Template} from './template';
import {Rel, LinkRelation, Hal} from './constants';
import {hal} from './decorators';

// Conditionally ensure this link or embed is an array, even if it's only a single item
function ensureArray<T>(set: { [rel: string]: T | T[] } = {}, rel: string, ensure?: boolean) {
    let value = set[rel];
    if (ensure && value && !(value instanceof Array)) {
        set[rel] = [value];
    }
}

// Provides HAL functionality to be embedded in an Express response object
export class Response implements hal.Response {
    // Generate a HAL response object, either for the root response object (if root and data are not specified),
    // or an embedded object (in the HAL sense) where root specified the root response and data the embedded body
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

    // Merge a new HAL response object into the given Express response
    static create(server: Object, href: string, links: Rel[], req: express.Request, res: express.Response): express.Response & hal.Response {
        let resource = Response.resource({ server, href, links, params: req.params });
        return Object.assign(res, resource, {
            json: Response.prototype.json.bind(res, res.json.bind(res))
        });
    }
    
    // Initialize a new response object (acts as a constructor)
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

    // Provide a wrapper around the Express response's .json() method to return a HAL response
    json(original: (obj: any) => express.Response, data: any): express.Response {
        ensureArray(_private(this).hal._links, Rel.Curies, true);

        // This method will be bound to an (express.Response & hal.Response) object;
        // update the Express response to return the appropriate response type
        (this as any).type('application/hal+json');

        // HAL responses are just JSON objects with specified properties;
        // we create the actual response by merging in our JSON object
        return original(Object.assign(_private(this).hal, data));
    }

    // Resolve the given rel into fully-defined link objects
    private _resolve(rel: Rel, overrides: hal.Overrides): hal.Overrides[] {
        // Initialize the resolved link from the request
        let base: hal.Overrides = {
            rel: rel,
            params: _private(this).params,
            links: [],
            server: overrides.server || _private(this).server
        };
        
        let links = Server.linker.getLinks(base.server!, base.rel!);

        // If the links failed to resolve, provide a dummy link object in order to ensure
        // that overrides can be proccessed
        return (links.length > 0 ? links : [{}]).map(link => {
            // Splice the automatic link resolution with the overrides
            let resolved = Object.assign({}, base, link, overrides);
            
            // Unless they were overridden, params should be a union of the provided params
            if (!overrides.params) {
                resolved.params = Object.assign({}, base.params, link.params);
            }
            
            // Resolve the real id from explicitly present params
            resolved.id = resolved.id && resolved.params[resolved.id];

            // Normalize the resolved rel; if it was overridden, bypass the server to prevent automatic namespacing
            resolved.rel = resolved.rel && Server.linker.normalize(overrides.rel ? {} : resolved.server || {}, resolved.rel);
            
            return resolved;
        });
    }

    // Add the appropriate documentation links for a fully-resolved link;
    // this should only be called when the link contains a defined rel
    private _docs(resolved: hal.Overrides) {
        let docs = Server.linker.getDocs(resolved.server || {}, resolved.rel!);
        if (docs.name) {
            this.docs(docs.name, docs.href);
        }
    }
    
    // Add a link to the HAL response for the given rel, with any provided overrides
    link(rel: Rel, overrides: hal.Overrides = {}) {
         _private(this).resolve(rel, overrides).forEach(resolved => {
            if (resolved.rel && resolved.href) {
                let str = Rel.stringify(resolved.rel);
                _private(this).docs(resolved);
                _private(this).hal.addLink(str, Template.link(resolved));
                ensureArray(_private(this).hal._links, str, resolved.array);
            } else {
                console.error(`Cannot find rel: ${Rel.stringify(Server.linker.normalize(_private(this).server, rel))}`);
            }
        });
    }
    
    // Add an embedded value to the HAL response for the given rel, with any provided overrides;
    // returns a HAL response object representing the embedded object, for further linking/embedding
    embed(rel: Rel, value: Object, overrides: hal.Overrides = {}): hal.Response {
        let resolved = _private(this).resolve(rel, overrides)[0];
        if (resolved.rel) {
            let str = Rel.stringify(resolved.rel);
            let resource = Response.resource(resolved, _private(this).root, value);
            _private(this).docs(resolved);
            _private(this).hal.addEmbed(str, _private(resource).hal);
            ensureArray(_private(this).hal._embedded, str, resolved.array);
            return resource;
        } else {
            // If we failed to resolve the rel, return a dummy HAL resource object, but do not embed it
            return Response.resource(
                Object.assign({ server: _private(this).server, params: _private(this).params }, overrides),
                _private(this).root, value);
        }
    }
    
    // Add a documentation link to the HAL response
    docs(name: string, href: string) {
        // Add the curie shorthand to the root object if it's not already present
        if (!_private(_private(this).root).hal.getLink(Rel.Curies, (link: Hal.Link) => link.name === name)) {
            // Remove the well-known rel parameter, so that it remains templated
            let params = Object.assign({}, _private(this).params);
            delete params[Rel.Param];

            // Add the documentation link (with fallthrough params from this response)
            _private(_private(this).root).hal.addLink(Rel.Curies, Template.link({
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