const https = require('https');

const args = process.argv.slice(2);

if (args.length != 1) {
    console.log("bot.js <API-TOKEN>");
    return;
}

const api_token = args[0];
console.log('API token: ', api_token);

const min_travel_time_mod_secs = 1;
const max_travel_time_mod_secs = 10;

const travel = {
  hostname: 'api.simple-mmo.com',
  path: '/api/travel/perform/kj8gzj4hd',
  method: 'POST',
  headers: {
    'Referer': 'https://web.simple-mmo.com/travel',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Origin': 'https://web.simple-mmo.com',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'DNT': '1',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
  }
}

start_bot(api_token);

function start_bot(api_token) {
    start_bot_routine(api_token, new Date().getTime() / 1000, 0);
}

function start_bot_routine(api_token, start_time, steps_count) {
    console.log("Walking...");

    var d_1 = 750 + Math.floor(Math.random() * 50);
    var d_2 = 100 + Math.floor(Math.random() * 200);

    const data = `api_token=${api_token}&d_1=${d_1}&d_2=${d_2}`

    const req = https.request(travel, res => {
        if (res.statusCode != 200) {
            console.log(`Status: ${res.statusCode}`)
            return;
        }

        var all_data = '';
        res.on('data', data_chunk => {
            all_data += data_chunk;
        });

        res.on('end', () => {
            response = JSON.parse(all_data);

            ++steps_count;

            if (typeof response.level !== 'undefined') {
                console.log(`Gold reward: ${response.gold_amount}, XP reward: ${response.exp_amount}`);
                console.log(`Level: ${response.level}, Gold: ${response.currentGold}, XP: ${response.currentEXP}`);
            }
            
            if (response.text.includes("Please complete the human verification")) {
                console.log("WARNING! BOT DETECTED!");

                var end_time = new Date().getTime() / 1000;
                console.log(`Traveled for ${(end_time - start_time) / 60} minutes, ${steps_count} steps made`);
                return;
            }

            let wait_time_sec = response.nextwait + min_travel_time_mod_secs + Math.floor(Math.random() * max_travel_time_mod_secs);

            console.log(`Next step in ${wait_time_sec} seconds`)

            setTimeout(() => {
                start_bot_routine(api_token, start_time, steps_count);
            }, 1000 * wait_time_sec);
        });
    })
      
    req.on('error', error => {
        console.error(`Error: ${error}`)
        return;
    })
      
    req.write(data)
    req.end()
}