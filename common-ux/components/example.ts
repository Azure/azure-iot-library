/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/// <reference path="../node_modules/angular2/typings/browser.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
import {Component} from 'angular2/core';

@Component({
    selector: 'example-packed-component',
    template: require('example/example.html'),
    styles: [require('example/example.scss')]
})
export class ExamplePacked {
    constructor() {
    }
}