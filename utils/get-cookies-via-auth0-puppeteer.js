/**
 * NOTE: Deprecated in favor of get-cookies-via-db.js
 *
 * This CLI script generates the cookies.csv file of credentials by using puppeteer to capture
 * the cookies for login sessions.
 *
 *     node get-cookies-via-auth0-puppeteer.js JOIN_URL [NUMBER_TO_CREATE] [PATH]
 *
 * Arguments
 *   JOIN_URL         - [required] The URL to join an existing Spoke organization.
 *   NUMBER_TO_CREATE - [optional] The number of users to create. Default = 1.
 *   OUTPUT_PATH      - [optional] The output path for the generated CSV. Default = './cookies.csv'.
 */

const puppeteer = require("puppeteer");
const faker = require("faker");
const papaparse = require("papaparse");
const fs = require("fs");
const _ = require("lodash");
const PASSWORD = "Password!";
const BATCH_SIZE = 5;

async function main(n, outputPath) {
  const campaignJoinLink = process.argv[2];
  console.log(`Creating new users with campaign join link ${campaignJoinLink}`);
  const browser = await puppeteer.launch({ headless: true });

  const allCookies = [];

  const batches = _.chunk(
    new Array(n).fill(null).map((ignore, idx) => idx),
    BATCH_SIZE
  );

  for (let batch of batches) {
    console.log(`Creating new batch of ${batch.length}`);
    const promises = batch.map(idx =>
      (async () => {
        const cookies = await signUpUser(browser, campaignJoinLink);
        const toKeep = cookies
          .filter(cookie => cookie.name.includes("session"))
          .reduce((acc, kv) => Object.assign(acc, { [kv.name]: kv.value }), {});

        allCookies.push(toKeep);
      })()
    );

    await Promise.all(promises);
  }

  const output = papaparse.unparse(allCookies);
  fs.writeFileSync(outputPath, output);

  await browser.close();
  return "Done!";
}

const genUser = email => ({
  email: email,
  password: PASSWORD,
  given_name: faker.name.firstName(),
  family_name: faker.name.lastName(),
  cell: faker.phone.phoneNumberFormat()
});

async function signUpUser(browser, campaignJoinLink) {
  const email = `test.${faker.random.alphaNumeric(4)}@test.com`;
  const user = genUser(email);

  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  await page.goto(campaignJoinLink);

  await page.waitFor(".auth0-lock-tabs a:not(.auth0-lock-tabs-current)");
  await sleep(1000);
  await page.click(".auth0-lock-tabs a:not(.auth0-lock-tabs-current)");
  await sleep(1000);

  for (let input_name of Object.keys(user)) {
    const selector = `input[name="${input_name}"]`;
    await page.focus(selector);
    await page.keyboard.type(user[input_name]);
  }

  await page.click('input[type="checkbox"]');
  await sleep(1000);

  await page.click(".auth0-lock-submit");

  await page.waitFor("div#mount");
  const cookies = await page.cookies();
  await page.close();
  await context.close();

  return cookies;
}

const sleep = n =>
  new Promise((resolve, reject) => setTimeout(() => resolve(true), n));

main(parseInt(process.argv[3] || 1), process.argv[4] || "./cookies.csv")
  .then(console.log)
  .catch(console.error);
