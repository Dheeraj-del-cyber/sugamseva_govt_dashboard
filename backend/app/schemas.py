from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------- Auth / Officials ----------------------------------------
class OfficialSignupVerifyIdRequest(BaseModel):
    govt_id: str


class FingerprintEnrollmentItem(BaseModel):
    finger_index: int = Field(..., description="1 for primary, 2 for secondary")
    finger_name: str = Field(..., description="e.g. Right Thumb, Left Thumb, Right Index")
    hand: str = Field(default="Right", description="Right or Left")
    capture_token: Optional[str] = None
    credential_id: Optional[str] = None
    public_key: Optional[str] = None
    template_data: Optional[str] = None
    quality_score: float = Field(default=0.92, description="Sensor quality score 0.0 - 1.0")
    sensor_type: str = Field(default="WebAuthn / Windows Hello")


class FingerprintItemOut(BaseModel):
    id: str
    finger_index: int
    finger_name: str
    hand: str
    quality_score: float
    sensor_type: str
    captured_at: datetime

    class Config:
        from_attributes = True


class OfficialSignupRequest(BaseModel):
    govt_id: str
    full_name: str
    dob: str
    phone_number: str
    address: Optional[str] = None
    email: Optional[str] = None
    password: str
    fingerprint_capture_token: Optional[str] = None
    fingerprints: Optional[List[FingerprintEnrollmentItem]] = None


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
    fingerprints: Optional[List[FingerprintItemOut]] = []

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
    doc_number: Optional[str] = None
    verified: bool
    source: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    file_url: Optional[str] = None
    extracted_text: Optional[str] = None
    created_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None

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
    fingerprint_capture_token: Optional[str] = None
    fingerprints: Optional[List[FingerprintEnrollmentItem]] = None  # 2 fingers required


class CitizenListItem(BaseModel):
    sl_no: int
    id: str
    full_name: str
    phone_number: str
    documents_submitted: str
    problem_count: int
    schemes_near_count: int
    enrolled_fingers_count: int = 2


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
    fingerprints: List[FingerprintItemOut] = []
    total_problems: int
    problems_solved: int
    problems_pending: int


class DocumentScanRequest(BaseModel):
    doc_type: str
    source: str = "scan"  # "scan" or "upload"
    doc_number: Optional[str] = None


class DocumentRevealRequest(BaseModel):
    fingerprint_verification_token: str


class DocumentRevealResponse(BaseModel):
    doc_id: str
    doc_type: str
    file_name: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    file_url: str
    doc_number: Optional[str]
    extracted_text: Optional[str]


class DocumentDeleteRequest(BaseModel):
    fingerprint_verification_token: str


# ---------- Problems ----------------------------------------------
class ProblemCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class ProblemUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class ProblemListItem(BaseModel):
    sl_no: int
    id: str
    title: str
    category: Optional[str] = None
    total_votes: int
    solved_votes: int
    is_solved: bool = False

    class Config:
        from_attributes = True


class ProblemVoteRequest(BaseModel):
    citizen_id: str


class ProblemDetailOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: Optional[str] = None
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
    solved: bool = False


class MarkSolvedRequest(BaseModel):
    citizen_id: str
    fingerprint_verification_token: str


class CitizenProblemItem(BaseModel):
    """A single problem as reported/voted by one specific citizen - used by
    the Problems section on that citizen's profile / Add User page."""
    vote_id: str
    problem_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    total_votes: int
    solved_votes: int
    is_solved: bool
    solved: bool  # this citizen's own vote resolution status
    reported_at: datetime


# ---------- Schemes --------------------------------------------------
class SchemeListItem(BaseModel):
    sl_no: int
    id: str
    name: str
    category: Optional[str] = None
    ministry: Optional[str] = None
    benefit_amount: Optional[str] = None
    eligible_count: int
    documents_matched: str


class SchemeDetailOut(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    ministry: Optional[str] = None
    benefit_amount: Optional[str] = None
    summary: Optional[str]
    pros: Optional[List[str]] = []
    cons: Optional[List[str]] = []
    eligible_not_applied: int
    used_count: int
    missed_count: int


class SchemeApplyRequest(BaseModel):
    citizen_ids: List[str]  # empty list = apply to all eligible


# ---------- List of Schemes (master catalog, from the schemes workbook) ---
class SchemeMasterListItem(BaseModel):
    """One row of the 'List of Schemes' page."""
    sl_no: int
    id: str
    code: Optional[str] = None
    name: str
    applied_count: int


class SchemePersonItem(BaseModel):
    id: str
    full_name: str
    phone_number: Optional[str] = None
    year: Optional[int] = None


class SchemeProfileOut(BaseModel):
    """Full scheme profile - every field sourced from the master schemes
    workbook, plus live applied/used/missed/eligible counts computed from citizen activity."""
    id: str
    code: Optional[str] = None
    name: str
    government_level: Optional[str] = None
    scheme_type: Optional[str] = None
    ministry: Optional[str] = None
    year_of_launch: Optional[str] = None
    source_sector: Optional[str] = None
    source_summary: Optional[str] = None
    source: Optional[str] = None
    problem_category: Optional[str] = None
    problem_mapping_note: Optional[str] = None
    candidate_documents: List[str] = []
    document_mapping_note: Optional[str] = None
    data_source: Optional[str] = None
    applied_count: int = 0
    used_count: int = 0
    missed_count: int = 0
    eligible_count: int = 0
    application_start_date: Optional[str] = None
    application_end_date: Optional[str] = None
    apply_url: Optional[str] = None


class AISuggestionRequest(BaseModel):
    scheme_id: str
    citizen_id: str


# ---------- Biometric Services ----------------------------------------
class BiometricCaptureResponse(BaseModel):
    fingerprint_capture_token: str
    quality_score: float
    finger_name: Optional[str] = "Right Thumb"
    hand: Optional[str] = "Right"
    sensor_type: str = "WebAuthn / Windows Hello"
    template_preview_hash: str


class BiometricVerifyRequest(BaseModel):
    subject_type: str  # "citizen" or "official"
    subject_id: str
    finger_index: Optional[int] = None  # Optional: 1 (Primary) or 2 (Secondary)
    live_token: Optional[str] = None
    credential_id: Optional[str] = None


class BiometricVerifyResponse(BaseModel):
    verified: bool
    verification_token: Optional[str] = None
    matched_finger_name: Optional[str] = None
    hand: Optional[str] = None
    quality_score: Optional[float] = None
    message: str = "Biometric authenticated successfully"