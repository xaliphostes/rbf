# RBF Interpolator - TypeScript Implementation

A TypeScript implementation of scipy's `scipy.interpolate.Rbf` with support for thin plate spline and other radial basis functions.

## [Demo](https://xaliphostes.github.io/rbf/)

## Features

- ✅ Thin plate spline interpolation (matching scipy's `function='thin_plate'`)
- ✅ Multiple RBF functions: `thin_plate`, `multiquadric`, `inverse_multiquadric`, `gaussian`, `linear`, `cubic`, `quintic`
- ✅ N-dimensional interpolation support
- ✅ Smoothing parameter for noisy data

## Installation

Simply copy `rbf_interpolator.ts` into your project.

## Quick Start

```typescript
import { rbf } from './rbf_interpolator'

const points = [[0,0], [1,0], [0,1], [1,1]]
const values = [0, 1, 1, 0]
const interpPoints = [[0.5,0.5], [0.25,0.75]]

const interpolatedValues = rbf({
  func: 'thin_plate',
  smooth: 0.01,
  trainPoints: points,
  trainValues: values,
  interpPoints: interpPoints
})

console.log(interpolatedValues)
```

## Radial Basis Functions

### Thin Plate Spline (default)

Formula: `φ(r) = φ(r) = r² log(r)` where `r` is the Euclidean distance

- Best for smooth interpolation
- Commonly used in image warping and scattered data interpolation
- Does not require epsilon parameter

### Other Supported Functions

| Function | Formula | Use Case |
|----------|---------|----------|
| `multiquadric` | `√(1 + (εr)²)` | General-purpose, smooth |
| `inverse_multiquadric` | `1/√(1 + (εr)²)` | Smooth, bounded |
| `gaussian` | `e^(-(εr)²)` | Very smooth, localized |
| `linear` | `r` | Simple, fast |
| `cubic` | `r³` | Smooth interpolation |
| `quintic` | `r⁵` | Very smooth |

## Parameters

### Smoothing Parameter

The `smooth` parameter adds regularization to prevent overfitting:
- `smooth = 0`: Exact interpolation (passes through all points). Can lead to singular matrices
- `smooth > 0`: Approximate interpolation (smoother, better for noisy data)

### Epsilon Parameter

The `epsilon` parameter controls the "width" of the RBF for certain functions:
- Smaller epsilon → wider influence, smoother interpolation
- Larger epsilon → narrower influence, more local interpolation
- Auto-computed based on average distance between points

## Differences from Scipy

This implementation closely matches scipy's behavior but has some minor differences:

1. **Matrix solver**: Uses Gaussian elimination instead of scipy's LAPACK routines (may have slight numerical differences for large datasets)
2. **Performance**: Python/scipy with compiled libraries may be faster for very large datasets
3. **API**: Provides both scipy-style and more TypeScript-friendly class-based API

## Performance Considerations

- **Time complexity**: O(n³) for training (solving linear system), O(n) for each prediction
- **Space complexity**: O(n²) for storing the interpolation matrix
- For large datasets (n > 1000), consider:
  - Using a subset of points
  - Implementing iterative solvers
  - Using localized RBF methods

## Mathematical Background

Radial Basis Function interpolation finds weights `w` such that:

```
f(x) = Σᵢ wᵢ φ(‖x - xᵢ‖)
```

where:
- `φ` is the radial basis function
- `xᵢ` are the training points
- `wᵢ` are the weights (solved from the linear system)

The weights are found by solving:

```
Φw = d
```

where `Φᵢⱼ = φ(‖xᵢ - xⱼ‖) + δᵢⱼ·smooth`, `d` are the training values, and `smooth` the smoothing parameter of the Tikhonov regularization (order 1).

For thin plate splines, `φ(r) = r² log(r)`, which provides C¹ continuity and natural boundary conditions.

## Author

[xaliphostes](https://github.com/xaliphostes)

## License

MIT

## References

- [scipy.interpolate.Rbf documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.Rbf.html)
- Bookstein, F. L. (1989). Principal warps: Thin-plate splines and the decomposition of deformations. IEEE Transactions on Pattern Analysis and Machine Intelligence.