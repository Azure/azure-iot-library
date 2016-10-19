import {LinkRelation, Rel} from './constants';
import {hal} from './decorators';

function first<T>(items: Object[], property: string): T {
    const first = items.find(value => typeof value[property] !== 'undefined');
    return first ? first[property] : undefined;
}

export class Linker {
    private static map: { [name: string]: Object[] } = {};

    private static parse<T>(
        base: Object,
        rel: Rel,
        callback: (server: Object, parsed: string, ns: string) => T
    ): T {
        if (typeof rel === 'string') {
            const parts = rel.split(':');

            // If the rel is not namespaced, assume it shares the namespace of this server (if one was provided)
            if (parts.length === 1) {
                parts.unshift(base && Data.from(base).name);
            }

            if (parts[0]) {
                // If the rel is namespaced, find the associated server class that provides this namespace and rel
                const server = Linker.map[parts[0]] && Linker.map[parts[0]].find(server => !!Data.from(server).links[parts.join(':')]);
                return callback(server || base, parts.join(':'), parts[0]);
            } else {
                // Fall back to the provided server
                return callback(base, parts[1], '');
            }
        } else {
            // Default relations cannot be cross-class, because they are not namespaced
            return callback(base, LinkRelation[rel], null);
        }
    }
    
    static handle<T>(
        base: Object,
        rel: Rel,
        callback: (server: Object, route: string, links: hal.Overrides[]) => T
    ): T[] {
        return Linker.parse(base, rel, (server, parsed) => {
            const routes = server && Data.from(server).links[parsed];
            return routes && Object.keys(routes).map(route => {
                return callback(server, route, routes[route]);
            });
        });
    }
    
    static normalize(base: Object, rel: Rel): string {
        return Linker.parse(base, rel, (server, parsed, ns) => {
            return ns !== null ? parsed :
                parsed.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
        });
    }

    static getDocs(base: Object, rel: Rel): Linker.Docs {
        return Linker.parse(base, rel, (server, parsed, ns) => {
            return server && ns ? Data.from(server).docsCb({
                name: ns,
                href: Data.from(server).docs[ns].href
            }) : null;
        });
    }
    
    static getLinks(base: Object, rel: Rel): hal.Overrides[] {
        return Linker.handle(base, rel, (server, route, links) => {
            // Merge links for multiple verbs on a single route into one
            return Data.from(server).linkCb({
                server: server,
                
                // All the rels and paths should be the same, so just use the first
                rel: links[0].rel,
                href: links[0].href,

                // Merge the links into a single array, using the Set object to ensure uniqueness
                links: Array.from(new Set(links.reduce<Rel[]>((links, link) => links.concat(link.links), []))),
                
                // For these options, prefer the value from the verbs in registration order
                id: first<string>(links, 'id'),
                title: first<string>(links, 'title'),
                
                // Merge params into a single object; in order to keep the same order preference
                // mentioned above, we reverse the array, so that the preferred verbs are applied last
                params: Object.assign({}, ...links.reverse().map(link => link.params || {}))
            });
        });
    }

    static registerDocs(base: Object, name: string, href: string) {
        Data.initialize(base, name).docs[name] = { name, href };

        // Record this name for cross-class rel linking
        Linker.map[name] = Linker.map[name] || [];
        Linker.map[name].push(base);
    }

    static registerLink(base: Object, rel: Rel, href: string, overrides: hal.Overrides = {}) {
        let data = Data.initialize(base);
        Linker.parse(base, rel, (server, parsed, ns) => {
            data.links[parsed] = data.links[parsed] || {};
            data.links[parsed][href] = data.links[parsed][href] || [];
            data.links[parsed][href].push(Object.assign({
                server,
                href,
                rel: ns !== null ? parsed : rel
            }, overrides));
        });
    }

    static setDocsCallback(base: Object, cb: (docs: Linker.Docs) => Linker.Docs) {
        Data.initialize(base).docsCb = cb;
    }

    static setLinkCallback(base: Object, cb: (link: hal.Overrides) => hal.Overrides) {
        Data.initialize(base).linkCb = cb;
    }

    static servers(): Object[] {
        return Array.from(new Set(Object.keys(Linker.map).reduce((all, name) => all.concat(Linker.map[name]), [])));
    }
}

export namespace Linker {
    export interface Docs {
        name: string;
        href: string;
    }
}

interface Data {
    links: { [rel: string]: { [route: string]: hal.Overrides[] } };
    docs: { [name: string]: Linker.Docs };
    linkCb: (link: hal.Overrides) => hal.Overrides;
    docsCb: (docs: Linker.Docs) => Linker.Docs;
    name?: string;
}

namespace Data {
    const Embedded = Symbol();

    export function from(target: Object): Data {
        return target[Embedded] || { links: {}, docs: {}, linkCb: i => i, docsCb: i => i };
    }

    export function initialize(target: Object, name?: string): Data {
        target[Embedded] = from(target);
        target[Embedded].name = target[Embedded].name || name;
        return target[Embedded];
    }
}