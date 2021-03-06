module.exports = {
  init: function(grunt) {
    var phantomjs = require('grunt-lib-phantomjs').init(grunt);
    var chalk = require('chalk');
    var when = require('when');
    var _ = require('underscore');

    var phantomJSSpecRunner = {
      run: function(url, opt_options) {
        var promiseToRunSpecsDeferred = when.defer();
        var options = _.defaults(opt_options || {}, {
          timeout: 5000
        });

        bindPhantomEvents({
          'fail.load': function(url) {
            handleFail('PhantomJS unable to load url: ' + url);
          },
          'fail.timeout': _.partial(handleFail, 'PhantomJS timed out.'),
          'console': function(msg) {
            grunt.log.warn('CONSOLE: ' + msg);
          },
          'jasmine.error': function(msg) {
            handleFail(msg);
          },
          'jasmine.start': logStart,
          'jasmine.specResult': logSpecResult,
          'jasmine.runnerResult': logRunnerResults,
          'jasmine.done': function(isPassing) {
            phantomjs.halt();
            promiseToRunSpecsDeferred.resolve(isPassing);
          }
        });

        runPhantomJS(url, options);

        return promiseToRunSpecsDeferred.promise;




        function bindPhantomEvents(events) {
          _.each(events, function(handler, topic) {
            phantomjs.on(topic, handler);
          });
        }

        function runPhantomJS(url, options) {
          phantomjs.spawn(url, {
            options: {
              timeout: options.timeout
            },
            done: function(err) {
              // Handle errors in spawning PhantomJS
              if (err) {
                promiseToRunSpecsDeferred.reject(err);
              }
            }
          });
        }


        function handleFail(msg) {
          promiseToRunSpecsDeferred.reject(msg);
          phantomjs.halt();
        }

        function log(msg) {
          grunt.log.writeln('log: ' + msg);
        }

        function logStart(specCount) {
          logLineBreak();
          grunt.log.ok(chalk.cyan('Running ' + specCount + ' tests...'));
        }

        function logSpecResult(specDescr, isPassing) {
          var isVerbose = !!grunt.option('verbose');
          var chalkWrite = (isPassing ? chalk.green : chalk.red).bind(chalk);

          if (isVerbose) {
            grunt.verbose.writeln(chalkWrite(specDescr));
          }
          else {
            var mark = isPassing ? '.' : 'X';
            grunt.log.write(chalkWrite(mark));
          }
        }


        function logRunnerResults(results) {
          var isPassing = results.passedCount === results.totalCount;

          var message = ('Test results: {passedCount} / {totalCount} expectations passing ' +
            'in {seconds}s.').
            replace('{passedCount}', results.passedCount).
            replace('{totalCount}', results.totalCount).
            replace('{seconds}', (results.time / 1000).toFixed(2));

          logLineBreak(2);

          if (isPassing) {
            grunt.log.ok(chalk.green(message));
          }
          else {
            grunt.log.error(chalk.red(message));
            logFailedSpecs(results.failedSpecs);
          }

          logLineBreak(2);
        }


        function logFailedSpecs(failedSpecs) {
          failedSpecs.forEach(function(spec) {
            var msg = chalk.yellow(spec.fullName);

            spec.items.forEach(function(item) {
              msg += '\n> ' + (item.trace || item.message);
            });

            logLineBreak(1, true);
            grunt.verbose.writeln(msg);
          });
        }

        function logLineBreak(opt_count, opt_isVerbose) {
          var count = opt_count || 1;

          for (var i = 0; i < count; i++) {
            if (opt_isVerbose) {
              grunt.verbose.write('\n');
            }
            else {
              grunt.log.write('\n');
            }
          }
        }
      }
    };

    return phantomJSSpecRunner;
  }
};