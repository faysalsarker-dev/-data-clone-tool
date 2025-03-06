const puppeteer = require("puppeteer-core");
const fs = require("fs");
const { parse } = require("json2csv");

async function scrapeProducts() {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });


  const allProductsPage = `https://www.vapeandgo.co.uk/product-category/vape-kits/?page=${1}&filters=%7B%22sort_by%22%3A%22featured%22%2C%22show%22%3A25%7D`;

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
          const attributes = Array.from(document.querySelectorAll("tbody tr")).map((row, index) => {
            const cols = row.querySelectorAll("td");
            return {
              [`Attribute ${index + 1} name`]: cols[0]?.innerText.trim() || "N/A",
              [`Attribute ${index + 1} value(s)`]: cols[1]?.innerText.trim() || "N/A",
              [`Attribute ${index + 1} visible`]: 1, // Always visible
              [`Attribute ${index + 1} global`]: 0  // Non-global
            };
          });

          // Convert array to object for CSV structure
          const formattedAttributes = Object.assign({}, ...attributes);

          return {
            Name: document.querySelector(".pv-prodt_name")?.innerText || "N/A",
            Categories: document.querySelector('.fv-breadcrumb-container a[href*="product-category"]')?.innerText || "N/A",
            Brand: document.querySelector(".prodt_brand_div a")?.innerText.split(" - ")[0] || "N/A",
            Images: document.querySelector(".pv-img")?.src || "N/A",
            "Sale price": document.querySelector(".pv-price")?.innerText || "N/A",
            "Regular price": document.querySelector(".pv-original_price")?.innerText || "N/A",
            "Short description": document.querySelector(".short-desc")?.innerText || "N/A",
            Description: document.querySelector(".pv-prodt_description")?.innerText || "N/A",
            ...formattedAttributes
          };
        });

        console.log("📌 Scraped:", productData.Name);
        scrapedData.push(productData);
        
      } catch (err) {
        console.error(`❌ Error scraping ${link}:`, err.message);
      }
    }

    // 🔹 Convert JSON to CSV (For WooCommerce Import)
    if (scrapedData.length > 0) {
      const csvFields = [
        "Name", "Short description", "Description", "Sale price", "Regular price", 
        "Categories", "Images", "Brand", 
        "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 1 global",
        "Attribute 2 name", "Attribute 2 value(s)", "Attribute 2 visible", "Attribute 2 global",
        "Attribute 3 name", "Attribute 3 value(s)", "Attribute 3 visible", "Attribute 3 global",
        "Attribute 4 name", "Attribute 4 value(s)", "Attribute 4 visible", "Attribute 4 global",
        "Attribute 5 name", "Attribute 5 value(s)", "Attribute 5 visible", "Attribute 5 global",
        "Attribute 6 name", "Attribute 6 value(s)", "Attribute 6 visible", "Attribute 6 global",
        "Attribute 7 name", "Attribute 7 value(s)", "Attribute 7 visible", "Attribute 7 global",
        "Attribute 8 name", "Attribute 8 value(s)", "Attribute 8 visible", "Attribute 8 global"
      ];

      const csv = parse(scrapedData, { fields: csvFields });
      fs.writeFileSync("products.csv", csv);
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
scrapeProducts();
