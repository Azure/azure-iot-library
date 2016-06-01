/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {Component, Input, Output, EventEmitter, ElementRef, NgZone, ViewEncapsulation, ViewChild} from '@angular/core';
import {IGridSourceFilter, GridSource, GridSourceView, ArrayGridSource} from './grid/grid.source';
import {GridConfiguration, SelectionStyle} from './grid/grid.configuration';
import {PerformanceSpy} from './performance-spy';
import {GridBodyPresentation, RowsGridBody, ListGridBody, PresentationOnBreakpoint} from './grid/grid.presentation';
import {BehaviorSubject, Subscription} from 'rxjs/Rx';
import {GlobalContext} from './globalContext';

const minimumColumnWidth: number = 20;
const doubleCellPadding: number = 12;
const arrowsOffset: number = 20;

/**
 * This is a shared grid component, which is used in multiple views. It supports a lens view of the underlying data and selection
 */
@Component({
    selector: 'grid',
    template: require('grid/grid.html'),
    styles: [require('grid/grid.scss')],
    directives: [PerformanceSpy, RowsGridBody, ListGridBody],
    encapsulation: ViewEncapsulation.None
})
export class Grid<T> extends GlobalContext {

    /**
     * Resources; see GlobalContext for more information
     */
    @Input('resources') Resources;

    /**
     * This is the source that is passed in; it can be either an array, or a full grid source
     */
    @Input() public source: GridSource<T> | T[];

    /**
     * This is the configuration that we use to determine what columns to use
     */
    @Input() public configuration: GridConfiguration<T>;

    /**
     * This means that there is a performance spy; if so, use the group specified for sub groups for columns
     * OPTIONAL: by default it is null; if the 'spy-performance' attribute is set, then it will enhance the groups with those in the grid
     */
    @Input('spy-performance') performanceSpyGroup: string = null;

    /**
     * This is whether or not to enable performance logging through performance spies
     * OPTIONAL: by default it is true, but spy performance won't be enabled unless the 'spy-performance' attribute is present
     */
    @Input('spy-performance-enabled') performanceSpyEnabled: boolean = true;

    /**
     * This will toggle polling; if not passed, will not present the checkbox to poll
     * If no parameters passed, it is expected to return if we are currently polling
     * OPTIONAL: when not present, the checkbox for turning on and off polling is hidden
     */
    @Input() public poll: (shouldPoll?: boolean) => boolean;

    /**
     * This is the current presentation
     */
    @Input() public currentPresentation = new BehaviorSubject<GridBodyPresentation>(GridBodyPresentation.List);

    /**
     * This is the selection changed event that returns the ids of what was selected
     */
    @Output() public selectionChanged: EventEmitter<T[]> = new EventEmitter<T[]>();

    /**
     * This occurs when a row is double clicked
     */
    @Output() public rowDoubleClick: EventEmitter<T> = new EventEmitter<T>();
    /**
     * Reference to the grid element
     */
    public get gridElement(): HTMLDivElement {
        return this.element.nativeElement.querySelector('.grid');
    }

    /**
     * This is used to do enum checks in the view
     */
    public Presentation = GridBodyPresentation;

    /**
     * These are the currently visible rows
     */
    public rows: T[];

    /**
     * This is the open grid view (if we have one); make sure to close it when this view is finished
     */
    public gridView: GridSourceView<T>;

    /**
     * This is the last time an update was recieved
     */
    public lastUpdated: Date;

    /**
     * Top level classes
     */
    public classMap = {
        'selection-enabled': true
    };

    /**
     * Column widths
     */
    public columnWidths: string[];

    /**
     * These properties are used when we're doing a column resize operation
     */
    public columnResize = {
        startX: 0,
        column: null,
        touchIdentifier: null
    };

    /**
     * Currently tapped column: used to enable/disable mobile column resizing
     */
    public currentlyTappedColumn: number = -1;

    /**
     * Header class maps
     */
    public headerClassMaps: { [className: string]: boolean }[];

    /**
     * Column class maps
     */
    private columnClassMaps: { [className: string]: boolean }[];

    /**
     * If we're using an array, this is the array grid source
     */
    private arrayGridSource: ArrayGridSource<T>;

    /**
     * The actual grid source instance
     */
    private gridSource: GridSource<T>;

    /**
     * Subscription to grid source
     */
    private gridSourceSubscription: Subscription;

    constructor(
        public element: ElementRef,
        public zone: NgZone
    ) {
        super();
    }

    /**
     * ANGULAR LIFECYCLE: when our DOM is loaded, then grab a reference to the grid element
     */
    ngOnInit() {
        this.currentPresentation.subscribe(() => this.zone.run(() => {}));
    }

    /**
     * ANGULAR LIFECYCLE: When we're recieving new properties, subscribe to our data
     */
    ngOnChanges() {

        if (Array.isArray(this.source)) {
            if (!this.arrayGridSource) {
                this.gridSource = this.arrayGridSource = new ArrayGridSource<T>([]);
            }
            this.arrayGridSource.rows = <T[]>this.source;
            this.arrayGridSource.update();
        } else if (this.source !== null) {
            this.gridSource = <GridSource<T>>this.source;
        }

        if (this.gridView) {
            this.gridView.close();
        }

        if (this.gridSourceSubscription) {
            this.gridSourceSubscription.unsubscribe();
        }

        this.rows = [];

        this.gridView = this.gridSource.open();

        this.gridSourceSubscription = this.gridView.subscribe(rows => {
            this.rows = rows;
            this.lastUpdated = new Date();
        });

        if (!this.configuration) {
            console.error('Missing a configuration on the grid');
        } else {
            // precalculate class maps for columns and headers
            this.updateWidths();
            this.updateColumnClasses();
        }

        this.lastUpdated = new Date();
    }

    /**
     * ANGULAR LIFECYCLE: When we're done, close our view
     */
    ngOnDestroy() {
        if (this.gridView) {
            this.gridView.close();
        }
    }

    /**
     * Used in the view to set the sort of the table
     */
    setSort(column) {
        // do not set sort when doing a resize
        if (!this.columnResize.column && !!column.sortable) {
            var filter: IGridSourceFilter = this.gridSource.filter.value;

            if (filter.sorted) {
                if (filter.sorted.columnKey === column.key) {
                    filter.sorted.ascending = !filter.sorted.ascending;
                }
                else {
                    filter = this.defaultSort(column.key);
                }
            }
            else {
                filter = this.defaultSort(column.key);
            }
            this.gridSource.filter.next(filter);
        }
    }

    /**
     * If we haven't previously sorted the grid, do so here
     */
    defaultSort(columnKey: string): IGridSourceFilter {
        return {
            sorted:
            {
                columnKey: columnKey,
                ascending: true
            }
        };
    }

    /**
     * Update widths
     */
    updateWidths() {
        this.columnWidths = [];
        this.columnWidths.length = this.configuration.columns.length;
        for (var i = 0; i < this.configuration.columns.length; i++) {
            this.columnWidths[i] = this.getWidth(i);
        }
    }

    /**
     * Update column classes
     */
    updateColumnClasses() {
        this.columnClassMaps = [];
        this.headerClassMaps = [];
        for (var i = 0; i < this.configuration.columns.length; i++) {
            this.columnClassMaps[i] = this.getColumnClasses(i);
            this.headerClassMaps[i] = this.getHeaderClasses(i);
        }
    }

    /**
     * Used in the view when selecting a row
     */
    selectRow(rows) {
        this.selectionChanged.emit(rows);
    }

    /**
     * Used in the view when selecting all
     */
    selectAll() {
        // skip in case of select all
        if (this.configuration.selectionStyle < SelectionStyle.MultiSelect) return;

        var selection = this.gridSource.selection.value;

        if (this.areAllRowsSelected()) {
            selection = {};
        } else {
            for (var i = 0; i < this.rows.length; i++) {
                var id = this.gridSource.getId(this.rows[i]);
                selection[id] = this.rows[i];
            }
        }

        this.gridSource.selection.next(selection);
        this.selectionChanged.emit(Object.keys(selection).map(id => selection[id]));
    }

    areAllRowsSelected() {
        return this.rows && Object.keys(this.gridSource.selection.value).length === this.rows.length && this.rows.length > 0;
    }

    touchStartColumnResize($event: TouchEvent, i: number) {
        var column = this.configuration.columns[i];

        var header = this.element.nativeElement.querySelector(`[data-column-header=col${i}]`);

        this.zone.run(() => {
            this.headerClassMaps[i] = this.getHeaderClasses(i);
            this.columnClassMaps[i] = this.getColumnClasses(i);
        });


        // get initial width in pixels
        this.columnResize.startX = $event.targetTouches[0].clientX - (column.width || header.clientWidth);
        this.columnResize.column = column;
        this.columnResize.touchIdentifier = $event.targetTouches[0].identifier;

        document.body.addEventListener('touchmove', this.touchColumnResizeHandler);
        document.body.addEventListener('touchend', this.touchStopColumnResize);
    }

    touchColumnResizeHandler = ($event: TouchEvent) => {
        // find our event
        var i = $event.touches.length - 1;
        for (; i >= 0; --i) {
            if ($event.touches.item(i).identifier === this.columnResize.touchIdentifier) {
                break;
            }
        }

        // couldn't find our event
        if (i < 0) return;

        var touch = $event.touches.item(i);

        // calculate new width
        this.zone.run(() => {
            var newWidth = Math.min(touch.clientX, this.gridElement.clientWidth - minimumColumnWidth) - this.columnResize.startX;
            newWidth = Math.max(newWidth, minimumColumnWidth);
            this.columnResize.column.width = newWidth;
            this.updateWidths();
        });
    };

    touchStopColumnResize = ($event: TouchEvent) => {

        var i = $event.changedTouches.length - 1;
        for (; i >= 0; --i) {
            if ($event.changedTouches.item(i).identifier === this.columnResize.touchIdentifier) {
                break;
            }
        }

        // couldn't find our event
        if (i < 0) return;

        this.endResize();
        document.body.removeEventListener('touchmove', this.touchColumnResizeHandler);
        document.body.removeEventListener('touchend', this.touchStopColumnResize);
    };

    startColumnResize($event: MouseEvent, i: number) {
        var column = this.configuration.columns[i];

        var header = this.element.nativeElement.querySelector(`[data-column-header=col${i}]`);

        this.zone.run(() => {
            this.headerClassMaps[i] = this.getHeaderClasses(i);
            this.columnClassMaps[i] = this.getColumnClasses(i);
        });

        // get initial width in pixels
        this.columnResize.startX = $event.clientX - (column.width || header.clientWidth);
        this.columnResize.column = column;

        document.body.addEventListener('mousemove', this.columnResizeHandler);
        document.body.addEventListener('mouseup', this.stopColumnResize);
        document.body.classList.add('resizing-columns');
    }

    columnResizeHandler = ($event: MouseEvent) => {
        // calculate new width
        this.zone.run(() => {
            var newWidth = Math.min($event.clientX, this.gridElement.clientWidth - minimumColumnWidth) - this.columnResize.startX;
            newWidth = Math.max(newWidth, minimumColumnWidth);
            this.columnResize.column.width = newWidth;
            this.updateWidths();
        });
    };

    stopColumnResize = ($event: MouseEvent) => {
        this.endResize();
        document.body.removeEventListener('mousemove', this.columnResizeHandler);
        document.body.removeEventListener('mouseup', this.stopColumnResize);
        document.body.classList.remove('resizing-columns');
    };

    endResize() {
        setTimeout(() => {
            this.columnResize.startX = 0;
            this.columnResize.column = null;
            this.columnResize.touchIdentifier = null;
        });
    }

    touchHeader(columnIndex) {
        var currentColumn = this.currentlyTappedColumn;
        this.currentlyTappedColumn = columnIndex;
        this.headerClassMaps[columnIndex] = this.getHeaderClasses(columnIndex);
        if (currentColumn >= 0) {
            this.headerClassMaps[currentColumn] = this.getHeaderClasses(currentColumn);
        }
    }

    doubleClickHeader(columnIndex) {
        this.configuration.columns[columnIndex].width
            = this.element.nativeElement.querySelector(`[data-column-header=col${columnIndex}] .content span`).offsetWidth
            + doubleCellPadding
            + arrowsOffset;
        this.updateWidths();
    }

    getColumnClasses(index): { [className: string]: boolean } {
        var classMap: { [className: string]: boolean } = {};
        classMap['absolute'] = this.configuration.columns[index].width && index !== this.configuration.columns.length - 1;
        return classMap;
    }

    getHeaderClasses(index): { [className: string]: boolean } {
        var classMap = this.getColumnClasses(index);
        classMap['tapped'] = index === this.currentlyTappedColumn;
        return classMap;
    }

    hasSelectionBox() {
        return this.configuration.selectionStyle != SelectionStyle.None;
    }

    getWidth(index): string {
        if (this.configuration.columns[index].width && index !== this.configuration.columns.length - 1) {
            return `${this.configuration.columns[index].width}px`;
        } else {
            return Math.floor(100 / this.configuration.columns.length) + '%';
        }
    }

    doubleClickRow(row: T) {
        this.rowDoubleClick.emit(row);
    }

    getArrowClass(ascending: boolean, index: number) {
        var column = this.configuration.columns[index];
        var filter = this.gridSource.filter.value;

        if (!filter || !filter.sorted) return;

        return {
            'current': column.key === filter.sorted.columnKey && filter.sorted.ascending === ascending
        };
    }
}

/**
 * These exports keep the import statements centralized
 */
export {GridSource, GridBodyPresentation, IGridSourceFilter, GridSourceView, GridConfiguration, SelectionStyle, PresentationOnBreakpoint};
export {SelectionUpdateStrategies} from './grid/grid.source';
