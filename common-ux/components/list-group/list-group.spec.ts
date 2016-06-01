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

import {ListGroup} from '../list-group';

class TestOption {
    constructor(
        public id: string,
        public name: string
    ) {}
}

describe('List Group:', () => {
    
    var listGroup: ListGroup<TestOption> = null;
    
    beforeEach(() => {
        listGroup = new ListGroup<TestOption>();
        listGroup.getLabel = option => option.name;
    });
    
    it('by default, uses JSON.stringify', () => {
        let option = new TestOption('id', 'value');
        expect(listGroup.getId(option)).toEqual(JSON.stringify(option));
    });
    
    describe('selection:', () => {
        
        beforeEach(() => {
            listGroup.getId = option => option.id;
        });
        
        it('selects an option', (done) => {
            let option = new TestOption('id', 'value');
            
            listGroup.select(option)
            
            listGroup.selection.subscribe(selection => {
                expect(selection['id']).toEqual(option);
                done();
            });
        });
        
        it('selects multiple options', (done) => {
            let options = [
                new TestOption('id', 'value'),
                new TestOption('id2', 'value')
            ];
            
            options.forEach(option => listGroup.select(option));
            
            listGroup.selection.subscribe(selection => {
                options.forEach(option => expect(selection[option.id]).toEqual(option));
                done();
            });
        });
        
        it('deselects double selected options in multi-select', (done) => {
            let options = [
                new TestOption('id', 'value'),
                new TestOption('id2', 'value'),
                new TestOption('id2', 'value')
            ];
            
            options.forEach(option => listGroup.select(option));
            
            listGroup.selection.subscribe(selection => {
                expect(selection['id']).toEqual(options[0]);
                expect(selection['id2']).toBeUndefined();
                done();
            });
        });
        
        it('deselects double selected options in multi-select', (done) => {
            let options = [
                new TestOption('id', 'value'),
                new TestOption('id2', 'value'),
                new TestOption('id2', 'value')
            ];
            
            options.forEach(option => listGroup.select(option));
            
            listGroup.selection.subscribe(selection => {
                expect(selection['id']).toEqual(options[0]);
                expect(selection['id2']).toBeUndefined();
                done();
            });
        });
        
        it('selects single option', (done) => {
            listGroup.isMultiple = false;
            
            let options = [
                new TestOption('id', 'value'),
                new TestOption('id2', 'value')
            ];
            
            options.forEach(option => listGroup.select(option));
            
            listGroup.selection.subscribe(selection => {
                expect(selection['id']).toBeUndefined();
                expect(selection['id2']).toEqual(options[1]);
                done();
            });
        });
        
        it('deselects single option', (done) => {
            listGroup.isMultiple = false;
            
            let options = [
                new TestOption('id', 'value'),
                new TestOption('id', 'value')
            ];
            
            options.forEach(option => listGroup.select(option));
            
            listGroup.selection.subscribe(selection => {
                expect(selection['id']).toBeUndefined();
                done();
            });
        });
    });
});
