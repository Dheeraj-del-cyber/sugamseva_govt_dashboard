"""
Sugam Seva — Database Seeder
-----------------------------
Seeds the database with 100% authentic Indian data:
- Official Government Officers (BDO, District Collectorate, Tahsildar)
- Realistic Citizens with valid 10-digit mobile numbers, valid 6-digit PIN codes
- Mandatory 2-Finger Biometric Enrollment for every user (Primary: Right Thumb, Secondary: Left Thumb)
- Real Government of India Schemes (PM-KISAN, AB-PMJAY, PMAY-G, PM Ujjwala 2.0, PM SVANidhi, etc.)
- Real Civic Infrastructure Problems with Ward/District locations
- Real Document files stored physically in backend/uploads/documents/
"""
import os
import random
import uuid
import hashlib
from datetime import datetime

from app.database import Base, SessionLocal, engine
from app import models
from app.security import hash_password

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Recreate tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()


# -------------------------------------------------------------
# 1. Official Government Officers
# -------------------------------------------------------------
OFFICIALS = [
    {
        "govt_id": "GOV-IN-100234",
        "full_name": "Rameshwar Patil",
        "dob": "1988-04-12",
        "phone_number": "9845100234",
        "email": "rameshwar.patil@gov.in",
        "address": "Office of the BDO, Indiranagar, Bengaluru, Karnataka 560038",
        "password": "Password@123",
    },
    {
        "govt_id": "GOV-IN-100235",
        "full_name": "Sunita Rao",
        "dob": "1990-11-02",
        "phone_number": "9820100235",
        "email": "sunita.rao@gov.in",
        "address": "District Collectorate, Pune City, Maharashtra 411001",
        "password": "Password@123",
    },
    {
        "govt_id": "GOV-IN-100236",
        "full_name": "Amit Trivedi",
        "dob": "1985-07-19",
        "phone_number": "9415100236",
        "email": "amit.trivedi@gov.in",
        "address": "Tehsil Office, Sector 62, Noida, Uttar Pradesh 201309",
        "password": "Password@123",
    },
]

officials = []
for off_data in OFFICIALS:
    existing = db.query(models.Official).filter(models.Official.govt_id == off_data["govt_id"]).first()
    if existing:
        officials.append(existing)
        continue

    p_template = hashlib.sha256(f"official:{off_data['govt_id']}:primary".encode()).hexdigest()
    s_template = hashlib.sha256(f"official:{off_data['govt_id']}:secondary".encode()).hexdigest()

    official = models.Official(
        govt_id=off_data["govt_id"],
        full_name=off_data["full_name"],
        dob=off_data["dob"],
        phone_number=off_data["phone_number"],
        email=off_data["email"],
        address=off_data["address"],
        password_hash=hash_password(off_data["password"]),
        fingerprint_template=p_template,
        is_verified=True,
    )
    db.add(official)
    db.flush()

    # 2 fingers enrollment for official
    db.add(
        models.OfficialFingerprint(
            official_id=official.id,
            finger_index=1,
            finger_name="Right Thumb",
            hand="Right",
            template_data=p_template,
            quality_score=0.96,
            sensor_type="WebAuthn / Windows Hello",
        )
    )
    db.add(
        models.OfficialFingerprint(
            official_id=official.id,
            finger_index=2,
            finger_name="Left Thumb",
            hand="Left",
            template_data=s_template,
            quality_score=0.94,
            sensor_type="WebAuthn / Windows Hello",
        )
    )
    db.commit()
    db.refresh(official)
    officials.append(official)

primary_official = officials[0]


# -------------------------------------------------------------
# 2. Authentic Citizens with Real Demographics & 2-Finger Enrollment
# -------------------------------------------------------------
CITIZEN_RECORDS = [
    {
        "full_name": "Ramesh Chandra Sharma",
        "dob": "1978-05-14",
        "phone_number": "9845123456",
        "guardian_1": "9845123401",
        "guardian_2": "9845123402",
        "address": "House No. 42, 3rd Cross, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
        "docs": [
            ("Aadhaar Card", "4582 9102 3847"),
            ("PAN Card", "ABCPS1234F"),
            ("Ration Card", "102938475612"),
            ("Land Records", "KHATA-8492"),
        ],
    },
    {
        "full_name": "Lakshmi Venkatesh",
        "dob": "1984-11-20",
        "phone_number": "9820123457",
        "guardian_1": "9820123401",
        "guardian_2": None,
        "address": "Flat 304, Shanti Niketan Apartments, 5th Block, Jayanagar, Bengaluru, Karnataka 560041",
        "docs": [
            ("Aadhaar Card", "8923 1049 5821"),
            ("Ration Card", "837492018475"),
            ("Income Certificate", "INC-2024-839201"),
        ],
    },
    {
        "full_name": "Mohammad Arif Khan",
        "dob": "1991-03-08",
        "phone_number": "9415123458",
        "guardian_1": "9415123401",
        "guardian_2": "9415123402",
        "address": "C-14, Sector 62, Near Electronic City Metro, Noida, Gautam Buddha Nagar, Uttar Pradesh 201309",
        "docs": [
            ("Aadhaar Card", "6712 9034 5182"),
            ("PAN Card", "ARFPK9012M"),
            ("Voter ID", "EPIC9823412"),
        ],
    },
    {
        "full_name": "Sunita Gurung",
        "dob": "1995-09-17",
        "phone_number": "9711123459",
        "guardian_1": "9711123401",
        "guardian_2": None,
        "address": "Quarter 12, P&T Colony, Malabar Hill, Mumbai, Maharashtra 400006",
        "docs": [
            ("Aadhaar Card", "3491 8203 9471"),
            ("PAN Card", "GURPS4581L"),
            ("Driving Licence", "MH-01-20150084920"),
        ],
    },
    {
        "full_name": "Harpreet Singh Dhillon",
        "dob": "1982-08-25",
        "phone_number": "9876123460",
        "guardian_1": "9876123401",
        "guardian_2": None,
        "address": "Village & PO Raipur, GT Road, Ludhiana Rural, Punjab 141001",
        "docs": [
            ("Aadhaar Card", "9012 3481 7293"),
            ("Land Records", "KHATA-1923"),
            ("Ration Card", "948201948271"),
        ],
    },
    {
        "full_name": "Ananya Bhattacharya",
        "dob": "1993-12-04",
        "phone_number": "9433123461",
        "guardian_1": "9433123401",
        "guardian_2": "9433123402",
        "address": "Block CF, Sector 1, Bidhannagar, Salt Lake City, Kolkata, West Bengal 700091",
        "docs": [
            ("Aadhaar Card", "5129 8374 9102"),
            ("PAN Card", "BHATP2948K"),
            ("Passport", "Z9182374"),
        ],
    },
    {
        "full_name": "Rajeshwari Devi",
        "dob": "1966-02-18",
        "phone_number": "9880123462",
        "guardian_1": "9880123401",
        "guardian_2": None,
        "address": "House 18, Ward 7, Near Gram Panchayat Office, Devanahalli, Karnataka 562110",
        "docs": [
            ("Aadhaar Card", "7823 4910 8234"),
            ("Ration Card", "748291038472"),
            ("Income Certificate", "INC-2024-102938"),
            ("Voter ID", "EPIC8371920"),
        ],
    },
    {
        "full_name": "Suresh Kumar Meena",
        "dob": "1989-07-30",
        "phone_number": "9414123463",
        "guardian_1": "9414123401",
        "guardian_2": None,
        "address": "B-88, Civil Lines, Near Railway Station Road, Jaipur, Rajasthan 302006",
        "docs": [
            ("Aadhaar Card", "2394 8102 7391"),
            ("Voter ID", "EPIC4918273"),
            ("Driving Licence", "RJ-14-20180092819"),
        ],
    },
    {
        "full_name": "Deepa Nair",
        "dob": "1992-06-11",
        "phone_number": "9847123464",
        "guardian_1": "9847123401",
        "guardian_2": "9847123402",
        "address": "Nandanam, Near Thrikkakara Temple, Kochi, Ernakulam, Kerala 682021",
        "docs": [
            ("Aadhaar Card", "6192 8374 9182"),
            ("PAN Card", "NAIRD5921B"),
            ("Passport", "K8291039"),
        ],
    },
    {
        "full_name": "Anand Shinde",
        "dob": "1986-10-15",
        "phone_number": "9822123465",
        "guardian_1": "9822123401",
        "guardian_2": None,
        "address": "Plot 74, Kothrud Industrial Area, Paud Road, Pune, Maharashtra 411038",
        "docs": [
            ("Aadhaar Card", "8371 9284 0192"),
            ("PAN Card", "SHINA7182E"),
            ("Voter ID", "EPIC2918374"),
        ],
    },
    {
        "full_name": "Kavita Patil",
        "dob": "1994-01-22",
        "phone_number": "9849123466",
        "guardian_1": "9849123401",
        "guardian_2": None,
        "address": "Flat 201, Sri Sai Residency, Madhapur, Hitec City, Hyderabad, Telangana 500081",
        "docs": [
            ("Aadhaar Card", "4918 2736 4910"),
            ("PAN Card", "PATLK8291N"),
            ("Passport", "M4918273"),
        ],
    },
    {
        "full_name": "Vijaya Bhaskar Rao",
        "dob": "1972-04-05",
        "phone_number": "9444123467",
        "guardian_1": "9444123401",
        "guardian_2": None,
        "address": "New No. 15, 2nd Main Road, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020",
        "docs": [
            ("Aadhaar Card", "1928 3746 5910"),
            ("Land Records", "KHATA-9281"),
            ("PAN Card", "RAOVB3819A"),
            ("Voter ID", "EPIC7391820"),
        ],
    },
]

citizens = []
for c_data in CITIZEN_RECORDS:
    existing = db.query(models.Citizen).filter(models.Citizen.phone_number == c_data["phone_number"]).first()
    if existing:
        citizens.append(existing)
        continue

    p_temp = hashlib.sha256(f"citizen:{c_data['phone_number']}:primary_right_thumb".encode()).hexdigest()
    s_temp = hashlib.sha256(f"citizen:{c_data['phone_number']}:secondary_left_thumb".encode()).hexdigest()

    c = models.Citizen(
        full_name=c_data["full_name"],
        dob=c_data["dob"],
        phone_number=c_data["phone_number"],
        guardian_phone_1=c_data["guardian_1"],
        guardian_phone_2=c_data["guardian_2"],
        address=c_data["address"],
        fingerprint_template=p_temp,
        fingerprint_template_secondary=s_temp,
        added_by_official_id=primary_official.id,
    )
    db.add(c)
    db.flush()

    # Create 2 biometric fingerprints for this citizen
    db.add(
        models.CitizenFingerprint(
            citizen_id=c.id,
            finger_index=1,
            finger_name="Right Thumb",
            hand="Right",
            template_data=p_temp,
            quality_score=0.96,
            sensor_type="WebAuthn / Windows Hello",
        )
    )
    db.add(
        models.CitizenFingerprint(
            citizen_id=c.id,
            finger_index=2,
            finger_name="Left Thumb",
            hand="Left",
            template_data=s_temp,
            quality_score=0.93,
            sensor_type="WebAuthn / Windows Hello",
        )
    )

    # Create documents with real files on disk
    for doc_name, doc_num in c_data["docs"]:
        try:
            doc_enum = models.DocumentType(doc_name)
        except ValueError:
            continue

        file_basename = f"{c.id[:8]}_{doc_name.replace(' ', '_').lower()}.pdf"
        file_path_rel = f"uploads/documents/{file_basename}"
        file_path_abs = os.path.join(UPLOAD_DIR, file_basename)

        # Write dummy real PDF binary format
        pdf_content = (
            f"%PDF-1.4\n"
            f"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            f"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            f"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n"
            f"4 0 obj<</Length 120>>stream\n"
            f"BT /F1 14 Tf 50 700 Td (GOVERNMENT OF INDIA - {doc_name.upper()}) Tj\n"
            f"0 -25 Td (Holder: {c_data['full_name']}) Tj\n"
            f"0 -25 Td (Doc ID: {doc_num}) Tj\n"
            f"0 -25 Td (Verified via Sugam Seva National Portal) Tj ET\n"
            f"endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n"
            f"0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000210 00000 n \n"
            f"trailer<</Size 5/Root 1 0 R>>\nstartxref\n380\n%%EOF\n"
        )
        with open(file_path_abs, "wb") as f:
            f.write(pdf_content.encode("utf-8"))

        doc = models.CitizenDocument(
            citizen_id=c.id,
            doc_type=doc_enum,
            doc_number=doc_num,
            verified=True,
            source="upload",
            file_path=file_path_rel,
            file_name=f"{c_data['full_name'].split()[0]}_{doc_name.replace(' ', '_')}.pdf",
            file_size=len(pdf_content),
            mime_type="application/pdf",
            extracted_text=f"Government of India {doc_name}\nHolder: {c_data['full_name']}\nID Number: {doc_num}\nStatus: Verified",
            encrypted_scan_ref=f"vault://{c.id}/{doc_name.replace(' ', '_')}",
            verified_at=datetime.utcnow(),
        )
        db.add(doc)

    db.commit()
    db.refresh(c)
    citizens.append(c)


# -------------------------------------------------------------
# 3. Real Government of India Schemes
# -------------------------------------------------------------
SCHEMES_DATA = [
    {
        "name": "PM Kisan Samman Nidhi (PM-KISAN)",
        "category": "Agriculture & Rural Development",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "benefit_amount": "₹6,000 / year (3 installments of ₹2,000 via DBT)",
        "required_documents": "Aadhaar Card,Land Records,PAN Card",
        "summary": "Central sector scheme providing income support of ₹6,000 per year in three equal installments to all landholding farmer families across the country.",
        "pros": "Direct Bank Transfer (DBT) without middlemen\nGuaranteed financial support for agricultural inputs\nAccessible via PM-KISAN mobile app and CSCs",
        "cons": "Mandatory e-KYC and land seeding required\nInstitutional landholders and income tax payees excluded",
    },
    {
        "name": "Ayushman Bharat - PM Jan Arogya Yojana (AB-PMJAY)",
        "category": "Health & Family Welfare",
        "ministry": "National Health Authority (Ministry of Health)",
        "benefit_amount": "₹5,00,000 cashless health cover per family per year",
        "required_documents": "Aadhaar Card,Ration Card",
        "summary": "World's largest government-funded healthcare assurance scheme, offering ₹5 lakh per family per year for secondary and tertiary hospitalisation across empanelled public and private hospitals.",
        "pros": "Cashless and paperless access to treatment\nCovers 3 days pre-hospitalisation and 15 days post-hospitalisation\nCovers all pre-existing medical conditions from day one",
        "cons": "Limited to SECC 2011 depository and NFSA priority cardholders\nRequires periodic biometric or OTP re-authentication",
    },
    {
        "name": "Pradhan Mantri Awas Yojana - Gramin (PMAY-G)",
        "category": "Housing & Urban Affairs",
        "ministry": "Ministry of Rural Development",
        "benefit_amount": "₹1,20,000 (Plains) / ₹1,30,000 (Hilly/NE States) direct subsidy",
        "required_documents": "Aadhaar Card,Income Certificate,Voter ID",
        "summary": "Provides financial assistance to homeless families and those living in kutcha/dilapidated houses for construction of a permanent pucca house with basic amenities.",
        "pros": "Includes 90-95 person-days of unskilled labour under MGNREGS (₹18,000+)\nAdditional ₹12,000 for toilet construction via Swachh Bharat Mission\nPiped water and LPG connection convergence",
        "cons": "Multi-stage geo-tagged photographic inspection required before instalment releases\nExcludes families with two-wheelers or motorized farming equipment",
    },
    {
        "name": "Pradhan Mantri Ujjwala Yojana 2.0 (PMUY)",
        "category": "Energy & Petroleum",
        "ministry": "Ministry of Petroleum and Natural Gas",
        "benefit_amount": "Deposit-free LPG connection + First Refill + Stove (₹1,600 value)",
        "required_documents": "Aadhaar Card,Ration Card",
        "summary": "Provides deposit-free LPG connections to women belonging to poor households to ensure clean cooking fuel, reducing indoor air pollution and health hazards.",
        "pros": "Connection issued in the name of adult woman of the household\nSelf-declaration accepted as proof of address for migrant families\nTargeted targeted subsidy of ₹300 per cylinder for up to 12 refills/year",
        "cons": "Only eligible for households without any existing LPG connection\nRequires matching active bank account for subsidy credit",
    },
    {
        "name": "PM SVANidhi (PM Street Vendor's AtmaNirbhar Nidhi)",
        "category": "Micro-Finance & Livelihood",
        "ministry": "Ministry of Housing and Urban Affairs",
        "benefit_amount": "Working capital loan: ₹10k (1st Tranche), ₹20k (2nd), ₹50k (3rd) @ 7% subsidy",
        "required_documents": "Aadhaar Card,Voter ID",
        "summary": "Micro-credit facility for urban, peri-urban and rural street vendors to restart their livelihoods with collateral-free working capital loans and cashback on digital transactions.",
        "pros": "No collateral or guarantor required\n7% interest subsidy credited directly to bank account on timely repayment\nUp to ₹1,200 annual cashback for accepting digital QR payments",
        "cons": "Urban Local Body (ULB) Vending Certificate or Letter of Recommendation mandatory\nFailure to repay first tranche halts progression to higher loan limits",
    },
    {
        "name": "Jal Jeevan Mission (Har Ghar Jal)",
        "category": "Water & Sanitation",
        "ministry": "Ministry of Jal Shakti",
        "benefit_amount": "Functional Household Tap Connection (FHTC) delivering 55 LPCD potable water",
        "required_documents": "Aadhaar Card",
        "summary": "Flagship mission to provide functional household tap water connection of prescribed quality (BIS:10500) on regular and long-term basis to every rural household.",
        "pros": "Safe piped potable drinking water at doorstep\nRegular water quality testing by Village Water & Sanitation Committees (VWSC)\nSubstantially reduces water collection hardship for women and children",
        "cons": "Requires local ground water recharge and community greywater management\nIntermittent supply during peak summer in dry zones",
    },
    {
        "name": "Atal Pension Yojana (APY)",
        "category": "Social Security & Pension",
        "ministry": "PFRDA / Ministry of Finance",
        "benefit_amount": "Guaranteed monthly pension of ₹1,000 to ₹5,000 post 60 years",
        "required_documents": "Aadhaar Card,PAN Card",
        "summary": "Universal social security scheme for all unorganised sector workers, providing a guaranteed minimum monthly pension from the age of 60 years based on monthly contribution.",
        "pros": "Government-backed guaranteed minimum pension return\nSpouse receives same pension upon subscriber's demise; corpus returned to nominee\nTax benefit under Section 80CCD(1B)",
        "cons": "Open strictly to Indian citizens aged 18-40 years\nIncome tax payers ineligible since October 2022",
    },
    {
        "name": "National Social Assistance Programme (NSAP) - Indira Gandhi Pension",
        "category": "Social Welfare",
        "ministry": "Ministry of Rural Development",
        "benefit_amount": "Monthly pension of ₹1,000 to ₹2,500 for elderly / widows / disabled",
        "required_documents": "Aadhaar Card,Income Certificate,Voter ID",
        "summary": "Provides monthly financial assistance to senior citizens aged 60+, destitute widows, and persons with severe disabilities living below the poverty line.",
        "pros": "Direct monthly pension disbursement into Aadhaar-linked savings accounts\nCentral and State matching contribution enhance monthly payout\nNo investment or premium payment required from beneficiary",
        "cons": "BPL card / verified low-income certificate mandatory\nAge verification must align strictly with Aadhaar and Voter ID records",
    },
]

schemes = []
for s_data in SCHEMES_DATA:
    existing = db.query(models.Scheme).filter(models.Scheme.name == s_data["name"]).first()
    if existing:
        schemes.append(existing)
        continue
    scheme = models.Scheme(**s_data)
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    schemes.append(scheme)

# Populate realistic scheme usages
for scheme in schemes:
    reqs = {t.strip() for t in (scheme.required_documents or "").split(",") if t.strip()}
    for c in citizens:
        c_docs = {d.doc_type.value for d in c.documents if d.verified}
        if reqs.issubset(c_docs):
            status = random.choice(["used", "applied", "missed"])
            exists = db.query(models.SchemeUsage).filter(
                models.SchemeUsage.scheme_id == scheme.id,
                models.SchemeUsage.citizen_id == c.id,
                models.SchemeUsage.year == 2026,
            ).first()
            if not exists:
                db.add(
                    models.SchemeUsage(
                        scheme_id=scheme.id,
                        citizen_id=c.id,
                        year=2026,
                        status=status,
                    )
                )
db.commit()


# -------------------------------------------------------------
# 4. Authentic Civic Problems with Real Ward Locations
# -------------------------------------------------------------
PROBLEMS_DATA = [
    {
        "title": "Drinking Water Pipeline Leakage & Low Pressure (Ward 14, Indiranagar)",
        "category": "Water & Sanitation",
        "description": "Main distribution line damaged near 12th Main Road junction causing severe contamination risk and low pressure supply to 450+ residential households.",
    },
    {
        "title": "Deep Road Potholes & Broken Asphalt on Main Market Road (Ward 8)",
        "category": "Roads & Transport",
        "description": "2.4 km stretch of arterial market road severely degraded after monsoon rains, causing frequent two-wheeler accidents and heavy traffic congestion.",
    },
    {
        "title": "Non-Functional Street Lights & Transformer Sparking (Sector 62 Colony)",
        "category": "Electricity & Power",
        "description": "Over 28 LED street light poles inactive for 3 weeks leading to safety concerns for night commuters; nearby 100 kVA transformer emitting sparks during peak load.",
    },
    {
        "title": "Stormwater Drain Overflow & Blocked Culvert (Koramangala 4th Block)",
        "category": "Drainage & Sewerage",
        "description": "Heavy silt accumulation and plastic debris blocking the primary storm drainage culvert, causing sewage backflow into ground-floor residences.",
    },
    {
        "title": "Irregular Municipal Solid Waste Collection (Civil Lines Area)",
        "category": "Sanitation & Waste Management",
        "description": "Door-to-door garbage collection vehicle arriving only once a week; open community dump site attracting stray animals and generating foul smell.",
    },
    {
        "title": "Primary Health Centre Medicine Stockout (Devanahalli Sub-District)",
        "category": "Public Healthcare",
        "description": "Essential hypertension, diabetes, and antibiotic medicines out of stock at the local PHC for over 45 days, forcing BPL patients to purchase from private stores.",
    },
    {
        "title": "Damaged Footpath & Uncovered Manhole near Govt High School (Ward 22)",
        "category": "Civic Infrastructure",
        "description": "Open 6-foot deep storm manhole and broken pedestrian pavement posing serious hazard to 600+ school students during morning and evening rush hours.",
    },
    {
        "title": "Frequent Low-Voltage Fluctuations & Agricultural Feeder Trip (Sector B)",
        "category": "Electricity & Power",
        "description": "Voltage dropping below 140V during daytime hours burning domestic submersible pumps and disrupting borewell irrigation for local farmer families.",
    },
]

problems = []
for p_data in PROBLEMS_DATA:
    existing = db.query(models.Problem).filter(models.Problem.title == p_data["title"]).first()
    if existing:
        problems.append(existing)
        continue
    p = models.Problem(
        title=p_data["title"],
        description=p_data["description"],
        category=p_data["category"],
        added_by_official_id=primary_official.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    problems.append(p)

# Create realistic citizen votes
for i, p in enumerate(problems):
    # Distribute voters
    sample_size = min(len(citizens), random.randint(3, len(citizens)))
    voter_citizens = citizens[:sample_size] if i < 3 else random.sample(citizens, k=sample_size)

    for c in voter_citizens:
        exists = db.query(models.ProblemVote).filter(
            models.ProblemVote.problem_id == p.id, models.ProblemVote.citizen_id == c.id
        ).first()
        if exists:
            continue
        is_solved = (i % 3 == 0)  # some problems marked solved
        vote = models.ProblemVote(problem_id=p.id, citizen_id=c.id, solved=is_solved)
        db.add(vote)
        p.total_votes += 1
        if is_solved:
            p.solved_votes += 1

    p.is_solved = (p.total_votes > 0 and p.solved_votes >= p.total_votes)
db.commit()

print("=" * 60)
print(" Sugam Seva Database Seeding Completed Successfully!")
print("=" * 60)
print(f" Registered Officials : {db.query(models.Official).count()}")
print(f" Registered Citizens  : {db.query(models.Citizen).count()} (with dual-finger biometric records)")
print(f" Active Schemes       : {db.query(models.Scheme).count()} (National Portals)")
print(f" Civic Problems       : {db.query(models.Problem).count()}")
print(f" Verified Documents   : {db.query(models.CitizenDocument).count()} (stored on server disk)")
print("=" * 60)
print("Demo Login Credentials:")
print("  Govt ID   : GOV-IN-100234")
print("  Password  : Password@123")
print("  Official  : Rameshwar Patil (BDO)")
print("=" * 60)

db.close()
