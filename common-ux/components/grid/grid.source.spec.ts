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

import {GridSource, GridSourceView, SelectionUpdateStrategies} from '../grid';

describe('Update Strategies', () => {
    describe('Simple Iteration', () => {
        it('if not passed any rows, does nothing', (done) => {
            var selection = new BehaviorSubject<{[key: string]: string}>({});
            var doOnce = false;
            selection.subscribe(() => {
                if (!doOnce) {
                    doOnce = true;
                } else {
                    done.fail('Changed the selection');
                }
            });
            
            SelectionUpdateStrategies.SimpleIteration(selection, null, d => d.id);
            setTimeout(done);
        });
        
        it('removes rows that are missing', () => {
            var selection = new BehaviorSubject<{[key: string]: { id: string }}>({
                'missingRow': { id: 'missingRow' },
                'persistentRow': { id: 'persistentRow' }
            });
            
            SelectionUpdateStrategies.SimpleIteration(selection, [
                { id: 'persistentRow' }
            ], d => d.id);
            
            selection.subscribe(selection => {
                expect(selection['missingRow']).toBeUndefined();
                expect(selection['persistentRow']).toBeDefined();
            });
        });
    });
});

describe('Common Grid Source:', () => {

    let grid: GridSource<string>;

    beforeEach(() => {
        grid = new GridSource<string>();
    });

    it('Constructs', () => {
        expect(grid).toBeDefined();
    });
    
    it('Opens a view', () => {
        grid.update = jasmine.createSpy('update');
        
        var view = grid.open();
        expect(view).toBeDefined();
        expect(grid.update).toHaveBeenCalled();
        expect(grid.openViews).toEqual([view]);
    });
    
    it('Opens and closes view', () => {
        grid.update = jasmine.createSpy('update');
        
        var view = grid.open();
        expect(view).toBeDefined();
        expect(grid.update).toHaveBeenCalled();
        expect(grid.openViews).toEqual([view]);
        
        view.close();
        expect(grid.openViews).toEqual([null]);
    });
    
    it('Re-uses open slots', () => {
        grid.update = jasmine.createSpy('update');
        
        var view = grid.open();
        expect(view).toBeDefined();
        expect(grid.update).toHaveBeenCalled();
        expect(grid.openViews).toEqual([view]);
        
        grid.openViews = [null, view];
        
        var view2 = grid.open();
        expect(view2).toBeDefined();
        expect(grid.update).toHaveBeenCalled();
        expect(grid.openViews).toEqual([view2, view]);
    });
});
