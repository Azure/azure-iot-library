/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {GridBody} from './grid.body';
import {PerformanceSpy} from '../../performance-spy';
import {Component, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef} from 'angular2/core';

@Component({
    selector: 'grid-body-list',
    template: require('grid/body/list.html'),
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    directives: [PerformanceSpy]
})
export class ListGridBody<T> extends GridBody<T> {
    
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