import axios from 'axios';

const getUserTokens = async (waxAccount) => {
  const url = `https://stg-lightapi.waxstg.net/api/balances/waxstage/${waxAccount}`
  const response = await axios.get(url)
  return response.data.balances;
}

const getTokenInfos = async (tokens) => {

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://wax-coin-metrics-v2.vstriketest001.workers.dev/v2',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,vi;q=0.8,ja;q=0.7',
      'content-type': 'application/json',
      'origin': 'http://new-wallet-local.thh.io:9002',
      'priority': 'u=1, i',
      'referer': 'http://new-wallet-local.thh.io:9002/',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    },
    data: JSON.stringify(tokens.map(t => {
      delete t.amount;
      return t
    }))
  };

  return await axios.request(config)
    .then((response) => {
      return response.data.data;
    })
    .catch((error) => {
      console.log(error);
    });
}

const main = async () => {
  const userTokens = await getUserTokens('ac.wam');
  const requestInfos = userTokens.map(it => {
    return {
      contract: it.contract,
      currency: it.currency,
    }
  })
  const tokenInfos = await getTokenInfos(requestInfos);

  const consolidate = userTokens.map(ut => {
    const found = tokenInfos.find(t => t.contract === ut.contract && t.currency === ut.currency);
    return {
      ...ut,
      ...found
    };
  })

  // 1. calculate total value change
  const currentPortfolioValue = consolidate.reduce((acc, t) => {
    return Number(acc) + Number(t.amount || '0') * Number(t.last || '0');
  }, 0);
  const open24hPortfolioValue = consolidate.reduce((acc, t) => {
    return acc + Number(t.amount || '0') * Number(t.open24h || '0');
  }, 0);
  const change24hPercentage = (currentPortfolioValue - open24hPortfolioValue) / open24hPortfolioValue * 100;
  const change24hValue = currentPortfolioValue - open24hPortfolioValue;

  const tokenValuesChange = consolidate.map(t => {
    const currentAmount = t.amount * t.last;
    const open24hAmount = t.amount * t.open24h;
    const change24hPercentage = (currentAmount - open24hAmount) / open24hAmount * 100;
    const change24hValue = currentAmount - open24hAmount;

    return {
      ...t,
      change24hPercentage: change24hPercentage || 0,
      change24hValue: change24hValue || 0,
    }
  });
  console.log(tokenValuesChange);

  console.log('Portfolio % change: ', change24hPercentage, '%');
  console.log('Portfolio va  change: ', '$', change24hValue);
}

main();