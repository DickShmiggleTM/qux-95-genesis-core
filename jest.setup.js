
import '@testing-library/jest-dom';

// Make sure Jest globals are available
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.jest = jest;
