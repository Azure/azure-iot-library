/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component} from 'angular2/core';

@Component({
    selector: 'application-loading-bar',
    template: require('applicationLoadingBar/application.loadingBar.html'),
    styles: [require('applicationLoadingBar/application.loadingBar.scss')]
})
export class ApplicationLoadingBar {
}

