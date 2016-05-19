/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Informational event at the page level.
// pageName	Friendly and unique name of the page upon which page metrics will be calculated; should be in English and useful in reporting/visualization; must be unique per application space
// uri	Fully qualified page URI or URL; okay to include query strings and page parameters
// referrerUri	Fully qualified page URI or URL of the referring page; if unknown, leave blank
// pageLoadTime	Time taken to load the page on client side.
// sessionId	A GUID assigned to a specific session useful for grouping views (and clicks) to that session.
// timeSinceLastEvent	Time difference between last and current event.
// userName	User name
// userAgent	User agent information generally from a web request
// browser	Extraction from userAgent string for simpler querying
// location	Anything that allows us to determine at least the origin country of the request

import {PageCommon} from './pageCommon';
import * as EventField from './eventField';

export class PageView extends PageCommon {
    private eventType: string = EventField.EventType[EventField.EventType.PageView];
    constructor(public pageName: string,
        public uri: string,
        public sessionId?: string,
        public timeSinceLastEvent?: number,
        public userName?: string,
        public userAgent?: string,
        public browser?: string,
        public location?: string,
        public referrerUri?: string,
        public pageLoadTime?: number

    ) {
        super(pageName, uri, sessionId, timeSinceLastEvent, userName, userAgent, browser, location);
    }
}
