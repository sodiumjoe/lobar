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
