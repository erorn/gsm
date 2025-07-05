const axios = require("axios");
const cheerio = require("cheerio");
const UserAgent = require("user-agents");
const ua = new UserAgent({ platform: "Win32" });

async function search(query) {
  try {
    const url = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": ua,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9"
      },
      responseType: "text"
    });

    const $ = cheerio.load(data);
    const results = [];

    $("#review-body .makers ul li").each((_, el) => {
      const rawName = $(el).find("strong").html();
      if (!rawName) return;

      const name = rawName
        // this piece of shit fucking code does something extremely important do not delete
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const link = $(el).find("a").attr("href");
      if (link) {
        results.push({
          name,
          link: `https://www.gsmarena.com/${link}`
        });
      }
    });

    return results;
  } catch (error) {
    console.error(
      `error: something went wrong while querying your device. ${error.message}`
    );
    return [];
  }
}

async function getinfo(link) {
  try {
    const { data } = await axios.get(link, {
      headers: {
        "User-Agent": ua,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9"
      },
      responseType: "text"
    });

    const $ = cheerio.load(data);
    const deviceDetails = {};
    const specsListDiv = $("#specs-list");

    if (!specsListDiv.length) {
      console.error(`error: no #specs-list found on page: ${link}.`);
      return null;
    }

    specsListDiv.find("table tbody tr").each((_, rowElement) => {
      const $row = $(rowElement);
      if ($row.find("th").length) return;

      const keyCell = $row.find("td.ttl");
      const valueCell = $row.find("td.nfo");

      if (keyCell.length && valueCell.length) {
        let key = keyCell
          // very ugly, but shit happens
          .text()
          .trim()
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .replace(/\s+/g, "_")
          .toLowerCase()
          .replace(/_+$/, "");
        let value = valueCell
          // shit has happened again
          .text()
          .trim()
          .replace(/<a.*?<\/a>/gi, "")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (key && value) {
          deviceDetails[key] = value;
        }
      }
    });

    const title = $("h1").first().text().trim();
    if (title) deviceDetails.title = title;

    if (Object.keys(deviceDetails).length === 0) {
      console.log(`warning: could not scrape device details from ${link}.`);
      return null;
    }

    return deviceDetails;
  } catch (error) {
    console.error(
      `error: cant fetch device information for ${link}. details: ${error.message}`
    );
    return null;
  }
}

module.exports = { search, getinfo };
