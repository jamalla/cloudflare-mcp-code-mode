import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class WeatherMCP extends McpAgent {
  server = new McpServer({ name: "weather", version: "1.0.0" });

  async init() {
    // Tool 1: current weather
    this.server.tool(
      "get_current_weather",
      "Get current weather for a city. Returns temperature in Celsius and conditions.",
      { location: z.string().describe("City name e.g. 'London' or 'Austin, TX'") },
      async ({ location }) => {
        // Step 1: geocode the city
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        ).then(r => r.json());

        if (!geo.results?.length) {
          return { content: [{ type: "text", text: `Could not find location: ${location}` }] };
        }

        const { latitude, longitude, name, country } = geo.results[0];

        // Step 2: fetch weather
        const weather = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m`
        ).then(r => r.json());

        const code = weather.current.weathercode;
        const conditions = weatherCodeToText(code);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              location: `${name}, ${country}`,
              temperature_c: weather.current.temperature_2m,
              temperature_f: Math.round(weather.current.temperature_2m * 9/5 + 32),
              conditions,
              wind_kph: weather.current.windspeed_10m,
              humidity_pct: weather.current.relative_humidity_2m,
            })
          }]
        };
      }
    );

    // Tool 2: forecast (perfect for showing parallel chaining)
    this.server.tool(
      "get_forecast",
      "Get a multi-day weather forecast for a city.",
      {
        location: z.string().describe("City name"),
        days: z.number().min(1).max(7).default(5).describe("Number of days"),
      },
      async ({ location, days }) => {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        ).then(r => r.json());

        if (!geo.results?.length) {
          return { content: [{ type: "text", text: `Could not find: ${location}` }] };
        }

        const { latitude, longitude, name, country } = geo.results[0];

        const forecast = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum` +
          `&forecast_days=${days}&timezone=auto`
        ).then(r => r.json());

        const days_data = forecast.daily.time.map((date: string, i: number) => ({
          date,
          high_c: forecast.daily.temperature_2m_max[i],
          low_c: forecast.daily.temperature_2m_min[i],
          conditions: weatherCodeToText(forecast.daily.weathercode[i]),
          rain_mm: forecast.daily.precipitation_sum[i],
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ location: `${name}, ${country}`, forecast: days_data }) }]
        };
      }
    );
  }
}

function weatherCodeToText(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 9) return "Foggy";
  if (code <= 19) return "Drizzle";
  if (code <= 29) return "Rain";
  if (code <= 39) return "Snow";
  if (code <= 49) return "Freezing fog";
  if (code <= 59) return "Light rain";
  if (code <= 69) return "Heavy rain";
  if (code <= 79) return "Snowfall";
  if (code <= 84) return "Rain showers";
  if (code <= 94) return "Thunderstorm";
  return "Severe thunderstorm";
}

export default {
  fetch(req: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(req.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return WeatherMCP.serveSSE("/sse").fetch(req, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return WeatherMCP.serve("/mcp").fetch(req, env, ctx);
    }
    return new Response("Weather MCP Server", { status: 200 });
  }
};