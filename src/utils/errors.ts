export class PlexicusApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message)
    this.name = 'PlexicusApiError'
  }
}

export class PlexicusAuthError extends Error {
  constructor(message = 'Not authenticated') {
    super(message)
    this.name = 'PlexicusAuthError'
  }
}

export class PlexicusConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlexicusConfigError'
  }
}

export class LLMError extends Error {
  constructor(message: string, public readonly provider: string) {
    super(message)
    this.name = 'LLMError'
  }
}
