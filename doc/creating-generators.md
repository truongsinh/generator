# Creating generators

The `Generator` constructor can be called with or without `new`. It takes an optional argument
`params` and a madatory argument `source`. The result depends on the type of `source`.

## Passing a function to the constructor

The most generic method of creating a generator is by passing a generator function to the
constructor. This function is given `Yield` as its first argument, which can be called to generate
values.

```javascript
var numbers = Generator(function (Yield) {
    Yield(99);
    Yield(28);
    Yield(-1);
});
console.log(numbers.toArray()); // [99, 28, -1]
```

Of course it's up to you what you call this parameter; I suggest using `Yield`. You should not use
`yield` (lowercase "y"), since that's a keyword (and thus a syntax error) in strict mode or
coffeescript.

The way to yield values used to be `this.yield` in earlier versions (when it was still hosted on
Bitbuket); this no longer works. See [[Yield%20versus%20this.yield|Yield versus this.yield]].

### Leaking Yield

Since `Yield` is just another function, there is no syntax restriction to stop you from leaking it
out of the current scope. But of course you shouldn't do that, and calling it after the iteration
has stopped will throw an exception of type `Generator.IterationError`:

```javascript
var leaked;
var evil = Generator(function (Yield) {
    leaked = Yield;
    Yield(7);
    Yield("foo");
});

evil.forEach(function (val) {
    console.log(val);
});

leaked("don't do this"); // ERROR: this throws an exception
```

### Infinite generators

It is okay for a generator function to yield infinitely many values, as long as it's made sure that
in the end, you only iterate through finitely many of them (or, well, leave your computer running
forever).

```javascript
var evenNumbers = Generator(function (Yield) {
    var i = 2;
    while (true) {
        Yield(i);
        i += 2;
    }
});

// still infinite
var evenAndDivisibleByFive = evenNumbers.filter(function (x) { return x % 5 == 0; });

// Don't do this! It will hang.
// console.log(evenAndDivisibleByFive.toArray());

// This is fine:
console.log(evenAndDivisibleByFive.take(10).toArray()); // [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
```

### yieldMany

Instead of yielding one value at a time, you can pass another Generator (or Generator source) to
`yieldMany`, which is given as the second argument to the Generator function. If the object
`source` passed to `yieldMany` is anything other than a generator, the behaviour is identical to
`yieldMany(Generator(source));`.

```javascript
var bools = Generator(function (Yield) {
    Yield(false);
    Yield(true);
});

var stuff = Generator(function (Yield, yieldMany) {
    Yield("string");
    yieldMany(bools);
    Yield(Math.PI);
});

console.log(stuff.toArray()); // ["string", false, true, 3.141592653589793]
```

### Sending data to the generator function

If the generator function wants to communicate with whoever is iterating through it, it can look at
the result of the `yield` call; it will be whatever the iteration function (the one passed to the
[[Generator%20methods#!generatorforeachfunc-thisobj|forEach method]]) returns.

```javascript
var keepYielding = Generator(function (Yield) {
    var value = "start",
        newValue;
    while (true) {
        newValue = Yield(value);
        if (typeof newValue !== "undefined")
            value = newValue;
    }
});

var result = "";

keepYielding.forEach(function (val, index, stop) {
    result += val + " ";
    if (index === 2)
        return "something"
    else if (index === 4)
        return "more"
    else if (index === 6)
        stop();
});

console.log(result); // start start start something something more more 
```

### Exceptions

A generator function should be aware that generation can be stopped early. This happens by throwing
the object `Generator.BreakIteration` as an exception. If the generator function catches
exceptions, it must make sure to rethrow this exception.

```javascript
var things = Generator(function (Yield) {
    Yield("a string");
    Yield(["an", "array"]);
    Yield(null);
    Yield({ length: "gotcha" });
    Yield([]);
});

var lengths = Generator(function (Yield) {
    things.forEach(function (thing) {
        try {
            Yield(thing.length);
        } catch (e) {
            if (e === Generator.BreakIteration)
                throw e;
            else
                Yield("no length here");
        }
    });
});

// if e wasn't re-thrown above, the early stopping wouldn't work
lengths.forEach(function (val, index, stop) {
    console.log(val);
    if (val === "gotcha")
        stop();
});
```

## Passing an array to the constructor

Calling the constructor with an array does the obvious: It creates a generator that yields the
array's contents, in order. It skips array values that were never set, or were deleted.

```javascript
var fruit = ["apple", "orange", "banana", "grape", "pear"];

Generator(fruit).forEach(function (val) {
    console.log("Eat " + val + "s; they are good for you.");
});
```

Calling `toArray()` on a generator constructed from an array does *not* return the original array,
but a shallow copy (if the array was fully populated) or a "condensed" version of the array (if the
original has holes).

```javascript
var stuff = [ function () { alert("Hello"); }, 13, true, null ];

var stuff2 = Generator(stuff).toArray();

// These are all true:
console.log(stuff2.length === 4);
console.log(stuff[0] === stuff2[0]);
console.log(stuff[1] === stuff2[1]);
console.log(stuff[2] === stuff2[2]);
console.log(stuff[3] === stuff2[3]);

// But this is false:
console.log(stuff === stuff2);

delete stuff[2];
console.log(Generator(stuff).toArray().length); // 3
```

If the content of the array is changed during iteration, the behavior is undefined.

### Passing any other object to the constructor

Calling the constructor with anything other than an array or a function creates a generator that
yields all the object's own properties, as 2-element arrays.

```javascript
var flowers = {
    rose: "red",
    violet: "blue"
};

Generator(flowers).forEach(function (val) {
    console.log(val[0] + "s are " + val[1]);
});
```

There is no guarantee regarding the order in which the properties are yielded. Only direct
properties of the object are yielded, not properties that are inherited through the prototype
chain.

```javascript
var Something = function () {};
Something.prototype = { foo: 42 };

var thing = new Something();
thing.bar = "Hello world";

// This prints 42
console.log(thing.foo);

// But this only outputs "bar: Hello World"
Generator(thing).forEach(function (val) {
    console.log(val[0] + ": " +val[1]);
});
```

If the object is changed during iteration, the behavior is undefined.