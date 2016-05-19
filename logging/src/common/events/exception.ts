/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Warning, error and fatal events that can be alerted on.
// errorName	The name of the Error if available
// errorDetails	The exception/Error message 
// severity	The severity/level of the error; severity is determined by team. 
// errorType	The exception/error type(Playback, RPC, Exception)
// errorCode	The hex HResult or other errorCode returned with the failure/error response.
// lineNumber	The line number of the error
// isDisplayed	Was this error displayed to the user? If not sure, False.
// errorLocation	The callstack or location of the error.
// errorMethod	The method location of the error
// userName	User name or anonymous

import * as EventField from './eventField';

export class Exception {
    private eventType: string = EventField.EventType[EventField.EventType.Exception];
    constructor(public errorName: string,
        public errorDetails: string,
        public severity: number,
        public errorType: string,
        public errorCode: number,
        public lineNumber: number,
        public isDisplayed: boolean,
        public errorLocation: string,
        public errorMethod: string,
        public userName: string) {
    }
}
