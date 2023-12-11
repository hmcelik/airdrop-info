const axios = require("axios");
module.exports = async function getTokenData(tokenAddress) {
  try {
    const resp = await axios.get(
      `https://api.dexview.com/pair?baseToken=${tokenAddress}&chainId=1`,
      {
        headers: {
          secret: "5ff3a258-2700-11ed-a261-0242ac120002",
        },
      }
    );
    return resp.data.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
