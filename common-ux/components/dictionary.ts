/* Copyright (c) Microsoft Corporation. All Rights Reserved. */
/**
 * Dictionary helper declaration
 */
export class Dictionary<T> {
    /**
     * Dictionary get and set
     */
    [key: string]: T;
    
    /**
     * Convenience constructor
     */
    constructor() {}   
}