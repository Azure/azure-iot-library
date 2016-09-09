/* Copyright (c) Microsoft Corporation. All Rights Reserved. */
import {KeyVaultConfiguration} from './keyVaultConfiguration';

describe('KeyVault configuration provider', () => {
    it('getSecret correctly gets values', done => async function() {
        // arrange
        const key = 'secret key';
        const expectedValue = 'keyboard cat';
        const client = {
            getSecret: jasmine.createSpy('getSecret').and.callFake((id, callback) => {
                expect(id).toBe(key);
                callback(null, expectedValue);
            })
        };

        const config = new KeyVaultConfiguration(client);

        // act
        const actualValue = await config.getSecret(key);

        // assert
        expect(actualValue).toBe(expectedValue);
    }().then(done, done.fail));

    it('getSecret throws error', done => async function() {
        // arrange
        const key = 'secret key';
        const expectedError = new Error('hello, world');
        const client = {
            getSecret: jasmine.createSpy('getSecret').and.callFake((id, callback) => {
                callback(expectedError, null);
            })
        };

        const config = new KeyVaultConfiguration(client);

        // act
        await config.getSecret(key);
    }().then(done.fail, done)); // act: expect error to have been thrown
});
