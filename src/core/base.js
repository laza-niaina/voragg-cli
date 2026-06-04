/**
 * Abstract base classes — documented interfaces that throw if unimplemented methods are called.
 */

export class VideoPlayer {
  get name() {
    throw new Error('Subclass must implement get name()');
  }

  async extractDirectUrl(url) {
    throw new Error('Subclass must implement extractDirectUrl()');
  }
}

export class BaseEpisode {
  constructor({ number, name, url }) {
    this.number = number;
    this.name = name || '';
    this.url = url;
    this._playerUrl = null;
  }

  async getPlayerUrl() {
    if (this._playerUrl !== null) return this._playerUrl;
    this._playerUrl = await this._resolvePlayerUrl();
    return this._playerUrl;
  }

  async _resolvePlayerUrl() {
    throw new Error('Subclass must implement getPlayerUrl()');
  }
}

export class Platform {
  get name() {
    throw new Error('Subclass must implement get name()');
  }

  async getEpisodes(seriesUrl) {
    throw new Error('Subclass must implement getEpisodes()');
  }
}
