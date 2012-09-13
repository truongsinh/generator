/*!
 * Copyright (c) 2011, 2012 Benjamin Dumke-von der Ehe
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
 
(function () {

    var arrIndexOf;
    if (Array.prototype.indexOf) {
        arrIndexOf = function (arr, val) { return arr.indexOf(val); };
    } else {
        arrIndexOf = function (arr, val) {
            var len = arr.length;
            for (var i = 0; i < len; i++)
                if (i in arr && arr[i] === val)
                    return i;
            return -1;
        };
    }

    // For Firefox < 1.5, IE < 9
    // Production steps of ECMA-262, Edition 5, 15.4.4.18
    // Reference: http://es5.github.com/#x15.4.4.18
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(callback, thisArg) {
            var T, k;
            if (this == null) {
                throw new TypeError("this is null or not defined");
            }
            // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
            var O = Object(this);
            // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;
            // Hack to convert O.length to a UInt32
            // 4. If IsCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if ( {}.toString.call(callback) != "[object Function]") {
                throw new TypeError(callback + " is not a function");
            }
            // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
            if (thisArg) {
                T = thisArg;
            }
            // 6. Let k be 0
            k = 0;
            // 7. Repeat, while k < len
            while (k < len) {
                var kValue;
                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                if ( k in O) {
                    // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
                    kValue = O[k];
                    // ii. Call the Call internal method of callback with T as the this value and
                    // argument list containing kValue, k, and O.
                    callback.call(T, kValue, k, O);
                }
                // d. Increase k by 1.
                k++;
            }
            // 8. return undefined
            return undefined;
        };
    }
    // For those who use myVar.toArray() without knowing whether it is array or generator
    Array.prototype.toArray = function(){
        return this;
    };
    var BreakIteration = {};

    var Generator = function (params, source) {
        if (!(this instanceof Generator))
            return new Generator(params, source);
        // If given both params and function
        if ( typeof source === "function") {
            this.forEach = makeForEach_fromFunction(params, source);
        }
        else if (typeof params === "function")
            this.forEach = makeForEach_fromFunction(params);
        else if (params.constructor === Array)
            this.forEach = makeForEach_fromArray(params);
        else
            this.forEach = makeForEach_fromObject(params);
    };
    
    var asGenerator = function (source) {
        if (source instanceof Generator)
            return source;
            
        return new Generator(source);
    };

    var stopIteration = function () {
        throw BreakIteration; 
    };
    
    var IterationError = function (message) {
        this.message = message;
        this.name = "IterationError";
    };
    IterationError.prototype = Error.prototype;

    var makeForEach_fromFunction = function (p, f) {
        if ( typeof p === "function") {
        	f = p;
        	p = [];
        }
        // If params is not given in array
        else if (!(p instanceof Array)) {
            throw new TypeError('Params must be in array');
        }
        return function (g, thisObj) {
            var stopped = false,
                index = 0,
                Yield = function (val) {
                    if (stopped)
                        throw new IterationError("yield after end of iteration");
                    var send = g.call(thisObj, val, index, stopIteration);
                    index++;
                    return send;
                },
                yieldMany = function (source) {
                    asGenerator(source).forEach(function (val) { Yield(val); })
                };
            try {
                f.apply(this, p.concat([Yield, yieldMany, stopIteration]));
            } catch (ex) {
                if (ex !== BreakIteration)
                    throw ex;
            } finally {
                stopped = true;
            }
        };
    };
    
    var makeForEach_fromArray = function (arr) {
        return makeForEach_fromFunction(function (Yield) {
            var len = arr.length;
            for (var i = 0; i < len; i++)
                if (i in arr)
                    Yield(arr[i]);
        });
    };
    
    var makeForEach_fromObject = function (obj) {
        return makeForEach_fromFunction(function (Yield) {
            for (var key in obj)
                if (obj.hasOwnProperty(key))
                    Yield([key, obj[key]]);
        });
    };
    
    var selector = function (f) {
        if (typeof f === "string")
            return function (o) { return o[f]; }
        return f;
    }

    Generator.prototype = {
        toArray: function () {
            var result = [];
            this.forEach(function (val) { result.push(val); });
            return result;
        },
        filter: function (pred, thisObj) {
            var source = this;
            pred = selector(pred);
            return new Generator(function (Yield) {
                source.forEach(function (val) {
                    if (pred.call(thisObj, val))
                        Yield(val);
                });
            });
        },
        take: function (n) {
            var source = this;
            return new Generator(function (Yield) {
                source.forEach(function (val, index, stop) {
                    if (index >= n)
                        stop();
                    Yield(val);
                });
            });
        },
        skip: function (n) {
            var source = this;
            return new Generator(function (Yield) {
                source.forEach(function(val, index) {
                    if (index >= n)
                        Yield(val);
                });
            });
        },
        map: function (f, thisObj) {
            var source = this;
            f = selector(f);
            return new Generator(function (Yield) {
                source.forEach(function (val) {
                    Yield(f.call(thisObj, val));
                });
            });
        },
        zipWithArray: function (arr, zipper) {
            if (typeof zipper === "undefined")
                zipper = function (a, b) { return [a, b]; };
            
            var source = this;
            
            return new Generator(function (Yield) {
                var len = arr.length;
                    
                source.forEach(function (val, index, stop) {
                    if (index >= len)
                        stop();
                    Yield(zipper(val, arr[index]));
                });
            });
        },
        reduce: function (f, firstValue) {
            var first,
                current;
        
            if (arguments.length < 2) { 
                first = true;
            } else {
                first = false;
                current = firstValue;
            }
            
            this.forEach(function (val) {
                if (first) {
                    current = val;
                    first = false;
                } else {
                    current = f(current, val);
                }                
            });
            return current;
        },
        and: function (other) {
            var source = this;
            return new Generator(function (Yield, yieldMany) {
                yieldMany(source);
                yieldMany(other);
            });
        },
        takeWhile: function (pred) {
            var source = this;
            pred = selector(pred);
            return new Generator(function (Yield) {
                source.forEach(function (val, index, stop) {
                    if (pred(val))
                        Yield(val);
                    else
                        stop();
                });
            });
        },
        skipWhile: function (pred) {
            var source = this;
            pred = selector(pred);
            return new Generator(function (Yield) {
                var skipping = true;
                    
                source.forEach(function (val) {
                    skipping = skipping && pred(val);
                    if (!skipping)
                        Yield(val);
                });                    
            });
        },
        all: function (pred) {
            var result = true;
            pred = selector(pred);
            this.forEach(function (val, index, stop) {
                if (!(pred ? pred(val) : val)) {
                    result = false;
                    stop();
                }
            });
            return result;
        },
        any: function (pred) {
            var result = false;
            pred = selector(pred);
            this.forEach(function (val, index, stop) {
                if (pred ? pred(val) : val) {
                    result = true;
                    stop();
                }
            });
            return result;
        },
        first: function () {
            var result;
            this.forEach(function (val, index, stop) {
                result = val;
                stop();
            });
            return result;
        },
        groupBy: function (grouper) {
            var source = this;
            grouper = selector(grouper);
            return new Generator(function (Yield, yieldMany) {
                var groups = [],
                    group_contents = [];
                    
                source.forEach(function (val) {
                    var group = grouper(val);
                    var i = arrIndexOf(groups, group);
                    if (i === -1) {
                        groups.push(group);
                        group_contents.push([val]);
                    } else {
                        group_contents[i].push(val);
                    }
                });
            
                yieldMany(new Generator(groups).zipWithArray(group_contents, function (group, contents) {
                    var result = new Generator(contents);
                    result.key = group;
                    return result;
                }));
            });
        },
        evaluated: function () {
            return new Generator(this.toArray());
        },
        except: function (what) {
            return this.filter(function (x) { return x !== what; });
        },
        sortBy: function (keyFunc) {
            var source = this;
            keyFunc = selector(keyFunc);
            return new Generator(function (Yield) {
                var arr = source.toArray(),
                    indexes = Range(0, arr.length).toArray();
                
                indexes.sort(function (a, b) {
                    var ka = keyFunc(arr[a]),
                        kb = keyFunc(arr[b]);
                    if (typeof ka === typeof kb) {
                        if (ka === kb)
                            return a < b ? -1 : 1;
                        if (ka < kb)
                            return -1;
                        if (ka > kb)
                            return 1;
                    }
                    throw new TypeError("cannot compare " + ka + " and " + kb);
                });
                new Generator(indexes).forEach(function (index) {
                    Yield(arr[index]);
                });
            });
        },
        count: function () {
            var result = 0;
            this.forEach(function () { result++; });
            return result;
        }
    }

    var Count = function (start, step) {
        var i = start;
        if (typeof step === "undefined")
            step = 1;
        return new Generator(function (Yield) {
            while (true) {
                Yield(i);
                i += step;
            }
        });
    }

    var Range = function (start, len) {
        return Count(start, 1).take(len);
    }

    Generator.BreakIteration = BreakIteration;
    Generator.Count = Count;
    Generator.Range = Range;
    Generator.IterationError = IterationError;
    // Expose Lyfe as an AMD module.
    // Lowercase lyfe is used because AMD module names are derived from
    // file names, and Lyfe is normally delivered in a lowercase file name.
    if (typeof define === "function" && define.amd) {
        define("generator", [], function() {
            return Generator;
        });
    }
    // Export the Lyfe object for **Node.js**, with
    // backwards-compatibility for the old `require()` API.
    else if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Generator;
        }
        exports.Generator = Generator;
    }
    // Otherwise, we're in the browser without AMD
    // add `Generator` as a global object via a string identifier,
    // for Closure Compiler "advanced" mode.
    else {
        // Establish the root object, `window` in the browser, or `global` on the server.
        var root = this;
        root['Generator'] = Generator;
    }
})();