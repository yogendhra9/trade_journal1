# Trading Journal MCP Server

## Overview

This MCP server exposes your trading journal data to LLM clients.

## Available Tools

| Tool | Description |
|------|-------------|
| `get_all_patterns` | Get all market behavior patterns |
| `get_pattern_details` | Get details of a specific pattern (P1-P9) |
| `get_user_trades` | Get trading history for a user |
| `get_trade_context` | Get full context for a trade including pattern |
| `get_user_pattern_stats` | Get user's win rate per pattern |
| `get_open_positions` | Get user's current holdings |
| `get_trading_summary` | Get overall trading performance |

## Available Resources

| Resource | Description |
|----------|-------------|
| `patterns://all` | All pattern definitions as markdown |

## Usage

### With Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "trading-journal": {
      "command": "node",
      "args": ["src/mcp/server.js"],
      "cwd": "/path/to/tradej1/backend"
    }
  }
}
```

### Standalone Testing

```bash
cd backend
node src/mcp/server.js
```

The server uses stdio transport and communicates via JSON-RPC.
