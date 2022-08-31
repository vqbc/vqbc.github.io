(async () => {
  const axios = require("axios");
  const cheerio = require("cheerio");
  const fs = require("fs");

  const dirs = ["prev", "next", "below", "above", "behind", "front"];
  const opp = (dir) =>
    dirs[(dirs.indexOf(dir) / 2) * 2 + !(dirs.indexOf(dir) % 2)];
  /* get the opposite direction: next one if even index or prev one if odd */

  let myPage = fs.readFileSync("index.html", "utf8");
  const $ = cheerio.load(myPage);

  const getNeighbors = async () =>
    Object.fromEntries(
      await Promise.all(
        $("*[id*='wr-link-']")
          .map(async function () {
            let theirPage = await axios.get($(this).attr("href"));
            const $n = cheerio.load(theirPage.data); /* get neighbor page DOM */
            console.log($n.html());

            return [
              $(this)
                .attr("id")
                .split(" ")
                .filter((e) => e.includes("wr-link-"))[0]
                .split("wr-link-")[1] /* get direction of your links */,
              Object.fromEntries(
                await Promise.all(
                  $n("*[id*='wr-link-']") /* find links in neighbor */
                    .map(async function () {
                      return [
                        $n(this)
                          .attr("id")
                          .split(" ")
                          .filter((e) => e.includes("wr-link-"))[0]
                          .split("wr-link-")[1] /* get directions of neighbor's
                          links */,
                        {
                          text: $n(this).text(),
                          href: $n(this).attr("href"),
                        } /* make object of neighbor's link text/url */,
                      ];
                    })
                    .get()
                )
              ),
            ];
          })
          .get()
      )
    ); /* summary: get all ring links and build an object with their directions,
    corresponding neighbor's ring links */

  const neighbors = await getNeighbors();
  console.log(neighbors);

  for (const dir of dirs) {
    const theirURL = neighbors?.[dir]?.[opp(dir)]?.href;
    if (
      theirURL &&
      new URL(theirURL).hostname != process.argv[2] /* this argument
      is your domain name, default "$GITHUB_REPOSITORY_OWNER.github.io" */
    ) {
      matchLinks = new RegExp(
        `(.*)(<a.*?id="wr-link-${dir}".*?href=")([^"]*?)(".*?>)(.+?)(<\/a>)`,
        "gis"
      );
      myPage = myPage.replace(
        matchLinks,
        `$1$2${neighbors[dir][opp(dir)].href}$4${
          neighbors[dir][opp(dir)].text
        }$6`
      );
    } /* update ring links if neighbor's neighbor isn't you anymore */
  }

  fs.writeFileSync("index.html", myPage);
})();
