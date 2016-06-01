/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component, Input} from '@angular/core';

@Component({
    selector: 'loading-bar',
    template: require('loadingBar/loadingBar.html'),
    styles: [require('loadingBar/loadingBar.scss')]
})
export class LoadingBar {
    /**
     * An optional message to show in the middle of the loading bar
     */
    @Input() public message: string;
}
