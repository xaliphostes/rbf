// ==============================================================
// Radial Basis Function (RBF) Interpolator
// Implementation of scipy.interpolate.Rbf with thin_plate function
// ==============================================================

/**
 * RBF Interpolator parameters
 * @category Algorithms
 * @param func The radial basis function type (default: "thin_plate"). Possible values: "thin_plate", "multiquadric", "inverse_multiquadric", "gaussian", "linear", "squared", "quintic"
 * @param smooth The smoothing parameter (default: 0.01)
 * @param epsilon The shape parameter for some RBF functions (default: null, auto-computed)
 * @param trainPoints The training points as array of coordinate arrays: [[x1, y1, z1, ...], [x2, y2, z2, ...], ...]
 * @param trainValues The training values at each point: [v1, v2, v3, ...]
 * @param interpPoints The points where to interpolate: [[x1, y1, z1, ...], [x2, y2, z2, ...], ...]
 */
export type RbfParameters = {
    func?: string;
    smooth?: number;
    epsilon?: number | null;
    //
    trainPoints: number[][];
    trainValues: number[];
    interpPoints: number[][];
};

/**
 * RBF Interpolaztion function
 * @param params The RBF parameters
 * @returns The interpolated values at interpPoints: [v1, v2, v3, ...]
 * @see RbfParameters
 * @example
 * ```typescript
 * import { rbf } from 'rbf_interpolator'
 *
 * const points = [[0,0], [1,0], [0,1], [1,1]]
 * const values = [0, 1, 1, 0]
 * const interpPoints = [[0.5,0.5], [0.25,0.75]]
 *
 * const interpolatedValues = rbf({
 *      func: 'thin_plate',
 *      smooth: 0.01,
 *      trainPoints: points,
 *      trainValues: values,
 *      interpPoints: interpPoints
 * })
 * console.log(interpolatedValues)
 * ```
 * @category Algorithms
 */
export function rbf({
    func = "gaussian",
    smooth = 0.01,
    epsilon = null,
    trainPoints,
    trainValues,
    interpPoints
}: RbfParameters) {
    const interpolator = new RbfInterpolator(trainPoints, trainValues, func, smooth, epsilon);
    return interpolator.interpolate(interpPoints);
}

// Exported for the html demo
export class RbfInterpolator {
    //private xi: number[][];
    private di: number[];
    private weights: number[];
    private nodes: number[][];
    private smooth: number;
    private epsilon: number;
    private norm: (x1: number[], x2: number[]) => number;

    /**
     * Initialize RBF interpolator
     * @param points - Array of coordinate arrays [[x1, y1, z1, ...], [x2, y2, z2, ...], ...]
     * @param values - Array of values at each point
     * @param func - Radial basis function type (default: 'thin_plate')
     * @param smooth - Smoothing parameter (default: 0)
     * @param epsilon - Shape parameter for some RBF functions (default: null, auto-computed)
     */
    constructor(
        points: number[][],
        values: number[],
        func: string = 'thin_plate',
        smooth: number = 0,
        epsilon: number | null = null
    ) {
        if (points.length !== values.length) {
            throw new Error('Number of points must match number of values');
        }

        if (points.length === 0) {
            throw new Error('At least one data point is required');
        }

        this.nodes = points.map(p => [...p]);
        this.di = [...values];
        this.smooth = smooth;

        // Auto-compute epsilon if not provided
        if (epsilon === null) {
            this.epsilon = this.computeEpsilon(points);
        } else {
            this.epsilon = epsilon;
        }

        // Set the radial basis function
        this.norm = this.getRbfFunction(func);

        // Compute weights
        this.weights = this.computeWeights();
    }

    /**
     * Interpolate at new points
     * @param points - Array of coordinate arrays to interpolate at
     * @returns Array of interpolated values
     */
    interpolate(points: number[][]): number[] {
        return points.map(point => this.interpolatePoint(point));
    }

    /**
     * Interpolate at a single point
     * @param point - Coordinate array [x, y, z, ...]
     * @returns Interpolated value
     */
    interpolatePoint(point: number[]): number {
        if (point.length !== this.nodes[0].length) {
            throw new Error(`Point dimension (${point.length}) must match training data dimension (${this.nodes[0].length})`);
        }

        let result = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            result += this.weights[i] * this.norm(point, this.nodes[i]);
        }
        return result;
    }

    // ------------------ private methods ------------------

    /**
     * Compute epsilon based on average distance between points
     */
    private computeEpsilon(points: number[][]): number {
        if (points.length < 2) return 1.0;

        let sumDist = 0;
        let count = 0;

        // Sample a subset for efficiency if there are many points
        const sampleSize = Math.min(points.length, 100);
        for (let i = 0; i < sampleSize; i++) {
            for (let j = i + 1; j < sampleSize; j++) {
                sumDist += this.euclideanDistance(points[i], points[j]);
                count++;
            }
        }

        return count > 0 ? sumDist / count : 1.0;
    }

    /**
     * Euclidean distance between two points
     */
    private euclideanDistance(p1: number[], p2: number[]): number {
        let sum = 0;
        for (let i = 0; i < p1.length; i++) {
            const diff = p1[i] - p2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Get the radial basis function based on the function name
     */
    private getRbfFunction(func: string): (x1: number[], x2: number[]) => number {
        switch (func.toLowerCase()) {
            case 'thin_plate':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    if (r === 0) return 0;
                    return r * r * Math.log(r);
                };

            case 'multiquadric':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    return Math.sqrt(1 + (this.epsilon * r) ** 2);
                };

            case 'inverse_multiquadric':
            case 'inverse':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    return 1.0 / Math.sqrt(1 + (this.epsilon * r) ** 2);
                };

            case 'gaussian':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    return Math.exp(-((this.epsilon * r) ** 2));
                };

            case 'linear':
                return (x1: number[], x2: number[]) => {
                    return this.euclideanDistance(x1, x2);
                };

            case 'squared':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    return r ** 2;
                };

            // WARNING: removed cause of ambiguity with 'squared' (degenerated case)
            // case 'cubic':
            //     return (x1: number[], x2: number[]) => {
            //         const r = this.euclideanDistance(x1, x2);
            //         return r ** 3;
            //     };

            case 'quintic':
                return (x1: number[], x2: number[]) => {
                    const r = this.euclideanDistance(x1, x2);
                    return r ** 5;
                };

            default:
                throw new Error(`Unknown radial basis function: ${func}`);
        }
    }

    /**
     * Compute interpolation weights by solving the linear system
     */
    private computeWeights(): number[] {
        const n = this.nodes.length;

        // Build the interpolation matrix A
        const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                A[i][j] = this.norm(this.nodes[i], this.nodes[j]);
            }
            // Add smoothing to diagonal
            A[i][i] += this.smooth;
        }

        // Solve A * weights = values using Gaussian elimination
        return this.solveLinearSystem(A, this.di);
    }

    /**
     * Solve linear system Ax = b using Gaussian elimination with partial pivoting
     */
    private solveLinearSystem(A: number[][], b: number[]): number[] {
        const n = A.length;

        // Create augmented matrix [A|b]
        const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

        // Forward elimination with partial pivoting
        for (let col = 0; col < n; col++) {
            // Find pivot
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
                    maxRow = row;
                }
            }

            // Swap rows
            [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

            // Check for singular matrix
            if (Math.abs(augmented[col][col]) < 1e-12) {
                throw new Error('Matrix is singular or nearly singular');
            }

            // Eliminate column
            for (let row = col + 1; row < n; row++) {
                const factor = augmented[row][col] / augmented[col][col];
                for (let j = col; j <= n; j++) {
                    augmented[row][j] -= factor * augmented[col][j];
                }
            }
        }

        // Back substitution
        const x: number[] = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = augmented[i][n];
            for (let j = i + 1; j < n; j++) {
                sum -= augmented[i][j] * x[j];
            }
            x[i] = sum / augmented[i][i];
        }

        return x;
    }
}
