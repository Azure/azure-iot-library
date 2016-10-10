/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as pathToRegexp from 'path-to-regexp';

import {Hal} from './constants';
import {hal} from './decorators';

export class Template {
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
        return Template.decode(pathToRegexp.compile(href)(
            Object.assign(Template.params(href), params)
        ));
    }

    static link(resolved: hal.Overrides): Hal.Link {
        let link: Hal.Link = { href: resolved.href };
        if (resolved.href && resolved.params) {
            // Create templates for all undefined params and fully resolve the href
            link.href = Template.apply(resolved.href, resolved.params);
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
}