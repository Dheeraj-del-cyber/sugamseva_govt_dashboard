import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
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
    fingerprint_template = Column(Text, nullable=True)  # mock biometric template
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    problems_added = relationship("Problem", back_populates="added_by")


class DocumentType(str, enum.Enum):
    AADHAAR = "Aadhaar Card"
    PAN = "PAN Card"
    PASSPORT = "Passport"
    VOTER_ID = "Voter ID"
    DRIVING_LICENCE = "Driving Licence"
    RATION_CARD = "Ration Card"


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
    fingerprint_template = Column(Text, nullable=True)  # opaque biometric template, never raw scans
    created_at = Column(DateTime, default=datetime.utcnow)
    added_by_official_id = Column(String, ForeignKey("officials.id"), nullable=True)

    documents = relationship("CitizenDocument", back_populates="citizen", cascade="all, delete-orphan")
    votes = relationship("ProblemVote", back_populates="citizen")
    scheme_usages = relationship("SchemeUsage", back_populates="citizen")


class CitizenDocument(Base):
    """Document card linked to a citizen. Scanned images are stored encrypted
    and are NEVER returned to the dashboard listing views - only a verified
    flag and the document type name are exposed, per the security rules in
    the product brief. Viewing the underlying scan requires a fresh
    fingerprint verification (see /users/{id}/reveal-document)."""
    __tablename__ = "citizen_documents"
    __table_args__ = (UniqueConstraint("citizen_id", "doc_type", name="uq_citizen_doctype"),)

    id = Column(String, primary_key=True, default=gen_id)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    doc_type = Column(Enum(DocumentType), nullable=False)
    verified = Column(Boolean, default=False)
    source = Column(String, default="scan")  # "scan" or "digilocker"
    # Encrypted at rest; a real deployment stores this in a locked vault / KMS,
    # never in plaintext object storage.
    encrypted_scan_ref = Column(String, nullable=True)
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
    """One vote per citizen per problem; a vote, once cast, cannot be
    reverted (per the product brief)."""
    __tablename__ = "problem_votes"
    __table_args__ = (UniqueConstraint("problem_id", "citizen_id", name="uq_one_vote_per_citizen"),)

    id = Column(String, primary_key=True, default=gen_id)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=False)
    solved = Column(Boolean, default=False)  # marked solved (fingerprint-verified) individually
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="votes")
    citizen = relationship("Citizen", back_populates="votes")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    pros = Column(Text, nullable=True)  # newline separated
    cons = Column(Text, nullable=True)
    required_documents = Column(String, nullable=True)  # comma separated DocumentType values
    portal_source = Column(String, default="MyScheme / UMANG")
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
