/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * Grid source filter are the options for filtering a grid source
 */
export interface IGridSourceFilter {
    sorted?: {
        columnKey: string;
        ascending: boolean;
    };
}
