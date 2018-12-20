(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":1,"timers":2}],3:[function(require,module,exports){
module.exports = function (path) {
  try {
    return decodeURIComponent(path);
  } catch (e) {
    return -1
  }
}

},{}],4:[function(require,module,exports){
(function (process){
/**
  * vee-validate v2.0.9
  * (c) 2018 Abdelrahman Awad
  * @license MIT
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.VeeValidate = factory());
}(this, (function () { 'use strict';

  var MILLISECONDS_IN_HOUR = 3600000;
  var MILLISECONDS_IN_MINUTE = 60000;
  var DEFAULT_ADDITIONAL_DIGITS = 2;
  var patterns = {
      dateTimeDelimeter: /[T ]/,
      plainTime: /:/,
      YY: /^(\d{2})$/,
      YYY: [/^([+-]\d{2})$/,/^([+-]\d{3})$/,/^([+-]\d{4})$/],
      YYYY: /^(\d{4})/,
      YYYYY: [/^([+-]\d{4})/,/^([+-]\d{5})/,/^([+-]\d{6})/],
      MM: /^-(\d{2})$/,
      DDD: /^-?(\d{3})$/,
      MMDD: /^-?(\d{2})-?(\d{2})$/,
      Www: /^-?W(\d{2})$/,
      WwwD: /^-?W(\d{2})-?(\d{1})$/,
      HH: /^(\d{2}([.,]\d*)?)$/,
      HHMM: /^(\d{2}):?(\d{2}([.,]\d*)?)$/,
      HHMMSS: /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/,
      timezone: /([Z+-].*)$/,
      timezoneZ: /^(Z)$/,
      timezoneHH: /^([+-])(\d{2})$/,
      timezoneHHMM: /^([+-])(\d{2}):?(\d{2})$/
  };
  function toDate(argument, dirtyOptions) {
      if (arguments.length < 1) {
          throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }
      if (argument === null) {
          return new Date(NaN);
      }
      var options = dirtyOptions || {};
      var additionalDigits = options.additionalDigits === undefined ? DEFAULT_ADDITIONAL_DIGITS : Number(options.additionalDigits);
      if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
          throw new RangeError('additionalDigits must be 0, 1 or 2');
      }
      if (argument instanceof Date) {
          return new Date(argument.getTime());
      } else if (typeof argument !== 'string') {
          return new Date(argument);
      }
      var dateStrings = splitDateString(argument);
      var parseYearResult = parseYear(dateStrings.date, additionalDigits);
      var year = parseYearResult.year;
      var restDateString = parseYearResult.restDateString;
      var date = parseDate(restDateString, year);
      if (date) {
          var timestamp = date.getTime();
          var time = 0;
          var offset;
          if (dateStrings.time) {
              time = parseTime(dateStrings.time);
          }
          if (dateStrings.timezone) {
              offset = parseTimezone(dateStrings.timezone);
          } else {
              offset = new Date(timestamp + time).getTimezoneOffset();
              offset = new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE).getTimezoneOffset();
          }
          return new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE);
      } else {
          return new Date(argument);
      }
  }

  function splitDateString(dateString) {
      var dateStrings = {};
      var array = dateString.split(patterns.dateTimeDelimeter);
      var timeString;
      if (patterns.plainTime.test(array[0])) {
          dateStrings.date = null;
          timeString = array[0];
      } else {
          dateStrings.date = array[0];
          timeString = array[1];
      }
      if (timeString) {
          var token = patterns.timezone.exec(timeString);
          if (token) {
              dateStrings.time = timeString.replace(token[1], '');
              dateStrings.timezone = token[1];
          } else {
              dateStrings.time = timeString;
          }
      }
      return dateStrings;
  }

  function parseYear(dateString, additionalDigits) {
      var patternYYY = patterns.YYY[additionalDigits];
      var patternYYYYY = patterns.YYYYY[additionalDigits];
      var token;
      token = patterns.YYYY.exec(dateString) || patternYYYYY.exec(dateString);
      if (token) {
          var yearString = token[1];
          return {
              year: parseInt(yearString, 10),
              restDateString: dateString.slice(yearString.length)
          };
      }
      token = patterns.YY.exec(dateString) || patternYYY.exec(dateString);
      if (token) {
          var centuryString = token[1];
          return {
              year: parseInt(centuryString, 10) * 100,
              restDateString: dateString.slice(centuryString.length)
          };
      }
      return {
          year: null
      };
  }

  function parseDate(dateString, year) {
      if (year === null) {
          return null;
      }
      var token;
      var date;
      var month;
      var week;
      if (dateString.length === 0) {
          date = new Date(0);
          date.setUTCFullYear(year);
          return date;
      }
      token = patterns.MM.exec(dateString);
      if (token) {
          date = new Date(0);
          month = parseInt(token[1], 10) - 1;
          date.setUTCFullYear(year, month);
          return date;
      }
      token = patterns.DDD.exec(dateString);
      if (token) {
          date = new Date(0);
          var dayOfYear = parseInt(token[1], 10);
          date.setUTCFullYear(year, 0, dayOfYear);
          return date;
      }
      token = patterns.MMDD.exec(dateString);
      if (token) {
          date = new Date(0);
          month = parseInt(token[1], 10) - 1;
          var day = parseInt(token[2], 10);
          date.setUTCFullYear(year, month, day);
          return date;
      }
      token = patterns.Www.exec(dateString);
      if (token) {
          week = parseInt(token[1], 10) - 1;
          return dayOfISOYear(year, week);
      }
      token = patterns.WwwD.exec(dateString);
      if (token) {
          week = parseInt(token[1], 10) - 1;
          var dayOfWeek = parseInt(token[2], 10) - 1;
          return dayOfISOYear(year, week, dayOfWeek);
      }
      return null;
  }

  function parseTime(timeString) {
      var token;
      var hours;
      var minutes;
      token = patterns.HH.exec(timeString);
      if (token) {
          hours = parseFloat(token[1].replace(',', '.'));
          return hours % 24 * MILLISECONDS_IN_HOUR;
      }
      token = patterns.HHMM.exec(timeString);
      if (token) {
          hours = parseInt(token[1], 10);
          minutes = parseFloat(token[2].replace(',', '.'));
          return hours % 24 * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE;
      }
      token = patterns.HHMMSS.exec(timeString);
      if (token) {
          hours = parseInt(token[1], 10);
          minutes = parseInt(token[2], 10);
          var seconds = parseFloat(token[3].replace(',', '.'));
          return hours % 24 * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE + seconds * 1000;
      }
      return null;
  }

  function parseTimezone(timezoneString) {
      var token;
      var absoluteOffset;
      token = patterns.timezoneZ.exec(timezoneString);
      if (token) {
          return 0;
      }
      token = patterns.timezoneHH.exec(timezoneString);
      if (token) {
          absoluteOffset = parseInt(token[2], 10) * 60;
          return token[1] === '+' ? -absoluteOffset : absoluteOffset;
      }
      token = patterns.timezoneHHMM.exec(timezoneString);
      if (token) {
          absoluteOffset = parseInt(token[2], 10) * 60 + parseInt(token[3], 10);
          return token[1] === '+' ? -absoluteOffset : absoluteOffset;
      }
      return 0;
  }

  function dayOfISOYear(isoYear, week, day) {
      week = week || 0;
      day = day || 0;
      var date = new Date(0);
      date.setUTCFullYear(isoYear, 0, 4);
      var fourthOfJanuaryDay = date.getUTCDay() || 7;
      var diff = week * 7 + day + 1 - fourthOfJanuaryDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
  }

  function addMilliseconds(dirtyDate, dirtyAmount, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var timestamp = toDate(dirtyDate, dirtyOptions).getTime();
      var amount = Number(dirtyAmount);
      return new Date(timestamp + amount);
  }

  function cloneObject(dirtyObject) {
      dirtyObject = dirtyObject || {};
      var object = {};
      for (var property in dirtyObject) {
          if (dirtyObject.hasOwnProperty(property)) {
              object[property] = dirtyObject[property];
          }
      }
      return object;
  }

  var MILLISECONDS_IN_MINUTE$2 = 60000;
  function addMinutes(dirtyDate, dirtyAmount, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var amount = Number(dirtyAmount);
      return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_MINUTE$2, dirtyOptions);
  }

  function isValid(dirtyDate, dirtyOptions) {
      if (arguments.length < 1) {
          throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }
      var date = toDate(dirtyDate, dirtyOptions);
      return !isNaN(date);
  }

  var formatDistanceLocale = {
      lessThanXSeconds: {
          one: 'less than a second',
          other: 'less than {{count}} seconds'
      },
      xSeconds: {
          one: '1 second',
          other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
          one: 'less than a minute',
          other: 'less than {{count}} minutes'
      },
      xMinutes: {
          one: '1 minute',
          other: '{{count}} minutes'
      },
      aboutXHours: {
          one: 'about 1 hour',
          other: 'about {{count}} hours'
      },
      xHours: {
          one: '1 hour',
          other: '{{count}} hours'
      },
      xDays: {
          one: '1 day',
          other: '{{count}} days'
      },
      aboutXMonths: {
          one: 'about 1 month',
          other: 'about {{count}} months'
      },
      xMonths: {
          one: '1 month',
          other: '{{count}} months'
      },
      aboutXYears: {
          one: 'about 1 year',
          other: 'about {{count}} years'
      },
      xYears: {
          one: '1 year',
          other: '{{count}} years'
      },
      overXYears: {
          one: 'over 1 year',
          other: 'over {{count}} years'
      },
      almostXYears: {
          one: 'almost 1 year',
          other: 'almost {{count}} years'
      }
  };
  function formatDistance(token, count, options) {
      options = options || {};
      var result;
      if (typeof formatDistanceLocale[token] === 'string') {
          result = formatDistanceLocale[token];
      } else if (count === 1) {
          result = formatDistanceLocale[token].one;
      } else {
          result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }
      if (options.addSuffix) {
          if (options.comparison > 0) {
              return 'in ' + result;
          } else {
              return result + ' ago';
          }
      }
      return result;
  }

  var tokensToBeShortedPattern = /MMMM|MM|DD|dddd/g;
  function buildShortLongFormat(format) {
      return format.replace(tokensToBeShortedPattern, function (token) {
          return token.slice(1);
      });
  }

  function buildFormatLongFn(obj) {
      var formatLongLocale = {
          LTS: obj.LTS,
          LT: obj.LT,
          L: obj.L,
          LL: obj.LL,
          LLL: obj.LLL,
          LLLL: obj.LLLL,
          l: obj.l || buildShortLongFormat(obj.L),
          ll: obj.ll || buildShortLongFormat(obj.LL),
          lll: obj.lll || buildShortLongFormat(obj.LLL),
          llll: obj.llll || buildShortLongFormat(obj.LLLL)
      };
      return function (token) {
          return formatLongLocale[token];
      };
  }

  var formatLong = buildFormatLongFn({
      LT: 'h:mm aa',
      LTS: 'h:mm:ss aa',
      L: 'MM/DD/YYYY',
      LL: 'MMMM D YYYY',
      LLL: 'MMMM D YYYY h:mm aa',
      LLLL: 'dddd, MMMM D YYYY h:mm aa'
  });

  var formatRelativeLocale = {
      lastWeek: '[last] dddd [at] LT',
      yesterday: '[yesterday at] LT',
      today: '[today at] LT',
      tomorrow: '[tomorrow at] LT',
      nextWeek: 'dddd [at] LT',
      other: 'L'
  };
  function formatRelative(token, date, baseDate, options) {
      return formatRelativeLocale[token];
  }

  function buildLocalizeFn(values, defaultType, indexCallback) {
      return function (dirtyIndex, dirtyOptions) {
          var options = dirtyOptions || {};
          var type = options.type ? String(options.type) : defaultType;
          var valuesArray = values[type] || values[defaultType];
          var index = indexCallback ? indexCallback(Number(dirtyIndex)) : Number(dirtyIndex);
          return valuesArray[index];
      };
  }

  function buildLocalizeArrayFn(values, defaultType) {
      return function (dirtyOptions) {
          var options = dirtyOptions || {};
          var type = options.type ? String(options.type) : defaultType;
          return values[type] || values[defaultType];
      };
  }

  var weekdayValues = {
      narrow: ['Su','Mo','Tu','We','Th','Fr','Sa'],
      short: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      long: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  };
  var monthValues = {
      short: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      long: ['January','February','March','April','May','June','July','August','September',
          'October','November','December']
  };
  var timeOfDayValues = {
      uppercase: ['AM','PM'],
      lowercase: ['am','pm'],
      long: ['a.m.','p.m.']
  };
  function ordinalNumber(dirtyNumber, dirtyOptions) {
      var number = Number(dirtyNumber);
      var rem100 = number % 100;
      if (rem100 > 20 || rem100 < 10) {
          switch (rem100 % 10) {
              case 1:
                  return number + 'st';
              case 2:
                  return number + 'nd';
              case 3:
                  return number + 'rd';
          }
      }
      return number + 'th';
  }

  var localize = {
      ordinalNumber: ordinalNumber,
      weekday: buildLocalizeFn(weekdayValues, 'long'),
      weekdays: buildLocalizeArrayFn(weekdayValues, 'long'),
      month: buildLocalizeFn(monthValues, 'long'),
      months: buildLocalizeArrayFn(monthValues, 'long'),
      timeOfDay: buildLocalizeFn(timeOfDayValues, 'long', function (hours) {
          return hours / 12 >= 1 ? 1 : 0;
      }),
      timesOfDay: buildLocalizeArrayFn(timeOfDayValues, 'long')
  };

  function buildMatchFn(patterns, defaultType) {
      return function (dirtyString, dirtyOptions) {
          var options = dirtyOptions || {};
          var type = options.type ? String(options.type) : defaultType;
          var pattern = patterns[type] || patterns[defaultType];
          var string = String(dirtyString);
          return string.match(pattern);
      };
  }

  function buildParseFn(patterns, defaultType) {
      return function (matchResult, dirtyOptions) {
          var options = dirtyOptions || {};
          var type = options.type ? String(options.type) : defaultType;
          var patternsArray = patterns[type] || patterns[defaultType];
          var string = matchResult[1];
          return patternsArray.findIndex(function (pattern) {
              return pattern.test(string);
          });
      };
  }

  function buildMatchPatternFn(pattern) {
      return function (dirtyString) {
          var string = String(dirtyString);
          return string.match(pattern);
      };
  }

  function parseDecimal(matchResult) {
      return parseInt(matchResult[1], 10);
  }

  var matchOrdinalNumbersPattern = /^(\d+)(th|st|nd|rd)?/i;
  var matchWeekdaysPatterns = {
      narrow: /^(su|mo|tu|we|th|fr|sa)/i,
      short: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      long: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
  };
  var parseWeekdayPatterns = {
      any: [/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]
  };
  var matchMonthsPatterns = {
      short: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      long: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
  };
  var parseMonthPatterns = {
      any: [/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,
          /^n/i,/^d/i]
  };
  var matchTimesOfDayPatterns = {
      short: /^(am|pm)/i,
      long: /^([ap]\.?\s?m\.?)/i
  };
  var parseTimeOfDayPatterns = {
      any: [/^a/i,/^p/i]
  };
  var match = {
      ordinalNumbers: buildMatchPatternFn(matchOrdinalNumbersPattern),
      ordinalNumber: parseDecimal,
      weekdays: buildMatchFn(matchWeekdaysPatterns, 'long'),
      weekday: buildParseFn(parseWeekdayPatterns, 'any'),
      months: buildMatchFn(matchMonthsPatterns, 'long'),
      month: buildParseFn(parseMonthPatterns, 'any'),
      timesOfDay: buildMatchFn(matchTimesOfDayPatterns, 'long'),
      timeOfDay: buildParseFn(parseTimeOfDayPatterns, 'any')
  };

  var locale = {
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match,
      options: {
          weekStartsOn: 0,
          firstWeekContainsDate: 1
      }
  };

  var MILLISECONDS_IN_DAY$1 = 86400000;
  function getUTCDayOfYear(dirtyDate, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY$1) + 1;
  }

  function startOfUTCISOWeek(dirtyDate, dirtyOptions) {
      var weekStartsOn = 1;
      var date = toDate(dirtyDate, dirtyOptions);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
  }

  function getUTCISOWeekYear(dirtyDate, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear, dirtyOptions);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear, dirtyOptions);
      if (date.getTime() >= startOfNextYear.getTime()) {
          return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
          return year;
      } else {
          return year - 1;
      }
  }

  function startOfUTCISOWeekYear(dirtyDate, dirtyOptions) {
      var year = getUTCISOWeekYear(dirtyDate, dirtyOptions);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary, dirtyOptions);
      return date;
  }

  var MILLISECONDS_IN_WEEK$2 = 604800000;
  function getUTCISOWeek(dirtyDate, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var diff = startOfUTCISOWeek(date, dirtyOptions).getTime() - startOfUTCISOWeekYear(date, dirtyOptions).getTime();
      return Math.round(diff / MILLISECONDS_IN_WEEK$2) + 1;
  }

  var formatters = {
      'M': function (date) {
          return date.getUTCMonth() + 1;
      },
      'Mo': function (date, options) {
          var month = date.getUTCMonth() + 1;
          return options.locale.localize.ordinalNumber(month, {
              unit: 'month'
          });
      },
      'MM': function (date) {
          return addLeadingZeros(date.getUTCMonth() + 1, 2);
      },
      'MMM': function (date, options) {
          return options.locale.localize.month(date.getUTCMonth(), {
              type: 'short'
          });
      },
      'MMMM': function (date, options) {
          return options.locale.localize.month(date.getUTCMonth(), {
              type: 'long'
          });
      },
      'Q': function (date) {
          return Math.ceil((date.getUTCMonth() + 1) / 3);
      },
      'Qo': function (date, options) {
          var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
          return options.locale.localize.ordinalNumber(quarter, {
              unit: 'quarter'
          });
      },
      'D': function (date) {
          return date.getUTCDate();
      },
      'Do': function (date, options) {
          return options.locale.localize.ordinalNumber(date.getUTCDate(), {
              unit: 'dayOfMonth'
          });
      },
      'DD': function (date) {
          return addLeadingZeros(date.getUTCDate(), 2);
      },
      'DDD': function (date) {
          return getUTCDayOfYear(date);
      },
      'DDDo': function (date, options) {
          return options.locale.localize.ordinalNumber(getUTCDayOfYear(date), {
              unit: 'dayOfYear'
          });
      },
      'DDDD': function (date) {
          return addLeadingZeros(getUTCDayOfYear(date), 3);
      },
      'dd': function (date, options) {
          return options.locale.localize.weekday(date.getUTCDay(), {
              type: 'narrow'
          });
      },
      'ddd': function (date, options) {
          return options.locale.localize.weekday(date.getUTCDay(), {
              type: 'short'
          });
      },
      'dddd': function (date, options) {
          return options.locale.localize.weekday(date.getUTCDay(), {
              type: 'long'
          });
      },
      'd': function (date) {
          return date.getUTCDay();
      },
      'do': function (date, options) {
          return options.locale.localize.ordinalNumber(date.getUTCDay(), {
              unit: 'dayOfWeek'
          });
      },
      'E': function (date) {
          return date.getUTCDay() || 7;
      },
      'W': function (date) {
          return getUTCISOWeek(date);
      },
      'Wo': function (date, options) {
          return options.locale.localize.ordinalNumber(getUTCISOWeek(date), {
              unit: 'isoWeek'
          });
      },
      'WW': function (date) {
          return addLeadingZeros(getUTCISOWeek(date), 2);
      },
      'YY': function (date) {
          return addLeadingZeros(date.getUTCFullYear(), 4).substr(2);
      },
      'YYYY': function (date) {
          return addLeadingZeros(date.getUTCFullYear(), 4);
      },
      'GG': function (date) {
          return String(getUTCISOWeekYear(date)).substr(2);
      },
      'GGGG': function (date) {
          return getUTCISOWeekYear(date);
      },
      'H': function (date) {
          return date.getUTCHours();
      },
      'HH': function (date) {
          return addLeadingZeros(date.getUTCHours(), 2);
      },
      'h': function (date) {
          var hours = date.getUTCHours();
          if (hours === 0) {
              return 12;
          } else if (hours > 12) {
              return hours % 12;
          } else {
              return hours;
          }
      },
      'hh': function (date) {
          return addLeadingZeros(formatters['h'](date), 2);
      },
      'm': function (date) {
          return date.getUTCMinutes();
      },
      'mm': function (date) {
          return addLeadingZeros(date.getUTCMinutes(), 2);
      },
      's': function (date) {
          return date.getUTCSeconds();
      },
      'ss': function (date) {
          return addLeadingZeros(date.getUTCSeconds(), 2);
      },
      'S': function (date) {
          return Math.floor(date.getUTCMilliseconds() / 100);
      },
      'SS': function (date) {
          return addLeadingZeros(Math.floor(date.getUTCMilliseconds() / 10), 2);
      },
      'SSS': function (date) {
          return addLeadingZeros(date.getUTCMilliseconds(), 3);
      },
      'Z': function (date, options) {
          var originalDate = options._originalDate || date;
          return formatTimezone(originalDate.getTimezoneOffset(), ':');
      },
      'ZZ': function (date, options) {
          var originalDate = options._originalDate || date;
          return formatTimezone(originalDate.getTimezoneOffset());
      },
      'X': function (date, options) {
          var originalDate = options._originalDate || date;
          return Math.floor(originalDate.getTime() / 1000);
      },
      'x': function (date, options) {
          var originalDate = options._originalDate || date;
          return originalDate.getTime();
      },
      'A': function (date, options) {
          return options.locale.localize.timeOfDay(date.getUTCHours(), {
              type: 'uppercase'
          });
      },
      'a': function (date, options) {
          return options.locale.localize.timeOfDay(date.getUTCHours(), {
              type: 'lowercase'
          });
      },
      'aa': function (date, options) {
          return options.locale.localize.timeOfDay(date.getUTCHours(), {
              type: 'long'
          });
      }
  };
  function formatTimezone(offset, delimeter) {
      delimeter = delimeter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;
      return sign + addLeadingZeros(hours, 2) + delimeter + addLeadingZeros(minutes, 2);
  }

  function addLeadingZeros(number, targetLength) {
      var output = Math.abs(number).toString();
      while (output.length < targetLength) {
          output = '0' + output;
      }
      return output;
  }

  function addUTCMinutes(dirtyDate, dirtyAmount, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var amount = Number(dirtyAmount);
      date.setUTCMinutes(date.getUTCMinutes() + amount);
      return date;
  }

  var longFormattingTokensRegExp = /(\[[^[]*])|(\\)?(LTS|LT|LLLL|LLL|LL|L|llll|lll|ll|l)/g;
  var defaultFormattingTokensRegExp = /(\[[^[]*])|(\\)?(x|ss|s|mm|m|hh|h|do|dddd|ddd|dd|d|aa|a|ZZ|Z|YYYY|YY|X|Wo|WW|W|SSS|SS|S|Qo|Q|Mo|MMMM|MMM|MM|M|HH|H|GGGG|GG|E|Do|DDDo|DDDD|DDD|DD|D|A|.)/g;
  function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale$$1 = options.locale || locale;
      if (!locale$$1.localize) {
          throw new RangeError('locale must contain localize property');
      }
      if (!locale$$1.formatLong) {
          throw new RangeError('locale must contain formatLong property');
      }
      var localeFormatters = locale$$1.formatters || {};
      var formattingTokensRegExp = locale$$1.formattingTokensRegExp || defaultFormattingTokensRegExp;
      var formatLong = locale$$1.formatLong;
      var originalDate = toDate(dirtyDate, options);
      if (!isValid(originalDate, options)) {
          return 'Invalid Date';
      }
      var timezoneOffset = originalDate.getTimezoneOffset();
      var utcDate = addUTCMinutes(originalDate, -timezoneOffset, options);
      var formatterOptions = cloneObject(options);
      formatterOptions.locale = locale$$1;
      formatterOptions.formatters = formatters;
      formatterOptions._originalDate = originalDate;
      var result = formatStr.replace(longFormattingTokensRegExp, function (substring) {
          if (substring[0] === '[') {
              return substring;
          }
          if (substring[0] === '\\') {
              return cleanEscapedString(substring);
          }
          return formatLong(substring);
      }).replace(formattingTokensRegExp, function (substring) {
          var formatter = localeFormatters[substring] || formatters[substring];
          if (formatter) {
              return formatter(utcDate, formatterOptions);
          } else {
              return cleanEscapedString(substring);
          }
      });
      return result;
  }

  function cleanEscapedString(input) {
      if (input.match(/\[[\s\S]/)) {
          return input.replace(/^\[|]$/g, '');
      }
      return input.replace(/\\/g, '');
  }

  function subMinutes(dirtyDate, dirtyAmount, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var amount = Number(dirtyAmount);
      return addMinutes(dirtyDate, -amount, dirtyOptions);
  }

  function isAfter(dirtyDate, dirtyDateToCompare, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var date = toDate(dirtyDate, dirtyOptions);
      var dateToCompare = toDate(dirtyDateToCompare, dirtyOptions);
      return date.getTime() > dateToCompare.getTime();
  }

  function isBefore(dirtyDate, dirtyDateToCompare, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var date = toDate(dirtyDate, dirtyOptions);
      var dateToCompare = toDate(dirtyDateToCompare, dirtyOptions);
      return date.getTime() < dateToCompare.getTime();
  }

  function isEqual(dirtyLeftDate, dirtyRightDate, dirtyOptions) {
      if (arguments.length < 2) {
          throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }
      var dateLeft = toDate(dirtyLeftDate, dirtyOptions);
      var dateRight = toDate(dirtyRightDate, dirtyOptions);
      return dateLeft.getTime() === dateRight.getTime();
  }

  var patterns$1 = {
      'M': /^(1[0-2]|0?\d)/,
      'D': /^(3[0-1]|[0-2]?\d)/,
      'DDD': /^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,
      'W': /^(5[0-3]|[0-4]?\d)/,
      'YYYY': /^(\d{1,4})/,
      'H': /^(2[0-3]|[0-1]?\d)/,
      'm': /^([0-5]?\d)/,
      'Z': /^([+-])(\d{2}):(\d{2})/,
      'ZZ': /^([+-])(\d{2})(\d{2})/,
      singleDigit: /^(\d)/,
      twoDigits: /^(\d{2})/,
      threeDigits: /^(\d{3})/,
      fourDigits: /^(\d{4})/,
      anyDigits: /^(\d+)/
  };
  function parseDecimal$1(matchResult) {
      return parseInt(matchResult[1], 10);
  }

  var parsers = {
      'YY': {
          unit: 'twoDigitYear',
          match: patterns$1.twoDigits,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult);
          }
      },
      'YYYY': {
          unit: 'year',
          match: patterns$1.YYYY,
          parse: parseDecimal$1
      },
      'GG': {
          unit: 'isoYear',
          match: patterns$1.twoDigits,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) + 1900;
          }
      },
      'GGGG': {
          unit: 'isoYear',
          match: patterns$1.YYYY,
          parse: parseDecimal$1
      },
      'Q': {
          unit: 'quarter',
          match: patterns$1.singleDigit,
          parse: parseDecimal$1
      },
      'Qo': {
          unit: 'quarter',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'quarter'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'quarter'
              });
          }
      },
      'M': {
          unit: 'month',
          match: patterns$1.M,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) - 1;
          }
      },
      'Mo': {
          unit: 'month',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'month'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'month'
              }) - 1;
          }
      },
      'MM': {
          unit: 'month',
          match: patterns$1.twoDigits,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) - 1;
          }
      },
      'MMM': {
          unit: 'month',
          match: function (string, options) {
              return options.locale.match.months(string, {
                  type: 'short'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.month(matchResult, {
                  type: 'short'
              });
          }
      },
      'MMMM': {
          unit: 'month',
          match: function (string, options) {
              return options.locale.match.months(string, {
                  type: 'long'
              }) || options.locale.match.months(string, {
                  type: 'short'
              });
          },
          parse: function (matchResult, options) {
              var parseResult = options.locale.match.month(matchResult, {
                  type: 'long'
              });
              if (parseResult == null) {
                  parseResult = options.locale.match.month(matchResult, {
                      type: 'short'
                  });
              }
              return parseResult;
          }
      },
      'W': {
          unit: 'isoWeek',
          match: patterns$1.W,
          parse: parseDecimal$1
      },
      'Wo': {
          unit: 'isoWeek',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'isoWeek'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'isoWeek'
              });
          }
      },
      'WW': {
          unit: 'isoWeek',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      'd': {
          unit: 'dayOfWeek',
          match: patterns$1.singleDigit,
          parse: parseDecimal$1
      },
      'do': {
          unit: 'dayOfWeek',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'dayOfWeek'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'dayOfWeek'
              });
          }
      },
      'dd': {
          unit: 'dayOfWeek',
          match: function (string, options) {
              return options.locale.match.weekdays(string, {
                  type: 'narrow'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.weekday(matchResult, {
                  type: 'narrow'
              });
          }
      },
      'ddd': {
          unit: 'dayOfWeek',
          match: function (string, options) {
              return options.locale.match.weekdays(string, {
                  type: 'short'
              }) || options.locale.match.weekdays(string, {
                  type: 'narrow'
              });
          },
          parse: function (matchResult, options) {
              var parseResult = options.locale.match.weekday(matchResult, {
                  type: 'short'
              });
              if (parseResult == null) {
                  parseResult = options.locale.match.weekday(matchResult, {
                      type: 'narrow'
                  });
              }
              return parseResult;
          }
      },
      'dddd': {
          unit: 'dayOfWeek',
          match: function (string, options) {
              return options.locale.match.weekdays(string, {
                  type: 'long'
              }) || options.locale.match.weekdays(string, {
                  type: 'short'
              }) || options.locale.match.weekdays(string, {
                  type: 'narrow'
              });
          },
          parse: function (matchResult, options) {
              var parseResult = options.locale.match.weekday(matchResult, {
                  type: 'long'
              });
              if (parseResult == null) {
                  parseResult = options.locale.match.weekday(matchResult, {
                      type: 'short'
                  });
                  if (parseResult == null) {
                      parseResult = options.locale.match.weekday(matchResult, {
                          type: 'narrow'
                      });
                  }
              }
              return parseResult;
          }
      },
      'E': {
          unit: 'dayOfISOWeek',
          match: patterns$1.singleDigit,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult);
          }
      },
      'D': {
          unit: 'dayOfMonth',
          match: patterns$1.D,
          parse: parseDecimal$1
      },
      'Do': {
          unit: 'dayOfMonth',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'dayOfMonth'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'dayOfMonth'
              });
          }
      },
      'DD': {
          unit: 'dayOfMonth',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      'DDD': {
          unit: 'dayOfYear',
          match: patterns$1.DDD,
          parse: parseDecimal$1
      },
      'DDDo': {
          unit: 'dayOfYear',
          match: function (string, options) {
              return options.locale.match.ordinalNumbers(string, {
                  unit: 'dayOfYear'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.ordinalNumber(matchResult, {
                  unit: 'dayOfYear'
              });
          }
      },
      'DDDD': {
          unit: 'dayOfYear',
          match: patterns$1.threeDigits,
          parse: parseDecimal$1
      },
      'A': {
          unit: 'timeOfDay',
          match: function (string, options) {
              return options.locale.match.timesOfDay(string, {
                  type: 'short'
              });
          },
          parse: function (matchResult, options) {
              return options.locale.match.timeOfDay(matchResult, {
                  type: 'short'
              });
          }
      },
      'aa': {
          unit: 'timeOfDay',
          match: function (string, options) {
              return options.locale.match.timesOfDay(string, {
                  type: 'long'
              }) || options.locale.match.timesOfDay(string, {
                  type: 'short'
              });
          },
          parse: function (matchResult, options) {
              var parseResult = options.locale.match.timeOfDay(matchResult, {
                  type: 'long'
              });
              if (parseResult == null) {
                  parseResult = options.locale.match.timeOfDay(matchResult, {
                      type: 'short'
                  });
              }
              return parseResult;
          }
      },
      'H': {
          unit: 'hours',
          match: patterns$1.H,
          parse: parseDecimal$1
      },
      'HH': {
          unit: 'hours',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      'h': {
          unit: 'timeOfDayHours',
          match: patterns$1.M,
          parse: parseDecimal$1
      },
      'hh': {
          unit: 'timeOfDayHours',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      'm': {
          unit: 'minutes',
          match: patterns$1.m,
          parse: parseDecimal$1
      },
      'mm': {
          unit: 'minutes',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      's': {
          unit: 'seconds',
          match: patterns$1.m,
          parse: parseDecimal$1
      },
      'ss': {
          unit: 'seconds',
          match: patterns$1.twoDigits,
          parse: parseDecimal$1
      },
      'S': {
          unit: 'milliseconds',
          match: patterns$1.singleDigit,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) * 100;
          }
      },
      'SS': {
          unit: 'milliseconds',
          match: patterns$1.twoDigits,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) * 10;
          }
      },
      'SSS': {
          unit: 'milliseconds',
          match: patterns$1.threeDigits,
          parse: parseDecimal$1
      },
      'Z': {
          unit: 'timezone',
          match: patterns$1.Z,
          parse: function (matchResult) {
              var sign = matchResult[1];
              var hours = parseInt(matchResult[2], 10);
              var minutes = parseInt(matchResult[3], 10);
              var absoluteOffset = hours * 60 + minutes;
              return sign === '+' ? absoluteOffset : -absoluteOffset;
          }
      },
      'ZZ': {
          unit: 'timezone',
          match: patterns$1.ZZ,
          parse: function (matchResult) {
              var sign = matchResult[1];
              var hours = parseInt(matchResult[2], 10);
              var minutes = parseInt(matchResult[3], 10);
              var absoluteOffset = hours * 60 + minutes;
              return sign === '+' ? absoluteOffset : -absoluteOffset;
          }
      },
      'X': {
          unit: 'timestamp',
          match: patterns$1.anyDigits,
          parse: function (matchResult) {
              return parseDecimal$1(matchResult) * 1000;
          }
      },
      'x': {
          unit: 'timestamp',
          match: patterns$1.anyDigits,
          parse: parseDecimal$1
      }
  };
  parsers['a'] = parsers['A'];

  function setUTCDay(dirtyDate, dirtyDay, dirtyOptions) {
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn === undefined ? 0 : Number(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn === undefined ? defaultWeekStartsOn : Number(options.weekStartsOn);
      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
          throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }
      var date = toDate(dirtyDate, dirtyOptions);
      var day = Number(dirtyDay);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
  }

  function setUTCISODay(dirtyDate, dirtyDay, dirtyOptions) {
      var day = Number(dirtyDay);
      if (day % 7 === 0) {
          day = day - 7;
      }
      var weekStartsOn = 1;
      var date = toDate(dirtyDate, dirtyOptions);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
  }

  function setUTCISOWeek(dirtyDate, dirtyISOWeek, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var isoWeek = Number(dirtyISOWeek);
      var diff = getUTCISOWeek(date, dirtyOptions) - isoWeek;
      date.setUTCDate(date.getUTCDate() - diff * 7);
      return date;
  }

  var MILLISECONDS_IN_DAY$3 = 86400000;
  function setUTCISOWeekYear(dirtyDate, dirtyISOYear, dirtyOptions) {
      var date = toDate(dirtyDate, dirtyOptions);
      var isoYear = Number(dirtyISOYear);
      var dateStartOfYear = startOfUTCISOWeekYear(date, dirtyOptions);
      var diff = Math.floor((date.getTime() - dateStartOfYear.getTime()) / MILLISECONDS_IN_DAY$3);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(isoYear, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      date = startOfUTCISOWeekYear(fourthOfJanuary, dirtyOptions);
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
  }

  var MILLISECONDS_IN_MINUTE$6 = 60000;
  function setTimeOfDay(hours, timeOfDay) {
      var isAM = timeOfDay === 0;
      if (isAM) {
          if (hours === 12) {
              return 0;
          }
      } else {
          if (hours !== 12) {
              return 12 + hours;
          }
      }
      return hours;
  }

  var units = {
      twoDigitYear: {
          priority: 10,
          set: function (dateValues, value) {
              var century = Math.floor(dateValues.date.getUTCFullYear() / 100);
              var year = century * 100 + value;
              dateValues.date.setUTCFullYear(year, 0, 1);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      year: {
          priority: 10,
          set: function (dateValues, value) {
              dateValues.date.setUTCFullYear(value, 0, 1);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      isoYear: {
          priority: 10,
          set: function (dateValues, value, options) {
              dateValues.date = startOfUTCISOWeekYear(setUTCISOWeekYear(dateValues.date, value, options), options);
              return dateValues;
          }
      },
      quarter: {
          priority: 20,
          set: function (dateValues, value) {
              dateValues.date.setUTCMonth((value - 1) * 3, 1);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      month: {
          priority: 30,
          set: function (dateValues, value) {
              dateValues.date.setUTCMonth(value, 1);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      isoWeek: {
          priority: 40,
          set: function (dateValues, value, options) {
              dateValues.date = startOfUTCISOWeek(setUTCISOWeek(dateValues.date, value, options), options);
              return dateValues;
          }
      },
      dayOfWeek: {
          priority: 50,
          set: function (dateValues, value, options) {
              dateValues.date = setUTCDay(dateValues.date, value, options);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      dayOfISOWeek: {
          priority: 50,
          set: function (dateValues, value, options) {
              dateValues.date = setUTCISODay(dateValues.date, value, options);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      dayOfMonth: {
          priority: 50,
          set: function (dateValues, value) {
              dateValues.date.setUTCDate(value);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      dayOfYear: {
          priority: 50,
          set: function (dateValues, value) {
              dateValues.date.setUTCMonth(0, value);
              dateValues.date.setUTCHours(0, 0, 0, 0);
              return dateValues;
          }
      },
      timeOfDay: {
          priority: 60,
          set: function (dateValues, value, options) {
              dateValues.timeOfDay = value;
              return dateValues;
          }
      },
      hours: {
          priority: 70,
          set: function (dateValues, value, options) {
              dateValues.date.setUTCHours(value, 0, 0, 0);
              return dateValues;
          }
      },
      timeOfDayHours: {
          priority: 70,
          set: function (dateValues, value, options) {
              var timeOfDay = dateValues.timeOfDay;
              if (timeOfDay != null) {
                  value = setTimeOfDay(value, timeOfDay);
              }
              dateValues.date.setUTCHours(value, 0, 0, 0);
              return dateValues;
          }
      },
      minutes: {
          priority: 80,
          set: function (dateValues, value) {
              dateValues.date.setUTCMinutes(value, 0, 0);
              return dateValues;
          }
      },
      seconds: {
          priority: 90,
          set: function (dateValues, value) {
              dateValues.date.setUTCSeconds(value, 0);
              return dateValues;
          }
      },
      milliseconds: {
          priority: 100,
          set: function (dateValues, value) {
              dateValues.date.setUTCMilliseconds(value);
              return dateValues;
          }
      },
      timezone: {
          priority: 110,
          set: function (dateValues, value) {
              dateValues.date = new Date(dateValues.date.getTime() - value * MILLISECONDS_IN_MINUTE$6);
              return dateValues;
          }
      },
      timestamp: {
          priority: 120,
          set: function (dateValues, value) {
              dateValues.date = new Date(value);
              return dateValues;
          }
      }
  };

  var TIMEZONE_UNIT_PRIORITY = 110;
  var MILLISECONDS_IN_MINUTE$7 = 60000;
  var longFormattingTokensRegExp$1 = /(\[[^[]*])|(\\)?(LTS|LT|LLLL|LLL|LL|L|llll|lll|ll|l)/g;
  var defaultParsingTokensRegExp = /(\[[^[]*])|(\\)?(x|ss|s|mm|m|hh|h|do|dddd|ddd|dd|d|aa|a|ZZ|Z|YYYY|YY|X|Wo|WW|W|SSS|SS|S|Qo|Q|Mo|MMMM|MMM|MM|M|HH|H|GGGG|GG|E|Do|DDDo|DDDD|DDD|DD|D|A|.)/g;
  function parse(dirtyDateString, dirtyFormatString, dirtyBaseDate, dirtyOptions) {
      if (arguments.length < 3) {
          throw new TypeError('3 arguments required, but only ' + arguments.length + ' present');
      }
      var dateString = String(dirtyDateString);
      var options = dirtyOptions || {};
      var weekStartsOn = options.weekStartsOn === undefined ? 0 : Number(options.weekStartsOn);
      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
          throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }
      var locale$$1 = options.locale || locale;
      var localeParsers = locale$$1.parsers || {};
      var localeUnits = locale$$1.units || {};
      if (!locale$$1.match) {
          throw new RangeError('locale must contain match property');
      }
      if (!locale$$1.formatLong) {
          throw new RangeError('locale must contain formatLong property');
      }
      var formatString = String(dirtyFormatString).replace(longFormattingTokensRegExp$1, function (substring) {
          if (substring[0] === '[') {
              return substring;
          }
          if (substring[0] === '\\') {
              return cleanEscapedString$1(substring);
          }
          return locale$$1.formatLong(substring);
      });
      if (formatString === '') {
          if (dateString === '') {
              return toDate(dirtyBaseDate, options);
          } else {
              return new Date(NaN);
          }
      }
      var subFnOptions = cloneObject(options);
      subFnOptions.locale = locale$$1;
      var tokens = formatString.match(locale$$1.parsingTokensRegExp || defaultParsingTokensRegExp);
      var tokensLength = tokens.length;
      var setters = [{
          priority: TIMEZONE_UNIT_PRIORITY,
          set: dateToSystemTimezone,
          index: 0
      }];
      var i;
      for (i = 0; i < tokensLength; i++) {
          var token = tokens[i];
          var parser = localeParsers[token] || parsers[token];
          if (parser) {
              var matchResult;
              if (parser.match instanceof RegExp) {
                  matchResult = parser.match.exec(dateString);
              } else {
                  matchResult = parser.match(dateString, subFnOptions);
              }
              if (!matchResult) {
                  return new Date(NaN);
              }
              var unitName = parser.unit;
              var unit = localeUnits[unitName] || units[unitName];
              setters.push({
                  priority: unit.priority,
                  set: unit.set,
                  value: parser.parse(matchResult, subFnOptions),
                  index: setters.length
              });
              var substring = matchResult[0];
              dateString = dateString.slice(substring.length);
          } else {
              var head = tokens[i].match(/^\[.*]$/) ? tokens[i].replace(/^\[|]$/g, '') : tokens[i];
              if (dateString.indexOf(head) === 0) {
                  dateString = dateString.slice(head.length);
              } else {
                  return new Date(NaN);
              }
          }
      }
      var uniquePrioritySetters = setters.map(function (setter) {
          return setter.priority;
      }).sort(function (a, b) {
          return a - b;
      }).filter(function (priority, index, array) {
          return array.indexOf(priority) === index;
      }).map(function (priority) {
          return setters.filter(function (setter) {
              return setter.priority === priority;
          }).reverse();
      }).map(function (setterArray) {
          return setterArray[0];
      });
      var date = toDate(dirtyBaseDate, options);
      if (isNaN(date)) {
          return new Date(NaN);
      }
      var utcDate = subMinutes(date, date.getTimezoneOffset());
      var dateValues = {
          date: utcDate
      };
      var settersLength = uniquePrioritySetters.length;
      for (i = 0; i < settersLength; i++) {
          var setter = uniquePrioritySetters[i];
          dateValues = setter.set(dateValues, setter.value, subFnOptions);
      }
      return dateValues.date;
  }

  function dateToSystemTimezone(dateValues) {
      var date = dateValues.date;
      var time = date.getTime();
      var offset = date.getTimezoneOffset();
      offset = new Date(time + offset * MILLISECONDS_IN_MINUTE$7).getTimezoneOffset();
      dateValues.date = new Date(time + offset * MILLISECONDS_IN_MINUTE$7);
      return dateValues;
  }

  function cleanEscapedString$1(input) {
      if (input.match(/\[[\s\S]/)) {
          return input.replace(/^\[|]$/g, '');
      }
      return input.replace(/\\/g, '');
  }

  function parseDate$1(date, format$$1) {
      if (typeof date !== 'string') {
          return isValid(date) ? date : null;
      }
      var parsed = parse(date, format$$1, new Date());
      if (!isValid(parsed) || format(parsed, format$$1) !== date) {
          return null;
      }
      return parsed;
  }

  function after (value, ref) {
      var otherValue = ref[0];
      var inclusion = ref[1];
      var format$$1 = ref[2];

      if (typeof format$$1 === 'undefined') {
          format$$1 = inclusion;
          inclusion = false;
      }
      value = parseDate$1(value, format$$1);
      otherValue = parseDate$1(otherValue, format$$1);
      if (!value || !otherValue) {
          return false;
      }
      return isAfter(value, otherValue) || inclusion && isEqual(value, otherValue);
  }

  var alpha = {
      en: /^[A-Z]*$/i,
      cs: /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]*$/i,
      da: /^[A-ZÆØÅ]*$/i,
      de: /^[A-ZÄÖÜß]*$/i,
      es: /^[A-ZÁÉÍÑÓÚÜ]*$/i,
      fr: /^[A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]*$/i,
      lt: /^[A-ZĄČĘĖĮŠŲŪŽ]*$/i,
      nl: /^[A-ZÉËÏÓÖÜ]*$/i,
      hu: /^[A-ZÁÉÍÓÖŐÚÜŰ]*$/i,
      pl: /^[A-ZĄĆĘŚŁŃÓŻŹ]*$/i,
      pt: /^[A-ZÃÁÀÂÇÉÊÍÕÓÔÚÜ]*$/i,
      ru: /^[А-ЯЁ]*$/i,
      sk: /^[A-ZÁÄČĎÉÍĹĽŇÓŔŠŤÚÝŽ]*$/i,
      sr: /^[A-ZČĆŽŠĐ]*$/i,
      tr: /^[A-ZÇĞİıÖŞÜ]*$/i,
      uk: /^[А-ЩЬЮЯЄІЇҐ]*$/i,
      ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]*$/
  };
  var alphaSpaces = {
      en: /^[A-Z\s]*$/i,
      cs: /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]*$/i,
      da: /^[A-ZÆØÅ\s]*$/i,
      de: /^[A-ZÄÖÜß\s]*$/i,
      es: /^[A-ZÁÉÍÑÓÚÜ\s]*$/i,
      fr: /^[A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ\s]*$/i,
      lt: /^[A-ZĄČĘĖĮŠŲŪŽ\s]*$/i,
      nl: /^[A-ZÉËÏÓÖÜ\s]*$/i,
      hu: /^[A-ZÁÉÍÓÖŐÚÜŰ\s]*$/i,
      pl: /^[A-ZĄĆĘŚŁŃÓŻŹ\s]*$/i,
      pt: /^[A-ZÃÁÀÂÇÉÊÍÕÓÔÚÜ\s]*$/i,
      ru: /^[А-ЯЁ\s]*$/i,
      sk: /^[A-ZÁÄČĎÉÍĹĽŇÓŔŠŤÚÝŽ\s]*$/i,
      sr: /^[A-ZČĆŽŠĐ\s]*$/i,
      tr: /^[A-ZÇĞİıÖŞÜ\s]*$/i,
      uk: /^[А-ЩЬЮЯЄІЇҐ\s]*$/i,
      ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ\s]*$/
  };
  var alphanumeric = {
      en: /^[0-9A-Z]*$/i,
      cs: /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]*$/i,
      da: /^[0-9A-ZÆØÅ]$/i,
      de: /^[0-9A-ZÄÖÜß]*$/i,
      es: /^[0-9A-ZÁÉÍÑÓÚÜ]*$/i,
      fr: /^[0-9A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]*$/i,
      lt: /^[0-9A-ZĄČĘĖĮŠŲŪŽ]*$/i,
      hu: /^[0-9A-ZÁÉÍÓÖŐÚÜŰ]*$/i,
      nl: /^[0-9A-ZÉËÏÓÖÜ]*$/i,
      pl: /^[0-9A-ZĄĆĘŚŁŃÓŻŹ]*$/i,
      pt: /^[0-9A-ZÃÁÀÂÇÉÊÍÕÓÔÚÜ]*$/i,
      ru: /^[0-9А-ЯЁ]*$/i,
      sk: /^[0-9A-ZÁÄČĎÉÍĹĽŇÓŔŠŤÚÝŽ]*$/i,
      sr: /^[0-9A-ZČĆŽŠĐ]*$/i,
      tr: /^[0-9A-ZÇĞİıÖŞÜ]*$/i,
      uk: /^[0-9А-ЩЬЮЯЄІЇҐ]*$/i,
      ar: /^[٠١٢٣٤٥٦٧٨٩0-9ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]*$/
  };
  var alphaDash = {
      en: /^[0-9A-Z_-]*$/i,
      cs: /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ_-]*$/i,
      da: /^[0-9A-ZÆØÅ_-]*$/i,
      de: /^[0-9A-ZÄÖÜß_-]*$/i,
      es: /^[0-9A-ZÁÉÍÑÓÚÜ_-]*$/i,
      fr: /^[0-9A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ_-]*$/i,
      lt: /^[0-9A-ZĄČĘĖĮŠŲŪŽ_-]*$/i,
      nl: /^[0-9A-ZÉËÏÓÖÜ_-]*$/i,
      hu: /^[0-9A-ZÁÉÍÓÖŐÚÜŰ_-]*$/i,
      pl: /^[0-9A-ZĄĆĘŚŁŃÓŻŹ_-]*$/i,
      pt: /^[0-9A-ZÃÁÀÂÇÉÊÍÕÓÔÚÜ_-]*$/i,
      ru: /^[0-9А-ЯЁ_-]*$/i,
      sk: /^[0-9A-ZÁÄČĎÉÍĹĽŇÓŔŠŤÚÝŽ_-]*$/i,
      sr: /^[0-9A-ZČĆŽŠĐ_-]*$/i,
      tr: /^[0-9A-ZÇĞİıÖŞÜ_-]*$/i,
      uk: /^[0-9А-ЩЬЮЯЄІЇҐ_-]*$/i,
      ar: /^[٠١٢٣٤٥٦٧٨٩0-9ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ_-]*$/
  };

  var validate = function (value, ref) {
      if ( ref === void 0 ) ref = [];
      var locale = ref[0]; if ( locale === void 0 ) locale = null;

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate(val, [locale]); });
      }
      if (!locale) {
          return Object.keys(alpha).some(function (loc) { return alpha[loc].test(value); });
      }
      return (alpha[locale] || alpha.en).test(value);
  };

  var validate$1 = function (value, ref) {
      if ( ref === void 0 ) ref = [];
      var locale = ref[0]; if ( locale === void 0 ) locale = null;

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$1(val, [locale]); });
      }
      if (!locale) {
          return Object.keys(alphaDash).some(function (loc) { return alphaDash[loc].test(value); });
      }
      return (alphaDash[locale] || alphaDash.en).test(value);
  };

  var validate$2 = function (value, ref) {
      if ( ref === void 0 ) ref = [];
      var locale = ref[0]; if ( locale === void 0 ) locale = null;

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$2(val, [locale]); });
      }
      if (!locale) {
          return Object.keys(alphanumeric).some(function (loc) { return alphanumeric[loc].test(value); });
      }
      return (alphanumeric[locale] || alphanumeric.en).test(value);
  };

  var validate$3 = function (value, ref) {
      if ( ref === void 0 ) ref = [];
      var locale = ref[0]; if ( locale === void 0 ) locale = null;

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$3(val, [locale]); });
      }
      if (!locale) {
          return Object.keys(alphaSpaces).some(function (loc) { return alphaSpaces[loc].test(value); });
      }
      return (alphaSpaces[locale] || alphaSpaces.en).test(value);
  };

  function before (value, ref) {
      var otherValue = ref[0];
      var inclusion = ref[1];
      var format$$1 = ref[2];

      if (typeof format$$1 === 'undefined') {
          format$$1 = inclusion;
          inclusion = false;
      }
      value = parseDate$1(value, format$$1);
      otherValue = parseDate$1(otherValue, format$$1);
      if (!value || !otherValue) {
          return false;
      }
      return isBefore(value, otherValue) || inclusion && isEqual(value, otherValue);
  }

  var validate$4 = function (value, ref) {
      var min = ref[0];
      var max = ref[1];

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$4(val, [min,max]); });
      }
      return Number(min) <= value && Number(max) >= value;
  };

  function confirmed (value, other) { return String(value) === String(other); }

  function unwrapExports (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var assertString_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = assertString;
      function assertString(input) {
          var isString = typeof input === 'string' || input instanceof String;
          if (!isString) {
              throw new TypeError('This library (validator.js) validates strings only');
          }
      }
      
      module.exports = exports['default'];
  });
  var assertString = unwrapExports(assertString_1)

  var assertString$1 = /*#__PURE__*/Object.freeze({
    default: assertString,
    __moduleExports: assertString_1
  });

  var _assertString = ( assertString$1 && assertString ) || assertString$1;

  var isCreditCard_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = isCreditCard;
      var _assertString2 = _interopRequireDefault(_assertString);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      var creditCard = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|62[0-9]{14})$/;
      function isCreditCard(str) {
          (0, _assertString2.default)(str);
          var sanitized = str.replace(/[- ]+/g, '');
          if (!creditCard.test(sanitized)) {
              return false;
          }
          var sum = 0;
          var digit = void 0;
          var tmpNum = void 0;
          var shouldDouble = void 0;
          for (var i = sanitized.length - 1;i >= 0; i--) {
              digit = sanitized.substring(i, i + 1);
              tmpNum = parseInt(digit, 10);
              if (shouldDouble) {
                  tmpNum *= 2;
                  if (tmpNum >= 10) {
                      sum += tmpNum % 10 + 1;
                  } else {
                      sum += tmpNum;
                  }
              } else {
                  sum += tmpNum;
              }
              shouldDouble = !shouldDouble;
          }
          return !(!(sum % 10 === 0 ? sanitized : false));
      }
      
      module.exports = exports['default'];
  });
  var isCreditCard = unwrapExports(isCreditCard_1)

  function credit_card (value) { return isCreditCard(String(value)); }

  var validate$5 = function (value, ref) {
      if ( ref === void 0 ) ref = [];
      var decimals = ref[0]; if ( decimals === void 0 ) decimals = '*';
      var separator = ref[1]; if ( separator === void 0 ) separator = '.';

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$5(val, [decimals,separator]); });
      }
      if (value === null || value === undefined || value === '') {
          return true;
      }
      if (Number(decimals) === 0) {
          return /^-?\d*$/.test(value);
      }
      var regexPart = decimals === '*' ? '+' : ("{1," + decimals + "}");
      var regex = new RegExp(("^-?\\d*(\\" + separator + "\\d" + regexPart + ")?$"));
      if (!regex.test(value)) {
          return false;
      }
      var parsedValue = parseFloat(value);
      return parsedValue === parsedValue;
  };

  function date_between (value, params) {
      var assign, assign$1;

      var min$$1;
      var max$$1;
      var format$$1;
      var inclusivity = '()';
      if (params.length > 3) {
          (assign = params, min$$1 = assign[0], max$$1 = assign[1], inclusivity = assign[2], format$$1 = assign[3]);
      } else {
          (assign$1 = params, min$$1 = assign$1[0], max$$1 = assign$1[1], format$$1 = assign$1[2]);
      }
      var minDate = parseDate$1(String(min$$1), format$$1);
      var maxDate = parseDate$1(String(max$$1), format$$1);
      var dateVal = parseDate$1(String(value), format$$1);
      if (!minDate || !maxDate || !dateVal) {
          return false;
      }
      if (inclusivity === '()') {
          return isAfter(dateVal, minDate) && isBefore(dateVal, maxDate);
      }
      if (inclusivity === '(]') {
          return isAfter(dateVal, minDate) && (isEqual(dateVal, maxDate) || isBefore(dateVal, maxDate));
      }
      if (inclusivity === '[)') {
          return isBefore(dateVal, maxDate) && (isEqual(dateVal, minDate) || isAfter(dateVal, minDate));
      }
      return isEqual(dateVal, maxDate) || isEqual(dateVal, minDate) || isBefore(dateVal, maxDate) && isAfter(dateVal, minDate);
  }

  function date_format (value, ref) {
  	var format = ref[0];

  	return !(!parseDate$1(value, format));
  }

  var validate$6 = function (value, ref) {
      var length = ref[0];

      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$6(val, [length]); });
      }
      var strVal = String(value);
      return /^[0-9]*$/.test(strVal) && strVal.length === Number(length);
  };

  var validateImage = function (file, width, height) {
      var URL = window.URL || window.webkitURL;
      return new Promise(function (resolve) {
          var image = new Image();
          image.onerror = (function () { return resolve({
              valid: false
          }); });
          image.onload = (function () { return resolve({
              valid: image.width === Number(width) && image.height === Number(height)
          }); });
          image.src = URL.createObjectURL(file);
      });
  };
  function dimensions (files, ref) {
      var width = ref[0];
      var height = ref[1];

      var list = [];
      for (var i = 0;i < files.length; i++) {
          if (!/\.(jpg|svg|jpeg|png|bmp|gif)$/i.test(files[i].name)) {
              return false;
          }
          list.push(files[i]);
      }
      return Promise.all(list.map(function (file) { return validateImage(file, width, height); }));
  }

  var merge_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = merge;
      function merge() {
          var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          var defaults = arguments[1];
          for (var key in defaults) {
              if (typeof obj[key] === 'undefined') {
                  obj[key] = defaults[key];
              }
          }
          return obj;
      }
      
      module.exports = exports['default'];
  });
  var merge = unwrapExports(merge_1)

  var merge$1 = /*#__PURE__*/Object.freeze({
    default: merge,
    __moduleExports: merge_1
  });

  var isByteLength_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
          return typeof obj;
      } : function (obj) {
          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      exports.default = isByteLength;
      var _assertString2 = _interopRequireDefault(_assertString);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      function isByteLength(str, options) {
          (0, _assertString2.default)(str);
          var min = void 0;
          var max = void 0;
          if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
              min = options.min || 0;
              max = options.max;
          } else {
              min = arguments[1];
              max = arguments[2];
          }
          var len = encodeURI(str).split(/%..|./).length - 1;
          return len >= min && (typeof max === 'undefined' || len <= max);
      }
      
      module.exports = exports['default'];
  });
  var isByteLength = unwrapExports(isByteLength_1)

  var isByteLength$1 = /*#__PURE__*/Object.freeze({
    default: isByteLength,
    __moduleExports: isByteLength_1
  });

  var _merge = ( merge$1 && merge ) || merge$1;

  var isFQDN_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = isFQDN;
      var _assertString2 = _interopRequireDefault(_assertString);
      var _merge2 = _interopRequireDefault(_merge);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      var default_fqdn_options = {
          require_tld: true,
          allow_underscores: false,
          allow_trailing_dot: false
      };
      function isFQDN(str, options) {
          (0, _assertString2.default)(str);
          options = (0, _merge2.default)(options, default_fqdn_options);
          if (options.allow_trailing_dot && str[str.length - 1] === '.') {
              str = str.substring(0, str.length - 1);
          }
          var parts = str.split('.');
          if (options.require_tld) {
              var tld = parts.pop();
              if (!parts.length || !/^([a-z\u00a1-\uffff]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
                  return false;
              }
              if (/[\s\u2002-\u200B\u202F\u205F\u3000\uFEFF\uDB40\uDC20]/.test(tld)) {
                  return false;
              }
          }
          for (var part, i = 0;i < parts.length; i++) {
              part = parts[i];
              if (options.allow_underscores) {
                  part = part.replace(/_/g, '');
              }
              if (!/^[a-z\u00a1-\uffff0-9-]+$/i.test(part)) {
                  return false;
              }
              if (/[\uff01-\uff5e]/.test(part)) {
                  return false;
              }
              if (part[0] === '-' || part[part.length - 1] === '-') {
                  return false;
              }
          }
          return true;
      }
      
      module.exports = exports['default'];
  });
  var isFQDN = unwrapExports(isFQDN_1)

  var isFQDN$1 = /*#__PURE__*/Object.freeze({
    default: isFQDN,
    __moduleExports: isFQDN_1
  });

  var _isByteLength = ( isByteLength$1 && isByteLength ) || isByteLength$1;

  var _isFQDN = ( isFQDN$1 && isFQDN ) || isFQDN$1;

  var isEmail_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = isEmail;
      var _assertString2 = _interopRequireDefault(_assertString);
      var _merge2 = _interopRequireDefault(_merge);
      var _isByteLength2 = _interopRequireDefault(_isByteLength);
      var _isFQDN2 = _interopRequireDefault(_isFQDN);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      var default_email_options = {
          allow_display_name: false,
          require_display_name: false,
          allow_utf8_local_part: true,
          require_tld: true
      };
      var displayName = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\.\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\,\.\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\s]*<(.+)>$/i;
      var emailUserPart = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~]+$/i;
      var quotedEmailUser = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f]))*$/i;
      var emailUserUtf8Part = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
      var quotedEmailUserUtf8 = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
      function isEmail(str, options) {
          (0, _assertString2.default)(str);
          options = (0, _merge2.default)(options, default_email_options);
          if (options.require_display_name || options.allow_display_name) {
              var display_email = str.match(displayName);
              if (display_email) {
                  str = display_email[1];
              } else if (options.require_display_name) {
                  return false;
              }
          }
          var parts = str.split('@');
          var domain = parts.pop();
          var user = parts.join('@');
          var lower_domain = domain.toLowerCase();
          if (lower_domain === 'gmail.com' || lower_domain === 'googlemail.com') {
              user = user.replace(/\./g, '').toLowerCase();
          }
          if (!(0, _isByteLength2.default)(user, {
              max: 64
          }) || !(0, _isByteLength2.default)(domain, {
              max: 254
          })) {
              return false;
          }
          if (!(0, _isFQDN2.default)(domain, {
              require_tld: options.require_tld
          })) {
              return false;
          }
          if (user[0] === '"') {
              user = user.slice(1, user.length - 1);
              return options.allow_utf8_local_part ? quotedEmailUserUtf8.test(user) : quotedEmailUser.test(user);
          }
          var pattern = options.allow_utf8_local_part ? emailUserUtf8Part : emailUserPart;
          var user_parts = user.split('.');
          for (var i = 0;i < user_parts.length; i++) {
              if (!pattern.test(user_parts[i])) {
                  return false;
              }
          }
          return true;
      }
      
      module.exports = exports['default'];
  });
  var isEmail = unwrapExports(isEmail_1)

  var validate$7 = function (value) {
      if (Array.isArray(value)) {
          return value.every(function (val) { return isEmail(String(val)); });
      }
      return isEmail(String(value));
  };

  function ext (files, extensions) {
      var regex = new RegExp((".(" + (extensions.join('|')) + ")$"), 'i');
      return files.every(function (file) { return regex.test(file.name); });
  }

  function image (files) { return files.every(function (file) { return /\.(jpg|svg|jpeg|png|bmp|gif)$/i.test(file.name); }); }

  var validate$8 = function (value, options) {
      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$8(val, options); });
      }
      return !(!options.filter(function (option) { return option == value; }).length);
  };

  var isIP_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = isIP;
      var _assertString2 = _interopRequireDefault(_assertString);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      var ipv4Maybe = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      var ipv6Block = /^[0-9A-F]{1,4}$/i;
      function isIP(str) {
          var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
          (0, _assertString2.default)(str);
          version = String(version);
          if (!version) {
              return isIP(str, 4) || isIP(str, 6);
          } else if (version === '4') {
              if (!ipv4Maybe.test(str)) {
                  return false;
              }
              var parts = str.split('.').sort(function (a, b) {
                  return a - b;
              });
              return parts[3] <= 255;
          } else if (version === '6') {
              var blocks = str.split(':');
              var foundOmissionBlock = false;
              var foundIPv4TransitionBlock = isIP(blocks[blocks.length - 1], 4);
              var expectedNumberOfBlocks = foundIPv4TransitionBlock ? 7 : 8;
              if (blocks.length > expectedNumberOfBlocks) {
                  return false;
              }
              if (str === '::') {
                  return true;
              } else if (str.substr(0, 2) === '::') {
                  blocks.shift();
                  blocks.shift();
                  foundOmissionBlock = true;
              } else if (str.substr(str.length - 2) === '::') {
                  blocks.pop();
                  blocks.pop();
                  foundOmissionBlock = true;
              }
              for (var i = 0;i < blocks.length; ++i) {
                  if (blocks[i] === '' && i > 0 && i < blocks.length - 1) {
                      if (foundOmissionBlock) {
                          return false;
                      }
                      foundOmissionBlock = true;
                  } else if (foundIPv4TransitionBlock && i === blocks.length - 1) ; else if (!ipv6Block.test(blocks[i])) {
                      return false;
                  }
              }
              if (foundOmissionBlock) {
                  return blocks.length >= 1;
              }
              return blocks.length === expectedNumberOfBlocks;
          }
          return false;
      }
      
      module.exports = exports['default'];
  });
  var isIP = unwrapExports(isIP_1)

  var supportsPassive = true;
  var detectPassiveSupport = function () {
      try {
          var opts = Object.defineProperty({}, 'passive', {
              get: function get() {
                  supportsPassive = true;
              }
          });
          window.addEventListener('testPassive', null, opts);
          window.removeEventListener('testPassive', null, opts);
      } catch (e) {
          supportsPassive = false;
      }
      return supportsPassive;
  };
  var addEventListener = function (el, eventName, cb) {
      el.addEventListener(eventName, cb, supportsPassive ? {
          passive: true
      } : false);
  };
  var isTextInput = function (el) { return ['text','number','password','search','email','tel',
      'url','textarea'].indexOf(el.type) !== -1; };
  var isCheckboxOrRadioInput = function (el) { return ['radio','checkbox'].indexOf(el.type) !== -1; };
  var getDataAttribute = function (el, name) { return el.getAttribute(("data-vv-" + name)); };
  var isNullOrUndefined = function (value) { return value === null || value === undefined; };
  var createFlags = function () { return ({
      untouched: true,
      touched: false,
      dirty: false,
      pristine: true,
      valid: null,
      invalid: null,
      validated: false,
      pending: false,
      required: false,
      changed: false
  }); };
  var isEqual$1 = function (lhs, rhs) {
      if (lhs instanceof RegExp && rhs instanceof RegExp) {
          return isEqual$1(lhs.source, rhs.source) && isEqual$1(lhs.flags, rhs.flags);
      }
      if (Array.isArray(lhs) && Array.isArray(rhs)) {
          if (lhs.length !== rhs.length) 
              { return false; }
          for (var i = 0;i < lhs.length; i++) {
              if (!isEqual$1(lhs[i], rhs[i])) {
                  return false;
              }
          }
          return true;
      }
      if (isObject(lhs) && isObject(rhs)) {
          return Object.keys(lhs).every(function (key) { return isEqual$1(lhs[key], rhs[key]); }) && Object.keys(rhs).every(function (key) { return isEqual$1(lhs[key], rhs[key]); });
      }
      return lhs === rhs;
  };
  var getScope = function (el) {
      var scope = getDataAttribute(el, 'scope');
      if (isNullOrUndefined(scope)) {
          var form = getForm(el);
          if (form) {
              scope = getDataAttribute(form, 'scope');
          }
      }
      return !isNullOrUndefined(scope) ? scope : null;
  };
  var getForm = function (el) {
      if (isNullOrUndefined(el)) 
          { return null; }
      if (el.tagName === "FORM") 
          { return el; }
      if (!isNullOrUndefined(el.form)) 
          { return el.form; }
      return !isNullOrUndefined(el.parentNode) ? getForm(el.parentNode) : null;
  };
  var getPath = function (path, target, def) {
      if ( def === void 0 ) def = undefined;

      if (!path || !target) 
          { return def; }
      var value = target;
      path.split('.').every(function (prop) {
          if (!Object.prototype.hasOwnProperty.call(value, prop) && value[prop] === undefined) {
              value = def;
              return false;
          }
          value = value[prop];
          return true;
      });
      return value;
  };
  var hasPath = function (path, target) {
      var obj = target;
      return path.split('.').every(function (prop) {
          if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
              return false;
          }
          obj = obj[prop];
          return true;
      });
  };
  var parseRule = function (rule) {
      var params = [];
      var name = rule.split(':')[0];
      if (~rule.indexOf(':')) {
          params = rule.split(':').slice(1).join(':').split(',');
      }
      return {
          name: name,
          params: params
      };
  };
  var debounce = function (fn, wait, immediate, token) {
      if ( wait === void 0 ) wait = 0;
      if ( immediate === void 0 ) immediate = false;
      if ( token === void 0 ) token = {
      cancelled: false
  };

      if (wait === 0) {
          return fn;
      }
      var timeout;
      return function () {
          var args = [], len = arguments.length;
          while ( len-- ) args[ len ] = arguments[ len ];

          var later = function () {
              timeout = null;
              if (!immediate && !token.cancelled) 
                  { fn.apply(void 0, args); }
          };
          var callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) 
              { fn.apply(void 0, args); }
      };
  };
  var normalizeRules = function (rules) {
      if (!rules) {
          return {};
      }
      if (isObject(rules)) {
          return Object.keys(rules).reduce(function (prev, curr) {
              var params = [];
              if (rules[curr] === true) {
                  params = [];
              } else if (Array.isArray(rules[curr])) {
                  params = rules[curr];
              } else {
                  params = [rules[curr]];
              }
              if (rules[curr] !== false) {
                  prev[curr] = params;
              }
              return prev;
          }, {});
      }
      if (typeof rules !== 'string') {
          warn('rules must be either a string or an object.');
          return {};
      }
      return rules.split('|').reduce(function (prev, rule) {
          var parsedRule = parseRule(rule);
          if (!parsedRule.name) {
              return prev;
          }
          prev[parsedRule.name] = parsedRule.params;
          return prev;
      }, {});
  };
  var warn = function (message) {
      console.warn(("[vee-validate] " + message));
  };
  var createError = function (message) { return new Error(("[vee-validate] " + message)); };
  var isObject = function (obj) { return obj !== null && obj && typeof obj === 'object' && !Array.isArray(obj); };
  var isCallable = function (func) { return typeof func === 'function'; };
  var hasClass = function (el, className) {
      if (el.classList) {
          return el.classList.contains(className);
      }
      return !(!el.className.match(new RegExp(("(\\s|^)" + className + "(\\s|$)"))));
  };
  var addClass = function (el, className) {
      if (el.classList) {
          el.classList.add(className);
          return;
      }
      if (!hasClass(el, className)) {
          el.className += " " + className;
      }
  };
  var removeClass = function (el, className) {
      if (el.classList) {
          el.classList.remove(className);
          return;
      }
      if (hasClass(el, className)) {
          var reg = new RegExp(("(\\s|^)" + className + "(\\s|$)"));
          el.className = el.className.replace(reg, ' ');
      }
  };
  var toggleClass = function (el, className, status) {
      if (!el || !className) 
          { return; }
      if (Array.isArray(className)) {
          className.forEach(function (item) { return toggleClass(el, item, status); });
          return;
      }
      if (status) {
          return addClass(el, className);
      }
      removeClass(el, className);
  };
  var toArray = function (arrayLike) {
      if (isCallable(Array.from)) {
          return Array.from(arrayLike);
      }
      var array = [];
      var length = arrayLike.length;
      for (var i = 0;i < length; i++) {
          array.push(arrayLike[i]);
      }
      return array;
  };
  var assign = function (target) {
      var others = [], len = arguments.length - 1;
      while ( len-- > 0 ) others[ len ] = arguments[ len + 1 ];

      if (isCallable(Object.assign)) {
          return Object.assign.apply(Object, [ target ].concat( others ));
      }
      if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
      }
      var to = Object(target);
      others.forEach(function (arg) {
          if (arg != null) {
              Object.keys(arg).forEach(function (key) {
                  to[key] = arg[key];
              });
          }
      });
      return to;
  };
  var id = 0;
  var idTemplate = '{id}';
  var uniqId = function () {
      if (id >= 9999) {
          id = 0;
          idTemplate = idTemplate.replace('{id}', '_{id}');
      }
      id++;
      var newId = idTemplate.replace('{id}', String(id));
      return newId;
  };
  var find = function (arrayLike, predicate) {
      var array = Array.isArray(arrayLike) ? arrayLike : toArray(arrayLike);
      for (var i = 0;i < array.length; i++) {
          if (predicate(array[i])) {
              return array[i];
          }
      }
      return undefined;
  };
  var isBuiltInComponent = function (vnode) {
      if (!vnode) {
          return false;
      }
      var tag = vnode.componentOptions.tag;
      return /keep-alive|transition|transition-group/.test(tag);
  };
  var makeEventsArray = function (events) { return typeof events === 'string' && events.length ? events.split('|') : []; };
  var makeDelayObject = function (events, delay, delayConfig) {
      if (typeof delay === 'number') {
          return events.reduce(function (prev, e) {
              prev[e] = delay;
              return prev;
          }, {});
      }
      return events.reduce(function (prev, e) {
          if (typeof delay === 'object' && e in delay) {
              prev[e] = delay[e];
              return prev;
          }
          if (typeof delayConfig === 'number') {
              prev[e] = delayConfig;
              return prev;
          }
          prev[e] = delayConfig && delayConfig[e] || 0;
          return prev;
      }, {});
  };
  var deepParseInt = function (input) {
      if (typeof input === 'number') 
          { return input; }
      if (typeof input === 'string') 
          { return parseInt(input); }
      var map = {};
      for (var element in input) {
          map[element] = parseInt(input[element]);
      }
      return map;
  };
  var merge$2 = function (target, source) {
      if (!(isObject(target) && isObject(source))) {
          return target;
      }
      Object.keys(source).forEach(function (key) {
          var obj, obj$1;

          if (isObject(source[key])) {
              if (!target[key]) {
                  assign(target, ( obj = {}, obj[key] = {}, obj ));
              }
              merge$2(target[key], source[key]);
              return;
          }
          assign(target, ( obj$1 = {}, obj$1[key] = source[key], obj$1 ));
      });
      return target;
  };

  function ip (value, ref) {
      if ( ref === void 0 ) ref = [];
      var version = ref[0]; if ( version === void 0 ) version = 4;

      if (isNullOrUndefined(value)) {
          value = '';
      }
      if (Array.isArray(value)) {
          return value.every(function (val) { return isIP(val, version); });
      }
      return isIP(value, version);
  }

  function is (value, ref) {
  	if ( ref === void 0 ) ref = [];
  	var other = ref[0];

  	return value === other;
  }

  function is_not (value, ref) {
  	if ( ref === void 0 ) ref = [];
  	var other = ref[0];

  	return value !== other;
  }

  var compare = function (value, length, max) {
      if (max === undefined) {
          return value.length === length;
      }
      max = Number(max);
      return value.length >= length && value.length <= max;
  };
  function length (value, ref) {
      var length = ref[0];
      var max = ref[1]; if ( max === void 0 ) max = undefined;

      length = Number(length);
      if (value === undefined || value === null) {
          return false;
      }
      if (typeof value === 'number') {
          value = String(value);
      }
      if (!value.length) {
          value = toArray(value);
      }
      return compare(value, length, max);
  }

  function integer (value) {
      if (Array.isArray(value)) {
          return value.every(function (val) { return /^-?[0-9]+$/.test(String(val)); });
      }
      return /^-?[0-9]+$/.test(String(value));
  }

  function max$1 (value, ref) {
      var length = ref[0];

      if (value === undefined || value === null) {
          return length >= 0;
      }
      return String(value).length <= length;
  }

  function max_value (value, ref) {
      var max = ref[0];

      if (Array.isArray(value) || value === null || value === undefined || value === '') {
          return false;
      }
      return Number(value) <= max;
  }

  function mimes (files, mimes) {
      var regex = new RegExp(((mimes.join('|').replace('*', '.+')) + "$"), 'i');
      return files.every(function (file) { return regex.test(file.type); });
  }

  function min$1 (value, ref) {
      var length = ref[0];

      if (value === undefined || value === null) {
          return false;
      }
      return String(value).length >= length;
  }

  function min_value (value, ref) {
      var min = ref[0];

      if (Array.isArray(value) || value === null || value === undefined || value === '') {
          return false;
      }
      return Number(value) >= min;
  }

  var validate$9 = function (value, options) {
      if (Array.isArray(value)) {
          return value.every(function (val) { return validate$9(val, options); });
      }
      return !options.filter(function (option) { return option == value; }).length;
  };

  function numeric (value) {
      if (Array.isArray(value)) {
          return value.every(function (val) { return /^[0-9]+$/.test(String(val)); });
      }
      return /^[0-9]+$/.test(String(value));
  }

  function regex (value, ref) {
      var regex = ref[0];
      var flags = ref.slice(1);

      if (regex instanceof RegExp) {
          return regex.test(value);
      }
      return new RegExp(regex, flags).test(String(value));
  }

  function required (value, ref) {
      if ( ref === void 0 ) ref = [];
      var invalidateFalse = ref[0]; if ( invalidateFalse === void 0 ) invalidateFalse = false;

      if (Array.isArray(value)) {
          return !(!value.length);
      }
      if (value === false && invalidateFalse) {
          return false;
      }
      if (value === undefined || value === null) {
          return false;
      }
      return !(!String(value).trim().length);
  }

  function size (files, ref) {
      var size = ref[0];

      if (isNaN(size)) {
          return false;
      }
      var nSize = Number(size) * 1024;
      for (var i = 0;i < files.length; i++) {
          if (files[i].size > nSize) {
              return false;
          }
      }
      return true;
  }

  var isURL_1 = createCommonjsModule(function (module, exports) {
      Object.defineProperty(exports, "__esModule", {
          value: true
      });
      exports.default = isURL;
      var _assertString2 = _interopRequireDefault(_assertString);
      var _isFQDN2 = _interopRequireDefault(_isFQDN);
      var _isIP2 = _interopRequireDefault(isIP_1);
      var _merge2 = _interopRequireDefault(_merge);
      function _interopRequireDefault(obj) {
          return obj && obj.__esModule ? obj : {
              default: obj
          };
      }
      
      var default_url_options = {
          protocols: ['http','https','ftp'],
          require_tld: true,
          require_protocol: false,
          require_host: true,
          require_valid_protocol: true,
          allow_underscores: false,
          allow_trailing_dot: false,
          allow_protocol_relative_urls: false
      };
      var wrapped_ipv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;
      function isRegExp(obj) {
          return Object.prototype.toString.call(obj) === '[object RegExp]';
      }
      
      function checkHost(host, matches) {
          for (var i = 0;i < matches.length; i++) {
              var match = matches[i];
              if (host === match || isRegExp(match) && match.test(host)) {
                  return true;
              }
          }
          return false;
      }
      
      function isURL(url, options) {
          (0, _assertString2.default)(url);
          if (!url || url.length >= 2083 || /[\s<>]/.test(url)) {
              return false;
          }
          if (url.indexOf('mailto:') === 0) {
              return false;
          }
          options = (0, _merge2.default)(options, default_url_options);
          var protocol = void 0, auth = void 0, host = void 0, hostname = void 0, port = void 0, port_str = void 0, split = void 0, ipv6 = void 0;
          split = url.split('#');
          url = split.shift();
          split = url.split('?');
          url = split.shift();
          split = url.split('://');
          if (split.length > 1) {
              protocol = split.shift();
              if (options.require_valid_protocol && options.protocols.indexOf(protocol) === -1) {
                  return false;
              }
          } else if (options.require_protocol) {
              return false;
          } else if (options.allow_protocol_relative_urls && url.substr(0, 2) === '//') {
              split[0] = url.substr(2);
          }
          url = split.join('://');
          if (url === '') {
              return false;
          }
          split = url.split('/');
          url = split.shift();
          if (url === '' && !options.require_host) {
              return true;
          }
          split = url.split('@');
          if (split.length > 1) {
              auth = split.shift();
              if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
                  return false;
              }
          }
          hostname = split.join('@');
          port_str = null;
          ipv6 = null;
          var ipv6_match = hostname.match(wrapped_ipv6);
          if (ipv6_match) {
              host = '';
              ipv6 = ipv6_match[1];
              port_str = ipv6_match[2] || null;
          } else {
              split = hostname.split(':');
              host = split.shift();
              if (split.length) {
                  port_str = split.join(':');
              }
          }
          if (port_str !== null) {
              port = parseInt(port_str, 10);
              if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
                  return false;
              }
          }
          if (!(0, _isIP2.default)(host) && !(0, _isFQDN2.default)(host, options) && (!ipv6 || !(0, _isIP2.default)(ipv6, 6))) {
              return false;
          }
          host = host || ipv6;
          if (options.host_whitelist && !checkHost(host, options.host_whitelist)) {
              return false;
          }
          if (options.host_blacklist && checkHost(host, options.host_blacklist)) {
              return false;
          }
          return true;
      }
      
      module.exports = exports['default'];
  });
  var isURL = unwrapExports(isURL_1)

  function url (value, ref) {
      if ( ref === void 0 ) ref = [];
      var requireProtocol = ref[0]; if ( requireProtocol === void 0 ) requireProtocol = false;

      var options = {
          require_protocol: !(!requireProtocol),
          allow_underscores: true
      };
      if (isNullOrUndefined(value)) {
          value = '';
      }
      if (Array.isArray(value)) {
          return value.every(function (val) { return isURL(val, options); });
      }
      return isURL(value, options);
  }

  var Rules = {
      after: after,
      alpha_dash: validate$1,
      alpha_num: validate$2,
      alpha_spaces: validate$3,
      alpha: validate,
      before: before,
      between: validate$4,
      confirmed: confirmed,
      credit_card: credit_card,
      date_between: date_between,
      date_format: date_format,
      decimal: validate$5,
      digits: validate$6,
      dimensions: dimensions,
      email: validate$7,
      ext: ext,
      image: image,
      in: validate$8,
      integer: integer,
      length: length,
      ip: ip,
      is_not: is_not,
      is: is,
      max: max$1,
      max_value: max_value,
      mimes: mimes,
      min: min$1,
      min_value: min_value,
      not_in: validate$9,
      numeric: numeric,
      regex: regex,
      required: required,
      size: size,
      url: url
  }

  var formatFileSize = function (size) {
      var units = ['Byte','KB','MB','GB','TB','PB','EB','ZB','YB'];
      var threshold = 1024;
      size = Number(size) * threshold;
      var i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(threshold));
      return (((size / Math.pow(threshold, i)).toFixed(2) * 1) + " " + (units[i]));
  };
  var isDefinedGlobally = function () { return typeof VeeValidate !== 'undefined'; };

  var obj;
  var messages = {
      _default: function (field) { return ("The " + field + " value is not valid."); },
      after: function (field, ref) {
          var target = ref[0];
          var inclusion = ref[1];

          return ("The " + field + " must be after " + (inclusion ? 'or equal to ' : '') + target + ".");
  },
      alpha_dash: function (field) { return ("The " + field + " field may contain alpha-numeric characters as well as dashes and underscores."); },
      alpha_num: function (field) { return ("The " + field + " field may only contain alpha-numeric characters."); },
      alpha_spaces: function (field) { return ("The " + field + " field may only contain alphabetic characters as well as spaces."); },
      alpha: function (field) { return ("The " + field + " field may only contain alphabetic characters."); },
      before: function (field, ref) {
          var target = ref[0];
          var inclusion = ref[1];

          return ("The " + field + " must be before " + (inclusion ? 'or equal to ' : '') + target + ".");
  },
      between: function (field, ref) {
          var min = ref[0];
          var max = ref[1];

          return ("The " + field + " field must be between " + min + " and " + max + ".");
  },
      confirmed: function (field) { return ("The " + field + " confirmation does not match."); },
      credit_card: function (field) { return ("The " + field + " field is invalid."); },
      date_between: function (field, ref) {
          var min = ref[0];
          var max = ref[1];

          return ("The " + field + " must be between " + min + " and " + max + ".");
  },
      date_format: function (field, ref) {
          var format = ref[0];

          return ("The " + field + " must be in the format " + format + ".");
  },
      decimal: function (field, ref) {
          if ( ref === void 0 ) ref = [];
          var decimals = ref[0]; if ( decimals === void 0 ) decimals = '*';

          return ("The " + field + " field must be numeric and may contain " + (!decimals || decimals === '*' ? '' : decimals) + " decimal points.");
  },
      digits: function (field, ref) {
          var length = ref[0];

          return ("The " + field + " field must be numeric and exactly contain " + length + " digits.");
  },
      dimensions: function (field, ref) {
          var width = ref[0];
          var height = ref[1];

          return ("The " + field + " field must be " + width + " pixels by " + height + " pixels.");
  },
      email: function (field) { return ("The " + field + " field must be a valid email."); },
      ext: function (field) { return ("The " + field + " field must be a valid file."); },
      image: function (field) { return ("The " + field + " field must be an image."); },
      in: function (field) { return ("The " + field + " field must be a valid value."); },
      integer: function (field) { return ("The " + field + " field must be an integer."); },
      ip: function (field) { return ("The " + field + " field must be a valid ip address."); },
      length: function (field, ref) {
          var length = ref[0];
          var max = ref[1];

          if (max) {
              return ("The " + field + " length must be between " + length + " and " + max + ".");
          }
          return ("The " + field + " length must be " + length + ".");
      },
      max: function (field, ref) {
          var length = ref[0];

          return ("The " + field + " field may not be greater than " + length + " characters.");
  },
      max_value: function (field, ref) {
          var max = ref[0];

          return ("The " + field + " field must be " + max + " or less.");
  },
      mimes: function (field) { return ("The " + field + " field must have a valid file type."); },
      min: function (field, ref) {
          var length = ref[0];

          return ("The " + field + " field must be at least " + length + " characters.");
  },
      min_value: function (field, ref) {
          var min = ref[0];

          return ("The " + field + " field must be " + min + " or more.");
  },
      not_in: function (field) { return ("The " + field + " field must be a valid value."); },
      numeric: function (field) { return ("The " + field + " field may only contain numeric characters."); },
      regex: function (field) { return ("The " + field + " field format is invalid."); },
      required: function (field) { return ("The " + field + " field is required."); },
      size: function (field, ref) {
          var size = ref[0];

          return ("The " + field + " size must be less than " + (formatFileSize(size)) + ".");
  },
      url: function (field) { return ("The " + field + " field is not a valid URL."); }
  };
  var locale$1 = {
      name: 'en',
      messages: messages,
      attributes: {}
  };
  if (isDefinedGlobally()) {
      VeeValidate.Validator.localize(( obj = {}, obj[locale$1.name] = locale$1, obj ));
  }

  var ErrorBag = function ErrorBag() {
      this.items = [];
  };
  ErrorBag.prototype[typeof Symbol === 'function' ? Symbol.iterator : '@@iterator'] = function () {
          var this$1 = this;

      var index = 0;
      return {
          next: function () { return ({
              value: this$1.items[index++],
              done: index > this$1.items.length
          }); }
      };
  };
  ErrorBag.prototype.add = function add (error) {
          var ref;

      if (arguments.length > 1) {
          error = {
              field: arguments[0],
              msg: arguments[1],
              rule: arguments[2],
              scope: !isNullOrUndefined(arguments[3]) ? arguments[3] : null,
              regenerate: null
          };
      }
      (ref = this.items).push.apply(ref, this._normalizeError(error));
  };
  ErrorBag.prototype._normalizeError = function _normalizeError (error) {
      if (Array.isArray(error)) {
          return error.map(function (e) {
              e.scope = !isNullOrUndefined(e.scope) ? e.scope : null;
              return e;
          });
      }
      error.scope = !isNullOrUndefined(error.scope) ? error.scope : null;
      return [error];
  };
  ErrorBag.prototype.regenerate = function regenerate () {
      this.items.forEach(function (i) {
          i.msg = isCallable(i.regenerate) ? i.regenerate() : i.msg;
      });
  };
  ErrorBag.prototype.update = function update (id, error) {
      var item = find(this.items, function (i) { return i.id === id; });
      if (!item) {
          return;
      }
      var idx = this.items.indexOf(item);
      this.items.splice(idx, 1);
      item.scope = error.scope;
      this.items.push(item);
  };
  ErrorBag.prototype.all = function all (scope) {
      if (isNullOrUndefined(scope)) {
          return this.items.map(function (e) { return e.msg; });
      }
      return this.items.filter(function (e) { return e.scope === scope; }).map(function (e) { return e.msg; });
  };
  ErrorBag.prototype.any = function any (scope) {
      if (isNullOrUndefined(scope)) {
          return !(!this.items.length);
      }
      return !(!this.items.filter(function (e) { return e.scope === scope; }).length);
  };
  ErrorBag.prototype.clear = function clear (scope) {
          var this$1 = this;

      if (isNullOrUndefined(scope)) {
          scope = null;
      }
      for (var i = 0;i < this.items.length; ++i) {
          if (this$1.items[i].scope === scope) {
              this$1.items.splice(i, 1);
              --i;
          }
      }
  };
  ErrorBag.prototype.collect = function collect (field, scope, map) {
          if ( map === void 0 ) map = true;

      if (!field) {
          var collection = {};
          this.items.forEach(function (e) {
              if (!collection[e.field]) {
                  collection[e.field] = [];
              }
              collection[e.field].push(map ? e.msg : e);
          });
          return collection;
      }
      field = !isNullOrUndefined(field) ? String(field) : field;
      if (isNullOrUndefined(scope)) {
          return this.items.filter(function (e) { return e.field === field; }).map(function (e) { return map ? e.msg : e; });
      }
      return this.items.filter(function (e) { return e.field === field && e.scope === scope; }).map(function (e) { return map ? e.msg : e; });
  };
  ErrorBag.prototype.count = function count () {
      return this.items.length;
  };
  ErrorBag.prototype.firstById = function firstById (id) {
      var error = find(this.items, function (i) { return i.id === id; });
      return error ? error.msg : null;
  };
  ErrorBag.prototype.first = function first (field, scope) {
          var this$1 = this;
          if ( scope === void 0 ) scope = null;

      if (isNullOrUndefined(field)) {
          return null;
      }
      field = String(field);
      var selector = this._selector(field);
      var scoped = this._scope(field);
      if (scoped) {
          var result = this.first(scoped.name, scoped.scope);
          if (result) {
              return result;
          }
      }
      if (selector) {
          return this.firstByRule(selector.name, selector.rule, scope);
      }
      for (var i = 0;i < this.items.length; ++i) {
          if (this$1.items[i].field === field && this$1.items[i].scope === scope) {
              return this$1.items[i].msg;
          }
      }
      return null;
  };
  ErrorBag.prototype.firstRule = function firstRule (field, scope) {
      var errors = this.collect(field, scope, false);
      return errors.length && errors[0].rule || null;
  };
  ErrorBag.prototype.has = function has (field, scope) {
          if ( scope === void 0 ) scope = null;

      return !(!this.first(field, scope));
  };
  ErrorBag.prototype.firstByRule = function firstByRule (name, rule, scope) {
          if ( scope === void 0 ) scope = null;

      var error = this.collect(name, scope, false).filter(function (e) { return e.rule === rule; })[0];
      return error && error.msg || null;
  };
  ErrorBag.prototype.firstNot = function firstNot (name, rule, scope) {
          if ( rule === void 0 ) rule = 'required';
          if ( scope === void 0 ) scope = null;

      var error = this.collect(name, scope, false).filter(function (e) { return e.rule !== rule; })[0];
      return error && error.msg || null;
  };
  ErrorBag.prototype.removeById = function removeById (id) {
          var this$1 = this;

      if (Array.isArray(id)) {
          this.items = this.items.filter(function (i) { return id.indexOf(i.id) === -1; });
          return;
      }
      for (var i = 0;i < this.items.length; ++i) {
          if (this$1.items[i].id === id) {
              this$1.items.splice(i, 1);
              --i;
          }
      }
  };
  ErrorBag.prototype.remove = function remove (field, scope) {
          var this$1 = this;

      field = !isNullOrUndefined(field) ? String(field) : field;
      var removeCondition = function (e) {
          if (!isNullOrUndefined(scope)) {
              return e.field === field && e.scope === scope;
          }
          return e.field === field && e.scope === null;
      };
      for (var i = 0;i < this.items.length; ++i) {
          if (removeCondition(this$1.items[i])) {
              this$1.items.splice(i, 1);
              --i;
          }
      }
  };
  ErrorBag.prototype._selector = function _selector (field) {
      if (field.indexOf(':') > -1) {
          var ref = field.split(':');
              var name = ref[0];
              var rule = ref[1];
          return {
              name: name,
              rule: rule
          };
      }
      return null;
  };
  ErrorBag.prototype._scope = function _scope (field) {
      if (field.indexOf('.') > -1) {
          var ref = field.split('.');
              var scope = ref[0];
              var name = ref.slice(1);
          return {
              name: name.join('.'),
              scope: scope
          };
      }
      return null;
  };

  var LOCALE = 'en';
  var Dictionary = function Dictionary(dictionary) {
      if ( dictionary === void 0 ) dictionary = {};

      this.container = {};
      this.merge(dictionary);
  };

  var prototypeAccessors = { locale: { configurable: true } };
  prototypeAccessors.locale.get = function () {
      return LOCALE;
  };
  prototypeAccessors.locale.set = function (value) {
      LOCALE = value || 'en';
  };
  Dictionary.prototype.hasLocale = function hasLocale (locale) {
      return !(!this.container[locale]);
  };
  Dictionary.prototype.setDateFormat = function setDateFormat (locale, format) {
      if (!this.container[locale]) {
          this.container[locale] = {};
      }
      this.container[locale].dateFormat = format;
  };
  Dictionary.prototype.getDateFormat = function getDateFormat (locale) {
      if (!this.container[locale] || !this.container[locale].dateFormat) {
          return null;
      }
      return this.container[locale].dateFormat;
  };
  Dictionary.prototype.getMessage = function getMessage (locale, key, data) {
      var message = null;
      if (!this.hasMessage(locale, key)) {
          message = this._getDefaultMessage(locale);
      } else {
          message = this.container[locale].messages[key];
      }
      return isCallable(message) ? message.apply(void 0, data) : message;
  };
  Dictionary.prototype.getFieldMessage = function getFieldMessage (locale, field, key, data) {
      if (!this.hasLocale(locale)) {
          return this.getMessage(locale, key, data);
      }
      var dict = this.container[locale].custom && this.container[locale].custom[field];
      if (!dict || !dict[key]) {
          return this.getMessage(locale, key, data);
      }
      var message = dict[key];
      return isCallable(message) ? message.apply(void 0, data) : message;
  };
  Dictionary.prototype._getDefaultMessage = function _getDefaultMessage (locale) {
      if (this.hasMessage(locale, '_default')) {
          return this.container[locale].messages._default;
      }
      return this.container.en.messages._default;
  };
  Dictionary.prototype.getAttribute = function getAttribute (locale, key, fallback) {
          if ( fallback === void 0 ) fallback = '';

      if (!this.hasAttribute(locale, key)) {
          return fallback;
      }
      return this.container[locale].attributes[key];
  };
  Dictionary.prototype.hasMessage = function hasMessage (locale, key) {
      return !(!(this.hasLocale(locale) && this.container[locale].messages && this.container[locale].messages[key]));
  };
  Dictionary.prototype.hasAttribute = function hasAttribute (locale, key) {
      return !(!(this.hasLocale(locale) && this.container[locale].attributes && this.container[locale].attributes[key]));
  };
  Dictionary.prototype.merge = function merge$1 (dictionary) {
      merge$2(this.container, dictionary);
  };
  Dictionary.prototype.setMessage = function setMessage (locale, key, message) {
      if (!this.hasLocale(locale)) {
          this.container[locale] = {
              messages: {},
              attributes: {}
          };
      }
      this.container[locale].messages[key] = message;
  };
  Dictionary.prototype.setAttribute = function setAttribute (locale, key, attribute) {
      if (!this.hasLocale(locale)) {
          this.container[locale] = {
              messages: {},
              attributes: {}
          };
      }
      this.container[locale].attributes[key] = attribute;
  };

  Object.defineProperties( Dictionary.prototype, prototypeAccessors );

  var normalizeValue = function (value) {
      if (isObject(value)) {
          return Object.keys(value).reduce(function (prev, key) {
              prev[key] = normalizeValue(value[key]);
              return prev;
          }, {});
      }
      if (isCallable(value)) {
          return value('{0}', ['{1}','{2}','{3}']);
      }
      return value;
  };
  var normalizeFormat = function (locale) {
      var messages = normalizeValue(locale.messages);
      var custom = normalizeValue(locale.custom);
      return {
          messages: messages,
          custom: custom,
          attributes: locale.attributes,
          dateFormat: locale.dateFormat
      };
  };
  var I18nDictionary = function I18nDictionary(i18n, rootKey) {
      this.i18n = i18n;
      this.rootKey = rootKey;
  };

  var prototypeAccessors$1 = { locale: { configurable: true } };
  prototypeAccessors$1.locale.get = function () {
      return this.i18n.locale;
  };
  prototypeAccessors$1.locale.set = function (value) {
      warn('Cannot set locale from the validator when using vue-i18n, use i18n.locale setter instead');
  };
  I18nDictionary.prototype.getDateFormat = function getDateFormat (locale) {
      return this.i18n.getDateTimeFormat(locale || this.locale);
  };
  I18nDictionary.prototype.setDateFormat = function setDateFormat (locale, value) {
      this.i18n.setDateTimeFormat(locale || this.locale, value);
  };
  I18nDictionary.prototype.getMessage = function getMessage (locale, key, data) {
      var path = (this.rootKey) + ".messages." + key;
      if (!this.i18n.te(path)) {
          return this.i18n.t(((this.rootKey) + ".messages._default"), locale, data);
      }
      return this.i18n.t(path, locale, data);
  };
  I18nDictionary.prototype.getAttribute = function getAttribute (locale, key, fallback) {
          if ( fallback === void 0 ) fallback = '';

      var path = (this.rootKey) + ".attributes." + key;
      if (!this.i18n.te(path)) {
          return fallback;
      }
      return this.i18n.t(path, locale);
  };
  I18nDictionary.prototype.getFieldMessage = function getFieldMessage (locale, field, key, data) {
      var path = (this.rootKey) + ".custom." + field + "." + key;
      if (this.i18n.te(path)) {
          return this.i18n.t(path);
      }
      return this.getMessage(locale, key, data);
  };
  I18nDictionary.prototype.merge = function merge$1 (dictionary) {
          var this$1 = this;

      Object.keys(dictionary).forEach(function (localeKey) {
              var obj;

          var clone = merge$2({}, getPath((localeKey + "." + (this$1.rootKey)), this$1.i18n.messages, {}));
          var locale = merge$2(clone, normalizeFormat(dictionary[localeKey]));
          this$1.i18n.mergeLocaleMessage(localeKey, ( obj = {}, obj[this$1.rootKey] = locale, obj ));
          if (locale.dateFormat) {
              this$1.i18n.setDateTimeFormat(localeKey, locale.dateFormat);
          }
      });
  };
  I18nDictionary.prototype.setMessage = function setMessage (locale, key, value) {
          var obj, obj$1;

      this.merge(( obj$1 = {}, obj$1[locale] = {
              messages: ( obj = {}, obj[key] = value, obj )
          }, obj$1 ));
  };
  I18nDictionary.prototype.setAttribute = function setAttribute (locale, key, value) {
          var obj, obj$1;

      this.merge(( obj$1 = {}, obj$1[locale] = {
              attributes: ( obj = {}, obj[key] = value, obj )
          }, obj$1 ));
  };

  Object.defineProperties( I18nDictionary.prototype, prototypeAccessors$1 );

  var defaultConfig = {
      locale: 'en',
      delay: 0,
      errorBagName: 'errors',
      dictionary: null,
      strict: true,
      fieldsBagName: 'fields',
      classes: false,
      classNames: null,
      events: 'input|blur',
      inject: true,
      fastExit: true,
      aria: true,
      validity: false,
      i18n: null,
      i18nRootKey: 'validation'
  };
  var currentConfig = assign({}, defaultConfig);
  var dependencies = {
      dictionary: new Dictionary({
          en: {
              messages: {},
              attributes: {},
              custom: {}
          }
      })
  };
  var Config = function Config () {};

  var staticAccessors = { default: { configurable: true },current: { configurable: true } };

  staticAccessors.default.get = function () {
      return defaultConfig;
  };
  staticAccessors.current.get = function () {
      return currentConfig;
  };
  Config.dependency = function dependency (key) {
      return dependencies[key];
  };
  Config.merge = function merge (config) {
      currentConfig = assign({}, currentConfig, config);
      if (currentConfig.i18n) {
          Config.register('dictionary', new I18nDictionary(currentConfig.i18n, currentConfig.i18nRootKey));
      }
  };
  Config.register = function register (key, value) {
      dependencies[key] = value;
  };
  Config.resolve = function resolve (context) {
      var selfConfig = getPath('$options.$_veeValidate', context, {});
      return assign({}, Config.current, selfConfig);
  };

  Object.defineProperties( Config, staticAccessors );

  var Generator = function Generator () {};

  Generator.generate = function generate (el, binding, vnode) {
      var model = Generator.resolveModel(binding, vnode);
      var options = Config.resolve(vnode.context);
      return {
          name: Generator.resolveName(el, vnode),
          el: el,
          listen: !binding.modifiers.disable,
          scope: Generator.resolveScope(el, binding, vnode),
          vm: Generator.makeVM(vnode.context),
          expression: binding.value,
          component: vnode.componentInstance,
          classes: options.classes,
          classNames: options.classNames,
          getter: Generator.resolveGetter(el, vnode, model),
          events: Generator.resolveEvents(el, vnode) || options.events,
          model: model,
          delay: Generator.resolveDelay(el, vnode, options),
          rules: Generator.resolveRules(el, binding),
          initial: !(!binding.modifiers.initial),
          validity: options.validity,
          aria: options.aria,
          initialValue: Generator.resolveInitialValue(vnode)
      };
  };
  Generator.getCtorConfig = function getCtorConfig (vnode) {
      if (!vnode.componentInstance) 
          { return null; }
      var config = getPath('componentInstance.$options.$_veeValidate', vnode);
      return config;
  };
  Generator.resolveRules = function resolveRules (el, binding) {
      if (!binding.value && (!binding || !binding.expression)) {
          return getDataAttribute(el, 'rules');
      }
      if (binding.value && ~['string','object'].indexOf(typeof binding.value.rules)) {
          return binding.value.rules;
      }
      return binding.value;
  };
  Generator.resolveInitialValue = function resolveInitialValue (vnode) {
      var model = vnode.data.model || find(vnode.data.directives, function (d) { return d.name === 'model'; });
      return model && model.value;
  };
  Generator.makeVM = function makeVM (vm) {
      return {
          get $el() {
              return vm.$el;
          },
          get $refs() {
              return vm.$refs;
          },
          $watch: vm.$watch ? vm.$watch.bind(vm) : function () {},
          $validator: vm.$validator ? {
              errors: vm.$validator.errors,
              validate: vm.$validator.validate.bind(vm.$validator),
              update: vm.$validator.update.bind(vm.$validator)
          } : null
      };
  };
  Generator.resolveDelay = function resolveDelay (el, vnode, options) {
      var delay = getDataAttribute(el, 'delay');
      var globalDelay = options && 'delay' in options ? options.delay : 0;
      if (!delay && vnode.componentInstance && vnode.componentInstance.$attrs) {
          delay = vnode.componentInstance.$attrs['data-vv-delay'];
      }
      if (!isObject(globalDelay)) {
          return deepParseInt(delay || globalDelay);
      }
      if (!isNullOrUndefined(delay)) {
          globalDelay.input = delay;
      }
      return deepParseInt(globalDelay);
  };
  Generator.resolveEvents = function resolveEvents (el, vnode) {
      var events = getDataAttribute(el, 'validate-on');
      if (!events && vnode.componentInstance && vnode.componentInstance.$attrs) {
          events = vnode.componentInstance.$attrs['data-vv-validate-on'];
      }
      if (!events && vnode.componentInstance) {
          var config = Generator.getCtorConfig(vnode);
          events = config && config.events;
      }
      return events;
  };
  Generator.resolveScope = function resolveScope (el, binding, vnode) {
          if ( vnode === void 0 ) vnode = {};

      var scope = null;
      if (vnode.componentInstance && isNullOrUndefined(scope)) {
          scope = vnode.componentInstance.$attrs && vnode.componentInstance.$attrs['data-vv-scope'];
      }
      return !isNullOrUndefined(scope) ? scope : getScope(el);
  };
  Generator.resolveModel = function resolveModel (binding, vnode) {
      if (binding.arg) {
          return {
              expression: binding.arg
          };
      }
      var model = vnode.data.model || find(vnode.data.directives, function (d) { return d.name === 'model'; });
      if (!model) {
          return null;
      }
      var watchable = !/[^\w.$]/.test(model.expression) && hasPath(model.expression, vnode.context);
      var lazy = !(!(model.modifiers && model.modifiers.lazy));
      if (!watchable) {
          return {
              expression: null,
              lazy: lazy
          };
      }
      return {
          expression: model.expression,
          lazy: lazy
      };
  };
  Generator.resolveName = function resolveName (el, vnode) {
      var name = getDataAttribute(el, 'name');
      if (!name && !vnode.componentInstance) {
          return el.name;
      }
      if (!name && vnode.componentInstance && vnode.componentInstance.$attrs) {
          name = vnode.componentInstance.$attrs['data-vv-name'] || vnode.componentInstance.$attrs['name'];
      }
      if (!name && vnode.componentInstance) {
          var config = Generator.getCtorConfig(vnode);
          if (config && isCallable(config.name)) {
              var boundGetter = config.name.bind(vnode.componentInstance);
              return boundGetter();
          }
          return vnode.componentInstance.name;
      }
      return name;
  };
  Generator.resolveGetter = function resolveGetter (el, vnode, model) {
      if (model && model.expression) {
          return function () { return getPath(model.expression, vnode.context); };
      }
      if (vnode.componentInstance) {
          var path = getDataAttribute(el, 'value-path') || vnode.componentInstance.$attrs && vnode.componentInstance.$attrs['data-vv-value-path'];
          if (path) {
              return function () { return getPath(path, vnode.componentInstance); };
          }
          var config = Generator.getCtorConfig(vnode);
          if (config && isCallable(config.value)) {
              var boundGetter = config.value.bind(vnode.componentInstance);
              return function () { return boundGetter(); };
          }
          return function () { return vnode.componentInstance.value; };
      }
      switch (el.type) {
          case 'checkbox':
              return function () {
                  var els = document.querySelectorAll(("input[name=\"" + (el.name) + "\"]"));
                  els = toArray(els).filter(function (el) { return el.checked; });
                  if (!els.length) 
                      { return undefined; }
                  return els.map(function (checkbox) { return checkbox.value; });
              };
          case 'radio':
              return function () {
                  var els = document.querySelectorAll(("input[name=\"" + (el.name) + "\"]"));
                  var elm = find(els, function (el) { return el.checked; });
                  return elm && elm.value;
              };
          case 'file':
              return function (context) { return toArray(el.files); };
          case 'select-multiple':
              return function () { return toArray(el.options).filter(function (opt) { return opt.selected; }).map(function (opt) { return opt.value; }); };
          default:
              return function () { return el && el.value; };
      }
  };

  var DEFAULT_OPTIONS = {
      targetOf: null,
      initial: false,
      scope: null,
      listen: true,
      name: null,
      rules: {},
      vm: null,
      classes: false,
      validity: true,
      aria: true,
      events: 'input|blur',
      delay: 0,
      classNames: {
          touched: 'touched',
          untouched: 'untouched',
          valid: 'valid',
          invalid: 'invalid',
          pristine: 'pristine',
          dirty: 'dirty'
      }
  };
  var Field = function Field(options) {
      if ( options === void 0 ) options = {};

      this.id = uniqId();
      this.el = options.el;
      this.updated = false;
      this.dependencies = [];
      this.watchers = [];
      this.events = [];
      this.delay = 0;
      this.rules = {};
      this._cacheId(options);
      this.classNames = assign({}, DEFAULT_OPTIONS.classNames);
      options = assign({}, DEFAULT_OPTIONS, options);
      this._delay = !isNullOrUndefined(options.delay) ? options.delay : 0;
      this.validity = options.validity;
      this.aria = options.aria;
      this.flags = createFlags();
      this.vm = options.vm;
      this.component = options.component;
      this.ctorConfig = this.component ? getPath('$options.$_veeValidate', this.component) : undefined;
      this.update(options);
      this.initialValue = this.value;
      this.updated = false;
  };

  var prototypeAccessors$2 = { validator: { configurable: true },isRequired: { configurable: true },isDisabled: { configurable: true },alias: { configurable: true },value: { configurable: true },rejectsFalse: { configurable: true } };
  prototypeAccessors$2.validator.get = function () {
      if (!this.vm || !this.vm.$validator) {
          warn('No validator instance detected.');
          return {
              validate: function () {}
          };
      }
      return this.vm.$validator;
  };
  prototypeAccessors$2.isRequired.get = function () {
      return !(!this.rules.required);
  };
  prototypeAccessors$2.isDisabled.get = function () {
      return !(!(this.component && this.component.disabled)) || !(!(this.el && this.el.disabled));
  };
  prototypeAccessors$2.alias.get = function () {
      if (this._alias) {
          return this._alias;
      }
      var alias = null;
      if (this.el) {
          alias = getDataAttribute(this.el, 'as');
      }
      if (!alias && this.component) {
          return this.component.$attrs && this.component.$attrs['data-vv-as'];
      }
      return alias;
  };
  prototypeAccessors$2.value.get = function () {
      if (!isCallable(this.getter)) {
          return undefined;
      }
      return this.getter();
  };
  prototypeAccessors$2.rejectsFalse.get = function () {
      if (this.component && this.ctorConfig) {
          return !(!this.ctorConfig.rejectsFalse);
      }
      if (!this.el) {
          return false;
      }
      return this.el.type === 'checkbox';
  };
  Field.prototype.matches = function matches (options) {
      if (!options) {
          return true;
      }
      if (options.id) {
          return this.id === options.id;
      }
      if (options.name === undefined && options.scope === undefined) {
          return true;
      }
      if (options.scope === undefined) {
          return this.name === options.name;
      }
      if (options.name === undefined) {
          return this.scope === options.scope;
      }
      return options.name === this.name && options.scope === this.scope;
  };
  Field.prototype._cacheId = function _cacheId (options) {
      if (this.el && !options.targetOf) {
          this.el._veeValidateId = this.id;
      }
  };
  Field.prototype.update = function update (options) {
      this.targetOf = options.targetOf || null;
      this.initial = options.initial || this.initial || false;
      if (!isNullOrUndefined(options.scope) && options.scope !== this.scope && isCallable(this.validator.update)) {
          this.validator.update(this.id, {
              scope: options.scope
          });
      }
      this.scope = !isNullOrUndefined(options.scope) ? options.scope : !isNullOrUndefined(this.scope) ? this.scope : null;
      this.name = (!isNullOrUndefined(options.name) ? String(options.name) : options.name) || this.name || null;
      this.rules = options.rules !== undefined ? normalizeRules(options.rules) : this.rules;
      this.model = options.model || this.model;
      this.listen = options.listen !== undefined ? options.listen : this.listen;
      this.classes = (options.classes || this.classes || false) && !this.component;
      this.classNames = isObject(options.classNames) ? merge$2(this.classNames, options.classNames) : this.classNames;
      this.getter = isCallable(options.getter) ? options.getter : this.getter;
      this._alias = options.alias || this._alias;
      this.events = options.events ? makeEventsArray(options.events) : this.events;
      this.delay = makeDelayObject(this.events, options.delay || this.delay, this._delay);
      this.updateDependencies();
      this.addActionListeners();
      if (!this.name && !this.targetOf) {
          warn('A field is missing a "name" or "data-vv-name" attribute');
      }
      if (options.rules !== undefined) {
          this.flags.required = this.isRequired;
      }
      if (this.flags.validated && options.rules !== undefined && this.updated) {
          this.validator.validate(("#" + (this.id)));
      }
      this.updated = true;
      this.addValueListeners();
      if (!this.el) {
          return;
      }
      this.updateClasses();
      this.updateAriaAttrs();
  };
  Field.prototype.reset = function reset () {
          var this$1 = this;

      if (this._cancellationToken) {
          this._cancellationToken.cancelled = true;
          delete this._cancellationToken;
      }
      var defaults = createFlags();
      Object.keys(this.flags).filter(function (flag) { return flag !== 'required'; }).forEach(function (flag) {
          this$1.flags[flag] = defaults[flag];
      });
      this.addActionListeners();
      this.updateClasses();
      this.updateAriaAttrs();
      this.updateCustomValidity();
  };
  Field.prototype.setFlags = function setFlags (flags) {
          var this$1 = this;

      var negated = {
          pristine: 'dirty',
          dirty: 'pristine',
          valid: 'invalid',
          invalid: 'valid',
          touched: 'untouched',
          untouched: 'touched'
      };
      Object.keys(flags).forEach(function (flag) {
          this$1.flags[flag] = flags[flag];
          if (negated[flag] && flags[negated[flag]] === undefined) {
              this$1.flags[negated[flag]] = !flags[flag];
          }
      });
      if (flags.untouched !== undefined || flags.touched !== undefined || flags.dirty !== undefined || flags.pristine !== undefined) {
          this.addActionListeners();
      }
      this.updateClasses();
      this.updateAriaAttrs();
      this.updateCustomValidity();
  };
  Field.prototype.updateDependencies = function updateDependencies () {
          var this$1 = this;

      this.dependencies.forEach(function (d) { return d.field.destroy(); });
      this.dependencies = [];
      var fields = Object.keys(this.rules).reduce(function (prev, r) {
          if (Validator.isTargetRule(r)) {
              var selector = this$1.rules[r][0];
              if (r === 'confirmed' && !selector) {
                  selector = (this$1.name) + "_confirmation";
              }
              prev.push({
                  selector: selector,
                  name: r
              });
          }
          return prev;
      }, []);
      if (!fields.length || !this.vm || !this.vm.$el) 
          { return; }
      fields.forEach(function (ref) {
              var selector = ref.selector;
              var name = ref.name;

          var el = null;
          if (selector[0] === '$') {
              var ref$1 = this$1.vm.$refs[selector.slice(1)];
              el = Array.isArray(ref$1) ? ref$1[0] : ref$1;
          } else {
              try {
                  el = this$1.vm.$el.querySelector(selector);
              } catch (err) {
                  el = null;
              }
          }
          if (!el) {
              try {
                  el = this$1.vm.$el.querySelector(("input[name=\"" + selector + "\"]"));
              } catch (err) {
                  el = null;
              }
          }
          if (!el) {
              return;
          }
          var options = {
              vm: this$1.vm,
              classes: this$1.classes,
              classNames: this$1.classNames,
              delay: this$1.delay,
              scope: this$1.scope,
              events: this$1.events.join('|'),
              initial: this$1.initial,
              targetOf: this$1.id
          };
          if (isCallable(el.$watch)) {
              options.component = el;
              options.el = el.$el;
              options.getter = Generator.resolveGetter(el.$el, {
                  child: el
              });
          } else {
              options.el = el;
              options.getter = Generator.resolveGetter(el, {});
          }
          this$1.dependencies.push({
              name: name,
              field: new Field(options)
          });
      });
  };
  Field.prototype.unwatch = function unwatch (tag) {
          if ( tag === void 0 ) tag = null;

      if (!tag) {
          this.watchers.forEach(function (w) { return w.unwatch(); });
          this.watchers = [];
          return;
      }
      this.watchers.filter(function (w) { return tag.test(w.tag); }).forEach(function (w) { return w.unwatch(); });
      this.watchers = this.watchers.filter(function (w) { return !tag.test(w.tag); });
  };
  Field.prototype.updateClasses = function updateClasses () {
          var this$1 = this;

      if (!this.classes || this.isDisabled) 
          { return; }
      var applyClasses = function (el) {
          toggleClass(el, this$1.classNames.dirty, this$1.flags.dirty);
          toggleClass(el, this$1.classNames.pristine, this$1.flags.pristine);
          toggleClass(el, this$1.classNames.touched, this$1.flags.touched);
          toggleClass(el, this$1.classNames.untouched, this$1.flags.untouched);
          if (!isNullOrUndefined(this$1.flags.valid) && this$1.flags.validated) {
              toggleClass(el, this$1.classNames.valid, this$1.flags.valid);
          }
          if (!isNullOrUndefined(this$1.flags.invalid) && this$1.flags.validated) {
              toggleClass(el, this$1.classNames.invalid, this$1.flags.invalid);
          }
      };
      if (!isCheckboxOrRadioInput(this.el)) {
          applyClasses(this.el);
          return;
      }
      var els = document.querySelectorAll(("input[name=\"" + (this.el.name) + "\"]"));
      toArray(els).forEach(applyClasses);
  };
  Field.prototype.addActionListeners = function addActionListeners () {
          var this$1 = this;

      this.unwatch(/class/);
      if (!this.el) 
          { return; }
      var onBlur = function () {
          this$1.flags.touched = true;
          this$1.flags.untouched = false;
          if (this$1.classes) {
              toggleClass(this$1.el, this$1.classNames.touched, true);
              toggleClass(this$1.el, this$1.classNames.untouched, false);
          }
          this$1.unwatch(/^class_blur$/);
      };
      var inputEvent = isTextInput(this.el) ? 'input' : 'change';
      var onInput = function () {
          this$1.flags.dirty = true;
          this$1.flags.pristine = false;
          if (this$1.classes) {
              toggleClass(this$1.el, this$1.classNames.pristine, false);
              toggleClass(this$1.el, this$1.classNames.dirty, true);
          }
          this$1.unwatch(/^class_input$/);
      };
      if (this.component && isCallable(this.component.$once)) {
          this.component.$once('input', onInput);
          this.component.$once('blur', onBlur);
          this.watchers.push({
              tag: 'class_input',
              unwatch: function () {
                  this$1.component.$off('input', onInput);
              }
          });
          this.watchers.push({
              tag: 'class_blur',
              unwatch: function () {
                  this$1.component.$off('blur', onBlur);
              }
          });
          return;
      }
      if (!this.el) 
          { return; }
      addEventListener(this.el, inputEvent, onInput);
      var blurEvent = isCheckboxOrRadioInput(this.el) ? 'change' : 'blur';
      addEventListener(this.el, blurEvent, onBlur);
      this.watchers.push({
          tag: 'class_input',
          unwatch: function () {
              this$1.el.removeEventListener(inputEvent, onInput);
          }
      });
      this.watchers.push({
          tag: 'class_blur',
          unwatch: function () {
              this$1.el.removeEventListener(blurEvent, onBlur);
          }
      });
  };
  Field.prototype.checkValueChanged = function checkValueChanged () {
      if (this.initialValue === null && this.value === '' && isTextInput(this.el)) {
          return false;
      }
      return this.value !== this.initialValue;
  };
  Field.prototype.addValueListeners = function addValueListeners () {
          var this$1 = this;

      this.unwatch(/^input_.+/);
      if (!this.listen || !this.el) 
          { return; }
      var token = {
          cancelled: false
      };
      var fn = this.targetOf ? function () {
          this$1.flags.changed = this$1.checkValueChanged();
          this$1.validator.validate(("#" + (this$1.targetOf)));
      } : function () {
              var args = [], len = arguments.length;
              while ( len-- ) args[ len ] = arguments[ len ];

          if (args.length === 0 || isCallable(Event) && args[0] instanceof Event || args[0] && args[0].srcElement) {
              args[0] = this$1.value;
          }
          this$1.flags.changed = this$1.checkValueChanged();
          this$1.validator.validate(("#" + (this$1.id)), args[0]);
      };
      var inputEvent = this.component || isTextInput(this.el) ? 'input' : 'change';
      inputEvent = this.model && this.model.lazy ? 'change' : inputEvent;
      var events = !this.events.length || this.component || isTextInput(this.el) ? this.events : ['change'];
      if (this.model && this.model.expression && events.indexOf(inputEvent) !== -1) {
          var debouncedFn = debounce(fn, this.delay[inputEvent], false, token);
          var unwatch = this.vm.$watch(this.model.expression, function () {
                  var args = [], len = arguments.length;
                  while ( len-- ) args[ len ] = arguments[ len ];

              this$1.flags.pending = true;
              this$1._cancellationToken = token;
              debouncedFn.apply(void 0, args);
          });
          this.watchers.push({
              tag: 'input_model',
              unwatch: unwatch
          });
          events = events.filter(function (e) { return e !== inputEvent; });
      }
      events.forEach(function (e) {
          var debouncedFn = debounce(fn, this$1.delay[e], false, token);
          var validate = function () {
                  var args = [], len = arguments.length;
                  while ( len-- ) args[ len ] = arguments[ len ];

              this$1.flags.pending = true;
              this$1._cancellationToken = token;
              debouncedFn.apply(void 0, args);
          };
          this$1._addComponentEventListener(e, validate);
          this$1._addHTMLEventListener(e, validate);
      });
  };
  Field.prototype._addComponentEventListener = function _addComponentEventListener (evt, validate) {
          var this$1 = this;

      if (!this.component) 
          { return; }
      this.component.$on(evt, validate);
      this.watchers.push({
          tag: 'input_vue',
          unwatch: function () {
              this$1.component.$off(evt, validate);
          }
      });
  };
  Field.prototype._addHTMLEventListener = function _addHTMLEventListener (evt, validate) {
          var this$1 = this;

      if (!this.el || this.component) 
          { return; }
      var addListener = function (el) {
          addEventListener(el, evt, validate);
          this$1.watchers.push({
              tag: 'input_native',
              unwatch: function () {
                  el.removeEventListener(evt, validate);
              }
          });
      };
      addListener(this.el);
      if (!isCheckboxOrRadioInput(this.el)) {
          return;
      }
      var els = document.querySelectorAll(("input[name=\"" + (this.el.name) + "\"]"));
      toArray(els).forEach(function (el) {
          if (el._veeValidateId && el !== this$1.el) {
              return;
          }
          addListener(el);
      });
  };
  Field.prototype.updateAriaAttrs = function updateAriaAttrs () {
          var this$1 = this;

      if (!this.aria || !this.el || !isCallable(this.el.setAttribute)) 
          { return; }
      var applyAriaAttrs = function (el) {
          el.setAttribute('aria-required', this$1.isRequired ? 'true' : 'false');
          el.setAttribute('aria-invalid', this$1.flags.invalid ? 'true' : 'false');
      };
      if (!isCheckboxOrRadioInput(this.el)) {
          applyAriaAttrs(this.el);
          return;
      }
      var els = document.querySelectorAll(("input[name=\"" + (this.el.name) + "\"]"));
      toArray(els).forEach(applyAriaAttrs);
  };
  Field.prototype.updateCustomValidity = function updateCustomValidity () {
      if (!this.validity || !this.el || !isCallable(this.el.setCustomValidity) || !this.validator.errors) 
          { return; }
      this.el.setCustomValidity(this.flags.valid ? '' : this.validator.errors.firstById(this.id) || '');
  };
  Field.prototype.destroy = function destroy () {
      this.unwatch();
      this.dependencies.forEach(function (d) { return d.field.destroy(); });
      this.dependencies = [];
  };

  Object.defineProperties( Field.prototype, prototypeAccessors$2 );

  var FieldBag = function FieldBag() {
      this.items = [];
  };

  var prototypeAccessors$3 = { length: { configurable: true } };
  FieldBag.prototype[typeof Symbol === 'function' ? Symbol.iterator : '@@iterator'] = function () {
          var this$1 = this;

      var index = 0;
      return {
          next: function () { return ({
              value: this$1.items[index++],
              done: index > this$1.items.length
          }); }
      };
  };
  prototypeAccessors$3.length.get = function () {
      return this.items.length;
  };
  FieldBag.prototype.find = function find$1 (matcher) {
      return find(this.items, function (item) { return item.matches(matcher); });
  };
  FieldBag.prototype.filter = function filter (matcher) {
      if (Array.isArray(matcher)) {
          return this.items.filter(function (item) { return matcher.some(function (m) { return item.matches(m); }); });
      }
      return this.items.filter(function (item) { return item.matches(matcher); });
  };
  FieldBag.prototype.map = function map (mapper) {
      return this.items.map(mapper);
  };
  FieldBag.prototype.remove = function remove (matcher) {
      var item = null;
      if (matcher instanceof Field) {
          item = matcher;
      } else {
          item = this.find(matcher);
      }
      if (!item) 
          { return null; }
      var index = this.items.indexOf(item);
      this.items.splice(index, 1);
      return item;
  };
  FieldBag.prototype.push = function push (item) {
      if (!(item instanceof Field)) {
          throw createError('FieldBag only accepts instances of Field that has an id defined.');
      }
      if (!item.id) {
          throw createError('Field id must be defined.');
      }
      if (this.find({
          id: item.id
      })) {
          throw createError(("Field with id " + (item.id) + " is already added."));
      }
      this.items.push(item);
  };

  Object.defineProperties( FieldBag.prototype, prototypeAccessors$3 );

  var RULES = {};
  var STRICT_MODE = true;
  var TARGET_RULES = ['confirmed','after','before'];
  var Validator = function Validator(validations, options) {
      var this$1 = this;
      if ( options === void 0 ) options = {
      fastExit: true
  };

      this.strict = STRICT_MODE;
      this.errors = new ErrorBag();
      this.fields = new FieldBag();
      this.flags = {};
      this._createFields(validations);
      this.paused = false;
      this.fastExit = options.fastExit || false;
      this.ownerId = options.vm && options.vm._uid;
      this._localeListener = (function () {
          this$1.errors.regenerate();
      });
      if (this._vm) {
          this._vm.$on('localeChanged', this._localeListener);
      }
  };

  var prototypeAccessors$4 = { dictionary: { configurable: true },_vm: { configurable: true },locale: { configurable: true },rules: { configurable: true } };
  var staticAccessors$1 = { dictionary: { configurable: true },locale: { configurable: true },rules: { configurable: true } };
  prototypeAccessors$4.dictionary.get = function () {
      return Config.dependency('dictionary');
  };
  prototypeAccessors$4._vm.get = function () {
      return Config.dependency('vm');
  };
  staticAccessors$1.dictionary.get = function () {
      return Config.dependency('dictionary');
  };
  prototypeAccessors$4.locale.get = function () {
      return this.dictionary.locale;
  };
  prototypeAccessors$4.locale.set = function (value) {
      Validator.locale = value;
  };
  staticAccessors$1.locale.get = function () {
      return Validator.dictionary.locale;
  };
  staticAccessors$1.locale.set = function (value) {
      var hasChanged = value !== Validator.dictionary.locale;
      Validator.dictionary.locale = value;
      if (hasChanged && Config.dependency('vm')) {
          Config.dependency('vm').$emit('localeChanged');
      }
  };
  prototypeAccessors$4.rules.get = function () {
      return RULES;
  };
  staticAccessors$1.rules.get = function () {
      return RULES;
  };
  Validator.create = function create (validations, options) {
      return new Validator(validations, options);
  };
  Validator.extend = function extend (name, validator, options) {
          if ( options === void 0 ) options = {};

      Validator._guardExtend(name, validator);
      Validator._merge(name, validator);
      if (options && options.hasTarget) {
          TARGET_RULES.push(name);
      }
  };
  Validator.remove = function remove (name) {
      delete RULES[name];
      var idx = TARGET_RULES.indexOf(name);
      if (idx === -1) 
          { return; }
      TARGET_RULES.splice(idx, 1);
  };
  Validator.isTargetRule = function isTargetRule (name) {
      return TARGET_RULES.indexOf(name) !== -1;
  };
  Validator.setStrictMode = function setStrictMode (strictMode) {
          if ( strictMode === void 0 ) strictMode = true;

      STRICT_MODE = strictMode;
  };
  Validator.prototype.localize = function localize (lang, dictionary) {
      Validator.localize(lang, dictionary);
  };
  Validator.localize = function localize (lang, dictionary) {
          var obj;

      if (isObject(lang)) {
          Validator.dictionary.merge(lang);
          return;
      }
      if (dictionary) {
          var locale = lang || dictionary.name;
          dictionary = assign({}, dictionary);
          Validator.dictionary.merge(( obj = {}, obj[locale] = dictionary, obj ));
      }
      if (lang) {
          Validator.locale = lang;
      }
  };
  Validator.prototype.attach = function attach (field) {
      if (arguments.length > 1) {
          warn('This signature of the attach method has been deprecated, please consult the docs.');
          field = assign({}, {
              name: arguments[0],
              rules: arguments[1]
          }, arguments[2] || {
              vm: {
                  $validator: this
              }
          });
      }
      var value = field.initialValue;
      if (!(field instanceof Field)) {
          field = new Field(field);
      }
      this.fields.push(field);
      if (field.initial) {
          this.validate(("#" + (field.id)), value || field.value);
      } else {
          this._validate(field, value || field.value, true).then(function (result) {
              field.flags.valid = result.valid;
              field.flags.invalid = !result.valid;
          });
      }
      this._addFlag(field, field.scope);
      return field;
  };
  Validator.prototype.flag = function flag (name, flags) {
      var field = this._resolveField(name);
      if (!field || !flags) {
          return;
      }
      field.setFlags(flags);
  };
  Validator.prototype.detach = function detach (name, scope) {
      var field = name instanceof Field ? name : this._resolveField(name, scope);
      if (!field) 
          { return; }
      field.destroy();
      this.errors.remove(field.name, field.scope, field.id);
      this.fields.remove(field);
      var flags = this.flags;
      if (!isNullOrUndefined(field.scope) && flags[("$" + (field.scope))]) {
          delete flags[("$" + (field.scope))][field.name];
      } else if (isNullOrUndefined(field.scope)) {
          delete flags[field.name];
      }
      this.flags = assign({}, flags);
  };
  Validator.prototype.extend = function extend (name, validator, options) {
          if ( options === void 0 ) options = {};

      Validator.extend(name, validator, options);
  };
  Validator.prototype.reset = function reset (matcher) {
      return new Promise((function ($return, $error) {
          return this._vm.$nextTick().then((function ($await_1) {
              try {
                  return this._vm.$nextTick().then((function ($await_2) {
                          var this$1 = this;

                      try {
                          this.fields.filter(matcher).forEach(function (field) {
                              field.reset();
                              this$1.errors.remove(field.name, field.scope, field.id);
                          });
                          return $return();
                      } catch ($boundEx) {
                          return $error($boundEx);
                      }
                  }).bind(this), $error);
              } catch ($boundEx) {
                  return $error($boundEx);
              }
          }).bind(this), $error);
      }).bind(this));
  };
  Validator.prototype.update = function update (id, ref) {
          var scope = ref.scope;

      var field = this._resolveField(("#" + id));
      if (!field) 
          { return; }
      this.errors.update(id, {
          scope: scope
      });
      if (!isNullOrUndefined(field.scope) && this.flags[("$" + (field.scope))]) {
          delete this.flags[("$" + (field.scope))][field.name];
      } else if (isNullOrUndefined(field.scope)) {
          delete this.flags[field.name];
      }
      this._addFlag(field, scope);
  };
  Validator.prototype.remove = function remove (name) {
      Validator.remove(name);
  };
  Validator.prototype.validate = function validate (name, value, scope, silent) {
          if ( scope === void 0 ) scope = null;
          if ( silent === void 0 ) silent = false;

      var $args = arguments;
      return new Promise((function ($return, $error) {
          var matched, field, result;
          if (this.paused) 
              { return $return(Promise.resolve(true)); }
          if ($args.length === 0) {
              return $return(this.validateScopes());
          }
          if ($args.length === 1 && $args[0] === '*') {
              return $return(this.validateAll());
          }
          if ($args.length === 1 && typeof $args[0] === 'string' && /^(.+)\.\*$/.test($args[0])) {
              matched = $args[0].match(/^(.+)\.\*$/)[1];
              return $return(this.validateAll(matched));
          }
          field = this._resolveField(name, scope);
          if (!field) {
              return $return(this._handleFieldNotFound(name, scope));
          }
          if (!silent) 
              { field.flags.pending = true; }
          if ($args.length === 1) {
              value = field.value;
          }
          return this._validate(field, value).then((function ($await_3) {
              try {
                  result = $await_3;
                  if (!silent) {
                      this._handleValidationResults([result]);
                  }
                  return $return(result.valid);
              } catch ($boundEx) {
                  return $error($boundEx);
              }
          }).bind(this), $error);
      }).bind(this));
  };
  Validator.prototype.pause = function pause () {
      this.paused = true;
      return this;
  };
  Validator.prototype.resume = function resume () {
      this.paused = false;
      return this;
  };
  Validator.prototype.validateAll = function validateAll (values, scope, silent) {
          if ( scope === void 0 ) scope = null;
          if ( silent === void 0 ) silent = false;

      return new Promise((function ($return, $error) {
              var this$1 = this;

          var results;
          var matcher, providedValues;
          if (this.paused) 
              { return $return(true); }
          matcher = null;
          providedValues = false;
          if (typeof values === 'string') {
              matcher = {
                  scope: values
              };
          } else if (isObject(values)) {
              matcher = Object.keys(values).map(function (key) { return ({
                  name: key,
                  scope: scope
              }); });
              providedValues = true;
          } else if (Array.isArray(values)) {
              matcher = values.map(function (key) { return ({
                  name: key,
                  scope: scope
              }); });
          } else {
              matcher = {
                  scope: scope
              };
          }
          return Promise.all(this.fields.filter(matcher).map(function (field) { return this$1._validate(field, providedValues ? values[field.name] : field.value); })).then((function ($await_4) {
              try {
                  results = $await_4;
                  if (!silent) {
                      this._handleValidationResults(results);
                  }
                  return $return(results.every(function (t) { return t.valid; }));
              } catch ($boundEx) {
                  return $error($boundEx);
              }
          }).bind(this), $error);
      }).bind(this));
  };
  Validator.prototype.validateScopes = function validateScopes (silent) {
          if ( silent === void 0 ) silent = false;

      return new Promise((function ($return, $error) {
              var this$1 = this;

          var results;
          if (this.paused) 
              { return $return(true); }
          return Promise.all(this.fields.map(function (field) { return this$1._validate(field, field.value); })).then((function ($await_5) {
              try {
                  results = $await_5;
                  if (!silent) {
                      this._handleValidationResults(results);
                  }
                  return $return(results.every(function (t) { return t.valid; }));
              } catch ($boundEx) {
                  return $error($boundEx);
              }
          }).bind(this), $error);
      }).bind(this));
  };
  Validator.prototype.destroy = function destroy () {
      this._vm.$off('localeChanged', this._localeListener);
  };
  Validator.prototype._createFields = function _createFields (validations) {
          var this$1 = this;

      if (!validations) 
          { return; }
      Object.keys(validations).forEach(function (field) {
          var options = assign({}, {
              name: field,
              rules: validations[field]
          });
          this$1.attach(options);
      });
  };
  Validator.prototype._getDateFormat = function _getDateFormat (validations) {
      var format = null;
      if (validations.date_format && Array.isArray(validations.date_format)) {
          format = validations.date_format[0];
      }
      return format || this.dictionary.getDateFormat(this.locale);
  };
  Validator.prototype._isADateRule = function _isADateRule (rule) {
      return !(!(~['after','before','date_between','date_format'].indexOf(rule)));
  };
  Validator.prototype._formatErrorMessage = function _formatErrorMessage (field, rule, data, targetName) {
          if ( data === void 0 ) data = {};
          if ( targetName === void 0 ) targetName = null;

      var name = this._getFieldDisplayName(field);
      var params = this._getLocalizedParams(rule, targetName);
      return this.dictionary.getFieldMessage(this.locale, field.name, rule.name, [name,
          params,data]);
  };
  Validator.prototype._getLocalizedParams = function _getLocalizedParams (rule, targetName) {
          if ( targetName === void 0 ) targetName = null;

      if (~TARGET_RULES.indexOf(rule.name) && rule.params && rule.params[0]) {
          var localizedName = targetName || this.dictionary.getAttribute(this.locale, rule.params[0], rule.params[0]);
          return [localizedName].concat(rule.params.slice(1));
      }
      return rule.params;
  };
  Validator.prototype._getFieldDisplayName = function _getFieldDisplayName (field) {
      return field.alias || this.dictionary.getAttribute(this.locale, field.name, field.name);
  };
  Validator.prototype._addFlag = function _addFlag (field, scope) {
          var obj, obj$1, obj$2;

          if ( scope === void 0 ) scope = null;
      if (isNullOrUndefined(scope)) {
          this.flags = assign({}, this.flags, ( obj = {}, obj[("" + (field.name))] = field.flags, obj ));
          return;
      }
      var scopeObj = assign({}, this.flags[("$" + scope)] || {}, ( obj$1 = {}, obj$1[("" + (field.name))] = field.flags, obj$1 ));
      this.flags = assign({}, this.flags, ( obj$2 = {}, obj$2[("$" + scope)] = scopeObj, obj$2 ));
  };
  Validator.prototype._test = function _test (field, value, rule) {
          var this$1 = this;

      var validator = RULES[rule.name];
      var params = Array.isArray(rule.params) ? toArray(rule.params) : [];
      var targetName = null;
      if (!validator || typeof validator !== 'function') {
          throw createError(("No such validator '" + (rule.name) + "' exists."));
      }
      if (TARGET_RULES.indexOf(rule.name) !== -1) {
          var target = find(field.dependencies, function (d) { return d.name === rule.name; });
          if (target) {
              targetName = target.field.alias;
              params = [target.field.value].concat(params.slice(1));
          }
      } else if (rule.name === 'required' && field.rejectsFalse) {
          params = params.length ? params : [true];
      }
      if (this._isADateRule(rule.name)) {
          var dateFormat = this._getDateFormat(field.rules);
          if (rule.name !== 'date_format') {
              params.push(dateFormat);
          }
      }
      var result = validator(value, params);
      if (isCallable(result.then)) {
          return result.then(function (values) {
              var allValid = true;
              var data = {};
              if (Array.isArray(values)) {
                  allValid = values.every(function (t) { return isObject(t) ? t.valid : t; });
              } else {
                  allValid = isObject(values) ? values.valid : values;
                  data = values.data;
              }
              return {
                  valid: allValid,
                  errors: allValid ? [] : [this$1._createFieldError(field, rule, data, targetName)]
              };
          });
      }
      if (!isObject(result)) {
          result = {
              valid: result,
              data: {}
          };
      }
      return {
          valid: result.valid,
          errors: result.valid ? [] : [this._createFieldError(field, rule, result.data, targetName)]
      };
  };
  Validator._merge = function _merge (name, validator) {
      if (isCallable(validator)) {
          RULES[name] = validator;
          return;
      }
      RULES[name] = validator.validate;
      if (validator.getMessage) {
          Validator.dictionary.setMessage(this.locale, name, validator.getMessage);
      }
  };
  Validator._guardExtend = function _guardExtend (name, validator) {
      if (isCallable(validator)) {
          return;
      }
      if (!isCallable(validator.validate)) {
          throw createError(("Extension Error: The validator '" + name + "' must be a function or have a 'validate' method."));
      }
  };
  Validator.prototype._createFieldError = function _createFieldError (field, rule, data, targetName) {
          var this$1 = this;

      return {
          id: field.id,
          field: field.name,
          msg: this._formatErrorMessage(field, rule, data, targetName),
          rule: rule.name,
          scope: field.scope,
          regenerate: function () { return this$1._formatErrorMessage(field, rule, data, targetName); }
      };
  };
  Validator.prototype._resolveField = function _resolveField (name, scope) {
      if (!isNullOrUndefined(scope)) {
          return this.fields.find({
              name: name,
              scope: scope
          });
      }
      if (name[0] === '#') {
          return this.fields.find({
              id: name.slice(1)
          });
      }
      if (name.indexOf('.') > -1) {
          var ref = name.split('.');
              var fieldScope = ref[0];
              var fieldName = ref.slice(1);
          var field = this.fields.find({
              name: fieldName.join('.'),
              scope: fieldScope
          });
          if (field) {
              return field;
          }
      }
      return this.fields.find({
          name: name,
          scope: null
      });
  };
  Validator.prototype._handleFieldNotFound = function _handleFieldNotFound (name, scope) {
      if (!this.strict) 
          { return true; }
      var fullName = isNullOrUndefined(scope) ? name : ("" + (!isNullOrUndefined(scope) ? scope + '.' : '') + name);
      throw createError(("Validating a non-existent field: \"" + fullName + "\". Use \"attach()\" first."));
  };
  Validator.prototype._handleValidationResults = function _handleValidationResults (results) {
      var matchers = results.map(function (result) { return ({
          id: result.id
      }); });
      this.errors.removeById(matchers.map(function (m) { return m.id; }));
      var allErrors = results.reduce(function (prev, curr) {
          prev.push.apply(prev, curr.errors);
          return prev;
      }, []);
      this.errors.add(allErrors);
      this.fields.filter(matchers).forEach(function (field) {
          var result = find(results, function (r) { return r.id === field.id; });
          field.setFlags({
              pending: false,
              valid: result.valid,
              validated: true
          });
      });
  };
  Validator.prototype._validate = function _validate (field, value) {
      return new Promise((function ($return, $error) {
              var this$1 = this;

          var promises, errors;
          var isExitEarly;
          if (field.isDisabled || !field.isRequired && (isNullOrUndefined(value) || value === '')) {
              return $return({
                  valid: true,
                  id: field.id,
                  errors: []
              });
          }
          promises = [];
          errors = [];
          isExitEarly = false;
          Object.keys(field.rules).some(function (rule) {
              var result = this$1._test(field, value, {
                  name: rule,
                  params: field.rules[rule]
              });
              if (isCallable(result.then)) {
                  promises.push(result);
              } else if (this$1.fastExit && !result.valid) {
                  errors.push.apply(errors, result.errors);
                  isExitEarly = true;
              } else {
                  promises.push(new Promise(function (resolve) { return resolve(result); }));
              }
              return isExitEarly;
          });
          if (isExitEarly) {
              return $return({
                  valid: false,
                  errors: errors,
                  id: field.id
              });
          }
          return Promise.all(promises).then((function ($await_6) {
              try {
                  return $return($await_6.reduce(function (prev, v) {
                          var ref;

                      if (!v.valid) {
                          (ref = prev.errors).push.apply(ref, v.errors);
                      }
                      prev.valid = prev.valid && v.valid;
                      return prev;
                  }, {
                      valid: true,
                      errors: errors,
                      id: field.id
                  }));
              } catch ($boundEx) {
                  return $error($boundEx);
              }
          }).bind(this), $error);
      }).bind(this));
  };

  Object.defineProperties( Validator.prototype, prototypeAccessors$4 );
  Object.defineProperties( Validator, staticAccessors$1 );

  var requestsValidator = function (injections) {
      if (isObject(injections) && injections.$validator) {
          return true;
      }
      return false;
  };
  var createValidator = function (vm, options) { return new Validator(null, {
      vm: vm,
      fastExit: options.fastExit
  }); };
  var mixin = {
      provide: function provide() {
          if (this.$validator && !isBuiltInComponent(this.$vnode)) {
              return {
                  $validator: this.$validator
              };
          }
          return {};
      },
      beforeCreate: function beforeCreate() {
          if (isBuiltInComponent(this.$vnode)) {
              return;
          }
          if (!this.$parent) {
              Config.merge(this.$options.$_veeValidate || {});
          }
          var options = Config.resolve(this);
          var Vue = this.$options._base;
          if (this.$options.$validates) {
              warn('The ctor $validates option has been deprecated please set the $_veeValidate.validator option to "new" instead');
              this.$validator = createValidator(this, options);
          }
          if (!this.$parent || this.$options.$_veeValidate && /new/.test(this.$options.$_veeValidate.validator)) {
              this.$validator = createValidator(this, options);
          }
          var requested = requestsValidator(this.$options.inject);
          if (!this.$validator && options.inject && !requested) {
              this.$validator = createValidator(this, options);
          }
          if (!requested && !this.$validator) {
              return;
          }
          if (!requested && this.$validator) {
              Vue.util.defineReactive(this.$validator, 'errors', this.$validator.errors);
              Vue.util.defineReactive(this.$validator, 'flags', this.$validator.flags);
          }
          if (!this.$options.computed) {
              this.$options.computed = {};
          }
          this.$options.computed[options.errorBagName || 'errors'] = function errorBagGetter() {
              return this.$validator.errors;
          };
          this.$options.computed[options.fieldsBagName || 'fields'] = function fieldBagGetter() {
              return this.$validator.flags;
          };
      },
      beforeDestroy: function beforeDestroy() {
          if (isBuiltInComponent(this.$vnode)) 
              { return; }
          if (this.$validator && this.$validator.ownerId === this._uid) {
              this.$validator.pause();
              this.$validator.destroy();
          }
      }
  }

  function findField(el, context) {
      if (!context || !context.$validator) {
          return null;
      }
      return context.$validator.fields.find({
          id: el._veeValidateId
      });
  }
  var directive = {
      bind: function bind(el, binding, vnode) {
          var validator = vnode.context.$validator;
          if (!validator) {
              warn("No validator instance is present on vm, did you forget to inject '$validator'?");
              return;
          }
          var fieldOptions = Generator.generate(el, binding, vnode);
          validator.attach(fieldOptions);
      },
      inserted: function inserted(el, binding, vnode) {
          var field = findField(el, vnode.context);
          var scope = Generator.resolveScope(el, binding, vnode);
          if (!field || scope === field.scope) 
              { return; }
          field.update({
              scope: scope
          });
          field.updated = false;
      },
      update: function update(el, binding, vnode) {
          var field = findField(el, vnode.context);
          if (!field || field.updated && isEqual$1(binding.value, binding.oldValue)) 
              { return; }
          var scope = Generator.resolveScope(el, binding, vnode);
          var rules = Generator.resolveRules(el, binding);
          field.update({
              scope: scope,
              rules: rules
          });
      },
      unbind: function unbind(el, binding, ref) {
          var context = ref.context;

          var field = findField(el, context);
          if (!field) 
              { return; }
          context.$validator.detach(field);
      }
  }

  var Vue;
  function install(_Vue, options) {
      if ( options === void 0 ) options = {};

      if (Vue && _Vue === Vue) {
          if (process.env.NODE_ENV !== 'production') {
              warn('already installed, Vue.use(VeeValidate) should only be called once.');
          }
          return;
      }
      detectPassiveSupport();
      Vue = _Vue;
      var localVue = new Vue();
      Config.register('vm', localVue);
      Config.merge(options);
      var ref = Config.current;
      var dictionary = ref.dictionary;
      var i18n = ref.i18n;
      if (dictionary) {
          Validator.localize(dictionary);
      }
      if (i18n && i18n._vm && isCallable(i18n._vm.$watch)) {
          i18n._vm.$watch('locale', function () {
              localVue.$emit('localeChanged');
          });
      }
      if (!i18n && options.locale) {
          Validator.localize(options.locale);
      }
      Validator.setStrictMode(Config.current.strict);
      Vue.mixin(mixin);
      Vue.directive('validate', directive);
  }

  function use(plugin, options) {
      if ( options === void 0 ) options = {};

      if (!isCallable(plugin)) {
          return warn('The plugin must be a callable function');
      }
      plugin({
          Validator: Validator,
          ErrorBag: ErrorBag,
          Rules: Validator.rules
      }, options);
  }

  var normalize = function (fields) {
      if (Array.isArray(fields)) {
          return fields.reduce(function (prev, curr) {
              if (~curr.indexOf('.')) {
                  prev[curr.split('.')[1]] = curr;
              } else {
                  prev[curr] = curr;
              }
              return prev;
          }, {});
      }
      return fields;
  };
  var combine = function (lhs, rhs) {
      var mapper = {
          pristine: function (lhs, rhs) { return lhs && rhs; },
          dirty: function (lhs, rhs) { return lhs || rhs; },
          touched: function (lhs, rhs) { return lhs || rhs; },
          untouched: function (lhs, rhs) { return lhs && rhs; },
          valid: function (lhs, rhs) { return lhs && rhs; },
          invalid: function (lhs, rhs) { return lhs || rhs; },
          pending: function (lhs, rhs) { return lhs || rhs; },
          required: function (lhs, rhs) { return lhs || rhs; },
          validated: function (lhs, rhs) { return lhs && rhs; }
      };
      return Object.keys(mapper).reduce(function (flags, flag) {
          flags[flag] = mapper[flag](lhs[flag], rhs[flag]);
          return flags;
      }, {});
  };
  var mapScope = function (scope, deep) {
      if ( deep === void 0 ) deep = true;

      return Object.keys(scope).reduce(function (flags, field) {
      if (!flags) {
          flags = assign({}, scope[field]);
          return flags;
      }
      var isScope = field.indexOf('$') === 0;
      if (deep && isScope) {
          return combine(mapScope(scope[field]), flags);
      } else if (!deep && isScope) {
          return flags;
      }
      flags = combine(flags, scope[field]);
      return flags;
  }, null);
  };
  var mapFields = function (fields) {
      if (!fields) {
          return function () {
              return mapScope(this.$validator.flags);
          };
      }
      var normalized = normalize(fields);
      return Object.keys(normalized).reduce(function (prev, curr) {
          var field = normalized[curr];
          prev[curr] = function mappedField() {
              if (this.$validator.flags[field]) {
                  return this.$validator.flags[field];
              }
              if (normalized[curr] === '*') {
                  return mapScope(this.$validator.flags, false);
              }
              var index = field.indexOf('.');
              if (index <= 0) {
                  return {};
              }
              var ref = field.split('.');
              var scope = ref[0];
              var name = ref.slice(1);
              scope = this.$validator.flags[("$" + scope)];
              name = name.join('.');
              if (name === '*' && scope) {
                  return mapScope(scope);
              }
              if (scope && scope[name]) {
                  return scope[name];
              }
              return {};
          };
          return prev;
      }, {});
  };

  var ErrorComponent = {
      name: 'vv-error',
      inject: ['$validator'],
      functional: true,
      props: {
          for: {
              type: String,
              required: true
          },
          tag: {
              type: String,
              default: 'span'
          }
      },
      render: function render(createElement, ref) {
          var props = ref.props;
          var injections = ref.injections;

          return createElement(props.tag, injections.$validator.errors.first(props.for));
      }
  };

  var minimal = {
      install: install,
      use: use,
      directive: directive,
      mixin: mixin,
      mapFields: mapFields,
      Validator: Validator,
      ErrorBag: ErrorBag,
      ErrorComponent: ErrorComponent,
      version: '2.0.9'
  }

  var rulesPlugin = function (ref) {
      var Validator = ref.Validator;

      Object.keys(Rules).forEach(function (rule) {
          Validator.extend(rule, Rules[rule]);
      });
      Validator.localize('en', locale$1);
  };
  minimal.use(rulesPlugin);
  minimal.Rules = Rules;

  return minimal;

})));

}).call(this,require('_process'))
},{"_process":1}],5:[function(require,module,exports){
var Vue // late bind
var version
var map = Object.create(null)
if (typeof window !== 'undefined') {
  window.__VUE_HOT_MAP__ = map
}
var installed = false
var isBrowserify = false
var initHookName = 'beforeCreate'

exports.install = function (vue, browserify) {
  if (installed) { return }
  installed = true

  Vue = vue.__esModule ? vue.default : vue
  version = Vue.version.split('.').map(Number)
  isBrowserify = browserify

  // compat with < 2.0.0-alpha.7
  if (Vue.config._lifecycleHooks.indexOf('init') > -1) {
    initHookName = 'init'
  }

  exports.compatible = version[0] >= 2
  if (!exports.compatible) {
    console.warn(
      '[HMR] You are using a version of vue-hot-reload-api that is ' +
        'only compatible with Vue.js core ^2.0.0.'
    )
    return
  }
}

/**
 * Create a record for a hot module, which keeps track of its constructor
 * and instances
 *
 * @param {String} id
 * @param {Object} options
 */

exports.createRecord = function (id, options) {
  if(map[id]) { return }

  var Ctor = null
  if (typeof options === 'function') {
    Ctor = options
    options = Ctor.options
  }
  makeOptionsHot(id, options)
  map[id] = {
    Ctor: Ctor,
    options: options,
    instances: []
  }
}

/**
 * Check if module is recorded
 *
 * @param {String} id
 */

exports.isRecorded = function (id) {
  return typeof map[id] !== 'undefined'
}

/**
 * Make a Component options object hot.
 *
 * @param {String} id
 * @param {Object} options
 */

function makeOptionsHot(id, options) {
  if (options.functional) {
    var render = options.render
    options.render = function (h, ctx) {
      var instances = map[id].instances
      if (ctx && instances.indexOf(ctx.parent) < 0) {
        instances.push(ctx.parent)
      }
      return render(h, ctx)
    }
  } else {
    injectHook(options, initHookName, function() {
      var record = map[id]
      if (!record.Ctor) {
        record.Ctor = this.constructor
      }
      record.instances.push(this)
    })
    injectHook(options, 'beforeDestroy', function() {
      var instances = map[id].instances
      instances.splice(instances.indexOf(this), 1)
    })
  }
}

/**
 * Inject a hook to a hot reloadable component so that
 * we can keep track of it.
 *
 * @param {Object} options
 * @param {String} name
 * @param {Function} hook
 */

function injectHook(options, name, hook) {
  var existing = options[name]
  options[name] = existing
    ? Array.isArray(existing) ? existing.concat(hook) : [existing, hook]
    : [hook]
}

function tryWrap(fn) {
  return function (id, arg) {
    try {
      fn(id, arg)
    } catch (e) {
      console.error(e)
      console.warn(
        'Something went wrong during Vue component hot-reload. Full reload required.'
      )
    }
  }
}

function updateOptions (oldOptions, newOptions) {
  for (var key in oldOptions) {
    if (!(key in newOptions)) {
      delete oldOptions[key]
    }
  }
  for (var key$1 in newOptions) {
    oldOptions[key$1] = newOptions[key$1]
  }
}

exports.rerender = tryWrap(function (id, options) {
  var record = map[id]
  if (!options) {
    record.instances.slice().forEach(function (instance) {
      instance.$forceUpdate()
    })
    return
  }
  if (typeof options === 'function') {
    options = options.options
  }
  if (record.Ctor) {
    record.Ctor.options.render = options.render
    record.Ctor.options.staticRenderFns = options.staticRenderFns
    record.instances.slice().forEach(function (instance) {
      instance.$options.render = options.render
      instance.$options.staticRenderFns = options.staticRenderFns
      // reset static trees
      // pre 2.5, all static trees are cached together on the instance
      if (instance._staticTrees) {
        instance._staticTrees = []
      }
      // 2.5.0
      if (Array.isArray(record.Ctor.options.cached)) {
        record.Ctor.options.cached = []
      }
      // 2.5.3
      if (Array.isArray(instance.$options.cached)) {
        instance.$options.cached = []
      }
      // post 2.5.4: v-once trees are cached on instance._staticTrees.
      // Pure static trees are cached on the staticRenderFns array
      // (both already reset above)
      instance.$forceUpdate()
    })
  } else {
    // functional or no instance created yet
    record.options.render = options.render
    record.options.staticRenderFns = options.staticRenderFns

    // handle functional component re-render
    if (record.options.functional) {
      // rerender with full options
      if (Object.keys(options).length > 2) {
        updateOptions(record.options, options)
      } else {
        // template-only rerender.
        // need to inject the style injection code for CSS modules
        // to work properly.
        var injectStyles = record.options._injectStyles
        if (injectStyles) {
          var render = options.render
          record.options.render = function (h, ctx) {
            injectStyles.call(ctx)
            return render(h, ctx)
          }
        }
      }
      record.options._Ctor = null
      // 2.5.3
      if (Array.isArray(record.options.cached)) {
        record.options.cached = []
      }
      record.instances.slice().forEach(function (instance) {
        instance.$forceUpdate()
      })
    }
  }
})

exports.reload = tryWrap(function (id, options) {
  var record = map[id]
  if (options) {
    if (typeof options === 'function') {
      options = options.options
    }
    makeOptionsHot(id, options)
    if (record.Ctor) {
      if (version[1] < 2) {
        // preserve pre 2.2 behavior for global mixin handling
        record.Ctor.extendOptions = options
      }
      var newCtor = record.Ctor.super.extend(options)
      record.Ctor.options = newCtor.options
      record.Ctor.cid = newCtor.cid
      record.Ctor.prototype = newCtor.prototype
      if (newCtor.release) {
        // temporary global mixin strategy used in < 2.0.0-alpha.6
        newCtor.release()
      }
    } else {
      updateOptions(record.options, options)
    }
  }
  record.instances.slice().forEach(function (instance) {
    if (instance.$vnode && instance.$vnode.context) {
      instance.$vnode.context.$forceUpdate()
    } else {
      console.warn(
        'Root or manually mounted instance modified. Full reload required.'
      )
    }
  })
})

},{}],6:[function(require,module,exports){
(function (process,global,setImmediate){
/*!
 * Vue.js v2.5.17
 * (c) 2014-2018 Evan You
 * Released under the MIT License.
 */
'use strict';

/*  */

var emptyObject = Object.freeze({});

// these helpers produces better vm code in JS engines due to their
// explicitness and function inlining
function isUndef (v) {
  return v === undefined || v === null
}

function isDef (v) {
  return v !== undefined && v !== null
}

function isTrue (v) {
  return v === true
}

function isFalse (v) {
  return v === false
}

/**
 * Check if value is primitive
 */
function isPrimitive (value) {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value e.g. [object Object]
 */
var _toString = Object.prototype.toString;

function toRawType (value) {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
function isPlainObject (obj) {
  return _toString.call(obj) === '[object Object]'
}

function isRegExp (v) {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 */
function isValidArrayIndex (val) {
  var n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * Convert a value to a string that is actually rendered.
 */
function toString (val) {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert a input value to a number for persistence.
 * If the conversion fails, return original string.
 */
function toNumber (val) {
  var n = parseFloat(val);
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap (
  str,
  expectsLowerCase
) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase
    ? function (val) { return map[val.toLowerCase()]; }
    : function (val) { return map[val]; }
}

/**
 * Check if a tag is a built-in tag.
 */
var isBuiltInTag = makeMap('slot,component', true);

/**
 * Check if a attribute is a reserved attribute.
 */
var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

/**
 * Remove an item from an array
 */
function remove (arr, item) {
  if (arr.length) {
    var index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether the object has the property.
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn (obj, key) {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */
function cached (fn) {
  var cache = Object.create(null);
  return (function cachedFn (str) {
    var hit = cache[str];
    return hit || (cache[str] = fn(str))
  })
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE = /-(\w)/g;
var camelize = cached(function (str) {
  return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
});

/**
 * Capitalize a string.
 */
var capitalize = cached(function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
});

/**
 * Hyphenate a camelCase string.
 */
var hyphenateRE = /\B([A-Z])/g;
var hyphenate = cached(function (str) {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
});

/**
 * Simple bind polyfill for environments that do not support it... e.g.
 * PhantomJS 1.x. Technically we don't need this anymore since native bind is
 * now more performant in most browsers, but removing it would be breaking for
 * code that was able to run in PhantomJS 1.x, so this must be kept for
 * backwards compatibility.
 */

/* istanbul ignore next */
function polyfillBind (fn, ctx) {
  function boundFn (a) {
    var l = arguments.length;
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length;
  return boundFn
}

function nativeBind (fn, ctx) {
  return fn.bind(ctx)
}

var bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind;

/**
 * Convert an Array-like object to a real Array.
 */
function toArray (list, start) {
  start = start || 0;
  var i = list.length - start;
  var ret = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret
}

/**
 * Mix properties into target object.
 */
function extend (to, _from) {
  for (var key in _from) {
    to[key] = _from[key];
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
function toObject (arr) {
  var res = {};
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i]);
    }
  }
  return res
}

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/)
 */
function noop (a, b, c) {}

/**
 * Always return false.
 */
var no = function (a, b, c) { return false; };

/**
 * Return same value
 */
var identity = function (_) { return _; };

/**
 * Generate a static keys string from compiler modules.
 */


/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
function looseEqual (a, b) {
  if (a === b) { return true }
  var isObjectA = isObject(a);
  var isObjectB = isObject(b);
  if (isObjectA && isObjectB) {
    try {
      var isArrayA = Array.isArray(a);
      var isArrayB = Array.isArray(b);
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every(function (e, i) {
          return looseEqual(e, b[i])
        })
      } else if (!isArrayA && !isArrayB) {
        var keysA = Object.keys(a);
        var keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every(function (key) {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

function looseIndexOf (arr, val) {
  for (var i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) { return i }
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
function once (fn) {
  var called = false;
  return function () {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  }
}

var SSR_ATTR = 'data-server-rendered';

var ASSET_TYPES = [
  'component',
  'directive',
  'filter'
];

var LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured'
];

/*  */

var config = ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  mustUseProp: no,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
})

/*  */

/**
 * Check if a string starts with $ or _
 */
function isReserved (str) {
  var c = (str + '').charCodeAt(0);
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

/**
 * Parse simple path.
 */
var bailRE = /[^\w.$]/;
function parsePath (path) {
  if (bailRE.test(path)) {
    return
  }
  var segments = path.split('.');
  return function (obj) {
    for (var i = 0; i < segments.length; i++) {
      if (!obj) { return }
      obj = obj[segments[i]];
    }
    return obj
  }
}

/*  */

// can we use __proto__?
var hasProto = '__proto__' in {};

// Browser environment sniffing
var inBrowser = typeof window !== 'undefined';
var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;
var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
var UA = inBrowser && window.navigator.userAgent.toLowerCase();
var isIE = UA && /msie|trident/.test(UA);
var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
var isEdge = UA && UA.indexOf('edge/') > 0;
var isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android');
var isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios');
var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;

// Firefox has a "watch" function on Object.prototype...
var nativeWatch = ({}).watch;

var supportsPassive = false;
if (inBrowser) {
  try {
    var opts = {};
    Object.defineProperty(opts, 'passive', ({
      get: function get () {
        /* istanbul ignore next */
        supportsPassive = true;
      }
    })); // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts);
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
var _isServer;
var isServerRendering = function () {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global['process'].env.VUE_ENV === 'server';
    } else {
      _isServer = false;
    }
  }
  return _isServer
};

// detect devtools
var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

/* istanbul ignore next */
function isNative (Ctor) {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

var hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

var _Set;
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set;
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = (function () {
    function Set () {
      this.set = Object.create(null);
    }
    Set.prototype.has = function has (key) {
      return this.set[key] === true
    };
    Set.prototype.add = function add (key) {
      this.set[key] = true;
    };
    Set.prototype.clear = function clear () {
      this.set = Object.create(null);
    };

    return Set;
  }());
}

/*  */

var warn = noop;
var tip = noop;
var generateComponentTrace = (noop); // work around flow check
var formatComponentName = (noop);

if (process.env.NODE_ENV !== 'production') {
  var hasConsole = typeof console !== 'undefined';
  var classifyRE = /(?:^|[-_])(\w)/g;
  var classify = function (str) { return str
    .replace(classifyRE, function (c) { return c.toUpperCase(); })
    .replace(/[-_]/g, ''); };

  warn = function (msg, vm) {
    var trace = vm ? generateComponentTrace(vm) : '';

    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace);
    } else if (hasConsole && (!config.silent)) {
      console.error(("[Vue warn]: " + msg + trace));
    }
  };

  tip = function (msg, vm) {
    if (hasConsole && (!config.silent)) {
      console.warn("[Vue tip]: " + msg + (
        vm ? generateComponentTrace(vm) : ''
      ));
    }
  };

  formatComponentName = function (vm, includeFile) {
    if (vm.$root === vm) {
      return '<Root>'
    }
    var options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm || {};
    var name = options.name || options._componentTag;
    var file = options.__file;
    if (!name && file) {
      var match = file.match(/([^/\\]+)\.vue$/);
      name = match && match[1];
    }

    return (
      (name ? ("<" + (classify(name)) + ">") : "<Anonymous>") +
      (file && includeFile !== false ? (" at " + file) : '')
    )
  };

  var repeat = function (str, n) {
    var res = '';
    while (n) {
      if (n % 2 === 1) { res += str; }
      if (n > 1) { str += str; }
      n >>= 1;
    }
    return res
  };

  generateComponentTrace = function (vm) {
    if (vm._isVue && vm.$parent) {
      var tree = [];
      var currentRecursiveSequence = 0;
      while (vm) {
        if (tree.length > 0) {
          var last = tree[tree.length - 1];
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++;
            vm = vm.$parent;
            continue
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence];
            currentRecursiveSequence = 0;
          }
        }
        tree.push(vm);
        vm = vm.$parent;
      }
      return '\n\nfound in\n\n' + tree
        .map(function (vm, i) { return ("" + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm)
            ? ((formatComponentName(vm[0])) + "... (" + (vm[1]) + " recursive calls)")
            : formatComponentName(vm))); })
        .join('\n')
    } else {
      return ("\n\n(found in " + (formatComponentName(vm)) + ")")
    }
  };
}

/*  */


var uid = 0;

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
var Dep = function Dep () {
  this.id = uid++;
  this.subs = [];
};

Dep.prototype.addSub = function addSub (sub) {
  this.subs.push(sub);
};

Dep.prototype.removeSub = function removeSub (sub) {
  remove(this.subs, sub);
};

Dep.prototype.depend = function depend () {
  if (Dep.target) {
    Dep.target.addDep(this);
  }
};

Dep.prototype.notify = function notify () {
  // stabilize the subscriber list first
  var subs = this.subs.slice();
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update();
  }
};

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null;
var targetStack = [];

function pushTarget (_target) {
  if (Dep.target) { targetStack.push(Dep.target); }
  Dep.target = _target;
}

function popTarget () {
  Dep.target = targetStack.pop();
}

/*  */

var VNode = function VNode (
  tag,
  data,
  children,
  text,
  elm,
  context,
  componentOptions,
  asyncFactory
) {
  this.tag = tag;
  this.data = data;
  this.children = children;
  this.text = text;
  this.elm = elm;
  this.ns = undefined;
  this.context = context;
  this.fnContext = undefined;
  this.fnOptions = undefined;
  this.fnScopeId = undefined;
  this.key = data && data.key;
  this.componentOptions = componentOptions;
  this.componentInstance = undefined;
  this.parent = undefined;
  this.raw = false;
  this.isStatic = false;
  this.isRootInsert = true;
  this.isComment = false;
  this.isCloned = false;
  this.isOnce = false;
  this.asyncFactory = asyncFactory;
  this.asyncMeta = undefined;
  this.isAsyncPlaceholder = false;
};

var prototypeAccessors = { child: { configurable: true } };

// DEPRECATED: alias for componentInstance for backwards compat.
/* istanbul ignore next */
prototypeAccessors.child.get = function () {
  return this.componentInstance
};

Object.defineProperties( VNode.prototype, prototypeAccessors );

var createEmptyVNode = function (text) {
  if ( text === void 0 ) text = '';

  var node = new VNode();
  node.text = text;
  node.isComment = true;
  return node
};

function createTextVNode (val) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
function cloneVNode (vnode) {
  var cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  );
  cloned.ns = vnode.ns;
  cloned.isStatic = vnode.isStatic;
  cloned.key = vnode.key;
  cloned.isComment = vnode.isComment;
  cloned.fnContext = vnode.fnContext;
  cloned.fnOptions = vnode.fnOptions;
  cloned.fnScopeId = vnode.fnScopeId;
  cloned.isCloned = true;
  return cloned
}

/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

var arrayProto = Array.prototype;
var arrayMethods = Object.create(arrayProto);

var methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  var original = arrayProto[method];
  def(arrayMethods, method, function mutator () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    var result = original.apply(this, args);
    var ob = this.__ob__;
    var inserted;
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break
      case 'splice':
        inserted = args.slice(2);
        break
    }
    if (inserted) { ob.observeArray(inserted); }
    // notify change
    ob.dep.notify();
    return result
  });
});

/*  */

var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
var shouldObserve = true;

function toggleObserving (value) {
  shouldObserve = value;
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
var Observer = function Observer (value) {
  this.value = value;
  this.dep = new Dep();
  this.vmCount = 0;
  def(value, '__ob__', this);
  if (Array.isArray(value)) {
    var augment = hasProto
      ? protoAugment
      : copyAugment;
    augment(value, arrayMethods, arrayKeys);
    this.observeArray(value);
  } else {
    this.walk(value);
  }
};

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 */
Observer.prototype.walk = function walk (obj) {
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    defineReactive(obj, keys[i]);
  }
};

/**
 * Observe a list of Array items.
 */
Observer.prototype.observeArray = function observeArray (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i]);
  }
};

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src, keys) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
function observe (value, asRootData) {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  var ob;
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    ob.vmCount++;
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
function defineReactive (
  obj,
  key,
  val,
  customSetter,
  shallow
) {
  var dep = new Dep();

  var property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get;
  if (!getter && arguments.length === 2) {
    val = obj[key];
  }
  var setter = property && property.set;

  var childOb = !shallow && observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      var value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      var value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter();
      }
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      dep.notify();
    }
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
function set (target, key, val) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val
  }
  var ob = (target).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    );
    return val
  }
  if (!ob) {
    target[key] = val;
    return val
  }
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
function del (target, key) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(("Cannot delete reactive property on undefined, null, or primitive value: " + ((target))));
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return
  }
  var ob = (target).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    );
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key];
  if (!ob) {
    return
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value) {
  for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}

/*  */

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
var strats = config.optionMergeStrategies;

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        "option \"" + key + "\" can only be used during instance " +
        'creation with the `new` keyword.'
      );
    }
    return defaultStrat(parent, child)
  };
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData (to, from) {
  if (!from) { return to }
  var key, toVal, fromVal;
  var keys = Object.keys(from);
  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    toVal = to[key];
    fromVal = from[key];
    if (!hasOwn(to, key)) {
      set(to, key, fromVal);
    } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
      mergeData(toVal, fromVal);
    }
  }
  return to
}

/**
 * Data
 */
function mergeDataOrFn (
  parentVal,
  childVal,
  vm
) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      var instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal;
      var defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal;
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

strats.data = function (
  parentVal,
  childVal,
  vm
) {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      );

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
};

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook (
  parentVal,
  childVal
) {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

LIFECYCLE_HOOKS.forEach(function (hook) {
  strats[hook] = mergeHook;
});

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets (
  parentVal,
  childVal,
  vm,
  key
) {
  var res = Object.create(parentVal || null);
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm);
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets;
});

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (
  parentVal,
  childVal,
  vm,
  key
) {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) { parentVal = undefined; }
  if (childVal === nativeWatch) { childVal = undefined; }
  /* istanbul ignore if */
  if (!childVal) { return Object.create(parentVal || null) }
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) { return childVal }
  var ret = {};
  extend(ret, parentVal);
  for (var key$1 in childVal) {
    var parent = ret[key$1];
    var child = childVal[key$1];
    if (parent && !Array.isArray(parent)) {
      parent = [parent];
    }
    ret[key$1] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child];
  }
  return ret
};

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal,
  childVal,
  vm,
  key
) {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) { return childVal }
  var ret = Object.create(null);
  extend(ret, parentVal);
  if (childVal) { extend(ret, childVal); }
  return ret
};
strats.provide = mergeDataOrFn;

/**
 * Default strategy.
 */
var defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal
};

/**
 * Validate component names
 */
function checkComponents (options) {
  for (var key in options.components) {
    validateComponentName(key);
  }
}

function validateComponentName (name) {
  if (!/^[a-zA-Z][\w-]*$/.test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'can only contain alphanumeric characters and the hyphen, ' +
      'and must start with a letter.'
    );
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    );
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options, vm) {
  var props = options.props;
  if (!props) { return }
  var res = {};
  var i, val, name;
  if (Array.isArray(props)) {
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === 'string') {
        name = camelize(val);
        res[name] = { type: null };
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.');
      }
    }
  } else if (isPlainObject(props)) {
    for (var key in props) {
      val = props[key];
      name = camelize(key);
      res[name] = isPlainObject(val)
        ? val
        : { type: val };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      "Invalid value for option \"props\": expected an Array or an Object, " +
      "but got " + (toRawType(props)) + ".",
      vm
    );
  }
  options.props = res;
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject (options, vm) {
  var inject = options.inject;
  if (!inject) { return }
  var normalized = options.inject = {};
  if (Array.isArray(inject)) {
    for (var i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] };
    }
  } else if (isPlainObject(inject)) {
    for (var key in inject) {
      var val = inject[key];
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      "Invalid value for option \"inject\": expected an Array or an Object, " +
      "but got " + (toRawType(inject)) + ".",
      vm
    );
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options) {
  var dirs = options.directives;
  if (dirs) {
    for (var key in dirs) {
      var def = dirs[key];
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def };
      }
    }
  }
}

function assertObjectType (name, value, vm) {
  if (!isPlainObject(value)) {
    warn(
      "Invalid value for option \"" + name + "\": expected an Object, " +
      "but got " + (toRawType(value)) + ".",
      vm
    );
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
function mergeOptions (
  parent,
  child,
  vm
) {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child);
  }

  if (typeof child === 'function') {
    child = child.options;
  }

  normalizeProps(child, vm);
  normalizeInject(child, vm);
  normalizeDirectives(child);
  var extendsFrom = child.extends;
  if (extendsFrom) {
    parent = mergeOptions(parent, extendsFrom, vm);
  }
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm);
    }
  }
  var options = {};
  var key;
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField (key) {
    var strat = strats[key] || defaultStrat;
    options[key] = strat(parent[key], child[key], vm, key);
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
function resolveAsset (
  options,
  type,
  id,
  warnMissing
) {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  var assets = options[type];
  // check local registration variations first
  if (hasOwn(assets, id)) { return assets[id] }
  var camelizedId = camelize(id);
  if (hasOwn(assets, camelizedId)) { return assets[camelizedId] }
  var PascalCaseId = capitalize(camelizedId);
  if (hasOwn(assets, PascalCaseId)) { return assets[PascalCaseId] }
  // fallback to prototype chain
  var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    );
  }
  return res
}

/*  */

function validateProp (
  key,
  propOptions,
  propsData,
  vm
) {
  var prop = propOptions[key];
  var absent = !hasOwn(propsData, key);
  var value = propsData[key];
  // boolean casting
  var booleanIndex = getTypeIndex(Boolean, prop.type);
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false;
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      var stringIndex = getTypeIndex(String, prop.type);
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true;
      }
    }
  }
  // check default value
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key);
    // since the default value is a fresh copy,
    // make sure to observe it.
    var prevShouldObserve = shouldObserve;
    toggleObserving(true);
    observe(value);
    toggleObserving(prevShouldObserve);
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(false && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent);
  }
  return value
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm, prop, key) {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  var def = prop.default;
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    );
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
function assertProp (
  prop,
  name,
  value,
  vm,
  absent
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    );
    return
  }
  if (value == null && !prop.required) {
    return
  }
  var type = prop.type;
  var valid = !type || type === true;
  var expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (var i = 0; i < type.length && !valid; i++) {
      var assertedType = assertType(value, type[i]);
      expectedTypes.push(assertedType.expectedType || '');
      valid = assertedType.valid;
    }
  }
  if (!valid) {
    warn(
      "Invalid prop: type check failed for prop \"" + name + "\"." +
      " Expected " + (expectedTypes.map(capitalize).join(', ')) +
      ", got " + (toRawType(value)) + ".",
      vm
    );
    return
  }
  var validator = prop.validator;
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      );
    }
  }
}

var simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;

function assertType (value, type) {
  var valid;
  var expectedType = getType(type);
  if (simpleCheckRE.test(expectedType)) {
    var t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type;
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value);
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value);
  } else {
    valid = value instanceof type;
  }
  return {
    valid: valid,
    expectedType: expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  var match = fn && fn.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}

function getTypeIndex (type, expectedTypes) {
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  for (var i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

/*  */

function handleError (err, vm, info) {
  if (vm) {
    var cur = vm;
    while ((cur = cur.$parent)) {
      var hooks = cur.$options.errorCaptured;
      if (hooks) {
        for (var i = 0; i < hooks.length; i++) {
          try {
            var capture = hooks[i].call(cur, err, vm, info) === false;
            if (capture) { return }
          } catch (e) {
            globalHandleError(e, cur, 'errorCaptured hook');
          }
        }
      }
    }
  }
  globalHandleError(err, vm, info);
}

function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      logError(e, null, 'config.errorHandler');
    }
  }
  logError(err, vm, info);
}

function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(("Error in " + info + ": \"" + (err.toString()) + "\""), vm);
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err);
  } else {
    throw err
  }
}

/*  */
/* globals MessageChannel */

var callbacks = [];
var pending = false;

function flushCallbacks () {
  pending = false;
  var copies = callbacks.slice(0);
  callbacks.length = 0;
  for (var i = 0; i < copies.length; i++) {
    copies[i]();
  }
}

// Here we have async deferring wrappers using both microtasks and (macro) tasks.
// In < 2.4 we used microtasks everywhere, but there are some scenarios where
// microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690) or even between bubbling of the same
// event (#6566). However, using (macro) tasks everywhere also has subtle problems
// when state is changed right before repaint (e.g. #6813, out-in transitions).
// Here we use microtask by default, but expose a way to force (macro) task when
// needed (e.g. in event handlers attached by v-on).
var microTimerFunc;
var macroTimerFunc;
var useMacroTask = false;

// Determine (macro) task defer implementation.
// Technically setImmediate should be the ideal choice, but it's only available
// in IE. The only polyfill that consistently queues the callback after all DOM
// events triggered in the same loop is by using MessageChannel.
/* istanbul ignore if */
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  macroTimerFunc = function () {
    setImmediate(flushCallbacks);
  };
} else if (typeof MessageChannel !== 'undefined' && (
  isNative(MessageChannel) ||
  // PhantomJS
  MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
  var channel = new MessageChannel();
  var port = channel.port2;
  channel.port1.onmessage = flushCallbacks;
  macroTimerFunc = function () {
    port.postMessage(1);
  };
} else {
  /* istanbul ignore next */
  macroTimerFunc = function () {
    setTimeout(flushCallbacks, 0);
  };
}

// Determine microtask defer implementation.
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  var p = Promise.resolve();
  microTimerFunc = function () {
    p.then(flushCallbacks);
    // in problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) { setTimeout(noop); }
  };
} else {
  // fallback to macro
  microTimerFunc = macroTimerFunc;
}

/**
 * Wrap a function so that if any code inside triggers state change,
 * the changes are queued using a (macro) task instead of a microtask.
 */
function withMacroTask (fn) {
  return fn._withTask || (fn._withTask = function () {
    useMacroTask = true;
    var res = fn.apply(null, arguments);
    useMacroTask = false;
    return res
  })
}

function nextTick (cb, ctx) {
  var _resolve;
  callbacks.push(function () {
    if (cb) {
      try {
        cb.call(ctx);
      } catch (e) {
        handleError(e, ctx, 'nextTick');
      }
    } else if (_resolve) {
      _resolve(ctx);
    }
  });
  if (!pending) {
    pending = true;
    if (useMacroTask) {
      macroTimerFunc();
    } else {
      microTimerFunc();
    }
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(function (resolve) {
      _resolve = resolve;
    })
  }
}

/*  */

/* not type checking this file because flow doesn't play well with Proxy */

var initProxy;

if (process.env.NODE_ENV !== 'production') {
  var allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  );

  var warnNonPresent = function (target, key) {
    warn(
      "Property or method \"" + key + "\" is not defined on the instance but " +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    );
  };

  var hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy);

  if (hasProxy) {
    var isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact');
    config.keyCodes = new Proxy(config.keyCodes, {
      set: function set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(("Avoid overwriting built-in modifier in config.keyCodes: ." + key));
          return false
        } else {
          target[key] = value;
          return true
        }
      }
    });
  }

  var hasHandler = {
    has: function has (target, key) {
      var has = key in target;
      var isAllowed = allowedGlobals(key) || key.charAt(0) === '_';
      if (!has && !isAllowed) {
        warnNonPresent(target, key);
      }
      return has || !isAllowed
    }
  };

  var getHandler = {
    get: function get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        warnNonPresent(target, key);
      }
      return target[key]
    }
  };

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      var options = vm.$options;
      var handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler;
      vm._renderProxy = new Proxy(vm, handlers);
    } else {
      vm._renderProxy = vm;
    }
  };
}

/*  */

var seenObjects = new _Set();

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
function traverse (val) {
  _traverse(val, seenObjects);
  seenObjects.clear();
}

function _traverse (val, seen) {
  var i, keys;
  var isA = Array.isArray(val);
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    var depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      return
    }
    seen.add(depId);
  }
  if (isA) {
    i = val.length;
    while (i--) { _traverse(val[i], seen); }
  } else {
    keys = Object.keys(val);
    i = keys.length;
    while (i--) { _traverse(val[keys[i]], seen); }
  }
}

var mark;
var measure;

if (process.env.NODE_ENV !== 'production') {
  var perf = inBrowser && window.performance;
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = function (tag) { return perf.mark(tag); };
    measure = function (name, startTag, endTag) {
      perf.measure(name, startTag, endTag);
      perf.clearMarks(startTag);
      perf.clearMarks(endTag);
      perf.clearMeasures(name);
    };
  }
}

/*  */

var normalizeEvent = cached(function (name) {
  var passive = name.charAt(0) === '&';
  name = passive ? name.slice(1) : name;
  var once$$1 = name.charAt(0) === '~'; // Prefixed last, checked first
  name = once$$1 ? name.slice(1) : name;
  var capture = name.charAt(0) === '!';
  name = capture ? name.slice(1) : name;
  return {
    name: name,
    once: once$$1,
    capture: capture,
    passive: passive
  }
});

function createFnInvoker (fns) {
  function invoker () {
    var arguments$1 = arguments;

    var fns = invoker.fns;
    if (Array.isArray(fns)) {
      var cloned = fns.slice();
      for (var i = 0; i < cloned.length; i++) {
        cloned[i].apply(null, arguments$1);
      }
    } else {
      // return handler return value for single handlers
      return fns.apply(null, arguments)
    }
  }
  invoker.fns = fns;
  return invoker
}

function updateListeners (
  on,
  oldOn,
  add,
  remove$$1,
  vm
) {
  var name, def, cur, old, event;
  for (name in on) {
    def = cur = on[name];
    old = oldOn[name];
    event = normalizeEvent(name);
    /* istanbul ignore if */
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        "Invalid handler for event \"" + (event.name) + "\": got " + String(cur),
        vm
      );
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur);
      }
      add(event.name, cur, event.once, event.capture, event.passive, event.params);
    } else if (cur !== old) {
      old.fns = cur;
      on[name] = old;
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name);
      remove$$1(event.name, oldOn[name], event.capture);
    }
  }
}

/*  */

function mergeVNodeHook (def, hookKey, hook) {
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {});
  }
  var invoker;
  var oldHook = def[hookKey];

  function wrappedHook () {
    hook.apply(this, arguments);
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook);
  }

  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook]);
  } else {
    /* istanbul ignore if */
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // already a merged invoker
      invoker = oldHook;
      invoker.fns.push(wrappedHook);
    } else {
      // existing plain hook
      invoker = createFnInvoker([oldHook, wrappedHook]);
    }
  }

  invoker.merged = true;
  def[hookKey] = invoker;
}

/*  */

function extractPropsFromVNodeData (
  data,
  Ctor,
  tag
) {
  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  var propOptions = Ctor.options.props;
  if (isUndef(propOptions)) {
    return
  }
  var res = {};
  var attrs = data.attrs;
  var props = data.props;
  if (isDef(attrs) || isDef(props)) {
    for (var key in propOptions) {
      var altKey = hyphenate(key);
      if (process.env.NODE_ENV !== 'production') {
        var keyInLowerCase = key.toLowerCase();
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            "Prop \"" + keyInLowerCase + "\" is passed to component " +
            (formatComponentName(tag || Ctor)) + ", but the declared prop name is" +
            " \"" + key + "\". " +
            "Note that HTML attributes are case-insensitive and camelCased " +
            "props need to use their kebab-case equivalents when using in-DOM " +
            "templates. You should probably use \"" + altKey + "\" instead of \"" + key + "\"."
          );
        }
      }
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false);
    }
  }
  return res
}

function checkProp (
  res,
  hash,
  key,
  altKey,
  preserve
) {
  if (isDef(hash)) {
    if (hasOwn(hash, key)) {
      res[key] = hash[key];
      if (!preserve) {
        delete hash[key];
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey];
      if (!preserve) {
        delete hash[altKey];
      }
      return true
    }
  }
  return false
}

/*  */

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.
function simpleNormalizeChildren (children) {
  for (var i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.
function normalizeChildren (children) {
  return isPrimitive(children)
    ? [createTextVNode(children)]
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

function isTextNode (node) {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children, nestedIndex) {
  var res = [];
  var i, c, lastIndex, last;
  for (i = 0; i < children.length; i++) {
    c = children[i];
    if (isUndef(c) || typeof c === 'boolean') { continue }
    lastIndex = res.length - 1;
    last = res[lastIndex];
    //  nested
    if (Array.isArray(c)) {
      if (c.length > 0) {
        c = normalizeArrayChildren(c, ((nestedIndex || '') + "_" + i));
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]).text);
          c.shift();
        }
        res.push.apply(res, c);
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c);
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c));
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
        res[lastIndex] = createTextVNode(last.text + c.text);
      } else {
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = "__vlist" + nestedIndex + "_" + i + "__";
        }
        res.push(c);
      }
    }
  }
  return res
}

/*  */

function ensureCtor (comp, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default;
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

function createAsyncPlaceholder (
  factory,
  data,
  context,
  children,
  tag
) {
  var node = createEmptyVNode();
  node.asyncFactory = factory;
  node.asyncMeta = { data: data, context: context, children: children, tag: tag };
  return node
}

function resolveAsyncComponent (
  factory,
  baseCtor,
  context
) {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context);
  } else {
    var contexts = factory.contexts = [context];
    var sync = true;

    var forceRender = function () {
      for (var i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate();
      }
    };

    var resolve = once(function (res) {
      // cache resolved
      factory.resolved = ensureCtor(res, baseCtor);
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender();
      }
    });

    var reject = once(function (reason) {
      process.env.NODE_ENV !== 'production' && warn(
        "Failed to resolve async component: " + (String(factory)) +
        (reason ? ("\nReason: " + reason) : '')
      );
      if (isDef(factory.errorComp)) {
        factory.error = true;
        forceRender();
      }
    });

    var res = factory(resolve, reject);

    if (isObject(res)) {
      if (typeof res.then === 'function') {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject);
        }
      } else if (isDef(res.component) && typeof res.component.then === 'function') {
        res.component.then(resolve, reject);

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor);
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor);
          if (res.delay === 0) {
            factory.loading = true;
          } else {
            setTimeout(function () {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true;
                forceRender();
              }
            }, res.delay || 200);
          }
        }

        if (isDef(res.timeout)) {
          setTimeout(function () {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? ("timeout (" + (res.timeout) + "ms)")
                  : null
              );
            }
          }, res.timeout);
        }
      }
    }

    sync = false;
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}

/*  */

function isAsyncPlaceholder (node) {
  return node.isComment && node.asyncFactory
}

/*  */

function getFirstComponentChild (children) {
  if (Array.isArray(children)) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}

/*  */

/*  */

function initEvents (vm) {
  vm._events = Object.create(null);
  vm._hasHookEvent = false;
  // init parent attached events
  var listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}

var target;

function add (event, fn, once) {
  if (once) {
    target.$once(event, fn);
  } else {
    target.$on(event, fn);
  }
}

function remove$1 (event, fn) {
  target.$off(event, fn);
}

function updateComponentListeners (
  vm,
  listeners,
  oldListeners
) {
  target = vm;
  updateListeners(listeners, oldListeners || {}, add, remove$1, vm);
  target = undefined;
}

function eventsMixin (Vue) {
  var hookRE = /^hook:/;
  Vue.prototype.$on = function (event, fn) {
    var this$1 = this;

    var vm = this;
    if (Array.isArray(event)) {
      for (var i = 0, l = event.length; i < l; i++) {
        this$1.$on(event[i], fn);
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn);
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true;
      }
    }
    return vm
  };

  Vue.prototype.$once = function (event, fn) {
    var vm = this;
    function on () {
      vm.$off(event, on);
      fn.apply(vm, arguments);
    }
    on.fn = fn;
    vm.$on(event, on);
    return vm
  };

  Vue.prototype.$off = function (event, fn) {
    var this$1 = this;

    var vm = this;
    // all
    if (!arguments.length) {
      vm._events = Object.create(null);
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (var i = 0, l = event.length; i < l; i++) {
        this$1.$off(event[i], fn);
      }
      return vm
    }
    // specific event
    var cbs = vm._events[event];
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null;
      return vm
    }
    if (fn) {
      // specific handler
      var cb;
      var i$1 = cbs.length;
      while (i$1--) {
        cb = cbs[i$1];
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i$1, 1);
          break
        }
      }
    }
    return vm
  };

  Vue.prototype.$emit = function (event) {
    var vm = this;
    if (process.env.NODE_ENV !== 'production') {
      var lowerCaseEvent = event.toLowerCase();
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          "Event \"" + lowerCaseEvent + "\" is emitted in component " +
          (formatComponentName(vm)) + " but the handler is registered for \"" + event + "\". " +
          "Note that HTML attributes are case-insensitive and you cannot use " +
          "v-on to listen to camelCase events when using in-DOM templates. " +
          "You should probably use \"" + (hyphenate(event)) + "\" instead of \"" + event + "\"."
        );
      }
    }
    var cbs = vm._events[event];
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      var args = toArray(arguments, 1);
      for (var i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args);
        } catch (e) {
          handleError(e, vm, ("event handler for \"" + event + "\""));
        }
      }
    }
    return vm
  };
}

/*  */



/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
function resolveSlots (
  children,
  context
) {
  var slots = {};
  if (!children) {
    return slots
  }
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i];
    var data = child.data;
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot;
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      var name = data.slot;
      var slot = (slots[name] || (slots[name] = []));
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || []);
      } else {
        slot.push(child);
      }
    } else {
      (slots.default || (slots.default = [])).push(child);
    }
  }
  // ignore slots that contains only whitespace
  for (var name$1 in slots) {
    if (slots[name$1].every(isWhitespace)) {
      delete slots[name$1];
    }
  }
  return slots
}

function isWhitespace (node) {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}

function resolveScopedSlots (
  fns, // see flow/vnode
  res
) {
  res = res || {};
  for (var i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      resolveScopedSlots(fns[i], res);
    } else {
      res[fns[i].key] = fns[i].fn;
    }
  }
  return res
}

/*  */

var activeInstance = null;
var isUpdatingChildComponent = false;

function initLifecycle (vm) {
  var options = vm.$options;

  // locate first non-abstract parent
  var parent = options.parent;
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}

function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    var vm = this;
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate');
    }
    var prevEl = vm.$el;
    var prevVnode = vm._vnode;
    var prevActiveInstance = activeInstance;
    activeInstance = vm;
    vm._vnode = vnode;
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(
        vm.$el, vnode, hydrating, false /* removeOnly */,
        vm.$options._parentElm,
        vm.$options._refElm
      );
      // no need for the ref nodes after initial patch
      // this prevents keeping a detached DOM tree in memory (#5851)
      vm.$options._parentElm = vm.$options._refElm = null;
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    activeInstance = prevActiveInstance;
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null;
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm;
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el;
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  };

  Vue.prototype.$forceUpdate = function () {
    var vm = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function () {
    var vm = this;
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy');
    vm._isBeingDestroyed = true;
    // remove self from parent
    var parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    var i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--;
    }
    // call the last hook...
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, 'destroyed');
    // turn off all instance listeners.
    vm.$off();
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null;
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null;
    }
  };
}

function mountComponent (
  vm,
  el,
  hydrating
) {
  vm.$el = el;
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode;
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        );
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        );
      }
    }
  }
  callHook(vm, 'beforeMount');

  var updateComponent;
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = function () {
      var name = vm._name;
      var id = vm._uid;
      var startTag = "vue-perf-start:" + id;
      var endTag = "vue-perf-end:" + id;

      mark(startTag);
      var vnode = vm._render();
      mark(endTag);
      measure(("vue " + name + " render"), startTag, endTag);

      mark(startTag);
      vm._update(vnode, hydrating);
      mark(endTag);
      measure(("vue " + name + " patch"), startTag, endTag);
    };
  } else {
    updateComponent = function () {
      vm._update(vm._render(), hydrating);
    };
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop, null, true /* isRenderWatcher */);
  hydrating = false;

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true;
    callHook(vm, 'mounted');
  }
  return vm
}

function updateChildComponent (
  vm,
  propsData,
  listeners,
  parentVnode,
  renderChildren
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true;
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  var hasChildren = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  );

  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode;
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false);
    var props = vm._props;
    var propKeys = vm.$options._propKeys || [];
    for (var i = 0; i < propKeys.length; i++) {
      var key = propKeys[i];
      var propOptions = vm.$options.props; // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
    toggleObserving(true);
    // keep a copy of raw propsData
    vm.$options.propsData = propsData;
  }

  // update listeners
  listeners = listeners || emptyObject;
  var oldListeners = vm.$options._parentListeners;
  vm.$options._parentListeners = listeners;
  updateComponentListeners(vm, listeners, oldListeners);

  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false;
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) { return true }
  }
  return false
}

function activateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = false;
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false;
    for (var i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'activated');
  }
}

function deactivateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = true;
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    for (var i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'deactivated');
  }
}

function callHook (vm, hook) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget();
  var handlers = vm.$options[hook];
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      try {
        handlers[i].call(vm);
      } catch (e) {
        handleError(e, vm, (hook + " hook"));
      }
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook);
  }
  popTarget();
}

/*  */


var MAX_UPDATE_COUNT = 100;

var queue = [];
var activatedChildren = [];
var has = {};
var circular = {};
var waiting = false;
var flushing = false;
var index = 0;

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0;
  has = {};
  if (process.env.NODE_ENV !== 'production') {
    circular = {};
  }
  waiting = flushing = false;
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  flushing = true;
  var watcher, id;

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  queue.sort(function (a, b) { return a.id - b.id; });

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index];
    id = watcher.id;
    has[id] = null;
    watcher.run();
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1;
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? ("in watcher with expression \"" + (watcher.expression) + "\"")
              : "in a component render function."
          ),
          watcher.vm
        );
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  var activatedQueue = activatedChildren.slice();
  var updatedQueue = queue.slice();

  resetSchedulerState();

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue);
  callUpdatedHooks(updatedQueue);

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush');
  }
}

function callUpdatedHooks (queue) {
  var i = queue.length;
  while (i--) {
    var watcher = queue[i];
    var vm = watcher.vm;
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated');
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
function queueActivatedComponent (vm) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false;
  activatedChildren.push(vm);
}

function callActivatedHooks (queue) {
  for (var i = 0; i < queue.length; i++) {
    queue[i]._inactive = true;
    activateChildComponent(queue[i], true /* true */);
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
function queueWatcher (watcher) {
  var id = watcher.id;
  if (has[id] == null) {
    has[id] = true;
    if (!flushing) {
      queue.push(watcher);
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      var i = queue.length - 1;
      while (i > index && queue[i].id > watcher.id) {
        i--;
      }
      queue.splice(i + 1, 0, watcher);
    }
    // queue the flush
    if (!waiting) {
      waiting = true;
      nextTick(flushSchedulerQueue);
    }
  }
}

/*  */

var uid$1 = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
var Watcher = function Watcher (
  vm,
  expOrFn,
  cb,
  options,
  isRenderWatcher
) {
  this.vm = vm;
  if (isRenderWatcher) {
    vm._watcher = this;
  }
  vm._watchers.push(this);
  // options
  if (options) {
    this.deep = !!options.deep;
    this.user = !!options.user;
    this.lazy = !!options.lazy;
    this.sync = !!options.sync;
  } else {
    this.deep = this.user = this.lazy = this.sync = false;
  }
  this.cb = cb;
  this.id = ++uid$1; // uid for batching
  this.active = true;
  this.dirty = this.lazy; // for lazy watchers
  this.deps = [];
  this.newDeps = [];
  this.depIds = new _Set();
  this.newDepIds = new _Set();
  this.expression = process.env.NODE_ENV !== 'production'
    ? expOrFn.toString()
    : '';
  // parse expression for getter
  if (typeof expOrFn === 'function') {
    this.getter = expOrFn;
  } else {
    this.getter = parsePath(expOrFn);
    if (!this.getter) {
      this.getter = function () {};
      process.env.NODE_ENV !== 'production' && warn(
        "Failed watching path: \"" + expOrFn + "\" " +
        'Watcher only accepts simple dot-delimited paths. ' +
        'For full control, use a function instead.',
        vm
      );
    }
  }
  this.value = this.lazy
    ? undefined
    : this.get();
};

/**
 * Evaluate the getter, and re-collect dependencies.
 */
Watcher.prototype.get = function get () {
  pushTarget(this);
  var value;
  var vm = this.vm;
  try {
    value = this.getter.call(vm, vm);
  } catch (e) {
    if (this.user) {
      handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
    } else {
      throw e
    }
  } finally {
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    if (this.deep) {
      traverse(value);
    }
    popTarget();
    this.cleanupDeps();
  }
  return value
};

/**
 * Add a dependency to this directive.
 */
Watcher.prototype.addDep = function addDep (dep) {
  var id = dep.id;
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id);
    this.newDeps.push(dep);
    if (!this.depIds.has(id)) {
      dep.addSub(this);
    }
  }
};

/**
 * Clean up for dependency collection.
 */
Watcher.prototype.cleanupDeps = function cleanupDeps () {
    var this$1 = this;

  var i = this.deps.length;
  while (i--) {
    var dep = this$1.deps[i];
    if (!this$1.newDepIds.has(dep.id)) {
      dep.removeSub(this$1);
    }
  }
  var tmp = this.depIds;
  this.depIds = this.newDepIds;
  this.newDepIds = tmp;
  this.newDepIds.clear();
  tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps.length = 0;
};

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */
Watcher.prototype.update = function update () {
  /* istanbul ignore else */
  if (this.lazy) {
    this.dirty = true;
  } else if (this.sync) {
    this.run();
  } else {
    queueWatcher(this);
  }
};

/**
 * Scheduler job interface.
 * Will be called by the scheduler.
 */
Watcher.prototype.run = function run () {
  if (this.active) {
    var value = this.get();
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      var oldValue = this.value;
      this.value = value;
      if (this.user) {
        try {
          this.cb.call(this.vm, value, oldValue);
        } catch (e) {
          handleError(e, this.vm, ("callback for watcher \"" + (this.expression) + "\""));
        }
      } else {
        this.cb.call(this.vm, value, oldValue);
      }
    }
  }
};

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */
Watcher.prototype.evaluate = function evaluate () {
  this.value = this.get();
  this.dirty = false;
};

/**
 * Depend on all deps collected by this watcher.
 */
Watcher.prototype.depend = function depend () {
    var this$1 = this;

  var i = this.deps.length;
  while (i--) {
    this$1.deps[i].depend();
  }
};

/**
 * Remove self from all dependencies' subscriber list.
 */
Watcher.prototype.teardown = function teardown () {
    var this$1 = this;

  if (this.active) {
    // remove self from vm's watcher list
    // this is a somewhat expensive operation so we skip it
    // if the vm is being destroyed.
    if (!this.vm._isBeingDestroyed) {
      remove(this.vm._watchers, this);
    }
    var i = this.deps.length;
    while (i--) {
      this$1.deps[i].removeSub(this$1);
    }
    this.active = false;
  }
};

/*  */

var sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
};

function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  };
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function initState (vm) {
  vm._watchers = [];
  var opts = vm.$options;
  if (opts.props) { initProps(vm, opts.props); }
  if (opts.methods) { initMethods(vm, opts.methods); }
  if (opts.data) {
    initData(vm);
  } else {
    observe(vm._data = {}, true /* asRootData */);
  }
  if (opts.computed) { initComputed(vm, opts.computed); }
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}

function initProps (vm, propsOptions) {
  var propsData = vm.$options.propsData || {};
  var props = vm._props = {};
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  var keys = vm.$options._propKeys = [];
  var isRoot = !vm.$parent;
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false);
  }
  var loop = function ( key ) {
    keys.push(key);
    var value = validateProp(key, propsOptions, propsData, vm);
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      var hyphenatedKey = hyphenate(key);
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          ("\"" + hyphenatedKey + "\" is a reserved attribute and cannot be used as component prop."),
          vm
        );
      }
      defineReactive(props, key, value, function () {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            "Avoid mutating a prop directly since the value will be " +
            "overwritten whenever the parent component re-renders. " +
            "Instead, use a data or computed property based on the prop's " +
            "value. Prop being mutated: \"" + key + "\"",
            vm
          );
        }
      });
    } else {
      defineReactive(props, key, value);
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, "_props", key);
    }
  };

  for (var key in propsOptions) loop( key );
  toggleObserving(true);
}

function initData (vm) {
  var data = vm.$options.data;
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {};
  if (!isPlainObject(data)) {
    data = {};
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    );
  }
  // proxy data on instance
  var keys = Object.keys(data);
  var props = vm.$options.props;
  var methods = vm.$options.methods;
  var i = keys.length;
  while (i--) {
    var key = keys[i];
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          ("Method \"" + key + "\" has already been defined as a data property."),
          vm
        );
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        "The data property \"" + key + "\" is already declared as a prop. " +
        "Use prop default value instead.",
        vm
      );
    } else if (!isReserved(key)) {
      proxy(vm, "_data", key);
    }
  }
  // observe data
  observe(data, true /* asRootData */);
}

function getData (data, vm) {
  // #7573 disable dep collection when invoking data getters
  pushTarget();
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, "data()");
    return {}
  } finally {
    popTarget();
  }
}

var computedWatcherOptions = { lazy: true };

function initComputed (vm, computed) {
  // $flow-disable-line
  var watchers = vm._computedWatchers = Object.create(null);
  // computed properties are just getters during SSR
  var isSSR = isServerRendering();

  for (var key in computed) {
    var userDef = computed[key];
    var getter = typeof userDef === 'function' ? userDef : userDef.get;
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        ("Getter is missing for computed property \"" + key + "\"."),
        vm
      );
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      );
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(("The computed property \"" + key + "\" is already defined in data."), vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
      }
    }
  }
}

function defineComputed (
  target,
  key,
  userDef
) {
  var shouldCache = !isServerRendering();
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : userDef;
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop;
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop;
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        ("Computed property \"" + key + "\" was assigned to but it has no setter."),
        this
      );
    };
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter (key) {
  return function computedGetter () {
    var watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value
    }
  }
}

function initMethods (vm, methods) {
  var props = vm.$options.props;
  for (var key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          "Method \"" + key + "\" has an undefined value in the component definition. " +
          "Did you reference the function correctly?",
          vm
        );
      }
      if (props && hasOwn(props, key)) {
        warn(
          ("Method \"" + key + "\" has already been defined as a prop."),
          vm
        );
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          "Method \"" + key + "\" conflicts with an existing Vue instance method. " +
          "Avoid defining component methods that start with _ or $."
        );
      }
    }
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm);
  }
}

function initWatch (vm, watch) {
  for (var key in watch) {
    var handler = watch[key];
    if (Array.isArray(handler)) {
      for (var i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher (
  vm,
  expOrFn,
  handler,
  options
) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options)
}

function stateMixin (Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  var dataDef = {};
  dataDef.get = function () { return this._data };
  var propsDef = {};
  propsDef.get = function () { return this._props };
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      );
    };
    propsDef.set = function () {
      warn("$props is readonly.", this);
    };
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef);
  Object.defineProperty(Vue.prototype, '$props', propsDef);

  Vue.prototype.$set = set;
  Vue.prototype.$delete = del;

  Vue.prototype.$watch = function (
    expOrFn,
    cb,
    options
  ) {
    var vm = this;
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {};
    options.user = true;
    var watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
      cb.call(vm, watcher.value);
    }
    return function unwatchFn () {
      watcher.teardown();
    }
  };
}

/*  */

function initProvide (vm) {
  var provide = vm.$options.provide;
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide;
  }
}

function initInjections (vm) {
  var result = resolveInject(vm.$options.inject, vm);
  if (result) {
    toggleObserving(false);
    Object.keys(result).forEach(function (key) {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], function () {
          warn(
            "Avoid mutating an injected value directly since the changes will be " +
            "overwritten whenever the provided component re-renders. " +
            "injection being mutated: \"" + key + "\"",
            vm
          );
        });
      } else {
        defineReactive(vm, key, result[key]);
      }
    });
    toggleObserving(true);
  }
}

function resolveInject (inject, vm) {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    var result = Object.create(null);
    var keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(function (key) {
        /* istanbul ignore next */
        return Object.getOwnPropertyDescriptor(inject, key).enumerable
      })
      : Object.keys(inject);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var provideKey = inject[key].from;
      var source = vm;
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey];
          break
        }
        source = source.$parent;
      }
      if (!source) {
        if ('default' in inject[key]) {
          var provideDefault = inject[key].default;
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault;
        } else if (process.env.NODE_ENV !== 'production') {
          warn(("Injection \"" + key + "\" not found"), vm);
        }
      }
    }
    return result
  }
}

/*  */

/**
 * Runtime helper for rendering v-for lists.
 */
function renderList (
  val,
  render
) {
  var ret, i, l, keys, key;
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length);
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i);
    }
  } else if (typeof val === 'number') {
    ret = new Array(val);
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i);
    }
  } else if (isObject(val)) {
    keys = Object.keys(val);
    ret = new Array(keys.length);
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i];
      ret[i] = render(val[key], key, i);
    }
  }
  if (isDef(ret)) {
    (ret)._isVList = true;
  }
  return ret
}

/*  */

/**
 * Runtime helper for rendering <slot>
 */
function renderSlot (
  name,
  fallback,
  props,
  bindObject
) {
  var scopedSlotFn = this.$scopedSlots[name];
  var nodes;
  if (scopedSlotFn) { // scoped slot
    props = props || {};
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        );
      }
      props = extend(extend({}, bindObject), props);
    }
    nodes = scopedSlotFn(props) || fallback;
  } else {
    var slotNodes = this.$slots[name];
    // warn duplicate slot usage
    if (slotNodes) {
      if (process.env.NODE_ENV !== 'production' && slotNodes._rendered) {
        warn(
          "Duplicate presence of slot \"" + name + "\" found in the same render tree " +
          "- this will likely cause render errors.",
          this
        );
      }
      slotNodes._rendered = true;
    }
    nodes = slotNodes || fallback;
  }

  var target = props && props.slot;
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}

/*  */

/**
 * Runtime helper for resolving filters
 */
function resolveFilter (id) {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}

/*  */

function isKeyNotMatch (expect, actual) {
  if (Array.isArray(expect)) {
    return expect.indexOf(actual) === -1
  } else {
    return expect !== actual
  }
}

/**
 * Runtime helper for checking keyCodes from config.
 * exposed as Vue.prototype._k
 * passing in eventKeyName as last argument separately for backwards compat
 */
function checkKeyCodes (
  eventKeyCode,
  key,
  builtInKeyCode,
  eventKeyName,
  builtInKeyName
) {
  var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
  if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}

/*  */

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */
function bindObjectProps (
  data,
  tag,
  value,
  asProp,
  isSync
) {
  if (value) {
    if (!isObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
        'v-bind without argument expects an Object or Array value',
        this
      );
    } else {
      if (Array.isArray(value)) {
        value = toObject(value);
      }
      var hash;
      var loop = function ( key ) {
        if (
          key === 'class' ||
          key === 'style' ||
          isReservedAttribute(key)
        ) {
          hash = data;
        } else {
          var type = data.attrs && data.attrs.type;
          hash = asProp || config.mustUseProp(tag, type, key)
            ? data.domProps || (data.domProps = {})
            : data.attrs || (data.attrs = {});
        }
        if (!(key in hash)) {
          hash[key] = value[key];

          if (isSync) {
            var on = data.on || (data.on = {});
            on[("update:" + key)] = function ($event) {
              value[key] = $event;
            };
          }
        }
      };

      for (var key in value) loop( key );
    }
  }
  return data
}

/*  */

/**
 * Runtime helper for rendering static trees.
 */
function renderStatic (
  index,
  isInFor
) {
  var cached = this._staticTrees || (this._staticTrees = []);
  var tree = cached[index];
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  if (tree && !isInFor) {
    return tree
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  );
  markStatic(tree, ("__static__" + index), false);
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */
function markOnce (
  tree,
  index,
  key
) {
  markStatic(tree, ("__once__" + index + (key ? ("_" + key) : "")), true);
  return tree
}

function markStatic (
  tree,
  key,
  isOnce
) {
  if (Array.isArray(tree)) {
    for (var i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], (key + "_" + i), isOnce);
      }
    }
  } else {
    markStaticNode(tree, key, isOnce);
  }
}

function markStaticNode (node, key, isOnce) {
  node.isStatic = true;
  node.key = key;
  node.isOnce = isOnce;
}

/*  */

function bindObjectListeners (data, value) {
  if (value) {
    if (!isPlainObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
        'v-on without argument expects an Object value',
        this
      );
    } else {
      var on = data.on = data.on ? extend({}, data.on) : {};
      for (var key in value) {
        var existing = on[key];
        var ours = value[key];
        on[key] = existing ? [].concat(existing, ours) : ours;
      }
    }
  }
  return data
}

/*  */

function installRenderHelpers (target) {
  target._o = markOnce;
  target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  target._t = renderSlot;
  target._q = looseEqual;
  target._i = looseIndexOf;
  target._m = renderStatic;
  target._f = resolveFilter;
  target._k = checkKeyCodes;
  target._b = bindObjectProps;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  target._u = resolveScopedSlots;
  target._g = bindObjectListeners;
}

/*  */

function FunctionalRenderContext (
  data,
  props,
  children,
  parent,
  Ctor
) {
  var options = Ctor.options;
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  var contextVm;
  if (hasOwn(parent, '_uid')) {
    contextVm = Object.create(parent);
    // $flow-disable-line
    contextVm._original = parent;
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    contextVm = parent;
    // $flow-disable-line
    parent = parent._original;
  }
  var isCompiled = isTrue(options._compiled);
  var needNormalization = !isCompiled;

  this.data = data;
  this.props = props;
  this.children = children;
  this.parent = parent;
  this.listeners = data.on || emptyObject;
  this.injections = resolveInject(options.inject, parent);
  this.slots = function () { return resolveSlots(children, parent); };

  // support for compiled functional template
  if (isCompiled) {
    // exposing $options for renderStatic()
    this.$options = options;
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots();
    this.$scopedSlots = data.scopedSlots || emptyObject;
  }

  if (options._scopeId) {
    this._c = function (a, b, c, d) {
      var vnode = createElement(contextVm, a, b, c, d, needNormalization);
      if (vnode && !Array.isArray(vnode)) {
        vnode.fnScopeId = options._scopeId;
        vnode.fnContext = parent;
      }
      return vnode
    };
  } else {
    this._c = function (a, b, c, d) { return createElement(contextVm, a, b, c, d, needNormalization); };
  }
}

installRenderHelpers(FunctionalRenderContext.prototype);

function createFunctionalComponent (
  Ctor,
  propsData,
  data,
  contextVm,
  children
) {
  var options = Ctor.options;
  var props = {};
  var propOptions = options.props;
  if (isDef(propOptions)) {
    for (var key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject);
    }
  } else {
    if (isDef(data.attrs)) { mergeProps(props, data.attrs); }
    if (isDef(data.props)) { mergeProps(props, data.props); }
  }

  var renderContext = new FunctionalRenderContext(
    data,
    props,
    children,
    contextVm,
    Ctor
  );

  var vnode = options.render.call(null, renderContext._c, renderContext);

  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options)
  } else if (Array.isArray(vnode)) {
    var vnodes = normalizeChildren(vnode) || [];
    var res = new Array(vnodes.length);
    for (var i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options);
    }
    return res
  }
}

function cloneAndMarkFunctionalResult (vnode, data, contextVm, options) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  var clone = cloneVNode(vnode);
  clone.fnContext = contextVm;
  clone.fnOptions = options;
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot;
  }
  return clone
}

function mergeProps (to, from) {
  for (var key in from) {
    to[camelize(key)] = from[key];
  }
}

/*  */




// Register the component hook to weex native render engine.
// The hook will be triggered by native, not javascript.


// Updates the state of the component to weex native render engine.

/*  */

// https://github.com/Hanks10100/weex-native-directive/tree/master/component

// listening on native callback

/*  */

/*  */

// inline hooks to be invoked on component VNodes during patch
var componentVNodeHooks = {
  init: function init (
    vnode,
    hydrating,
    parentElm,
    refElm
  ) {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      var mountedNode = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      var child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance,
        parentElm,
        refElm
      );
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },

  prepatch: function prepatch (oldVnode, vnode) {
    var options = vnode.componentOptions;
    var child = vnode.componentInstance = oldVnode.componentInstance;
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    );
  },

  insert: function insert (vnode) {
    var context = vnode.context;
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true;
      callHook(componentInstance, 'mounted');
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance);
      } else {
        activateChildComponent(componentInstance, true /* direct */);
      }
    }
  },

  destroy: function destroy (vnode) {
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy();
      } else {
        deactivateChildComponent(componentInstance, true /* direct */);
      }
    }
  }
};

var hooksToMerge = Object.keys(componentVNodeHooks);

function createComponent (
  Ctor,
  data,
  context,
  children,
  tag
) {
  if (isUndef(Ctor)) {
    return
  }

  var baseCtor = context.$options._base;

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(("Invalid Component definition: " + (String(Ctor))), context);
    }
    return
  }

  // async component
  var asyncFactory;
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor;
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context);
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {};

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor);

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data);
  }

  // extract props
  var propsData = extractPropsFromVNodeData(data, Ctor, tag);

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  var listeners = data.on;
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn;

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    var slot = data.slot;
    data = {};
    if (slot) {
      data.slot = slot;
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data);

  // return a placeholder vnode
  var name = Ctor.options.name || tag;
  var vnode = new VNode(
    ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
    data, undefined, undefined, undefined, context,
    { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
    asyncFactory
  );

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  return vnode
}

function createComponentInstanceForVnode (
  vnode, // we know it's MountedComponentVNode but flow doesn't
  parent, // activeInstance in lifecycle state
  parentElm,
  refElm
) {
  var options = {
    _isComponent: true,
    parent: parent,
    _parentVnode: vnode,
    _parentElm: parentElm || null,
    _refElm: refElm || null
  };
  // check inline-template render functions
  var inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render;
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  return new vnode.componentOptions.Ctor(options)
}

function installComponentHooks (data) {
  var hooks = data.hook || (data.hook = {});
  for (var i = 0; i < hooksToMerge.length; i++) {
    var key = hooksToMerge[i];
    hooks[key] = componentVNodeHooks[key];
  }
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data) {
  var prop = (options.model && options.model.prop) || 'value';
  var event = (options.model && options.model.event) || 'input';(data.props || (data.props = {}))[prop] = data.model.value;
  var on = data.on || (data.on = {});
  if (isDef(on[event])) {
    on[event] = [data.model.callback].concat(on[event]);
  } else {
    on[event] = data.model.callback;
  }
}

/*  */

var SIMPLE_NORMALIZE = 1;
var ALWAYS_NORMALIZE = 2;

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
function createElement (
  context,
  tag,
  data,
  children,
  normalizationType,
  alwaysNormalize
) {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children;
    children = data;
    data = undefined;
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE;
  }
  return _createElement(context, tag, data, children, normalizationType)
}

function _createElement (
  context,
  tag,
  data,
  children,
  normalizationType
) {
  if (isDef(data) && isDef((data).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      "Avoid using observed data object as vnode data: " + (JSON.stringify(data)) + "\n" +
      'Always create fresh vnode data objects in each render!',
      context
    );
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is;
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      );
    }
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {};
    data.scopedSlots = { default: children[0] };
    children.length = 0;
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children);
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children);
  }
  var vnode, ns;
  if (typeof tag === 'string') {
    var Ctor;
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      );
    } else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag);
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      );
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children);
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) { applyNS(vnode, ns); }
    if (isDef(data)) { registerDeepBindings(data); }
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns;
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined;
    force = true;
  }
  if (isDef(vnode.children)) {
    for (var i = 0, l = vnode.children.length; i < l; i++) {
      var child = vnode.children[i];
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force);
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style);
  }
  if (isObject(data.class)) {
    traverse(data.class);
  }
}

/*  */

function initRender (vm) {
  vm._vnode = null; // the root of the child tree
  vm._staticTrees = null; // v-once cached trees
  var options = vm.$options;
  var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
  var renderContext = parentVnode && parentVnode.context;
  vm.$slots = resolveSlots(options._renderChildren, renderContext);
  vm.$scopedSlots = emptyObject;
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
  // normalization is always applied for the public version, used in
  // user-written render functions.
  vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  var parentData = parentVnode && parentVnode.data;

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, function () {
      !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
    }, true);
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, function () {
      !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
    }, true);
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true);
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true);
  }
}

function renderMixin (Vue) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype);

  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
  };

  Vue.prototype._render = function () {
    var vm = this;
    var ref = vm.$options;
    var render = ref.render;
    var _parentVnode = ref._parentVnode;

    // reset _rendered flag on slots for duplicate slot check
    if (process.env.NODE_ENV !== 'production') {
      for (var key in vm.$slots) {
        // $flow-disable-line
        vm.$slots[key]._rendered = false;
      }
    }

    if (_parentVnode) {
      vm.$scopedSlots = _parentVnode.data.scopedSlots || emptyObject;
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode;
    // render self
    var vnode;
    try {
      vnode = render.call(vm._renderProxy, vm.$createElement);
    } catch (e) {
      handleError(e, vm, "render");
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        if (vm.$options.renderError) {
          try {
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
          } catch (e) {
            handleError(e, vm, "renderError");
            vnode = vm._vnode;
          }
        } else {
          vnode = vm._vnode;
        }
      } else {
        vnode = vm._vnode;
      }
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        );
      }
      vnode = createEmptyVNode();
    }
    // set parent
    vnode.parent = _parentVnode;
    return vnode
  };
}

/*  */

var uid$3 = 0;

function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    var vm = this;
    // a uid
    vm._uid = uid$3++;

    var startTag, endTag;
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = "vue-perf-start:" + (vm._uid);
      endTag = "vue-perf-end:" + (vm._uid);
      mark(startTag);
    }

    // a flag to avoid this being observed
    vm._isVue = true;
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options);
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm);
    } else {
      vm._renderProxy = vm;
    }
    // expose real self
    vm._self = vm;
    initLifecycle(vm);
    initEvents(vm);
    initRender(vm);
    callHook(vm, 'beforeCreate');
    initInjections(vm); // resolve injections before data/props
    initState(vm);
    initProvide(vm); // resolve provide after data/props
    callHook(vm, 'created');

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(("vue " + (vm._name) + " init"), startTag, endTag);
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

function initInternalComponent (vm, options) {
  var opts = vm.$options = Object.create(vm.constructor.options);
  // doing this because it's faster than dynamic enumeration.
  var parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;
  opts._parentElm = options._parentElm;
  opts._refElm = options._refElm;

  var vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

function resolveConstructorOptions (Ctor) {
  var options = Ctor.options;
  if (Ctor.super) {
    var superOptions = resolveConstructorOptions(Ctor.super);
    var cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      var modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor) {
  var modified;
  var latest = Ctor.options;
  var extended = Ctor.extendOptions;
  var sealed = Ctor.sealedOptions;
  for (var key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) { modified = {}; }
      modified[key] = dedupe(latest[key], extended[key], sealed[key]);
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    var res = [];
    sealed = Array.isArray(sealed) ? sealed : [sealed];
    extended = Array.isArray(extended) ? extended : [extended];
    for (var i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i]);
      }
    }
    return res
  } else {
    return latest
  }
}

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);
}

initMixin(Vue);
stateMixin(Vue);
eventsMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

/*  */

function initUse (Vue) {
  Vue.use = function (plugin) {
    var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    var args = toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args);
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);
    return this
  };
}

/*  */

function initMixin$1 (Vue) {
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this
  };
}

/*  */

function initExtend (Vue) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0;
  var cid = 1;

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {};
    var Super = this;
    var SuperId = Super.cid;
    var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    var name = extendOptions.name || Super.options.name;
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name);
    }

    var Sub = function VueComponent (options) {
      this._init(options);
    };
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    );
    Sub['super'] = Super;

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps$1(Sub);
    }
    if (Sub.options.computed) {
      initComputed$1(Sub);
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type];
    });
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options;
    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = extend({}, Sub.options);

    // cache constructor
    cachedCtors[SuperId] = Sub;
    return Sub
  };
}

function initProps$1 (Comp) {
  var props = Comp.options.props;
  for (var key in props) {
    proxy(Comp.prototype, "_props", key);
  }
}

function initComputed$1 (Comp) {
  var computed = Comp.options.computed;
  for (var key in computed) {
    defineComputed(Comp.prototype, key, computed[key]);
  }
}

/*  */

function initAssetRegisters (Vue) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(function (type) {
    Vue[type] = function (
      id,
      definition
    ) {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id);
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id;
          definition = this.options._base.extend(definition);
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition };
        }
        this.options[type + 's'][id] = definition;
        return definition
      }
    };
  });
}

/*  */

function getComponentName (opts) {
  return opts && (opts.Ctor.options.name || opts.tag)
}

function matches (pattern, name) {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance, filter) {
  var cache = keepAliveInstance.cache;
  var keys = keepAliveInstance.keys;
  var _vnode = keepAliveInstance._vnode;
  for (var key in cache) {
    var cachedNode = cache[key];
    if (cachedNode) {
      var name = getComponentName(cachedNode.componentOptions);
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode);
      }
    }
  }
}

function pruneCacheEntry (
  cache,
  key,
  keys,
  current
) {
  var cached$$1 = cache[key];
  if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
    cached$$1.componentInstance.$destroy();
  }
  cache[key] = null;
  remove(keys, key);
}

var patternTypes = [String, RegExp, Array];

var KeepAlive = {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created: function created () {
    this.cache = Object.create(null);
    this.keys = [];
  },

  destroyed: function destroyed () {
    var this$1 = this;

    for (var key in this$1.cache) {
      pruneCacheEntry(this$1.cache, key, this$1.keys);
    }
  },

  mounted: function mounted () {
    var this$1 = this;

    this.$watch('include', function (val) {
      pruneCache(this$1, function (name) { return matches(val, name); });
    });
    this.$watch('exclude', function (val) {
      pruneCache(this$1, function (name) { return !matches(val, name); });
    });
  },

  render: function render () {
    var slot = this.$slots.default;
    var vnode = getFirstComponentChild(slot);
    var componentOptions = vnode && vnode.componentOptions;
    if (componentOptions) {
      // check pattern
      var name = getComponentName(componentOptions);
      var ref = this;
      var include = ref.include;
      var exclude = ref.exclude;
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      var ref$1 = this;
      var cache = ref$1.cache;
      var keys = ref$1.keys;
      var key = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
        : vnode.key;
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance;
        // make current key freshest
        remove(keys, key);
        keys.push(key);
      } else {
        cache[key] = vnode;
        keys.push(key);
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode);
        }
      }

      vnode.data.keepAlive = true;
    }
    return vnode || (slot && slot[0])
  }
}

var builtInComponents = {
  KeepAlive: KeepAlive
}

/*  */

function initGlobalAPI (Vue) {
  // config
  var configDef = {};
  configDef.get = function () { return config; };
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = function () {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      );
    };
  }
  Object.defineProperty(Vue, 'config', configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn: warn,
    extend: extend,
    mergeOptions: mergeOptions,
    defineReactive: defineReactive
  };

  Vue.set = set;
  Vue.delete = del;
  Vue.nextTick = nextTick;

  Vue.options = Object.create(null);
  ASSET_TYPES.forEach(function (type) {
    Vue.options[type + 's'] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue;

  extend(Vue.options.components, builtInComponents);

  initUse(Vue);
  initMixin$1(Vue);
  initExtend(Vue);
  initAssetRegisters(Vue);
}

initGlobalAPI(Vue);

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
});

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get: function get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
});

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
});

Vue.version = '2.5.17';

/*  */

// these are reserved for web because they are directly compiled away
// during template compilation
var isReservedAttr = makeMap('style,class');

// attributes that should be using props for binding
var acceptValue = makeMap('input,textarea,option,select,progress');
var mustUseProp = function (tag, type, attr) {
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
};

var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

var isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible'
);

var xlinkNS = 'http://www.w3.org/1999/xlink';

var isXlink = function (name) {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
};

var getXlinkProp = function (name) {
  return isXlink(name) ? name.slice(6, name.length) : ''
};

var isFalsyAttrValue = function (val) {
  return val == null || val === false
};

/*  */

function genClassForVnode (vnode) {
  var data = vnode.data;
  var parentNode = vnode;
  var childNode = vnode;
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode;
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data);
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data);
    }
  }
  return renderClass(data.staticClass, data.class)
}

function mergeClassData (child, parent) {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}

function renderClass (
  staticClass,
  dynamicClass
) {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

function concat (a, b) {
  return a ? b ? (a + ' ' + b) : a : (b || '')
}

function stringifyClass (value) {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  return ''
}

function stringifyArray (value) {
  var res = '';
  var stringified;
  for (var i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) { res += ' '; }
      res += stringified;
    }
  }
  return res
}

function stringifyObject (value) {
  var res = '';
  for (var key in value) {
    if (value[key]) {
      if (res) { res += ' '; }
      res += key;
    }
  }
  return res
}

/*  */

var namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
};

var isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
var isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
);



var isReservedTag = function (tag) {
  return isHTMLTag(tag) || isSVG(tag)
};

function getTagNamespace (tag) {
  if (isSVG(tag)) {
    return 'svg'
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math'
  }
}

var unknownElementCache = Object.create(null);
function isUnknownElement (tag) {
  /* istanbul ignore if */
  if (!inBrowser) {
    return true
  }
  if (isReservedTag(tag)) {
    return false
  }
  tag = tag.toLowerCase();
  /* istanbul ignore if */
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag]
  }
  var el = document.createElement(tag);
  if (tag.indexOf('-') > -1) {
    // http://stackoverflow.com/a/28210364/1070244
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement
    ))
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

var isTextInputType = makeMap('text,number,password,search,email,tel,url');

/*  */

/**
 * Query an element selector if it's not an element already.
 */
function query (el) {
  if (typeof el === 'string') {
    var selected = document.querySelector(el);
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      );
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}

/*  */

function createElement$1 (tagName, vnode) {
  var elm = document.createElement(tagName);
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple');
  }
  return elm
}

function createElementNS (namespace, tagName) {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

function createTextNode (text) {
  return document.createTextNode(text)
}

function createComment (text) {
  return document.createComment(text)
}

function insertBefore (parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode);
}

function removeChild (node, child) {
  node.removeChild(child);
}

function appendChild (node, child) {
  node.appendChild(child);
}

function parentNode (node) {
  return node.parentNode
}

function nextSibling (node) {
  return node.nextSibling
}

function tagName (node) {
  return node.tagName
}

function setTextContent (node, text) {
  node.textContent = text;
}

function setStyleScope (node, scopeId) {
  node.setAttribute(scopeId, '');
}


var nodeOps = Object.freeze({
	createElement: createElement$1,
	createElementNS: createElementNS,
	createTextNode: createTextNode,
	createComment: createComment,
	insertBefore: insertBefore,
	removeChild: removeChild,
	appendChild: appendChild,
	parentNode: parentNode,
	nextSibling: nextSibling,
	tagName: tagName,
	setTextContent: setTextContent,
	setStyleScope: setStyleScope
});

/*  */

var ref = {
  create: function create (_, vnode) {
    registerRef(vnode);
  },
  update: function update (oldVnode, vnode) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true);
      registerRef(vnode);
    }
  },
  destroy: function destroy (vnode) {
    registerRef(vnode, true);
  }
}

function registerRef (vnode, isRemoval) {
  var key = vnode.data.ref;
  if (!isDef(key)) { return }

  var vm = vnode.context;
  var ref = vnode.componentInstance || vnode.elm;
  var refs = vm.$refs;
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref);
    } else if (refs[key] === ref) {
      refs[key] = undefined;
    }
  } else {
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref];
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref);
      }
    } else {
      refs[key] = ref;
    }
  }
}

/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

var emptyNode = new VNode('', {}, []);

var hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

function sameVnode (a, b) {
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') { return true }
  var i;
  var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
  var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  var i, key;
  var map = {};
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) { map[key] = i; }
  }
  return map
}

function createPatchFunction (backend) {
  var i, j;
  var cbs = {};

  var modules = backend.modules;
  var nodeOps = backend.nodeOps;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]]);
      }
    }
  }

  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm);
      }
    }
    remove.listeners = listeners;
    return remove
  }

  function removeNode (el) {
    var parent = nodeOps.parentNode(el);
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }

  function isUnknownElement$$1 (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(function (ignore) {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  var creatingElmInVPre = 0;

  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    vnode.isRootInsert = !nested; // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    var data = vnode.data;
    var children = vnode.children;
    var tag = vnode.tag;
    if (isDef(tag)) {
      if (process.env.NODE_ENV !== 'production') {
        if (data && data.pre) {
          creatingElmInVPre++;
        }
        if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          );
        }
      }

      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode);
      setScope(vnode);

      /* istanbul ignore if */
      {
        createChildren(vnode, children, insertedVnodeQueue);
        if (isDef(data)) {
          invokeCreateHooks(vnode, insertedVnodeQueue);
        }
        insert(parentElm, vnode.elm, refElm);
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--;
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    }
  }

  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i = vnode.data;
    if (isDef(i)) {
      var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */, parentElm, refElm);
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true
      }
    }
  }

  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
      vnode.data.pendingInsert = null;
    }
    vnode.elm = vnode.componentInstance.$el;
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue);
      setScope(vnode);
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode);
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode);
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i;
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    var innerNode = vnode;
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode;
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode);
        }
        insertedVnodeQueue.push(innerNode);
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm);
  }

  function insert (parent, elm, ref$$1) {
    if (isDef(parent)) {
      if (isDef(ref$$1)) {
        if (ref$$1.parentNode === parent) {
          nodeOps.insertBefore(parent, elm, ref$$1);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(children);
      }
      for (var i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
    }
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode;
    }
    return isDef(vnode.tag)
  }

  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
      cbs.create[i$1](emptyNode, vnode);
    }
    i = vnode.data.hook; // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) { i.create(emptyNode, vnode); }
      if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  function setScope (vnode) {
    var i;
    if (isDef(i = vnode.fnScopeId)) {
      nodeOps.setStyleScope(vnode.elm, i);
    } else {
      var ancestor = vnode;
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i);
        }
        ancestor = ancestor.parent;
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i);
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
    }
  }

  function invokeDestroyHook (vnode) {
    var i, j;
    var data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) { i(vnode); }
      for (i = 0; i < cbs.destroy.length; ++i) { cbs.destroy[i](vnode); }
    }
    if (isDef(i = vnode.children)) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j]);
      }
    }
  }

  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch);
          invokeDestroyHook(ch);
        } else { // Text node
          removeNode(ch.elm);
        }
      }
    }
  }

  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      var i;
      var listeners = cbs.remove.length + 1;
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners;
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners);
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm);
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm);
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm);
      } else {
        rm();
      }
    } else {
      removeNode(vnode.elm);
    }
  }

  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    var oldStartIdx = 0;
    var newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    var canMove = !removeOnly;

    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(newCh);
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
        } else {
          vnodeToMove = oldCh[idxInOld];
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue);
            oldCh[idxInOld] = undefined;
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          }
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function checkDuplicateKeys (children) {
    var seenKeys = {};
    for (var i = 0; i < children.length; i++) {
      var vnode = children[i];
      var key = vnode.key;
      if (isDef(key)) {
        if (seenKeys[key]) {
          warn(
            ("Duplicate keys detected: '" + key + "'. This may cause an update error."),
            vnode.context
          );
        } else {
          seenKeys[key] = true;
        }
      }
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (var i = start; i < end; i++) {
      var c = oldCh[i];
      if (isDef(c) && sameVnode(node, c)) { return i }
    }
  }

  function patchVnode (oldVnode, vnode, insertedVnodeQueue, removeOnly) {
    if (oldVnode === vnode) {
      return
    }

    var elm = vnode.elm = oldVnode.elm;

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
      } else {
        vnode.isAsyncPlaceholder = true;
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance;
      return
    }

    var i;
    var data = vnode.data;
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode);
    }

    var oldCh = oldVnode.children;
    var ch = vnode.children;
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
      if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text);
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
    }
  }

  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue;
    } else {
      for (var i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i]);
      }
    }
  }

  var hydrationBailed = false;
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    var i;
    var tag = vnode.tag;
    var data = vnode.data;
    var children = vnode.children;
    inVPre = inVPre || (data && data.pre);
    vnode.elm = elm;

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true;
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) { i(vnode, true /* hydrating */); }
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue);
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue);
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn('server innerHTML: ', i);
                console.warn('client innerHTML: ', elm.innerHTML);
              }
              return false
            }
          } else {
            // iterate and compare children lists
            var childrenMatch = true;
            var childNode = elm.firstChild;
            for (var i$1 = 0; i$1 < children.length; i$1++) {
              if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                childrenMatch = false;
                break
              }
              childNode = childNode.nextSibling;
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children);
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        var fullInvoke = false;
        for (var key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true;
            invokeCreateHooks(vnode, insertedVnodeQueue);
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class']);
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text;
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement$$1(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  return function patch (oldVnode, vnode, hydrating, removeOnly, parentElm, refElm) {
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) { invokeDestroyHook(oldVnode); }
      return
    }

    var isInitialPatch = false;
    var insertedVnodeQueue = [];

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true;
      createElm(vnode, insertedVnodeQueue, parentElm, refElm);
    } else {
      var isRealElement = isDef(oldVnode.nodeType);
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly);
      } else {
        if (isRealElement) {
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR);
            hydrating = true;
          }
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true);
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              );
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode);
        }

        // replacing existing element
        var oldElm = oldVnode.elm;
        var parentElm$1 = nodeOps.parentNode(oldElm);

        // create new node
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm$1,
          nodeOps.nextSibling(oldElm)
        );

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          var ancestor = vnode.parent;
          var patchable = isPatchable(vnode);
          while (ancestor) {
            for (var i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor);
            }
            ancestor.elm = vnode.elm;
            if (patchable) {
              for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                cbs.create[i$1](emptyNode, ancestor);
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              var insert = ancestor.data.hook.insert;
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                  insert.fns[i$2]();
                }
              }
            } else {
              registerRef(ancestor);
            }
            ancestor = ancestor.parent;
          }
        }

        // destroy old node
        if (isDef(parentElm$1)) {
          removeVnodes(parentElm$1, [oldVnode], 0, 0);
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode);
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
    return vnode.elm
  }
}

/*  */

var directives = {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode) {
    updateDirectives(vnode, emptyNode);
  }
}

function updateDirectives (oldVnode, vnode) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode);
  }
}

function _update (oldVnode, vnode) {
  var isCreate = oldVnode === emptyNode;
  var isDestroy = vnode === emptyNode;
  var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
  var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);

  var dirsWithInsert = [];
  var dirsWithPostpatch = [];

  var key, oldDir, dir;
  for (key in newDirs) {
    oldDir = oldDirs[key];
    dir = newDirs[key];
    if (!oldDir) {
      // new directive, bind
      callHook$1(dir, 'bind', vnode, oldVnode);
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir);
      }
    } else {
      // existing directive, update
      dir.oldValue = oldDir.value;
      callHook$1(dir, 'update', vnode, oldVnode);
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir);
      }
    }
  }

  if (dirsWithInsert.length) {
    var callInsert = function () {
      for (var i = 0; i < dirsWithInsert.length; i++) {
        callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode);
      }
    };
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert);
    } else {
      callInsert();
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', function () {
      for (var i = 0; i < dirsWithPostpatch.length; i++) {
        callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
      }
    });
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
      }
    }
  }
}

var emptyModifiers = Object.create(null);

function normalizeDirectives$1 (
  dirs,
  vm
) {
  var res = Object.create(null);
  if (!dirs) {
    // $flow-disable-line
    return res
  }
  var i, dir;
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i];
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers;
    }
    res[getRawDirName(dir)] = dir;
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true);
  }
  // $flow-disable-line
  return res
}

function getRawDirName (dir) {
  return dir.rawName || ((dir.name) + "." + (Object.keys(dir.modifiers || {}).join('.')))
}

function callHook$1 (dir, hook, vnode, oldVnode, isDestroy) {
  var fn = dir.def && dir.def[hook];
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
    } catch (e) {
      handleError(e, vnode.context, ("directive " + (dir.name) + " " + hook + " hook"));
    }
  }
}

var baseModules = [
  ref,
  directives
]

/*  */

function updateAttrs (oldVnode, vnode) {
  var opts = vnode.componentOptions;
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return
  }
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return
  }
  var key, cur, old;
  var elm = vnode.elm;
  var oldAttrs = oldVnode.data.attrs || {};
  var attrs = vnode.data.attrs || {};
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(attrs.__ob__)) {
    attrs = vnode.data.attrs = extend({}, attrs);
  }

  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      setAttr(elm, key, cur);
    }
  }
  // #4391: in IE9, setting type can reset value for input[type=radio]
  // #6666: IE/Edge forces progress value down to 1 before setting a max
  /* istanbul ignore if */
  if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value);
  }
  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key);
      }
    }
  }
}

function setAttr (el, key, value) {
  if (el.tagName.indexOf('-') > -1) {
    baseSetAttr(el, key, value);
  } else if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag
      value = key === 'allowfullscreen' && el.tagName === 'EMBED'
        ? 'true'
        : key;
      el.setAttribute(key, value);
    }
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, isFalsyAttrValue(value) || value === 'false' ? 'false' : 'true');
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    baseSetAttr(el, key, value);
  }
}

function baseSetAttr (el, key, value) {
  if (isFalsyAttrValue(value)) {
    el.removeAttribute(key);
  } else {
    // #7138: IE10 & 11 fires input event when setting placeholder on
    // <textarea>... block the first input event and remove the blocker
    // immediately.
    /* istanbul ignore if */
    if (
      isIE && !isIE9 &&
      el.tagName === 'TEXTAREA' &&
      key === 'placeholder' && !el.__ieph
    ) {
      var blocker = function (e) {
        e.stopImmediatePropagation();
        el.removeEventListener('input', blocker);
      };
      el.addEventListener('input', blocker);
      // $flow-disable-line
      el.__ieph = true; /* IE placeholder patched */
    }
    el.setAttribute(key, value);
  }
}

var attrs = {
  create: updateAttrs,
  update: updateAttrs
}

/*  */

function updateClass (oldVnode, vnode) {
  var el = vnode.elm;
  var data = vnode.data;
  var oldData = oldVnode.data;
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass) &&
        isUndef(oldData.class)
      )
    )
  ) {
    return
  }

  var cls = genClassForVnode(vnode);

  // handle transition classes
  var transitionClass = el._transitionClasses;
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass));
  }

  // set the class
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls);
    el._prevClass = cls;
  }
}

var klass = {
  create: updateClass,
  update: updateClass
}

/*  */

/*  */









// add a raw attr (use this in preTransforms)








// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.

/*  */

/**
 * Cross-platform code generation for component v-model
 */


/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */

/*  */

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
var RANGE_TOKEN = '__r';
var CHECKBOX_RADIO_TOKEN = '__c';

/*  */

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    var event = isIE ? 'change' : 'input';
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || []);
    delete on[RANGE_TOKEN];
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
    delete on[CHECKBOX_RADIO_TOKEN];
  }
}

var target$1;

function createOnceHandler (handler, event, capture) {
  var _target = target$1; // save current target element in closure
  return function onceHandler () {
    var res = handler.apply(null, arguments);
    if (res !== null) {
      remove$2(event, onceHandler, capture, _target);
    }
  }
}

function add$1 (
  event,
  handler,
  once$$1,
  capture,
  passive
) {
  handler = withMacroTask(handler);
  if (once$$1) { handler = createOnceHandler(handler, event, capture); }
  target$1.addEventListener(
    event,
    handler,
    supportsPassive
      ? { capture: capture, passive: passive }
      : capture
  );
}

function remove$2 (
  event,
  handler,
  capture,
  _target
) {
  (_target || target$1).removeEventListener(
    event,
    handler._withTask || handler,
    capture
  );
}

function updateDOMListeners (oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  var on = vnode.data.on || {};
  var oldOn = oldVnode.data.on || {};
  target$1 = vnode.elm;
  normalizeEvents(on);
  updateListeners(on, oldOn, add$1, remove$2, vnode.context);
  target$1 = undefined;
}

var events = {
  create: updateDOMListeners,
  update: updateDOMListeners
}

/*  */

function updateDOMProps (oldVnode, vnode) {
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return
  }
  var key, cur;
  var elm = vnode.elm;
  var oldProps = oldVnode.data.domProps || {};
  var props = vnode.data.domProps || {};
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(props.__ob__)) {
    props = vnode.data.domProps = extend({}, props);
  }

  for (key in oldProps) {
    if (isUndef(props[key])) {
      elm[key] = '';
    }
  }
  for (key in props) {
    cur = props[key];
    // ignore children if the node has textContent or innerHTML,
    // as these will throw away existing DOM nodes and cause removal errors
    // on subsequent patches (#3360)
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) { vnode.children.length = 0; }
      if (cur === oldProps[key]) { continue }
      // #6601 work around Chrome version <= 55 bug where single textNode
      // replaced by innerHTML/textContent retains its parentNode property
      if (elm.childNodes.length === 1) {
        elm.removeChild(elm.childNodes[0]);
      }
    }

    if (key === 'value') {
      // store value as _value as well since
      // non-string values will be stringified
      elm._value = cur;
      // avoid resetting cursor position when value is the same
      var strCur = isUndef(cur) ? '' : String(cur);
      if (shouldUpdateValue(elm, strCur)) {
        elm.value = strCur;
      }
    } else {
      elm[key] = cur;
    }
  }
}

// check platforms/web/util/attrs.js acceptValue


function shouldUpdateValue (elm, checkVal) {
  return (!elm.composing && (
    elm.tagName === 'OPTION' ||
    isNotInFocusAndDirty(elm, checkVal) ||
    isDirtyWithModifiers(elm, checkVal)
  ))
}

function isNotInFocusAndDirty (elm, checkVal) {
  // return true when textbox (.number and .trim) loses focus and its value is
  // not equal to the updated value
  var notInFocus = true;
  // #6157
  // work around IE bug when accessing document.activeElement in an iframe
  try { notInFocus = document.activeElement !== elm; } catch (e) {}
  return notInFocus && elm.value !== checkVal
}

function isDirtyWithModifiers (elm, newVal) {
  var value = elm.value;
  var modifiers = elm._vModifiers; // injected by v-model runtime
  if (isDef(modifiers)) {
    if (modifiers.lazy) {
      // inputs with lazy should only be updated when not in focus
      return false
    }
    if (modifiers.number) {
      return toNumber(value) !== toNumber(newVal)
    }
    if (modifiers.trim) {
      return value.trim() !== newVal.trim()
    }
  }
  return value !== newVal
}

var domProps = {
  create: updateDOMProps,
  update: updateDOMProps
}

/*  */

var parseStyleText = cached(function (cssText) {
  var res = {};
  var listDelimiter = /;(?![^(]*\))/g;
  var propertyDelimiter = /:(.+)/;
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      var tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return res
});

// merge static and dynamic style data on the same vnode
function normalizeStyleData (data) {
  var style = normalizeStyleBinding(data.style);
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle
    ? extend(data.staticStyle, style)
    : style
}

// normalize possible array / string values into Object
function normalizeStyleBinding (bindingStyle) {
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle)
  }
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
function getStyle (vnode, checkChild) {
  var res = {};
  var styleData;

  if (checkChild) {
    var childNode = vnode;
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode;
      if (
        childNode && childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData);
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData);
  }

  var parentNode = vnode;
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData);
    }
  }
  return res
}

/*  */

var cssVarRE = /^--/;
var importantRE = /\s*!important$/;
var setProp = function (el, name, val) {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val);
  } else if (importantRE.test(val)) {
    el.style.setProperty(name, val.replace(importantRE, ''), 'important');
  } else {
    var normalizedName = normalize(name);
    if (Array.isArray(val)) {
      // Support values array created by autoprefixer, e.g.
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize
      for (var i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i];
      }
    } else {
      el.style[normalizedName] = val;
    }
  }
};

var vendorNames = ['Webkit', 'Moz', 'ms'];

var emptyStyle;
var normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement('div').style;
  prop = camelize(prop);
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop
  }
  var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  for (var i = 0; i < vendorNames.length; i++) {
    var name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name
    }
  }
});

function updateStyle (oldVnode, vnode) {
  var data = vnode.data;
  var oldData = oldVnode.data;

  if (isUndef(data.staticStyle) && isUndef(data.style) &&
    isUndef(oldData.staticStyle) && isUndef(oldData.style)
  ) {
    return
  }

  var cur, name;
  var el = vnode.elm;
  var oldStaticStyle = oldData.staticStyle;
  var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  var oldStyle = oldStaticStyle || oldStyleBinding;

  var style = normalizeStyleBinding(vnode.data.style) || {};

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likely wants
  // to mutate it.
  vnode.data.normalizedStyle = isDef(style.__ob__)
    ? extend({}, style)
    : style;

  var newStyle = getStyle(vnode, true);

  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '');
    }
  }
  for (name in newStyle) {
    cur = newStyle[name];
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      setProp(el, name, cur == null ? '' : cur);
    }
  }
}

var style = {
  create: updateStyle,
  update: updateStyle
}

/*  */

/**
 * Add class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */
function addClass (el, cls) {
  /* istanbul ignore if */
  if (!cls || !(cls = cls.trim())) {
    return
  }

  /* istanbul ignore else */
  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(/\s+/).forEach(function (c) { return el.classList.add(c); });
    } else {
      el.classList.add(cls);
    }
  } else {
    var cur = " " + (el.getAttribute('class') || '') + " ";
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      el.setAttribute('class', (cur + cls).trim());
    }
  }
}

/**
 * Remove class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */
function removeClass (el, cls) {
  /* istanbul ignore if */
  if (!cls || !(cls = cls.trim())) {
    return
  }

  /* istanbul ignore else */
  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(/\s+/).forEach(function (c) { return el.classList.remove(c); });
    } else {
      el.classList.remove(cls);
    }
    if (!el.classList.length) {
      el.removeAttribute('class');
    }
  } else {
    var cur = " " + (el.getAttribute('class') || '') + " ";
    var tar = ' ' + cls + ' ';
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ');
    }
    cur = cur.trim();
    if (cur) {
      el.setAttribute('class', cur);
    } else {
      el.removeAttribute('class');
    }
  }
}

/*  */

function resolveTransition (def) {
  if (!def) {
    return
  }
  /* istanbul ignore else */
  if (typeof def === 'object') {
    var res = {};
    if (def.css !== false) {
      extend(res, autoCssTransition(def.name || 'v'));
    }
    extend(res, def);
    return res
  } else if (typeof def === 'string') {
    return autoCssTransition(def)
  }
}

var autoCssTransition = cached(function (name) {
  return {
    enterClass: (name + "-enter"),
    enterToClass: (name + "-enter-to"),
    enterActiveClass: (name + "-enter-active"),
    leaveClass: (name + "-leave"),
    leaveToClass: (name + "-leave-to"),
    leaveActiveClass: (name + "-leave-active")
  }
});

var hasTransition = inBrowser && !isIE9;
var TRANSITION = 'transition';
var ANIMATION = 'animation';

// Transition property/event sniffing
var transitionProp = 'transition';
var transitionEndEvent = 'transitionend';
var animationProp = 'animation';
var animationEndEvent = 'animationend';
if (hasTransition) {
  /* istanbul ignore if */
  if (window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  ) {
    transitionProp = 'WebkitTransition';
    transitionEndEvent = 'webkitTransitionEnd';
  }
  if (window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  ) {
    animationProp = 'WebkitAnimation';
    animationEndEvent = 'webkitAnimationEnd';
  }
}

// binding to window is necessary to make hot reload work in IE in strict mode
var raf = inBrowser
  ? window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : setTimeout
  : /* istanbul ignore next */ function (fn) { return fn(); };

function nextFrame (fn) {
  raf(function () {
    raf(fn);
  });
}

function addTransitionClass (el, cls) {
  var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
  if (transitionClasses.indexOf(cls) < 0) {
    transitionClasses.push(cls);
    addClass(el, cls);
  }
}

function removeTransitionClass (el, cls) {
  if (el._transitionClasses) {
    remove(el._transitionClasses, cls);
  }
  removeClass(el, cls);
}

function whenTransitionEnds (
  el,
  expectedType,
  cb
) {
  var ref = getTransitionInfo(el, expectedType);
  var type = ref.type;
  var timeout = ref.timeout;
  var propCount = ref.propCount;
  if (!type) { return cb() }
  var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
  var ended = 0;
  var end = function () {
    el.removeEventListener(event, onEnd);
    cb();
  };
  var onEnd = function (e) {
    if (e.target === el) {
      if (++ended >= propCount) {
        end();
      }
    }
  };
  setTimeout(function () {
    if (ended < propCount) {
      end();
    }
  }, timeout + 1);
  el.addEventListener(event, onEnd);
}

var transformRE = /\b(transform|all)(,|$)/;

function getTransitionInfo (el, expectedType) {
  var styles = window.getComputedStyle(el);
  var transitionDelays = styles[transitionProp + 'Delay'].split(', ');
  var transitionDurations = styles[transitionProp + 'Duration'].split(', ');
  var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
  var animationDelays = styles[animationProp + 'Delay'].split(', ');
  var animationDurations = styles[animationProp + 'Duration'].split(', ');
  var animationTimeout = getTimeout(animationDelays, animationDurations);

  var type;
  var timeout = 0;
  var propCount = 0;
  /* istanbul ignore if */
  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION;
      timeout = transitionTimeout;
      propCount = transitionDurations.length;
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION;
      timeout = animationTimeout;
      propCount = animationDurations.length;
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout);
    type = timeout > 0
      ? transitionTimeout > animationTimeout
        ? TRANSITION
        : ANIMATION
      : null;
    propCount = type
      ? type === TRANSITION
        ? transitionDurations.length
        : animationDurations.length
      : 0;
  }
  var hasTransform =
    type === TRANSITION &&
    transformRE.test(styles[transitionProp + 'Property']);
  return {
    type: type,
    timeout: timeout,
    propCount: propCount,
    hasTransform: hasTransform
  }
}

function getTimeout (delays, durations) {
  /* istanbul ignore next */
  while (delays.length < durations.length) {
    delays = delays.concat(delays);
  }

  return Math.max.apply(null, durations.map(function (d, i) {
    return toMs(d) + toMs(delays[i])
  }))
}

function toMs (s) {
  return Number(s.slice(0, -1)) * 1000
}

/*  */

function enter (vnode, toggleDisplay) {
  var el = vnode.elm;

  // call leave callback now
  if (isDef(el._leaveCb)) {
    el._leaveCb.cancelled = true;
    el._leaveCb();
  }

  var data = resolveTransition(vnode.data.transition);
  if (isUndef(data)) {
    return
  }

  /* istanbul ignore if */
  if (isDef(el._enterCb) || el.nodeType !== 1) {
    return
  }

  var css = data.css;
  var type = data.type;
  var enterClass = data.enterClass;
  var enterToClass = data.enterToClass;
  var enterActiveClass = data.enterActiveClass;
  var appearClass = data.appearClass;
  var appearToClass = data.appearToClass;
  var appearActiveClass = data.appearActiveClass;
  var beforeEnter = data.beforeEnter;
  var enter = data.enter;
  var afterEnter = data.afterEnter;
  var enterCancelled = data.enterCancelled;
  var beforeAppear = data.beforeAppear;
  var appear = data.appear;
  var afterAppear = data.afterAppear;
  var appearCancelled = data.appearCancelled;
  var duration = data.duration;

  // activeInstance will always be the <transition> component managing this
  // transition. One edge case to check is when the <transition> is placed
  // as the root node of a child component. In that case we need to check
  // <transition>'s parent for appear check.
  var context = activeInstance;
  var transitionNode = activeInstance.$vnode;
  while (transitionNode && transitionNode.parent) {
    transitionNode = transitionNode.parent;
    context = transitionNode.context;
  }

  var isAppear = !context._isMounted || !vnode.isRootInsert;

  if (isAppear && !appear && appear !== '') {
    return
  }

  var startClass = isAppear && appearClass
    ? appearClass
    : enterClass;
  var activeClass = isAppear && appearActiveClass
    ? appearActiveClass
    : enterActiveClass;
  var toClass = isAppear && appearToClass
    ? appearToClass
    : enterToClass;

  var beforeEnterHook = isAppear
    ? (beforeAppear || beforeEnter)
    : beforeEnter;
  var enterHook = isAppear
    ? (typeof appear === 'function' ? appear : enter)
    : enter;
  var afterEnterHook = isAppear
    ? (afterAppear || afterEnter)
    : afterEnter;
  var enterCancelledHook = isAppear
    ? (appearCancelled || enterCancelled)
    : enterCancelled;

  var explicitEnterDuration = toNumber(
    isObject(duration)
      ? duration.enter
      : duration
  );

  if (process.env.NODE_ENV !== 'production' && explicitEnterDuration != null) {
    checkDuration(explicitEnterDuration, 'enter', vnode);
  }

  var expectsCSS = css !== false && !isIE9;
  var userWantsControl = getHookArgumentsLength(enterHook);

  var cb = el._enterCb = once(function () {
    if (expectsCSS) {
      removeTransitionClass(el, toClass);
      removeTransitionClass(el, activeClass);
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, startClass);
      }
      enterCancelledHook && enterCancelledHook(el);
    } else {
      afterEnterHook && afterEnterHook(el);
    }
    el._enterCb = null;
  });

  if (!vnode.data.show) {
    // remove pending leave element on enter by injecting an insert hook
    mergeVNodeHook(vnode, 'insert', function () {
      var parent = el.parentNode;
      var pendingNode = parent && parent._pending && parent._pending[vnode.key];
      if (pendingNode &&
        pendingNode.tag === vnode.tag &&
        pendingNode.elm._leaveCb
      ) {
        pendingNode.elm._leaveCb();
      }
      enterHook && enterHook(el, cb);
    });
  }

  // start enter transition
  beforeEnterHook && beforeEnterHook(el);
  if (expectsCSS) {
    addTransitionClass(el, startClass);
    addTransitionClass(el, activeClass);
    nextFrame(function () {
      removeTransitionClass(el, startClass);
      if (!cb.cancelled) {
        addTransitionClass(el, toClass);
        if (!userWantsControl) {
          if (isValidDuration(explicitEnterDuration)) {
            setTimeout(cb, explicitEnterDuration);
          } else {
            whenTransitionEnds(el, type, cb);
          }
        }
      }
    });
  }

  if (vnode.data.show) {
    toggleDisplay && toggleDisplay();
    enterHook && enterHook(el, cb);
  }

  if (!expectsCSS && !userWantsControl) {
    cb();
  }
}

function leave (vnode, rm) {
  var el = vnode.elm;

  // call enter callback now
  if (isDef(el._enterCb)) {
    el._enterCb.cancelled = true;
    el._enterCb();
  }

  var data = resolveTransition(vnode.data.transition);
  if (isUndef(data) || el.nodeType !== 1) {
    return rm()
  }

  /* istanbul ignore if */
  if (isDef(el._leaveCb)) {
    return
  }

  var css = data.css;
  var type = data.type;
  var leaveClass = data.leaveClass;
  var leaveToClass = data.leaveToClass;
  var leaveActiveClass = data.leaveActiveClass;
  var beforeLeave = data.beforeLeave;
  var leave = data.leave;
  var afterLeave = data.afterLeave;
  var leaveCancelled = data.leaveCancelled;
  var delayLeave = data.delayLeave;
  var duration = data.duration;

  var expectsCSS = css !== false && !isIE9;
  var userWantsControl = getHookArgumentsLength(leave);

  var explicitLeaveDuration = toNumber(
    isObject(duration)
      ? duration.leave
      : duration
  );

  if (process.env.NODE_ENV !== 'production' && isDef(explicitLeaveDuration)) {
    checkDuration(explicitLeaveDuration, 'leave', vnode);
  }

  var cb = el._leaveCb = once(function () {
    if (el.parentNode && el.parentNode._pending) {
      el.parentNode._pending[vnode.key] = null;
    }
    if (expectsCSS) {
      removeTransitionClass(el, leaveToClass);
      removeTransitionClass(el, leaveActiveClass);
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, leaveClass);
      }
      leaveCancelled && leaveCancelled(el);
    } else {
      rm();
      afterLeave && afterLeave(el);
    }
    el._leaveCb = null;
  });

  if (delayLeave) {
    delayLeave(performLeave);
  } else {
    performLeave();
  }

  function performLeave () {
    // the delayed leave may have already been cancelled
    if (cb.cancelled) {
      return
    }
    // record leaving element
    if (!vnode.data.show) {
      (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key)] = vnode;
    }
    beforeLeave && beforeLeave(el);
    if (expectsCSS) {
      addTransitionClass(el, leaveClass);
      addTransitionClass(el, leaveActiveClass);
      nextFrame(function () {
        removeTransitionClass(el, leaveClass);
        if (!cb.cancelled) {
          addTransitionClass(el, leaveToClass);
          if (!userWantsControl) {
            if (isValidDuration(explicitLeaveDuration)) {
              setTimeout(cb, explicitLeaveDuration);
            } else {
              whenTransitionEnds(el, type, cb);
            }
          }
        }
      });
    }
    leave && leave(el, cb);
    if (!expectsCSS && !userWantsControl) {
      cb();
    }
  }
}

// only used in dev mode
function checkDuration (val, name, vnode) {
  if (typeof val !== 'number') {
    warn(
      "<transition> explicit " + name + " duration is not a valid number - " +
      "got " + (JSON.stringify(val)) + ".",
      vnode.context
    );
  } else if (isNaN(val)) {
    warn(
      "<transition> explicit " + name + " duration is NaN - " +
      'the duration expression might be incorrect.',
      vnode.context
    );
  }
}

function isValidDuration (val) {
  return typeof val === 'number' && !isNaN(val)
}

/**
 * Normalize a transition hook's argument length. The hook may be:
 * - a merged hook (invoker) with the original in .fns
 * - a wrapped component method (check ._length)
 * - a plain function (.length)
 */
function getHookArgumentsLength (fn) {
  if (isUndef(fn)) {
    return false
  }
  var invokerFns = fn.fns;
  if (isDef(invokerFns)) {
    // invoker
    return getHookArgumentsLength(
      Array.isArray(invokerFns)
        ? invokerFns[0]
        : invokerFns
    )
  } else {
    return (fn._length || fn.length) > 1
  }
}

function _enter (_, vnode) {
  if (vnode.data.show !== true) {
    enter(vnode);
  }
}

var transition = inBrowser ? {
  create: _enter,
  activate: _enter,
  remove: function remove$$1 (vnode, rm) {
    /* istanbul ignore else */
    if (vnode.data.show !== true) {
      leave(vnode, rm);
    } else {
      rm();
    }
  }
} : {}

var platformModules = [
  attrs,
  klass,
  events,
  domProps,
  style,
  transition
]

/*  */

// the directive module should be applied last, after all
// built-in modules have been applied.
var modules = platformModules.concat(baseModules);

var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

/**
 * Not type checking this file because flow doesn't like attaching
 * properties to Elements.
 */

/* istanbul ignore if */
if (isIE9) {
  // http://www.matts411.com/post/internet-explorer-9-oninput/
  document.addEventListener('selectionchange', function () {
    var el = document.activeElement;
    if (el && el.vmodel) {
      trigger(el, 'input');
    }
  });
}

var directive = {
  inserted: function inserted (el, binding, vnode, oldVnode) {
    if (vnode.tag === 'select') {
      // #6903
      if (oldVnode.elm && !oldVnode.elm._vOptions) {
        mergeVNodeHook(vnode, 'postpatch', function () {
          directive.componentUpdated(el, binding, vnode);
        });
      } else {
        setSelected(el, binding, vnode.context);
      }
      el._vOptions = [].map.call(el.options, getValue);
    } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
      el._vModifiers = binding.modifiers;
      if (!binding.modifiers.lazy) {
        el.addEventListener('compositionstart', onCompositionStart);
        el.addEventListener('compositionend', onCompositionEnd);
        // Safari < 10.2 & UIWebView doesn't fire compositionend when
        // switching focus before confirming composition choice
        // this also fixes the issue where some browsers e.g. iOS Chrome
        // fires "change" instead of "input" on autocomplete.
        el.addEventListener('change', onCompositionEnd);
        /* istanbul ignore if */
        if (isIE9) {
          el.vmodel = true;
        }
      }
    }
  },

  componentUpdated: function componentUpdated (el, binding, vnode) {
    if (vnode.tag === 'select') {
      setSelected(el, binding, vnode.context);
      // in case the options rendered by v-for have changed,
      // it's possible that the value is out-of-sync with the rendered options.
      // detect such cases and filter out values that no longer has a matching
      // option in the DOM.
      var prevOptions = el._vOptions;
      var curOptions = el._vOptions = [].map.call(el.options, getValue);
      if (curOptions.some(function (o, i) { return !looseEqual(o, prevOptions[i]); })) {
        // trigger change event if
        // no matching option found for at least one value
        var needReset = el.multiple
          ? binding.value.some(function (v) { return hasNoMatchingOption(v, curOptions); })
          : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
        if (needReset) {
          trigger(el, 'change');
        }
      }
    }
  }
};

function setSelected (el, binding, vm) {
  actuallySetSelected(el, binding, vm);
  /* istanbul ignore if */
  if (isIE || isEdge) {
    setTimeout(function () {
      actuallySetSelected(el, binding, vm);
    }, 0);
  }
}

function actuallySetSelected (el, binding, vm) {
  var value = binding.value;
  var isMultiple = el.multiple;
  if (isMultiple && !Array.isArray(value)) {
    process.env.NODE_ENV !== 'production' && warn(
      "<select multiple v-model=\"" + (binding.expression) + "\"> " +
      "expects an Array value for its binding, but got " + (Object.prototype.toString.call(value).slice(8, -1)),
      vm
    );
    return
  }
  var selected, option;
  for (var i = 0, l = el.options.length; i < l; i++) {
    option = el.options[i];
    if (isMultiple) {
      selected = looseIndexOf(value, getValue(option)) > -1;
      if (option.selected !== selected) {
        option.selected = selected;
      }
    } else {
      if (looseEqual(getValue(option), value)) {
        if (el.selectedIndex !== i) {
          el.selectedIndex = i;
        }
        return
      }
    }
  }
  if (!isMultiple) {
    el.selectedIndex = -1;
  }
}

function hasNoMatchingOption (value, options) {
  return options.every(function (o) { return !looseEqual(o, value); })
}

function getValue (option) {
  return '_value' in option
    ? option._value
    : option.value
}

function onCompositionStart (e) {
  e.target.composing = true;
}

function onCompositionEnd (e) {
  // prevent triggering an input event for no reason
  if (!e.target.composing) { return }
  e.target.composing = false;
  trigger(e.target, 'input');
}

function trigger (el, type) {
  var e = document.createEvent('HTMLEvents');
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

/*  */

// recursively search for possible transition defined inside the component root
function locateNode (vnode) {
  return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
    ? locateNode(vnode.componentInstance._vnode)
    : vnode
}

var show = {
  bind: function bind (el, ref, vnode) {
    var value = ref.value;

    vnode = locateNode(vnode);
    var transition$$1 = vnode.data && vnode.data.transition;
    var originalDisplay = el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display;
    if (value && transition$$1) {
      vnode.data.show = true;
      enter(vnode, function () {
        el.style.display = originalDisplay;
      });
    } else {
      el.style.display = value ? originalDisplay : 'none';
    }
  },

  update: function update (el, ref, vnode) {
    var value = ref.value;
    var oldValue = ref.oldValue;

    /* istanbul ignore if */
    if (!value === !oldValue) { return }
    vnode = locateNode(vnode);
    var transition$$1 = vnode.data && vnode.data.transition;
    if (transition$$1) {
      vnode.data.show = true;
      if (value) {
        enter(vnode, function () {
          el.style.display = el.__vOriginalDisplay;
        });
      } else {
        leave(vnode, function () {
          el.style.display = 'none';
        });
      }
    } else {
      el.style.display = value ? el.__vOriginalDisplay : 'none';
    }
  },

  unbind: function unbind (
    el,
    binding,
    vnode,
    oldVnode,
    isDestroy
  ) {
    if (!isDestroy) {
      el.style.display = el.__vOriginalDisplay;
    }
  }
}

var platformDirectives = {
  model: directive,
  show: show
}

/*  */

// Provides transition support for a single element/component.
// supports transition mode (out-in / in-out)

var transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object]
};

// in case the child is also an abstract component, e.g. <keep-alive>
// we want to recursively retrieve the real component to be rendered
function getRealChild (vnode) {
  var compOptions = vnode && vnode.componentOptions;
  if (compOptions && compOptions.Ctor.options.abstract) {
    return getRealChild(getFirstComponentChild(compOptions.children))
  } else {
    return vnode
  }
}

function extractTransitionData (comp) {
  var data = {};
  var options = comp.$options;
  // props
  for (var key in options.propsData) {
    data[key] = comp[key];
  }
  // events.
  // extract listeners and pass them directly to the transition methods
  var listeners = options._parentListeners;
  for (var key$1 in listeners) {
    data[camelize(key$1)] = listeners[key$1];
  }
  return data
}

function placeholder (h, rawChild) {
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

function hasParentTransition (vnode) {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

function isSameChild (child, oldChild) {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

var Transition = {
  name: 'transition',
  props: transitionProps,
  abstract: true,

  render: function render (h) {
    var this$1 = this;

    var children = this.$slots.default;
    if (!children) {
      return
    }

    // filter out text nodes (possible whitespaces)
    children = children.filter(function (c) { return c.tag || isAsyncPlaceholder(c); });
    /* istanbul ignore if */
    if (!children.length) {
      return
    }

    // warn multiple elements
    if (process.env.NODE_ENV !== 'production' && children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      );
    }

    var mode = this.mode;

    // warn invalid mode
    if (process.env.NODE_ENV !== 'production' &&
      mode && mode !== 'in-out' && mode !== 'out-in'
    ) {
      warn(
        'invalid <transition> mode: ' + mode,
        this.$parent
      );
    }

    var rawChild = children[0];

    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    if (hasParentTransition(this.$vnode)) {
      return rawChild
    }

    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    var child = getRealChild(rawChild);
    /* istanbul ignore if */
    if (!child) {
      return rawChild
    }

    if (this._leaving) {
      return placeholder(h, rawChild)
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    var id = "__transition-" + (this._uid) + "-";
    child.key = child.key == null
      ? child.isComment
        ? id + 'comment'
        : id + child.tag
      : isPrimitive(child.key)
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key;

    var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
    var oldRawChild = this._vnode;
    var oldChild = getRealChild(oldRawChild);

    // mark v-show
    // so that the transition module can hand over the control to the directive
    if (child.data.directives && child.data.directives.some(function (d) { return d.name === 'show'; })) {
      child.data.show = true;
    }

    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // replace old child transition data with fresh one
      // important for dynamic transitions!
      var oldData = oldChild.data.transition = extend({}, data);
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true;
        mergeVNodeHook(oldData, 'afterLeave', function () {
          this$1._leaving = false;
          this$1.$forceUpdate();
        });
        return placeholder(h, rawChild)
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        var delayedLeave;
        var performLeave = function () { delayedLeave(); };
        mergeVNodeHook(data, 'afterEnter', performLeave);
        mergeVNodeHook(data, 'enterCancelled', performLeave);
        mergeVNodeHook(oldData, 'delayLeave', function (leave) { delayedLeave = leave; });
      }
    }

    return rawChild
  }
}

/*  */

// Provides transition support for list items.
// supports move transitions using the FLIP technique.

// Because the vdom's children update algorithm is "unstable" - i.e.
// it doesn't guarantee the relative positioning of removed elements,
// we force transition-group to update its children into two passes:
// in the first pass, we remove all nodes that need to be removed,
// triggering their leaving transition; in the second pass, we insert/move
// into the final desired state. This way in the second pass removed
// nodes will remain where they should be.

var props = extend({
  tag: String,
  moveClass: String
}, transitionProps);

delete props.mode;

var TransitionGroup = {
  props: props,

  render: function render (h) {
    var tag = this.tag || this.$vnode.data.tag || 'span';
    var map = Object.create(null);
    var prevChildren = this.prevChildren = this.children;
    var rawChildren = this.$slots.default || [];
    var children = this.children = [];
    var transitionData = extractTransitionData(this);

    for (var i = 0; i < rawChildren.length; i++) {
      var c = rawChildren[i];
      if (c.tag) {
        if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
          children.push(c);
          map[c.key] = c
          ;(c.data || (c.data = {})).transition = transitionData;
        } else if (process.env.NODE_ENV !== 'production') {
          var opts = c.componentOptions;
          var name = opts ? (opts.Ctor.options.name || opts.tag || '') : c.tag;
          warn(("<transition-group> children must be keyed: <" + name + ">"));
        }
      }
    }

    if (prevChildren) {
      var kept = [];
      var removed = [];
      for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
        var c$1 = prevChildren[i$1];
        c$1.data.transition = transitionData;
        c$1.data.pos = c$1.elm.getBoundingClientRect();
        if (map[c$1.key]) {
          kept.push(c$1);
        } else {
          removed.push(c$1);
        }
      }
      this.kept = h(tag, null, kept);
      this.removed = removed;
    }

    return h(tag, null, children)
  },

  beforeUpdate: function beforeUpdate () {
    // force removing pass
    this.__patch__(
      this._vnode,
      this.kept,
      false, // hydrating
      true // removeOnly (!important, avoids unnecessary moves)
    );
    this._vnode = this.kept;
  },

  updated: function updated () {
    var children = this.prevChildren;
    var moveClass = this.moveClass || ((this.name || 'v') + '-move');
    if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
      return
    }

    // we divide the work into three loops to avoid mixing DOM reads and writes
    // in each iteration - which helps prevent layout thrashing.
    children.forEach(callPendingCbs);
    children.forEach(recordPosition);
    children.forEach(applyTranslation);

    // force reflow to put everything in position
    // assign to this to avoid being removed in tree-shaking
    // $flow-disable-line
    this._reflow = document.body.offsetHeight;

    children.forEach(function (c) {
      if (c.data.moved) {
        var el = c.elm;
        var s = el.style;
        addTransitionClass(el, moveClass);
        s.transform = s.WebkitTransform = s.transitionDuration = '';
        el.addEventListener(transitionEndEvent, el._moveCb = function cb (e) {
          if (!e || /transform$/.test(e.propertyName)) {
            el.removeEventListener(transitionEndEvent, cb);
            el._moveCb = null;
            removeTransitionClass(el, moveClass);
          }
        });
      }
    });
  },

  methods: {
    hasMove: function hasMove (el, moveClass) {
      /* istanbul ignore if */
      if (!hasTransition) {
        return false
      }
      /* istanbul ignore if */
      if (this._hasMove) {
        return this._hasMove
      }
      // Detect whether an element with the move class applied has
      // CSS transitions. Since the element may be inside an entering
      // transition at this very moment, we make a clone of it and remove
      // all other transition classes applied to ensure only the move class
      // is applied.
      var clone = el.cloneNode();
      if (el._transitionClasses) {
        el._transitionClasses.forEach(function (cls) { removeClass(clone, cls); });
      }
      addClass(clone, moveClass);
      clone.style.display = 'none';
      this.$el.appendChild(clone);
      var info = getTransitionInfo(clone);
      this.$el.removeChild(clone);
      return (this._hasMove = info.hasTransform)
    }
  }
}

function callPendingCbs (c) {
  /* istanbul ignore if */
  if (c.elm._moveCb) {
    c.elm._moveCb();
  }
  /* istanbul ignore if */
  if (c.elm._enterCb) {
    c.elm._enterCb();
  }
}

function recordPosition (c) {
  c.data.newPos = c.elm.getBoundingClientRect();
}

function applyTranslation (c) {
  var oldPos = c.data.pos;
  var newPos = c.data.newPos;
  var dx = oldPos.left - newPos.left;
  var dy = oldPos.top - newPos.top;
  if (dx || dy) {
    c.data.moved = true;
    var s = c.elm.style;
    s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
    s.transitionDuration = '0s';
  }
}

var platformComponents = {
  Transition: Transition,
  TransitionGroup: TransitionGroup
}

/*  */

// install platform specific utils
Vue.config.mustUseProp = mustUseProp;
Vue.config.isReservedTag = isReservedTag;
Vue.config.isReservedAttr = isReservedAttr;
Vue.config.getTagNamespace = getTagNamespace;
Vue.config.isUnknownElement = isUnknownElement;

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives);
extend(Vue.options.components, platformComponents);

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;

// public mount method
Vue.prototype.$mount = function (
  el,
  hydrating
) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating)
};

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(function () {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue);
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        isChrome
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        );
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        "You are running Vue in development mode.\n" +
        "Make sure to turn on production mode when deploying for production.\n" +
        "See more tips at https://vuejs.org/guide/deployment.html"
      );
    }
  }, 0);
}

/*  */

module.exports = Vue;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"_process":1,"timers":2}],7:[function(require,module,exports){
var inserted = exports.cache = {}

function noop () {}

exports.insert = function (css) {
  if (inserted[css]) return noop
  inserted[css] = true

  var elem = document.createElement('style')
  elem.setAttribute('type', 'text/css')

  if ('textContent' in elem) {
    elem.textContent = css
  } else {
    elem.styleSheet.cssText = css
  }

  document.getElementsByTagName('head')[0].appendChild(elem)
  return function () {
    document.getElementsByTagName('head')[0].removeChild(elem)
    inserted[css] = false
  }
}

},{}],8:[function(require,module,exports){
var __vueify_style_dispose__ = require("vueify/lib/insert-css").insert("strong {\n  font-family: Odin;\n}\n.button {\n  font-family: Odin;\n}\n.file-status {\n  border-bottom: 2px solid #ced3cc;\n}\n.icontainer {\n  display: flex;\n  min-height: 100px;\n  min-width: 100px;\n  height: 100px;\n  width: 100px;\n  background-color: #3273dc;\n  border-radius: 10px;\n  margin: 5px;\n}\n.loader-icon.error {\n  background-color: transparent;\n}\n.loader-icon {\n  background-color: white;\n  border-radius: 10px;\n  height: 80px;\n  width: 80px;\n  margin: 50% 50%;\n  transform: translate(-50%, -50%);\n}\n.form-container {\n  max-height: 128px;\n  max-width: 500px;\n  min-height: 128px;\n  min-width: 500px;\n  height: 128px;\n  width: 500px;\n}\n.file-info {\n  display: flex;\n}\n.file-status {\n  display: flex;\n  flex-direction: row;\n  margin: 5px;\n}\n\n.download-button {\n  height: 100%;\n  width: auto;\n  min-width: 100px;\n  font-family: Odin;\n  background-color: #edf0f2;\n  padding: 0;\n  display: flex;\n  border-color: #878787;\n  border-style: dotted;\n  border-width: 10px;\n  padding: 3px;\n  color: #878787;\n  outline: 5px solid #edf0f2;\n  margin: 5px;\n  font-family: Odin;\n  align-self: center;\n  align-content: center;\n  justify-content: center;\n  flex-direction: column;\n}\n.download {\n  width: 40px;\n  height: 40px;\n  margin: 0 auto 3px auto;\n}\n.download-button:hover h3 {\n  color: #878787;\n}\n.download-button:hover {\n  outline: 5px solid #878787;\n}\n.error {\n  color: red;\n}")
;(function(){
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

let progressbar = require('./progressbar.vue')
let urldecode = require('urldecode')
function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
module.exports = {
  components: {progressbar},
  data () {
    return {
      location: null,
      url: null,
      files: [],
      Exporter: null,
      isExpandable: true
    }
  },
  mounted () {
    this.Exporter =  new Exporter(ipcRenderer, this.onPercent, this.onError)
    let heightOffset = window.outerHeight - window.innerHeight
    let widthOffset = window.outerWidth - window.innerWidth
    let height = this.$refs.container.clientHeight + heightOffset
    let width = this.$refs.container.clientWidth + widthOffset
    window.resizeTo(width, height)
  },
  methods: {
    choose () {
      dialog.showOpenDialog({properties: [ 'openDirectory' ]}, (filePaths) => {
       if (Array.isArray(filePaths)) {
         this.location = filePaths[0]
       }
      })
    },
    onError (err) {
      this.files[err.id].error = err.err
      this.files[err.id].icon = '../../images/error.svg'
    },
    onPercent(payload) {
      this.files[payload.id].percent = payload.percent
      if (payload.percent >= 100) {
        this.files[payload.id].icon = '../../images/folder.svg'
      }
    },
    resize () {
      let heightOffset = window.outerHeight - window.innerHeight
      let widthOffset = window.outerWidth - window.innerWidth
      let height = this.$refs.container.clientHeight + heightOffset
      let width = this.$refs.container.clientWidth + widthOffset
      if (!this.isExpandable || height >= (.80 * window.screen.height)) {
        document.body.style.overflowY = 'scroll'
        //this.$refs.fileStatus.style.overflowY = 'scroll'
        //stop resizing window after the first time
        if(this.isExpandable) {
          this.isExpandable = false
          //this.$refs.fileStatus.style.maxHeight = this.$refs.fileStatus.offsetHeight
        }
      } else {
        //this.$refs.fileStatus.style.overflowY = "auto"
        //this.$refs.fileStatus.style.height = "auto"
        window.resizeTo(width, height)
      }
    },
    exporter () {
    this.$validator.validateAll()
      .then((ok) => {
        if (!ok) return
        let url = OffUrl.parse(this.url)
        let filename = path.join(this.location, urldecode(url.fileName))
        let streamLength = url.streamLength
        let percent = 0
        let size = 0
        let icon = `../../images/Preloader_${ getRandomInt(1, 7) }.gif`
        let show = true
        let error = null
        let file = {filename, percent, size, streamLength, icon, show, error}

        // Resize Window to fit
        setTimeout(this.resize, 100)
        let id = this.files.length
        this.files.push(file)
        this.Exporter.exporter(this.location, this.url, id)
        //this.location = null
        //this.url = null
        this.$validator.flag('location', {
          valid: false,
          dirty: false
        })
        this.$validator.flag('url', {
          valid: false,
          dirty: false
        })
      })
    },
    openLocation (index) {
      if (this.files[index].percent >= 100) {
        shell.showItemInFolder(this.files[index].filename)
      }
      if (this.files[index].error) {
        this.files[index].show = false
        setTimeout(this.resize, 100)
      }
    }
  }
}

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{ref:"container"},[_c('div',{ref:"fileStatus"},_vm._l((_vm.files),function(file,index){return _c('div',{directives:[{name:"show",rawName:"v-show",value:(file.show),expression:"file.show"}],staticClass:"file-status"},[_c('div',{staticClass:"icontainer"},[_c('img',{class:file.error ? 'loader-icon error' : 'loader-icon',attrs:{"src":file.icon},on:{"click":function($event){_vm.openLocation(index)}}})]),_vm._v(" "),_c('div',{staticClass:"file-info"},[_c('table',[_c('tr',[_c('td',[_c('strong',[_vm._v("Filename:")]),_vm._v("\n              "+_vm._s(file.filename)+"\n            ")])]),_vm._v(" "),_c('tr',[_c('td',[_c('progressbar',{attrs:{"error":file.error,"percent":file.percent}})],1)])])])])})),_vm._v(" "),_c('div',{staticClass:"form-container"},[_c('form',[_c('table',[_c('tr',[_c('td',{staticStyle:{"padding":"5px"}},[_c('div',{staticClass:"field has-addons"},[_c('div',{staticClass:"control"},[_c('input',{directives:[{name:"model",rawName:"v-model",value:(_vm.location),expression:"location"}],staticClass:"input",attrs:{"disabled":"","name":"location","type":"text","placeholder":"Select an Export Location"},domProps:{"value":(_vm.location)},on:{"input":function($event){if($event.target.composing){ return; }_vm.location=$event.target.value}}})]),_vm._v(" "),_c('div',{staticClass:"control"},[_c('a',{staticClass:"button is-info",on:{"click":_vm.choose}},[_vm._v("\n                  Choose\n                ")])])]),_vm._v(" "),_c('input',{directives:[{name:"show",rawName:"v-show",value:(false),expression:"false"},{name:"validate",rawName:"v-validate",value:({ required: true }),expression:"{ required: true }"},{name:"model",rawName:"v-model",value:(_vm.location),expression:"location"}],staticClass:"input",attrs:{"name":"location","type":"text","placeholder":"Select an Export Location"},domProps:{"value":(_vm.location)},on:{"input":function($event){if($event.target.composing){ return; }_vm.location=$event.target.value}}}),_vm._v(" "),_c('span',{directives:[{name:"show",rawName:"v-show",value:(_vm.errors.has('location')),expression:"errors.has('location')"}],staticClass:"error"},[_vm._v(_vm._s(_vm.errors.first('location')))]),_vm._v(" "),_c('div',{staticClass:"field has-addons"},[_c('div',{staticClass:"control"},[_c('input',{directives:[{name:"validate",rawName:"v-validate",value:({ required: true, regex: /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([^ !$`&*()+]*|\\[ !$`&*()+]*)+/ }),expression:"{ required: true, regex: /\\/offsystem\\/v3\\/([-+.\\w]+\\/[-+.\\w]+)\\/(\\d+)\\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\\/([^ !$`&*()+]*|\\\\[ !$`&*()+]*)+/ }"},{name:"model",rawName:"v-model",value:(_vm.url),expression:"url"}],staticClass:"input",staticStyle:{"width":"340px"},attrs:{"name":"url","type":"text","placeholder":"Enter url to export"},domProps:{"value":(_vm.url)},on:{"input":function($event){if($event.target.composing){ return; }_vm.url=$event.target.value}}})])]),_vm._v(" "),_c('span',{directives:[{name:"show",rawName:"v-show",value:(_vm.errors.has('url') && _vm.fields.url.dirty),expression:"errors.has('url') && fields.url.dirty"}],staticClass:"error"},[_vm._v(_vm._s(_vm.errors.first('url')))])]),_vm._v(" "),_c('td',[_c('a',{staticClass:"download-button",on:{"click":_vm.exporter}},[_c('h3',{attrs:{"id":"downloadMessage"}},[_vm._v("Export")]),_vm._v(" "),_c('img',{staticClass:"download",attrs:{"id":"downloadIcon","src":"../../images/download.svg"}})])])])])])])])}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  module.hot.dispose(__vueify_style_dispose__)
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-6a61d36e", __vue__options__)
  } else {
    hotAPI.reload("data-v-6a61d36e", __vue__options__)
  }
})()}
},{"./progressbar.vue":10,"urldecode":3,"vue":6,"vue-hot-reload-api":5,"vueify/lib/insert-css":7}],9:[function(require,module,exports){
var Vue = require('vue')
var App = require('./export.vue')
var VeeValidate = require('vee-validate')

const config = {
  errorBagName: 'errors', // change if property conflicts
  fieldsBagName: 'fields',
  delay: 0,
  locale: 'en',
  dictionary: null,
  strict: true,
  classes: false,
  classNames: {
    touched: 'touched', // the control has been blurred
    untouched: 'untouched', // the control hasn't been blurred
    valid: 'valid', // model is valid
    invalid: 'invalid', // model is invalid
    pristine: 'pristine', // control has not been interacted with
    dirty: 'dirty' // control has been interacted with
  },
  events: 'input',
  inject: true,
  validity: false,
  aria: true
}

Vue.use(VeeValidate, config)
new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})
},{"./export.vue":8,"vee-validate":4,"vue":6}],10:[function(require,module,exports){
var __vueify_style_dispose__ = require("vueify/lib/insert-css").insert(".progress-bar[data-v-cac42708] {\n  display: block;\n  height: 50px;\n  width: 300px;\n  background-color: #ced3cc;\n  border-radius: 10px;\n}\n.error[data-v-cac42708] {\n  color: #b24a4a;\n}\n.progress-bar.error[data-v-cac42708]::-webkit-progress-bar {\n  background-color: #b24a4a;\n}\n/*\n.progress-bar::after {\n  content: attr(value);\n}*/\n.progress-bar[data-v-cac42708]::-webkit-progress-bar{\n  background-color: #ced3cc;\n  border-radius: 10px;\n}\n.progress-bar[value][data-v-cac42708]::-webkit-progress-value {\n  background-color: #6cc4bd;\n  border-radius: 10px;\n}\n\n.progressjs-theme-blueOverlayRadiusWithPercentBar[data-v-cac42708] {\n  background-color: #ced3cc;\n}\n\n.progressjs-theme-blueOverlayRadiusWithPercentBar .progressjs-inner[data-v-cac42708] {\n  background-color: #6cc4bd;\n}")
;(function(){
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

module.exports = {
  props: ['percent', 'error']
}

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('span',[_c('span',{staticClass:"error"},[_vm._v(_vm._s(_vm.error))]),_vm._v(" "),_c('progress',{class:_vm.error ? 'progress-bar error' : 'progress-bar',attrs:{"max":"100"},domProps:{"value":_vm.percent}},[_vm._v(_vm._s(_vm.percent))])])}
__vue__options__.staticRenderFns = []
__vue__options__._scopeId = "data-v-cac42708"
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  module.hot.dispose(__vueify_style_dispose__)
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-cac42708", __vue__options__)
  } else {
    hotAPI.rerender("data-v-cac42708", __vue__options__)
  }
})()}
},{"vue":6,"vue-hot-reload-api":5,"vueify/lib/insert-css":7}]},{},[9]);
