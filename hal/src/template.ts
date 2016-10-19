/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as url from 'url';
import * as pathToRegexp from 'path-to-regexp';

import {Hal} from './constants';
import {hal} from './decorators';

export class Template {
    private static l1 = /\{(\w+)\}/g;

    // This is overly-permissive for actual level-4 parsing, but it is
    // only used to test whether or not a link contains a templated href
    private static l4 = /\{\W?([\w\:\*\,]+)\}/g;

    private static params(href: string) {
        let params: { [param: string]: string } = {};
        const parsed = pathToRegexp.parse(href);
        for (let token of parsed) {
            let param = token as pathToRegexp.Key;
            if (param.repeat) {
                params[param.name] = `{${param.delimiter}${param.name}*}`;
            } else {
                params[param.name] = `{${param.name}}`;
            }
        }
        return params;
    }

    private static decode(href: string): string {
        return href.replace(/%7B.+?%7D/g, param => decodeURIComponent(param));
    }

    static apply(href: string, params: any): string {
        if (Template.l1.test(href)) {
            // Handle URI template
            return href.replace(Template.l1, (match, variable) =>
                typeof params[variable] !== 'undefined' ? params[variable] : match);
        } else {
            // Handle Express-style path
            return Template.decode(pathToRegexp.compile(href)(
                Object.assign(Template.params(href), params)
            ));
        }
    }

    static link(resolved: hal.Overrides): Hal.Link {
        let link: Hal.Link = { href: resolved.href };
        if (resolved.href && resolved.params) {
            // Create templates for all undefined params and fully resolve the href
            link.href = Template.apply(resolved.href, resolved.params);
        }
        if (Template.l4.test(link.href)) {
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

    static express(href: string): string {
        // If this is not a templated URI, pass it through
        if (!Template.l1.test(href)) {
            return href;
        }

        let route = href.replace(Template.l1, (match, variable) => `:${variable}`);

        // Reduce the full route to its path portion; URI templates support templated query parameters,
        // but Express does not, and since URI templates do not support optional parameters, this will
        // not interfere with any Express syntax
        return url.parse(route).pathname;
    }
}