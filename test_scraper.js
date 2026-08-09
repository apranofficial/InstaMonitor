const { ApifyClient } = require('apify-client');
require('dotenv').config({ path: './dashboard/.env.local' });
// Initialize the ApifyClient with your API token
// You can get this for free by signing up at apify.com
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || 'YOUR_APIFY_API_TOKEN', 
});

async function testInstagramScraper(username) {
    console.log(`Starting to fetch data for: @${username}...`);

    try {
        // We are using a popular and well-maintained Instagram Scraper Actor on Apify
        // Actor ID: apify/instagram-profile-scraper (or similar, we'll use a reliable one for profiles)
        // For fetching recent posts from a profile, 'apify/instagram-post-scraper' or 'apify/instagram-scraper' works.
        // We'll use a standard, cost-effective one: "apify/instagram-scraper" 
        // Note: For latest versions, exact actor ID can be found in Apify Store.

        const run = await client.actor("apify/instagram-scraper").call({
            "directUrls": [`https://www.instagram.com/${username}/`],
            "resultsLimit": 10
        });

        console.log(`Scraping finished. Fetching results from dataset...`);

        // Fetch the results from the run's dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length === 0) {
            console.log("No posts found or account is private.");
            return;
        }

        console.log(`\n--- SUCCESS: Fetched ${items.length} posts ---`);

        // Print out a summary of the posts
        console.log("Raw object of first item:");
        console.log(JSON.stringify(items[0], null, 2));

    } catch (error) {
        console.error("Error scraping Instagram:", error.message);
    }
}

// Test with a generic public page, e.g., 'instagram' official page
testInstagramScraper('panjeta_jazz');
