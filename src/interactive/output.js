import {
  assign,
  chain,
  isUndefined,
  negate
} from 'lodash';
import sfy from 'maquillage';

export default function getOutput(data, computedJson, scrollCommands, { width, height }) {

  const validComputedJson = computedJson.filter(negate(isUndefined));

  return validComputedJson.mapTo({
    // reset scroll on new json
    key: { name: 'g' }
  })
  .merge(scrollCommands)
  .combineLatest(validComputedJson, (...args) => args)
  .scan((acc, [{ key }, json]) => {

    const scrollPos = scrollAction(acc.scrollPos, key, acc.json, height - 1, width);

    if (scrollPos === acc.scrollPos && json === acc.json) {
      return acc;
    }

    return assign({}, acc, {
      scrollPos,
      json,
      output: getVisible(stringify(json, width), width, height - 1, scrollPos)
    });

  }, {
    json: data,
    output: getVisible(stringify(data, width), width, height - 1, 0),
    scrollPos: 0
  })
  .distinctUntilChanged()
  .share();

}

const stringify = (json, width) => {
  const re = new RegExp(`.{1,${width}}`, 'g');
  return chain(sfy(json).split('\n')).map(line => line.match(re)).flatten().join('\n').value();
};

function getVisible(str, width, height, n = 0) {
  const lines = str.split('\n');
  return chain(lines)
  .slice(n, n + height)
  .join('\n')
  .value();
}

const scrollAction = (scroll = 0, { name, shift }, json, height, width) => {
  const max = Math.max(0, stringify(json, width).split('\n').length - height);

  if (name === 'j') {
    return Math.min(max, scroll + 1);
  }
  if (name === 'k') {
    return Math.max(0, scroll - 1);
  }
  if (name === 'd') {
    return Math.min(max, scroll + height);
  }
  if (name === 'u') {
    return Math.max(0, scroll - height);
  }
  if (name === 'g' && shift) {
    return max;
  }
  if (name === 'g') {
    return 0;
  }
  return scroll;
};
