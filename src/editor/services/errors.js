/** Thrown by service boundaries whose backend doesn't exist yet. */
export class FeatureUnavailableError extends Error {
  constructor(feature, message = `${feature} is not available yet.`) {
    super(message)
    this.name = 'FeatureUnavailableError'
    this.feature = feature
  }
}

/** Thrown when browser storage (localStorage / IndexedDB) can't be used. */
export class StorageError extends Error {
  constructor(reason, message) {
    super(message)
    this.name = 'StorageError'
    this.reason = reason // 'unavailable' | 'quota' | 'corrupt'
  }
}
