# lobar

## install

```
> npm install -g lobar
```

## usage

```
> lbr -h

Usage: lbr <input JSON string> <operators> [options]

Options:
  -h, --help  Show help                                                [boolean]

Examples:
  lbr "['foo']" ".map(upperCase)"  upperCase array elements
```

### pipe

```
> echo "[{foo:'bar'}, {foo:'baz'}]" | lbr ".map('foo')"
["bar","baz"]
```

You also have access to lodash methods inside of the method calls:

```
> echo "[{foo:'bar'}, {foo: 3}]" | lbr ".filter(x => isString(x.foo))"
[{"foo":"bar"}]
```

## why?

I really like [jq](https://stedolan.github.io/jq/), but I have to look up the
syntax all the time. As a javascript developer, I already know lodash, and it's
generally enough for what I want to do at the command line.
