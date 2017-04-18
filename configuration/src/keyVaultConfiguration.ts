/* Copyright (c) Microsoft Corporation. All Rights Reserved. */
import * as fs from 'fs';
import * as KeyVault from 'azure-keyvault';
const AuthenticationContext = require('adal-node').AuthenticationContext;

export interface KeyVaultConfigurationOptions {
    /** The OAuth client id of the calling application. */
    clientId: string;

    /** The file path of the PEM encoded certificate private key. */
    certFile: string;

    /** The hex encoded thumbprint of the certificate. */
    certThumbprint: string;

    storageConnectionStringId?: string;
}


export class KeyVaultConfiguration {
    public constructor(private client: KeyVault.KeyVaultClient) {
    }

    /**
     * Initializes a new instance of KeyVaultConfiguration with a certificate credential.
     * @param   {KeyVaultConfigurationOptions} The Configuration Options.
     * @return  {KeyVaultConfiguration}     A new KeyVaultConfiguration instance.
     */
    public static initialize(options: KeyVaultConfigurationOptions): KeyVaultConfiguration {
        const credentials = new KeyVault.KeyVaultCredentials((challenge, callback) => {
            // Read the certificate from the file:
            fs.readFile(options.certFile, 'utf8', (err, certificate) => {
                if (err) {
                    return callback(new Error(`Could not read certificate file '${options.certFile}': ${err}`), null);
                }

                // Create a new authentication context.
                const context = new AuthenticationContext(challenge.authorization);

                // Use the context to acquire an authentication token.
                return context.acquireTokenWithClientCertificate(
                    challenge.resource,
                    options.clientId,
                    certificate,
                    options.certThumbprint,
                    (err, tokenResponse) => {
                        if (err) {
                            return callback(new Error(`Could not acquire AAD token: ${err}`), null);
                        }

                        // Calculate the value to be set in the request's Authorization header and resume the call.
                        const authorizationValue = tokenResponse.tokenType + ' ' + tokenResponse.accessToken;
                        return callback(null, authorizationValue);
                    });
            });
        });

        const client = new KeyVault.KeyVaultClient(credentials);
        return new KeyVaultConfiguration(client);
    }

    /**
     * Gets the value of a specified secret from KeyVault.
     *
     * @param {string}  id   The secret identifier. It may or may not contain a version path. If a version is not provided, the latest secret version is used.
     * @return {Promise<KeyVault.models.SecretBundle>} A promise that will contain the secret's attributes on completion.
     */
    public getSecret(id: string) {
        return new Promise<KeyVault.models.SecretBundle>((resolve, reject) =>
            this.client.getSecret(id, (err, result) =>
                err ? reject(new Error(`Could not fetch secret with id '${id}': ${err}`))
                    : resolve(result)));
    }
}
