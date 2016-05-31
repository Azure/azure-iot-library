/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {
  beforeEach,
  beforeEachProviders,
  describe,
  expect,
  it,
  inject,
  injectAsync
} from '@angular/core/testing';

import {BehaviorSubject} from 'rxjs/Rx';

import {GridBodyPresentation, PresentationOnBreakpoint} from '../grid';

describe('Presentation on Breakpoint:', () => {
    var breakpoint: BehaviorSubject<GridBodyPresentation>;
    
    beforeAll(() => {
        window.outerWidth = 400;
        
        breakpoint = PresentationOnBreakpoint([
            {
                breakpoint: 0,
                presentation: GridBodyPresentation.List
            },
            {
                breakpoint: 300,
                presentation: GridBodyPresentation.Rows
            }
        ]);
        expect(breakpoint.value).toEqual(GridBodyPresentation.Rows);
    });
    
    it('responds to a resize to a smaller viewport', () => {
        window.outerWidth = 200;
        var event = document.createEvent('UIEvent');
        event.initEvent('resize', true, true);
        window.dispatchEvent(event);
        expect(breakpoint.value).toEqual(GridBodyPresentation.List);
    });
});
