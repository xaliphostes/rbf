/**
 * Example usage of RBF Interpolator with thin plate spline
 */

import { RbfInterpolator, rbf } from './rbf_interpolator';

// Example 1: Basic 2D interpolation (matching scipy's API)
console.log('Example 1: Basic 2D interpolation');
console.log('==================================');

const x = [0, 1, 2, 3, 4];
const y = [0, 1, 0, 1, 0];
const z = [0, 2, 1, 3, 2];

// Create interpolator using scipy-style API
const interpolator = rbf(x, y, z);

// Interpolate at new points
const testPoints = [
    [0.5, 0.5],
    [1.5, 0.5],
    [2.5, 0.5],
];

const results = interpolator.interpolate(testPoints);
console.log('Test points:', testPoints);
console.log('Interpolated values:', results);
console.log();

// Example 2: Using the class-based API
console.log('Example 2: Class-based API');
console.log('==========================');

const trainingPoints = [
    [0, 0],
    [1, 1],
    [2, 0],
    [3, 1],
    [4, 0],
];
const trainingValues = [0, 2, 1, 3, 2];

const rbfInterpolator = new RbfInterpolator(
    trainingPoints,
    trainingValues,
    'thin_plate',  // function type
    0,             // smooth (0 = no smoothing)
    null           // epsilon (auto-computed)
);

const interpolatedValues = rbfInterpolator.interpolate([
    [0.5, 0.5],
    [1.5, 0.5],
    [2.5, 0.5],
]);

console.log('Interpolated values:', interpolatedValues);
console.log();

// Example 3: 1D interpolation
console.log('Example 3: 1D interpolation');
console.log('===========================');

const x1d = [0, 1, 2, 3, 4, 5];
const y1d = [0, 1, 4, 9, 16, 25]; // y = x^2

const points1d = x1d.map(xi => [xi]);
const interp1d = new RbfInterpolator(points1d, y1d, 'thin_plate');

// Interpolate at x = 2.5 (should be close to 6.25)
const result1d = interp1d.interpolatePoint([2.5]);
console.log('Interpolating x^2 at x=2.5:', result1d, '(expected: 6.25)');
console.log();

// Example 4: 3D interpolation
console.log('Example 4: 3D interpolation');
console.log('===========================');

const points3d = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
];
const values3d = [0, 1, 1, 1, 3];

const interp3d = new RbfInterpolator(points3d, values3d, 'thin_plate');
const result3d = interp3d.interpolatePoint([0.5, 0.5, 0.5]);
console.log('3D interpolation at [0.5, 0.5, 0.5]:', result3d);
console.log();

// Example 5: Smoothing
console.log('Example 5: With smoothing parameter');
console.log('====================================');

const noisyValues = [0.1, 2.3, 0.8, 3.2, 1.9]; // noisy data
const smoothInterp = new RbfInterpolator(
    trainingPoints,
    noisyValues,
    'thin_plate',
    0.1  // smoothing parameter
);

const smoothResults = smoothInterp.interpolate([
    [0.5, 0.5],
    [1.5, 0.5],
    [2.5, 0.5],
]);
console.log('Smoothed interpolation:', smoothResults);
console.log();

// Example 6: Other RBF functions
console.log('Example 6: Different RBF functions');
console.log('===================================');

const functions = ['thin_plate', 'multiquadric', 'gaussian', 'linear', 'cubic'];

for (const func of functions) {
    const rbf = new RbfInterpolator(trainingPoints, trainingValues, func);
    const val = rbf.interpolatePoint([1.5, 0.5]);
    console.log(`${func.padEnd(15)} at [1.5, 0.5]: ${val.toFixed(4)}`);
}
console.log();

// Example 7: Static convenience method
console.log('Example 7: Static convenience method');
console.log('=====================================');

const quickResults = RbfInterpolator.rbf(
    trainingPoints,
    trainingValues,
    testPoints,
    'thin_plate'
);
console.log('Quick interpolation:', quickResults);