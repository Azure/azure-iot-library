<!--
TODO: flesh this out more
-->
# Azure IoT Common UX

This package contains a number of bundled components shared across the Reference UXs.

## Consumption

    <script src="node_modules/@azure-iot/azure-iot-common-ux/client.js"></script>

    import {Grid} from '@azure-iot/azure-iot-common-ux/grid'

## Building Locally

When you build locally, it will add a number of .d.ts to your root: these are intended for the package consumption. In addition to that, it will add an 'unpacked.js', which doesn't have any of the templates/styles resolved, a 'client.js' which is unminified and includes the templates/styles, and a 'client.min.js' which is the same (but minified).

Remember to git clean frequently. Specifically:

    git clean -fx

## Grid

The grid is minimally used like this:

    <grid [source]="..." [configuration]="..."></grid>

Where `source` is an array, and `configuration` is an instance of a grid configuration.

It optionally can have three other parameters:

    [poll]="..." [resources]="..."
    
`poll` can be used to control polling; when passed 'true' it is intended to start polling, when passed 'false' it is intended to stop polling, and when no arguments are passed it is expected to return whether or not it is polling.

`resources` can be used to override resources; when not present, the default resources will be used. If present and a resource string that is expected is missing, the default resource will also be used.

Additionally you can use the performance spy and it will add break downs by column.

### Selection

In the configuration, there is a selection style enumerator. When it is 0, it means that selection is disabled and clicking will not change the selected rows. If it is 1, then it means that a single value can be selected and it will display a checkbox. If it is 2, then it will mean multiple values can be selected; when in this mode, clicking an already selected row will deselect it.

In any selection case, you can bind to selection changed events like this:

    (selectionChanged)="F($event)"
    
`$event` is an array of the currently selected rows. In the single select case, it will be an array with one item in it.

### Detailed performance diagnostics

If you add the performance spy below on the grid, it will have additional groups for each column and the total rows.

## Modal

The modal is used like this:

    <modal>...</modal>

The contents of the modal can be bound to in the parent scope. Different modal types should have different elements. You can then enable and disable them through the use of a boolean flag.

## Performance Spy

The performance spy can be used to spy on the performance of your angular2 components. It will log how long it will take to initialize and perform a check.

It can be used like this:

    <ANYTHING spy-performance ...></ANYTHING>
    
When this is added, it will then begin to measure performance. It will log it to the console when events occur (up to once a second). Messages look like this:

    PERFORMANCE SPY INFORMATION:
      Spies: 98
      Number of destroys: 0
      Init Performance:
        
      Check Performance:
        column-0: 28 : 147857.14ns
        column-1: 28 : 2142.8571ns
        column-2: 28 : 2678.5714ns
        column-3: 28 : 1964.2857ns

If you have `spy-performance="column-0"` then it will group measurements across multiple directive instances.

You can also programmatically control if a spy is enabled with the attribute `spy-performance-enabled` which needs to be bound to a boolean value (like in the grid example).

You can also universally turn of performance logging by setting the global check to false:

    import {PerformanceSpy} from '@azure-iot/azure-iot-common-ux/performance-spy';
    
    PerformanceSpy.globallyEnabled = false

## Theme

Including the theme folder as part of your sass compile will allow you to use the included variables. The path when installed looks like:

    ./node_modules/@azure-iot/azure-iot-common-ux/theme

Once you've done that, you can import anything in that directory in the following form:

    @import 'common-theme';
