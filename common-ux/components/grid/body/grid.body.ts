/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {ViewEncapsulation, ChangeDetectionStrategy, EventEmitter, ChangeDetectorRef, SimpleChange} from '@angular/core';
import {GridConfiguration, SelectionStyle} from '../grid.configuration';
import {BehaviorSubject, Subscription} from 'rxjs/Rx';
import {GlobalContext} from '../../globalContext';

export class GridBody<T> extends GlobalContext {

    /**
     * Rows
     */
    public rows: T[];

    /**
     * Column widths
     */
    public widths: string[];

    /**
     * This is the configuration that we use to determine what columns to use
     */
    public configuration: GridConfiguration<T>;

    /**
     * This is the configuration that we use to determine what columns to use
     */
    public getIdentifier: (T) => string;

    /**
     * Selected rows
     */
    public selectedRows: BehaviorSubject<{ [key: string]: T }>;

    /**
     * This means that there is a performance spy; if so, use the group specified for sub groups for columns
     * OPTIONAL: by default it is null; if the 'spy-performance' attribute is set, then it will enhance the groups with those in the grid
     */
    public performanceSpyGroup: string = null;

    /**
     * This is whether or not to enable performance logging through performance spies
     * OPTIONAL: by default it is true, but spy performance won't be enabled unless the 'spy-performance' attribute is present
     */
    public performanceSpyEnabled: boolean = true;

    /**
     * This is the selection changed event that returns the ids of what was selected
     */
    public selectionChanged: EventEmitter<T[]> = new EventEmitter<T[]>();

    /**
     * This is the double click of a row event
     */
    public rowDoubleClick: EventEmitter<T> = new EventEmitter<T>();

    /**
     * Subscription to selected rows
     */
    public subscription: Subscription;

    /**
     * Timeout used to avoid changing selection on double click
     */
    public clickTimeout: number = null;

    constructor(public cd: ChangeDetectorRef) {
        super();
    }

    ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
        for (let propertyName in changes) {
            if (propertyName === 'selectedRows') {
                if (this.subscription) {
                    this.subscription.unsubscribe();
                }

                this.subscription = this.selectedRows.subscribe(selection => {
                    this.cd.markForCheck(); // forces an update to change detection
                });
            }
        }
    }

    ngOnDestroy() {
        if (this.subscription && !this.subscription.isUnsubscribed) {
            this.subscription.unsubscribe();
        }
    }

    selectRow(row: T) {
        this.clickTimeout = setTimeout(() => {
            if (!this.configuration.selectionStyle) {
                return;
            }

            let selection = this.selectedRows.value

            let id = this.getIdentifier(row);

            if (this.configuration.selectionStyle === SelectionStyle.SingleSelect) {
                let tempSelection: { [key:string]: T } = {};
                tempSelection[id] = selection[id];
                selection = tempSelection;
            }

            if (selection[id] === undefined) {
                selection[id] = row;
            } else {
                delete selection[id];
            }
            this.selectionChanged.emit(Object.keys(selection).map(id => selection[id]));
            this.selectedRows.next(selection);
        });
    }

    doubleClickRow(row: T) {
        this.rowDoubleClick.emit(row);
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
    }

    trackRows = (i, row) => {
        return this.getIdentifier ? this.getIdentifier(row) : i;
    }

    trackColumns = (i, column) => {
        return i;
    }
}
