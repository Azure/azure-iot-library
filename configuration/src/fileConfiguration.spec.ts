/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * Test FileConfiguration's getString and get<T> methods.
 *
 * Utilizes the ./test/user-config-test.json file.
 * Specs test:
 *      - returned value is correct value and type
 *      - unset keys return null
 *      - log whether config file is present
 *      - throw error if getString tries to return non-string value
 *      - throw error if config file unreadable or contains syntax errors
 */

import { FileConfiguration } from './fileConfiguration';

describe('File configuration provider', () => {
    let fileConfig: FileConfiguration;
    let configFilename: string;
    let fileKeys: { [key: string]: any };
    let keysNotInFile: string[];

    // Read file configuration
    beforeEach(done => async function () {
        // Silence console.log with a spy
        spyOn(console, 'log');
        // Prevent state leakage between specs
        configFilename = `${__dirname}/../test/user-config-test.json`;
        fileKeys = {
            FILE_KEY_1: 'file-val-1',
            FILE_KEY_2: 'file-val-2',
            FILE_FRUIT_OBJECT: { 'fruit': ['apple', 'banana'] },
            NESTED_OBJECT: {
                'apples': {
                    'gala': 41,
                    'jonagold': 42,
                    'honeycrisp': '43'
                }
            }
        };
        keysNotInFile = ['NOT_PRESENT_1', 'NOT_PRESENT_2'];

        fileConfig = new FileConfiguration();
        await fileConfig.initialize(configFilename);
    }().then(done, done.fail));  // execute async function and then call done/done.fail

    it('gets correctly set values', () => {
        expect(fileConfig.getString('FILE_KEY_1')).toEqual(fileKeys['FILE_KEY_1']);
        expect(fileConfig.getString('FILE_KEY_2')).toEqual(fileKeys['FILE_KEY_2']);
        expect(fileConfig.get<Object>('FILE_FRUIT_OBJECT'))
            .toEqual(fileKeys['FILE_FRUIT_OBJECT']);
        expect(fileConfig.get(['NESTED_OBJECT', 'apples', 'gala']))
            .toEqual(fileKeys['NESTED_OBJECT']['apples']['gala']);
    });

    it('returns null for unset keys', () => {
        expect(fileConfig.getString(keysNotInFile[0])).toEqual(null);
        expect(fileConfig.getString(keysNotInFile[1])).toEqual(null);
        expect(fileConfig.get(keysNotInFile[0])).toEqual(null);
        expect(fileConfig.get(keysNotInFile[1])).toEqual(null);
        expect(fileConfig.get(['NESTED_OBJECT', 'apples', 'red delicious'])).toEqual(null);
        expect(fileConfig.get(['NESTED_OBJECT', 'bananas'])).toEqual(null);
        expect(fileConfig.get(['NESTED_OBJECT', 'cherries', 'royal ann'])).toEqual(null);
    });

    it('does not throw an error when using getString() on a non-string value', () => {
        expect(() => fileConfig.get('FILE_KEY_1')).not.toThrow();
        expect(() => fileConfig.get('FILE_KEY_2')).not.toThrow();
        expect(() => fileConfig.getString('FILE_FRUIT_OBJECT')).not.toThrow();
        expect(() => fileConfig.getString(['NESTED_OBJECT', 'apples', 'gala']))
            .not.toThrow();
        expect(() => fileConfig.getString(['NESTED_OBJECT', 'apples', 'honeycrisp']))
            .not.toThrow();
    });
});

describe('File configuration provider with bad config file', () => {
    let fileConfig: FileConfiguration;
    let missingFilename: string;
    let malformedFilename: string;

    beforeEach(() => {
        // Silence console.log with spy; also used in a spec
        spyOn(console, 'log');
        // Prevent state leakage between specs
        missingFilename = './test/user-config-missing.json';
        malformedFilename = './test/user-config-malformed.json';
        fileConfig = new FileConfiguration();
    });

    it('should log when user-config file is missing', done => async function () {
        await fileConfig.initialize(missingFilename);
        expect(console.log).toHaveBeenCalled();
    }().then(done, done.fail));

    it('should throw when user-config file is malformed', done => async function () {
        await fileConfig.initialize(malformedFilename);
    }().then(done.fail, done));  // note switch of done and done.fail arguments
});
