import nest_asyncio
import asyncio
import aiohttp
from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime

# Apply nest_asyncio to allow re-entering the event loop
nest_asyncio.apply()

date_format = '%d-%b-%Y %I:%M %p'

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['tender_crawler']
collection = db['Tender']

# Base URL
base_url = "https://etenders.gov.in"

# Function to retrieve individual tender details asynchronously
async def get_individual_tender_details(session, url, jsessionid):
    tender_data = {}
    full_url = url if url.startswith("http") else base_url + url
    headers = {'Cookie': f'JSESSIONID={jsessionid}'}

    try:
        async with session.get(full_url, headers=headers) as response:
            if response.status == 200:
                content = await response.text()
                soup = BeautifulSoup(content, 'html.parser')

                # Extract data based on specified classes
                captions = soup.find_all('td', class_='td_caption')

                # Iterate through captions and fetch the value from the following td_field
                for caption in captions:
                    label = caption.get_text(strip=True)

                    # Find the next sibling with class td_field (the value field)
                    next_td = caption.find_next_sibling('td', class_='td_field')
                    
                    if next_td:
                        value = next_td.get_text(strip=True)

                        if "Tender Reference Number" in label:
                            tender_data['tender_reference_number'] = value or "NA"
                        elif "Tender ID" in label:
                            tender_data['tender_id'] = value or "NA"
                        elif "Tender Value in ₹" in label:
                            cleaned_value = value.replace(',', '')  # Remove commas
                            try:
                                tender_data['tender_value'] = int(cleaned_value)  # Convert to int
                            except ValueError:
                                print(f"Invalid tender value: {cleaned_value}")
                                tender_data['tender_value'] = 0  # Default to 0 if conversion fails
                        elif "Bid Submission End Date" in label:
                            try:
                                tender_data['bid_submission_end_date'] = datetime.strptime(value, date_format) if value else "NA"
                            except ValueError:
                                print(f"Invalid date format for {value}")
                                tender_data['bid_submission_end_date'] = "NA"
                        elif "Organisation Chain" in label:
                            tender_data['organisation_chain'] = value or "NA"
                        elif "Title" in label:
                            tender_data['tender_title'] = value or "NA"

                tender_data["tender_url"] = full_url

                # Insert data into MongoDB
                try:
                    if tender_data:
                        collection.insert_one(tender_data)
                        print(f"Tender data inserted: {tender_data}")
                except Exception as e:
                    print(f"Error inserting data into MongoDB: {e}")
            else:
                print(f"Failed to retrieve the page: {url}, status code: {response.status}")
    except aiohttp.ClientConnectionError as e:
        print(f"Connection error for {url}: {e}")
    except Exception as e:
        print(f"Error fetching details for {url}: {e}")

# Function to process individual organization links asynchronously
async def process_org_link(session, org_link, jsessionid):
    if "component=%24DirectLink&page=FrontEndViewTender" in org_link["href"]:
        await get_individual_tender_details(session, org_link["href"], jsessionid)

# Function to extract links that have only integers in their text
async def get_links_with_integers_only(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                org_count = 0
                individual_tender_count = 0
                cookies = response.cookies
                jsessionid = cookies.get('JSESSIONID').value

                content = await response.text()
                soup = BeautifulSoup(content, 'html.parser')
                links = soup.find_all('a', href=True)

                tasks = []
                for link in links:
                    link_text = link.get_text(strip=True)
                    if link_text.isdigit():
                        org_count += 1
                        individual_tender_count += int(link_text)

                        org_tenders_url = base_url + link["href"]
                        async with session.get(org_tenders_url, headers={'Cookie': f'JSESSIONID={jsessionid}'}) as org_response:
                            if org_response.status == 200:
                                org_content = await org_response.text()
                                org_soup = BeautifulSoup(org_content, 'html.parser')
                                org_links = org_soup.find_all('a', href=True)

                                for org_link in org_links:
                                    tasks.append(process_org_link(session, org_link, jsessionid))

                await asyncio.gather(*tasks)  # Execute all requests concurrently

                print(f"Total number of organisation links with only integers in their text: {org_count}")
                print(f"Individual tender count: {individual_tender_count}")
            else:
                print(f"Failed to retrieve the page. Status code: {response.status}")

# Target page URL
url = base_url + "/eprocure/app?page=FrontEndTendersByOrganisation&service=page"

# Run the async scraping function
loop = asyncio.get_event_loop()
loop.run_until_complete(get_links_with_integers_only(url))