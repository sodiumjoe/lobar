# lobar

A thin shell wrapper for [lodash.chain()](https://lodash.com/).

## install

```shell
> npm install -g lobar
```

## usage

```shell
> lbr -h

Usage: lbr <JSON> <method> <arg> [method arg, ...] [options]

Options:
  -d, --data         <required> input json  [string]
  -f, --filename     <required> input json file  [string]
  -v, --verbose      verbosity level  [count]
  -p, --prettyPrint  pretty print output  [boolean]
  -i, --interactive  interactive mode  [boolean]
  -h, --help         Show help  [boolean]
  -V, --version      Show version number  [boolean]

Examples:
  lbr -d '["foo"]' map upperCase       ["FOO"]
  echo '{"foo": "bar"}' | lbr get foo  "bar"
  echo '{"foo": "bar"}' | lbr .foo     "bar"
```

### pipe

```shell
$ echo '[{"foo":"bar"}, {"foo":"baz"}]' | lbr map foo
> ["bar","baz"]
```

You also have access to lodash methods inside of the method calls:

```shell
$ echo '[{"foo":"bar"}, {"foo": 3}]' | lbr filter 'x => isString(x.foo)'
> [{"foo":"bar"}]
```

### shorthands

A leading `.` on an argument is shorthand for `get`:

```shell
$ echo '{"foo": {"bar": "baz"}}' | lbr .foo.bar
> "baz"
```

is equivalent to:

```shell
$ echo '{"foo": {"bar": "baz"}}' | lbr get foo.bar
> "baz"
```

### interactive mode

```shell
$ curl https://registry.npmjs.com/lobar | lbr -i
```

![interactive mode gif](https://raw.githubusercontent.com/sodiumjoe/lobar/master/lobar.gif)

#### vi keybindings

Interactive mode has basic vi keybindings. It starts in `insert` mode.

##### autocompletion

In insert mode, lobar will try to infer methods or argument from method/arg
position and evaluated JSON at the current cursor position. `<Tab>`/`<S-Tab>` or
`<C-n>`/`<C-p>` to navigate the completion list.

##### normal mode

Hitting `esc` will drop you into normal mode, where you can move horizontally
with `h`, `l`, `b`, `w`, `e`, `t`, `f`, `T`, `F`, `0`, and `$`. You can also use
`c` and `d` with those movements in addition to `i` and `a` with a character or
one of `{}[]{}'"`. Vertical movement ('j', 'k', `<C-d>`, `<C-u>`), will scroll the
json output.

`u` to undo and `<C-r>` to redo.

`y` will copy your current prompt input to your clipboard.

`<C-c>` to exit or `enter` to exit and print the currently evaluated json to
`stdout`.

### caveats

If you want to use a string argument for a method that collides with a lodash
method name, you'll have to quote it twice:

```shell
echo '[{"isString": true}]' | lbr filter "'isString'"
[{"isString":true}]
```

This is because `lbr` tries to `eval` the argument with lodash as the context.

```shell
echo '[{"isString": true}]' | lbr filter isString
[]
```

### environment variables

You can set options using environment variables:

```shell
$ LOBAR_PRETTY_PRINT=true lbr -d '{"foo": "bar"}' .foo
> "bar"
```

## why?

I really like [jq](https://stedolan.github.io/jq/), but I have to look up the
syntax all the time. As a javascript developer, I already know lodash, and it's
generally enough for what I want to do at the command line.

## TODO

* interactive mode
  - history
  - commands:
    - R
  - input prompt symbol
