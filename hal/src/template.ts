/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as url from 'url';
import * as pathToRegexp from 'path-to-regexp';

import {Hal} from './constants';
import {hal} from './decorators';

export class Template {
    // Test a level-1 templated link and extract parameter names
    private static l1 = /\{(\w+)\}/g;

    // This is overly-permissive for actual level-4 parsing, but it is
    // only used to test whether or not a link contains a templated href
    private static l4 = /\{\W?([\w\:\*\,]+)\}/g;

    // Generate a parameters object from an Express path containing
    // template parameters for each Express parameter
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

    // Decode any template parameters that were encoded by Express parameter handling
    private static decode(href: string): string {
        return href.replace(/%7B.+?%7D/g, param => decodeURIComponent(param));
    }

    // Apply the given parameters to the templated path,
    // and return a partial template for any missing parameters
    static apply(href: string, params: any): string {
        if (href.search(Template.l1) >= 0) {
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

    // Convert an internal link object to a HAL link
    static link(resolved: hal.Overrides): Hal.Link {
        // If the href is a Url object, we need to translate it back into a string;
        // we also have to decode the template, in case it was encoded during href parsing
        let link: Hal.Link = {
            href: typeof resolved.href === 'string' ?
                resolved.href :
                Template.decode(url.format(resolved.href || {}))
        };
        if (resolved.params) {
            // Create templates for all undefined params and fully resolve the href
            link.href = Template.apply(link.href, resolved.params);
        }
        if (link.href.search(Template.l4) >= 0) {
            // Since the default of templated is false, we only want it set at all if it is true
            link.templated = true;
        }
        if (resolved.id) {
            link.name = resolved.id;
        }
        if (resolved.title) {
            link.title = resolved.title;
        }
        for (let symbol of Object.getOwnPropertySymbols(resolved)) {
            // Copy all symbols, to allow propagation of hidden information
            link[symbol] = resolved[symbol];
        }
        return link;
    }

    // Convert a templated URI into the nearest-possible templated Express path 
    static express(href: string): string {
        // If this is not a templated URI, pass it through
        if (href.search(Template.l1) < 0) {
            return href;
        }

        let route = href.replace(Template.l1, (match, variable) => `:${variable}`);

        // Reduce the full route to its path portion; URI templates support templated query parameters,
        // but Express does not, and since URI templates do not support optional parameters, this will
        // not interfere with any Express syntax
        return url.parse(route).pathname!;
    }
}