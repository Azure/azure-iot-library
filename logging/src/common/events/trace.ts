/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Debug event covering anything too verbose to be included in "info" level.
// message	string	required	Any debug information that is useful
import * as EventField from './eventField';

export class Trace {
    private eventType: string = EventField.EventType[EventField.EventType.Trace];
    constructor(public message: string) {
    }
}
