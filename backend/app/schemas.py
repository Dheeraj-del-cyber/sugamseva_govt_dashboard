from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------- Auth / Officials ----------------------------------------
class OfficialSignupVerifyIdRequest(BaseModel):
    govt_id: str


class OfficialSignupRequest(BaseModel):
    govt_id: str
    full_name: str
    dob: str
    phone_number: str
    address: Optional[str] = None
    email: Optional[str] = None
    password: str
    fingerprint_capture_token: str  # returned by /biometric/capture


class OfficialLoginRequest(BaseModel):
    govt_id: str
    password: str


class OfficialOut(BaseModel):
    id: str
    govt_id: str
    full_name: str
    dob: Optional[str]
    phone_number: str
    email: Optional[str]
    address: Optional[str]
    photo_url: Optional[str]
    is_verified: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    official: OfficialOut


class OfficialUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


# ---------- Citizens / Users -----------------------------------------
class DocumentOut(BaseModel):
    id: str
    doc_type: str
    verified: bool
    source: str
    verified_at: Optional[datetime]

    class Config:
        from_attributes = True


class CitizenCreateRequest(BaseModel):
    full_name: str
    dob: str
    phone_number: str
    guardian_phone_1: Optional[str] = None
    guardian_phone_2: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    fingerprint_capture_token: str


class CitizenListItem(BaseModel):
    sl_no: int
    id: str
    full_name: str
    phone_number: str
    documents_submitted: str
    problem_count: int
    schemes_near_count: int


class CitizenProfileOut(BaseModel):
    id: str
    full_name: str
    dob: str
    phone_number: str
    guardian_phone_1: Optional[str]
    guardian_phone_2: Optional[str]
    address: Optional[str]
    photo_url: Optional[str]
    documents: List[DocumentOut]
    total_problems: int
    problems_solved: int
    problems_pending: int


class DocumentScanRequest(BaseModel):
    doc_type: str
    source: str = "scan"  # "scan" or "digilocker"


class DocumentRevealRequest(BaseModel):
    fingerprint_verification_token: str


# ---------- Problems ----------------------------------------------
class ProblemCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class ProblemListItem(BaseModel):
    sl_no: int
    id: str
    title: str
    total_votes: int
    solved_votes: int

    class Config:
        from_attributes = True


class ProblemVoteRequest(BaseModel):
    citizen_id: str


class ProblemDetailOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    total_votes: int
    solved_votes: int
    is_solved: bool


class ProblemAffectedUser(BaseModel):
    sl_no: int
    id: str
    full_name: str
    phone_number: str
    address: Optional[str]
    voted_at: datetime


class MarkSolvedRequest(BaseModel):
    citizen_id: str
    fingerprint_verification_token: str


# ---------- Schemes --------------------------------------------------
class SchemeListItem(BaseModel):
    sl_no: int
    id: str
    name: str
    eligible_count: int
    documents_matched: str


class SchemeDetailOut(BaseModel):
    id: str
    name: str
    summary: Optional[str]
    pros: List[str]
    cons: List[str]
    eligible_not_applied: int
    used_count: int
    missed_count: int


class SchemeApplyRequest(BaseModel):
    citizen_ids: List[str]  # empty list = apply to all eligible


class AISuggestionRequest(BaseModel):
    scheme_id: str
    citizen_id: str


# ---------- Biometric / Documents mock services ------------------------
class BiometricCaptureResponse(BaseModel):
    fingerprint_capture_token: str
    quality_score: float


class BiometricVerifyRequest(BaseModel):
    subject_type: str  # "citizen" or "official"
    subject_id: str


class BiometricVerifyResponse(BaseModel):
    verified: bool
    verification_token: Optional[str] = None
