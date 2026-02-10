import { BaseBrokerAdapter } from "../basebroker.adapter.js";
import { fetchTradeBook } from "./angelone.api.js";
import { mapAngelOneTradeToTradeModel } from "./angelone.mapper.js";

export class AngelOneAdapter extends BaseBrokerAdapter {
  async fetchTrades() {
    return fetchTradeBook(
      this.credentials.accessToken,
      this.credentials.apiKey
    );
  }

  normalizeTrade(rawTrade, userId) {
    return mapAngelOneTradeToTradeModel(rawTrade, userId);
  }
}
