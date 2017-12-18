@{%
function mergeInfo(...objects) {
  const result = {};
  objects.forEach(object => object && Object.keys(object).forEach(key => {
    result[key] = result[key] || [];
    result[key].push(...object[key]);
  }));
  return result;
}

const parseUnary = ([op,,r]) => ({ info: r.info, fn: op(r.fn) });
const parseBinary = ([l,,op,,r]) => ({ info: mergeInfo(l.info, r.info), fn: op(l.fn, r.fn) });
const parseComparison = ([l,,op,,r]) => ({ info: mapComparison(l.info, r.info), fn: op(l.fn, r.fn) });

const propertyToProperty = (l, r) => ({
  comparisons: [{
	type: 'propertyToProperty',
	propertyName: l.propertyName,
	otherPropertyName: r.propertyName,
  }],
});

const propertyToNumber = (l, r) => ({
  comparisons: [
  	Object.assign({type: 'propertyToNumber'}, l, r),
  ],
});

const propertyToValue = (l, r) => ({
  comparisons: [
  	Object.assign({type: 'propertyToValue'}, l, r),
  ],
});

const propertyToList = (l, r) => ({
  comparisons: [
  	Object.assign({type: 'propertyToList'}, l, r),
  ],
});

const propertyToPattern = (l, r) => ({
  comparisons: [
  	Object.assign({type: 'propertyToPattern'}, l, r),
  ],
});

const propertyToRange = (l, r) => ({
  comparisons: [
  	Object.assign({type: 'propertyToRange'}, l, r),
  ],
});

const parse = (merge) => ([l,,op,,r]) => ({ info: merge(l.info, r.info), fn: op(l.fn, r.fn) });

const mapComparison = (l, r) => ({
  comparisons: [Object.assign({}, l, r)],
});

function createRange(lowerBound, upperBound, includeLowerBound, includeUpperBound) {
	const compareLowerBound = includeLowerBound ?
	  value => value >= lowerBound :
	  value => value > lowerBound;

	const compareUpperBound = includeUpperBound ?
	  value => value <= upperBound :
	  value => value < upperBound;

	return {
	  lowerBound,
	  upperBound,
	  includeLowerBound,
	  includeUpperBound,
	  includes,
	};

	function includes(value) {
	  const castValue = typeof value === 'number' ? value : Number.parseFloat(value);
	  return compareLowerBound(castValue) && compareUpperBound(castValue);
	}
}

  const unwrap = ([,expr,]) => expr;
  const trueConst = () => ({
    info: {},
    fn: () => true,
  });
  const falseConst = () => ({
    info: {},
    fn: () => false,
  });
%}

Main -> Rule {% id %}

Rule
  -> _ OrExpression _ {% unwrap %}

OrExpression
  -> AndExpression __ Or __ OrExpression {% parseBinary %}
   | AndExpression {% id %}

AndExpression
  -> XorExpression __ And __ AndExpression {% parseBinary %}
   | XorExpression {% id %}

XorExpression
  -> NotExpression __ Xor __ XorExpression {% parseBinary %}
   | NotExpression {% id %}

NotExpression
  -> Not __ NotExpression {% parseUnary %}
   | Expression {% id %}

Expression
  -> Comparison   {% id %}
   | "(" Rule ")" {% unwrap %}
   | "true"       {% trueConst %}
   | "false"      {% falseConst %}

Comparison
  -> PropertyName __ NumericComparisonOperator __ Number        {% parse(propertyToNumber) %}
   | PropertyName __ NumericComparisonOperator __ PropertyName  {% parse(propertyToProperty) %}
   | PropertyName __ PropertyComparisonOperator __ PropertyName {% parse(propertyToProperty) %}
   | PropertyName __ PathComparisonOperator __ Value            {% parse(propertyToValue) %}
   | PropertyName __ PathMatchOperator __ Pattern               {% parse(propertyToPattern) %}
   | PropertyName __ InclusionOperator __ Range                 {% parse(propertyToRange) %}
   | PropertyName __ InclusionOperator __ ValueList             {% parse(propertyToList) %}

Or -> "or"   {% () =>   (l, r) => (c) => l(c) || r(c) %}
And -> "and" {% () =>   (l, r) => (c) => l(c) && r(c) %}
Xor -> "xor" {% () =>   (l, r) => (c) => !!(l(c) ^ r(c)) %}
Not -> "not" {% () =>      (r) => (c) => !r(c) %}

NumericComparisonOperator
  -> "==" {% () =>   (l, r) => (c) => l(c) === r(c) %}
   | "<>" {% () =>   (l, r) => (c) => l(c) !== r(c) %}
   | ">=" {% () =>   (l, r) => (c) => l(c) >=  r(c) %}
   | ">"  {% () =>   (l, r) => (c) => l(c) >   r(c) %}
   | "<=" {% () =>   (l, r) => (c) => l(c) <=  r(c) %}
   | "<"  {% () =>   (l, r) => (c) => l(c) <   r(c) %}

InclusionOperator
  -> "in"          {% () =>   (l, r) => (c) => r(c).includes(l(c)) %}
   | "not" __ "in" {% () =>   (l, r) => (c) => !r(c).includes(l(c)) %}

PropertyComparisonOperator
  -> "equals"                   {% () =>   (l, r) => (c) => l(c) === r(c) %}
   | "does" __ "not" __ "equal" {% () =>   (l, r) => (c) => l(c) !== r(c) %}

PathComparisonOperator
  -> "is" __ "not" {% () =>   (l, r) => (c) => l(c) !== r(c) %}
   | "is"          {% () =>   (l, r) => (c) => l(c) === r(c) %}

PathMatchOperator
  -> "matches"                  {% () =>   (l, r) => (c) => !!l(c).match(r(c)) %}
   | "does" __ "not" __ "match" {% () =>   (l, r) => (c) => !l(c).match(r(c)) %}

_ -> [ ]:*  {% () => null %}
__ -> [ ]:+ {% () => null %}

Value
  -> ValueLiteral {% ([value]) => {
	return {
	  info: {
	    value,
	  },
	  fn: (c) => value,
	}
} %}

ValueLiteral
  -> Char:+ {% ([expr]) => expr.join('') %}
   | "\"" (QuotedChar | EscapedQuote):+ "\"" {% ([,expr,]) => {
	return expr.join('');
} %}

PropertyName
  -> "[" (BracketedChar | EscapedLeftBracket | EscapedRightBracket):+ "]" {% ([,expr,]) => {
	const propertyName = expr.join('');
	return {
	  info: {
	    propertyName,
	  },
	  fn: (c) => c.propertyValues[propertyName],
	}
} %}

Pattern
  -> "/" (RegexChar | EscapedRegexChar):+ "/" {% ([,expr,]) => {
	const pattern = createPattern(expr.join(''));
	return {
	  info: {
	    pattern,
	  },
	  fn: (c) => pattern,
	}
} %}

Char -> [^"[\]\s] {% id %}
QuotedChar -> [^"\b\t\r\n] {% id %}
BracketedChar -> [^[\]\b\t\r\n] {% id %}
RegexChar -> [^/\b\t\r\n] {% id %}

EscapedQuote -> "\\\"" {% () => '"' %}
EscapedLeftBracket -> "\\[" {% () => '[' %}
EscapedRightBracket -> "\\]" {% () => ']' %}
EscapedRegexChar -> "\\/" {% () => '/' %}

ValueList
  -> "(" _ (ValueLiteral _ "," _ {% id %}):* ValueLiteral _ ")" {% ([,,rest,last]) =>  {
    const list = [...rest, last];
    return {
      info: {
        list,
      },
      fn: (c) => list,
    }
 } %}

Range
  -> LowerBoundType _ NumberLiteral _ "," _ NumberLiteral _ UpperBoundType {% ([il,,lb,,,,ub,,iu]) => {
	const range = createRange(lb, ub, il, iu);
	return {
	  info: {
	    range,
	  },
	  fn: () => range,
	}
} %}

LowerBoundType -> [[<] {% ([symbol]) => symbol === '[' %}
UpperBoundType -> [>\]] {% ([symbol]) => symbol === ']' %}

Number -> NumberLiteral {% ([value]) => {
	return {
	  info: {
	    value,
	  },
	  fn: (c) => value,
	}
} %}

NumberLiteral
  -> "-":? [0-9]:+ {% ([minus, digits]) => Number.parseInt((minus || '') + digits.join(''))  %}
   | "-":? [0-9]:+ "." [0-9]:* {% ([minus, a, b, c]) => Number.parseFloat((minus || '') + a.join('') + b + ((c || []).join(''))) %}
