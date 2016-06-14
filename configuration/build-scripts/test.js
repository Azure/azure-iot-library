/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

"use strict";
var gulp = require("gulp"),
    jasmine = require("gulp-jasmine"),
    istanbul = require("gulp-istanbul"),
    opener = require("opener"),
    remap = require("remap-istanbul/lib/gulpRemapIstanbul"),
    build = require("./build.js"),
    config = require("./config.js").config;

gulp.task("pre-test", build, () => {
    return gulp.src([`${config.cleanDir}/*.js`, `!${config.cleanDir}/*.spec.js`])
        .pipe(istanbul())
        .pipe(istanbul.hookRequire());
});

gulp.task("do-test", ["pre-test"], () => {
    return gulp.src([`${config.testDir}/*.spec.js`])
        .pipe(jasmine())
        .pipe(istanbul.writeReports({
            dir: config.testDir,
            reporters: ["json"]
        }));
});

gulp.task("post-test", ["pre-test", "do-test"], () => {
    var remapAction = gulp.src(`${config.testDir}/coverage-final.json`)
        .pipe(remap({
            basePath: config.src,
            reports: {
                "json": `${config.testDir}/coverage.json`,
                "html": `${config.testDir}/html-report`
            }
        }))
        //.once("end", () => { process.exit(); });

    remapAction.on("end", () => opener(["chrome", `${config.testDir}/html-report/index.html`]));
    return remapAction;
});

gulp.task("test", ["pre-test", "do-test", "post-test"]);

module.exports = ["test"];
