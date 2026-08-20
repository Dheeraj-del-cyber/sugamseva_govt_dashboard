import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class Official(Base):
    """A verified government official who can log into the dashboard."""
    __tablename__ = "officials"

    id = Column(String, primary_key=True, default=gen_id)
    govt_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    dob = Column(String, nullable=True)
    phone_number = Column(String, nullable=False)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    password_hash = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)
    fingerprint_template = Column(Text, nullable=True)  # Primary template / hash
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    problems_added = relationship("Problem", back_populates="added_by")
    fingerprints = relationship("OfficialFingerprint", back_populates="official", cascade="all, delete-orphan")


class DocumentType(str, enum.Enum):
    AADHAAR = "Aadhaar Card"
    PAN = "PAN Card"
    PASSPORT = "Passport"
    VOTER_ID = "Voter ID"
    DRIVING_LICENCE = "Driving Licence"
    RATION_CARD = "Ration Card"
    INCOME_CERT = "Income Certificate"
    LAND_RECORDS = "Land Records"


class Citizen(Base):
    """A registered citizen / user of government services."""
    __tablename__ = "citizens"

    id = Column(String, primary_key=True, default=gen_id)
    full_name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    phone_number = Column(String, nullable=False, unique=True)
    guardian_phone_1 = Column(String, nullable=True)
    guardian_phone_2 = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    fingerprint_template = Column(Text, nullable=True)  # Primary fingerprint template
    fingerprint_template_secondary = Column(Text, nullable=True)  # Secondary fingerprint template
    created_at = Column(DateTime, default=datetime.utcnow)
    added_by_official_id = Column(String, ForeignKey("officials.id"), nullable=True)

    documents = relationship("CitizenDocument", back_populates="citizen", cascade="all, delete-orphan")
    fingerprints = relationship("CitizenFingerprint", back_populates="citizen", cascade="all, delete-orphan", order_by="CitizenFingerprint.finger_index")
    votes = relationship("ProblemVote", back_populates="citizen")
    scheme_usages = relationship("SchemeUsage", back_populates="citizen")


class CitizenFingerprint(Base):
    """Stores individual enrolled fingerprints (2 fingers per user)."""
    __tablename__ = "citizen_fingerprints"
    __table_args__ = (UniqueConstraint("citizen_id", "finger_index", name="uq_citizen_finger_index"),)

    id = Column(String, primary_key=True, default=gen_id)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    finger_index = Column(Integer, nullable=False)  # 1 = Primary, 2 = Secondary
    finger_name = Column(String, nullable=False)    # e.g., "Right Thumb", "Left Thumb", "Right Index"
    hand = Column(String, nullable=False)           # "Right" or "Left"
    credential_id = Column(String, nullable=True)   # WebAuthn credential ID (base64)
    public_key = Column(Text, nullable=True)        # WebAuthn public key / certificate
    template_data = Column(Text, nullable=False)    # Raw minutiae hash / PID template
    quality_score = Column(Float, default=0.92)     # Quality score 0.0 - 1.0 (or percentage)
    sensor_type = Column(String, default="WebAuthn / Windows Hello")
    captured_at = Column(DateTime, default=datetime.utcnow)

    citizen = relationship("Citizen", back_populates="fingerprints")


class OfficialFingerprint(Base):
    """Stores enrolled fingerprints for government officials."""
    __tablename__ = "official_fingerprints"
    __table_args__ = (UniqueConstraint("official_id", "finger_index", name="uq_official_finger_index"),)

    id = Column(String, primary_key=True, default=gen_id)
    official_id = Column(String, ForeignKey("officials.id"), nullable=False)
    finger_index = Column(Integer, nullable=False)  # 1 = Primary, 2 = Secondary
    finger_name = Column(String, nullable=False)
    hand = Column(String, nullable=False)
    credential_id = Column(String, nullable=True)
    public_key = Column(Text, nullable=True)
    template_data = Column(Text, nullable=False)
    quality_score = Column(Float, default=0.95)
    sensor_type = Column(String, default="WebAuthn / Windows Hello")
    captured_at = Column(DateTime, default=datetime.utcnow)

    official = relationship("Official", back_populates="fingerprints")


class CitizenDocument(Base):
    """Document card linked to a citizen. Real files are saved to server storage,
    scanned metadata and OCR results are persisted. Viewing the file scan requires
    a fresh fingerprint verification from the citizen or authorized official."""
    __tablename__ = "citizen_documents"
    __table_args__ = (UniqueConstraint("citizen_id", "doc_type", name="uq_citizen_doctype"),)

    id = Column(String, primary_key=True, default=gen_id)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    doc_type = Column(Enum(DocumentType), nullable=False)
    doc_number = Column(String, nullable=True)      # e.g., "4582 9102 3847" or "ABCDE1234F"
    verified = Column(Boolean, default=False)
    source = Column(String, default="upload")        # "upload", "scan", "digilocker"
    file_path = Column(String, nullable=True)       # Relative path under uploads/documents/
    file_name = Column(String, nullable=True)       # Original filename e.g. "aadhaar_card.pdf"
    file_size = Column(Integer, nullable=True)      # In bytes
    mime_type = Column(String, nullable=True)       # e.g. "application/pdf", "image/png"
    extracted_text = Column(Text, nullable=True)    # OCR extracted text
    encrypted_scan_ref = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    citizen = relationship("Citizen", back_populates="documents")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    total_votes = Column(Integer, default=0)
    solved_votes = Column(Integer, default=0)
    is_solved = Column(Boolean, default=False)
    added_by_official_id = Column(String, ForeignKey("officials.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    added_by = relationship("Official", back_populates="problems_added")
    votes = relationship("ProblemVote", back_populates="problem", cascade="all, delete-orphan")


class ProblemVote(Base):
    """One vote per citizen per problem; a vote, once cast, cannot be reverted."""
    __tablename__ = "problem_votes"
    __table_args__ = (UniqueConstraint("problem_id", "citizen_id", name="uq_one_vote_per_citizen"),)

    id = Column(String, primary_key=True, default=gen_id)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    solved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="votes")
    citizen = relationship("Citizen", back_populates="votes")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    ministry = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    pros = Column(Text, nullable=True)  # newline separated
    cons = Column(Text, nullable=True)
    required_documents = Column(String, nullable=True)  # comma separated DocumentType values
    portal_source = Column(String, default="MyScheme / UMANG / National Portal")
    benefit_amount = Column(String, nullable=True)
    active = Column(Boolean, default=True)

    usages = relationship("SchemeUsage", back_populates="scheme")


class SchemeUsage(Base):
    """A citizen may use a given scheme once per year."""
    __tablename__ = "scheme_usages"
    __table_args__ = (UniqueConstraint("scheme_id", "citizen_id", "year", name="uq_scheme_per_year"),)

    id = Column(String, primary_key=True, default=gen_id)
    scheme_id = Column(String, ForeignKey("schemes.id"), nullable=False)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(String, default="applied")  # applied | used | missed
    applied_at = Column(DateTime, default=datetime.utcnow)

    scheme = relationship("Scheme", back_populates="usages")
    citizen = relationship("Citizen", back_populates="scheme_usages")
