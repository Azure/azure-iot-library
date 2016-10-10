/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export enum Method {
    GET,
    PUT,
    POST,
    DELETE,
    PATCH
};

export type Verb = string | Method;

// Well-defined link relations according to http://www.iana.org/assignments/link-relations/link-relations.xhtml
export enum LinkRelation {
    About,
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