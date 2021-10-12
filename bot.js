const https = require('https');
const puppeteer = require('puppeteer');

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('bot.js <EMAIL> <PASSWORD> [-a]');
    console.log('   -a      Do attacks (WARNING! This is probably why accounts get banned)');
    return;
}

const email = args[0];
const password = args[1];
const do_attacks = args[2] === "-a";

if (do_attacks) {
    console.log("WARNING! Attacks enabled. You may get noticed earlier and banned. Use it at your own risk.");
}

const min_travel_time_mod_seconds = 2;
const max_travel_time_mod_seconds = 8;

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

start_bot(email, password, do_attacks);

async function start_bot(email, password, do_attacks) {
    console.log('Initializing session...')

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.setViewport({width: 1920, height: 1080});

    await page.goto('https://web.simple-mmo.com/login');

    await page.type('input[id=email]', email, { delay: 50 });
    await page.type('input[id=password]', password, { delay: 50 });
    await page.click('button[type=submit]');

    if (!(await check_login_success(page))) {
        console.log('Failed to login');
        return;
    }
    console.log('Login successfull!')

    const api_token = await get_travel_api_token(page);
    if (api_token === undefined) {
        console.log('Failed to parse API token');
        return;
    }

    console.log('API token: ' + api_token);    

    start_walk_routine(page, api_token, do_attacks, new Date().getTime() / 1000, 0);
}

async function check_login_success(page) {
    await page.waitForSelector('h1');
    const headers = await page.$$('h1');

    for (let header_idx = 0; header_idx < headers.length; ++header_idx) {
        if ((await headers[header_idx].asElement().getProperty('innerHTML')).toString().includes('Welcome back,')) {
            return true;
        }
    }

    return false;
}

async function get_travel_api_token(page) {
    await page.goto('https://web.simple-mmo.com/travel', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('script');

    const page_content = await page.content();

    try {
        const split = page_content.split('api_token: \'');
        const token = split[1].split('\'')[0];
        return token;
    } catch {
        return undefined;
    }
}

function start_walk_routine(page, api_token, do_attacks, start_time, steps_count) {
    console.log('Walking...');

    // Randomizing click coordinates that are sent with together with api token
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

            // console.log(response);

            if (typeof response.level !== 'undefined') {
                console.log(`Gold reward: ${response.gold_amount}, XP reward: ${response.exp_amount}`);
                console.log(`Level: ${response.level}, Gold: ${response.currentGold}, XP: ${response.currentEXP}`);
            }
            
            if (response.text.includes('Please complete the human verification')) {
                console.log('WARNING! BOT DETECTED!\nPlease complete the human verification manually');

                var end_time = new Date().getTime() / 1000;
                console.log(`Traveled for ${(end_time - start_time) / 60} minutes, ${steps_count} steps made`);

                return;
            } else if (do_attacks && response.text.includes('/npcs/attack/')) {
                var attack_event_id = response.text.split('/npcs/attack/')[1].split('?new_page=true')[0];
                
                attack_mob(page, api_token, start_time, steps_count, attack_event_id);
                return;
            } else if (response.text.includes('are dead')) {
                console.log(response);
                return;
            }

            let wait_time_sec = response.nextwait + min_travel_time_mod_seconds + Math.floor(Math.random() * (max_travel_time_mod_seconds));

            console.log(`Next step in ${wait_time_sec} seconds`)

            setTimeout(() => {
                start_walk_routine(page, api_token, start_time, steps_count);
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

// This attacking is super primitive. We try to attack for 3 time. If we defeat mob in such attempt amount - nice.
// It is done such way for simplicity. Seemed to work fine until eventually I got banned. 
// Use this at your own risk!
async function attack_mob(page, api_token, start_time, steps_count, attack_event_id) {
    console.log("Attacking...")
    await page.goto(`https://web.simple-mmo.com/npcs/attack/${attack_event_id}?new_page=false`, { waitUntil: 'domcontentloaded', timeout: 10000 });

    await do_attack(page, api_token, start_time, steps_count, 3);
}

async function do_attack(page, api_token, start_time, steps_count, number_of_attacks) {
    if (number_of_attacks === 0) {
        console.log("Finished attack! Continue walking...")
        start_walk_routine(page, api_token, start_time, steps_count);
        return;
    }

    const attack = 'button[id="attackButton"]';

    await page.waitForSelector(attack);
    await page.click(attack);

    setTimeout(() => {
        page.screenshot({ path: 'attack.png' });
        do_attack(page, api_token, start_time, steps_count, --number_of_attacks);
    }, 1000 * 5);
}
