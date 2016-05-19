/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// used to validate the tests
export class RawStream {
    public arr = [];
    public write(record): void {
        console.log(record);
        this.arr.push(record);
    }

    public get(): JSON {
        return this.arr.pop();
    }

    public clear(): void {
        this.arr = [];
    }
}
