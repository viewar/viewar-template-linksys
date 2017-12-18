export default function* createValueCombinationIterator([currentProperty, ...otherProperties], fixedValues = {}, combination = []) {
  if (currentProperty) {
    const fixedValue = fixedValues[currentProperty.name];

    const values = fixedValue ? [fixedValue] : [...currentProperty.values];

    const setValue = currentProperty.value;
    const index = values.indexOf(setValue);
    if (index !== -1) {
      values.splice(index, 1);
      values.unshift(setValue);
    }

    for (const value of values) {
      yield* createValueCombinationIterator(otherProperties, fixedValues, [...combination, {name: currentProperty.name, value}]);
    }
  } else {
    yield combination;
  }
}
