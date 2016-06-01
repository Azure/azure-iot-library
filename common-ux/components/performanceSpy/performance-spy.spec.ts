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

import {PerformanceSpy} from '../performance-spy';

describe('Performance Spy', () => {
    
    it('debounced reports', (done) => {
        spyOn(console, 'log').and.callThrough();
        
        [
            new PerformanceSpy(),
            new PerformanceSpy(),
            new PerformanceSpy()
        ].forEach(spy => {
            spy.enabled = true;
            spy.ngOnInit();
            spy.ngAfterViewInit();
            spy.ngDoCheck();
            spy.ngAfterViewChecked();
            spy.ngOnDestroy();
        });
        
        setTimeout(() => {
            expect(console.log).toHaveBeenCalledTimes(1);
            done();
        }, 2000);
    });
});