"""
Seed the database with a demo official, citizens, problems and schemes so
the dashboard has realistic data to demo immediately.

Run: python seed.py
"""
import random

from app.database import Base, SessionLocal, engine
from app import models
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if not db.query(models.Official).filter(models.Official.govt_id == "GOV-IN-100234").first():
    official = models.Official(
        govt_id="GOV-IN-100234",
        full_name="Ananya Sharma",
        dob="1988-04-12",
        phone_number="9876500011",
        address="Bengaluru, KA",
        email="ananya.sharma@gov.in",
        password_hash=hash_password("Password@123"),
        fingerprint_template="seed-template-official",
        is_verified=True,
    )
    db.add(official)
    db.commit()
    db.refresh(official)
else:
    official = db.query(models.Official).filter(models.Official.govt_id == "GOV-IN-100234").first()

CITIZEN_NAMES = [
    "Ravi Kumar", "Sita Devi", "Manoj Yadav", "Priya Nair", "Arjun Reddy",
    "Lakshmi Iyer", "Suresh Patel", "Kavya Rao", "Vijay Singh", "Meena Gupta",
]

citizens = []
for i, name in enumerate(CITIZEN_NAMES):
    phone = f"98765{10000 + i}"
    existing = db.query(models.Citizen).filter(models.Citizen.phone_number == phone).first()
    if existing:
        citizens.append(existing)
        continue
    c = models.Citizen(
        full_name=name,
        dob="1995-01-01",
        phone_number=phone,
        address="Sample Address, India",
        fingerprint_template=f"seed-template-{i}",
        added_by_official_id=official.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    citizens.append(c)

    for doc_type in random.sample(list(models.DocumentType), k=random.randint(1, 3)):
        doc = models.CitizenDocument(citizen_id=c.id, doc_type=doc_type, verified=True, source="scan")
        db.add(doc)
db.commit()

PROBLEMS = [
    "Poor Road Conditions", "Irregular Water Supply", "Street Light Not Working",
    "Drainage Overflow", "Garbage Collection Issue", "Unemployment Opportunities",
    "Public Transport Issues", "High Electricity Bills", "Corruption in Offices",
    "Other Civic Issues",
]
problems = []
for title in PROBLEMS:
    existing = db.query(models.Problem).filter(models.Problem.title == title).first()
    if existing:
        problems.append(existing)
        continue
    p = models.Problem(title=title, description=f"Citizen-reported issue: {title}.", added_by_official_id=official.id)
    db.add(p)
    db.commit()
    db.refresh(p)
    problems.append(p)

for p in problems:
    voters = random.sample(citizens, k=random.randint(2, len(citizens)))
    for c in voters:
        exists = db.query(models.ProblemVote).filter(
            models.ProblemVote.problem_id == p.id, models.ProblemVote.citizen_id == c.id
        ).first()
        if exists:
            continue
        solved = random.random() < 0.3
        vote = models.ProblemVote(problem_id=p.id, citizen_id=c.id, solved=solved)
        db.add(vote)
        p.total_votes += 1
        if solved:
            p.solved_votes += 1
    p.is_solved = p.total_votes > 0 and p.solved_votes >= p.total_votes
db.commit()

SCHEMES = [
    {"name": "PM Ujjwala Yojana", "category": "Energy", "required_documents": "Aadhaar Card,Ration Card",
     "summary": "Provides free LPG connections to women from below-poverty-line households.",
     "pros": "Reduces indoor air pollution\nFree gas connection\nSubsidised refills",
     "cons": "Limited to BPL households\nRequires ration card verification"},
    {"name": "Ayushman Bharat", "category": "Health", "required_documents": "Aadhaar Card",
     "summary": "Offers health insurance coverage up to Rs. 5 lakh per family per year.",
     "pros": "Cashless treatment\nCovers pre-existing conditions\nWide hospital network",
     "cons": "Annual reapplication needed\nSome private hospitals excluded"},
    {"name": "PM Kisan Samman Nidhi", "category": "Agriculture", "required_documents": "Aadhaar Card,PAN Card",
     "summary": "Direct income support of Rs. 6,000 per year to eligible farmer families.",
     "pros": "Direct bank transfer\nNo middlemen\nThrice-yearly instalments",
     "cons": "Limited to landholding farmers\nBank account linkage required"},
    {"name": "PM Awas Yojana", "category": "Housing", "required_documents": "Aadhaar Card,Voter ID",
     "summary": "Provides financial assistance for construction/purchase of a house.",
     "pros": "Interest subsidy on home loans\nSupports urban and rural poor",
     "cons": "Income eligibility caps apply\nLong disbursement timelines"},
]
schemes = []
for s in SCHEMES:
    existing = db.query(models.Scheme).filter(models.Scheme.name == s["name"]).first()
    if existing:
        schemes.append(existing)
        continue
    scheme = models.Scheme(**s)
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    schemes.append(scheme)

for scheme in schemes:
    for c in random.sample(citizens, k=random.randint(1, 4)):
        status = random.choice(["used", "missed", "applied"])
        exists = db.query(models.SchemeUsage).filter(
            models.SchemeUsage.scheme_id == scheme.id, models.SchemeUsage.citizen_id == c.id, models.SchemeUsage.year == 2024
        ).first()
        if exists:
            continue
        usage = models.SchemeUsage(scheme_id=scheme.id, citizen_id=c.id, year=2024, status=status)
        db.add(usage)
db.commit()

print("Seed complete.")
print("Login with Government ID: GOV-IN-100234  Password: Password@123")
db.close()
