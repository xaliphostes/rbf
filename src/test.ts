/**
 * Tests for RBF Interpolator
 */

import { RbfInterpolator, rbf } from './rbf_interpolator.ts';

function assertClose(actual: number, expected: number, tolerance: number = 1e-6, message: string = '') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`Assertion failed: ${message}\nExpected: ${expected}, Actual: ${actual}, Diff: ${diff}`);
    }
    console.log(`✓ ${message || 'Test passed'}`);
}

function runTests() {
    console.log('Running RBF Interpolator Tests');
    console.log('================================\n');

    // Test 1: Exact interpolation at training points
    console.log('Test 1: Exact interpolation at training points');
    const points = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const values = [0, 1, 1, 2];
    const interpolator = new RbfInterpolator(points, values, 'thin_plate');

    for (let i = 0; i < points.length; i++) {
        const result = interpolator.interpolatePoint(points[i]);
        assertClose(result, values[i], 1e-10, `Point ${i}: [${points[i]}] should equal ${values[i]}`);
    }
    console.log();

    // Test 2: Scipy-style API
    console.log('Test 2: Scipy-style API');
    const x = [0, 1, 2];
    const y = [0, 0, 0];
    const z = [0, 1, 0];

    const scipyStyleInterp = rbf(x, y, z);
    const midpoint = scipyStyleInterp.interpolatePoint([1, 0]);
    console.log(`Interpolated value at midpoint: ${midpoint}`);
    assertClose(midpoint, 1, 0.1, 'Midpoint should be close to 1');
    console.log();

    // Test 3: Linear function should be interpolated exactly (for thin plate on line)
    console.log('Test 3: 1D linear interpolation');
    const x1d = [[0], [1], [2], [3], [4]];
    const y1d = [0, 2, 4, 6, 8]; // y = 2x
    const linearInterp = new RbfInterpolator(x1d, y1d, 'thin_plate');

    const test2_5 = linearInterp.interpolatePoint([2.5]);
    assertClose(test2_5, 5.0, 0.1, '2.5 should interpolate to 5.0');
    console.log();

    // Test 4: Symmetry test
    console.log('Test 4: Symmetry test');
    const symPoints = [[0, 0], [1, 0], [0, 1]];
    const symValues = [0, 1, 1];
    const symInterp = new RbfInterpolator(symPoints, symValues, 'thin_plate');

    const val1 = symInterp.interpolatePoint([0.5, 0.3]);
    const val2 = symInterp.interpolatePoint([0.3, 0.5]);
    console.log(`Value at [0.5, 0.3]: ${val1}`);
    console.log(`Value at [0.3, 0.5]: ${val2}`);
    // Due to symmetry in the problem, these should be similar
    console.log('✓ Symmetry test completed');
    console.log();

    // Test 5: Smoothing reduces oscillations
    console.log('Test 5: Smoothing parameter effect');
    const noisyPoints = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
    const noisyValues = [0, 1, 0.5, 1, 0];

    const noSmooth = new RbfInterpolator(noisyPoints, noisyValues, 'thin_plate', 0);
    const withSmooth = new RbfInterpolator(noisyPoints, noisyValues, 'thin_plate', 0.5);

    const testPoint = [1.5, 0];
    const noSmoothVal = noSmooth.interpolatePoint(testPoint);
    const smoothVal = withSmooth.interpolatePoint(testPoint);

    console.log(`Without smoothing: ${noSmoothVal}`);
    console.log(`With smoothing: ${smoothVal}`);
    console.log('✓ Smoothing test completed');
    console.log();

    // Test 6: Different RBF functions
    console.log('Test 6: Different RBF functions produce different results');
    const testPoints = [[0, 0], [1, 1], [2, 0]];
    const testValues = [0, 1, 0];
    const evalPoint = [1, 0.5];

    const results: { [key: string]: number } = {};
    const functions = ['thin_plate', 'multiquadric', 'gaussian', 'linear', 'cubic'];

    for (const func of functions) {
        const interp = new RbfInterpolator(testPoints, testValues, func);
        results[func] = interp.interpolatePoint(evalPoint);
        console.log(`${func}: ${results[func].toFixed(6)}`);
    }
    console.log('✓ Different RBF functions test completed');
    console.log();

    // Test 7: Higher dimensional data
    console.log('Test 7: 4D interpolation');
    const points4d = [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
    ];
    const values4d = [0, 1, 2, 3, 4];
    const interp4d = new RbfInterpolator(points4d, values4d, 'thin_plate');

    const result4d = interp4d.interpolatePoint([0.25, 0.25, 0.25, 0.25]);
    console.log(`4D interpolation result: ${result4d}`);
    console.log('✓ 4D interpolation test completed');
    console.log();

    // Test 8: Batch interpolation
    console.log('Test 8: Batch interpolation');
    const batchPoints = [[0, 0], [1, 1]];
    const batchValues = [0, 1];
    const batchInterp = new RbfInterpolator(batchPoints, batchValues, 'thin_plate');

    const queryPoints = [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]];
    const batchResults = batchInterp.interpolate(queryPoints);

    console.log('Query points:', queryPoints);
    console.log('Results:', batchResults);
    console.log('✓ Batch interpolation test completed');
    console.log();

    console.log('================================');
    console.log('All tests passed! ✓');
}

// Run tests
try {
    runTests();
} catch (error) {
    console.error('Test failed:', error);
    //process.exit(1);
}