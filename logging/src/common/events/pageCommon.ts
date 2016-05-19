/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export abstract class PageCommon {
    constructor(public pageName: string,
        public uri: string,
        public sessionId?: string,
        public timeSinceLastEvent?: number,
        userName?: string,
        userAgent?: string,
        browser?: string,
        location?: string) { }
}