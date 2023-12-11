const axios = require("axios");

const API_URL = "https://api.gopluslabs.io/api/v1/token_security/1";
// const CONTRACT_ADDRESSES = '0x015d3c3F40910C7Ff1c6BE374A10DB245194D897';

async function getGoPlusTokenSecurityData(CONTRACT_ADDRESSES) {
  try {
    const response = await axios.get(API_URL, {
      params: { contract_addresses: CONTRACT_ADDRESSES },
    });

    // Assuming the response data is an object with the required information.
    return response.data.result[CONTRACT_ADDRESSES.toLowerCase()];
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

module.exports = getGoPlusTokenSecurityData;
