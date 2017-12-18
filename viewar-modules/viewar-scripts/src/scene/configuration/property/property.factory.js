import compose from 'stampit/compose';

import { createParser } from '../parser/parser';
import { Pattern } from '../parser/pattern';
import { Range } from '../parser/range';

import { Property } from './property';
import { NullProperty } from './by-type/null-property';
import { MaterialProperty } from './by-type/material-property';
import { PartProperty } from './by-type/part-property';
import { GeometricProperty } from './by-type/geometric-property';

import { CategorizedProperty } from './by-options/categorized-property';
import { RangeProperty } from './by-options/range-property';
import { EnumeratedProperty } from './by-options/enumerated-property';

//======================================================================================================================
// PROPERTY FACTORY
//======================================================================================================================

export function createProperty(jsonSpecification) {
  const {type, valueType, optionType, values, options, rules = []} = jsonSpecification;
  const factory = compose(
      getPropertyByType(type),
      getPropertyByValueType(valueType || optionType),
      Property);

  return factory({
    ...jsonSpecification,
    values: values || options,
    rules: rules.map(createRule),
  });
}

function getPropertyByType(type) {
  switch (type) {
    case 'part': return PartProperty;
    case 'material': return MaterialProperty;
    case 'geometric': return GeometricProperty;
    case 'null': return NullProperty;
    default : throw new Error(type + ' property type is not valid!');
  }
}

function getPropertyByValueType(valueType) {
  switch (valueType) {
    case 'categorized': throw new Error(valueType + ' value type is not implemented yet!'); //return CategorizedProperty;
    case 'range': return RangeProperty;
    case 'enumerated': return EnumeratedProperty;
    default: throw new Error(valueType + ' value type is not valid!');
  }
}

//======================================================================================================================
// RULE FACTORY
//======================================================================================================================

const evaluatorMap = {};
function parseCondition(condition) {
  if (!evaluatorMap[condition]) {
    const parser = createParser();
    parser.feed(condition);
    parser.finish();

    if (parser.results.length !== 0) {
      evaluatorMap[condition] = parser.results[0].fn;
    } else {
      throw new Error('Malformed condition: ' + condition);
    }
  }

  return evaluatorMap[condition];
}

function createRule(rule) {
  const evaluate = parseCondition(rule.condition);
  let match = () => false;
  let info = {};
  const invert = rule.invert ? fn => (...args) => !fn(...args) : fn => fn;

  if (rule.range || rule.matcherType === 'range') {
    const range = Range.fromRangeExpression(rule.range);
    info = range;
    match = invert(range.matches.bind(range));
  } else if (rule.value || rule.matcherType === 'value') {
    match = invert(value => value && (value === rule.value || value === rule.matcher));
    info = {
      lowerBound: rule.value,
      upperBound: rule.value,
      includeUpperBound: true,
      includeLowerBound: true,
    };
  } else if (rule.path || rule.matcherType === 'path') {
    match = invert(value => value === (rule.path || rule.matcher));
    info = {
      path: rule.path,
    };
  } else if (rule.pattern || rule.matcherType === 'pattern') {
    const pattern = Pattern({expression: rule.pattern || rule.matcher });
    match = invert(pattern.matches.bind(pattern));
  } else {
    throw new Error('Unrecognized matcher type!');
  }

  return {
    match,
    info,
    evaluate,
  }
}
