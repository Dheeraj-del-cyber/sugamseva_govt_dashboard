"""Seeds/upserts the `schemes` table from the baked-in scheme master data
(app.scheme_master_data.SCHEME_MASTER_DATA), which mirrors every row of the
"All Schemes" sheet in SugamSeva_Master_Schemes_Documents_ProblemCategories.xlsx.

Runs once at application startup (see app.main). Safe to run repeatedly -
existing rows are matched by `code` (the "SCH-XXXX" id from the workbook)
and updated in place rather than duplicated.
"""

from sqlalchemy.orm import Session

from app import models
from app.scheme_master_data import SCHEME_MASTER_DATA


def seed_scheme_master(db: Session) -> None:
    existing = {s.code: s for s in db.query(models.Scheme).filter(models.Scheme.code.isnot(None)).all()}

    for row in SCHEME_MASTER_DATA:
        docs = row["candidate_documents"] or []
        # required_documents feeds the existing "Schemes Near People" eligibility
        # matcher (app.routers.schemes), which splits on commas.
        required_documents = ", ".join(docs)
        candidate_documents_display = "; ".join(docs)

        scheme = existing.get(row["code"])
        if scheme is None:
            scheme = models.Scheme(code=row["code"])
            db.add(scheme)

        scheme.name = row["name"]
        scheme.category = row["problem_category"]
        scheme.ministry = row["ministry"]
        scheme.summary = row["source_summary"]
        scheme.required_documents = required_documents
        scheme.government_level = row["government_level"]
        scheme.scheme_type = row["scheme_type"]
        scheme.year_of_launch = row["year_of_launch"]
        scheme.source_sector = row["source_sector"]
        scheme.source_summary = row["source_summary"]
        scheme.source = row["source"]
        scheme.problem_category = row["problem_category"]
        scheme.problem_mapping_note = row["problem_mapping_note"]
        scheme.candidate_documents = candidate_documents_display
        scheme.document_mapping_note = row["document_mapping_note"]
        scheme.data_source = row["data_source"]
        scheme.application_start_date = row.get("application_start_date") or "01 Apr 2025"
        scheme.application_end_date = row.get("application_end_date") or "31 Mar 2026"
        scheme.apply_url = row.get("apply_url") or "https://www.myscheme.gov.in/"
        scheme.active = True

    db.commit()

    # Seed representative citizen scheme usages if none exist
    citizens = db.query(models.Citizen).all()
    if citizens:
        all_schemes = db.query(models.Scheme).all()
        existing_usages = db.query(models.SchemeUsage).count()
        if existing_usages == 0 and len(all_schemes) >= 10:
            import random
            statuses = ["applied", "used", "missed"]
            # Seed a spread of usages across top 30 schemes
            for i, scheme in enumerate(all_schemes[:35]):
                for c_idx, citizen in enumerate(citizens):
                    # Deterministic distribution based on scheme and citizen index
                    status = statuses[(i + c_idx) % len(statuses)]
                    usage = models.SchemeUsage(
                        scheme_id=scheme.id,
                        citizen_id=citizen.id,
                        year=2026,
                        status=status
                    )
                    db.add(usage)
            db.commit()