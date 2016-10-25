/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Rel} from './constants';
import {hal} from './decorators';

// Obtain the first defined instance of a property
function first<T>(items: Object[], property: string): T {
    const first = items.find(value => typeof value[property] !== 'undefined');
    return first ? first[property] : undefined;
}

// This provides a mechanism for resolving rels across a number of server classes
export class Linker {
    private map: { [name: string]: Object[] };

    constructor() {
        this.map = {};
    }

    // Parse a rel and provide it in a normalized form along with its server class and namespace (if one exists)
    private parse<T>(
        base: Object,
        rel: Rel,
        callback: (server: Object, parsed: Rel, ns: string) => T
    ): T {
        if (typeof rel === 'string') {
            const parts = rel.split(':');

            // If the rel is not namespaced, assume it shares the namespace of this server
            // (if the server object has a default namespace)
            if (parts.length === 1) {
                parts.unshift(Data.from(base).name || '');
            }

            if (parts[0]) {
                // If the rel is namespaced, find the associated server class that provides this namespace and rel
                const server = this.map[parts[0]] && this.map[parts[0]].find(server => !!Data.from(server).links[parts.join(':')]);
                return callback(server || base, parts.join(':'), parts[0]);
            }
        }

        // Rels with unresolvable namespaces fall back to the provided server;
        // default relations cannot be cross-class, because they are not namespaced
        return callback(base, rel, '');
    }
    
    // Parse the provided rel, and map it via a translation callback on each of its routes,
    // providing the registered link data for each route
    handle<T>(
        base: Object,
        rel: Rel,
        callback: (server: Object, route: string, links: hal.Overrides[]) => T
    ): T[] {
        return this.parse(base, rel, (server, parsed) => {
            const routes = Data.from(server).links[parsed];
            return routes ? Object.keys(routes).map(route => {
                return callback(server, route, routes[route]);
            }) : [];
        });
    }
    
    // Parse the provided rel and return it in a normalized form
    normalize(base: Object, rel: Rel): Rel {
        return this.parse(base, rel, (server, parsed) => parsed);
    }

    // Obtain the registered documentation for the namespace of the provided rel (if any)
    getDocs(base: Object, rel: Rel): Linker.Docs {
        return this.parse(base, rel, (server, parsed, ns) => {
            return Data.from(server).docsCb({
                name: ns,
                href: ns && Data.from(server).docs[ns].href
            });
        });
    }
    
    // Obtain the link data registered for the provided rel
    getLinks(base: Object, rel: Rel): hal.Overrides[] {
        return this.handle(base, rel, (server, route, links) => {
            // Merge links for multiple verbs on a single route into one
            return Data.from(server).linkCb({
                server: server,
                
                // All the rels and paths should be the same, so just use the first
                rel: links[0].rel,
                href: links[0].href,

                // Merge the links into a single array, using the Set object to ensure uniqueness
                links: Array.from(new Set(links.reduce<Rel[]>((links, link) => links.concat(link.links || []), []))),
                
                // For these options, prefer the value from the verbs in registration order
                id: first<string>(links, 'id'),
                title: first<string>(links, 'title'),
                
                // Merge params into a single object; in order to keep the same order preference
                // mentioned above, we reverse the array, so that the preferred verbs are applied last
                params: Object.assign({}, ...links.reverse().map(link => link.params || {}))
            });
        });
    }

    // Register a namepace and documentation link to the provided server object
    registerDocs(base: Object, name: string, href: string) {
        Data.initialize(base, name).docs[name] = { name, href };

        // Record this name for cross-class rel linking
        this.map[name] = this.map[name] || [];
        this.map[name].push(base);
    }

    // Register a rel and its href to the provided server object
    registerLink(base: Object, rel: Rel, href: string, overrides: hal.Overrides = {}) {
        let data = Data.initialize(base);
        this.parse(base, rel, (server, parsed, ns) => {
            data.links[parsed] = data.links[parsed] || {};
            data.links[parsed][href] = data.links[parsed][href] || [];
            data.links[parsed][href].push(Object.assign({
                server,
                href,
                rel: parsed
            }, overrides));
        });
    }

    // Provide a post-processing callback for this server to handle its documentation
    setDocsCallback(base: Object, cb: (docs: Linker.Docs) => Linker.Docs) {
        Data.initialize(base).docsCb = cb;
    }

    // Provide a post-processing callback for this server to handle its links
    setLinkCallback(base: Object, cb: (link: hal.Overrides) => hal.Overrides) {
        Data.initialize(base).linkCb = cb;
    }

    // Provide a list of all server objects registered to this linker
    servers(): Object[] {
        return Array.from(new Set(Object.keys(this.map).reduce<Object[]>((all, name) => all.concat(this.map[name]), [])));
    }
}

export namespace Linker {
    export interface Docs {
        name: string;
        href: string;
    }
}

interface Data {
    links: { [rel: string]: Data.Rel, [rel: number]: Data.Rel };
    docs: { [name: string]: Linker.Docs };
    linkCb: (link: hal.Overrides) => hal.Overrides;
    docsCb: (docs: Linker.Docs) => Linker.Docs;
    name?: string;
}

namespace Data {
    const Embedded = Symbol();

    export type Rel = { [route: string]: hal.Overrides[] };

    // Obtain embedded linker data for this server object (if present),
    // or defaults if this server has not been registered
    export function from(target: Object): Data {
        return target[Embedded] || { links: {}, docs: {}, linkCb: i => i, docsCb: i => i };
    }

    // Initialize and return linker data for this server object
    export function initialize(target: Object, name?: string): Data {
        target[Embedded] = from(target);
        target[Embedded].name = target[Embedded].name || name;
        return target[Embedded];
    }
}