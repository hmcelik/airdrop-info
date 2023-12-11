const axios = require("axios");
module.exports = async function getHoneyPot(CONTRACT_ADDRESSES, PAIR_ADDRESS) {
  let API_URL = `https://api.honeypot.is/v2/IsHoneypot`;
  try {
    const response = await axios.get(API_URL, {
      params: { address: CONTRACT_ADDRESSES, chainID: 1 },
    });

    // Assuming the response data is an object with the required information.
    return response.data;
  } catch (error) {
    // console.error("Error fetching data:", error);
    return null;
  }
};
