module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const amount = Number(body.amount);
    const customerName = String(body.customer_name || "").trim();
    const phone = String(body.phone || "").trim();

    // Validate amount
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount."
      });
    }

    // Validate name
    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required."
      });
    }

    // Clean phone number
    let accountNumber = phone.replace(/\D/g, "");

    if (accountNumber.startsWith("0")) {
      accountNumber = "260" + accountNumber.substring(1);
    }

    if (!accountNumber.startsWith("260")) {
      accountNumber = "260" + accountNumber;
    }

    // Zambian number should be 12 digits: 260 + 9 digits
    if (accountNumber.length !== 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid Zambian phone number."
      });
    }

    // Check API key
    const apiKey = process.env.LIPILA_API_KEY;

    if (!apiKey) {
      console.error("LIPILA_API_KEY is missing");

      return res.status(500).json({
        success: false,
        message: "Payment configuration is missing."
      });
    }

    // Generate unique reference
    const referenceId =
      "CMK-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const payload = {
      referenceId: referenceId,
      amount: amount,
      narration: "CMK Web Solutions payment",
      accountNumber: accountNumber,
      currency: "ZMW",
      referenceData: customerName
    };

    console.log("Sending payment request:", {
      referenceId,
      amount,
      accountNumber
    });

    const lipilaResponse = await fetch(
      "https://blz.lipila.io/api/v1/collections/mobile-money",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await lipilaResponse.text();

    console.log("Lipila status:", lipilaResponse.status);
    console.log("Lipila response:", responseText);

    let lipilaData;

    try {
      lipilaData = JSON.parse(responseText);
    } catch {
      lipilaData = {
        rawResponse: responseText
      };
    }

    if (!lipilaResponse.ok) {
      return res.status(502).json({
        success: false,
        message: "Lipila rejected the payment request.",
        lipilaStatus: lipilaResponse.status,
        details: lipilaData
      });
    }

    return res.status(200).json({
      success: true,
      referenceId: referenceId,
      data: lipilaData
    });

  } catch (error) {
    console.error("CREATE PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Payment function failed.",
      error: error.message
    });
  }
};
