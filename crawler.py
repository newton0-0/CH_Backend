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
client = MongoClient('mongodb+srv://harshpandeybtech2024:D4rDa9rBW4ArMndw@cluster0.nim0g.mongodb.net')
db = client['tender_crawler']
collection = db['Tender']

# Function to retrieve individual tender details asynchronously
async def get_individual_tender_details(session, url, jsessionid):
    tender_data = {}
    full_url = url if url.startswith("http") else base_url + url
    headers = {'Cookie': f'JSESSIONID={jsessionid}'}

    label_to_key_map = {
        "Tender Reference Number": 'tender_reference_number',
        "Tender ID": 'tender_id',
        "Tender Value in ₹": 'tender_value',
        "Organisation Chain": 'organisation_chain',
        "Title": 'tender_title',
        "Tender Category": 'tender_category',
        "Tender Type": 'tender_type',
        "General Technical Evaluation Allowed": 'gen_tech_eval',
        "ItemWise Technical Evaluation Allowed": 'itemtech_eval',
        "Allow Two Stage Bidding": 'two_stage_bidding',
        "Is Multi Currency Allowed For BOQ": 'multi_cur_boq',
        "Fee Payable At": 'fee_pay_at',
        "Product Category": 'prod_category',
        "Sub category": 'sub_category',
        "Bid Validity(Days)": 'bill_validity',
        "Period Of Work(Days)": 'work_period',
        "Pincode": 'pincode',
        "Published Date": 'published_date',
        "Bid Opening Date": 'bid_opening_date',
        "Document Download / Sale Start Date": 'sale_start_date',
        "Document Download / Sale End Date": 'sale_end_date',
        "Bid Submission Start Date": 'sale_start_date',
        "Bid Submission End Date": 'sale_start_date',
        "Tender Fee in ₹" : 'tender_fee',
        "Fee Payable To" : 'fee_pay_to',
        "Fee Payable At" : 'fee_pay_at',
        "Tender Fee Exemption Allowed" : 'fee_exempt_allowed',
        "EMD Amount in ₹" : 'emd_amount',
        "EMD Fee Type" : 'emd_fee_type',
        "EMD Payable To" : 'emd_pay_to',
        "EMD Payable At" : 'emd_pay_at',
        "EMD Exemption Allowed" : 'emd_exempt_allowed',
        "EMD Percentage" : 'emd_percentage',
        "Work Description" : 'work_description'
    }

    try:
        async with session.get(full_url, headers=headers) as response:
            if response.status == 200:
                content = await response.text()
                soup = BeautifulSoup(content, 'html.parser')

                # Extract data based on specified classes
                captions = soup.find_all('td', class_='td_caption')

                for caption in captions:
                    label = caption.get_text(strip=True)

                    # Find the next sibling with class td_field (the value field)
                    next_td = caption.find_next_sibling('td', class_='td_field')
                    
                    if next_td:
                        value = next_td.get_text(strip=True)

                        if label in label_to_key_map:
                            key = label_to_key_map[label]
                            if key in ['published_date', 'bid_opening_date', 'sale_start_date', 'sale_end_date']:
                                tender_data[key] = datetime.strptime(value, date_format) if value else "NA"
                            elif key == 'tender_value':
                                tender_data[key] = int(value.replace(',', '').replace('.', '')) if value != "NA" else 0
                            else:
                                tender_data[key] = value if value else "NA"

                tender_data["tender_url"] = full_url

                # Check if document already exists
                existing_tender = collection.find_one({
                    'tender_id': tender_data.get('tender_id'),
                    'tender_reference_number': tender_data.get('tender_reference_number')
                })

                if existing_tender:
                    print(f"Tender already exists: {existing_tender}")
                else:
                    if tender_data:
                        collection.insert_one(tender_data)
                        print(f"Tender data inserted: {tender_data}")
            else:
                print(f"Failed to retrieve the page: {url}")
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

# Base URL and the target page URL
base_url = "https://etenders.gov.in"
url = base_url + "/eprocure/app?page=FrontEndTendersByOrganisation&service=page"

# Run the async scraping function
loop = asyncio.get_event_loop()
loop.run_until_complete(get_links_with_integers_only(url))