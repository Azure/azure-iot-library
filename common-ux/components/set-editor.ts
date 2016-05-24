/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component, Input, Output, EventEmitter, ElementRef, NgZone, ViewEncapsulation, ViewChild} from 'angular2/core';
import {Observable, BehaviorSubject, Subscription} from 'rxjs/Rx';
import {GlobalContext} from './globalContext';
import {Dictionary} from './dictionary';
import {ListGroup} from './list-group';

/**
 * This is a set-editor component that enables adding and removing items from a set
 */
@Component({
    selector: 'set-editor',
    template: require('set-editor/set-editor.html'),
    styles: [require('set-editor/set-editor.scss')],
    directives: [ListGroup]
})
export class SetEditor<T> extends GlobalContext {
    
    /**
     * These are the available options
     */
    @Input() public available: Observable<T[]>;
        
    /**
     * These are the available options
     */
    @Input() public current: BehaviorSubject<T[]>;
    
    /**
     * This gets the name for an option, which is displayed in the list
     */
    @Input() public getLabel: (T) => string;
    
    /**
     * This is the identifier
     * OPTIONAL: by default it is the JSON.stringify function
     */
    @Input() public getId: (T) => string = option => JSON.stringify(option);
    
    /**
     * This is behavior subject encapsulates those that can be added
     */
    public toRemove: BehaviorSubject<Dictionary<T>> = new BehaviorSubject(new Dictionary<T>());
    
    /**
     * This is behavior subject encapsulates those that can be added
     */
    public toAdd: BehaviorSubject<Dictionary<T>> = new BehaviorSubject(new Dictionary<T>());
    
    /**
     * Boolean flag for being able to add
     */
    public canAdd: boolean;
    
    /**
     * Boolean flag for being able to remove
     */
    public canRemove: boolean;
    
    /**
     * Filter for the actual available
     */
    public actualAvailable: T[] = [];
    
    /**
     * Actual current
     */
    public actualCurrent: T[] = [];
    
    /**
     * Subscribe subjects to determine if we can add/remove
     */
    constructor() {
        super();
        
        this.toRemove.subscribe(removeDictionary => {
            this.canRemove = Object.keys(removeDictionary).length > 0;
        });
        
        this.toAdd.subscribe(addDictionary => {
            this.canAdd = Object.keys(addDictionary).length > 0;
        });
    }
    
    /**
     * Set up observables
     */
    public ngOnInit() {
        Observable.combineLatest(
            this.available,
            this.current
        ).subscribe((value: any) => {
            let [available, current] = <T[][]>value;
            let currentIds = current.map(this.getId);
            this.actualAvailable = available.filter(option => currentIds.indexOf(this.getId(option)) === -1);
            this.actualCurrent = current;
        });
    }
    
    /**
     * On add, update current
     */
    public add() {
        var additions = Object.keys(this.toAdd.value).map(key => this.toAdd.value[key]);
        this.current.next([].concat(this.current.value, additions));
        this.toAdd.next(new Dictionary<T>());
    }
    
    /**
     * On remove, update current
     */
    public remove() {
        var removalIds = Object.keys(this.toRemove.value);
        this.current.next(this.current.value.filter(option => removalIds.indexOf(this.getId(option)) === -1));
        this.toRemove.next(new Dictionary<T>());
    }
}