export const COLLECTION = [
  'countBy',
  'forEach',
  'forEachRight',
  'every',
  'filter',
  'find',
  'findLast',
  'flatMap',
  'flatMapDeep',
  'flatMapDepth',
  'forEach',
  'forEachRight',
  'groupBy',
  'includes',
  'invokeMap',
  'keyBy',
  'map',
  'orderBy',
  'partition',
  'reduce',
  'reduceRight',
  'reject',
  'sample',
  'sampleSize',
  'shuffle',
  'size',
  'some',
  'sortBy'
];

export const ARRAY = [
  'chunk',
  'compact',
  'concat',
  'difference',
  'differenceBy',
  'differenceWith',
  'drop',
  'dropRight',
  'dropRightWhile',
  'dropWhile',
  'fill',
  'findIndex',
  'findLastIndex',
  'flatten',
  'flattenDeep',
  'flattenDepth',
  'fromPairs',
  'head',
  'indexOf',
  'initial',
  'intersection',
  'intersectionBy',
  'intersectionWith',
  'join',
  'last',
  'lastIndexOf',
  'nth',
  'pull',
  'pullAll',
  'pullAllBy',
  'pullAllWith',
  'pullAt',
  'remove',
  'reverse',
  'slice',
  'sortedIndex',
  'sortedIndexBy',
  'sortedIndexOf',
  'sortedLastIndex',
  'sortedLastIndexBy',
  'sortedLastIndexOf',
  'sortedUniq',
  'sortedUniqBy',
  'tail',
  'take',
  'takeRight',
  'takeRightWhile',
  'takeWhile',
  'union',
  'unionBy',
  'unionWith',
  'uniq',
  'uniqBy',
  'uniqWith',
  'unzip',
  'unzipWith',
  'without',
  'xor',
  'xorBy',
  'xorWith',
  'zip',
  'zipObject',
  'zipObjectDeep',
  'zipWith'
].concat(COLLECTION);

export const LANG = [
  'eq',
  'gt',
  'gte',
  'isArray',
  'isBoolean',
  'isDate',
  'isEmpty',
  'isEqual',
  'isEqualWith',
  'isFinite',
  'isFunction',
  'isInteger',
  'isLength',
  'isMatch',
  'isMatchWith',
  'isNaN',
  'isNil',
  'isNull',
  'isNumber',
  'isObject',
  'isPlainObject',
  'isRegExp',
  'isSafeInteger',
  'isString',
  'isUndefined',
  'lt',
  'lte',
  'toArray',
  'toFinite',
  'toInteger',
  'toLength',
  'toNumber',
  'toPlainObject',
  'toString'
];

export const MATH = [
  'add',
  'ceil',
  'divide',
  'floor',
  'max',
  'maxBy',
  'mean',
  'meanBy',
  'min',
  'minBy',
  'multiply',
  'round',
  'subtract',
  'sum',
  'sumBy'
];

export const NUMBER = [
  'clamp',
  'inRange',
  'random'
];

export const OBJECT = [
  'assign',
  'assignWith',
  'at',
  'defaults',
  'defaultsDeep',
  'toPairs',
  'toPairsIn',
  'findKey',
  'findLastKey',
  'get',
  'has',
  'invert',
  'invertBy',
  'keys',
  'mapKeys',
  'mapValues',
  'merge',
  'mergeWith',
  'omit',
  'omitBy',
  'pick',
  'pickBy',
  'set',
  'setWith',
  'toPairs',
  'transform',
  'unset',
  'update',
  'updateWith',
  'values'
].concat(COLLECTION);

export const STRING = [
  'camelCase',
  'capitalize',
  'deburr',
  'endsWith',
  'escape',
  'escapeRegExp',
  'kebabCase',
  'lowerCase',
  'lowerFirst',
  'pad',
  'padEnd',
  'padStart',
  'parseInt',
  'repeat',
  'replace',
  'snakeCase',
  'split',
  'startCase',
  'startsWith',
  'template',
  'toLower',
  'toUpper',
  'trim',
  'trimEnd',
  'trimStart',
  'truncate',
  'unescape',
  'upperCase',
  'upperFirst',
  'words'
];

export const UTIL = [
  'matches',
  'matchesProperty'
];

const COLLECTION_MATCHES = [
  'countBy',
  'every',
  'filter',
  'find',
  'groupBy',
  'map',
  'partition',
  'reject',
  'some'
];

export const ARRAY_MATCHES = COLLECTION_MATCHES.concat([
  'differenceBy',
  'dropWhile',
  'dropWhileRight',
  'findIndex',
  'findLastIndex',
  'intersectionBy',
  'sortedIndexBy',
  'sortedLastIndexBy',
  'takeRightWhile',
  'takeWhile',
  'unionBy',
  'uniqBy',
  'xorBy',
  'maxBy',
  'meanBy',
  'minBy',
  'sumBy'
]);

export const OBJECT_MATCHES = COLLECTION_MATCHES.concat([
  'findKey',
  'findLastKey',
  'mapKeys',
  'mapValues',
  'pick',
  'pickBy',
  'values'
]);
