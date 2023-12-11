const { Bot, GrammyError, HttpError } = require("grammy");
const { createPublicClient, webSocket } = require("viem");
const { mainnet } = require("viem/chains");

const transport = webSocket("RPC LINK OF ETH");

const client = createPublicClient({
  chain: mainnet,
  transport,
});
const Web3 = require("web3");
const Moralis = require("moralis").default;
const format = require("./Fomartter");
const contractABI = require("./erc20ABI.json");
const shortenAddress = require("./shortAddress");
const getHoneypot = require("./getHoneypot");
const getGoPlusTokenSecurityData = require("./getGoPlusInfo");
const getTokenData = require("./getTokenData");
const getWalletTransactions = require("./getWalletTransactions");
const providerUrl =
  "https://mainnet.infura.io/v3/67b8e8a4dbc2435ba9c72afc1b6ca145";
// const bot = new Bot("6565495016:AAGRpo_SJkwEShIhTAwyX6iF4JvSwutivyQ"); // <-- put your bot token between the ""
const bot = new Bot("6488177332:AAGb6WurwoMF-EZT1ojJi47nVk8R5DRdEOU"); // <-- put your bot token between the ""
const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
bot.command("start", (ctx) =>
  ctx.reply(
    "Welcome! Simply share the contract address of the token you're interested in, and our bot will handle the rest, promptly unveiling a record of wallet addresses that have been recipients of airdrops. For airdrops that have already been liquidated."
  )
);
(async () => {
  await Moralis.start({
    apiKey: "RXe1puseQfQ1ksF86rXDd9CKycLuzurapd17T3xaQUfJ427X2xt4WcTMyjCMNgeT",
  });
})();
bot.on("message", async (ctx) => {
  let CONTRACT_ADDRESSES = ctx.message.text.toLowerCase();
  console.log(CONTRACT_ADDRESSES);
  if (!isValidERC20Address(CONTRACT_ADDRESSES)) {
    return;
  }
  let msgId = (await ctx.reply("Processing....")).message_id;
  let chatId = ctx.chat.id;
  try {
    const contractHoneypotInfo = await getHoneypot(CONTRACT_ADDRESSES);
    if (!contractHoneypotInfo) {
      await ctx.api.editMessageText(chatId, msgId, "Token has no liquidity");
    }
    // console.log(contractHoneypotInfo);
    if (!contractHoneypotInfo?.simulationSuccess) {
      await ctx.api.editMessageText(chatId, msgId, "NO LIQUIDITY/HP");
      return;
    }
    const contractGoPlus = await getGoPlusTokenSecurityData(CONTRACT_ADDRESSES);
    const contractData = await getTokenData(CONTRACT_ADDRESSES);

    // console.log(chainContractData);
    if (!contractData) {
      await ctx.api.editMessageText(chatId, msgId, "Contract is invalid");
      return;
    }
    // console.log(contractData);

    const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
      chain: "0x1",
      address: contractGoPlus.creator_address,
      fromDate: parseInt(contractHoneypotInfo.pair.createdAtTimestamp),
      //   limit: 10,
    });
    // console.log(contractData.address);
    // console.log(response.raw.result, contractData.address);
    let filterData = response.raw.result
      .filter((tx) => tx.address.toLowerCase() == CONTRACT_ADDRESSES)
      .filter((tx) => tx.to_address.toLowerCase() != CONTRACT_ADDRESSES)
      .filter(
        (tx) =>
          tx.to_address.toLowerCase() != contractData.address.toLowerCase()
      )
      .filter(
        (tx) =>
          tx.to_address.toLowerCase() !=
          "0x000000000000000000000000000000000000dead"
      )
      .filter(
        (tx) =>
          tx.to_address.toLowerCase() !=
          "0x0000000000000000000000000000000000000001"
      );

    let totalSupply = contractGoPlus.total_supply;
    let totalAirdrop = filterData.reduce(
      (accumulator, currentValue) =>
        accumulator + Number(currentValue.value_decimal),
      0
    );
    let totalAirdropPercentage = getPercentage(totalAirdrop, totalSupply);

    console.log(filterData.length);

    if (filterData.length > 30) {
      let data = filterData.slice(1, 30);
      let holderString = ``;
      for (let i = 0; i < data.length; i++) {
        const walletOne = await getWalletTransactions(
          contractData.address,
          filterData[i].to_address
        );
        // if (
        //   filterData[i].to_address ==
        //   "0xe992704045f1fc221b4c2d84b72ab4c8c4b6a0a5"
        // ) {
        //   console.log(walletOne, "---", filterData[i]);
        // }
        const onlySell = walletOne.filter((wallet) => wallet.isBuy == false);
        const totalAmountUSD = onlySell.reduce(
          (accumulator, currentValue) =>
            accumulator + Number(currentValue.amountUsd),
          0
        );
        const airdropAmountUSD =
          Number(filterData[i].value_decimal) * contractData.priceUsd;
        const totalAmountToken = onlySell.reduce(
          (accumulator, currentValue) =>
            accumulator + Number(currentValue.baseAmount),
          0
        );
        let airdropAmountPercentage = parseFloat(
          getPercentage(filterData[i].value_decimal, totalSupply)
        ).toFixed(2);
        let sellAmountPercentage = parseFloat(
          getPercentage(totalAmountToken, totalSupply)
        ).toFixed(2);
        holderString += `
      └ ${i + 1}. <a href="https://etherscan.io/address/${
          filterData[i].to_address
        }">${shortenAddress(
          filterData[i].to_address
        )}</a> (${airdropAmountPercentage}%)
          └ Sold - $${totalAmountUSD.toFixed(2)} (${sellAmountPercentage}%)
          └ Token Balance (USD): $${parseFloat(
            Math.abs(
              Number(filterData[i].value_decimal) - Number(totalAmountToken)
            ) * contractData.priceUsd
          ).toFixed(2)}$
      `;
      }
      ctx.api.editMessageText(
        chatId,
        msgId,
        `
<strong>📛 Name:</strong> ${contractData.baseTokenData.name} (${
          contractData.baseTokenData.symbol
        })
<strong>💰 Tax:</strong> ${parseFloat(
          contractHoneypotInfo.simulationResult.buyTax
        ).toFixed(2)} % / ${parseFloat(
          contractHoneypotInfo.simulationResult.sellTax
        ).toFixed(2)} %
<strong>💧 Liquidity:</strong> ${format(contractData.liquidity)}
<strong>🤵🏼 Owner Address:</strong>  <a href="https://etherscan.io/address/${
          contractGoPlus.owner_address
        }">${shortenAddress(contractGoPlus.owner_address)}</a>
      
<strong>🍯 Honeypot:</strong> ${
          contractHoneypotInfo?.honeypotResult.isHoneypot ? "🔴" : "🟢"
        }
<strong>💸 Total airdropped:</strong> ${parseFloat(
          totalAirdropPercentage
        ).toFixed(4)}%
<strong>🤔 Wallets airdropped:</strong>
${holderString}  
and more...
          `,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }
      );
    } else {
      let holderString = ``;
      for (let i = 0; i < filterData.length; i++) {
        const walletOne = await getWalletTransactions(
          contractData.address,
          filterData[i].to_address
        );
        // if (
        //   filterData[i].to_address ==
        //   "0xe992704045f1fc221b4c2d84b72ab4c8c4b6a0a5"
        // ) {
        //   console.log(walletOne, "---", filterData[i]);
        // }
        const onlySell = walletOne.filter((wallet) => wallet.isBuy == false);
        const totalAmountUSD = onlySell.reduce(
          (accumulator, currentValue) =>
            accumulator + Number(currentValue.amountUsd),
          0
        );
        const airdropAmountUSD =
          Number(filterData[i].value_decimal) * contractData.priceUsd;
        const totalAmountToken = onlySell.reduce(
          (accumulator, currentValue) =>
            accumulator + Number(currentValue.baseAmount),
          0
        );
        let airdropAmountPercentage = parseFloat(
          getPercentage(filterData[i].value_decimal, totalSupply)
        ).toFixed(2);
        let sellAmountPercentage = parseFloat(
          getPercentage(totalAmountToken, totalSupply)
        ).toFixed(2);
        holderString += `
      └ ${i + 1}. <a href="https://etherscan.io/address/${
          filterData[i].to_address
        }">${shortenAddress(
          filterData[i].to_address
        )}</a> (${airdropAmountPercentage}%)
          └ Sold - $${totalAmountUSD.toFixed(2)} (${sellAmountPercentage}%)
          └ Token Balance (USD): $${parseFloat(
            Math.abs(
              Number(filterData[i].value_decimal) - Number(totalAmountToken)
            ) * contractData.priceUsd
          ).toFixed(2)}$
      `;
      }
      ctx.api.editMessageText(
        chatId,
        msgId,
        `
<strong>📛 Name:</strong> ${contractData.baseTokenData.name} (${
          contractData.baseTokenData.symbol
        })
<strong>💰 Tax:</strong> ${parseFloat(
          contractHoneypotInfo.simulationResult.buyTax
        ).toFixed(2)} % / ${parseFloat(
          contractHoneypotInfo.simulationResult.sellTax
        ).toFixed(2)} %
<strong>💧 Liquidity:</strong> ${format(contractData.liquidity)}
<strong>🤵🏼 Owner Address:</strong>  <a href="https://etherscan.io/address/${
          contractGoPlus.owner_address
        }">${shortenAddress(contractGoPlus.owner_address)}</a>
      
<strong>🍯 Honeypot:</strong> ${
          contractHoneypotInfo?.honeypotResult.isHoneypot ? "🔴" : "🟢"
        }
<strong>💸 Total airdropped:</strong> ${parseFloat(
          totalAirdropPercentage
        ).toFixed(4)}%
<strong>🤔 Wallets airdropped:</strong>
      ${holderString}  
          `,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }
      );
    }

    // }
  } catch (e) {
    console.error(e);
  }
});

bot.start();
// async function sendNamesInGroups(chatId, names) {

// }

function isValidERC20Address(address) {
  // Check if the address is a string and its length is 42
  if (typeof address !== "string" || address?.length !== 42) {
    return false;
  }

  // Check if the address starts with "0x" and the rest are hexadecimal characters
  if (/^0x[0-9A-Fa-f]{40}$/.test(address)) {
    return true;
  }

  return false;
}
function getPercentage(amount, totalAmount) {
  if (totalAmount === 0) {
    return 0;
  }

  const percentage = (amount / totalAmount) * 100;
  return percentage;
}

// async function getContractInfo(CONTRACT_ADDRESSES) {
//   try {
//     const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESSES);

//     const name = await contract.methods.name().call();
//     const symbol = await contract.methods.symbol().call();
//     // const owner = await contract.methods.owner().call();

//     return { name, symbol };
//   } catch (error) {
//     console.log(error);
//     return null;
//   }
// }

bot.command("addWallet", (ctx) => {
  let address = ctx.message.text;
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
