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

import {SetEditor} from '../set-editor';
import {Dictionary} from '../dictionary';

class TestOption {
    constructor(
        public id: string,
        public name: string
    ) {}
}

describe('List Group:', () => {
    
    var setEditor: SetEditor<TestOption> = null;
    
    beforeEach(() => {
        setEditor = new SetEditor<TestOption>();
        setEditor.getLabel = option => option.name;
    });
    
    it('by default uses JSON.stringify as get id', () => {
        let option = new TestOption('id', 'value');
        expect(setEditor.getId(option)).toEqual(JSON.stringify(option));
    });
    
    it('recalculates canRemove when toRemove changes', (done) => {
        let dictionary = new Dictionary<TestOption>();
        dictionary['id'] = new TestOption('id', 'value');
        
        expect(setEditor.canRemove).toBeFalsy();
        
        setEditor.toRemove.next(dictionary);
        
        setTimeout(() => {
            expect(setEditor.canRemove).toBeTruthy();
            done();
        });
    });
    
    it('recalculates canAdd when toAdd changes', (done) => {
        let dictionary = new Dictionary<TestOption>();
        dictionary['id'] = new TestOption('id', 'value');
        
        expect(setEditor.canAdd).toBeFalsy();
        
        setEditor.toAdd.next(dictionary);
        
        setTimeout(() => {
            expect(setEditor.canAdd).toBeTruthy();
            done();
        });
    });
    
    it('after initialization, updates actual available and current when inputs change', () => {
        setEditor.available = new BehaviorSubject([new TestOption('id', 'value'), new TestOption('id2', 'value')]);
        setEditor.current = new BehaviorSubject([new TestOption('id', 'value')]);
        
        setEditor.ngOnInit();
        
        expect(setEditor.actualAvailable.length).toEqual(1);
        expect(setEditor.actualAvailable[0].id).toEqual('id2');
        expect(setEditor.actualCurrent.length).toEqual(1);
        expect(setEditor.actualCurrent[0].id).toEqual('id');
    });
    
    it('when adds updates underlying observable', () => {
        let dictionary = new Dictionary<TestOption>();
        dictionary['id'] = new TestOption('id', 'value');
        
        setEditor.toAdd.next(dictionary);
        
        setEditor.current = new BehaviorSubject([]);
        
        setEditor.add();
        
        expect(setEditor.current.value.length).toEqual(1);
        expect(setEditor.current.value[0]).toBe(dictionary['id']);
        expect(Object.keys(setEditor.toAdd.value).length).toBe(0);
    });
    
    it('when removes updates underlying observable', () => {
        let dictionary = new Dictionary<TestOption>();
        dictionary['id'] = new TestOption('id', 'value');
        
        setEditor.toRemove.next(dictionary);
                
        setEditor.current = new BehaviorSubject([dictionary['id']]);
        
        setEditor.getId = option => option.id;
        
        setEditor.remove();
        
        expect(setEditor.current.value.length).toEqual(0);
        expect(Object.keys(setEditor.toRemove.value).length).toBe(0);
    });
});
