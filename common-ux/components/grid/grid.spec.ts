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

import {IGridSourceFilter, Grid, GridSource, SelectionStyle} from '../grid';
import {ArrayGridSource} from './grid.source';

describe('Common Grid:', () => {

    let grid: Grid<string>;
    let fakeData: string[] = ['test', 'test1'];

    beforeEach(() => {
        grid = new Grid<string>(null, null);
    });

    it('Constructs', () => {
        expect(grid).toBeAnInstanceOf(Grid);
    });
    
    it('Handles an array as a data source', () => {
        grid.source = fakeData;
        grid.ngOnChanges();
        expect(grid.rows).toEqual(fakeData);
        grid.ngOnDestroy();
    });
    
    it('Handles a grid source as a data source & cleans itself', () => {
        
        var subscribeCallback = null;
        
        var fakeView = {
            subscribe: jasmine.createSpy('subscribe').and.callFake(cb => {
                subscribeCallback = cb;
            }),
            close: jasmine.createSpy('close')
        };
        
        var fakeSource = {
            open: <any>jasmine.createSpy('open').and.callFake(() => fakeView),
            update: () => {}
        };
        
        grid.source = <GridSource<string>>fakeSource;
        grid.ngOnChanges();
        
        expect(fakeSource.open).toHaveBeenCalled();
        expect(fakeView.subscribe).toHaveBeenCalledWith(subscribeCallback);
        expect(subscribeCallback).not.toBeNull();
        expect(grid.rows).toEqual([]);
                
        subscribeCallback(fakeData);
        
        expect(grid.rows).toEqual(fakeData);
        
        expect(fakeView.close).not.toHaveBeenCalled();
        
        grid.ngOnDestroy();
        
        expect(fakeView.close).toHaveBeenCalled();
    });
    
    describe('touch resizing behavior', () => {
                
        beforeEach(() => {
            var fakeDOM = document.createElement('div');
            fakeDOM.innerHTML = '<div class="grid"><div data-column-header="col0"></div></div>';
            
            grid.element = {
                nativeElement: fakeDOM
            };
            
            grid.zone = <any>{
                run: (cb) => cb()
            };
            
            grid.configuration = {
                columns: [
                    {
                        header: () => 'Test 0',
                        key: 'test0',
                        sortable: true,
                        value: (datum) => datum
                    },
                    {
                        header: () => 'Test 1',
                        key: 'test0',
                        sortable: true,
                        value: (datum) => datum
                    }
                ],
                selectionStyle: SelectionStyle.None
            };
            
            grid.updateColumnClasses();
            
            spyOn(document.body, 'addEventListener');
            spyOn(document.body, 'removeEventListener');
            
            spyOn(grid, 'getHeaderClasses');
            spyOn(grid, 'getColumnClasses');
        });
        
        it('on touch header, marks it as the currently tapped column', () => {
            
            expect(grid.currentlyTappedColumn).not.toEqual(0);
            
            grid.touchHeader(0);
            
            expect(grid.currentlyTappedColumn).toEqual(0);
        });
        
        it('on touch start, adds listeners and measures current size', () => {
            grid.touchStartColumnResize(<any>{
                targetTouches: [
                    { clientX: 0, identifier: 4 }
                ]
            }, 0);
            
            expect(grid.columnResize.startX).not.toBeNaN();
            
            expect(grid.columnResize.column).toBe(grid.configuration.columns[0]);
            
            expect(grid.columnResize.touchIdentifier).toEqual(4);
            
            expect(document.body.addEventListener).toHaveBeenCalledWith('touchmove', jasmine.any(Function));
            expect(document.body.addEventListener).toHaveBeenCalledWith('touchend', jasmine.any(Function));
        });
        
        it('on touch move, resizes', () => {
            spyOn(grid, 'updateWidths');
            
            grid.columnResize.touchIdentifier = 4;
            grid.columnResize.startX = 4;
            grid.columnResize.column = {
                width: 0
            }
            
            grid.touchColumnResizeHandler(<any>{
                touches: {
                    0: { identifier: 4, clientX: 5 },
                    length: 1,
                    item: function(i) { return this[i]; }
                }
            });
            
            expect(grid.columnResize.column.width).not.toEqual(0);
            
            expect(grid.updateWidths).toHaveBeenCalled();
        });
        
        it('on touch end, cleans up', (done) => {
            
            grid.columnResize.touchIdentifier = 4;
            grid.columnResize.startX = 4;
            grid.columnResize.column = {
                width: 0
            }
            
            grid.touchStopColumnResize(<any>{
                changedTouches: {
                    0: { identifier: 4, clientX: 5 },
                    length: 1,
                    item: function(i) { return this[i]; }
                }
            });
            
            setTimeout(() => {
            
                expect(grid.columnResize.column).toBeNull();
                
                expect(document.body.removeEventListener).toHaveBeenCalledWith('touchmove', jasmine.any(Function));
                expect(document.body.removeEventListener).toHaveBeenCalledWith('touchend', jasmine.any(Function));
                done();
            });
        });
    });
    
    describe('Set Sort Behavior', () => {
        
        var fakeSource: ArrayGridSource<string>;
        
        beforeEach(() => {
            fakeSource = new ArrayGridSource<string>(fakeData);
            
            grid.source = fakeSource;
            grid.ngOnChanges();
            
            grid.configuration = {
                columns: [],
                selectionStyle: SelectionStyle.None
            };

            spyOn(grid, 'defaultSort').and.callThrough();
        });
        
        it("doesn't change the sort order if the column isn't sortable", (done) => {
            var doOnce = false;
            fakeSource.filter.subscribe(() => {
                if (!doOnce) doOnce = true;
                else done.fail('Sorting changed');
            });
            
            grid.setSort({
                sortable: false
            });
            
            done();
        });
        
        it("doesn't change the sort order if currently resizing", (done) => {
            var doOnce = false;
            fakeSource.filter.subscribe(() => {
                if (!doOnce) doOnce = true;
                else done.fail('Sorting changed');
            });
            
            grid.columnResize.column = 'test';
            
            grid.setSort({
                sortable: true
            });
            
            done();
        });
        
        it('sorts by the default sort if not previously sorted', (done) => {
            var doOnce = false;
            fakeSource.filter.subscribe((value) => {
                if (!doOnce) return doOnce = true;
                expect(grid.defaultSort).toHaveBeenCalledWith('test');
                expect(value.sorted.columnKey).toEqual('test');
                expect(value.sorted.ascending).toBeTruthy();
                done();
            });
            
            grid.setSort({
                key: 'test',
                sortable: true
            });
        });
        
        it('inverts sort order if previously sorted', (done) => {
            var doOnce = false;
            
            fakeSource.filter = new BehaviorSubject({
                sorted: {
                    columnKey: 'test',
                    ascending: true
                }
            });
            
            fakeSource.filter.subscribe((value) => {
                if (!doOnce) return doOnce = true;
                expect(grid.defaultSort).not.toHaveBeenCalled();
                expect(value.sorted.columnKey).toEqual('test');
                expect(value.sorted.ascending).toBeFalsy();
                done();
            });
            
            grid.setSort({
                key: 'test',
                sortable: true
            });
        });
        
        it('default sorts if sorted by a different column', (done) => {
            var doOnce = false;
            
            fakeSource.filter = new BehaviorSubject({
                sorted: {
                    columnKey: 'test2',
                    ascending: false
                }
            });
            
            fakeSource.filter.subscribe((value) => {
                if (!doOnce) return doOnce = true;
                expect(grid.defaultSort).toHaveBeenCalledWith('test');
                expect(value.sorted.columnKey).toEqual('test');
                expect(value.sorted.ascending).toBeTruthy();
                done();
            });
            
            grid.setSort({
                key: 'test',
                sortable: true
            });
        });
    });
    
    describe('Select All Behavior', () => {
        
        var fakeSource: ArrayGridSource<string>;
        
        beforeEach(() => {
            fakeSource = new ArrayGridSource<string>(fakeData);
            
            grid.source = fakeSource;
            grid.ngOnChanges();
            
            grid.configuration = {
                columns: [],
                selectionStyle: SelectionStyle.None
            };
        });
        
        it("if the row count is 0, then all selected == false", () => {
            grid.rows = [];
            expect(grid.areAllRowsSelected()).toBeFalsy();
        });
        
        it('bypasses select all when in single-select mode', (done) => {
            grid.configuration.selectionStyle = SelectionStyle.SingleSelect;
            var doOnce = false;
            fakeSource.selection.subscribe(() => {
                if (!doOnce) doOnce = true;
                else done.fail('Selection changed');
            });
                    
            grid.selectAll();
            
            done();
        });
        
        it('bypasses select all when in no selection mode', (done) => {
            grid.configuration.selectionStyle = SelectionStyle.None;
            var doOnce = false;
            fakeSource.selection.subscribe(() => {
                if (!doOnce) doOnce = true;
                else done.fail('Selection changed');
            });
                    
            grid.selectAll();
            
            done();
        });
        
        it('toggles select all in multi-select mode', () => {
            grid.configuration.selectionStyle = SelectionStyle.MultiSelect;
            
            var expectation = value => {};
            
            fakeSource.selection.subscribe(value => {
                expectation(value);
            });
            
            expectation = value => {
                expect(Object.keys(value).length).toEqual(fakeData.length);
            }
            
            grid.selectAll();
            
            expectation = value => {
                expect(Object.keys(value).length).toEqual(0);
            }
            
            grid.selectAll();
        });
    });
    
    describe('Presents Correctly:', () => {
        
        beforeEach(() => {
            grid.configuration = {
                columns: [
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        width: null,
                        key: 'key1'
                    },
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        width: 20,
                        key: 'key2'
                    },
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        width: null,
                        key: 'key3'
                    }
                ],
                selectionStyle: 0
            };
        });
        
        it('Handles absolute width in column; no width', () => {
            var classMap = grid.getColumnClasses(0);
            expect(classMap['absolute']).toBeFalsy();
        });
        
        it('Handles absolute width in column; width, not last', () => {
            var classMap = grid.getColumnClasses(1);
            expect(classMap['absolute']).toBeTruthy();
        });
        
        it('Handles absolute width in column; width, last', () => {
            var classMap = grid.getColumnClasses(2);
            expect(classMap['absolute']).toBeFalsy();
        });
        
        it('Handles absolute width in header; no width', () => {
            var classMap = grid.getHeaderClasses(0);
            expect(classMap['absolute']).toBeFalsy();
        });
        
        it('Handles absolute width in header; width, not last', () => {
            var classMap = grid.getHeaderClasses(1);
            expect(classMap['absolute']).toBeTruthy();
        });
        
        it('Handles absolute width in header; width, last', () => {
            var classMap = grid.getHeaderClasses(2);
            expect(classMap['absolute']).toBeFalsy();
        });
        
        it('returns calculated width with no width', () => {
            // 33 -> 1/3 of 100%, and we have 3 columns
            expect(grid.getWidth(0)).toEqual('33%');
        });
        
        it('returns manually set width with width, not last', () => {
            expect(grid.getWidth(1)).toEqual('20px');
        });
        
        it('returns calculated width with width, last', () => {
            // 33 -> 1/3 of 100%, and we have 3 columns
            expect(grid.getWidth(2)).toEqual('33%');
        });
    });
    
    describe('arrow sorting methods', () => {
        
        var fakeSource = new ArrayGridSource<string>(fakeData);
        
        beforeEach(() => {
            grid = new Grid<string>(null, null);
            grid.source = fakeSource;
            grid.configuration = {
                columns: [
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        sortable: true,
                        width: null,
                        key: 'key1'
                    },
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        sortable: false,
                        width: 20,
                        key: 'key2'
                    },
                    {
                        header: () => 'test-header',
                        value: (value) => 'value',
                        sortable: true,
                        width: null,
                        key: 'key3'
                    }
                ],
                selectionStyle: 0
            };
            grid.ngOnChanges();
        });
        
        it('handles a sortable top sorted ascending', () => {
            fakeSource.filter.next({ sorted: { columnKey: 'key1', ascending: true }});
            expect(grid.getArrowClass(true, 0).current).toBeTruthy();
        });
        
        it('handles a sortable bottom sorted ascending', () => {
            fakeSource.filter.next({ sorted: { columnKey: 'key1', ascending: true }});
            expect(grid.getArrowClass(false, 0).current).toBeFalsy();
        });
        
        it('handles a sortable top sorted descending', () => {
            fakeSource.filter.next({ sorted: { columnKey: 'key1', ascending: false }});
            expect(grid.getArrowClass(true, 0).current).toBeFalsy();
        });
        
        it('handles a sortable top sorted descending', () => {
            fakeSource.filter.next({ sorted: { columnKey: 'key1', ascending: false }});
            expect(grid.getArrowClass(false, 0).current).toBeTruthy();
        });
        
        it('handles an unsortable top', () => {
            fakeSource.filter.next({ sorted: { columnKey: 'key2', ascending: false }});
            expect(grid.getArrowClass(false, 0).current).toBeFalsy();
        });
    });
});
