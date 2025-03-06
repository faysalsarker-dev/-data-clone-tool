const puppeteer = require("puppeteer-core");
const fs = require("fs");
const { parse } = require("json2csv");

async function scrapeProducts(allProductsPage) {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    console.log(`🔍 Visiting Product Listing Page: ${allProductsPage}`);
    await page.goto(allProductsPage, { timeout: 60000 });
    
    // Wait for product links
    await page.waitForSelector(".variants-container a");
    
    // Extract all product links
    const productLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".variants-container a")).map(el => el.href);
    });

    console.log(`✅ Found ${productLinks.length} product links.`);

    let scrapedData = [];

    // 🔹 Visit Each Product Page & Scrape Data
    for (let link of productLinks) {
      try {
        await page.goto(link, { timeout: 60000 });
        await page.waitForSelector(".pv-prodt_name");

        const productData = await page.evaluate(() => {
          return {
            Name: document.querySelector(".pv-prodt_name")?.innerText || "N/A",
            Categories: document.querySelector('.fv-breadcrumb-container a[href*="product-category"]')?.innerText || "N/A",
            Brand: document.querySelector(".prodt_brand_div a")?.innerText.split(" - ")[0] || "N/A",
            images: document.querySelector(".pv-img")?.src || "N/A",
            Sale_price: document.querySelector(".pv-price")?.innerText || "N/A",
            Regular_price: document.querySelector(".pv-original_price")?.innerText || "N/A",
            Short_description: document.querySelector(".short-desc")?.innerText || "N/A",
            Description: document.querySelector(".pv-prodt_description")?.innerText || "N/A",
          };
        });

        console.log("📌 Scraped:");
        scrapedData.push(productData);
        
      } catch (err) {
        console.error(`❌ Error scraping ${link}:`, err.message);
      }
    }

    // 🔹 Convert JSON to CSV (For WordPress/WooCommerce)
    if (scrapedData.length > 0) {
      const csv = parse(scrapedData, { fields: ["Name", "Categories", "Brand", "images", "Sale price","Regular price", "Short description","Description"] });
      fs.writeFileSync("products2.csv", csv);
      console.log("✅ Data saved successfully in 'products.csv'");
    } else {
      console.log("⚠️ No data to save.");
    }

  } catch (err) {
    console.error("❌ Error in main scraping function:", err.message);
  } finally {
    await browser.close();
  }
}

// 🔹 Call the function with the product listing page link
 scrapeProducts("https://www.vapeandgo.co.uk/product-category/vape-kits/?page=1&filters=%7B%22sort_by%22%3A%22featured%22%2C%22show%22%3A25%7D");
