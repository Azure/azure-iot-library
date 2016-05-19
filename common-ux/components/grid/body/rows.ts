/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {GridBody} from './grid.body';
import {PerformanceSpy} from '../../performance-spy';
import {Component, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef} from 'angular2/core';

@Component({
    selector: 'grid-body-rows',
    template: require('grid/body/rows.html'),
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    directives: [PerformanceSpy]
})
export class RowsGridBody<T> extends GridBody<T> {
    constructor(cd: ChangeDetectorRef) {
        super(cd);
    }
}