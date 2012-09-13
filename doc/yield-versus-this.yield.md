# Yield versus this.yield

Originally, the way for a generator function to yield values was using `this.yield`. This was
changed to instead passing the yield function as an argument to the Generator function.

```javascript
var oldKind = new Generator(function () { // no longer works
    this.yield(15);
    this.yieldMany([1, 2, 3])
});

var newKind = new Generator(function (Yield, yieldMany) {
    Yield(30);
    yieldMany([4, 5, 6])
});
```

The old way does not work anymore. Here are a few reasons for this change, in no particular order.

## Getting rid of context saving

Say you create a function that takes a generator, and returns a new generator with altered values.
By means of a contrived example the old generator generates numbers, and you want to add 1 to
positive numbers, but multiply negative numbers by 2. 0 turns into 42. Previously, this would have
to be done like this:

```javascript
function changeNumbersOld (source) {
    return Generator(function () {
        var that = this; // <---
        source.forEach(function (val) {
            if (val > 0)
                that.yield(val + 1);
            else if (val < 0)
                that.yield(val * 2);
            else
                that.yield(42);
        });
    });
}
```

This pattern isn't necessary with the new way:

```javascript
function changeNumbersNew (source) {
    return Generator(function (Yield) {
        source.forEach(function (val) {
            if (val > 0)
                Yield(val + 1);
            else if (val < 0)
                Yield(val * 2);
            else
                Yield(42);
        });
    });
}
```

## Browser issues

When running JavaScript in strict mode, some browsers (in particular, some versions of Chrome) take
issue with `yield` being used as a property name, and thus consider `this.yield` to be a syntax
error. While that's really legal even in strict mode, and thus this is really a browser bug (and at
least as far Chrome goes has been fixed), it's better to avoid it. Of course this particular point
could also have been fixed by using `this.Yield` instead.

## Minification ===

Look at these two:

```javascript
var oldGen = Generator(function () {
    this.yield(42);
    this.yield("foo");
    this.yield(true);
});
var newGen = Generator(function (Yield) {
    Yield(42);
    Yield("foo");
    Yield(true);
});
```

Now let's send these through the Google Closure minifier (I have re-added some whitespace for
readability):
```javascript
var oldGen=Generator(function(){this.yield(42);this.yield("foo");this.yield(!0)}),
    newGen=Generator(function(a){a(42);a("foo");a(!0)});
```

By making `Yield` a function parameter (and thus a local variable), the minifier can save lots of
characters by shortening the variable name. This is not possible with `this.yield`.
