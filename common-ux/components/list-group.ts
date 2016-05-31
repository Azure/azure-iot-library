/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component, Input, Output, EventEmitter, ElementRef, NgZone, ViewEncapsulation, ViewChild} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs/Rx';
import {GlobalContext} from './globalContext';
import {Dictionary} from './dictionary';

/**
 * This is a list-group component that enables selection and deselection of options
 */
@Component({
    selector: 'list-group',
    template: require('list-group/list-group.html'),
    styles: [require('list-group/list-group.scss')]
})
export class ListGroup<T> extends GlobalContext {
    
    /**
     * These are the options available
     */
    @Input() public options: T[];
    
    /**
     * This is behavior subject encapsulates the selection
     */
    @Input() public selection: BehaviorSubject<Dictionary<T>> = new BehaviorSubject(new Dictionary<T>());
    
    /**
     * This gets the name for an option, which is displayed in the list
     */
    @Input() public getLabel: (T) => string;
    
    /**
     * This determines if it is a single select or a multi-selection
     * OPTIONAL: by default this is true
     */
    @Input() public isMultiple: boolean = true;
    
    /**
     * This is the identifier
     * OPTIONAL: by default it is the JSON.stringify function
     */
    @Input() public getId: (T) => string = option => JSON.stringify(option);
    
    /**
     * Selects an option 
     */
    public select(option: T) {
        let id = this.getId(option);
        let isSelected = !!this.selection.value[id];
        let basis = this.selection.value;
        if (!this.isMultiple) {
            basis = {};
        }
        if (isSelected) {
            delete basis[id];
        } else {
            basis[id] = option;
        }
        this.selection.next(basis);
    }
}