# Some caveats to consider

The purpose of Lyfe (no pun intended) is giving a nicer, somewhat more intuitive way of generating
values and iterating through them, instead of creating the umpteenth array called `result` and yet
another `for (var i = 0; i < foo.length; i++)` loop.

There are however a few things to keep in mind.

## No coroutines.

In most languages that have it, `yield` has two (albeit intertwined) uses: creating generators, as
is done here, and creating coroutines. The latter will *not* work with Lyfe. Without native yield
support, there is no way to leave a function and later come back to where you left off (well, at
least not in such a nice readable way).

Generator approaches the whole thing backwards: When encountering `yield`, instead of leaving the
generator function to essentially go *down* a level in the call stack, instead yield is a function
call that creates a new level *on top* of the stack. Interestingly, Eric Lippert identifies this
method as a valid alternative in [one of his blog posts on generators in C#]
(http://blogs.msdn.com/b/ericlippert/archive/2009/07/23/iterator-blocks-part-five-push-vs-pull.aspx)

This is also the reason why you cannot iterate through several generators at once (and thus that's
why there's no `.zipWith()`, but just a `.zipWithArray()` method on generator objects.

## Performance

There's no way that `generator.forEach()` could ever be even close to as fast as a `for` loop. Now
of course in the 99% case this doesn't matter; except in the rare cases where you actually need the
lightning-quick performance, you may as well have the benefit of intuitively generating and
iterating through values. But you probably won't want to use generators for the innermost
pixel-by-pixel drawing loop in your game engine.