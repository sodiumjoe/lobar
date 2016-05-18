import {
  chain,
  clamp,
  includes,
  reduce
} from 'lodash';

export const delimiterRegex = /[^A-Za-z]/;

const pairs = [['{', '}'], ['(', ')'], ['[', ']']];

const beginWordPos = (pos, input) => pos === 0 ? pos : chain(input)
.transform((acc, char, i) => {
  if (i >= pos) {
    return false;
  }
  acc.pos = acc.previous && acc.previous.match(delimiterRegex) ? i : acc.pos;
  acc.previous = char;
  return true;
}, { pos: 0 })
.get('pos')
.toNumber()
.clamp(0, input.length)
.value();

const nextWordPos = (pos, input) => chain(input.slice(pos))
.transform((acc, char) => {
  if (acc.previous && acc.previous.match(delimiterRegex)) {
    return false;
  }
  acc.pos += 1;
  acc.previous = char;
  return true;
}, { pos: 0 })
.get('pos')
.toNumber()
.add(pos)
.clamp(0, input.length - 1)
.value();

const endWordPos = (pos, input) => chain(input.slice(pos + 1))
.transform((acc, char, i) => {
  if (char.match(delimiterRegex) && i != 0) {
    return false;
  }
  acc.pos += 1;
  return true;
}, { pos })
.get('pos')
.toNumber()
.clamp(0, input.length)
.value();

const tilChar = (pos, input, ch) => {
  const begin = input.slice(pos + 1).indexOf(ch);
  return begin < 0 ? null : begin + pos;
};

const tilCharBack = (pos, input, ch) => {
  const end = input.slice(0, pos).lastIndexOf(ch) + 1;
  return end < 0 ? null : end;
};

export function move({ pos, input, key, meta }) {
  if (key === 'for') {
    const begin = tilChar(pos, input, meta);
    return {
      pos: begin ? begin + 1 : pos,
      input
    };
  }
  if (key === 'For') {
    const end = tilCharBack(pos, input, meta);
    return {
      pos: end ? end - 1 : pos,
      input
    };
  }
  if (key === 'til') {
    return {
      pos: tilChar(pos, input, meta) || pos,
      input
    };
  }
  if (key === 'Til') {
    return {
      pos: tilCharBack(pos, input, meta) || pos,
      input
    };
  }
  if (key === 'append') {
    return { pos: Math.min(pos + 1, input.length), input };
  }
  if (includes(['h', 'left'], key)) {
    return { pos: Math.max(pos - 1, 0), input };
  }
  if (includes(['l', 'right'], key)) {
    return { pos: clamp(pos + 1, 0, input.length - 1), input };
  }
  if (key === '0') {
    return { pos: 0, input };
  }
  if (key === '$') {
    return { pos: input.length - 1, input };
  }
  if (key === 'w') {
    return {
      pos: nextWordPos(pos, input),
      input
    };
  }
  if (key === 'e') {
    return {
      pos: endWordPos(pos, input),
      input
    };
  }
  if (key === 'b') {
    return {
      pos: beginWordPos(pos, input),
      input
    };
  }

  return { pos: clamp(pos, 0, input.length - 1), input };
}

export function insert({ pos, input, key }) {
  if (pos === 0) {
    return { pos: key.length, input: key + input };
  }
  return {
    pos: pos + key.length,
    input: input.slice(0, pos) + key + input.slice(pos)
  };
}

export function del({ pos, input, key, meta }) {
  if (key === 'til') {
    const end = tilChar(pos, input, meta);
    return {
      pos,
      input: end ? input.slice(0, pos) + input.slice(end + 1) : input
    };
  }
  if (key === 'Til') {
    const begin = tilCharBack(pos, input, meta);
    if (begin) {
      return {
        pos: begin,
        input: input.slice(0, begin) + input.slice(pos)
      };
    }
    return { pos, input };
  }
  if (key === 'for') {
    const end = tilChar(pos, input, meta);
    return {
      pos,
      input: end ? input.slice(0, pos) + input.slice(end + 2) : input
    };
  }
  if (key === 'For') {
    const begin = tilCharBack(pos, input, meta);
    if (begin) {
      return {
        pos: begin - 1,
        input: input.slice(0, begin - 1) + input.slice(pos)
      };
    }
    return { pos, input };
  }
  if (includes(['i', 'a'], key)) {
    if (meta === 'word') {
      if (input[pos].match(delimiterRegex)) {
        return del({ pos, input, key: 'l' });
      }
      const begin = beginWordPos(pos + 1, input);
      const end = endWordPos(pos - 1, input) + 1;
      if (key === 'a') {
        if (input[end] === ' ') {
          return {
            pos: begin,
            input: input.slice(0, begin) + input.slice(end + 1)
          };
        }
        if (input[begin - 1] === ' ') {
          return {
            pos: begin - 1,
            input: input.slice(0, begin - 1) + input.slice(end)
          };
        }
      }
      return {
        pos: begin,
        input: input.slice(0, begin) + input.slice(end)
      };
    }

    const [ head, tail ] = reduce(pairs, (acc, pair) => includes(pair, meta) ? pair : acc, [meta, meta]);

    const begin = tilCharBack(pos, input, head);
    const end = tilChar(pos, input, tail);
    if (begin && end) {
      if (key === 'i') {
        return {
          pos: begin,
          input: input.slice(0, begin) + input.slice(end + 1)
        };
      }
      return {
        pos: begin - 1,
        input: input.slice(0, begin - 1) + input.slice(end + 2)
      };
    }
    return { pos, input };
  }
  if (key === 'h') {
    return del({ pos, input });
  }
  if (key === 'l') {
    return {
      pos: Math.min(pos, input.length - 2),
      input: input.slice(0, pos) + input.slice(pos + 1)
    };
  }
  if (key === 'w') {
    return {
      pos,
      input: input.slice(0, pos) + input.slice(nextWordPos(pos, input))
    };
  }
  if (key === 'e') {
    return {
      pos,
      input: input.slice(0, pos) + input.slice(endWordPos(pos, input) + 1)
    };
  }
  if (key === 'b') {
    const begin = beginWordPos(pos, input);
    return {
      pos: begin,
      input: input.slice(0, begin) + input.slice(pos)
    };
  }
  if (key === '0') {
    return {
      pos: 0,
      input: input.slice(pos)
    };
  }
  if (key === '$') {
    return {
      pos: Math.max(0, pos - 1),
      input: input.slice(0, pos)
    };
  }
  if (key) {
    return { pos, input };
  }
  if (pos === 0) {
    return { pos, input };
  }
  return { pos: pos - 1, input: input.slice(0, pos - 1) + input.slice(pos) };
}
