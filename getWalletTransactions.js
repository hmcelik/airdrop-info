const axios = require("axios");

module.exports = async function getWalletTransaction(
  pairAddress,
  walletAddress
) {
  try {
    const resp = await axios.get(
      `
      https://api.dexview.com/pair/list-tx?limit=100&chainId=1&pair=${pairAddress}&maker=${walletAddress}`,
      {
        headers: {
          secret: "5ff3a258-2700-11ed-a261-0242ac120002",
        },
      }
    );
    return resp.data.data;
  } catch (error) {
    return null;
  }
};
