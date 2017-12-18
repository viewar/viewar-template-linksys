
export const generateId = testEnvironment() ? generateIdSingle : generateIdConcat;

function testEnvironment() {
  return Math.random().toString(36).substring(2).length >= 16;
}

function generateIdSingle() {
  return Math.random().toString(36).substring(2, 18);
}

function generateIdConcat() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}
