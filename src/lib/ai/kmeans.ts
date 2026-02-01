
/**
 * Simple K-Means implementation for clustering vectors.
 */

// Calculate Cosine Similarity (preferred for embeddings) or Euclidean Distance
// For normalized embeddings, Euclidean and Cosine give similar ranking, but Dot Product is fastest.
function dotProduct(a: Float32Array | number[], b: Float32Array | number[]) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

// Since embeddings from transformers.js (all-MiniLM) are usually normalized, 
// Dot Product == Cosine Similarity.
// 1.0 = identical, -1.0 = opposite.

/**
 * Perform K-Means clustering
 * @param vectors Array of vectors (embeddings)
 * @param k Number of clusters
 * @param maxIterations Max iterations
 */
export function kMeans(vectors: Float32Array[], k: number, maxIterations: number = 20) {
    if (vectors.length < k) {
        // Not enough points, just return identical cluster 0
        return new Array(vectors.length).fill(0);
    }

    const dimension = vectors[0].length;

    // 1. Initialize Centroids (Randomly pick k vectors)
    // Ensuring unique starting points
    let centroids: Float32Array[] = [];
    const usedIndices = new Set<number>();

    while (centroids.length < k) {
        const idx = Math.floor(Math.random() * vectors.length);
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            centroids.push(new Float32Array(vectors[idx])); // Copy
        }
    }

    let assignments = new Int32Array(vectors.length);
    let iterations = 0;
    let moved = true;

    while (moved && iterations < maxIterations) {
        moved = false;
        iterations++;

        // 2. Assign vectors to nearest centroid
        for (let i = 0; i < vectors.length; i++) {
            const vec = vectors[i];
            if (!vec) continue; // Skip nulls

            let bestScore = -Infinity; // For Dot Product, higher is better
            let bestCluster = 0;

            for (let c = 0; c < k; c++) {
                const score = dotProduct(vec, centroids[c]);
                if (score > bestScore) {
                    bestScore = score;
                    bestCluster = c;
                }
            }

            if (assignments[i] !== bestCluster) {
                assignments[i] = bestCluster;
                moved = true;
            }
        }

        // 3. Update Centroids
        if (moved) {
            const newCentroids = new Array(k).fill(0).map(() => new Float32Array(dimension));
            const counts = new Array(k).fill(0);

            for (let i = 0; i < vectors.length; i++) {
                const cluster = assignments[i];
                const vec = vectors[i];
                if (!vec) continue;

                // Add to sum
                for (let d = 0; d < dimension; d++) {
                    newCentroids[cluster][d] += vec[d];
                }
                counts[cluster]++;
            }

            // Average and Normalize
            for (let c = 0; c < k; c++) {
                if (counts[c] > 0) {
                    // Divide by count
                    for (let d = 0; d < dimension; d++) {
                        newCentroids[c][d] /= counts[c];
                    }
                    // Normalize (important for Dot Product to work as Cosine)
                    let norm = 0;
                    for (let d = 0; d < dimension; d++) {
                        norm += newCentroids[c][d] * newCentroids[c][d];
                    }
                    norm = Math.sqrt(norm);
                    if (norm > 0) {
                        for (let d = 0; d < dimension; d++) {
                            newCentroids[c][d] /= norm;
                        }
                    }
                } else {
                    // Orphaned centroid? Reset to random point
                    const idx = Math.floor(Math.random() * vectors.length);
                    newCentroids[c] = new Float32Array(vectors[idx]);
                }
            }
            centroids = newCentroids;
        }
    }

    return Array.from(assignments);
}
