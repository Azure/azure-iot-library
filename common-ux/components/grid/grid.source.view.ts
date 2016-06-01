/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import { BehaviorSubject } from 'rxjs/Rx';

/**
 * Grid source view is just a behavior subject with an additional 'close' function that lets the source know to stop updating it
 * 
 * When it has a value of null, it means that it is currently in the process of updating
 */
export class GridSourceView<T> extends BehaviorSubject<T[]> {
    
    /**
     * Used to denote how many rows to skip; if null, assume 0
     */
    viewSkip: number;
    
    /**
     * Used to denote how many rows to get; if null, assume as many as possible
     */
    viewCount: number;
    
    /**
     * Used to tell the source to stop updating this view
     */
    close: Function;
    
    /**
     * Starts the underlying behavior subject and attaches the variables
     */
    constructor(data?: T[], skip?: number, count?: number) {
        super(data || null);
        this.viewSkip = skip;
        this.viewCount = count;
    }
}