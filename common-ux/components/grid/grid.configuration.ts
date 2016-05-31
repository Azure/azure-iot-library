/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export enum SelectionStyle {
    None = 0,
    SingleSelect = 1,
    MultiSelect = 2
}

/**
 * Grid configuration represents the display of the current grid
 */
export class GridConfiguration<T> {
    public columns: {
        header: () => string;
        value: (data: T) => string;
        key: string;
        width?: number;
        sortable?: boolean;
    }[];
    public selectionStyle: SelectionStyle;
}