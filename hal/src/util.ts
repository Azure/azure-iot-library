/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {hal} from './decorators';
import {Rel, Hal} from './constants';
import {Server} from './server';
import {Response} from './response';
import {Template} from './template';

export function Util(server: Object): Util.Server {
    return {
        links: ServerUtil.links.bind(server),
        href: ServerUtil.href.bind(server)
    };
}

class ServerUtil {
    static links(this: Object, rel: Rel, overrides?: hal.Overrides): Hal.Link[] {
        return Response.resolve(this, rel, {}, overrides || {}).map(resolved => Template.link(resolved));
    }

    static href(this: Object, rel: Rel, params?: any): string {
        const links = Response.resolve(this, rel, params || {}, {}).map(resolved => Template.link(resolved));
        return (links.find(link => link[Server.Link.Discoverable]) || links[0]).href;
    }
}

export namespace Util {
    export interface Server {
        links(rel: Rel, params?: any): Hal.Link[];
        href(rel: Rel, params?: any): string;
    }

    export function resolve(template: string, params: any): string {
        return Template.apply(template, params);
    }

    export function links(body: Hal.Resource, rel: Rel): Hal.Link[] | undefined {
        const links = body._links && body._links[Rel.stringify(rel)];
        return links && (Array.isArray(links) ? links : [links]);
    }

    export function href(body: Hal.Resource, rel: Rel, params?: any): string | undefined {
        const links = Util.links(body, rel);
        return links && links[0] && (params ? Template.apply(links[0].href, params) : links[0].href);
    }
}

export default Util;