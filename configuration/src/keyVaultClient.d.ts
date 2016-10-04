declare module 'azure-keyvault' {
    export interface ServiceCallback<TResult> {
        (err: Error, result: TResult);
    }

    export namespace models {
        /**
         * @class
         * Initializes a new instance of the Attributes class.
         * @constructor
         * The object attributes managed by the KeyVault service
         *
         * @member {boolean} [enabled] Determines whether the object is enabled
         *
         * @member {date} [notBefore] Not before date in UTC
         *
         * @member {date} [expires] Expiry date in UTC
         *
         * @member {date} [created] Creation time in UTC
         *
         * @member {date} [updated] Last updated time in UTC
         *
         */
        export interface Attributes {
            enabled?: boolean;
            notBefore?: Date;
            expires?: Date;
            created?: Date;
            updated?: Date;
        }

        /**
         * @class
         * Initializes a new instance of the SecretAttributes class.
         * @constructor
         * The secret management attributes
         *
         */
        export interface SecretAttributes extends Attributes {
        }

        export interface SecretBundle {
            value?: string;
            id?: string;
            contentType?: string;
            attributes?: SecretAttributes;
            tags?: { [propertyName: string]: string };
            kid?: string;
        }
    }

    export interface KeyVaultChallenge {
        authorization: string;
        resource: string;
    }

    export class KeyVaultCredentials {
        constructor(authenticator: (challenge: KeyVaultChallenge, authenticate: ServiceCallback<string>) => void);
    }

    export class KeyVaultClient {
        constructor(credentials: KeyVaultCredentials);

        /**
         * Performs a GET SECRET operation, which retrieves secret attributes from the service.
         *
         * @param {string}                              secretIdentifier      The secret identifier. It may or may not contain a version path. If a version is not provided, the latest secret version is used.
         * @param {KeyVaultClient~secretBundleCallback} callback              A callback that will be called on completion.
         */
        getSecret(secretIdentifier: string, callback: ServiceCallback<models.SecretBundle>): void;
    }
}
