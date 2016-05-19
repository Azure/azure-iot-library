/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {
  beforeEach,
  beforeEachProviders,
  describe,
  expect,
  it,
  inject,
  injectAsync
} from 'angular2/testing';

import {BehaviorSubject} from 'rxjs/Rx';

import {GridBody} from './grid.body';
import {ListGridBody} from './list';
import {SelectionStyle} from '../../grid';

describe('Grid Body', () => {
    var body: GridBody<string>;
    
    beforeEach(() => {
        body = new GridBody<string>(null);
    });
    
    it('tracks rows by index', () => {
        body.getIdentifier = null;
        expect(body.trackRows(4, 'test')).toEqual(4);
    });
    
    it('tracks rows by get identifier', () => {
        body.getIdentifier = d => d.length;
        expect(body.trackRows(4, 'test-long')).toEqual(9);
    });
    
    it('tracks columns by index', () => {
        expect(body.trackColumns(4, null)).toEqual(4);
    });
    
    it('on single select updates subject', (done) => {
        body.configuration = {
            columns: [],
            selectionStyle: SelectionStyle.SingleSelect
        };
        body.getIdentifier = d => d.length;
        body.selectedRows = new BehaviorSubject<{[key:string]:string}>({});
        
        body.selectRow('test');
        
        expect(body.clickTimeout).toBeDefined();
        
        setTimeout(() => {
            expect(body.selectedRows.value[4]).toEqual('test');
            done();
        });
    });
    
    it('on single select deselects already selected subject', (done) => {
        body.configuration = {
            columns: [],
            selectionStyle: SelectionStyle.SingleSelect
        };
        body.getIdentifier = d => d.length;
        body.selectedRows = new BehaviorSubject<{[key:string]:string}>({4:'test'});
        
        body.selectRow('test');
        
        expect(body.clickTimeout).toBeDefined();
        
        setTimeout(() => {
            expect(body.selectedRows.value[4]).toBeUndefined();
            done();
        });
    });
    
    it('on no select does nothing', (done) => {
        body.configuration = {
            columns: [],
            selectionStyle: SelectionStyle.None
        };
        body.getIdentifier = d => d.length;
        body.selectedRows = new BehaviorSubject<{[key:string]:string}>(null);
        
        body.selectRow('test');
        
        expect(body.clickTimeout).toBeDefined();
        
        setTimeout(() => {
            expect(body.selectedRows.value).toEqual(null);
            done();
        });
    });
    
    it('on a double click cancels out the row and emits event', (done) => {
        body.configuration = {
            columns: [],
            selectionStyle: SelectionStyle.MultiSelect
        };
        body.getIdentifier = d => d.length;
        body.selectedRows = new BehaviorSubject<{[key:string]:string}>({});
        
        body.selectRow('test');
        
        expect(body.clickTimeout).toBeDefined();
        
        body.rowDoubleClick.subscribe(done);
        
        body.doubleClickRow('test');
    });
    
    it('subscribes and unsubscribes for selection changes', () => {
        var fakeChangeDetector: any = {
            markForCheck: jasmine.createSpy('markForCheck')
        };
        
        body = new GridBody<string>(fakeChangeDetector);
        
        body.selectedRows = new BehaviorSubject<{[key:string]:string}>({});
        
        body.ngOnChanges({
            'selectedRows': null
        });
        
        expect(fakeChangeDetector.markForCheck).toHaveBeenCalled();
        
        var subscription = body.subscription;
        expect(subscription).toBeDefined();
        
        body.ngOnChanges({
            'selectedRows': null
        });
        
        expect(fakeChangeDetector.markForCheck).toHaveBeenCalled();
        
        expect(subscription).not.toEqual(body.subscription);
        
        spyOn(body.subscription, 'unsubscribe');
        
        body.ngOnDestroy();
        
        expect(body.subscription.unsubscribe).toHaveBeenCalled();
    });
});

describe('ListGridBody', () => {
    var fakeChangeDetector: any = {
        markForCheck: jasmine.createSpy('markForCheck')
    };
        
    var body: ListGridBody<string>;
    
    beforeEach(() => {
        body = new ListGridBody<string>(fakeChangeDetector);
    });
    
    it('toggles expansion', (done) => {
        body.getIdentifier = s => s.length;
        body.toggleExpansion('test');
        
        setTimeout(() => {
            expect(fakeChangeDetector.markForCheck).toHaveBeenCalled();
            expect(body.expandedRows[4]).toEqual('test');
            done();
        });
    });
});