/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export enum EventType {
    Trace,
    Exception,
    IncomingServiceRequest,
    OutgoingServiceRequest,
    PageAction,
    PageView
}

export enum InputMethodType {
    Button
}

export enum BehaviorType {
    Click,
    Touch
}

export enum RequestStatus {
    InternalServerError,
    OK,
    Success,
    ServerBusy
}

export enum HttpProtocol {
    http,
    https
}

export enum RequestMethod {
    GET,
    POST,
    PUT,
    DELETE,
    HEAD
}
