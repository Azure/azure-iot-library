/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {hal} from './decorators';
import {Rel, Hal} from './constants';
import {Server} from './server';
import {Response} from './response';
import {Template} from './template';

export function Utility(server: Object): Utility.Server {
    return {
        links: ServerUtility.links.bind(server),
        href: ServerUtility.href.bind(server)
    };
}

class ServerUtility {
    static links(this: Object, rel: Rel, overrides?: hal.Overrides): Hal.Link[] {
        return Response.resolve(this, rel, {}, overrides || {}).map(resolved => Template.link(resolved));
    }

    static href(this: Object, rel: Rel, params?: any): string {
        const links = Response.resolve(this, rel, {}, params ? { params } : {}).map(resolved => Template.link(resolved));
        return (links.find(link => link[Server.Link.Discoverable]) || links[0]).href;
    }
}

export namespace Utility {
    export interface Server {
        links(rel: Rel, params?: any): Hal.Link[];
        href(rel: Rel, params?: any): string;
    }

    export function template(href: string, params: any): string {
        return Template.apply(href, params);
    }

    export function hrefs(body: Hal.Resource, rel: Rel, params?: any): string[] | undefined {
        const links = body._links && body._links[Rel.stringify(rel)];
        return links && (Array.isArray(links) ? links : [links])
            .map(params ? link => Template.apply(link.href, params) : link => link.href);
    }
}

export default Utility;