module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const referenceId = String(req.query.referenceId || "").trim();

  // Adjust the pattern to match whatever format Lipila actually issues
  if (!referenceId || !/^[a-zA-Z0-9_-]{6,64}$/.test(referenceId)) {
    return res.status(400).json({
      success: false,
      message: "A valid referenceId is required"
    });
  }

  const apiKey = process.env.LIPILA_API_KEY;

  if (!apiKey) {
    console.error("LIPILA_API_KEY is missing");
    return res.status(500).json({
      success: false,
      message: "Payment configuration is missing"
    });
  }

  const url =
    "https://blz.lipila.io/api/v1/collections/check-status?referenceId=" +
    encodeURIComponent(referenceId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s upstream timeout

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey
      },
      signal: controller.signal
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { rawResponse: text };
    }

    // Log status + reference only — avoid writing full payment payloads to logs
    console.log("Lipila status check", {
      referenceId,
      status: response.status,
      ok: response.ok
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    const isTimeout = error.name === "AbortError";

    console.error("STATUS CHECK ERROR:", {
      referenceId,
      message: error.message,
      timeout: isTimeout
    });

    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      message: isTimeout
        ? "Payment provider timed out"
        : "Unable to check payment status"
    });

  } finally {
    clearTimeout(timeout);
  }
};
