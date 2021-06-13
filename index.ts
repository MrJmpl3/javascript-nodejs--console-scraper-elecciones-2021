import cac from "cac";
import * as fs from "fs-extra";
import puppeteer from "puppeteer";
import userAgent from "user-agents";
import path from "path";
import delay from "delay";

const isJson = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const mesaError = (mesa: string, error: string) => {
  if (!fs.existsSync("error.csv")) {
    fs.appendFileSync("error.csv", "MESA,ERROR\r\n");
  }

  fs.appendFileSync("error.csv", `${mesa},${error}\r\n`);
};

const cli = cac();

cli
  .command("scraper")
  .option("--inicio [inicio]", "Mesa donde inicia")
  .option("--final [final]", "Mesa donde finaliza")
  .action(async ({ inicio, final }: { inicio: number; final: number }) => {
    // console.log(inicio.toString().padStart(6, "0"));
    // console.log(final.toString().padStart(6, "0"));

    fs.ensureDirSync("json");

    for (let mesa = inicio; mesa <= final; mesa++) {
      const mesaPad = mesa.toString().padStart(6, "0");

      console.log(`Scrapeando la mesa: ${mesaPad}`);

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setUserAgent(userAgent.toString());
      await page.goto(
        `https://api.resultadossep.eleccionesgenerales2021.pe/mesas/detalle/${mesaPad}`
      );

      try {
        await page.waitForSelector("pre");
      } catch {
        console.log(`Error en la mesa ${mesaPad} - No data`);
        mesaError(mesaPad, "No data");
        continue;
      }

      let element = await page.$("pre");
      if (element === null) {
        console.log(`Error en la mesa ${mesaPad} - No data`);
        mesaError(mesaPad, "No data");
        continue;
      }

      const data = await page.evaluate((el) => el.textContent, element);
      if (!isJson(data)) {
        console.log(`Error en la mesa ${mesaPad} - Data is not a JSON`);
        mesaError(mesaPad, "Data is not a JSON");
        continue;
      }

      console.log(`Guardando datos de la mesa: ${mesaPad}`);
      fs.appendFileSync(path.resolve("json", `${mesaPad}.json`), data);

      await delay(1000);

      await browser.close();
    }
  });

cli.parse();
