/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {GridBody} from './grid.body';
import {PerformanceSpy} from '../../performance-spy';
import {Component, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, Input} from '@angular/core';

@Component({
    selector: 'grid-body-list',
    template: require('grid/body/list.html'),
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
export class ListGridBody<T> extends GridBody<T> {

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

    /**
     * Expanded rows
     */
    public expandedRows: { [key: string]: T } = {};

    constructor(cd: ChangeDetectorRef) {
        super(cd);
    }

    toggleExpansion(row: T) {
        this.clickTimeout = setTimeout(() => {

            let id = this.getIdentifier(row);

            if (this.expandedRows[id] === undefined) {
                this.expandedRows[id] = row;
            } else {
                delete this.expandedRows[id];
            }

            this.cd.markForCheck();
        });
    }
}
