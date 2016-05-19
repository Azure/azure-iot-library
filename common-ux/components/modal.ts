/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component, Input, Output, EventEmitter, ViewEncapsulation} from 'angular2/core';
/**
 * This is a shared modal component, which is used in multiple views
 */
@Component({
    selector: 'modal',
    template: require('modal/modal.html'),
    styles: [require('modal/modal.scss')],
    encapsulation: ViewEncapsulation.None
})
export class Modal {
    
    /**
     * This is the string intended for the title
     */
    @Input() public title: string;
    
    /**
     * This is the string intended for the success button; if not present, will not draw a success button
     */
    @Input() public successText: string;
    
    /**
     * This is the string intended for the cancel button; if not present, will not draw a cancel button
     */
    @Input() public cancelText: string;
    
    /**
     * Changing this from false to true and true to false will display and close the modal
     */
    @Input() public isVisible: boolean;
    
    /**
     * This is event handler for clicking the success button
     */
    @Output() public onSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();
    
    /**
     * This is event handler for clicking the cancel button
     */
    @Output() public onCancel: EventEmitter<boolean> = new EventEmitter<boolean>();
}