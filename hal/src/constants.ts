/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as url from 'url';

import {provides} from './decorators';

// Most common HTTP verbs, provided as a convenience
export enum Method {
    GET = 1,
    PUT,
    POST,
    DELETE,
    PATCH
};

export type Verb = string | Method;

export namespace Verb {
    export function stringify(verb: Verb): string {
        return typeof verb === 'string' ? verb.toUpperCase() : Method[verb];
    }
}

// Well-defined link relations according to http://www.iana.org/assignments/link-relations/link-relations.xhtml
export enum LinkRelation {
    About = 1,
    Alternate,
    Appendix,
    Archives,
    Author,
    BlockedBy,
    Bookmark,
    Canonical,
    Chapter,
    Collection,
    Contents,
    Copyright,
    CreateForm,
    Current,
    Derivedfrom,
    Describedby,
    Describes,
    Disclosure,
    DnsPrefetch,
    Duplicate,
    Edit,
    EditForm,
    EditMedia,
    Enclosure,
    First,
    Glossary,
    Help,
    Hosts,
    Hub,
    Icon,
    Index,
    Item,
    Last,
    LatestVersion,
    License,
    Lrdd,
    Memento,
    Monitor,
    MonitorGroup,
    Next,
    NextArchive,
    Nofollow,
    Noreferrer,
    Original,
    Payment,
    Pingback,
    Preconnect,
    PredecessorVersion,
    Prefetch,
    Preload,
    Prerender,
    Prev,
    Preview,
    Previous,
    PrevArchive,
    PrivacyPolicy,
    Profile,
    Related,
    Replies,
    Search,
    Section,
    Self,
    Service,
    Start,
    Stylesheet,
    Subsection,
    SuccessorVersion,
    Tag,
    TermsOfService,
    Timegate,
    Timemap,
    Type,
    Up,
    VersionHistory,
    Via,
    WorkingCopy,
    WorkingCopyOf
}

export type Rel = string | LinkRelation;

export namespace Rel {
    // The well-defined parameter name for CURIE documentation shorthands
    export const Param = 'rel';

    // The well-defined rel name for CURIEs
    export const Curies = 'curies';

    // Convert the rel into a string form
    export function stringify(rel: Rel): string {
        return typeof rel === 'string' ? rel : LinkRelation[rel].replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
    }
}

export type Href = string | url.Url;

export namespace Href {
    export function stringify(href: Href): string {
        return typeof href === 'string' ? href : url.format(href);
    }
}

// Type definitions for a HAL response object
export namespace Hal {
    export interface Link {
        href: string;
        templated?: boolean;
        type?: string;
        deprecation?: string;
        name?: string;
        profile?: string;
        title?: string;
        hreflang?: string;
    }
    
    export type Links = { [rel: string]: Link | Link[] }
    
    export type Embedded = { [rel: string]: Resource | Resource[] }
    
    export interface Resource {
        _links?: Links;
        _embedded?: Embedded;
    }
}

export interface Template {
    ns?: string;
    rel?: string;
    routes?: Template.Route[];
}

export namespace Template {
    export interface Route {
        href: string;
        methods: Method[];
    }

    export interface Method {
        verb: string;
        options: provides.Options.Rel;
    }
}