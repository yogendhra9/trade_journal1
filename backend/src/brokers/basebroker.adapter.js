export class BaseBrokerAdapter {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async fetchTrades() {
    throw new Error("fetchTrades not implemented");
  }

  normalizeTrade(rawTrade, userId) {
    throw new Error("normalizeTrade not implemented");
  }
}
