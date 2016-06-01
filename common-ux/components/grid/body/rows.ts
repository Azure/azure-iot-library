/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {GridBody} from './grid.body';
import {PerformanceSpy} from '../../performance-spy';
import {Component, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, Input} from '@angular/core';

@Component({
    selector: 'grid-body-rows',
    template: require('grid/body/rows.html'),
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    directives: [PerformanceSpy],
    inputs: [
        'rows',
        'widths',
        'configuration',
        'getIdentifier',
        'selectedRows',
    ],
    outputs: [
        'selectionChanged',
        'rowDoubleClick'
    ]
})
export class RowsGridBody<T> extends GridBody<T> {

    /**
     * Resources; see GlobalContext for more information
     */
    @Input('resources') Resources;

    /**
     * Performance spy; see GridBody for more information
     */
    @Input('spy-performance') performanceSpyGroup;

    /**
     * Whether to enable performance logging; see GridBody for more information
     */
    @Input('spy-performance-enabled') performanceSpyEnabled;

    constructor(cd: ChangeDetectorRef) {
        super(cd);
    }
}
