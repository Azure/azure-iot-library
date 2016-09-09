/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * Test Configuration's getString and get<T> methods.
 *
 * Specs test:
 *      - returned value is correct value and type
 *      - unset keys return null
 *      - providers are consulted in the correct order
 *        (file, env, mongo, then default)
 */

import {MongoClient} from 'mongodb';
import {config} from './configuration';

describe('Configuration provider', () => {
    let configFilename: string;

    let fileKeys: { [key: string]: any };
    let envKeys: { [key: string]: any };
    let mongoKeys: { [key: string]: any };
    let defaultKeys: { [key: string]: any };
    let keysNotPresent: string[];

    let collectionStub;
    let findOneStub;
    let updateOneStub;

    beforeEach( done => async function() {
        spyOn(console, 'log');

        // Prevent state leakage between specs
        configFilename = `${__dirname}/../test/user-config-test.json`;
        fileKeys = {
            FILE_KEY_1: 'file-val-1',
            SHARED_KEY_1: 'shared-val-1',
            FILE_FRUIT_OBJECT: { 'fruit': ['apple', 'banana'] },
            NESTED_OBJECT: {
                'apples': {
                    'gala': 41,
                    'jonagold': 42,
                    'honeycrisp': '43'
                }
            }
        };
        envKeys = {
            ENV_KEY_1: 'env-val-1',
            SHARED_KEY_1: 'shared-val-1',
            SHARED_KEY_2: 'shared-val-2'
        };
        mongoKeys = {
            MONGO_KEY_1: 'mongo-val-1',
            SHARED_KEY_1: 'shared-val-1',
            SHARED_KEY_2: 'shared-val-2',
            SHARED_KEY_3: 'shared-val-3',
            MONGO_FRUIT_OBJECT: { 'fruit': ['cherry', 'date'] },
            NESTED_OBJECT: {
                'apples': {
                    'gala': 'mongo',
                    'cripps pink': 'mongo',
                }
            }
        };
        defaultKeys = {
            DEFAULT_KEY_1: 'default-val-1',
            SHARED_KEY_1: 'shared-val-1',
            SHARED_KEY_2: 'shared-val-2',
            SHARED_KEY_3: 'shared-val-3',
            NESTED_OBJECT: {
                'apples': {
                    'gala': 'default',
                    'cripps pink': 'default',
                    'northern spy': 'default'
                }
            },
            SECRET_KEY_1: {
                value: 'secret-value-1'
            }
        };
        keysNotPresent = ['NOT_PRESENT_1', 'NOT_PRESENT_2'];
        for (let key in envKeys) {
            process.env[key] = envKeys[key];
        }

        // Stub mongoConfig calls
        findOneStub = jasmine.createSpy('findOne')
            .and.callFake( (_, callback) => {
                callback(null, mongoKeys);
        });
        updateOneStub = jasmine.createSpy('updateOne')
            .and.callFake( (_, set, __) => {
                const update = set['$set'];
                const key = Object.keys(update)[0];
                const value = update[key];
                mongoKeys[key] = value;
            });
        collectionStub = jasmine.createSpy('collection').and.returnValue({
                'findOne': findOneStub,
                'updateOne': updateOneStub
        });
        // Spy on MongoClient's connect method by allowing the ability
        // to get a stubbed collection object from db.collection(collectionName)
        spyOn(MongoClient, 'connect').and.callFake( (_, callback) => {
            const databaseStub = {
                collection: collectionStub,
                close: () => {}
            };
            callback(null, databaseStub);
        });

        const initializeParams = {
            defaultValues: defaultKeys,
            requiredKeys: ['ENV_KEY_1', 'MONGO_KEY_1'],
            configFilename: configFilename,
            logger: () => {}  // silence logs
        };
        await config.initialize(initializeParams);
    }().then(done, done.fail));

    afterEach( () => {
        // Check that the logger param is used, not the global console.log
        expect(console.log).not.toHaveBeenCalled();
    });

    it('should return correctly set values', () => {
        expect(config.get('FILE_FRUIT_OBJECT')).toEqual(fileKeys['FILE_FRUIT_OBJECT']);
        expect(config.getString('FILE_KEY_1')).toEqual(fileKeys['FILE_KEY_1']);
        expect(config.getString('ENV_KEY_1')).toEqual(process.env['ENV_KEY_1']);
        expect(config.getString('MONGO_KEY_1')).toEqual(mongoKeys['MONGO_KEY_1']);
        expect(config.getString('DEFAULT_KEY_1')).toEqual(defaultKeys['DEFAULT_KEY_1']);
        expect(config.get('NESTED_OBJECT')).toEqual(fileKeys['NESTED_OBJECT']);
        expect(config.get(['NESTED_OBJECT', 'apples'])).toEqual(fileKeys['NESTED_OBJECT']['apples']);
    });

    it('should return null for unset values', () => {
        expect(config.get(keysNotPresent[0])).toEqual(null);
        expect(config.get(keysNotPresent[1])).toEqual(null);
        expect(config.getString(keysNotPresent[0])).toEqual(null);
        expect(config.getString(keysNotPresent[1])).toEqual(null);
        expect(config.get(['NESTED_OBJECT', 'apples', 'red delicious'])).toEqual(null);
        expect(config.get(['NESTED_OBJECT', 'bananas'])).toEqual(null);
        expect(config.get(['NESTED_OBJECT', 'cherries', 'royal ann'])).toEqual(null);
    });

    it('should enforce preference in provider order', () => {
        // File takes preference over env and mongo
        expect(config.getString('SHARED_KEY_1')).toEqual(fileKeys['SHARED_KEY_1']);
        expect(config.get(['NESTED_OBJECT', 'apples', 'gala'])).toEqual(41);
        // Env takes preference over mongo
        expect(config.getString('SHARED_KEY_2')).toEqual(envKeys['SHARED_KEY_2']);
        expect(config.get(['NESTED_OBJECT', 'apples', 'cripps pink'])).toEqual('mongo');
        // Mongo takes preference over default
        expect(config.getString('SHARED_KEY_3')).toEqual(mongoKeys['SHARED_KEY_3']);
        expect(config.get(['NESTED_OBJECT', 'apples', 'northern spy'])).toEqual('default');
    });

    it('get secret should return null for unset values', done => async function() {
        // arrange
        const key = keysNotPresent[0];

        // act
        const secret = await config.getSecret(key);

        // assert
        expect(secret).toBeNull();
    }().then(done, done.fail));

    it('get secret should return already-defined values', done => async function() {
        // arrange
        const key = 'SECRET_KEY_1';

        // act
        const secret = await config.getSecret(key);

        // assert
        expect(secret.value).toEqual('secret-value-1');
    }().then(done, done.fail));
});

describe('Configuration provider with no Mongo URI', () => {
    let configFilename: string;

    beforeEach( () => {
        // Prevent state leakage between specs
        configFilename = `${__dirname}/../test/user-config-no-uri.json`;
    });

    it('should log the lack of URI', done => async function() {
        const logger = jasmine.createSpy('logger');
        const initializeParams = {
            configFilename: configFilename,
            logger: logger  // spy on log calls
        };
        await config.initialize(initializeParams);
        expect(logger).toHaveBeenCalled();
    }().then(done, done.fail));

    it('should throw if there are unsatisfied required keys', done => async function() {
        const initializeParams = {
            requiredKeys: ['REQUIRED_KEY'],
            configFilename: configFilename,
            logger: () => {}  // silence logs
        };
        try {
            await config.initialize(initializeParams);
            done.fail();
        } catch (err) {
            done();
        }
    }());
});
