import { BaseBrokerAdapter } from "../basebroker.adapter.js";
import { fetchTradeHistory } from "./dhan.api.js";
import { mapDhanTradeToTradeModel } from "./dhan.mapper.js";

export class DhanAdapter extends BaseBrokerAdapter {
  async fetchTrades() {
    // Calculate date range: last 30 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch historical trades using the Trade History endpoint
    return fetchTradeHistory(
      this.credentials.accessToken,
      this.credentials.clientId,
      formatDate(fromDate),
      formatDate(toDate)
    );
  }

  normalizeTrade(rawTrade, userId) {
    return mapDhanTradeToTradeModel(rawTrade, userId);
  }
}
