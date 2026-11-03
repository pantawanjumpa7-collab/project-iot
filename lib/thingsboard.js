
const BASE_URL = (
  process.env.TB_URL || ""
).replace(/\/+$/, "");

const API_KEY = process.env.TB_API_KEY;

export function isThingsBoardConfigured() {
  return Boolean(
    BASE_URL &&
    API_KEY &&
    process.env.TB_DEVICE_ID
  );
}

export async function tbFetch(path, options = {}) {
  if (!isThingsBoardConfigured()) {
    throw new Error(
      "ThingsBoard configuration is incomplete"
    );
  }

  const response = await fetch(
    `${BASE_URL}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Authorization": `ApiKey ${API_KEY}`,
        ...options.headers,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text();

    console.error(
        "ThingsBoard HTTP error:",
        response.status,
        details
    );

    throw new Error(
        `ThingsBoard API error: ${response.status}`
    );
}

  if (response.status === 204) {
    return null;
  }

  return response.json();
}