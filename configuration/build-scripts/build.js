/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

"use strict";
var gulp = require("gulp"),
    ts = require("gulp-typescript"),
    fs = require('fs'),
    sourcemaps = require('gulp-sourcemaps'),
    config = require("./config.js").config;

gulp.task("build", [], () => {
    return gulp.src([`${config.tscDir}/*.ts`])
        .pipe(sourcemaps.init('maps'))
        .pipe(ts(getTsOptions(config.tsConfig)))
        .js
        .pipe(sourcemaps.write('maps', { includeContent: false }))
        .pipe(gulp.dest(config.cleanDir));
});

// Pull typescript options out of a config
var getTsOptions = (project) => {
    var options = JSON.parse(fs.readFileSync(project, 'utf8')).compilerOptions;
    options.typescript = require('typescript');
    return options;
}

module.exports = ["build"];
