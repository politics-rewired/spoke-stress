require("dotenv").config();
const Keygrip = require("keygrip");

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("Missing env var SESSION_SECRET");
}
const keys = new Keygrip([secret]);

const createCookieString = auth0Id => {
  const jsonString = JSON.stringify({ passport: { user: auth0Id } });
  const buffer = new Buffer(jsonString);
  const sessionVal = buffer.toString("base64");
  const sessionCookie = `session=${sessionVal}`;
  const signature = keys.sign(sessionCookie);
  const signatureCookie = `session.sig=${signature}`;
  return { session: sessionCookie, "session.sig": signatureCookie };
};

module.exports = {
  createCookieString: createCookieString
};
