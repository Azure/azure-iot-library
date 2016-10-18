/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as url from 'url';
import * as pathToRegexp from 'path-to-regexp';

import {Hal} from './constants';
import {hal} from './decorators';

export class Template {
    // This matches operators (level 2) and explode variables (level 4)
    // in order to catch the Express conversions returned by Template.params,
    // even though for actual URI templates we only support level-1 behavior
    private static parse = /\{\W?(\w+)*?\}/g;

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
        return href.replace(/%7B(.+)%7D/, param => decodeURIComponent(param));
    }

    static apply(href: string, params: any): string {
        if (Template.is(href)) {
            // Handle URI template (level 1)
            return href.replace(Template.parse, (match, variable) =>
                typeof params[variable] !== 'undefined' ? params[variable] : match);
        } else {
            // Handle Express-style path
            return Template.decode(pathToRegexp.compile(href)(
                Object.assign(Template.params(href), params)
            ));
        }
    }

    static is(href: string): boolean {
        return Template.parse.test(href);
    }

    static link(resolved: hal.Overrides): Hal.Link {
        let link: Hal.Link = { href: resolved.href };
        if (resolved.href && resolved.params) {
            // Create templates for all undefined params and fully resolve the href
            link.href = Template.apply(resolved.href, resolved.params);
        }
        if (Template.is(link.href)) {
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
        let route = href.replace(Template.parse, (match, variable) => `:${variable}`);

        // Reduce the full route to its path portion; URI templates support templated query parameters,
        // but Express does not, and since URI templates do not support optional parameters, this will
        // not interfere with any Express syntax
        return url.parse(route).pathname;
    }
}