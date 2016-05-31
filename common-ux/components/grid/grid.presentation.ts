/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {BehaviorSubject} from 'rxjs/Rx';

/**
 * Available presentations as an enum
 */
export enum GridBodyPresentation {
    Rows,
    List
}
export {RowsGridBody} from './body/rows';
export {ListGridBody} from './body/list';

/**
 * Convenience method to set up an observable based on breakpoints for changing the grid's presentation
 */
export function PresentationOnBreakpoint(
    breakpoints: {
        breakpoint: number;
        presentation: GridBodyPresentation
    }[]
): BehaviorSubject<GridBodyPresentation> {
    
    function getPresentation() {
        var width = window.outerWidth, i = 0;
        
        while (i < breakpoints.length - 1 && breakpoints[i + 1].breakpoint < width) {
            i++;
        }
        
        return breakpoints[i].presentation;
    }
    
    breakpoints.sort((a, b) => a.breakpoint - b.breakpoint);
    
    let subject = new BehaviorSubject<GridBodyPresentation>(getPresentation());
    
    function listener() {
        subject.next(getPresentation());
    }
    
    subject.next(getPresentation());
    
    window.addEventListener('resize', listener);
    
    return subject;
}