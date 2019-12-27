(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var placeholderKickoff = require('./placeholder');
var ellipses = 3;
var cuss = require('cuss');
var profanities = filterOutContextualBadWords(cuss).reverse();
var profanitiesRegex = new RegExp('(?:\\s|^)(' + profanities.join('|') + ')', 'ig');

var emailClient = document.getElementsByClassName('emailClient__emails')[0];
var count = document.getElementsByClassName('count__content')[0];
var body = document.getElementsByTagName('body')[0];
var form = document.getElementsByTagName('form')[0];
var input = document.getElementsByTagName('input')[0];

placeholderKickoff(input);

form.addEventListener('submit', function (e) {
  return e.preventDefault();
});
input.addEventListener('keyup', formAction);
input.addEventListener('focus', formAction);

/**
 * trigger the search and errors
 */
function formAction() {
  var subject = input.value;
  var matches = findPossibleProfanity(subject);
  var subjects = buildDangerousSubjectLines(subject, matches);

  if (subjects.length > 0) {
    setErrors(subjects);
  } else {
    removeErrors();
  }
}

/**
 * filters out bad words that depend on the context they are used: i.e. laid
 * @param  {Object} cuss
 * @return {Array}
 */
function filterOutContextualBadWords(cuss) {
  return Object.entries(cuss).filter(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        w = _ref2[0],
        rating = _ref2[1];

    return rating > 0;
  }).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 1),
        w = _ref4[0];

    return w;
  }).sort();
}

/**
 * finds any possible profane endings to the given subjects
 * @param  {String} subject the user's subject
 * @return {Array}          the profane ending words
 */
function findPossibleProfanity(subject) {
  var matches = [];
  var results = void 0;

  while ((results = profanitiesRegex.exec(subject)) !== null) {
    matches.push(results[1]);
  }

  return matches;
}

/**
 * build an array of profane ending subjects
 * @param  {String} subject  the user's subject
 * @param  {Array}  matches  the profane endings found in findPossibleProfanity
 * @return {Array}           the profane-ending subjects
 */
function buildDangerousSubjectLines(subject, matches) {
  return matches.map(function (match, i) {
    var nthOfProfanity = matches.slice(0, i + 1).filter(function (v) {
      return v === match;
    }).length - 1;
    var subjectUntil = subject.split(match).slice(0, nthOfProfanity + 1).join(match);

    return subjectUntil + '<span class="highlight">' + match + '</span>...';
  });
}

/**
 * sets the state to error with the given subjects
 * @param {Array} subjects
 */
function setErrors(subjects) {
  body.classList.add('body--error');
  count.innerHTML = subjects.length;
  emailClient.innerHTML = subjects.map(function (subject) {
    return '\n    <div class="email">\n      <div class="email__subject">' + subject + '</div>\n      <div class="email__from">fauxpas@whoops.com</div>\n      <div class="email__date">Yesterday</div>\n    </div>\n  ';
  }).join('');
}

/**
 * sets the state to errorless
 */
function removeErrors() {
  body.classList.remove('body--error');
  emailClient.innerHTML = '';
}

},{"./placeholder":13,"cuss":4}],2:[function(require,module,exports){
"use strict";

// rawAsap provides everything we need except exception management.
var rawAsap = require("./raw");
// RawTasks are recycled to reduce GC churn.
var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawAsap(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

},{"./raw":3}],3:[function(require,module,exports){
(function (global){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` or `self` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.

/* globals self */
var scope = typeof global !== "undefined" ? global : self;
var BrowserMutationObserver = scope.MutationObserver || scope.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
module.exports={
  "abbo": 1,
  "abeed": 2,
  "abid": 1,
  "abo": 1,
  "abortion": 1,
  "abuse": 1,
  "addict": 1,
  "addicts": 1,
  "adult": 0,
  "africa": 0,
  "african": 0,
  "africoon": 2,
  "alla": 1,
  "allah": 0,
  "alligator bait": 2,
  "alligatorbait": 2,
  "amateur": 0,
  "american": 0,
  "anal": 1,
  "analannie": 2,
  "analsex": 1,
  "angie": 0,
  "angry": 0,
  "anus": 1,
  "arab": 0,
  "arabs": 0,
  "arabush": 2,
  "arabushs": 2,
  "areola": 1,
  "argie": 2,
  "armo": 2,
  "armos": 2,
  "aroused": 0,
  "arse": 2,
  "arsehole": 2,
  "asian": 0,
  "ass": 2,
  "assassin": 0,
  "assassinate": 0,
  "assassination": 0,
  "assault": 0,
  "assbagger": 2,
  "assblaster": 2,
  "assclown": 2,
  "asscowboy": 2,
  "asses": 2,
  "assfuck": 2,
  "assfucker": 2,
  "asshat": 2,
  "asshole": 2,
  "assholes": 2,
  "asshore": 2,
  "assjockey": 2,
  "asskiss": 2,
  "asskisser": 2,
  "assklown": 2,
  "asslick": 2,
  "asslicker": 2,
  "asslover": 2,
  "assman": 2,
  "assmonkey": 2,
  "assmunch": 2,
  "assmuncher": 2,
  "asspacker": 2,
  "asspirate": 2,
  "asspuppies": 2,
  "assranger": 2,
  "asswhore": 2,
  "asswipe": 2,
  "athletesfoot": 1,
  "attack": 0,
  "australian": 0,
  "babe": 1,
  "babies": 0,
  "backdoor": 0,
  "backdoorman": 2,
  "backseat": 0,
  "badfuck": 2,
  "balllicker": 2,
  "balls": 1,
  "ballsack": 1,
  "banana": 0,
  "bananas": 0,
  "banging": 1,
  "baptist": 0,
  "barelylegal": 2,
  "barf": 2,
  "barface": 2,
  "barfface": 2,
  "bast": 0,
  "bastard": 1,
  "bazongas": 2,
  "bazooms": 2,
  "beanbag": 2,
  "beanbags": 2,
  "beaner": 2,
  "beaners": 2,
  "beaney": 2,
  "beaneys": 2,
  "beast": 0,
  "beastality": 1,
  "beastial": 1,
  "beastiality": 1,
  "beatoff": 2,
  "beatyourmeat": 2,
  "beaver": 0,
  "bestial": 1,
  "bestiality": 1,
  "bi": 0,
  "biatch": 2,
  "bible": 0,
  "bicurious": 1,
  "bigass": 2,
  "bigbastard": 2,
  "bigbutt": 2,
  "bigger": 0,
  "bisexual": 0,
  "bitch": 1,
  "bitcher": 2,
  "bitches": 1,
  "bitchez": 2,
  "bitchin": 2,
  "bitching": 2,
  "bitchslap": 2,
  "bitchy": 2,
  "biteme": 2,
  "black": 0,
  "blackman": 1,
  "blackout": 0,
  "blacks": 1,
  "blind": 0,
  "blow": 0,
  "blowjob": 2,
  "bluegum": 2,
  "bluegums": 2,
  "boang": 2,
  "boche": 2,
  "boches": 2,
  "bogan": 2,
  "bohunk": 2,
  "bollick": 2,
  "bollock": 2,
  "bollocks": 2,
  "bomb": 0,
  "bombers": 0,
  "bombing": 0,
  "bombs": 0,
  "bomd": 0,
  "bondage": 1,
  "boner": 2,
  "bong": 2,
  "boob": 1,
  "boobies": 2,
  "boobs": 1,
  "booby": 2,
  "boody": 2,
  "boom": 0,
  "boong": 2,
  "boonga": 2,
  "boongas": 2,
  "boongs": 2,
  "boonie": 2,
  "boonies": 2,
  "bootlip": 2,
  "bootlips": 2,
  "booty": 2,
  "bootycall": 2,
  "bosch": 0,
  "bosche": 2,
  "bosches": 2,
  "boschs": 2,
  "bounty bar": 1,
  "bounty bars": 1,
  "bountybar": 1,
  "bra": 0,
  "brea5t": 2,
  "breast": 0,
  "breastjob": 2,
  "breastlover": 2,
  "breastman": 2,
  "brothel": 1,
  "brownie": 0,
  "brownies": 0,
  "buddhahead": 2,
  "buddhaheads": 2,
  "buffies": 2,
  "buffy": 0,
  "bugger": 2,
  "buggered": 2,
  "buggery": 2,
  "bule": 2,
  "bules": 2,
  "bullcrap": 2,
  "bulldike": 2,
  "bulldyke": 2,
  "bullshit": 2,
  "bumblefuck": 2,
  "bumfuck": 2,
  "bung": 2,
  "bunga": 2,
  "bungas": 2,
  "bunghole": 2,
  "buried": 0,
  "burn": 0,
  "burr head": 2,
  "burr heads": 2,
  "burrhead": 2,
  "burrheads": 2,
  "butchbabes": 2,
  "butchdike": 2,
  "butchdyke": 2,
  "butt": 0,
  "buttbang": 2,
  "buttface": 2,
  "buttfuck": 2,
  "buttfucker": 2,
  "buttfuckers": 2,
  "butthead": 2,
  "buttman": 2,
  "buttmunch": 2,
  "buttmuncher": 2,
  "buttpirate": 2,
  "buttplug": 1,
  "buttstain": 2,
  "byatch": 2,
  "cacker": 2,
  "camel jockey": 2,
  "camel jockeys": 2,
  "cameljockey": 2,
  "cameltoe": 2,
  "canadian": 0,
  "cancer": 0,
  "carpetmuncher": 2,
  "carruth": 2,
  "catholic": 0,
  "catholics": 0,
  "cemetery": 0,
  "chav": 2,
  "cheese eating surrender monkey": 2,
  "cheese eating surrender monkies": 2,
  "cheeseeating surrender monkey": 2,
  "cheeseeating surrender monkies": 2,
  "cheesehead": 2,
  "cheeseheads": 2,
  "cherrypopper": 2,
  "chickslick": 2,
  "childrens": 0,
  "chin": 0,
  "china swede": 2,
  "china swedes": 2,
  "chinaman": 2,
  "chinamen": 2,
  "chinaswede": 2,
  "chinaswedes": 2,
  "chinese": 0,
  "chingchong": 2,
  "chingchongs": 2,
  "ching chong": 2,
  "ching chongs": 2,
  "chink": 2,
  "chinks": 2,
  "chinky": 2,
  "choad": 2,
  "chode": 2,
  "chonkies": 2,
  "chonky": 2,
  "chonkys": 2,
  "christ": 0,
  "christ killer": 2,
  "christ killers": 2,
  "christian": 0,
  "chug": 2,
  "chugs": 2,
  "chunger": 2,
  "chungers": 2,
  "chunkies": 2,
  "chunky": 2,
  "chunkys": 2,
  "church": 0,
  "cigarette": 0,
  "cigs": 0,
  "clamdigger": 2,
  "clamdiver": 2,
  "clansman": 2,
  "clansmen": 2,
  "clanswoman": 2,
  "clanswomen": 2,
  "clit": 1,
  "clitoris": 1,
  "clogwog": 2,
  "cocaine": 1,
  "cock": 1,
  "cockblock": 2,
  "cockblocker": 2,
  "cockcowboy": 2,
  "cockfight": 2,
  "cockhead": 2,
  "cockknob": 2,
  "cocklicker": 2,
  "cocklover": 2,
  "cocknob": 2,
  "cockqueen": 2,
  "cockrider": 2,
  "cocksman": 2,
  "cocksmith": 2,
  "cocksmoker": 2,
  "cocksucer": 2,
  "cocksuck": 2,
  "cocksucked": 2,
  "cocksucker": 2,
  "cocksucking": 2,
  "cocktail": 0,
  "cocktease": 2,
  "cocky": 2,
  "coconut": 0,
  "coconuts": 0,
  "cohee": 2,
  "coitus": 1,
  "color": 0,
  "colored": 0,
  "coloured": 0,
  "commie": 2,
  "communist": 0,
  "condom": 1,
  "conservative": 0,
  "conspiracy": 0,
  "coolie": 2,
  "coolies": 2,
  "cooly": 2,
  "coon": 2,
  "coon ass": 2,
  "coon asses": 2,
  "coonass": 2,
  "coonasses": 2,
  "coondog": 2,
  "coons": 2,
  "copulate": 1,
  "cornhole": 2,
  "corruption": 0,
  "cra5h": 1,
  "crabs": 0,
  "crack": 1,
  "cracka": 2,
  "cracker": 1,
  "crackpipe": 1,
  "crackwhore": 2,
  "crap": 2,
  "crapola": 2,
  "crapper": 2,
  "crappy": 2,
  "crash": 0,
  "creamy": 0,
  "crime": 0,
  "crimes": 0,
  "criminal": 0,
  "criminals": 0,
  "crotch": 1,
  "crotchjockey": 2,
  "crotchmonkey": 2,
  "crotchrot": 2,
  "cum": 2,
  "cumbubble": 2,
  "cumfest": 2,
  "cumjockey": 2,
  "cumm": 2,
  "cummer": 2,
  "cumming": 2,
  "cumquat": 2,
  "cumqueen": 2,
  "cumshot": 2,
  "cunilingus": 1,
  "cunillingus": 1,
  "cunn": 2,
  "cunnilingus": 1,
  "cunntt": 2,
  "cunt": 2,
  "cunteyed": 2,
  "cuntfuck": 2,
  "cuntfucker": 2,
  "cuntlick": 2,
  "cuntlicker": 2,
  "cuntlicking": 2,
  "cuntsucker": 2,
  "curry muncher": 2,
  "curry munchers": 2,
  "currymuncher": 2,
  "currymunchers": 2,
  "cushi": 2,
  "cushis": 2,
  "cybersex": 1,
  "cyberslimer": 2,
  "dago": 2,
  "dagos": 2,
  "dahmer": 2,
  "dammit": 2,
  "damn": 1,
  "damnation": 1,
  "damnit": 2,
  "darkey": 2,
  "darkeys": 2,
  "darkie": 2,
  "darkies": 2,
  "darky": 2,
  "datnigga": 2,
  "dead": 0,
  "deapthroat": 2,
  "death": 0,
  "deepthroat": 2,
  "defecate": 1,
  "dego": 2,
  "degos": 2,
  "demon": 1,
  "deposit": 0,
  "desire": 0,
  "destroy": 0,
  "deth": 0,
  "devil": 1,
  "devilworshipper": 1,
  "diaperhead": 2,
  "diaperheads": 2,
  "diaper head": 2,
  "diaper heads": 2,
  "dick": 1,
  "dickbrain": 2,
  "dickforbrains": 2,
  "dickhead": 2,
  "dickless": 2,
  "dicklick": 2,
  "dicklicker": 2,
  "dickman": 2,
  "dickwad": 2,
  "dickweed": 2,
  "diddle": 2,
  "die": 0,
  "died": 0,
  "dies": 0,
  "dike": 1,
  "dildo": 1,
  "dingleberry": 2,
  "dink": 2,
  "dinks": 2,
  "dipshit": 2,
  "dipstick": 2,
  "dirty": 0,
  "disease": 0,
  "diseases": 0,
  "disturbed": 0,
  "dive": 0,
  "dix": 2,
  "dixiedike": 2,
  "dixiedyke": 2,
  "doggiestyle": 2,
  "doggystyle": 2,
  "dong": 2,
  "doodoo": 2,
  "doom": 0,
  "dope": 2,
  "dot head": 2,
  "dot heads": 2,
  "dothead": 2,
  "dotheads": 2,
  "dragqueen": 2,
  "dragqween": 2,
  "dripdick": 2,
  "drug": 1,
  "drunk": 1,
  "drunken": 1,
  "dumb": 2,
  "dumbass": 2,
  "dumbbitch": 2,
  "dumbfuck": 2,
  "dune coon": 2,
  "dune coons": 2,
  "dyefly": 2,
  "dyke": 1,
  "easyslut": 2,
  "eatballs": 2,
  "eatme": 2,
  "eatpussy": 2,
  "ecstacy": 0,
  "eight ball": 2,
  "eight balls": 2,
  "ejaculate": 1,
  "ejaculated": 1,
  "ejaculating": 1,
  "ejaculation": 1,
  "enema": 1,
  "enemy": 0,
  "erect": 0,
  "erection": 1,
  "ero": 2,
  "escort": 0,
  "esqua": 2,
  "ethiopian": 0,
  "ethnic": 0,
  "european": 0,
  "evl": 2,
  "excrement": 1,
  "execute": 0,
  "executed": 0,
  "execution": 0,
  "executioner": 0,
  "exkwew": 2,
  "explosion": 0,
  "facefucker": 2,
  "faeces": 2,
  "fag": 1,
  "fagging": 2,
  "faggot": 2,
  "fagot": 2,
  "failed": 0,
  "failure": 0,
  "fairies": 0,
  "fairy": 0,
  "faith": 0,
  "fannyfucker": 2,
  "fart": 1,
  "farted": 1,
  "farting": 1,
  "farty": 2,
  "fastfuck": 2,
  "fat": 0,
  "fatah": 2,
  "fatass": 2,
  "fatfuck": 2,
  "fatfucker": 2,
  "fatso": 2,
  "fckcum": 2,
  "fear": 0,
  "feces": 1,
  "felatio": 1,
  "felch": 2,
  "felcher": 2,
  "felching": 2,
  "fellatio": 2,
  "feltch": 2,
  "feltcher": 2,
  "feltching": 2,
  "fetish": 1,
  "fight": 0,
  "filipina": 0,
  "filipino": 0,
  "fingerfood": 1,
  "fingerfuck": 2,
  "fingerfucked": 2,
  "fingerfucker": 2,
  "fingerfuckers": 2,
  "fingerfucking": 2,
  "fire": 0,
  "firing": 0,
  "fister": 2,
  "fistfuck": 2,
  "fistfucked": 2,
  "fistfucker": 2,
  "fistfucking": 2,
  "fisting": 2,
  "flange": 2,
  "flasher": 1,
  "flatulence": 1,
  "floo": 2,
  "flydie": 2,
  "flydye": 2,
  "fok": 2,
  "fondle": 1,
  "footaction": 1,
  "footfuck": 2,
  "footfucker": 2,
  "footlicker": 2,
  "footstar": 2,
  "fore": 0,
  "foreskin": 1,
  "forni": 2,
  "fornicate": 1,
  "foursome": 1,
  "fourtwenty": 1,
  "fraud": 0,
  "freakfuck": 2,
  "freakyfucker": 2,
  "freefuck": 2,
  "fruitcake": 1,
  "fu": 2,
  "fubar": 2,
  "fuc": 2,
  "fucck": 2,
  "fuck": 2,
  "fucka": 2,
  "fuckable": 2,
  "fuckbag": 2,
  "fuckbook": 2,
  "fuckbuddy": 2,
  "fucked": 2,
  "fuckedup": 2,
  "fucker": 2,
  "fuckers": 2,
  "fuckface": 2,
  "fuckfest": 2,
  "fuckfreak": 2,
  "fuckfriend": 2,
  "fuckhead": 2,
  "fuckher": 2,
  "fuckin": 2,
  "fuckina": 2,
  "fucking": 2,
  "fuckingbitch": 2,
  "fuckinnuts": 2,
  "fuckinright": 2,
  "fuckit": 2,
  "fuckknob": 2,
  "fuckme": 2,
  "fuckmehard": 2,
  "fuckmonkey": 2,
  "fuckoff": 2,
  "fuckpig": 2,
  "fucks": 2,
  "fucktard": 2,
  "fuckwhore": 2,
  "fuckyou": 2,
  "fudgepacker": 2,
  "fugly": 2,
  "fuk": 2,
  "fuks": 2,
  "funeral": 0,
  "funfuck": 2,
  "fungus": 0,
  "fuuck": 2,
  "gable": 1,
  "gables": 2,
  "gangbang": 2,
  "gangbanged": 2,
  "gangbanger": 2,
  "gangsta": 2,
  "gator bait": 2,
  "gatorbait": 2,
  "gay": 0,
  "gaymuthafuckinwhore": 2,
  "gaysex": 2,
  "geez": 2,
  "geezer": 2,
  "geni": 2,
  "genital": 1,
  "german": 0,
  "getiton": 2,
  "gin": 0,
  "ginzo": 2,
  "ginzos": 2,
  "gipp": 2,
  "gippo": 2,
  "gippos": 2,
  "gipps": 2,
  "girls": 0,
  "givehead": 2,
  "glazeddonut": 2,
  "gob": 1,
  "god": 1,
  "godammit": 2,
  "goddamit": 2,
  "goddammit": 2,
  "goddamn": 2,
  "goddamned": 2,
  "goddamnes": 2,
  "goddamnit": 2,
  "goddamnmuthafucker": 2,
  "goldenshower": 2,
  "golliwog": 2,
  "golliwogs": 2,
  "gonorrehea": 2,
  "gonzagas": 1,
  "gook": 2,
  "gook eye": 2,
  "gook eyes": 2,
  "gookeye": 2,
  "gookeyes": 2,
  "gookies": 2,
  "gooks": 2,
  "gooky": 2,
  "gora": 2,
  "goras": 2,
  "gotohell": 2,
  "goy": 1,
  "goyim": 1,
  "greaseball": 2,
  "greaseballs": 2,
  "greaser": 2,
  "greasers": 2,
  "gringo": 2,
  "gringos": 2,
  "groe": 1,
  "groid": 2,
  "groids": 2,
  "gross": 1,
  "grostulation": 1,
  "gub": 1,
  "gubba": 2,
  "gubbas": 2,
  "gubs": 2,
  "guinea": 1,
  "guineas": 1,
  "guizi": 1,
  "gummer": 2,
  "gun": 0,
  "gwailo": 2,
  "gwailos": 2,
  "gweilo": 2,
  "gweilos": 2,
  "gyopo": 2,
  "gyopos": 2,
  "gyp": 2,
  "gyped": 2,
  "gypo": 2,
  "gypos": 2,
  "gypp": 2,
  "gypped": 2,
  "gyppie": 2,
  "gyppies": 2,
  "gyppo": 2,
  "gyppos": 2,
  "gyppy": 2,
  "gyppys": 2,
  "gypsies": 2,
  "gypsy": 2,
  "gypsys": 2,
  "hadji": 2,
  "hadjis": 2,
  "hairyback": 2,
  "hairybacks": 2,
  "haji": 2,
  "hajis": 2,
  "hajji": 2,
  "hajjis": 2,
  "halfbreed": 2,
  "half breed": 2,
  "halfcaste": 2,
  "half caste": 2,
  "hamas": 1,
  "handjob": 2,
  "haole": 2,
  "haoles": 2,
  "hapa": 2,
  "harder": 0,
  "hardon": 2,
  "harem": 0,
  "headfuck": 2,
  "headlights": 0,
  "hebe": 2,
  "hebes": 2,
  "hebephila": 1,
  "hebephile": 1,
  "hebephiles": 1,
  "hebephilia": 1,
  "hebephilic": 1,
  "heeb": 2,
  "heebs": 2,
  "hell": 0,
  "henhouse": 0,
  "heroin": 1,
  "herpes": 1,
  "heterosexual": 0,
  "hijack": 0,
  "hijacker": 0,
  "hijacking": 0,
  "hillbillies": 2,
  "hillbilly": 2,
  "hindoo": 2,
  "hiscock": 2,
  "hitler": 1,
  "hitlerism": 2,
  "hitlerist": 2,
  "hiv": 1,
  "ho": 2,
  "hobo": 2,
  "hodgie": 2,
  "hoes": 2,
  "hole": 0,
  "holestuffer": 2,
  "homicide": 1,
  "homo": 2,
  "homobangers": 2,
  "homosexual": 1,
  "honger": 2,
  "honk": 0,
  "honkers": 2,
  "honkey": 2,
  "honkeys": 2,
  "honkie": 2,
  "honkies": 2,
  "honky": 2,
  "hook": 0,
  "hooker": 2,
  "hookers": 2,
  "hooters": 2,
  "hore": 2,
  "hori": 2,
  "horis": 2,
  "hork": 2,
  "horn": 0,
  "horney": 2,
  "horniest": 2,
  "horny": 1,
  "horseshit": 2,
  "hosejob": 2,
  "hoser": 2,
  "hostage": 0,
  "hotdamn": 2,
  "hotpussy": 2,
  "hottotrot": 2,
  "hummer": 0,
  "hun": 0,
  "huns": 0,
  "husky": 0,
  "hussy": 2,
  "hustler": 0,
  "hymen": 1,
  "hymie": 2,
  "hymies": 2,
  "iblowu": 2,
  "idiot": 2,
  "ike": 1,
  "ikes": 1,
  "ikey": 1,
  "ikeymo": 2,
  "ikeymos": 2,
  "ikwe": 2,
  "illegal": 0,
  "illegals": 1,
  "incest": 1,
  "indon": 2,
  "indons": 2,
  "injun": 2,
  "injuns": 2,
  "insest": 2,
  "intercourse": 1,
  "interracial": 1,
  "intheass": 2,
  "inthebuff": 2,
  "israel": 0,
  "israeli": 0,
  "israels": 0,
  "italiano": 1,
  "itch": 0,
  "jackass": 2,
  "jackoff": 2,
  "jackshit": 2,
  "jacktheripper": 2,
  "jade": 0,
  "jap": 2,
  "japanese": 0,
  "japcrap": 2,
  "japie": 2,
  "japies": 2,
  "japs": 2,
  "jebus": 2,
  "jeez": 2,
  "jerkoff": 2,
  "jerries": 1,
  "jerry": 0,
  "jesus": 1,
  "jesuschrist": 1,
  "jew": 0,
  "jewed": 2,
  "jewess": 2,
  "jewish": 0,
  "jig": 2,
  "jiga": 2,
  "jigaboo": 2,
  "jigaboos": 2,
  "jigarooni": 2,
  "jigaroonis": 2,
  "jigg": 2,
  "jigga": 2,
  "jiggabo": 2,
  "jiggabos": 2,
  "jiggas": 2,
  "jigger": 2,
  "jiggers": 2,
  "jiggs": 2,
  "jiggy": 2,
  "jigs": 2,
  "jihad": 1,
  "jijjiboo": 2,
  "jijjiboos": 2,
  "jimfish": 2,
  "jism": 2,
  "jiz": 2,
  "jizim": 2,
  "jizjuice": 2,
  "jizm": 2,
  "jizz": 2,
  "jizzim": 2,
  "jizzum": 2,
  "joint": 0,
  "juggalo": 2,
  "jugs": 0,
  "jungle bunnies": 2,
  "jungle bunny": 2,
  "junglebunny": 2,
  "kacap": 2,
  "kacapas": 2,
  "kacaps": 2,
  "kaffer": 2,
  "kaffir": 2,
  "kaffre": 2,
  "kafir": 2,
  "kanake": 2,
  "katsap": 2,
  "katsaps": 2,
  "khokhol": 2,
  "khokhols": 2,
  "kid": 0,
  "kigger": 2,
  "kike": 2,
  "kikes": 2,
  "kill": 0,
  "killed": 0,
  "killer": 0,
  "killing": 0,
  "kills": 0,
  "kimchi": 0,
  "kimchis": 2,
  "kink": 1,
  "kinky": 1,
  "kissass": 2,
  "kkk": 2,
  "klansman": 2,
  "klansmen": 2,
  "klanswoman": 2,
  "klanswomen": 2,
  "knife": 0,
  "knockers": 1,
  "kock": 1,
  "kondum": 2,
  "koon": 2,
  "kotex": 1,
  "krap": 2,
  "krappy": 2,
  "kraut": 1,
  "krauts": 2,
  "kuffar": 2,
  "kum": 2,
  "kumbubble": 2,
  "kumbullbe": 2,
  "kummer": 2,
  "kumming": 2,
  "kumquat": 2,
  "kums": 2,
  "kunilingus": 2,
  "kunnilingus": 2,
  "kunt": 2,
  "kushi": 2,
  "kushis": 2,
  "kwa": 2,
  "kwai lo": 2,
  "kwai los": 2,
  "ky": 1,
  "kyke": 2,
  "kykes": 2,
  "kyopo": 2,
  "kyopos": 2,
  "lactate": 1,
  "laid": 0,
  "lapdance": 1,
  "latin": 0,
  "lebo": 2,
  "lebos": 2,
  "lesbain": 2,
  "lesbayn": 2,
  "lesbian": 0,
  "lesbin": 2,
  "lesbo": 2,
  "lez": 2,
  "lezbe": 2,
  "lezbefriends": 2,
  "lezbo": 2,
  "lezz": 2,
  "lezzo": 2,
  "liberal": 0,
  "libido": 1,
  "licker": 1,
  "lickme": 2,
  "lies": 0,
  "limey": 2,
  "limpdick": 2,
  "limy": 2,
  "lingerie": 0,
  "liquor": 1,
  "livesex": 2,
  "loadedgun": 2,
  "lolita": 1,
  "looser": 2,
  "loser": 2,
  "lotion": 0,
  "lovebone": 2,
  "lovegoo": 2,
  "lovegun": 2,
  "lovejuice": 2,
  "lovemuscle": 2,
  "lovepistol": 2,
  "loverocket": 2,
  "lowlife": 2,
  "lsd": 1,
  "lubejob": 2,
  "lubra": 2,
  "lucifer": 0,
  "luckycammeltoe": 2,
  "lugan": 2,
  "lugans": 2,
  "lynch": 1,
  "mabuno": 2,
  "mabunos": 2,
  "macaca": 2,
  "macacas": 2,
  "mad": 0,
  "mafia": 1,
  "magicwand": 2,
  "mahbuno": 2,
  "mahbunos": 2,
  "mams": 2,
  "manhater": 2,
  "manpaste": 2,
  "marijuana": 1,
  "mastabate": 2,
  "mastabater": 2,
  "masterbate": 2,
  "masterblaster": 2,
  "mastrabator": 2,
  "masturbate": 2,
  "masturbating": 2,
  "mattressprincess": 2,
  "mau mau": 2,
  "mau maus": 2,
  "maumau": 2,
  "maumaus": 2,
  "meatbeatter": 2,
  "meatrack": 2,
  "meth": 1,
  "mexican": 0,
  "mgger": 2,
  "mggor": 2,
  "mick": 1,
  "mickeyfinn": 2,
  "mideast": 0,
  "milf": 2,
  "minority": 0,
  "mockey": 2,
  "mockie": 2,
  "mocky": 2,
  "mofo": 2,
  "moky": 2,
  "moles": 0,
  "molest": 1,
  "molestation": 1,
  "molester": 1,
  "molestor": 1,
  "moneyshot": 2,
  "moon cricket": 2,
  "moon crickets": 2,
  "mooncricket": 2,
  "mooncrickets": 2,
  "mormon": 0,
  "moron": 2,
  "moskal": 2,
  "moskals": 2,
  "moslem": 2,
  "mosshead": 2,
  "mothafuck": 2,
  "mothafucka": 2,
  "mothafuckaz": 2,
  "mothafucked": 2,
  "mothafucker": 2,
  "mothafuckin": 2,
  "mothafucking": 2,
  "mothafuckings": 2,
  "motherfuck": 2,
  "motherfucked": 2,
  "motherfucker": 2,
  "motherfuckin": 2,
  "motherfucking": 2,
  "motherfuckings": 2,
  "motherlovebone": 2,
  "muff": 2,
  "muffdive": 2,
  "muffdiver": 2,
  "muffindiver": 2,
  "mufflikcer": 2,
  "mulatto": 2,
  "muncher": 2,
  "munt": 2,
  "murder": 1,
  "murderer": 1,
  "muslim": 0,
  "mzungu": 2,
  "mzungus": 2,
  "naked": 0,
  "narcotic": 1,
  "nasty": 0,
  "nastybitch": 2,
  "nastyho": 2,
  "nastyslut": 2,
  "nastywhore": 2,
  "nazi": 1,
  "necro": 1,
  "negres": 2,
  "negress": 2,
  "negro": 2,
  "negroes": 2,
  "negroid": 2,
  "negros": 2,
  "nig": 2,
  "nigar": 2,
  "nigars": 2,
  "niger": 0,
  "nigerian": 1,
  "nigerians": 1,
  "nigers": 2,
  "nigette": 2,
  "nigettes": 2,
  "nigg": 2,
  "nigga": 2,
  "niggah": 2,
  "niggahs": 2,
  "niggar": 2,
  "niggaracci": 2,
  "niggard": 2,
  "niggarded": 2,
  "niggarding": 2,
  "niggardliness": 2,
  "niggardlinesss": 2,
  "niggardly": 0,
  "niggards": 2,
  "niggars": 2,
  "niggas": 2,
  "niggaz": 2,
  "nigger": 2,
  "niggerhead": 2,
  "niggerhole": 2,
  "niggers": 2,
  "niggle": 2,
  "niggled": 2,
  "niggles": 2,
  "niggling": 2,
  "nigglings": 2,
  "niggor": 2,
  "niggress": 2,
  "niggresses": 2,
  "nigguh": 2,
  "nigguhs": 2,
  "niggur": 2,
  "niggurs": 2,
  "niglet": 2,
  "nignog": 2,
  "nigor": 2,
  "nigors": 2,
  "nigr": 2,
  "nigra": 2,
  "nigras": 2,
  "nigre": 2,
  "nigres": 2,
  "nigress": 2,
  "nigs": 2,
  "nip": 2,
  "nipple": 1,
  "nipplering": 1,
  "nittit": 2,
  "nlgger": 2,
  "nlggor": 2,
  "nofuckingway": 2,
  "nook": 1,
  "nookey": 2,
  "nookie": 2,
  "noonan": 2,
  "nooner": 1,
  "nude": 1,
  "nudger": 2,
  "nuke": 1,
  "nutfucker": 2,
  "nymph": 1,
  "ontherag": 2,
  "oral": 1,
  "oreo": 0,
  "oreos": 0,
  "orga": 2,
  "orgasim": 2,
  "orgasm": 1,
  "orgies": 1,
  "orgy": 1,
  "osama": 0,
  "paddy": 1,
  "paederastic": 1,
  "paederasts": 1,
  "paederasty": 1,
  "paki": 2,
  "pakis": 2,
  "palesimian": 2,
  "palestinian": 0,
  "pancake face": 2,
  "pancake faces": 2,
  "pansies": 2,
  "pansy": 2,
  "panti": 2,
  "panties": 0,
  "payo": 2,
  "pearlnecklace": 1,
  "peck": 1,
  "pecker": 1,
  "peckerwood": 2,
  "pederastic": 1,
  "pederasts": 1,
  "pederasty": 1,
  "pedo": 2,
  "pedophile": 1,
  "pedophiles": 1,
  "pedophilia": 1,
  "pedophilic": 1,
  "pee": 1,
  "peehole": 2,
  "peepee": 2,
  "peepshow": 1,
  "peepshpw": 2,
  "pendy": 1,
  "penetration": 1,
  "peni5": 2,
  "penile": 2,
  "penis": 2,
  "penises": 2,
  "penthouse": 0,
  "period": 0,
  "perv": 2,
  "phonesex": 1,
  "phuk": 2,
  "phuked": 2,
  "phuking": 2,
  "phukked": 2,
  "phukking": 2,
  "phungky": 2,
  "phuq": 2,
  "pi55": 2,
  "picaninny": 2,
  "piccaninny": 2,
  "pickaninnies": 2,
  "pickaninny": 2,
  "piefke": 2,
  "piefkes": 2,
  "piker": 2,
  "pikey": 2,
  "piky": 2,
  "pimp": 2,
  "pimped": 2,
  "pimper": 2,
  "pimpjuic": 2,
  "pimpjuice": 2,
  "pimpsimp": 2,
  "pindick": 2,
  "piss": 2,
  "pissed": 2,
  "pisser": 2,
  "pisses": 2,
  "pisshead": 2,
  "pissin": 2,
  "pissing": 2,
  "pissoff": 2,
  "pistol": 1,
  "pixie": 1,
  "pixy": 1,
  "playboy": 1,
  "playgirl": 1,
  "pocha": 2,
  "pochas": 2,
  "pocho": 2,
  "pochos": 2,
  "pocketpool": 2,
  "pohm": 2,
  "pohms": 2,
  "polack": 2,
  "polacks": 2,
  "pollock": 2,
  "pollocks": 2,
  "pom": 2,
  "pommie": 2,
  "pommie grant": 2,
  "pommie grants": 2,
  "pommies": 2,
  "pommy": 2,
  "poms": 2,
  "poo": 2,
  "poon": 2,
  "poontang": 2,
  "poop": 2,
  "pooper": 2,
  "pooperscooper": 2,
  "pooping": 2,
  "poorwhitetrash": 2,
  "popimp": 2,
  "porch monkey": 2,
  "porch monkies": 2,
  "porchmonkey": 2,
  "porn": 1,
  "pornflick": 1,
  "pornking": 2,
  "porno": 1,
  "pornography": 1,
  "pornprincess": 2,
  "pot": 0,
  "poverty": 0,
  "prairie nigger": 2,
  "prairie niggers": 2,
  "premature": 0,
  "pric": 2,
  "prick": 2,
  "prickhead": 2,
  "primetime": 0,
  "propaganda": 0,
  "pros": 0,
  "prostitute": 1,
  "protestant": 1,
  "pu55i": 2,
  "pu55y": 2,
  "pube": 1,
  "pubic": 1,
  "pubiclice": 2,
  "pud": 2,
  "pudboy": 2,
  "pudd": 2,
  "puddboy": 2,
  "puke": 2,
  "puntang": 2,
  "purinapricness": 2,
  "puss": 2,
  "pussie": 2,
  "pussies": 2,
  "pussy": 1,
  "pussycat": 1,
  "pussyeater": 2,
  "pussyfucker": 2,
  "pussylicker": 2,
  "pussylips": 2,
  "pussylover": 2,
  "pussypounder": 2,
  "pusy": 2,
  "quashie": 2,
  "que": 0,
  "queef": 2,
  "queer": 1,
  "quickie": 2,
  "quim": 2,
  "ra8s": 2,
  "rabbi": 0,
  "racial": 0,
  "racist": 1,
  "radical": 1,
  "radicals": 1,
  "raghead": 2,
  "ragheads": 2,
  "randy": 1,
  "rape": 1,
  "raped": 1,
  "raper": 2,
  "rapist": 1,
  "rearend": 2,
  "rearentry": 2,
  "rectum": 1,
  "redleg": 2,
  "redlegs": 2,
  "redlight": 0,
  "redneck": 2,
  "rednecks": 2,
  "redskin": 2,
  "redskins": 2,
  "reefer": 2,
  "reestie": 2,
  "refugee": 0,
  "reject": 0,
  "remains": 0,
  "rentafuck": 2,
  "republican": 0,
  "rere": 2,
  "retard": 2,
  "retarded": 2,
  "ribbed": 1,
  "rigger": 2,
  "rimjob": 2,
  "rimming": 2,
  "roach": 0,
  "robber": 0,
  "round eyes": 2,
  "roundeye": 2,
  "rump": 0,
  "russki": 2,
  "russkie": 2,
  "sadis": 2,
  "sadom": 2,
  "sambo": 2,
  "sambos": 2,
  "samckdaddy": 2,
  "sand nigger": 2,
  "sand niggers": 2,
  "sandm": 2,
  "sandnigger": 2,
  "satan": 1,
  "scag": 1,
  "scallywag": 2,
  "scat": 1,
  "schlong": 2,
  "schvartse": 2,
  "schvartsen": 2,
  "schwartze": 2,
  "schwartzen": 2,
  "screw": 1,
  "screwyou": 2,
  "scrotum": 1,
  "scum": 1,
  "semen": 1,
  "seppo": 2,
  "seppos": 2,
  "septic": 1,
  "septics": 1,
  "servant": 0,
  "sex": 1,
  "sexed": 2,
  "sexfarm": 2,
  "sexhound": 2,
  "sexhouse": 1,
  "sexing": 2,
  "sexkitten": 2,
  "sexpot": 2,
  "sexslave": 2,
  "sextogo": 2,
  "sextoy": 1,
  "sextoys": 1,
  "sexual": 1,
  "sexually": 1,
  "sexwhore": 2,
  "sexy": 1,
  "sexymoma": 2,
  "sexyslim": 2,
  "shag": 1,
  "shaggin": 2,
  "shagging": 2,
  "shat": 2,
  "shav": 2,
  "shawtypimp": 2,
  "sheeney": 2,
  "shhit": 2,
  "shinola": 1,
  "shit": 1,
  "shitcan": 2,
  "shitdick": 2,
  "shite": 2,
  "shiteater": 2,
  "shited": 2,
  "shitface": 2,
  "shitfaced": 2,
  "shitfit": 2,
  "shitforbrains": 2,
  "shitfuck": 2,
  "shitfucker": 2,
  "shitfull": 2,
  "shithapens": 2,
  "shithappens": 2,
  "shithead": 2,
  "shithouse": 2,
  "shiting": 2,
  "shitlist": 2,
  "shitola": 2,
  "shitoutofluck": 2,
  "shits": 2,
  "shitstain": 2,
  "shitted": 2,
  "shitter": 2,
  "shitting": 2,
  "shitty": 2,
  "shoot": 0,
  "shooting": 0,
  "shortfuck": 2,
  "showtime": 0,
  "shylock": 2,
  "shylocks": 2,
  "sick": 0,
  "sissy": 2,
  "sixsixsix": 2,
  "sixtynine": 2,
  "sixtyniner": 2,
  "skank": 2,
  "skankbitch": 2,
  "skankfuck": 2,
  "skankwhore": 2,
  "skanky": 2,
  "skankybitch": 2,
  "skankywhore": 2,
  "skinflute": 2,
  "skum": 2,
  "skumbag": 2,
  "skwa": 2,
  "skwe": 2,
  "slant": 0,
  "slanty": 2,
  "slanteye": 2,
  "slapper": 2,
  "slaughter": 1,
  "slav": 2,
  "slave": 2,
  "slavedriver": 2,
  "sleezebag": 2,
  "sleezeball": 2,
  "slideitin": 2,
  "slime": 0,
  "slimeball": 2,
  "slimebucket": 2,
  "slope": 0,
  "slopehead": 2,
  "slopeheads": 2,
  "sloper": 2,
  "slopers": 2,
  "slopes": 0,
  "slopey": 2,
  "slopeys": 2,
  "slopies": 2,
  "slopy": 2,
  "slut": 2,
  "sluts": 2,
  "slutt": 2,
  "slutting": 2,
  "slutty": 2,
  "slutwear": 2,
  "slutwhore": 2,
  "smack": 1,
  "smackthemonkey": 2,
  "smut": 2,
  "snatch": 1,
  "snatchpatch": 2,
  "snigger": 0,
  "sniggered": 0,
  "sniggering": 0,
  "sniggers": 1,
  "sniper": 0,
  "snot": 0,
  "snowback": 2,
  "snownigger": 2,
  "sob": 0,
  "sodom": 1,
  "sodomise": 2,
  "sodomite": 1,
  "sodomize": 2,
  "sodomy": 2,
  "sonofabitch": 2,
  "sonofbitch": 2,
  "sooties": 2,
  "sooty": 2,
  "sos": 0,
  "soviet": 0,
  "spa": 0,
  "spade": 1,
  "spades": 1,
  "spaghettibender": 2,
  "spaghettinigger": 2,
  "spank": 1,
  "spankthemonkey": 2,
  "spearchucker": 2,
  "spearchuckers": 2,
  "sperm": 1,
  "spermacide": 2,
  "spermbag": 2,
  "spermhearder": 2,
  "spermherder": 2,
  "spic": 2,
  "spics": 2,
  "spick": 2,
  "spicks": 2,
  "spig": 2,
  "spigotty": 2,
  "spik": 2,
  "spit": 2,
  "spitter": 2,
  "splittail": 2,
  "spooge": 2,
  "spreadeagle": 2,
  "spunk": 2,
  "spunky": 2,
  "sqeh": 2,
  "squa": 2,
  "squarehead": 2,
  "squareheads": 2,
  "squaw": 2,
  "squinty": 2,
  "stagg": 1,
  "stiffy": 1,
  "strapon": 1,
  "stringer": 2,
  "stripclub": 2,
  "stroke": 0,
  "stroking": 1,
  "stuinties": 2,
  "stupid": 2,
  "stupidfuck": 2,
  "stupidfucker": 2,
  "suck": 1,
  "suckdick": 2,
  "sucker": 2,
  "suckme": 2,
  "suckmyass": 2,
  "suckmydick": 2,
  "suckmytit": 2,
  "suckoff": 2,
  "suicide": 1,
  "swallow": 1,
  "swallower": 2,
  "swalow": 2,
  "swamp guinea": 2,
  "swamp guineas": 2,
  "swastika": 1,
  "sweetness": 0,
  "syphilis": 1,
  "taboo": 0,
  "tacohead": 2,
  "tacoheads": 2,
  "taff": 2,
  "tampon": 0,
  "tang": 2,
  "tantra": 1,
  "tar babies": 2,
  "tar baby": 2,
  "tarbaby": 2,
  "tard": 2,
  "teat": 1,
  "terror": 0,
  "terrorist": 1,
  "teste": 2,
  "testicle": 1,
  "testicles": 1,
  "thicklip": 2,
  "thicklips": 2,
  "thirdeye": 2,
  "thirdleg": 2,
  "threesome": 1,
  "threeway": 2,
  "timber nigger": 2,
  "timber niggers": 2,
  "timbernigger": 2,
  "tinkle": 1,
  "tit": 1,
  "titbitnipply": 2,
  "titfuck": 2,
  "titfucker": 2,
  "titfuckin": 2,
  "titjob": 2,
  "titlicker": 2,
  "titlover": 2,
  "tits": 1,
  "tittie": 2,
  "titties": 2,
  "titty": 2,
  "tnt": 1,
  "toilet": 0,
  "tongethruster": 2,
  "tongue": 0,
  "tonguethrust": 2,
  "tonguetramp": 2,
  "tortur": 2,
  "torture": 1,
  "tosser": 2,
  "towel head": 2,
  "towel heads": 2,
  "towelhead": 2,
  "trailertrash": 2,
  "tramp": 1,
  "trannie": 2,
  "tranny": 2,
  "transexual": 0,
  "transsexual": 0,
  "transvestite": 2,
  "triplex": 2,
  "trisexual": 1,
  "trojan": 0,
  "trots": 1,
  "tuckahoe": 2,
  "tunneloflove": 2,
  "turd": 1,
  "turnon": 2,
  "twat": 2,
  "twink": 2,
  "twinkie": 2,
  "twobitwhore": 2,
  "uck": 2,
  "uk": 0,
  "ukrop": 2,
  "uncle tom": 2,
  "unfuckable": 2,
  "upskirt": 2,
  "uptheass": 2,
  "upthebutt": 2,
  "urinary": 0,
  "urinate": 0,
  "urine": 0,
  "usama": 2,
  "uterus": 1,
  "vagina": 1,
  "vaginal": 1,
  "vatican": 0,
  "vibr": 2,
  "vibrater": 2,
  "vibrator": 1,
  "vietcong": 0,
  "violence": 0,
  "virgin": 0,
  "virginbreaker": 2,
  "vomit": 2,
  "vulva": 1,
  "wab": 2,
  "wank": 2,
  "wanker": 2,
  "wanking": 2,
  "waysted": 2,
  "weapon": 0,
  "weenie": 2,
  "weewee": 2,
  "welcher": 2,
  "welfare": 2,
  "wetb": 2,
  "wetback": 2,
  "wetbacks": 2,
  "wetspot": 2,
  "whacker": 2,
  "whash": 2,
  "whigger": 2,
  "whiggers": 2,
  "whiskey": 0,
  "whiskeydick": 2,
  "whiskydick": 2,
  "whit": 1,
  "white trash": 2,
  "whitenigger": 2,
  "whites": 1,
  "whitetrash": 2,
  "whitey": 2,
  "whiteys": 2,
  "whities": 2,
  "whiz": 2,
  "whop": 2,
  "whore": 2,
  "whorefucker": 2,
  "whorehouse": 2,
  "wigga": 2,
  "wiggas": 2,
  "wigger": 2,
  "wiggers": 2,
  "willie": 2,
  "williewanker": 2,
  "willy": 1,
  "wn": 2,
  "wog": 2,
  "wogs": 2,
  "womens": 0,
  "wop": 2,
  "wtf": 2,
  "wuss": 2,
  "wuzzie": 2,
  "xkwe": 2,
  "xtc": 1,
  "xxx": 1,
  "yank": 2,
  "yankee": 1,
  "yankees": 1,
  "yanks": 2,
  "yarpie": 2,
  "yarpies": 2,
  "yellowman": 2,
  "yid": 2,
  "yids": 2,
  "zigabo": 2,
  "zigabos": 2,
  "zipperhead": 2,
  "zipperheads": 2
}

},{}],5:[function(require,module,exports){
'use strict';

module.exports = require('./lib')

},{"./lib":10}],6:[function(require,module,exports){
'use strict';

var asap = require('asap/raw');

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another promise, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;

function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('Promise constructor\'s argument is not a function');
  }
  this._75 = 0;
  this._83 = 0;
  this._18 = null;
  this._38 = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._47 = null;
Promise._71 = null;
Promise._44 = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
}
function handle(self, deferred) {
  while (self._83 === 3) {
    self = self._18;
  }
  if (Promise._47) {
    Promise._47(self);
  }
  if (self._83 === 0) {
    if (self._75 === 0) {
      self._75 = 1;
      self._38 = deferred;
      return;
    }
    if (self._75 === 1) {
      self._75 = 2;
      self._38 = [self._38, deferred];
      return;
    }
    self._38.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._83 === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._83 === 1) {
        resolve(deferred.promise, self._18);
      } else {
        reject(deferred.promise, self._18);
      }
      return;
    }
    var ret = tryCallOne(cb, self._18);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}
function resolve(self, newValue) {
  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._83 = 3;
      self._18 = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._83 = 1;
  self._18 = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._83 = 2;
  self._18 = newValue;
  if (Promise._71) {
    Promise._71(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._75 === 1) {
    handle(self, self._38);
    self._38 = null;
  }
  if (self._75 === 2) {
    for (var i = 0; i < self._38.length; i++) {
      handle(self, self._38[i]);
    }
    self._38 = null;
  }
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, promise) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  });
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}

},{"asap/raw":3}],7:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this;
  self.then(null, function (err) {
    setTimeout(function () {
      throw err;
    }, 0);
  });
};

},{"./core.js":6}],8:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._44);
  p._83 = 1;
  p._18 = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._83 === 3) {
            val = val._18;
          }
          if (val._83 === 1) return res(i, val._18);
          if (val._83 === 2) reject(val._18);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

},{"./core.js":6}],9:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype['finally'] = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
};

},{"./core.js":6}],10:[function(require,module,exports){
'use strict';

module.exports = require('./core.js');
require('./done.js');
require('./finally.js');
require('./es6-extensions.js');
require('./node-extensions.js');
require('./synchronous.js');

},{"./core.js":6,"./done.js":7,"./es6-extensions.js":8,"./finally.js":9,"./node-extensions.js":11,"./synchronous.js":12}],11:[function(require,module,exports){
'use strict';

// This file contains then/promise specific extensions that are only useful
// for node.js interop

var Promise = require('./core.js');
var asap = require('asap');

module.exports = Promise;

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  if (
    typeof argumentCount === 'number' && argumentCount !== Infinity
  ) {
    return denodeifyWithCount(fn, argumentCount);
  } else {
    return denodeifyWithoutCount(fn);
  }
};

var callbackFn = (
  'function (err, res) {' +
  'if (err) { rj(err); } else { rs(res); }' +
  '}'
);
function denodeifyWithCount(fn, argumentCount) {
  var args = [];
  for (var i = 0; i < argumentCount; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'return new Promise(function (rs, rj) {',
    'var res = fn.call(',
    ['self'].concat(args).concat([callbackFn]).join(','),
    ');',
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');
  return Function(['Promise', 'fn'], body)(Promise, fn);
}
function denodeifyWithoutCount(fn) {
  var fnLength = Math.max(fn.length - 1, 3);
  var args = [];
  for (var i = 0; i < fnLength; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'var args;',
    'var argLength = arguments.length;',
    'if (arguments.length > ' + fnLength + ') {',
    'args = new Array(arguments.length + 1);',
    'for (var i = 0; i < arguments.length; i++) {',
    'args[i] = arguments[i];',
    '}',
    '}',
    'return new Promise(function (rs, rj) {',
    'var cb = ' + callbackFn + ';',
    'var res;',
    'switch (argLength) {',
    args.concat(['extra']).map(function (_, index) {
      return (
        'case ' + (index) + ':' +
        'res = fn.call(' + ['self'].concat(args.slice(0, index)).concat('cb').join(',') + ');' +
        'break;'
      );
    }).join(''),
    'default:',
    'args[argLength] = cb;',
    'res = fn.apply(self, args);',
    '}',
    
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');

  return Function(
    ['Promise', 'fn'],
    body
  )(Promise, fn);
}

Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var callback =
      typeof args[args.length - 1] === 'function' ? args.pop() : null;
    var ctx = this;
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx);
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) {
          reject(ex);
        });
      } else {
        asap(function () {
          callback.call(ctx, ex);
        })
      }
    }
  }
};

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this;

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value);
    });
  }, function (err) {
    asap(function () {
      callback.call(ctx, err);
    });
  });
};

},{"./core.js":6,"asap":2}],12:[function(require,module,exports){
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.enableSynchronous = function () {
  Promise.prototype.isPending = function() {
    return this.getState() == 0;
  };

  Promise.prototype.isFulfilled = function() {
    return this.getState() == 1;
  };

  Promise.prototype.isRejected = function() {
    return this.getState() == 2;
  };

  Promise.prototype.getValue = function () {
    if (this._83 === 3) {
      return this._18.getValue();
    }

    if (!this.isFulfilled()) {
      throw new Error('Cannot get a value of an unfulfilled promise.');
    }

    return this._18;
  };

  Promise.prototype.getReason = function () {
    if (this._83 === 3) {
      return this._18.getReason();
    }

    if (!this.isRejected()) {
      throw new Error('Cannot get a rejection reason of a non-rejected promise.');
    }

    return this._18;
  };

  Promise.prototype.getState = function () {
    if (this._83 === 3) {
      return this._18.getState();
    }
    if (this._83 === -1 || this._83 === -2) {
      return 0;
    }

    return this._83;
  };
};

Promise.disableSynchronous = function() {
  Promise.prototype.isPending = undefined;
  Promise.prototype.isFulfilled = undefined;
  Promise.prototype.isRejected = undefined;
  Promise.prototype.getValue = undefined;
  Promise.prototype.getReason = undefined;
  Promise.prototype.getState = undefined;
};

},{"./core.js":6}],13:[function(require,module,exports){
'use strict';

var Promise = require('promise');

/**
 * run through some placeholder subjects and set the placeholder to the value
 * if they click on it
 * @param  {DOM} input a DOM input
 * @return {Promise}
 */
module.exports = function placeholderKickoff(input) {
  var focusable = true;
  input.addEventListener('focus', function () {
    if (focusable) {
      input.value = input.placeholder;
    }
    focusable = false;
  });

  return typePlaceholder(input, 'Hello my associates, trampolines are for sale!').then(function () {
    return typePlaceholder(input, 'With such a huge assortment of new items, you\'ll never get bored');
  }).then(function () {
    focusable = false;
    return typePlaceholder(input, 'Your Subject...', false);
  });
};

function typePlaceholder(input, placeholder) {
  var shouldErase = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  var char = 0;
  return new Promise(function (resolve) {
    var interval = setInterval(function () {
      if (char >= placeholder.length) {
        clearInterval(interval);
        return shouldErase ? erase(input).then(resolve) : false;
      }

      input.placeholder = input.placeholder + placeholder[char++];
    }, 60);
  });
}

function erase(input) {
  return new Promise(function (resolve) {
    return setTimeout(function () {
      var interval = setInterval(function () {
        if (input.placeholder.length === 0) {
          clearInterval(interval);

          return setTimeout(function () {
            return resolve();
          }, 1000);
        }

        input.placeholder = input.placeholder.substr(0, input.placeholder.length - 1);
      }, 20);
    }, 3000);
  });
}

},{"promise":5}]},{},[1]);
