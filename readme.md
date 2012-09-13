Generator is an experimental implementation of generator functions ECMAScript as specified in in
ECMA-262, 3rd edition, i.e. JavaScript that every browser understands.

#You never know what it'll yield you.

This is an experimental but pretty functional project, trying to make yield-based generator
functions available (to a certain extent) in "normal"JavaScript, i.e. JavaScript 1.5, the dialect
that any reasonably modern browser understands.

```javascript
var test = Generator(function (Yield) {
	Yield("Hello");
	if (false)
		Yield("ignore me");
	for (var i = 0; i < 6; i++)
		Yield(" world".substr(i, 1));
});
var test2 = Generator(["!"]);
var array = test.and(test2).map(function (s) { return s.toUpperCase(); }).toArray();
console.log(array.join("")); // "HELLO WORLD!"
```

It is a self-contained and fairly small library (minified and gzipped, it's just over one
kilobyte), and it should work in all modern and not-quite-so-modern browsers. The repository
contains a simple test HTML page. Just open it in the browser you want to test support for; if
everything's green, everything's good. I regularly check the current versions of Chrome, Firefox,
Opera, Safari, and Internet Explorer (in the latter, also various emulation modes for IE8, IE7
etc).

#Documentation
* Creating generators
* Methods exposed by generator objects
* Caveats
* Yield versus this.yield

#Contribute
So go ahead: Try it, use it, and please give feedback and suggestions. Bug reports, patches and new
ideas will be very much appreciated!

#Credit
<to be updated>