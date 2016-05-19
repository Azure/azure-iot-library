/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IGridSourceFilter} from './grid.source.filter';
import {GridSourceView} from './grid.source.view';
import {BehaviorSubject} from 'rxjs/Rx';

export type SelectionUpdateStrategy<T> = (selection: BehaviorSubject<{ [key: string]: T }>, rows: T[], getId: (T) => string) => void;
export var SelectionUpdateStrategies = {
    SimpleIteration: function SimpleIterationSelectionUpdate<T>(selection: BehaviorSubject<{ [key: string]: T }>, rows: T[], getId: (T) => string) {
        if (!rows) return;

        var currentlySelectedIds = Object.keys(selection.value);

        for (var i = 0; i < rows.length; i++) {
            var id = getId(rows[i]);
            var index = currentlySelectedIds.indexOf(id);
            if (index >= 0) {
                currentlySelectedIds.splice(index, 1);
            }
        }

        for (var i = 0; i < currentlySelectedIds.length; i++) {
            delete selection.value[currentlySelectedIds[i]];
        }

        selection.next(selection.value);
    }
};

/**
 * This grid source is the base grid source, implementing the logic for opening and maintaining views
 */
export class GridSource<T> {

    /**
     * Grid source selection
     */
    public selection: BehaviorSubject<{ [key: string]: T }> = new BehaviorSubject<{ [key: string]: T }>({});
    
     /**
     * Grid source filter
     */
    public filter: BehaviorSubject<IGridSourceFilter> = new BehaviorSubject<IGridSourceFilter>({});
    
    /**
     * This is the list of open views. Some entries may be null; these are entries that have closed themselves
     */
    public openViews: GridSourceView<T>[] = [];

    /**
     * This will open a new view, which will be kept updated in the background.
     *
     * Consumers are assumed to call the 'close' method, which will stop it being updated.
     */
    public open = (skip?: number, count?: number) => {
        var viewIndex = this.openViews.indexOf(null);
        if (viewIndex === -1) {
            // no unused slot; add a new one
            viewIndex = this.openViews.length;
            this.openViews.push(null);
        }

        this.openViews[viewIndex] = new GridSourceView<T>(null, skip, count);

        let subscription = this.openViews[viewIndex].subscribe(nextRows => {
            this.selectionUpdate(this.selection, nextRows, this.getId);
        });

        this.openViews[viewIndex].close = () => {
            this.openViews[viewIndex] = null;
            subscription.unsubscribe();
        }

        this.update();

        return this.openViews[viewIndex];
    };

    /**
     * Identifier function
     */
    public getId: (T) => string = (row) => JSON.stringify(row);

    /**
     * This will update perform a selection update
     */
    public selectionUpdate: SelectionUpdateStrategy<T> = SelectionUpdateStrategies.SimpleIteration;

    /**
     * The update function is to be implemented by actual sources
     */
    update: () => void;
}

/**
 * This is an implementation for arrays
 */
export class ArrayGridSource<T> extends GridSource<T> {
    constructor(public rows: T[]) {
        super();
    }

    update = () => {
        this.openViews.forEach(view => view.next(this.rows));
    }
}

export {IGridSourceFilter, GridSourceView};
