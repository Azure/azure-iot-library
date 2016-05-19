/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * This is used to measure performance of redraws as well as counts of these redraws
 * It is heavily inspired by https://angular.io/docs/ts/latest/guide/lifecycle-hooks.html#!#docheck
 * This directive should be used for debugging, and not ship with published code
 */
import {Directive, Input, OnInit, AfterViewInit, DoCheck, AfterViewChecked, OnDestroy} from 'angular2/core';

class PerformanceMeasurement {
    public average: number = 0;
    public count: number = 0;
    public add(value: number) {
        this.count++;
        this.average = this.average + (value - this.average) / this.count;
    }
}

/**
 * Measurement statistics that are reported out on each report: these are global
 */
let measurementStatistics: {
    count: number;
    numDestroys: number;
    averageInitTime: { [group: string]: PerformanceMeasurement };
    averageCheckTime: { [group: string]: PerformanceMeasurement };
} = {
    count: 0,
    numDestroys: 0,
    averageInitTime: {},
    averageCheckTime: {}
}

/**
 * Timeout for the next report - used to debounce reports
 */
let nextReport = null;

/**
 * Report a single performance metric, like check or init time
 */
function reportMetric(group: { [group: string]: PerformanceMeasurement }, prefix: string = ''): string[] {
    return Object.keys(group).map(name => {
        return name + ': ' + group[name].count + ' : ' + (group[name].average * 1000000).toPrecision(8) + 'ns';
    });
}

/**
 * Do the report
 */
function report() {
    console.log(
`PERFORMANCE SPY INFORMATION:
  Spies: ${measurementStatistics.count}
  Number of destroys: ${measurementStatistics.numDestroys}
  Init Performance:
    ${reportMetric(measurementStatistics.averageInitTime).join('\n    ')}
  Check Performance:
    ${reportMetric(measurementStatistics.averageCheckTime).join('\n    ')}
`);
    measurementStatistics.averageInitTime = {}; 
    measurementStatistics.averageCheckTime = {};
    measurementStatistics.numDestroys = 0;
    nextReport = null;
}

/**
 * Debounced reports
 */
function debouncedReport() {
    if (nextReport) return;
    nextReport = setTimeout(report, 1000)
}

/**
 * Actual spy
 */
@Directive({
    selector: '[spy-performance]'
})
export class PerformanceSpy implements OnInit, DoCheck, AfterViewChecked, OnDestroy {
    
    public static globallyEnabled: boolean = true;
    
    @Input('spy-performance') grouping: string = 'ungrouped';
    @Input('spy-performance-enabled') enabled: boolean = true;
    
    private initCheck: number = null;
    
    private startCheck: number = null;
    
    ngOnInit() {
        if (!this.enabled && PerformanceSpy.globallyEnabled) return;
        measurementStatistics.count++;
        debouncedReport();
        this.initCheck = performance.now();
    }
    
    ngAfterViewInit() {
        if (!this.enabled && PerformanceSpy.globallyEnabled) return;
        if (this.initCheck) {
            var groupAverage = measurementStatistics.averageInitTime[this.grouping];
            if (!groupAverage) {
                groupAverage = measurementStatistics.averageInitTime[this.grouping] = new PerformanceMeasurement();
            }
            groupAverage.add(performance.now() - (this.initCheck || 0));
            debouncedReport();
            this.initCheck = null;
        }
    }
    
    ngDoCheck() {
        if (!this.enabled && PerformanceSpy.globallyEnabled) return;
        this.startCheck = performance.now()
    }
    
    ngAfterViewChecked() {
        if (!this.enabled && PerformanceSpy.globallyEnabled) return;
        var groupAverage = measurementStatistics.averageCheckTime[this.grouping];
        if (!groupAverage) {
            groupAverage = measurementStatistics.averageCheckTime[this.grouping] = new PerformanceMeasurement();
        }
        groupAverage.add(performance.now() - (this.startCheck || 0));
        debouncedReport();
        this.startCheck = null;
    }
    
    ngOnDestroy() {
        if (!this.enabled && PerformanceSpy.globallyEnabled) return;
        measurementStatistics.count--;
        measurementStatistics.numDestroys++;
        debouncedReport();
    }
}
