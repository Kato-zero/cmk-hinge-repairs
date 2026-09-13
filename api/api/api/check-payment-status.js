module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const referenceId = String(
      req.query.referenceId || ""
    ).trim();

    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: "referenceId is required"
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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        rawResponse: text
      };
    }

    console.log("Lipila payment status:", data);

    return res.status(response.status).json({
      success: response.ok,
      data: data
    });

  } catch (error) {
    console.error("STATUS CHECK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check payment status",
      error: error.message
    });
  }
};
