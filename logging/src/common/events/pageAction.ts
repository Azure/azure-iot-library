/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Informational event when a user takes an action on a page.
// pageName	Friendly and unique name of the page upon which page metrics will be calculated; should be in English and useful in reporting/visualization; must be unique per application space
// uri	Fully qualified page URI or URL; okay to include query strings and page parameters.
// destUri	Fully qualified page URI or URL of the destination page; if unknown, leave blank.
// actionInputMethod	Device, mechanism, or apparatus used to trigger the action. Example: "touch" or "click".
// behavior	Describes the specific action taken by the customer with this page action.
// sessionId	A GUID assigned to a specific session useful for grouping views (and clicks) to that session.
// timeSinceLastEvent	Time difference between last and current event.
// userName	User name
// userAgent	User agent information generally from a web request
// browser	Extraction from userAgent string for simpler querying
// location	Anything that allows us to determine at least the origin country of the request

import {PageCommon} from './pageCommon';
import * as EventField from './eventField';

export class PageAction extends PageCommon {
    private eventType: string = EventField.EventType[EventField.EventType.PageAction];
    constructor(public actionName: string,
        public pageName: string,
        public uri: string,
        public sessionId?: string,
        public timeSinceLastEvent?: number,
        public userName?: string,
        public userAgent?: string,
        public browser?: string,
        public location?: string,
        public destUri?: string,
        public actionInputMethod?: EventField.InputMethodType,
        public behavior?: EventField.BehaviorType) {
        super(pageName, uri, sessionId, timeSinceLastEvent, userName, userAgent, browser, location);
    }
}
